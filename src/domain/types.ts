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
  /** link back to a wishlist Place — enables completed→visited sync */
  placeId?: ID;
  createdAt: number;
  updatedAt: number;
}

export interface TransitInfo {
  mode: 'train' | 'subway' | 'bus' | 'taxi' | 'walk' | 'flight' | 'boat';
  line?: string;             // e.g. 'JR 奈良線（區間快速）'
  from?: string;
  to?: string;
  durationMin?: number;
  distanceKm?: number;
  farePerAdult?: number;     // trip currency
  fareNote?: string;         // e.g. '兒童半價'
}

/** Airport transfer / private car booking */
export interface Transfer {
  id: ID;
  tripId: ID;
  title: string;             // e.g. '去程:桃園機場接送'
  /** ISO local datetime, e.g. '2026-08-08T09:30' */
  datetime?: string;
  amount?: number;
  currency?: string;         // defaults to trip currency context
  contactName?: string;
  contactPhone?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export type PlaceStatus = 'candidate' | 'chosen' | 'scheduled' | 'visited';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Restaurant / spot wishlist entry */
export interface Place {
  id: ID;
  tripId: ID;
  name: string;
  /** which meals this place suits — multi-select */
  mealTypes?: MealType[];
  needsReservation?: boolean;
  priceRange?: string;       // e.g. '¥1,000-2,000/人'
  hours?: string;            // e.g. '11:00-21:00,週三休'
  webUrl?: string;
  menuUrl?: string;
  location?: GeoPoint;
  note?: string;
  status: PlaceStatus;
  createdAt: number;
  updatedAt: number;
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
  /** tagged members; empty/undefined = shared by everyone */
  memberIds?: ID[];
  /** @deprecated superseded by memberIds (kept for v1 data) */
  paidBy?: ID;
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

export type BagKind = 'carry' | 'checked';

export interface PackingItem {
  id: ID;
  tripId: ID;
  /** carry-on (隨身) vs checked luggage (託運大件) */
  bag: BagKind;
  category: string;          // e.g. '證件' | '電子' | '防暑' | '衣物'
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
