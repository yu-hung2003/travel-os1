import {
  collection, doc, getDoc, onSnapshot, setDoc, writeBatch,
} from 'firebase/firestore';
import Dexie from 'dexie';
import { db } from '@/data/db';
import { getFirestoreDb, isFirebaseConfigured } from '@/data/sync/firebase';

/* ---------------------------------------------------------------
   Family sync (offline-first, last-write-wins).
   - One Firestore "room" per trip, addressed by an unguessable code.
   - Outbound: Dexie hooks queue changed records; pushed after the
     local transaction commits. Firestore SDK queues writes offline.
   - Inbound: snapshot listener applies remote records into Dexie,
     guarded so hooks don't echo them back.
---------------------------------------------------------------- */

const SYNC_TABLES = [
  'trips', 'days', 'dayVersions', 'events', 'expenses',
  'packing', 'accommodations', 'transfers', 'places',
] as const;
type SyncTable = (typeof SYNC_TABLES)[number];

const CODE_KEY = 'travelos-sync-code';
const CLIENT_KEY = 'travelos-client-id';

function clientId(): string {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

export function getSyncCode(): string | null {
  return localStorage.getItem(CODE_KEY);
}

let applyingRemote = false;
let unsubscribe: (() => void) | null = null;
let hooksInstalled = false;

/** JSON round-trip strips `undefined` (Firestore rejects it) and clones. */
function plain(record: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(record));
}

function recordDocId(table: string, key: string): string {
  return `${table}|${key}`;
}

async function pushRecord(code: string, table: SyncTable, key: string): Promise<void> {
  const fs = getFirestoreDb();
  const record = await db.table(table).get(key);
  const ref = doc(fs, 'rooms', code, 'records', recordDocId(table, key));
  if (record === undefined) {
    await setDoc(ref, { table, key, deleted: true, updatedAt: Date.now(), clientId: clientId() });
  } else {
    await setDoc(ref, {
      table, key, data: plain(record), deleted: false,
      updatedAt: Date.now(), clientId: clientId(),
    });
  }
}

function queueOnCommit(table: SyncTable, key: string): void {
  const code = getSyncCode();
  if (!code || applyingRemote) return;
  const tx = Dexie.currentTransaction;
  const fire = () => {
    pushRecord(code, table, key).catch((e) => console.warn('[sync] push failed', e));
  };
  if (tx) tx.on('complete', fire);
  else fire();
}

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const table of SYNC_TABLES) {
    const t = db.table(table);
    t.hook('creating', function (primKey) {
      queueOnCommit(table, String(primKey));
    });
    t.hook('updating', function (_mods, primKey) {
      queueOnCommit(table, String(primKey));
    });
    t.hook('deleting', function (primKey) {
      queueOnCommit(table, String(primKey));
    });
  }
}

function startListener(code: string): void {
  const fs = getFirestoreDb();
  unsubscribe?.();
  unsubscribe = onSnapshot(collection(fs, 'rooms', code, 'records'), (snap) => {
    const changes = snap.docChanges().filter((c) => c.type !== 'removed');
    if (changes.length === 0) return;
    void (async () => {
      applyingRemote = true;
      try {
        for (const change of changes) {
          const d = change.doc.data() as {
            table: SyncTable; key: string; data?: Record<string, unknown>;
            deleted?: boolean; clientId?: string;
          };
          if (d.clientId === clientId()) continue; // own echo
          if (!SYNC_TABLES.includes(d.table)) continue;
          if (d.deleted) await db.table(d.table).delete(d.key);
          else if (d.data) await db.table(d.table).put(d.data);
        }
      } catch (e) {
        console.warn('[sync] apply failed', e);
      } finally {
        applyingRemote = false;
      }
    })();
  });
}

/** Push every record of the given trip (initial upload when creating a room). */
async function pushWholeTrip(code: string, tripId: string): Promise<void> {
  const fs = getFirestoreDb();
  const docs: Array<{ id: string; payload: Record<string, unknown> }> = [];
  for (const table of SYNC_TABLES) {
    const rows = table === 'trips'
      ? await db.trips.where('id').equals(tripId).toArray()
      : await db.table(table).where('tripId').equals(tripId).toArray();
    for (const row of rows as Array<{ id: string }>) {
      docs.push({
        id: recordDocId(table, row.id),
        payload: {
          table, key: row.id, data: plain(row), deleted: false,
          updatedAt: Date.now(), clientId: clientId(),
        },
      });
    }
  }
  // Firestore batch limit is 500
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(fs);
    for (const d of docs.slice(i, i + 400)) {
      batch.set(doc(fs, 'rooms', code, 'records', d.id), d.payload);
    }
    await batch.commit();
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function generateCode(): string {
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  const body = [...arr].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('');
  return `TRIP-${body}`;
}

/** Create a sync room for a trip and upload the full local dataset. */
export async function createRoom(tripId: string): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('not-configured');
  const fs = getFirestoreDb();
  const code = generateCode();
  await setDoc(doc(fs, 'rooms', code), { tripId, createdAt: Date.now() });
  await pushWholeTrip(code, tripId);
  localStorage.setItem(CODE_KEY, code);
  installHooks();
  startListener(code);
  return code;
}

/** Join an existing room; remote records flow in via the snapshot listener. */
export async function joinRoom(rawCode: string): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('not-configured');
  const code = rawCode.trim().toUpperCase();
  const fs = getFirestoreDb();
  const room = await getDoc(doc(fs, 'rooms', code));
  if (!room.exists()) throw new Error('room-not-found');
  localStorage.setItem(CODE_KEY, code);
  installHooks();
  startListener(code);
}

/** Stop syncing on this device; local data stays intact. */
export function leaveSync(): void {
  localStorage.removeItem(CODE_KEY);
  unsubscribe?.();
  unsubscribe = null;
}

/** Boot-time resume: reconnect if this device was already in a room. */
export function resumeSyncIfEnabled(): void {
  const code = getSyncCode();
  if (!code || !isFirebaseConfigured()) return;
  try {
    installHooks();
    startListener(code);
  } catch (e) {
    console.warn('[sync] resume failed', e);
  }
}
