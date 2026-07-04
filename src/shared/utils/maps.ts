import type { GeoPoint } from '@/domain/types';

export type TravelMode = 'walking' | 'transit' | 'driving';

/** Free Google Maps deep links — no API key, opens the native app on mobile. */
export function gmapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function gmapsDirectionsUrl(opts: {
  destination: string | GeoPoint;
  origin?: string | GeoPoint;
  mode?: TravelMode;
}): string {
  const fmt = (v: string | GeoPoint) =>
    typeof v === 'string' ? encodeURIComponent(v) : `${v.lat},${v.lng}`;
  const params = new URLSearchParams({ api: '1' });
  params.set('destination', fmt(opts.destination));
  if (opts.origin) params.set('origin', fmt(opts.origin));
  params.set('travelmode', opts.mode ?? 'transit');
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Straight-line distance in km (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
