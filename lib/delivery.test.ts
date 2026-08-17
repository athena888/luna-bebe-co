// node --test lib/delivery.test.ts   (npm test)
// Node strips the types natively; no test framework or build step involved.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateDelivery, zoneForZip, isValidZip, isBusinessDay, addBusinessDays,
  nextBusinessDay, federalHolidays, civilDay, ptNow, formatDeliveryWindow,
  CUTOFF_HOUR_PT, TRANSIT,
} from './delivery.ts'

// Helper: a real instant, expressed in UTC. Pacific is UTC-7 in summer
// (PDT) and UTC-8 in winter (PST), so 12:00 PT in August == 19:00 UTC.
const utc = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min))
const day = (e: { earliestDay: number; latestDay: number }) => [new Date(e.earliestDay).toISOString().slice(0, 10), new Date(e.latestDay).toISOString().slice(0, 10)]
const shipOf = (e: { shipDay: number }) => new Date(e.shipDay).toISOString().slice(0, 10)

test('cutoff is 1 PM Pacific regardless of the visitor timezone', () => {
  assert.equal(CUTOFF_HOUR_PT, 13)
  // Mon 2026-08-17, 12:30 PT == 19:30 UTC → before cutoff, ships today.
  const before = estimateDelivery('98101', utc(2026, 8, 17, 19, 30))
  assert.equal(before.beforeCutoff, true)
  assert.equal(before.shipsToday, true)
  assert.equal(shipOf(before), '2026-08-17')

  // Same Monday, 13:30 PT == 20:30 UTC → after cutoff, ships Tuesday.
  const after = estimateDelivery('98101', utc(2026, 8, 17, 20, 30))
  assert.equal(after.beforeCutoff, false)
  assert.equal(after.shipsToday, false)
  assert.equal(shipOf(after), '2026-08-18')

  // Exactly 1:00 PM PT is already past the cutoff (pessimistic rounding).
  const at = estimateDelivery('98101', utc(2026, 8, 17, 20, 0))
  assert.equal(at.beforeCutoff, false)
  assert.equal(shipOf(at), '2026-08-18')
})

test('a visitor east of the date line sees the Pacific calendar day', () => {
  // 2026-08-18 05:00 UTC is Tue afternoon in Tokyo but still Mon 22:00 PT.
  const { day: d } = ptNow(utc(2026, 8, 18, 5, 0))
  assert.equal(d, civilDay(2026, 8, 17))
  // ...and it is past the 1 PM cutoff on that Monday.
  assert.equal(estimateDelivery('98101', utc(2026, 8, 18, 5, 0)).beforeCutoff, false)
})

test('Friday afternoon orders wait for Monday', () => {
  // Fri 2026-08-21, 14:00 PT (21:00 UTC) → after cutoff → Monday 8/24.
  const fri = estimateDelivery('98101', utc(2026, 8, 21, 21, 0))
  assert.equal(shipOf(fri), '2026-08-24')
  // Friday morning still ships Friday.
  assert.equal(shipOf(estimateDelivery('98101', utc(2026, 8, 21, 16, 0))), '2026-08-21')
})

test('weekend orders ship Monday whatever the hour', () => {
  assert.equal(shipOf(estimateDelivery('98101', utc(2026, 8, 22, 17, 0))), '2026-08-24') // Sat 10 AM PT
  assert.equal(shipOf(estimateDelivery('98101', utc(2026, 8, 23, 23, 0))), '2026-08-24') // Sun 4 PM PT
})

test('transit skips weekends — Seattle to Seattle, Friday morning', () => {
  // Ships Fri 8/21; 2–3 business days transit → Tue 8/25 to Wed 8/26.
  const e = estimateDelivery('98101', utc(2026, 8, 21, 16, 0))
  assert.deepEqual(day(e), ['2026-08-25', '2026-08-26'])
  assert.deepEqual(e.transit, TRANSIT.northwest)
})

test('holiday weeks push the window out', () => {
  // Thanksgiving 2026 is Thu 11/26. Order Wed 11/25 9 AM PT (17:00 UTC),
  // ships that day; East Coast transit 5–6 business days must skip Thu 11/26
  // (holiday) and both weekends → Thu 12/3 to Fri 12/4.
  const e = estimateDelivery('10001', utc(2026, 11, 25, 17, 0))
  assert.equal(shipOf(e), '2026-11-25')
  assert.deepEqual(day(e), ['2026-12-03', '2026-12-04'])

  // Christmas Day 2026 falls on a Friday — an ordinary business day otherwise.
  assert.equal(isBusinessDay(civilDay(2026, 12, 25)), false)
  // Ordering Thu 12/24 after cutoff ships Mon 12/28 (Fri is the holiday).
  assert.equal(shipOf(estimateDelivery('98101', utc(2026, 12, 24, 22, 0))), '2026-12-28')
})

test('holiday observation rules', () => {
  // 2027-07-04 is a Sunday → observed Monday 7/5.
  const h2027 = federalHolidays(2027)
  assert.equal(h2027.has(civilDay(2027, 7, 5)), true)
  assert.equal(isBusinessDay(civilDay(2027, 7, 5)), false)
  // 2026-07-04 is a Saturday → observed Friday 7/3.
  assert.equal(federalHolidays(2026).has(civilDay(2026, 7, 3)), true)
  assert.equal(isBusinessDay(civilDay(2026, 7, 3)), false)
  // Floating holidays: Thanksgiving 2026 = Thu Nov 26; Memorial Day = Mon May 25.
  assert.equal(federalHolidays(2026).has(civilDay(2026, 11, 26)), true)
  assert.equal(federalHolidays(2026).has(civilDay(2026, 5, 25)), true)
  // MLK 2026 = 3rd Monday of January = Jan 19.
  assert.equal(federalHolidays(2026).has(civilDay(2026, 1, 19)), true)
})

test('New Year rollover crosses the year boundary', () => {
  // Order Wed 2026-12-30 morning; Jan 1 2027 is a Friday holiday.
  const e = estimateDelivery('98101', utc(2026, 12, 30, 17, 0))
  assert.equal(shipOf(e), '2026-12-30')
  // 2 business days: Thu 12/31, then skip Fri 1/1 + weekend → Mon 1/4.
  assert.deepEqual(day(e), ['2027-01-04', '2027-01-05'])
})

test('zones map to the right transit bands', () => {
  assert.equal(zoneForZip('98101'), 'northwest')   // Seattle
  assert.equal(zoneForZip('97201'), 'northwest')   // Portland
  assert.equal(zoneForZip('94110'), 'northwest')   // San Francisco
  assert.equal(zoneForZip('90210'), 'mountain')    // Beverly Hills (S. CA)
  assert.equal(zoneForZip('80202'), 'mountain')    // Denver
  assert.equal(zoneForZip('59601'), 'mountain')    // Helena MT
  assert.equal(zoneForZip('60601'), 'central')     // Chicago
  assert.equal(zoneForZip('75201'), 'central')     // Dallas
  assert.equal(zoneForZip('10001'), 'east')        // NYC
  assert.equal(zoneForZip('33101'), 'east')        // Miami
  assert.equal(zoneForZip('99501'), 'noncontiguous') // Anchorage
  assert.equal(zoneForZip('96801'), 'noncontiguous') // Honolulu
  assert.equal(zoneForZip(null), null)
  assert.equal(zoneForZip('abcde'), null)
  assert.equal(zoneForZip('9810'), null)
  assert.equal(zoneForZip('98101-4321'), 'northwest')
})

test('no ZIP gives the wider national range', () => {
  const national = estimateDelivery(null, utc(2026, 8, 17, 16, 0))
  const seattle = estimateDelivery('98101', utc(2026, 8, 17, 16, 0))
  assert.equal(national.zone, null)
  assert.deepEqual(national.transit, [2, 6])
  // Same earliest edge, later pessimistic edge than the local ZIP.
  assert.equal(national.earliestDay, seattle.earliestDay)
  assert.ok(national.latestDay > seattle.latestDay)
})

test('the window is always a range, ordered, and never in the past', () => {
  for (const zip of [null, '98101', '90210', '60601', '10001', '99501']) {
    const e = estimateDelivery(zip, utc(2026, 8, 17, 16, 0))
    assert.ok(e.latestDay >= e.earliestDay, `${zip}: latest before earliest`)
    assert.ok(e.earliestDay > e.shipDay, `${zip}: arrives before it ships`)
    assert.ok(isBusinessDay(e.earliestDay) && isBusinessDay(e.latestDay), `${zip}: weekend delivery`)
  }
})

test('AK/HI is the slow tier', () => {
  const e = estimateDelivery('99501', utc(2026, 8, 17, 16, 0))
  assert.deepEqual(e.transit, [7, 10])
  assert.deepEqual(day(e), ['2026-08-26', '2026-08-31'])
})

test('business-day arithmetic', () => {
  assert.equal(isBusinessDay(civilDay(2026, 8, 22)), false)  // Saturday
  assert.equal(isBusinessDay(civilDay(2026, 8, 23)), false)  // Sunday
  assert.equal(isBusinessDay(civilDay(2026, 8, 24)), true)   // Monday
  assert.equal(nextBusinessDay(civilDay(2026, 8, 21)), civilDay(2026, 8, 24))
  assert.equal(addBusinessDays(civilDay(2026, 8, 21), 0), civilDay(2026, 8, 21))
  assert.equal(addBusinessDays(civilDay(2026, 8, 21), 5), civilDay(2026, 8, 28))
})

test('ZIP validation', () => {
  assert.equal(isValidZip('98101'), true)
  assert.equal(isValidZip('98101-1234'), true)
  assert.equal(isValidZip('9810'), false)
  assert.equal(isValidZip('981011'), false)
  assert.equal(isValidZip(''), false)
  assert.equal(isValidZip(undefined), false)
})

test('window formatting, English and Spanish', () => {
  const sameMonth = { earliest: new Date(Date.UTC(2026, 7, 24)), latest: new Date(Date.UTC(2026, 7, 28)) }
  assert.equal(formatDeliveryWindow(sameMonth, 'en'), 'Aug 24–28')
  assert.match(formatDeliveryWindow(sameMonth, 'es'), /^24–28 de /)

  const crossMonth = { earliest: new Date(Date.UTC(2026, 7, 30)), latest: new Date(Date.UTC(2026, 8, 3)) }
  assert.equal(formatDeliveryWindow(crossMonth, 'en'), 'Aug 30 – Sep 3')
  assert.match(formatDeliveryWindow(crossMonth, 'es'), /^30 de \S+ – 3 de /)
})
