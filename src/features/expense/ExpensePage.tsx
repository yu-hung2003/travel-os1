import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import { expenseRepository } from '@/data/repositories/expenseRepository';
import { categoryMeta, categoryOrder } from '@/features/expense/categoryMeta';
import { AddExpenseSheet } from '@/features/expense/components/AddExpenseSheet';
import { BudgetSheet } from '@/features/expense/components/BudgetSheet';
import type { Expense } from '@/domain/types';

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

export default function ExpensePage() {
  const trip = useLiveQuery(async () => {
    const pref = await db.prefs.get('default');
    if (pref?.activeTripId) {
      const t = await tripRepository.getTrip(pref.activeTripId);
      if (t) return t;
    }
    return (await tripRepository.listTrips())[0];
  });
  const days = useLiveQuery(
    () => (trip ? tripRepository.listDays(trip.id) : Promise.resolve([])),
    [trip?.id],
  );
  const expenses = useLiveQuery(
    () => (trip ? expenseRepository.listByTrip(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [adding, setAdding] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);

  const dayById = useMemo(() => new Map((days ?? []).map((d) => [d.id, d])), [days]);

  const stats = useMemo(() => {
    const list = expenses ?? [];
    const total = list.reduce((s, e) => s + e.amount, 0);
    const todayIso = format(new Date(), 'yyyy-MM-dd');
    const todayDay = (days ?? []).find((d) => d.date === todayIso);
    const today = todayDay
      ? list.filter((e) => e.dayId === todayDay.id).reduce((s, e) => s + e.amount, 0)
      : 0;
    const byCategory = categoryOrder
      .map((c) => ({
        category: c,
        sum: list.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
      }))
      .filter((x) => x.sum > 0)
      .sort((a, b) => b.sum - a.sum);
    return { total, today, byCategory };
  }, [expenses, days]);

  if (!trip || !days || !expenses) return null;

  const budget = trip.totalBudget;
  const remaining = budget !== undefined ? budget - stats.total : undefined;
  const usedRatio = budget ? Math.min(1, stats.total / budget) : 0;
  const perPerson = trip.travelers.length > 0 ? Math.round(stats.total / trip.travelers.length) : 0;

  // group by day for the list
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.dayId ?? '__none__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const groupKeys = [...groups.keys()].sort((a, b) => {
    const da = dayById.get(a)?.dayIndex ?? -1;
    const dbi = dayById.get(b)?.dayIndex ?? -1;
    return dbi - da; // recent days first, 不指定 last-ish
  });

  return (
    <div className="flex flex-col gap-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">花費</h1>
        <button className="text-sm font-semibold text-primary" onClick={() => setEditingBudget(true)}>
          {budget !== undefined ? '調整預算' : '設定預算'}
        </button>
      </header>

      {/* summary */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-ink-2">全旅程支出</p>
          <p className="text-xs text-ink-3">每人約 {yen(perPerson)}</p>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums">{yen(stats.total)}</p>

        {budget !== undefined && remaining !== undefined && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `${usedRatio * 100}%` }}
              />
            </div>
            <p className={`mt-1.5 text-sm font-semibold tabular-nums ${remaining < 0 ? 'text-danger' : 'text-ink-2'}`}>
              {remaining >= 0
                ? `剩餘預算 ${yen(remaining)} / ${yen(budget)}`
                : `已超支 ${yen(-remaining)}(預算 ${yen(budget)})`}
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-3 px-4 py-2.5">
          <span className="text-sm font-semibold text-ink-2">今日花費</span>
          <span className="text-base font-bold tabular-nums">{yen(stats.today)}</span>
        </div>
      </section>

      <button
        onClick={() => setAdding(true)}
        className="rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-ink active:opacity-80"
      >
        ＋ 記一筆
      </button>

      {/* category breakdown */}
      {stats.byCategory.length > 0 && (
        <section className="card p-5">
          <h2 className="text-xs font-semibold text-ink-2">分類統計</h2>
          <ul className="mt-3 space-y-2.5">
            {stats.byCategory.map(({ category, sum }) => {
              const pct = stats.total ? (sum / stats.total) * 100 : 0;
              return (
                <li key={category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">
                      {categoryMeta[category].emoji} {categoryMeta[category].label}
                    </span>
                    <span className="tabular-nums text-ink-2">
                      {yen(sum)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* expense list grouped by day */}
      {expenses.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-3">
          還沒有任何紀錄。旅途中隨手「記一筆」,回國就有完整帳本。
        </p>
      ) : (
        groupKeys.map((key) => {
          const day = dayById.get(key);
          const rows = groups.get(key)!;
          const daySum = rows.reduce((s, e) => s + e.amount, 0);
          return (
            <section key={key} className="card p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold">
                  {day ? `Day ${day.dayIndex} · ${format(new Date(`${day.date}T00:00`), 'M/d')}` : '未指定日期'}
                </h2>
                <span className="text-sm font-semibold tabular-nums text-ink-2">{yen(daySum)}</span>
              </div>
              <ul className="mt-2 divide-y divide-line/60">
                {rows.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-lg">{categoryMeta[e.category].emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{categoryMeta[e.category].label}</p>
                      {e.note && <p className="truncate text-xs text-ink-3">{e.note}</p>}
                    </div>
                    <span className="text-sm font-bold tabular-nums">{yen(e.amount)}</span>
                    <button
                      aria-label="刪除"
                      className="p-1 text-ink-3 active:text-danger"
                      onClick={() => expenseRepository.remove(e.id)}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <AddExpenseSheet open={adding} tripId={trip.id} days={days} onClose={() => setAdding(false)} />
      <BudgetSheet
        open={editingBudget}
        tripId={trip.id}
        current={budget}
        onClose={() => setEditingBudget(false)}
      />
    </div>
  );
}
