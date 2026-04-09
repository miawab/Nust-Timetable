'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TimetableTree } from '@/lib/timetable-types'

const WHOLE_DAY_VALUE = '__whole_day__'
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

interface UniqueRoomData {
  uniqueRooms: string[]
  byDepartment?: Record<string, string[]>
}

interface FreeRoomFinderProps {
  timetableData: TimetableTree
  uniqueRoomData: UniqueRoomData
}

function parseTimeStart(time: string): number {
  const start = (time.split('-')[0] ?? '').trim()
  const hhmm = start.match(/^(\d{3,4})$/)?.[1] ?? ''

  if (!hhmm) return Number.POSITIVE_INFINITY

  if (hhmm.length === 3) {
    return Number.parseInt(hhmm[0], 10) * 60 + Number.parseInt(hhmm.slice(1), 10)
  }

  return Number.parseInt(hhmm.slice(0, 2), 10) * 60 + Number.parseInt(hhmm.slice(2), 10)
}

function formatClock(h: number, m: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = ((h + 11) % 12) + 1
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

function formatTimeRange(time: string): string {
  const [rawStart = '', rawEnd = ''] = time.split('-').map((p) => p.trim())
  const start = rawStart.match(/^(\d{3,4})$/)?.[1]
  const end = rawEnd.match(/^(\d{3,4})$/)?.[1]

  if (!start || !end) return time

  const sh = start.length === 3 ? Number.parseInt(start[0], 10) : Number.parseInt(start.slice(0, 2), 10)
  const sm = Number.parseInt(start.slice(-2), 10)
  const eh = end.length === 3 ? Number.parseInt(end[0], 10) : Number.parseInt(end.slice(0, 2), 10)
  const em = Number.parseInt(end.slice(-2), 10)

  if ([sh, sm, eh, em].some(Number.isNaN)) return time

  return `${formatClock(sh, sm)} - ${formatClock(eh, em)}`
}

function normalizeRoomText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function roomMatches(freeListRoom: string, occupiedRoom: string): boolean {
  const free = normalizeRoomText(freeListRoom)
  const occupied = normalizeRoomText(occupiedRoom)
  if (!free || !occupied) return false
  return occupied.includes(free)
}

function parseCrNumber(room: string): number | null {
  const match = room.trim().match(/^CR\s*-\s*0*(\d{1,3})\b/i)
  if (!match) return null

  const value = Number.parseInt(match[1], 10)
  return Number.isNaN(value) ? null : value
}

function roomPriority(room: string): number {
  if (parseCrNumber(room) !== null) return 0
  if (/\blab\b/i.test(room)) return 1
  return 2
}

function sortRooms(rooms: string[]): string[] {
  return [...rooms].sort((a, b) => {
    const pa = roomPriority(a)
    const pb = roomPriority(b)
    if (pa !== pb) return pa - pb

    if (pa === 0) {
      const ca = parseCrNumber(a) ?? Number.POSITIVE_INFINITY
      const cb = parseCrNumber(b) ?? Number.POSITIVE_INFINITY
      if (ca !== cb) return ca - cb
    }

    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })
}

export default function FreeRoomFinder({ timetableData, uniqueRoomData }: FreeRoomFinderProps) {
  const departments = useMemo(() => Object.keys(timetableData), [timetableData])

  const [department, setDepartment] = useState('')
  const [day, setDay] = useState('')
  const [timeMode, setTimeMode] = useState(WHOLE_DAY_VALUE)

  useEffect(() => {
    if (!department && departments.length > 0) {
      setDepartment(departments[0])
    }
  }, [department, departments])

  const dayOptions = useMemo(() => {
    if (!department) return []

    const allDays = new Set<string>()
    const deptData = timetableData[department] ?? {}

    for (const major of Object.values(deptData)) {
      for (const year of Object.values(major)) {
        for (const section of Object.values(year)) {
          for (const d of Object.keys(section)) {
            allDays.add(d)
          }
        }
      }
    }

    const ordered = DAY_ORDER.filter((d) => allDays.has(d))
    const extras = [...allDays].filter((d) => !DAY_ORDER.includes(d)).sort((a, b) => a.localeCompare(b))
    return [...ordered, ...extras]
  }, [timetableData, department])

  useEffect(() => {
    if (!day && dayOptions.length > 0) {
      setDay(dayOptions[0])
    }
  }, [day, dayOptions])

  const timeOptions = useMemo(() => {
    if (!department || !day) return []

    const times = new Set<string>()
    const deptData = timetableData[department] ?? {}

    for (const major of Object.values(deptData)) {
      for (const year of Object.values(major)) {
        for (const section of Object.values(year)) {
          const slots = section[day] ?? []
          for (const slot of slots) {
            if (slot.time) times.add(slot.time)
          }
        }
      }
    }

    return [...times].sort((a, b) => parseTimeStart(a) - parseTimeStart(b))
  }, [timetableData, department, day])

  const roomsForDepartment = useMemo(() => {
    const departmentRooms = uniqueRoomData.byDepartment?.[department]
    const base = (departmentRooms && departmentRooms.length > 0)
      ? departmentRooms
      : uniqueRoomData.uniqueRooms

    return sortRooms(base)
  }, [uniqueRoomData, department])

  const occupiedByTime = useMemo(() => {
    const occupied: Record<string, Set<string>> = {}

    if (!department || !day) return occupied

    const deptData = timetableData[department] ?? {}
    for (const major of Object.values(deptData)) {
      for (const year of Object.values(major)) {
        for (const section of Object.values(year)) {
          const slots = section[day] ?? []
          for (const slot of slots) {
            const time = String(slot.time ?? '').trim()
            const rawRoom = String(slot.room ?? '').trim()
            if (!time || !rawRoom) continue
            if (/^(main|online)$/i.test(rawRoom)) continue

            occupied[time] ??= new Set<string>()
            for (const candidate of roomsForDepartment) {
              if (roomMatches(candidate, rawRoom)) {
                occupied[time].add(candidate.toLowerCase())
              }
            }
          }
        }
      }
    }

    return occupied
  }, [timetableData, department, day, roomsForDepartment])

  const freeByTime = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const t of timeOptions) {
      const occupied = occupiedByTime[t] ?? new Set<string>()
      result[t] = roomsForDepartment.filter((room) => !occupied.has(room.toLowerCase()))
    }
    return result
  }, [timeOptions, occupiedByTime, roomsForDepartment])

  const wholeDayRoomAvailability = useMemo(() => {
    if (timeOptions.length === 0) return []

    return sortRooms(
      roomsForDepartment
      .map((room) => ({
        room,
        freeTimes: timeOptions.filter((t) => freeByTime[t]?.includes(room)),
      }))
      .filter((entry) => entry.freeTimes.length > 0)
      .map((entry) => entry.room)
    ).map((room) => ({
      room,
      freeTimes: timeOptions.filter((t) => freeByTime[t]?.includes(room)),
    }))
  }, [roomsForDepartment, timeOptions, freeByTime])

  const availableRooms = useMemo(() => {
    if (timeMode === WHOLE_DAY_VALUE) {
      return []
    }
    return sortRooms(freeByTime[timeMode] ?? [])
  }, [timeMode, freeByTime])

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">Department</label>
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value)
              setDay('')
              setTimeMode(WHOLE_DAY_VALUE)
            }}
            className="w-full border border-gray-300 bg-white px-4 py-2 text-black focus:border-black focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">Day</label>
          <select
            value={day}
            onChange={(e) => {
              setDay(e.target.value)
              setTimeMode(WHOLE_DAY_VALUE)
            }}
            disabled={!department}
            className="w-full border border-gray-300 bg-white px-4 py-2 text-black focus:border-black focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">Time</label>
          <select
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value)}
            disabled={!day}
            className="w-full border border-gray-300 bg-white px-4 py-2 text-black focus:border-black focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
          >
            <option value={WHOLE_DAY_VALUE}>Whole day</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {formatTimeRange(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-black">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-black dark:text-white">Available Rooms</h2>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {timeMode === WHOLE_DAY_VALUE ? `${wholeDayRoomAvailability.length} room(s)` : `${availableRooms.length} room(s)`}
          </span>
        </div>

        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Beta</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">idk if this works that well. uhh just take with a grain of salt.</p>
        </div>

        {timeMode === WHOLE_DAY_VALUE ? (
          wholeDayRoomAvailability.length > 0 ? (
            <div className="space-y-2">
              {wholeDayRoomAvailability.map(({ room, freeTimes }) => (
                <div key={room} className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                  <p className="font-medium text-black dark:text-white">{room}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Free at: {freeTimes.map(formatTimeRange).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">No free rooms found for the selected day.</p>
          )
        ) : availableRooms.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableRooms.map((room) => (
              <div
                key={room}
                className="border border-gray-300 px-3 py-2 text-sm text-black dark:border-gray-700 dark:text-white"
              >
                {room}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">No free rooms found for the selected filters.</p>
        )}
      </div>
    </div>
  )
}
