"use client"

import { useMemo } from 'react'
import type { TimeSlot, TimetableTree } from '../lib/timetable-types'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

function parseTimePart(part: string): { hour: number; minute: number } | null {
  const compact = part.replace(/\s+/g, '')

  let match = compact.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    return { hour: Number(match[1]), minute: Number(match[2]) }
  }

  match = compact.match(/^(\d{3,4})$/)
  if (!match) return null

  const digits = match[1]
  const hour = Number(digits.slice(0, digits.length === 3 ? 1 : 2))
  const minute = Number(digits.slice(-2))

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

function formatClock(hour24: number, minute: number): string {
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = ((hour24 + 11) % 12) + 1
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

function formatTimeRange(time: string): string {
  const parts = time.split('-').map((part) => part.trim()).filter(Boolean)

  if (parts.length === 2) {
    const start = parseTimePart(parts[0])
    const end = parseTimePart(parts[1])

    if (start && end) {
      return `${formatClock(start.hour, start.minute)} - ${formatClock(end.hour, end.minute)}`
    }
  }

  const normalized = parseTimePart(time.trim())
  if (normalized) {
    return formatClock(normalized.hour, normalized.minute)
  }

  return time
}

function extractRoomFromText(text: string): string {
  if (!text) return ''
  return text.match(/@\s*[^|\n]*?\b(?:in|at)\s+([^|\n]+?)(?=\s*(?:\||$))/i)?.[1]?.trim() ?? ''
}

function getDisplayRoom(slot: TimeSlot): string {
  const courseText = String(slot.course ?? '')

  if (/\bonline\b/i.test(courseText)) {
    return 'Online'
  }

  const parsedFromCourse = extractRoomFromText(courseText)
  if (parsedFromCourse) {
    return parsedFromCourse
  }

  const normalizedRoom = String(slot.room ?? '').trim()
  if (normalizedRoom && normalizedRoom.toLowerCase() !== 'main') {
    if (/\bonline\b/i.test(normalizedRoom)) {
      return 'Online'
    }
    return normalizedRoom
  }

  return 'Main'
}

interface TimetableDisplayProps {
  timetableData: TimetableTree
  department: string
  major: string
  year: string
  section: string
  day: string
}

function sortTimes(a: string, b: string): number {
  const aStart = parseTimePart(a.split('-')[0]?.trim() ?? '')
  const bStart = parseTimePart(b.split('-')[0]?.trim() ?? '')

  if (!aStart || !bStart) {
    return a.localeCompare(b)
  }

  return aStart.hour * 60 + aStart.minute - (bStart.hour * 60 + bStart.minute)
}

function groupSlotsByTime(slots: TimeSlot[]): Record<string, TimeSlot[]> {
  return slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    acc[slot.time] ??= []
    acc[slot.time].push(slot)
    return acc
  }, {})
}

export default function TimetableDisplay({
  timetableData,
  department,
  major,
  year,
  section,
  day,
}: TimetableDisplayProps) {
  const selectedSection = timetableData[department]?.[major]?.[year]?.[section] ?? {}
  const isWeeklyView = day === 'Weekly'
  const rawSlots: TimeSlot[] = !isWeeklyView && day ? selectedSection[day] ?? [] : []
  const groupedByTime = groupSlotsByTime(rawSlots)
  const orderedTimes = Object.keys(groupedByTime).sort(sortTimes)
  const weeklyTimes = useMemo(
    () =>
      Object.values(selectedSection)
        .flat()
        .map((slot) => slot.time)
        .filter(Boolean)
        .filter((time, index, times) => times.indexOf(time) === index)
        .sort(sortTimes),
    [selectedSection],
  )
  const hasAnyWeeklySlots = weeklyTimes.length > 0
  const weeklyGroupedSlots = WEEK_DAYS.map((weekDay) => ({
    day: weekDay,
    groupedByTime: groupSlotsByTime(selectedSection[weekDay] ?? []),
  }))

  if (!department || !major || !year || !section || (!day && !isWeeklyView)) {
    return (
      <div className="border border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
        Select department, major, year, section, and a day to view timetable.
      </div>
    )
  }

  const renderSingleDayTable = () => {
    if (rawSlots.length === 0) {
      return <div className="border border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">No classes found.</div>
    }

    return (
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 bg-white dark:border-gray-700 dark:bg-black">
            <th className="w-40 px-4 py-2 text-left font-medium text-black dark:text-white">Time</th>
            <th className="px-4 py-2 text-left font-medium text-black dark:text-white">Course / Electives</th>
          </tr>
        </thead>
        <tbody>
          {orderedTimes.map((time) => (
            <tr key={time} className="border-b border-gray-300 align-top dark:border-gray-700">
              <td className="bg-white px-4 py-3 font-medium text-black dark:bg-black dark:text-white">{formatTimeRange(time)}</td>
              <td className="bg-white px-4 py-3 dark:bg-black">
                <div className="space-y-2">
                  {groupedByTime[time].map((slot: TimeSlot, idx: number) => (
                    <div
                      key={`${time}-${idx}`}
                      className={idx > 0 ? 'border-t border-gray-200 pt-2 text-black dark:border-gray-700 dark:text-white' : 'text-black dark:text-white'}
                    >
                      <p>{slot.course}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Room: {getDisplayRoom(slot)}</p>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const renderWeeklyTable = () => {
    if (!hasAnyWeeklySlots) {
      return <div className="border border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">No classes found.</div>
    }

    return (
      <table className="min-w-[980px] w-full table-fixed text-sm">
        <colgroup>
          <col style={{ width: '100px' }} />
          {WEEK_DAYS.map((weekDay) => (
            <col key={`col-${weekDay}`} style={{ width: '176px' }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-gray-300 bg-white dark:border-gray-700 dark:bg-black">
            <th className="px-2 py-2 text-left text-sm font-medium text-black dark:text-white">Time</th>
            {WEEK_DAYS.map((weekDay, idx) => (
              <th
                key={weekDay}
                className={`border-l border-gray-300 px-4 py-2 text-left font-medium text-black dark:border-gray-700 dark:text-white ${idx === WEEK_DAYS.length - 1 ? 'border-r' : ''}`}
              >
                {weekDay}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeklyTimes.map((time) => (
            <tr key={time} className="border-b border-gray-300 align-top dark:border-gray-700">
              <td className="bg-white px-2 py-3 text-sm font-medium text-black dark:bg-black dark:text-white">{formatTimeRange(time)}</td>
              {weeklyGroupedSlots.map(({ day: weekDay, groupedByTime: dayGroupedTimes }, idx) => {
                const slots = dayGroupedTimes[time] ?? []
                return (
                  <td
                    key={`${weekDay}-${time}`}
                    className={`border-l border-gray-300 bg-white px-4 py-3 align-top dark:border-gray-700 dark:bg-black ${idx === weeklyGroupedSlots.length - 1 ? 'border-r' : ''}`}
                  >
                    {slots.length > 0 ? (
                      <div className="space-y-2">
                        {slots.map((slot: TimeSlot, idx: number) => (
                          <div
                            key={`${weekDay}-${time}-${idx}`}
                            className={idx > 0 ? 'border-t border-gray-200 pt-2 text-black dark:border-gray-700 dark:text-white' : 'text-black dark:text-white'}
                          >
                            <p className="break-words whitespace-normal">{slot.course}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">Room: {getDisplayRoom(slot)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-700">
        {isWeeklyView ? renderWeeklyTable() : renderSingleDayTable()}
      </div>
    </div>
  )
}
