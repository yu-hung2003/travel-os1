import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import {
  createRoom, getSyncCode, joinRoom, leaveSync, getLastReceivedAt,
} from '@/data/sync/familySync';
import { isFirebaseConfigured } from '@/data/sync/firebase';
import { BottomSheet } from '@/shared/components/BottomSheet';

export function FamilySyncCard() {
  const [code, setCode] = useState<string | null>(getSyncCode());
  const [sheet, setSheet] = useState<'join' | 'leave' | null>(null);
  const [joinText, setJoinText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastRx, setLastRx] = useState<number | null>(getLastReceivedAt());

  useEffect(() => {
    const t = setInterval(() => setLastRx(getLastReceivedAt()), 5000);
    return () => clearInterval(t);
  }, []);

  const trip = useLiveQuery(async () => {
    const pref = await db.prefs.get('default');
    if (pref?.activeTripId) {
      const t = await tripRepository.getTrip(pref.activeTripId);
      if (t) return t;
    }
    return (await tripRepository.listTrips())[0];
  });

  if (!isFirebaseConfigured()) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-bold">👨‍👩‍👧‍👦 家庭同步</h2>
        <p className="mt-1 text-xs text-warning">
          尚未設定 VITE_FIREBASE_API_KEY 環境變數,同步功能未啟用。
        </p>
      </section>
    );
  }

  const create = async () => {
    if (!trip) return;
    setBusy(true);
    setMsg(null);
    try {
      const c = await createRoom(trip.id);
      setCode(c);
    } catch {
      setMsg('建立失敗,請確認網路後再試。');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await joinRoom(joinText);
      setCode(getSyncCode());
      setSheet(null);
    } catch (e) {
      setMsg(
        e instanceof Error && e.message === 'room-not-found'
          ? '找不到這組同步碼,請確認輸入是否正確(不分大小寫)。'
          : '加入失敗,請確認網路後再試。',
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold">👨‍👩‍👧‍👦 家庭同步</h2>

      {code ? (
        <>
          <p className="mt-1 text-xs text-ink-2">
            同步中——把下方同步碼給家人,在他們裝置的這個頁面按「加入」輸入即可。
            所有行程、記帳、行李、口袋名單即時共用;離線的修改會在連網後自動合併。
          </p>
          <button
            onClick={copy}
            className="mt-3 w-full rounded-xl bg-surface-3 py-3 text-center text-lg font-bold tabular-nums tracking-wider active:opacity-70"
          >
            {code}
            <span className="ml-2 text-xs font-semibold text-primary">
              {copied ? '✅ 已複製' : '點擊複製'}
            </span>
          </button>
          <p className="mt-2 text-[11px] tabular-nums text-ink-3">
            {lastRx
              ? `🟢 連線正常 · 最後收到同步 ${format(lastRx, 'HH:mm:ss')}`
              : '🟡 尚未收到伺服器回應,請確認網路'}
          </p>
          <button
            className="mt-1 text-xs font-semibold text-danger active:opacity-70"
            onClick={() => setSheet('leave')}
          >
            此裝置停止同步
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-2">
            讓全家裝置共用同一份旅程:一人「建立同步」取得同步碼,其他人「加入同步」輸入即可。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={busy || !trip}
              onClick={create}
              className="rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            >
              {busy ? '建立中…' : '建立同步'}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setJoinText('');
                setMsg(null);
                setSheet('join');
              }}
              className="rounded-xl bg-surface-3 py-2.5 text-sm font-bold text-ink-2 disabled:opacity-40 active:opacity-70"
            >
              加入同步
            </button>
          </div>
        </>
      )}
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}

      <BottomSheet open={sheet === 'join'} onClose={() => setSheet(null)} title="加入家庭同步">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-3">
            輸入家人分享的同步碼(格式如 TRIP-XXXXXXXX)。加入後這台裝置的旅程資料會與家人合併,以最後修改為準。
          </p>
          <input
            value={joinText}
            onChange={(e) => setJoinText(e.target.value.toUpperCase())}
            placeholder="TRIP-XXXXXXXX"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-line bg-surface p-3 text-center text-lg font-bold tabular-nums tracking-wider outline-none focus:border-primary"
          />
          {msg && <p className="text-xs text-danger">{msg}</p>}
          <button
            disabled={busy || joinText.trim().length < 8}
            onClick={join}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            {busy ? '加入中…' : '加入'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'leave'} onClose={() => setSheet(null)} title="停止同步">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            此裝置將停止與家人同步;本機資料完整保留,家人的裝置不受影響。之後可隨時用同一組同步碼重新加入。
          </p>
          <button
            className="rounded-xl bg-danger py-3 text-sm font-bold text-white active:opacity-80"
            onClick={() => {
              leaveSync();
              setCode(null);
              setSheet(null);
            }}
          >
            確認停止同步
          </button>
          <button className="text-sm text-ink-3" onClick={() => setSheet(null)}>取消</button>
        </div>
      </BottomSheet>
    </section>
  );
}
