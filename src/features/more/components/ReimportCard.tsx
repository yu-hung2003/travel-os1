import { useState } from 'react';
import { reimportKyotoOsakaItinerary } from '@/data/seed';
import { BottomSheet } from '@/shared/components/BottomSheet';

export function ReimportCard() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await reimportKyotoOsakaItinerary();
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold">🔄 重新匯入京阪行程 v2</h2>
      <p className="mt-1 text-xs text-ink-2">
        套用最新整理版:利木津巴士路線、五條假日酒店、景點與交通完全分離。
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-xl bg-surface-3 px-4 py-2.5 text-sm font-bold text-ink-2 active:opacity-70"
      >
        重新匯入…
      </button>

      <BottomSheet open={open} onClose={() => !busy && setOpen(false)} title="確認重新匯入">
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-surface-3 p-3 text-xs leading-relaxed text-ink-2">
            <p className="font-bold">會重置:</p>
            <p>每日行程事件(含你手動修改的)、行程版本、住宿資訊。</p>
            <p className="mt-2 font-bold text-success">完整保留:</p>
            <p>記帳、行李清單、口袋名單、機場接送、成員與預算。</p>
            <p className="mt-2">已排入行程的口袋餐廳會退回「已選定」,需重新排入。若已開啟家庭同步,重匯入會自動同步給家人(一台執行即可)。</p>
          </div>
          <button
            disabled={busy}
            onClick={run}
            className="rounded-xl bg-danger py-3 text-sm font-bold text-white disabled:opacity-40 active:opacity-80"
          >
            {done ? '✅ 已完成' : busy ? '匯入中…' : '確認重新匯入'}
          </button>
          {!busy && (
            <button className="text-sm text-ink-3" onClick={() => setOpen(false)}>取消</button>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
