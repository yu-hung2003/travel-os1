import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { tripRepository } from '@/data/repositories/tripRepository';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export default function TripDetailPage() {
  const { tripId = '' } = useParams();
  const trip = useLiveQuery(() => tripRepository.getTrip(tripId), [tripId]);
  const days = useLiveQuery(() => tripRepository.listDays(tripId), [tripId]);
  const accommodations = useLiveQuery(() => tripRepository.listAccommodations(tripId), [tripId]);

  if (!trip || !days) return null;

  const noteLines = (trip.note ?? '').split('\n').filter(Boolean);

  return (
    <div className="flex flex-col gap-4 py-6">
      <div>
        <Link to="/trips" className="text-sm text-primary">‹ 旅程</Link>
        <h1 className="mt-1 text-2xl font-bold">{trip.coverEmoji} {trip.title}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {format(parseISO(trip.startDate), 'yyyy/M/d')} – {format(parseISO(trip.endDate), 'M/d')} · {trip.destination} · {trip.travelers.length} 人
        </p>
      </div>

      <section className="flex flex-col gap-2.5">
        {days.map((day) => {
          const d = parseISO(day.date);
          return (
            <Link
              key={day.id}
              to={`/timeline?day=${day.id}`}
              className="card flex items-center gap-4 p-4 active:opacity-80"
            >
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-1.5">
                <span className="text-[10px] font-semibold uppercase text-primary">Day</span>
                <span className="text-xl font-bold leading-none text-primary">{day.dayIndex}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">
                  {format(d, 'M/d')}（{WEEKDAY[d.getDay()]}）
                </p>
                <p className="truncate text-sm font-semibold">{day.title}</p>
              </div>
            </Link>
          );
        })}
      </section>

      {accommodations && accommodations.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-2">住宿</h2>
          <ul className="mt-2 space-y-3">
            {accommodations.map((a) => (
              <li key={a.id}>
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="text-xs text-ink-3">
                  {format(parseISO(a.checkInDate), 'M/d')} 入住 – {format(parseISO(a.checkOutDate), 'M/d')} 退房
                  {a.note ? ` · ${a.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {noteLines.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-2">旅程備忘</h2>
          <ul className="mt-2 space-y-2">
            {noteLines.map((line, i) => (
              <li key={i} className={`text-sm leading-relaxed ${line.startsWith('⚠️') ? 'text-warning' : 'text-ink-2'}`}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
