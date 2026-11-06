/** Calendar dates are not UTC instants. Keep deadlines as YYYY-MM-DD. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= (days[month - 1] ?? 0)
}

export function localDateKey(now: Date): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function calendarDate(value: string): Date {
  if (!isCalendarDate(value)) throw new Error('Invalid calendar date')
  const [year = 1, month = 1, day = 1] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
}

const deadlineFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
export function formatDueDate(value?: string): string {
  if (!value) return 'No due date'
  if (!isCalendarDate(value)) throw new Error('Invalid calendar date')
  const [year = 1, month = 1, day = 1] = value.split('-').map(Number)
  // A display-only UTC container preserves the calendar fields in every timezone.
  // It is never used for deadline comparisons or persistence; setUTCFullYear keeps years <100.
  const displayDate = new Date(0)
  displayDate.setUTCFullYear(year, month - 1, day)
  displayDate.setUTCHours(12, 0, 0, 0)
  return `Due ${deadlineFormatter.format(displayDate)}`
}

export function millisecondsUntilTomorrow(now: Date): number {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 0, 0, 0)
  return next.getTime() - now.getTime() + 50
}
