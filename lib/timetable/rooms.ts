import type { TimetableTree } from './types'

/**
 * Room-name handling for the free-room finder.
 *
 * Room text comes from free-form cells, so the same physical room appears as
 * "CR-01-UG Block", "cr-01-acad" and "CR- 21 RIMMS". These are canonicalised to
 * a single label so a room booked under one spelling is not reported free under
 * another.
 */

const ROOM_KEYWORDS =
  /(\bCR-?|\bLab\b|\bHall\b|\bBlock\b|\bIAEC\b|\bSMRIMMS\b|\bSeminar\b|\bMRC\b)/i

/** Canonical label for a room, or '' when the text is not a room at all. */
export function cleanRoom(value: string | null | undefined): string {
  let text = String(value ?? '').trim()
  if (!text) return ''
  if (['main', 'none', 'null', 'online'].includes(text.toLowerCase())) return ''

  // Trim malformed tails that leak in from the source cells.
  text = text.replace(/\s*\(2K\d{2}[^)]*\).*$/i, '').trim()
  text = text.replace(/\s+Dr\.?\s+.*$/i, '').trim()
  text = text.replace(/\s{2,}/g, ' ')

  if (!ROOM_KEYWORDS.test(text)) return ''

  // "CR-01-UG Block", "cr-01-acad" and "CR- 21 RIMMS" are all just CR-nn.
  const cr = text.match(/\bCR\s*-?\s*0*(\d{1,3})\b/i)
  if (cr) return `CR-${String(Number(cr[1])).padStart(2, '0')}`

  return text
}

function crNumber(room: string): number | null {
  const match = room.trim().match(/^CR\s*-\s*0*(\d{1,3})\b/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isNaN(value) ? null : value
}

function priority(room: string): number {
  if (crNumber(room) !== null) return 0
  if (/\blab\b/i.test(room)) return 1
  return 2
}

/** Classrooms first (numerically), then labs, then everything else. */
export function sortRooms(rooms: string[]): string[] {
  return [...rooms].sort((a, b) => {
    const pa = priority(a)
    const pb = priority(b)
    if (pa !== pb) return pa - pb

    if (pa === 0) {
      const ca = crNumber(a) ?? Number.POSITIVE_INFINITY
      const cb = crNumber(b) ?? Number.POSITIVE_INFINITY
      if (ca !== cb) return ca - cb
    }

    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })
}

/**
 * Every room a department actually teaches in, derived from the timetable.
 *
 * Derived rather than stored: the previous build committed a room list to JSON
 * that no sync step regenerated, so it silently went stale.
 */
export function departmentRooms(tree: TimetableTree, department: string): string[] {
  const rooms = new Set<string>()

  for (const major of Object.values(tree[department] ?? {})) {
    for (const year of Object.values(major)) {
      for (const section of Object.values(year)) {
        for (const slots of Object.values(section)) {
          for (const slot of slots) {
            const room = cleanRoom(slot.room)
            if (room) rooms.add(room)
          }
        }
      }
    }
  }

  return sortRooms([...rooms])
}
