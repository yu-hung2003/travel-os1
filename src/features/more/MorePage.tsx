import { useTheme } from '@/shared/hooks/useTheme';
import type { ThemePref } from '@/domain/types';

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
          <li>旅行日記（Phase 7）</li>
          <li>行李清單（Phase 7）</li>
          <li>天氣與智慧提醒（Phase 8-9）</li>
        </ul>
      </section>

      <p className="text-center text-xs text-ink-3">Travel OS v1.0 · Phase 1</p>
    </div>
  );
}
