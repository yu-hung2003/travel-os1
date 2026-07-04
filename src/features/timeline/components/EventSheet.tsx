import { useEffect, useState } from 'react';
import type { EventStatus, TimelineEvent, TripDay } from '@/domain/types';
import { eventRepository } from '@/data/repositories/eventRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { typeMeta } from '@/features/timeline/eventMeta';

interface Props {
  event: TimelineEvent | null;
  days: TripDay[];
  onClose: () => void;
}

export function EventSheet({ event, days, onClose }: Props) {
  const [note, setNote] = useState('');
  const [view, setView] = useState<'actions' | 'move' | 'confirmDelete'>('actions');

  useEffect(() => {
    setNote(event?.note ?? '');
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

  const actionBtn =
    'flex items-center gap-2 rounded-xl bg-surface-3 px-3 py-3 text-sm font-semibold active:opacity-70';

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
