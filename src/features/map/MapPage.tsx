import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import { placeRepository } from '@/data/repositories/placeRepository';
import { typeMeta } from '@/features/timeline/eventMeta';
import { gmapsDirectionsUrl } from '@/shared/utils/maps';
import { useOnline } from '@/shared/hooks/useOnline';
import type { GeoPoint } from '@/domain/types';

interface Pin {
  id: string;
  point: GeoPoint;
  emoji: string;
  title: string;
  subtitle?: string;
}

function emojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:rgb(var(--c-surface-2));
      border:2px solid rgb(var(--c-primary));
      box-shadow:0 2px 8px rgb(0 0 0 / .25);
      display:flex;align-items:center;justify-content:center;
      font-size:17px;line-height:1;">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function FitBounds({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.point.lat, p.point.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, pins]);
  return null;
}

export default function MapPage() {
  const online = useOnline();

  const trip = useLiveQuery(async () => {
    const pref = await db.prefs.get('default');
    if (pref?.activeTripId) {
      const t = await tripRepository.getTrip(pref.activeTripId);
      if (t) return t;
    }
    return (await tripRepository.listTrips())[0];
  });

  const pins = useLiveQuery(async () => {
    if (!trip) return [];
    const [events, days, accommodations, places] = await Promise.all([
      tripRepository.listTripEvents(trip.id),
      tripRepository.listDays(trip.id),
      tripRepository.listAccommodations(trip.id),
      placeRepository.list(trip.id),
    ]);
    const dayIndex = new Map(days.map((d) => [d.id, d.dayIndex]));

    const out: Pin[] = [];
    for (const e of events) {
      if (!e.location) continue;
      out.push({
        id: `ev-${e.id}`,
        point: e.location,
        emoji: typeMeta[e.type].emoji,
        title: e.title,
        subtitle: `Day ${dayIndex.get(e.dayId) ?? '?'}${e.startTime ? ` · ${e.startTime}` : ''}`,
      });
    }
    for (const a of accommodations) {
      if (!a.location) continue;
      out.push({ id: `acc-${a.id}`, point: a.location, emoji: '🏨', title: a.name, subtitle: '住宿' });
    }
    for (const p of places) {
      if (!p.location) continue;
      out.push({
        id: `pl-${p.id}`,
        point: p.location,
        emoji: '🍜',
        title: p.name,
        subtitle: `口袋名單${p.priceRange ? ` · ${p.priceRange}` : ''}`,
      });
    }
    return out;
  }, [trip?.id]);

  if (!trip || !pins) return null;

  return (
    <div className="flex h-full flex-col gap-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">地圖</h1>
        <span className="text-xs text-ink-3">{pins.length} 個地點</span>
      </header>

      {!online && (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
          離線中:地圖底圖需要網路,地點清單與導航連結仍可使用。
        </p>
      )}

      <div className="card min-h-[420px] flex-1 overflow-hidden">
        <MapContainer
          center={[34.85, 135.6]}
          zoom={10}
          className="h-full min-h-[420px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds pins={pins} />
          {pins.map((p) => (
            <Marker key={p.id} position={[p.point.lat, p.point.lng]} icon={emojiIcon(p.emoji)}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{p.emoji} {p.title}</p>
                  {p.subtitle && (
                    <p style={{ margin: '2px 0 6px', fontSize: 12, opacity: 0.7 }}>{p.subtitle}</p>
                  )}
                  <a
                    href={gmapsDirectionsUrl({ destination: p.point })}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, fontWeight: 700 }}
                  >
                    🧭 導航前往
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-center text-xs text-ink-3">
        行程景點・住宿・口袋名單自動上圖;點 marker 可直接導航
      </p>
    </div>
  );
}
