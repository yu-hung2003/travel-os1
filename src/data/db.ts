import Dexie, { type Table } from 'dexie';
import type {
  Trip, TripDay, TimelineEvent, Expense, JournalEntry,
  PackingItem, Accommodation, WeatherCache, UserPref,
} from '@/domain/types';

/**
 * Travel OS local database (IndexedDB via Dexie).
 * Schema changes MUST bump the version number and, when needed,
 * provide an upgrade() migration — never mutate version 1 in place
 * once real user data exists.
 */
export class TravelOSDB extends Dexie {
  trips!: Table<Trip, string>;
  days!: Table<TripDay, string>;
  events!: Table<TimelineEvent, string>;
  expenses!: Table<Expense, string>;
  journal!: Table<JournalEntry, string>;
  packing!: Table<PackingItem, string>;
  accommodations!: Table<Accommodation, string>;
  weatherCache!: Table<WeatherCache, string>;
  prefs!: Table<UserPref, string>;

  constructor() {
    super('travel-os');
    this.version(1).stores({
      trips: 'id, status, startDate',
      days: 'id, tripId, [tripId+dayIndex], date',
      events: 'id, tripId, dayId, [dayId+order], status',
      expenses: 'id, tripId, dayId, eventId, category, timestamp',
      journal: 'id, tripId, dayId, createdAt',
      packing: 'id, tripId, category',
      accommodations: 'id, tripId, checkInDate',
      weatherCache: 'locationKey, fetchedAt',
      prefs: 'key',
    });
  }
}

export const db = new TravelOSDB();
