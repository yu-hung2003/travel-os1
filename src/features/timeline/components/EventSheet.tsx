import { useEffect, useState } from 'react';
import type { EventStatus, TimelineEvent, TripDay } from '@/domain/types';
import { eventRepository } from '@/data/repositories/eventRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { typeMeta } from '@/features/timeline/eventMeta';
import { gmapsDirectionsUrl } from '@/shared/utils/maps';
import type { TransitInfo } from '@/domain/types';

interface Props {
  event: TimelineEvent | null;
  days: TripDay[];
  /** the selected day's events in display order — used for 上一站/下一站 auto-fill */
  dayEvents?: TimelineEvent[];
  onClose: () => void;
}

export function EventSheet({ event, days, dayEvents = [], onClose }: Props) {
  const [note, setNote] = useState('');
  const [view, setView] = useState<'actions' | 'move' | 'confirmDelete' | 'transit' | 'timing'>('actions');
  const [durText, setDurText] = useState('');
  const [openUntil, setOpenUntil] = useState('');
  const [lastEntry, setLastEntry] = useState('');
  const [transit, setTransit] = useState<TransitInfo>({ mode: 'train' });

  useEffect(() => {
    setNote(event?.note ?? '');
    setTransit(event?.transit ? { ...event.transit } : { mode: 'train' });
    setDurText(event?.durationMin ? String(event.durationMin) : '');
    setOpenUntil(event?.openUntil ?? '');
    setLastEntry(event?.lastEntry ?? '');
    setView('actions');
  }, [event]);

  if (!event) return null;

  const setStatus = async (status: EventStatus) => {
    await eventRepository.setStatus(event.id, status);
    onClose();
  };

  const saveNote = async () => {
    await eventRepository.updateNote(event.id, note);
    onClose();
  };

  const moveTo = async (dayId: string) => {
    await eventRepository.moveToDay(event.id, dayId);
    onClose();
  };

  const remove = async () => {
    await eventRepository.deleteEvent(event.id);
    onClose();
  };

  const saveTransit = async () => {
    const cleaned: TransitInfo = {
      mode: transit.mode,
      line: transit.line?.trim() || undefined,
      from: transit.from?.trim() || undefined,
      to: transit.to?.trim() || undefined,
      station: transit.station?.trim() || undefined,
      platform: transit.platform?.trim() || undefined,
      exit: transit.exit?.trim() || undefined,
      trainType: transit.trainType?.trim() || undefined,
      durationMin: transit.durationMin || undefined,
      walkMin: transit.walkMin || undefined,
      distanceKm: transit.distanceKm || undefined,
      farePerAdult: transit.farePerAdult || undefined,
      fareNote: transit.fareNote?.trim() || undefined,
    };
    const empty = !cleaned.line && !cleaned.from && !cleaned.to && !cleaned.station &&
      !cleaned.durationMin && !cleaned.walkMin && !cleaned.distanceKm && !cleaned.farePerAdult;

    if (event.type === 'transport') {
      // transport cards edit their own transit info; editing re-confirms the route
      await eventRepository.updateTransit(event.id, empty ? undefined : cleaned);
      const total = (cleaned.durationMin ?? 0) + (cleaned.walkMin ?? 0);
      if (total > 0) await eventRepository.updateDuration(event.id, total);
      const { neighborSigOf } = await import('@/domain/schedule');
      await eventRepository.confirmNeighborSig(event.id, neighborSigOf(dayEvents, event.id));
    } else {
      // other cards spawn a standalone transport card right before them
      if (empty) {
        onClose();
        return;
      }
      const toLabel = cleaned.to ?? event.placeName ?? event.title;
      await eventRepository.insertTransportBefore({
        tripId: event.tripId,
        dayId: event.dayId,
        beforeEventId: event.id,
        title: `前往 ${toLabel}`,
        transit: cleaned,
      });
    }
    onClose();
  };

  const idx = dayEvents.findIndex((e) => e.id === event.id);
  const prevEvent = idx > 0 ? dayEvents[idx - 1] : undefined;
  const nextEvent = idx >= 0 && idx < dayEvents.length - 1 ? dayEvents[idx + 1] : undefined;
  const labelOf = (e: TimelineEvent) => e.transit?.to ?? e.placeName ?? e.title;

  const navDestination = event.location ?? event.transit?.to ?? event.placeName ?? event.title;
  const navMode =
    event.transit?.mode === 'walk' ? 'walking'
    : event.transit?.mode === 'taxi' ? 'driving'
    : 'transit';

  const actionBtn =
    'flex items-center gap-2 rounded-xl bg-surface-3 px-3 py-3 text-sm font-semibold active:opacity-70';

  const input =
    'mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-sm outline-none focus:border-primary';

  return (
    <BottomSheet open onClose={onClose} title={`${typeMeta[event.type].emoji} ${event.title}`}>
      {view === 'actions' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {event.status !== 'completed' && (
              <button className={actionBtn} onClick={() => setStatus('completed')}>
                ✅ 標記完成
              </button>
            )}
            {event.status !== 'postponed' && (
              <button className={actionBtn} onClick={() => setStatus('postponed')}>
                ⏳ 延後
              </button>
            )}
            {event.status !== 'skipped' && (
              <button className={actionBtn} onClick={() => setStatus('skipped')}>
                ⏭️ 略過
              </button>
            )}
            {event.status !== 'scheduled' && (
              <button className={actionBtn} onClick={() => setStatus('scheduled')}>
                ↩️ 恢復排程
              </button>
            )}
            <button className={actionBtn} onClick={() => setView('move')}>
              📆 移至其他天
            </button>
            <button
              className={actionBtn}
              onClick={async () => {
                await eventRepository.toggleFavorite(event.id);
                onClose();
              }}
            >
              {event.isFavorite ? '💔 取消收藏' : '⭐ 收藏'}
            </button>
            <a
              className={actionBtn}
              href={gmapsDirectionsUrl({ destination: navDestination, mode: navMode })}
              target="_blank"
              rel="noreferrer"
            >
              🧭 導航前往
            </a>
            {event.transit?.from && event.transit?.to && (
              <a
                className={actionBtn}
                href={gmapsDirectionsUrl({
                  origin: event.transit.from,
                  destination: event.transit.to,
                  mode: navMode,
                })}
                target="_blank"
                rel="noreferrer"
              >
                🚏 導航此段(A→B)
              </a>
            )}
            <button className={actionBtn} onClick={() => setView('timing')}>
              ⏱ 停留/營業時間
            </button>
            {event.type === 'transport' ? (
              <button className={actionBtn} onClick={() => setView('transit')}>
                🚃 編輯交通資訊
              </button>
            ) : (
              <button
                className={actionBtn}
                onClick={() => {
                  // prefill: previous stop → this place
                  setTransit((t) => ({
                    ...t,
                    from: t.from ?? (prevEvent ? labelOf(prevEvent) : undefined),
                    to: t.to ?? (event.placeName ?? event.title),
                  }));
                  setView('transit');
                }}
              >
                🚃 插入交通卡(前往此地)
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-2" htmlFor="event-note">
              備註
            </label>
            <textarea
              id="event-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="寫下提醒、心得、想吃的東西…"
              className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
            <button
              className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
              onClick={saveNote}
            >
              儲存備註
            </button>
          </div>

          <button
            className="text-sm font-semibold text-danger active:opacity-70"
            onClick={() => setView('confirmDelete')}
          >
            刪除此事件
          </button>
        </div>
      )}

      {view === 'move' && (
        <div className="flex flex-col gap-2">
          {days.map((d) => (
            <button
              key={d.id}
              disabled={d.id === event.dayId}
              onClick={() => moveTo(d.id)}
              className="flex items-center gap-3 rounded-xl bg-surface-3 px-4 py-3 text-left text-sm disabled:opacity-40 active:opacity-70"
            >
              <span className="font-bold text-primary">Day {d.dayIndex}</span>
              <span className="min-w-0 flex-1 truncate text-ink-2">{d.title}</span>
              {d.id === event.dayId && <span className="text-xs text-ink-3">目前</span>}
            </button>
          ))}
          <button className="mt-1 text-sm text-ink-3" onClick={() => setView('actions')}>
            ‹ 返回
          </button>
        </div>
      )}

      {view === 'timing' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-2">預計停留(分鐘)— 行程時刻將自動重算</label>
            <input
              type="number" inputMode="numeric" min="5" step="5"
              value={durText}
              onChange={(e) => setDurText(e.target.value)}
              placeholder="留空 = 預設"
              className={input}
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[30, 45, 60, 90, 120, 180].map((m) => (
                <button
                  key={m}
                  onClick={() => setDurText(String(m))}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    durText === String(m) ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                  }`}
                >
                  {m}分
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">營業至(選填)</label>
              <input type="time" value={openUntil} onChange={(e) => setOpenUntil(e.target.value)} className={input} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">最後入場(選填)</label>
              <input type="time" value={lastEntry} onChange={(e) => setLastEntry(e.target.value)} className={input} />
            </div>
          </div>
          <p className="text-xs text-ink-3">
            填了營業/入場時間後,若推算的抵達時間太晚,行程卡會自動出現打烊警示。
          </p>
          <button
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
            onClick={async () => {
              const dur = Number(durText);
              await eventRepository.updateDuration(
                event.id,
                Number.isFinite(dur) && dur > 0 ? Math.round(dur) : undefined,
              );
              await eventRepository.updateHours(event.id, openUntil, lastEntry);
              onClose();
            }}
          >
            儲存
          </button>
          <button className="text-sm text-ink-3" onClick={() => setView('actions')}>‹ 返回</button>
        </div>
      )}

      {view === 'transit' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              ['walk', '🚶 步行'], ['bus', '🚌 公車'], ['train', '🚃 電車'],
              ['subway', '🚇 地下鐵'], ['taxi', '🚕 計程車'], ['boat', '⛴️ 船'], ['flight', '✈️ 飛機'],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setTransit({ ...transit, mode: m })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  transit.mode === m ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {(prevEvent || nextEvent) && (
            <div className="flex flex-col gap-1.5">
              {prevEvent && (
                <button
                  onClick={() => setTransit({ ...transit, from: labelOf(prevEvent) })}
                  className="rounded-xl bg-surface-3 px-3 py-2 text-left text-xs font-semibold text-ink-2 active:opacity-70"
                >
                  ⬆️ 出發地帶入上一站:{labelOf(prevEvent)}
                </button>
              )}
              {nextEvent && (
                <button
                  onClick={() => setTransit({ ...transit, to: nextEvent.placeName ?? nextEvent.title })}
                  className="rounded-xl bg-surface-3 px-3 py-2 text-left text-xs font-semibold text-ink-2 active:opacity-70"
                >
                  ⬇️ 目的地帶入下一站:{nextEvent.placeName ?? nextEvent.title}
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">出發地</label>
              <input className={input} value={transit.from ?? ''}
                onChange={(e) => setTransit({ ...transit, from: e.target.value })} placeholder="難波站" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">目的地</label>
              <input className={input} value={transit.to ?? ''}
                onChange={(e) => setTransit({ ...transit, to: e.target.value })} placeholder="梅田站" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-2">路線/班次</label>
              <input className={input} value={transit.line ?? ''}
                onChange={(e) => setTransit({ ...transit, line: e.target.value })} placeholder="御堂筋線" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">車種</label>
              <input className={input} value={transit.trainType ?? ''}
                onChange={(e) => setTransit({ ...transit, trainType: e.target.value })} placeholder="新快速 / 特急" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink-2">車站</label>
              <input className={input} value={transit.station ?? ''}
                onChange={(e) => setTransit({ ...transit, station: e.target.value })} placeholder="難波站" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">月台</label>
              <input className={input} value={transit.platform ?? ''}
                onChange={(e) => setTransit({ ...transit, platform: e.target.value })} placeholder="2號" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">出口</label>
              <input className={input} value={transit.exit ?? ''}
                onChange={(e) => setTransit({ ...transit, exit: e.target.value })} placeholder="5號" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-ink-2">車程(分)</label>
              <input className={input} type="number" inputMode="numeric" min="0"
                value={transit.durationMin ?? ''}
                onChange={(e) => setTransit({ ...transit, durationMin: Number(e.target.value) || undefined })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">步行(分)</label>
              <input className={input} type="number" inputMode="numeric" min="0"
                value={transit.walkMin ?? ''}
                onChange={(e) => setTransit({ ...transit, walkMin: Number(e.target.value) || undefined })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">公里</label>
              <input className={input} type="number" inputMode="decimal" min="0" step="0.1"
                value={transit.distanceKm ?? ''}
                onChange={(e) => setTransit({ ...transit, distanceKm: Number(e.target.value) || undefined })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-2">票價/人</label>
              <input className={input} type="number" inputMode="numeric" min="0"
                value={transit.farePerAdult ?? ''}
                onChange={(e) => setTransit({ ...transit, farePerAdult: Number(e.target.value) || undefined })} />
            </div>
          </div>
          <button
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink active:opacity-80"
            onClick={saveTransit}
          >
            {event.type === 'transport' ? '儲存交通資訊' : '＋ 插入獨立交通卡'}
          </button>
          <button className="text-sm text-ink-3" onClick={() => setView('actions')}>‹ 返回</button>
        </div>
      )}

      {view === 'confirmDelete' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            確定刪除「{event.title}」?此動作無法復原。若只是今天不去,建議改用「略過」或「延後」保留資料。
          </p>
          <button
            className="rounded-xl bg-danger py-3 text-sm font-bold text-white active:opacity-80"
            onClick={remove}
          >
            確認刪除
          </button>
          <button className="text-sm text-ink-3" onClick={() => setView('actions')}>
            取消
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
