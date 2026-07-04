import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import { packingRepository } from '@/data/repositories/packingRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import type { BagKind, PackingItem } from '@/domain/types';

const bagMeta: Record<BagKind, { emoji: string; label: string }> = {
  carry: { emoji: '🎒', label: '隨身行李' },
  checked: { emoji: '🧳', label: '託運大件行李' },
};

function BagSection({ bag, items }: { bag: BagKind; items: PackingItem[] }) {
  const done = items.filter((i) => i.checked).length;

  // group by category, stable order of first appearance
  const byCategory = useMemo(() => {
    const map = new Map<string, PackingItem[]>();
    for (const i of items) {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">
          {bagMeta[bag].emoji} {bagMeta[bag].label}
        </h2>
        <span className="text-sm font-semibold tabular-nums text-ink-2">
          {done}/{items.length}
        </span>
      </div>
      {items.length > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">尚無項目,按下方「＋新增物品」加入。</p>
      ) : (
        byCategory.map(([category, rows]) => (
          <div key={category} className="mt-3">
            <p className="text-xs font-semibold text-ink-3">{category}</p>
            <ul className="mt-1 divide-y divide-line/60">
              {rows.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <button
                    aria-label={item.checked ? '取消勾選' : '勾選'}
                    onClick={() => packingRepository.toggle(item.id)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      item.checked
                        ? 'border-primary bg-primary text-primary-ink'
                        : 'border-line'
                    }`}
                  >
                    {item.checked && (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4 10-10" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      item.checked ? 'text-ink-3 line-through' : 'font-medium'
                    }`}
                  >
                    {item.name}
                    {item.qty > 1 && (
                      <span className="ml-1 text-xs text-ink-3">×{item.qty}</span>
                    )}
                  </span>
                  <button
                    aria-label="刪除"
                    className="p-1 text-ink-3 active:text-danger"
                    onClick={() => packingRepository.remove(item.id)}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

export default function PackingPage() {
  const trip = useLiveQuery(async () => {
    const pref = await db.prefs.get('default');
    if (pref?.activeTripId) {
      const t = await tripRepository.getTrip(pref.activeTripId);
      if (t) return t;
    }
    return (await tripRepository.listTrips())[0];
  });
  const items = useLiveQuery(
    () => (trip ? packingRepository.list(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [adding, setAdding] = useState(false);
  const [bag, setBag] = useState<BagKind>('carry');
  const [name, setName] = useState('');
  const [qtyText, setQtyText] = useState('1');
  const [category, setCategory] = useState('');

  if (!trip || !items) return null;

  const carry = items.filter((i) => i.bag === 'carry');
  const checked = items.filter((i) => i.bag === 'checked');
  const doneAll = items.filter((i) => i.checked).length;

  const submit = async () => {
    if (!name.trim()) return;
    await packingRepository.add({
      tripId: trip.id,
      bag,
      name,
      qty: Number(qtyText) || 1,
      category,
    });
    setName('');
    setQtyText('1');
    setCategory('');
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">行李清單</h1>
        {items.length > 0 && (
          <span className="text-sm font-semibold tabular-nums text-ink-2">
            總進度 {doneAll}/{items.length}
          </span>
        )}
      </header>

      {items.length === 0 && (
        <section className="card p-5 text-center">
          <p className="text-sm text-ink-2">
            清單還是空的。可以套用為這趟旅程準備的模板,再自行增刪。
          </p>
          <button
            onClick={() => packingRepository.applyTemplate(trip.id)}
            className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-ink active:opacity-80"
          >
            套用 2026 夏日日本模板
          </button>
        </section>
      )}

      <BagSection bag="carry" items={carry} />
      <BagSection bag="checked" items={checked} />

      <button
        onClick={() => setAdding(true)}
        className="rounded-2xl border-2 border-dashed border-line py-3.5 text-sm font-semibold text-ink-2 active:bg-surface-3"
      >
        ＋ 新增物品
      </button>

      {items.length > 0 && (
        <button
          onClick={() => packingRepository.resetChecks(trip.id)}
          className="text-sm text-ink-3 active:opacity-70"
        >
          全部取消勾選(回程重複使用)
        </button>
      )}

      <BottomSheet open={adding} onClose={() => setAdding(false)} title="新增物品">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-3 p-1">
            {(Object.keys(bagMeta) as BagKind[]).map((b) => (
              <button
                key={b}
                onClick={() => setBag(b)}
                className={`rounded-lg py-2 text-sm font-semibold ${
                  bag === b ? 'bg-primary text-primary-ink' : 'text-ink-2'
                }`}
              >
                {bagMeta[b].emoji} {bagMeta[b].label}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="物品名稱,例如:小朋友的水壺"
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2" htmlFor="pk-qty">數量</label>
              <input
                id="pk-qty"
                type="number"
                inputMode="numeric"
                min="1"
                value={qtyText}
                onChange={(e) => setQtyText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2" htmlFor="pk-cat">分類(可留空)</label>
              <input
                id="pk-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="其他"
                className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            disabled={!name.trim()}
            onClick={submit}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
          >
            加入清單
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
