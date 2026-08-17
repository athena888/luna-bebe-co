// Delivery-date estimator — pure date math, no carrier API.
//
// Ships from Seattle, WA via USPS Ground Advantage. Emily's numbers
// (2026-08-16): handling is SAME DAY (0 business days) when the order lands
// before the 1:00 PM Pacific cutoff on a business day — the same cutoff the
// Seattle courier page and SameDayCountdown already use — otherwise handling
// starts the next business day.
//
// Everything below works in CIVIL dates (a calendar day, no clock, no zone),
// represented as the epoch ms of that day at UTC midnight. The ONLY place a
// real timestamp is read is ptNow(), which asks Intl what today is in
// America/Los_Angeles — so a visitor in Tokyo or Berlin gets the same answer
// as one in Seattle. Never build these dates with `new Date(y, m, d)`: that is
// the visitor's local zone and would shift the day across the date line.

export const SHIP_FROM = 'Seattle, WA'
export const CARRIER = 'USPS Ground Advantage'
export const CUTOFF_HOUR_PT = 13          // 1:00 PM America/Los_Angeles
export const HANDLING_BUSINESS_DAYS = 0   // same-day handling before cutoff
const PT = 'America/Los_Angeles'

export type Zone = 'northwest' | 'mountain' | 'central' | 'east' | 'noncontiguous'

// Conservative ground transit, in business days, from Seattle.
export const TRANSIT: Record<Zone, [number, number]> = {
  northwest: [2, 3],      // WA / OR / ID / N. California
  mountain: [3, 4],       // Mountain states + S. California
  central: [4, 5],        // Central US
  east: [5, 6],           // East Coast + FL
  noncontiguous: [7, 10], // AK / HI / territories
}

// Shown when no ZIP is known: the contiguous-US spread ("most US addresses" —
// AK/HI are the reason it isn't "all").
export const NATIONAL_TRANSIT: [number, number] = [2, 6]

// ZIP → zone by 3-digit prefix range. Ranges are inclusive and checked in
// order, so the narrower mountain-state bands win over the wide central band.
const ZONES: Array<[number, number, Zone]> = [
  // Non-contiguous & territories
  [6, 9, 'noncontiguous'],       // PR / VI
  [967, 968, 'noncontiguous'],   // HI
  [969, 969, 'noncontiguous'],   // GU / MP
  [995, 999, 'noncontiguous'],   // AK
  // Northwest
  [832, 838, 'northwest'],       // ID
  [940, 961, 'northwest'],       // N. CA (Bay Area, Sacramento, north)
  [970, 979, 'northwest'],       // OR
  [980, 994, 'northwest'],       // WA
  // Mountain + S. California
  [590, 599, 'mountain'],        // MT
  [800, 816, 'mountain'],        // CO
  [820, 831, 'mountain'],        // WY
  [840, 847, 'mountain'],        // UT
  [850, 865, 'mountain'],        // AZ
  [870, 884, 'mountain'],        // NM
  [889, 898, 'mountain'],        // NV
  [900, 939, 'mountain'],        // S. + Central CA
  // Central
  [350, 369, 'central'],         // AL
  [370, 385, 'central'],         // TN
  [386, 397, 'central'],         // MS
  [400, 427, 'central'],         // KY
  [430, 459, 'central'],         // OH
  [460, 479, 'central'],         // IN
  [480, 499, 'central'],         // MI
  [500, 528, 'central'],         // IA
  [530, 549, 'central'],         // WI
  [550, 567, 'central'],         // MN
  [570, 577, 'central'],         // SD
  [580, 588, 'central'],         // ND
  [600, 629, 'central'],         // IL
  [630, 658, 'central'],         // MO
  [660, 679, 'central'],         // KS
  [680, 693, 'central'],         // NE
  [700, 714, 'central'],         // LA
  [716, 729, 'central'],         // AR
  [730, 749, 'central'],         // OK
  [750, 799, 'central'],         // TX
]

export function isValidZip(zip: string | null | undefined): boolean {
  return /^\d{5}(-\d{4})?$/.test((zip ?? '').trim())
}

/** Zone for a US ZIP; null when the ZIP is missing or malformed. Anything in
 *  the contiguous US that no band claims falls to the East Coast tier — the
 *  pessimistic side, which is where an unknown ZIP belongs. */
export function zoneForZip(zip: string | null | undefined): Zone | null {
  if (!isValidZip(zip)) return null
  const prefix = Number((zip as string).trim().slice(0, 3))
  for (const [lo, hi, zone] of ZONES) if (prefix >= lo && prefix <= hi) return zone
  return 'east'
}

// ── Civil-date helpers ──────────────────────────────────────────────────────

/** Epoch ms of a calendar day at UTC midnight. */
export function civilDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day)
}

const DAY_MS = 86_400_000
const addDays = (ms: number, n: number) => ms + n * DAY_MS

/** Today's calendar date and minutes-past-midnight in Pacific time, whatever
 *  zone the visitor's clock is in. */
export function ptNow(now: Date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PT, hour12: false,
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0)
  // hour12:false can render midnight as 24 in some ICU versions.
  const hour = get('hour') % 24
  return { day: civilDay(get('year'), get('month'), get('day')), minutes: hour * 60 + get('minute') }
}

// ── US federal holidays (the USPS schedule) ─────────────────────────────────

/** nth (1-based) `weekday` of a month; n = -1 means the last one. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  if (n === -1) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const ms = civilDay(year, month, last)
    return addDays(ms, -((new Date(ms).getUTCDay() - weekday + 7) % 7))
  }
  const first = civilDay(year, month, 1)
  const shift = (weekday - new Date(first).getUTCDay() + 7) % 7
  return addDays(first, shift + (n - 1) * 7)
}

/** Federal observation: a Saturday holiday is taken on the Friday before, a
 *  Sunday holiday on the Monday after. */
function observed(ms: number): number {
  const dow = new Date(ms).getUTCDay()
  if (dow === 6) return addDays(ms, -1)
  if (dow === 0) return addDays(ms, 1)
  return ms
}

const holidayCache = new Map<number, Set<number>>()

export function federalHolidays(year: number): Set<number> {
  const cached = holidayCache.get(year)
  if (cached) return cached
  const set = new Set<number>([
    observed(civilDay(year, 1, 1)),      // New Year's Day
    nthWeekday(year, 1, 1, 3),           // MLK Jr. Day — 3rd Monday of January
    nthWeekday(year, 2, 1, 3),           // Presidents' Day — 3rd Monday of February
    nthWeekday(year, 5, 1, -1),          // Memorial Day — last Monday of May
    observed(civilDay(year, 6, 19)),     // Juneteenth
    observed(civilDay(year, 7, 4)),      // Independence Day
    nthWeekday(year, 9, 1, 1),           // Labor Day — 1st Monday of September
    nthWeekday(year, 10, 1, 2),          // Columbus Day — 2nd Monday of October
    observed(civilDay(year, 11, 11)),    // Veterans Day
    nthWeekday(year, 11, 4, 4),          // Thanksgiving — 4th Thursday of November
    observed(civilDay(year, 12, 25)),    // Christmas Day
  ])
  holidayCache.set(year, set)
  return set
}

export function isBusinessDay(ms: number): boolean {
  const d = new Date(ms)
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return false
  return !federalHolidays(d.getUTCFullYear()).has(ms)
}

export function nextBusinessDay(ms: number): number {
  let next = addDays(ms, 1)
  while (!isBusinessDay(next)) next = addDays(next, 1)
  return next
}

export function addBusinessDays(ms: number, n: number): number {
  let out = ms
  for (let i = 0; i < n; i++) out = nextBusinessDay(out)
  return out
}

// ── The estimate ────────────────────────────────────────────────────────────

export interface DeliveryEstimate {
  /** null when no (or an invalid) ZIP was given — the national range. */
  zone: Zone | null
  /** Civil days (UTC-midnight ms). */
  shipDay: number
  earliestDay: number
  latestDay: number
  /** Convenience Date objects for formatting (UTC midnight). */
  earliest: Date
  latest: Date
  transit: [number, number]
  /** The order landed before today's 1 PM PT cutoff. */
  beforeCutoff: boolean
  /** Handling starts today (before cutoff on a business day). */
  shipsToday: boolean
}

/**
 * Estimated delivery window for an optional destination ZIP.
 * Always a RANGE, always rounded pessimistic (business days only, weekends
 * and federal holidays skipped on both handling and transit).
 */
export function estimateDelivery(zip?: string | null, now: Date = new Date()): DeliveryEstimate {
  const { day: today, minutes } = ptNow(now)
  const beforeCutoff = minutes < CUTOFF_HOUR_PT * 60

  // Handling starts today only on a business day before the cutoff.
  let shipDay = today
  if (!isBusinessDay(today) || !beforeCutoff) shipDay = nextBusinessDay(today)
  const shipsToday = shipDay === today
  if (HANDLING_BUSINESS_DAYS > 0) shipDay = addBusinessDays(shipDay, HANDLING_BUSINESS_DAYS)

  const zone = zoneForZip(zip)
  const transit = zone ? TRANSIT[zone] : NATIONAL_TRANSIT
  const earliestDay = addBusinessDays(shipDay, transit[0])
  const latestDay = addBusinessDays(shipDay, transit[1])

  return {
    zone, shipDay, earliestDay, latestDay,
    earliest: new Date(earliestDay), latest: new Date(latestDay),
    transit, beforeCutoff, shipsToday,
  }
}

/** Same window for a fixed transit range (used by the paid rush option). */
export function estimateWithTransit(transit: [number, number], now: Date = new Date()): DeliveryEstimate {
  const base = estimateDelivery(null, now)
  const earliestDay = addBusinessDays(base.shipDay, transit[0])
  const latestDay = addBusinessDays(base.shipDay, transit[1])
  return { ...base, zone: null, transit, earliestDay, latestDay, earliest: new Date(earliestDay), latest: new Date(latestDay) }
}

// ── Formatting ──────────────────────────────────────────────────────────────

/**
 * "Aug 24–28" when the window sits in one month, "Aug 30 – Sep 3" when it
 * crosses one. Spanish (es-US) reads "24–28 de ago" / "30 de ago – 3 de sep".
 * Dates are UTC-midnight civil days, so formatting is pinned to UTC.
 */
export function formatDeliveryWindow(e: Pick<DeliveryEstimate, 'earliest' | 'latest'>, locale: 'en' | 'es' = 'en'): string {
  const es = locale === 'es'
  const tag = es ? 'es-US' : 'en-US'
  const month = (d: Date) => new Intl.DateTimeFormat(tag, { timeZone: 'UTC', month: 'short' }).format(d).replace(/\.$/, '')
  const dayNum = (d: Date) => new Intl.DateTimeFormat(tag, { timeZone: 'UTC', day: 'numeric' }).format(d)

  const sameMonth = e.earliest.getUTCMonth() === e.latest.getUTCMonth()
    && e.earliest.getUTCFullYear() === e.latest.getUTCFullYear()

  if (sameMonth) {
    return es
      ? `${dayNum(e.earliest)}–${dayNum(e.latest)} de ${month(e.earliest)}`
      : `${month(e.earliest)} ${dayNum(e.earliest)}–${dayNum(e.latest)}`
  }
  return es
    ? `${dayNum(e.earliest)} de ${month(e.earliest)} – ${dayNum(e.latest)} de ${month(e.latest)}`
    : `${month(e.earliest)} ${dayNum(e.earliest)} – ${month(e.latest)} ${dayNum(e.latest)}`
}

/** A single date, e.g. the pessimistic "arrives by" edge. */
export function formatDeliveryDate(d: Date, locale: 'en' | 'es' = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
    timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric',
  }).format(d).replace(/\.$/, '')
}
