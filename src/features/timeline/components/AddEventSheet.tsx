import { useState } from 'react';
import type { EventType } from '@/domain/types';
import { eventRepository } from '@/data/repositories/eventRepository';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { addableTypes, typeMeta } from '@/features/timeline/eventMeta';

interface Props {
  open: boolean;
  tripId: string;
  dayId: string;
  onClose: () => void;
}

export function AddEventSheet({ open, tripId, dayId, onClose }: Props) {
  const [type, setType] = useState<EventType>('sight');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const reset = () => {
    setType('sight');
    setTitle('');
    setStartTime('');
    setEndTime('');
  };

  const submit = async () => {
    if (!title.trim()) return;
    await eventRepository.addEvent({ tripId, dayId, type, title, startTime, endTime });
    reset();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="新增事件">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {addableTypes.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                type === t ? 'bg-primary text-primary-ink' : 'bg-surface-3 text-ink-2'
              }`}
            >
              {typeMeta[t].emoji} {typeMeta[t].label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-2" htmlFor="new-title">
            名稱
          </label>
          <input
            id="new-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如:午後改逛 PARCO 避暑"
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-2" htmlFor="new-start">
              開始(可留空)
            </label>
            <input
              id="new-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2" htmlFor="new-end">
              結束(可留空)
            </label>
            <input
              id="new-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <button
          disabled={!title.trim()}
          onClick={submit}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-ink disabled:opacity-40 active:opacity-80"
        >
          加入 Day 行程
        </button>
      </div>
    </BottomSheet>
  );
}
