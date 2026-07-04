import { db } from '@/data/db';
import type { Trip, TripDay, TimelineEvent, Accommodation } from '@/domain/types';

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
  getAccommodation(id: string): Promise<Accommodation | undefined> {
    return db.accommodations.get(id);
  },
  listAccommodations(tripId: string): Promise<Accommodation[]> {
    return db.accommodations.where('tripId').equals(tripId).sortBy('checkInDate');
  },
};
