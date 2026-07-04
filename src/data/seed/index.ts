import { db } from '@/data/db';
import { buildKyotoOsakaSeed } from '@/data/seed/kyotoOsaka2026';

const SEED_FLAG = 'seed:ko26';

/**
 * Idempotent first-run import. Runs inside one transaction; if the
 * trip was already seeded once, user data is never touched again —
 * edits, reordering and deletions all survive app updates.
 */
export async function ensureSeeded(): Promise<void> {
  const done = localStorage.getItem(SEED_FLAG);
  if (done) return;

  const existing = await db.trips.get('ko26');
  if (existing) {
    localStorage.setItem(SEED_FLAG, '1');
    return;
  }

  const { trip, days, events, accommodations } = buildKyotoOsakaSeed();
  await db.transaction('rw', [db.trips, db.days, db.events, db.accommodations, db.prefs], async () => {
    await db.trips.add(trip);
    await db.days.bulkAdd(days);
    await db.events.bulkAdd(events);
    await db.accommodations.bulkAdd(accommodations);
    const pref = await db.prefs.get('default');
    await db.prefs.put({
      key: 'default',
      theme: pref?.theme ?? 'auto',
      homeCurrency: pref?.homeCurrency ?? 'TWD',
      activeTripId: trip.id,
    });
  });
  localStorage.setItem(SEED_FLAG, '1');
}
