import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { tripRepository } from '@/data/repositories/tripRepository';
import type { TripStatus } from '@/domain/types';

const statusLabel: Record<TripStatus, { text: string; cls: string }> = {
  planning: { text: '規劃中', cls: 'bg-surface-3 text-ink-2' },
  upcoming: { text: '即將出發', cls: 'bg-primary/15 text-primary' },
  active: { text: '旅行中', cls: 'bg-success/15 text-success' },
  completed: { text: '已完成', cls: 'bg-surface-3 text-ink-3' },
};

export default function TripsPage() {
  const trips = useLiveQuery(() => tripRepository.listTrips());

  if (!trips) return null;

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">旅程</h1>

      {trips.map((trip) => {
        const nights = differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate));
        const status = statusLabel[trip.status];
        return (
          <Link key={trip.id} to={`/trips/${trip.id}`} className="card block p-5 active:opacity-80">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{trip.coverEmoji ?? '✈️'}</span>
                <div>
                  <h2 className="font-bold leading-snug">{trip.title}</h2>
                  <p className="mt-0.5 text-sm text-ink-2">{trip.destination}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                {status.text}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-ink-2">
              <span>
                {format(parseISO(trip.startDate), 'M/d')} – {format(parseISO(trip.endDate), 'M/d')}
              </span>
              <span>{nights + 1} 天 {nights} 夜</span>
              <span>{trip.travelers.length} 人</span>
            </div>
          </Link>
        );
      })}

      <p className="mt-2 text-center text-xs text-ink-3">
        新增旅程與 AI Trip Planner 將於後續 Phase 加入
      </p>
    </div>
  );
}
