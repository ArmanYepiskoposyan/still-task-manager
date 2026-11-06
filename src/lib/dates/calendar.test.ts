import { describe, expect, it } from 'vitest'
import {
  calendarDate,
  formatDueDate,
  isCalendarDate,
  localDateKey,
  millisecondsUntilTomorrow,
} from './calendar'
describe('local calendar handling', () => {
  it.each(['2028-02-29', '2000-02-29', '2026-12-31', '0001-01-01', '0099-12-31'])(
    'accepts real date %s',
    (value) => expect(isCalendarDate(value)).toBe(true),
  )
  it.each([
    '1900-02-29',
    '2026-02-29',
    '2026-00-01',
    '2026-01-00',
    '2026-11-31',
    '2026-1-1',
    '2026-01-01T00:00Z',
  ])('rejects %s', (value) => expect(isCalendarDate(value)).toBe(false))
  it('uses the local day across month and year boundaries', () => {
    expect(localDateKey(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31')
    expect(localDateKey(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01')
  })
  it('preserves calendar dates without UTC conversion, including years below 100', () => {
    for (const value of ['2026-01-01', '0099-12-31'])
      expect(localDateKey(calendarDate(value))).toBe(value)
  })
  it('schedules the next local midnight', () => {
    expect(millisecondsUntilTomorrow(new Date(2026, 9, 27, 23, 59, 59, 500))).toBe(550)
  })
  it('shows actual deadlines and a truthful undated label', () => {
    expect(formatDueDate('2026-11-02')).toBe('Due Nov 2, 2026')
    expect(formatDueDate()).toBe('No due date')
  })
})

describe('cached deadline display preserves calendar fields', () => {
  it.each([
    ['0001-01-01', 'Due Jan 1, 1'],
    ['0099-12-31', 'Due Dec 31, 99'],
    ['2000-02-29', 'Due Feb 29, 2000'],
    ['2028-02-29', 'Due Feb 29, 2028'],
    ['9999-12-31', 'Due Dec 31, 9999'],
  ])('formats %s without a timezone shift', (value, expected) =>
    expect(formatDueDate(value)).toBe(expected),
  )
  it('still rejects invalid deadlines', () =>
    expect(() => formatDueDate('2026-02-29')).toThrow('Invalid calendar date'))
})
