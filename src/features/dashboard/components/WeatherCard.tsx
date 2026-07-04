import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { db } from '@/data/db';
import { getWeather, type WeatherSnapshot } from '@/data/sync/weatherService';
import type { GeoPoint, TripDay } from '@/domain/types';

const FALLBACK_OSAKA: GeoPoint = { lat: 34.6937, lng: 135.5023 };

/**
 * Resolve "today's" weather point generically:
 * first located event of the day → later days' first located event →
 * accommodation location → Osaka fallback.
 */
async function resolvePoint(day: TripDay): Promise<GeoPoint> {
  const dayEvents = await db.events.where('dayId').equals(day.id).sortBy('order');
  const located = dayEvents.find((e) => e.location);
  if (located?.location) return located.location;

  if (day.accommodationId) {
    const acc = await db.accommodations.get(day.accommodationId);
    if (acc?.location) return acc.location;
  }

  const laterDays = await db.days
    .where('tripId').equals(day.tripId)
    .and((d) => d.dayIndex >= day.dayIndex)
    .sortBy('dayIndex');
  for (const d of laterDays) {
    const evs = await db.events.where('dayId').equals(d.id).sortBy('order');
    const hit = evs.find((e) => e.location);
    if (hit?.location) return hit.location;
  }
  return FALLBACK_OSAKA;
}

export function WeatherCard({ day }: { day: TripDay }) {
  const point = useLiveQuery(() => resolvePoint(day), [day.id]);
  const [snap, setSnap] = useState<WeatherSnapshot | null | 'loading'>('loading');

  useEffect(() => {
    if (!point) return;
    let cancelled = false;
    setSnap('loading');
    getWeather(point).then((s) => {
      if (!cancelled) setSnap(s);
    });
    return () => {
      cancelled = true;
    };
  }, [point?.lat, point?.lng]);

  const heat = snap !== 'loading' && snap !== null && Math.max(snap.feelsC, snap.tempC) >= 36;
  const rain = snap !== 'loading' && snap !== null && snap.pop >= 0.6;

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-ink-2">今日天氣</p>
      {snap === 'loading' ? (
        <p className="mt-1.5 text-xl font-bold text-ink-3">…</p>
      ) : snap === null ? (
        <>
          <p className="mt-1.5 text-xl font-bold">--°C</p>
          <p className="mt-0.5 text-[11px] text-ink-3">目前無法取得天氣</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-xl font-bold tabular-nums">
            {snap.emoji} {snap.tempC}°C
          </p>
          <p className="mt-0.5 text-[11px] text-ink-2">
            體感 {snap.feelsC}° · 降雨 {Math.round(snap.pop * 100)}%
            {snap.tmaxC !== undefined && ` · ${snap.tminC ?? '--'}~${snap.tmaxC}°`}
          </p>
          {heat && (
            <p className="mt-1 rounded-lg bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              🥵 高溫警示:11-15 時建議室內行程
            </p>
          )}
          {rain && (
            <p className="mt-1 rounded-lg bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">
              🌧️ 降雨機率高:啟動 Rain Plan(室內備案)
            </p>
          )}
          {snap.stale && (
            <p className="mt-1 text-[10px] text-ink-3">
              離線快取 · {format(snap.fetchedAt, 'HH:mm')} 更新
            </p>
          )}
        </>
      )}
    </div>
  );
}
