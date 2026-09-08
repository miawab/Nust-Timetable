'use client'

import { useMemo, useState } from 'react'
import { WEEK_DAYS, compareTimes, formatTimeRange } from '@/lib/timetable/format'
import type { FacultyRecord } from '@/lib/timetable/types'
import { faintClass, inputClass, labelClass, mutedClass, panelClass, selectClass } from '@/lib/ui'

/** Collapse the repeated per-hour rows of a multi-hour class into one entry. */
interface Booking {
  time: string
  subject: string
  location: string
  batch: string
}

function mergeAdjacent(records: FacultyRecord[]): Booking[] {
  const sorted = [...records].sort((a, b) => compareTimes(a.time, b.time))
  const merged: Booking[] = []

  for (const record of sorted) {
    const previous = merged[merged.length - 1]
    const sameClass =
      previous && previous.subject === record.subject && previous.location === record.location

    if (sameClass) {
      // Extend the run: keep the earliest start and the latest end.
      const [start] = previous.time.split('-')
      const end = record.time.split('-')[1] ?? record.time
      previous.time = `${start}-${end}`
      if (record.batch && !previous.batch.includes(record.batch)) {
        previous.batch = `${previous.batch}, ${record.batch}`
      }
      continue
    }

    merged.push({
      time: record.time,
      subject: record.subject,
      location: record.location,
      batch: record.batch,
    })
  }

  return merged
}

export default function FacultyFinder({ faculty }: { faculty: FacultyRecord[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')

  const names = useMemo(() => {
    const unique = new Set(faculty.map((record) => record.faculty).filter(Boolean))
    return [...unique].sort((a, b) => a.localeCompare(b))
  }, [faculty])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return names
    return names.filter((name) => name.toLowerCase().includes(needle))
  }, [names, query])

  const active = selected && names.includes(selected) ? selected : ''

  const byDay = useMemo(() => {
    if (!active) return []

    const records = faculty.filter((record) => record.faculty === active)
    return WEEK_DAYS.map((day) => ({
      day,
      bookings: mergeAdjacent(records.filter((record) => record.day === day)),
    })).filter((entry) => entry.bookings.length > 0)
  }, [faculty, active])

  const load = useMemo(
    () => byDay.reduce((total, entry) => total + entry.bookings.length, 0),
    [byDay],
  )

  if (faculty.length === 0) {
    return (
      <div className={`${panelClass} p-4`}>
        <p className={`text-sm ${mutedClass}`}>
          The Faculty Timetable tab was not found in the sheet, so teacher lookup is unavailable.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="faculty-search">
            Search teacher
          </label>
          <input
            id="faculty-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Taha"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="faculty-select">
            Teacher {query ? `(${matches.length} match${matches.length === 1 ? '' : 'es'})` : ''}
          </label>
          <select
            id="faculty-select"
            value={active}
            onChange={(event) => setSelected(event.target.value)}
            className={selectClass}
          >
            <option value="">Select Teacher</option>
            {matches.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!active ? (
        <div className={`${panelClass} p-4`}>
          <p className={`text-sm ${mutedClass}`}>
            Pick a teacher to see their week. {names.length} teachers in the timetable.
          </p>
        </div>
      ) : (
        <div className={panelClass}>
          <div className="flex items-baseline justify-between gap-2 border-b border-gray-300 px-4 py-2 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-black dark:text-white">{active}</h2>
            <span className={`text-xs ${faintClass}`}>
              {load} class{load === 1 ? '' : 'es'} a week
            </span>
          </div>

          <div className="divide-y divide-gray-300 dark:divide-gray-700">
            {byDay.map(({ day, bookings }) => (
              <div key={day} className="px-4 py-3">
                <p className="mb-2 text-sm font-medium text-black dark:text-white">{day}</p>
                <div className="space-y-2">
                  {bookings.map((booking, index) => (
                    <div key={`${day}-${index}`} className="text-sm">
                      <p className="text-black dark:text-white">
                        <span className={`mr-2 text-xs ${mutedClass}`}>
                          {formatTimeRange(booking.time)}
                        </span>
                        {booking.subject}
                      </p>
                      <p className={`text-xs ${mutedClass}`}>
                        {[booking.location, booking.batch].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
