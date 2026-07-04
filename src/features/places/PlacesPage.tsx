import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { tripRepository } from '@/data/repositories/tripRepository';
import { placeRepository, type PlaceInput } from '@/data/repositories/placeRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { SchedulePlaceSheet } from '@/features/places/components/SchedulePlaceSheet';
import { distanceKm, gmapsDirectionsUrl, gmapsSearchUrl, parseGoogleMapsUrl } from '@/shared/utils/maps';
import type { GeoPoint, MealType, Place, PlaceStatus } from '@/domain/types';

const statusMeta: Record<PlaceStatus, { label: string; cls: string }> = {
  candidate: { label: '備選', cls: 'bg-surface-3 text-ink-2' },
  chosen: { label: '已選定', cls: 'bg-primary/15 text-primary' },
  scheduled: { label: '已加入行程', cls: 'bg-accent/15 text-accent' },
  visited: { label: '去過了', cls: 'bg-success/15 text-success' },
};

const statusOrder: PlaceStatus[] = ['scheduled', 'chosen', 'candidate', 'visited'];

const mealMeta: Record<MealType, { emoji: string; label: string }> = {
  breakfast: { emoji: '🍳', label: '早餐' },
  lunch: { emoji: '🍜', label: '中餐' },
  dinner: { emoji: '🍽️', label: '晚餐' },
  snack: { emoji: '🧋', label: '點心/飲料' },
};
const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function parseCoords(text: string): GeoPoint | undefined {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

export default function PlacesPage() {
  const trip = useLiveQuery(async () => {
    const pref = await db.prefs.get('default');
    if (pref?.activeTripId) {
      const t = await tripRepository.getTrip(pref.activeTripId);
      if (t) return t;
    }
    return (await tripRepository.listTrips())[0];
  });
  const places = useLiveQuery(
    () => (trip ? placeRepository.list(trip.id) : Promise.resolve([])),
    [trip?.id],
  );

  const [editing, setEditing] = useState<Place | 'new' | null>(null);
  const [scheduling, setScheduling] = useState<Place | null>(null);
  const [form, setForm] = useState<PlaceInput | null>(null);
  const [coordsText, setCoordsText] = useState('');
  const [gmLink, setGmLink] = useState('');
  const [gmLinkMsg, setGmLinkMsg] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [mealFilter, setMealFilter] = useState<MealType | null>(null);

  useEffect(() => {
    if (!trip || editing === null) return;
    if (editing === 'new') {
      setForm({ tripId: trip.id, name: '', status: 'candidate' });
      setCoordsText('');
      setGmLink('');
      setGmLinkMsg(null);
    } else {
      setForm({
        tripId: trip.id,
        name: editing.name,
        mealTypes: editing.mealTypes,
        needsReservation: editing.needsReservation,
        priceRange: editing.priceRange,
        hours: editing.hours,
        webUrl: editing.webUrl,
        menuUrl: editing.menuUrl,
        location: editing.location,
        note: editing.note,
        status: editing.status,
      });
      setCoordsText(editing.location ? `${editing.location.lat}, ${editing.location.lng}` : '');
    }
  }, [editing, trip]);

  if (!trip || !places) return null;

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('此裝置/瀏覽器不支援定位。');
      return;
    }
    setLocating(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setGeoMsg(null);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setGeoMsg(
            '定位權限被拒。iPhone:設定 → 隱私權與安全性 → 定位服務 → Safari 網站 設為「使用 App 期間」;若加入主畫面開啟,請重新開啟 App 後再按一次並允許。',
          );
        } else if (err.code === 3) {
          setGeoMsg('定位逾時,請到訊號較好的地方(室外)再試一次。');
        } else {
          setGeoMsg('暫時無法取得位置,稍後再試。');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  };

  const save = async () => {
    if (!form || !form.name.trim()) return;
    const payload: PlaceInput = {
      ...form,
      name: form.name.trim(),
      priceRange: form.priceRange?.trim() || undefined,
      hours: form.hours?.trim() || undefined,
      webUrl: form.webUrl?.trim() || undefined,
      menuUrl: form.menuUrl?.trim() || undefined,
      note: form.note?.trim() || undefined,
      location: coordsText.trim() ? parseCoords(coordsText) : undefined,
    };
    if (editing === 'new') await placeRepository.add(payload);
    else if (editing) await placeRepository.update(editing.id, payload);
    setEditing(null);
  };

  const input =
    'mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary';

  const visiblePlaces = mealFilter
    ? places.filter((p) => p.mealTypes?.includes(mealFilter))
    : places;
  const groups = statusOrder
    .map((st) => ({ st, rows: visiblePlaces.filter((p) => p.status === st) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">餐廳口袋名單</h1>
        <button
          className="text-sm font-semibold text-primary disabled:opacity-50"
          onClick={locate}
          disabled={locating}
        >
          {locating ? '定位中…' : myLocation ? '📍 已定位' : '📍 定位計算距離'}
        </button>
      </header>

      {geoMsg && (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold leading-relaxed text-warning">
          📍 {geoMsg}
        </p>
      )}

      <button
        onClick={() => setEditing('new')}
        className="rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-ink active:opacity-80"
      >
        ＋ 加入口袋名單
      </button>

      {places.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-1.5">
            <button
              onClick={() => setMealFilter(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                mealFilter === null ? 'bg-primary text-primary-ink' : 'bg-surface-2 border border-line/60 text-ink-2'
              }`}
            >
              全部
            </button>
            {mealOrder.map((m) => (
              <button
                key={m}
                onClick={() => setMealFilter(mealFilter === m ? null : m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  mealFilter === m ? 'bg-primary text-primary-ink' : 'bg-surface-2 border border-line/60 text-ink-2'
                }`}
              >
                {mealMeta[m].emoji} {mealMeta[m].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {places.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-3">
          把想吃的餐廳先收進來:是否要訂位、價位、營業時間、菜單連結——
          到了當地再看距離決定去哪間。
        </p>
      )}

      {groups.map(({ st, rows }) => (
        <section key={st} className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold text-ink-2">
            {statusMeta[st].label}({rows.length})
          </h2>
          {rows.map((p) => {
            const dist =
              myLocation && p.location ? distanceKm(myLocation, p.location) : undefined;
            return (
              <div key={p.id} className="card p-4">
                <button className="w-full text-left active:opacity-70" onClick={() => setEditing(p)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-snug">{p.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta[p.status].cls}`}>
                      {statusMeta[p.status].label}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-2">
                    {p.mealTypes && p.mealTypes.length > 0 && (
                      <span>{p.mealTypes.map((m) => `${mealMeta[m].emoji}${mealMeta[m].label}`).join(' ')}</span>
                    )}
                    {p.needsReservation !== undefined && (
                      <span className={p.needsReservation ? 'font-semibold text-warning' : ''}>
                        {p.needsReservation ? '📞 需訂位' : '免訂位'}
                      </span>
                    )}
                    {p.priceRange && <span>💴 {p.priceRange}</span>}
                    {p.hours && <span>🕐 {p.hours}</span>}
                    {dist !== undefined && (
                      <span className="font-semibold text-accent">
                        📍 直線約 {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                      </span>
                    )}
                  </p>
                  {p.note && <p className="mt-1 text-xs text-ink-3">{p.note}</p>}
                </button>

                {/* quick links */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <a
                    href={gmapsDirectionsUrl({
                      destination: p.location ?? p.name,
                      origin: myLocation ?? undefined,
                      mode: 'transit',
                    })}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                  >
                    🧭 路線
                  </a>
                  <a
                    href={p.location ? gmapsSearchUrl(`${p.location.lat},${p.location.lng}`) : gmapsSearchUrl(p.name)}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                  >
                    🗺️ 地點
                  </a>
                  {p.webUrl && (
                    <a href={p.webUrl} target="_blank" rel="noreferrer"
                      className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70">
                      🔗 官網/介紹
                    </a>
                  )}
                  {p.menuUrl && (
                    <a href={p.menuUrl} target="_blank" rel="noreferrer"
                      className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70">
                      📖 菜單
                    </a>
                  )}
                  {p.status !== 'scheduled' && p.status !== 'visited' && (
                    <button
                      onClick={() => setScheduling(p)}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-ink active:opacity-80"
                    >
                      📅 排入行程
                    </button>
                  )}
                  {p.status !== 'chosen' && p.status !== 'scheduled' && (
                    <button
                      onClick={() => placeRepository.setStatus(p.id, 'chosen')}
                      className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary active:opacity-70"
                    >
                      ✓ 選定
                    </button>
                  )}
                  {p.status !== 'candidate' && (
                    <button
                      onClick={() => placeRepository.setStatus(p.id, 'candidate')}
                      className="rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-2 active:opacity-70"
                    >
                      ↩ 回備選
                    </button>
                  )}
                  {p.status !== 'visited' && (
                    <button
                      onClick={() => placeRepository.setStatus(p.id, 'visited')}
                      className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success active:opacity-70"
                    >
                      去過了
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {/* add / edit sheet */}
      <BottomSheet
        open={editing !== null && form !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? '加入口袋名單' : '編輯餐廳'}
      >
        {form && (
          <div className="flex flex-col gap-3">
            {editing === 'new' && (
              <div className="rounded-xl bg-surface-3 p-3">
                <label className="text-xs font-semibold text-ink-2">
                  ⚡ 懶人匯入:貼上 Google Maps 完整連結,自動帶入店名與座標
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={gmLink}
                    onChange={(e) => setGmLink(e.target.value)}
                    placeholder="https://www.google.com/maps/place/…"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    disabled={!gmLink.trim()}
                    onClick={() => {
                      const parsed = parseGoogleMapsUrl(gmLink);
                      if (!parsed) {
                        setGmLinkMsg(
                          /goo\.gl|maps\.app/i.test(gmLink)
                            ? '這是短連結,無法直接解析。請先在瀏覽器開啟該連結,再從網址列複製完整網址貼入。'
                            : '無法解析這個連結,請確認是 Google Maps 的地點網址。',
                        );
                        return;
                      }
                      setForm((f) => f ? {
                        ...f,
                        name: parsed.name ?? f.name,
                        webUrl: f.webUrl ?? gmLink.trim(),
                      } : f);
                      if (parsed.location) {
                        setCoordsText(`${parsed.location.lat}, ${parsed.location.lng}`);
                      }
                      setGmLinkMsg(
                        parsed.name
                          ? `✅ 已帶入:${parsed.name}${parsed.location ? '(含座標)' : ''}`
                          : '✅ 已帶入座標,店名請自行填寫。',
                      );
                    }}
                    className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
                  >
                    帶入
                  </button>
                </div>
                {gmLinkMsg && (
                  <p className={`mt-1.5 text-xs ${gmLinkMsg.startsWith('✅') ? 'text-success' : 'text-warning'}`}>
                    {gmLinkMsg}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-ink-2">店名</label>
              <input className={input} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如:たこ家道頓堀くくる" />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-2">分類(可複選)</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {mealOrder.map((m) => {
                  const on = form.mealTypes?.includes(m) ?? false;
                  return (
                    <button
                      key={m}
                      onClick={() =>
                        setForm({
                          ...form,
                          mealTypes: on
                            ? (form.mealTypes ?? []).filter((x) => x !== m)
                            : [...(form.mealTypes ?? []), m],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        on ? 'bg-accent text-white' : 'bg-surface-3 text-ink-2'
                      }`}
                    >
                      {mealMeta[m].emoji} {mealMeta[m].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              {([[true, '📞 需訂位'], [false, '免訂位'], [undefined, '不確定']] as const).map(([v, label]) => (
                <button
                  key={label}
                  onClick={() => setForm({ ...form, needsReservation: v })}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold ${
                    form.needsReservation === v ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-2">價位(選填)</label>
                <input className={input} value={form.priceRange ?? ''}
                  onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
                  placeholder="¥1,000-2,000/人" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-2">營業時間(選填)</label>
                <input className={input} value={form.hours ?? ''}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="11:00-21:00 週三休" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-2">官網/介紹連結(選填)</label>
              <input className={input} type="url" value={form.webUrl ?? ''}
                onChange={(e) => setForm({ ...form, webUrl: e.target.value })}
                placeholder="https://tabelog.com/…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">菜單連結(選填)</label>
              <input className={input} type="url" value={form.menuUrl ?? ''}
                onChange={(e) => setForm({ ...form, menuUrl: e.target.value })}
                placeholder="https://…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">
                座標(選填,可算距離)— Google Maps 長按地點複製「緯度, 經度」貼上
              </label>
              <input className={input} value={coordsText}
                onChange={(e) => setCoordsText(e.target.value)}
                placeholder="34.6687, 135.5013" />
              {coordsText.trim() !== '' && !parseCoords(coordsText) && (
                <p className="mt-1 text-xs text-danger">格式不正確,範例:34.6687, 135.5013</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">備註(選填)</label>
              <textarea rows={2} className={input} value={form.note ?? ''}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="招牌菜、注意事項…" />
            </div>

            <button
              disabled={!form.name.trim()}
              onClick={save}
              className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
            >
              儲存
            </button>
            {editing !== 'new' && editing !== null && (
              <button
                className="text-sm font-semibold text-danger active:opacity-70"
                onClick={async () => {
                  await placeRepository.remove(editing.id);
                  setEditing(null);
                }}
              >
                從名單移除
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {scheduling && (
        <SchedulePlaceSheet place={scheduling} trip={trip} onClose={() => setScheduling(null)} />
      )}
    </div>
  );
}
