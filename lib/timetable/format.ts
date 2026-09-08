/** Time helpers shared by every view, so a slot reads the same everywhere. */

/** "0900" | "9:00" -> minutes since midnight. NaN-safe: returns null. */
export function parseClock(part: string): { hour: number; minute: number } | null {
  const compact = part.replace(/\s+/g, '')

  const colon = compact.match(/^(\d{1,2}):(\d{2})$/)
  if (colon) return { hour: Number(colon[1]), minute: Number(colon[2]) }

  const digits = compact.match(/^(\d{3,4})$/)?.[1]
  if (!digits) return null

  const hour = Number(digits.slice(0, digits.length === 3 ? 1 : 2))
  const minute = Number(digits.slice(-2))
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null

  return { hour, minute }
}

/** Minutes since midnight for the start of a "0900-0950" range. */
export function startMinutes(time: string): number {
  const parsed = parseClock((time.split('-')[0] ?? '').trim())
  return parsed ? parsed.hour * 60 + parsed.minute : Number.POSITIVE_INFINITY
}

/** Minutes since midnight for the end of a "0900-0950" range. */
export function endMinutes(time: string): number {
  const parts = time.split('-')
  const parsed = parseClock((parts[1] ?? '').trim())
  if (parsed) return parsed.hour * 60 + parsed.minute
  const start = startMinutes(time)
  return Number.isFinite(start) ? start + 50 : Number.POSITIVE_INFINITY
}

function clock(hour24: number, minute: number): string {
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = ((hour24 + 11) % 12) + 1
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

/** "0900-0950" -> "9:00 AM - 9:50 AM". Unparseable input is returned as-is. */
export function formatTimeRange(time: string): string {
  const parts = time.split('-').map((part) => part.trim()).filter(Boolean)

  if (parts.length === 2) {
    const start = parseClock(parts[0])
    const end = parseClock(parts[1])
    if (start && end) return `${clock(start.hour, start.minute)} - ${clock(end.hour, end.minute)}`
  }

  const single = parseClock(time.trim())
  return single ? clock(single.hour, single.minute) : time
}

export function compareTimes(a: string, b: string): number {
  const diff = startMinutes(a) - startMinutes(b)
  return Number.isFinite(diff) ? diff : a.localeCompare(b)
}

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

/** Weekday name for a date, or null at the weekend (nothing is scheduled then). */
export function weekdayName(date: Date): string | null {
  return WEEK_DAYS[date.getDay() - 1] ?? null
}

/** Sort study-year labels ("2 - Sophomore") by their leading number. */
export function compareYears(a: string, b: string): number {
  const na = Number(a.match(/^\s*(\d+)/)?.[1] ?? Number.POSITIVE_INFINITY)
  const nb = Number(b.match(/^\s*(\d+)/)?.[1] ?? Number.POSITIVE_INFINITY)
  return na === nb ? a.localeCompare(b) : na - nb
}
