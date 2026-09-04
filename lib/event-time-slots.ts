/**
 * Event start/end time slots for the service-order form.
 *
 * An event's "operating day" is not a calendar day: it opens at 06:00 on the
 * event date and runs to 04:00 the following morning, so a wedding can start at
 * 20:00 on the 9th and end at 03:00 on the 10th.
 *
 * Everything here works in **minutes offset from 06:00 on the event date**, so
 * "is the end after the start" is a plain numeric comparison even when the end
 * is past midnight. Comparing raw clock times would say 03:00 < 20:00 and
 * reject a perfectly normal late-night event.
 *
 *   offset 0    → 06:00 (event date)
 *   offset 1050 → 23:30 (event date)      ← last selectable start
 *   offset 1080 → 00:00 (next day)
 *   offset 1320 → 04:00 (next day)        ← last selectable end
 *
 * The wire format is unchanged: `event_time` and `event_end_time` are still
 * plain `HH:mm` strings with no date. The backend infers "next day" the same way
 * this module does — an end at or before the start rolls forward one day
 * (`Invitation::eventEndsAt()` already does exactly that).
 */

/** Clock minutes at which the operating day opens. */
const DAY_OPENS_AT = 6 * 60; // 06:00

/** Slot granularity — 06:00, 06:30, 07:00, … */
export const SLOT_STEP_MINUTES = 30;

/** Last start offset: 23:30 on the event date. */
const LAST_START_OFFSET = 17 * 60 + 30; // → 23:30

/** Last end offset: 04:00 the next morning. */
const LAST_END_OFFSET = 22 * 60; // → 04:00 next day

/**
 * The backend's timezone (`config/app.php`), which is what its own
 * `event_date|after_or_equal:today` and `validateEventStartNotInPastToday`
 * rules compare against.
 *
 * Deliberately **not** the browser's timezone: an admin whose machine is set
 * elsewhere would otherwise be offered a slot the server rejects, or denied one
 * it would accept. Kuwait and Riyadh are both UTC+3 with no DST, so for a local
 * admin this is identical to their own clock — it only matters for the edge case.
 */
const EVENT_TIMEZONE = 'Asia/Riyadh';

/** `{ date: 'YYYY-MM-DD', clockMinutes }` — right now, in `EVENT_TIMEZONE`. */
function eventZoneNow(): { date: string; clockMinutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // `hour12: false` yields "24" for midnight in some engines; h23 gives "00".
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? '00';

  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    clockMinutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

/** Today's `YYYY-MM-DD` in the backend's timezone — the date picker's floor. */
export function todayInEventZone(): string {
  return eventZoneNow().date;
}

/**
 * The earliest start offset selectable for a given event date.
 *
 * Booking for **today** is allowed, but the start still has to be in the future:
 * at 12:18 the first offer is 12:30. Mirrors the backend, which rejects a
 * same-day start at *or before* now — hence the next slot strictly after the
 * current one, so 12:30 sharp offers 13:00 rather than itself.
 *
 * Any other date (including a past one, which edit mode may legitimately hold)
 * opens the whole 06:00 window.
 */
export function earliestStartOffset(eventDate: string): number {
  const now = eventZoneNow();
  if (!eventDate || eventDate !== now.date) return 0;

  const nextSlot =
    (Math.floor(now.clockMinutes / SLOT_STEP_MINUTES) + 1) * SLOT_STEP_MINUTES;

  // Before 06:00 the whole operating day is still ahead, so clamp at 0.
  return Math.max(0, nextSlot - DAY_OPENS_AT);
}

/**
 * True when a start time has already passed on a *today* event date. Returns
 * false for an unparseable or out-of-window start — `validateTimeRange` reports
 * those as `start_out_of_range` instead, and one complaint per field is enough.
 */
export function isStartInPast(eventDate: string, startTime: string): boolean {
  const offset = startOffset(startTime);
  if (offset === null) return false;
  return offset < earliestStartOffset(eventDate);
}

export interface TimeSlot {
  /** `HH:mm`, exactly what goes on the wire. */
  value: string;
  /** Minutes from 06:00 on the event date. */
  offset: number;
  /** True when this clock time lands on the day after the event date. */
  nextDay: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Offset → the `HH:mm` that will be sent to the API. */
function offsetToValue(offset: number): string {
  const clock = (DAY_OPENS_AT + offset) % (24 * 60);
  return `${pad(Math.floor(clock / 60))}:${pad(clock % 60)}`;
}

function makeSlot(offset: number): TimeSlot {
  return {
    value: offsetToValue(offset),
    offset,
    nextDay: DAY_OPENS_AT + offset >= 24 * 60,
  };
}

/** `"20:30"` → 1230 clock-minutes. Null when unparseable. */
function toClockMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/**
 * A start time's offset. Times between 00:00 and 05:59 belong to the *end* of the
 * previous operating day and are not valid starts, so they return null — as does
 * anything unparseable.
 */
export function startOffset(time: string): number | null {
  const clock = toClockMinutes(time);
  if (clock === null) return null;
  const offset = clock - DAY_OPENS_AT;
  return offset >= 0 ? offset : null;
}

/**
 * An end time's offset, resolved against its start: the same clock time can be
 * today or tomorrow, and the rule is that an end at or before the start rolls
 * forward a day. Mirrors the backend.
 */
export function endOffset(endTime: string, startTime: string): number | null {
  const endClock = toClockMinutes(endTime);
  const startClock = toClockMinutes(startTime);
  if (endClock === null) return null;

  const rawOffset = endClock - DAY_OPENS_AT;

  // No start to compare against: read it as same-day when it can be.
  if (startClock === null) return rawOffset >= 0 ? rawOffset : rawOffset + 24 * 60;

  return endClock > startClock ? rawOffset : rawOffset + 24 * 60;
}

/**
 * Selectable start times: every 30 minutes up to 23:30 on the event date.
 *
 * Pass `eventDate` to drop the slots that have already passed when that date is
 * today. Omitting it offers the full 06:00–23:30 window. The list is **empty**
 * when today is chosen after 23:30 — the caller has to say "pick another day"
 * rather than render a dropdown with nothing in it.
 */
export function startSlots(eventDate?: string): TimeSlot[] {
  const first = eventDate ? earliestStartOffset(eventDate) : 0;

  const slots: TimeSlot[] = [];
  for (let o = first; o <= LAST_START_OFFSET; o += SLOT_STEP_MINUTES) {
    slots.push(makeSlot(o));
  }
  return slots;
}

/**
 * Selectable end times for a given start: every 30 minutes strictly after it, up
 * to 04:00 the next morning. Empty when the start is missing or unparseable.
 */
export function endSlots(startTime: string): TimeSlot[] {
  const start = startOffset(startTime);
  if (start === null) return [];

  const slots: TimeSlot[] = [];
  for (let o = start + SLOT_STEP_MINUTES; o <= LAST_END_OFFSET; o += SLOT_STEP_MINUTES) {
    slots.push(makeSlot(o));
  }
  return slots;
}

/**
 * Human label, e.g. `08:30 PM` / `٠٨:٣٠ م`, with next-day ends marked so
 * "03:00 AM" is never mistaken for the morning of the event date.
 */
export function slotLabel(slot: TimeSlot, language: 'ar' | 'en'): string {
  const clock = (DAY_OPENS_AT + slot.offset) % (24 * 60);
  const h = Math.floor(clock / 60);
  const m = clock % 60;
  const period = h < 12 ? (language === 'ar' ? 'ص' : 'AM') : (language === 'ar' ? 'م' : 'PM');
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${pad(hour12)}:${pad(m)} ${period}`;

  if (!slot.nextDay) return time;
  return language === 'ar' ? `${time} (اليوم التالي)` : `${time} (next day)`;
}

/**
 * Where to place an arbitrary saved time in a dropdown, as a signed offset from
 * 06:00. Unlike `startOffset` this never rejects: 00:00–05:59 comes back
 * negative so it sorts ahead of 06:00 and stays visible.
 *
 * The old picker offered 00:00–23:00 hourly, so orders with a start outside the
 * new 06:00–23:30 window exist. Dropping such a value from the list would make
 * the edit form quietly clear a saved time; showing it lets validation tell the
 * user to correct it instead.
 */
export function displayOffset(time: string): number | null {
  const clock = toClockMinutes(time);
  return clock === null ? null : clock - DAY_OPENS_AT;
}

/**
 * A slot for a value that is not on the 30-minute grid — an order saved before
 * this grid existed, or one whose times were set elsewhere. Surfacing it keeps
 * the edit form from silently discarding a saved time.
 */
export function offGridSlot(value: string, offset: number): TimeSlot {
  return { value, offset, nextDay: DAY_OPENS_AT + offset >= 24 * 60 };
}

/** True when the end lands on the day after the event date. */
export function endsNextDay(startTime: string, endTime: string): boolean {
  const end = endOffset(endTime, startTime);
  return end !== null && DAY_OPENS_AT + end >= 24 * 60;
}

/**
 * Validation for a start/end pair, in the order the form should report it.
 * Returns null when the pair is fine.
 */
export function validateTimeRange(
  startTime: string,
  endTime: string,
): 'start_out_of_range' | 'end_not_after_start' | 'end_too_late' | null {
  const start = startOffset(startTime);
  if (start === null || start > LAST_START_OFFSET) return 'start_out_of_range';

  // Identical clock times roll forward a full day under the rule above, which is
  // out of range — but "end must be after start" is the useful complaint, not
  // "end is too late". The dropdown cannot produce this; hand-edited or legacy
  // rows can.
  if (toClockMinutes(endTime) === toClockMinutes(startTime)) return 'end_not_after_start';

  const end = endOffset(endTime, startTime);
  if (end === null || end <= start) return 'end_not_after_start';
  if (end > LAST_END_OFFSET) return 'end_too_late';

  return null;
}

/** `04:00` — for "must end by …" copy. */
export const LAST_END_LABEL = offsetToValue(LAST_END_OFFSET);
