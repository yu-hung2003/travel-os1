import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/shared/hooks/useTheme';
import type { ThemePref } from '@/domain/types';
import { InstallCard } from '@/features/more/components/InstallCard';
import { FamilySyncCard } from '@/features/more/components/FamilySyncCard';
import { CurrencyConverter } from '@/shared/components/CurrencyConverter';

const options: { value: ThemePref; label: string }[] = [
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自動' },
];

const ORDER_KEY = 'travelos-more-order';
const CARD_IDS = ['sync', 'places', 'packing', 'shopping', 'emergency', 'print', 'converter', 'theme'] as const;
type CardId = (typeof CARD_IDS)[number];

const cardLabels: Record<CardId, string> = {
  sync: '👨‍👩‍👧‍👦 家庭同步',
  places: '🍜 餐廳/景點口袋名單',
  packing: '🧳 行李清單',
  converter: '💱 匯率試算',
  theme: '🎨 外觀主題',
  shopping: '🛒 血拼清單',
  emergency: '🆘 緊急資訊',
  print: '🖨️ 列印行程表',
};

function loadOrder(): CardId[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as CardId[];
      // keep known ids in saved order, append any new cards
      const valid = saved.filter((id) => (CARD_IDS as readonly string[]).includes(id));
      const missing = CARD_IDS.filter((id) => !valid.includes(id));
      return [...valid, ...missing];
    }
  } catch { /* fall through */ }
  return [...CARD_IDS];
}

function ThemeCard() {
  const { pref, setPref } = useTheme();
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink-2">🎨 外觀主題</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-surface-3 p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPref(opt.value)}
            className={`rounded-lg py-2 text-sm transition-colors ${
              pref === opt.value
                ? 'bg-primary font-semibold text-primary-ink shadow-card'
                : 'text-ink-2'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function MorePage() {
  const [order, setOrder] = useState<CardId[]>(loadOrder());
  const [editing, setEditing] = useState(false);

  const move = (id: CardId, dir: -1 | 1) => {
    setOrder((cur) => {
      const idx = cur.indexOf(id);
      const to = idx + dir;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[idx], next[to]] = [next[to], next[idx]];
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const cards: Record<CardId, ReactNode> = {
    sync: <FamilySyncCard />,
    places: (
      <Link to="/places" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🍜⛩️ 餐廳/景點口袋名單</h2>
          <p className="mt-0.5 text-xs text-ink-3">想吃想去先收藏:預約、價位、亮點、距離一目瞭然,一鍵排入行程</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>
    ),
    packing: (
      <Link to="/packing" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🧳 行李清單</h2>
          <p className="mt-0.5 text-xs text-ink-3">成員分頁 + 隨身/託運分區,重要物品醒目標示</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>
    ),
    shopping: (
      <Link to="/shopping" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🛒 血拼清單</h2>
          <p className="mt-0.5 text-xs text-ink-3">藥妝、伴手禮、代購託買——全家共享,誰在店裡誰買</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>
    ),
    emergency: (
      <Link to="/emergency" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🆘 緊急資訊</h2>
          <p className="mt-0.5 text-xs text-ink-3">110/119、駐大阪辦事處、飯店地址、走散集合點,離線可用</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>
    ),
    print: (
      <Link to="/print" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🖨️ 列印行程表</h2>
          <p className="mt-0.5 text-xs text-ink-3">A4 全程行程表,列印或存 PDF 給長輩備援</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>
    ),
    converter: <CurrencyConverter />,
    theme: <ThemeCard />,
  };

  return (
    <div className="flex flex-col gap-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">更多</h1>
        <button
          onClick={() => setEditing(!editing)}
          className={`text-sm font-semibold ${editing ? 'text-success' : 'text-primary'}`}
        >
          {editing ? '✓ 完成' : '⇅ 調整排序'}
        </button>
      </header>

      {order.map((id) => (
        <div key={id} className="relative">
          {editing && (
            <div className="mb-1 flex items-center justify-between rounded-xl bg-surface-3 px-3 py-1.5">
              <span className="text-xs font-semibold text-ink-2">{cardLabels[id]}</span>
              <span className="flex gap-1">
                <button
                  aria-label="上移"
                  onClick={() => move(id, -1)}
                  className="rounded-lg bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2 active:opacity-70"
                >
                  ↑
                </button>
                <button
                  aria-label="下移"
                  onClick={() => move(id, 1)}
                  className="rounded-lg bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2 active:opacity-70"
                >
                  ↓
                </button>
              </span>
            </div>
          )}
          {cards[id]}
        </div>
      ))}

      <InstallCard />

      <p className="text-center text-xs text-ink-3">
        Travel OS v1.0 · 排序僅存於此裝置,不會同步
      </p>
    </div>
  );
}
