/* ---------------------------------------------------------------
   Travel OS · Domain model
   All entities hang off a tripId so the system scales beyond
   the first Kyoto-Osaka trip.
---------------------------------------------------------------- */

export type ID = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed';

export interface Trip {
  id: ID;
  title: string;
  destination: string;
  /** IANA timezone of the destination, e.g. 'Asia/Tokyo' */
  timezone: string;
  /** ISO date (yyyy-MM-dd), local to destination */
  startDate: string;
  endDate: string;
  currency: string;          // e.g. 'JPY'
  homeCurrency: string;      // e.g. 'TWD'
  totalBudget?: number;      // in trip currency
  travelers: Traveler[];
  status: TripStatus;
  coverEmoji?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Traveler {
  id: ID;
  name: string;
  /** child fares are half price on JR / subway */
  isChild: boolean;
}

export interface TripDay {
  id: ID;
  tripId: ID;
  dayIndex: number;          // 1-based: Day 1, Day 2...
  date: string;              // ISO date
  title?: string;            // e.g. '宇治 → 伏見稻荷 → 清水寺'
  accommodationId?: ID;
  note?: string;
}

export type EventType =
  | 'sight' | 'food' | 'transport' | 'hotel'
  | 'shopping' | 'flight' | 'rest' | 'custom';

/**
 * Timeline event finite state machine:
 *   scheduled → completed | skipped | postponed
 * postponed events keep their data and can be re-slotted into any day.
 */
export type EventStatus = 'scheduled' | 'completed' | 'skipped' | 'postponed';

export interface TimelineEvent {
  id: ID;
  tripId: ID;
  dayId: ID;
  /** ordering within the day; drag-and-drop rewrites this */
  order: number;
  type: EventType;
  title: string;
  /** 'HH:mm' local to trip timezone; optional for flexible events */
  startTime?: string;
  endTime?: string;
  location?: GeoPoint;
  placeName?: string;
  /** transit details: line, fare, duration */
  transit?: TransitInfo;
  costEstimate?: number;     // trip currency
  status: EventStatus;
  isFavorite: boolean;
  note?: string;
  /** warnings surfaced on Dashboard, e.g. '需提前 1-2 週預約' */
  alert?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TransitInfo {
  mode: 'train' | 'subway' | 'bus' | 'taxi' | 'walk' | 'flight' | 'boat';
  line?: string;             // e.g. 'JR 奈良線（區間快速）'
  from?: string;
  to?: string;
  durationMin?: number;
  farePerAdult?: number;     // trip currency
  fareNote?: string;         // e.g. '兒童半價'
}

export type ExpenseCategory =
  | 'breakfast' | 'lunch' | 'dinner' | 'coffee' | 'transport'
  | 'ticket' | 'shopping' | 'snack' | 'other';

export interface Expense {
  id: ID;
  tripId: ID;
  dayId?: ID;
  eventId?: ID;
  category: ExpenseCategory;
  amount: number;            // trip currency
  amountHome?: number;       // converted, optional
  paidBy?: ID;               // traveler id
  note?: string;
  timestamp: number;
}

export interface JournalEntry {
  id: ID;
  tripId: ID;
  dayId: ID;
  text: string;
  photos: Blob[];
  createdAt: number;
  updatedAt: number;
}

export interface PackingItem {
  id: ID;
  tripId: ID;
  category: string;          // e.g. '衣物' | '電子' | '防暑'
  name: string;
  qty: number;
  checked: boolean;
}

export interface Accommodation {
  id: ID;
  tripId: ID;
  name: string;
  address?: string;
  location?: GeoPoint;
  checkInDate: string;       // ISO date
  checkOutDate: string;
  checkInTime?: string;      // 'HH:mm'
  bookingRef?: string;
  note?: string;
}

export interface WeatherCache {
  /** e.g. 'kyoto' | 'osaka' */
  locationKey: string;
  fetchedAt: number;
  payload: unknown;
}

export type ThemePref = 'light' | 'dark' | 'auto';

export interface UserPref {
  key: string;               // singleton row: 'default'
  theme: ThemePref;
  homeCurrency: string;
  activeTripId?: ID;
}
