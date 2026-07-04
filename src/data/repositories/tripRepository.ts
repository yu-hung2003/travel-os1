import { db } from '@/data/db';
import type { Trip, TripDay, TimelineEvent, Accommodation, Traveler } from '@/domain/types';

export const tripRepository = {
  listTrips(): Promise<Trip[]> {
    return db.trips.orderBy('startDate').toArray();
  },
  getTrip(tripId: string): Promise<Trip | undefined> {
    return db.trips.get(tripId);
  },
  listDays(tripId: string): Promise<TripDay[]> {
    return db.days.where('tripId').equals(tripId).sortBy('dayIndex');
  },
  listDayEvents(dayId: string): Promise<TimelineEvent[]> {
    return db.events.where('dayId').equals(dayId).sortBy('order');
  },
  listTripEvents(tripId: string): Promise<TimelineEvent[]> {
    return db.events.where('tripId').equals(tripId).toArray();
  },
  /** Replace the traveler list; also strips deleted ids from expense tags. */
  async updateTravelers(tripId: string, travelers: Traveler[]): Promise<void> {
    const keep = new Set(travelers.map((t) => t.id));
    await db.transaction('rw', [db.trips, db.expenses], async () => {
      await db.trips.update(tripId, { travelers, updatedAt: Date.now() });
      await db.expenses.where('tripId').equals(tripId).modify((e) => {
        if (e.memberIds?.some((id) => !keep.has(id))) {
          e.memberIds = e.memberIds.filter((id) => keep.has(id));
        }
      });
    });
  },

  getAccommodation(id: string): Promise<Accommodation | undefined> {
    return db.accommodations.get(id);
  },
  listAccommodations(tripId: string): Promise<Accommodation[]> {
    return db.accommodations.where('tripId').equals(tripId).sortBy('checkInDate');
  },
};
