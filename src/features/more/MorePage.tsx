import { useTheme } from '@/shared/hooks/useTheme';
import type { ThemePref } from '@/domain/types';
import { InstallCard } from '@/features/more/components/InstallCard';
import { CurrencyConverter } from '@/shared/components/CurrencyConverter';
import { FamilySyncCard } from '@/features/more/components/FamilySyncCard';
import { ReimportCard } from '@/features/more/components/ReimportCard';
import { Link } from 'react-router-dom';

const options: { value: ThemePref; label: string }[] = [
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自動' },
];

export default function MorePage() {
  const { pref, setPref } = useTheme();

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">更多</h1>

      <InstallCard />

      <FamilySyncCard />

      <ReimportCard />


      <CurrencyConverter />

      <Link to="/places" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🍜 餐廳口袋名單</h2>
          <p className="mt-0.5 text-xs text-ink-3">備選/選定/去過,訂位、價位、菜單、距離一目瞭然</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>

      <Link to="/packing" className="card flex items-center justify-between p-5 active:opacity-80">
        <div>
          <h2 className="text-sm font-bold">🧳 行李清單</h2>
          <p className="mt-0.5 text-xs text-ink-3">隨身 + 託運分區打包,出發前逐項勾選</p>
        </div>
        <span className="text-ink-3">›</span>
      </Link>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-2">外觀主題</h2>
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

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-2">即將加入</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-3">
          <li>天氣與地圖整合（Phase 8）</li>
          <li>智慧提醒與重新排程（Phase 9）</li>
        </ul>
      </section>

      <p className="text-center text-xs text-ink-3">Travel OS v1.0 · Phase 1</p>
    </div>
  );
}
