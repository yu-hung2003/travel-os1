import { db } from '@/data/db';
import { newId } from '@/shared/utils/id';
import type { EventStatus, EventType, TimelineEvent } from '@/domain/types';

export const eventRepository = {
  /** FSM transition; any status can return to 'scheduled' (undo). */
  async setStatus(eventId: string, status: EventStatus): Promise<void> {
    await db.events.update(eventId, { status, updatedAt: Date.now() });
  },

  async updateNote(eventId: string, note: string): Promise<void> {
    await db.events.update(eventId, { note: note.trim() || undefined, updatedAt: Date.now() });
  },

  async toggleFavorite(eventId: string): Promise<void> {
    const ev = await db.events.get(eventId);
    if (!ev) return;
    await db.events.update(eventId, { isFavorite: !ev.isFavorite, updatedAt: Date.now() });
  },

  /** Persist a full drag-and-drop reorder for one day. */
  async reorderDay(_dayId: string, orderedIds: string[]): Promise<void> {
    await db.transaction('rw', db.events, async () => {
      await Promise.all(
        orderedIds.map((id, i) =>
          db.events.update(id, { order: i + 1, updatedAt: Date.now() }),
        ),
      );
    });
  },

  /** Move event to another day (appended at the end, back to 'scheduled'). */
  async moveToDay(eventId: string, targetDayId: string): Promise<void> {
    await db.transaction('rw', db.events, async () => {
      const siblings = await db.events.where('dayId').equals(targetDayId).toArray();
      const maxOrder = siblings.reduce((m, e) => Math.max(m, e.order), 0);
      await db.events.update(eventId, {
        dayId: targetDayId,
        order: maxOrder + 1,
        status: 'scheduled',
        updatedAt: Date.now(),
      });
    });
  },

  async addEvent(input: {
    tripId: string;
    dayId: string;
    type: EventType;
    title: string;
    startTime?: string;
    endTime?: string;
    note?: string;
  }): Promise<void> {
    await db.transaction('rw', db.events, async () => {
      const siblings = await db.events.where('dayId').equals(input.dayId).toArray();
      const maxOrder = siblings.reduce((m, e) => Math.max(m, e.order), 0);
      const event: TimelineEvent = {
        id: newId(),
        tripId: input.tripId,
        dayId: input.dayId,
        order: maxOrder + 1,
        type: input.type,
        title: input.title.trim(),
        startTime: input.startTime || undefined,
        endTime: input.endTime || undefined,
        note: input.note?.trim() || undefined,
        status: 'scheduled',
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.events.add(event);
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    await db.events.delete(eventId);
  },
};
