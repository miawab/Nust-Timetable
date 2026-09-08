'use client'

import { useMemo } from 'react'
import ClassEntry from '@/components/class-entry'
import { WEEK_DAYS, compareTimes, formatTimeRange } from '@/lib/timetable/format'
import type { ClassSlot, DaySchedule } from '@/lib/timetable/types'
import { mutedClass, panelClass } from '@/lib/ui'

interface TimetableDisplayProps {
  schedule: DaySchedule
  day: string
  ready: boolean
}

function groupByTime(slots: ClassSlot[]): Record<string, ClassSlot[]> {
  return slots.reduce<Record<string, ClassSlot[]>>((acc, slot) => {
    acc[slot.time] ??= []
    acc[slot.time].push(slot)
    return acc
  }, {})
}

function Empty({ children }: { children: string }) {
  return <div className={`border border-gray-300 p-4 text-sm dark:border-gray-700 ${mutedClass}`}>{children}</div>
}

export default function TimetableDisplay({ schedule, day, ready }: TimetableDisplayProps) {
  const isWeekly = day === 'Weekly'

  const daySlots = useMemo(
    () => (!isWeekly && day ? schedule[day] ?? [] : []),
    [schedule, day, isWeekly],
  )

  const dayGrouped = useMemo(() => groupByTime(daySlots), [daySlots])
  const dayTimes = useMemo(() => Object.keys(dayGrouped).sort(compareTimes), [dayGrouped])

  const weeklyTimes = useMemo(
    () =>
      [...new Set(Object.values(schedule).flat().map((slot) => slot.time).filter(Boolean))].sort(
        compareTimes,
      ),
    [schedule],
  )

  const weeklyColumns = useMemo(
    () => WEEK_DAYS.map((weekDay) => ({ day: weekDay, grouped: groupByTime(schedule[weekDay] ?? []) })),
    [schedule],
  )

  if (!ready) {
    return <Empty>Select department, major, year, section, and a day to view timetable.</Empty>
  }

  if (isWeekly) {
    if (weeklyTimes.length === 0) return <Empty>No classes found.</Empty>

    return (
      <div className={`overflow-x-auto ${panelClass}`}>
        <table className="min-w-[980px] w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: '100px' }} />
            {WEEK_DAYS.map((weekDay) => (
              <col key={`col-${weekDay}`} style={{ width: '176px' }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="px-2 py-2 text-left text-sm font-medium text-black dark:text-white">Time</th>
              {WEEK_DAYS.map((weekDay, index) => (
                <th
                  key={weekDay}
                  className={`border-l border-gray-300 px-4 py-2 text-left font-medium text-black dark:border-gray-700 dark:text-white ${
                    index === WEEK_DAYS.length - 1 ? 'border-r' : ''
                  }`}
                >
                  {weekDay}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeklyTimes.map((time) => (
              <tr key={time} className="border-b border-gray-300 align-top dark:border-gray-700">
                <td className="px-2 py-3 text-sm font-medium text-black dark:text-white">
                  {formatTimeRange(time)}
                </td>
                {weeklyColumns.map(({ day: weekDay, grouped }, index) => {
                  const slots = grouped[time] ?? []
                  return (
                    <td
                      key={`${weekDay}-${time}`}
                      className={`border-l border-gray-300 px-4 py-3 align-top dark:border-gray-700 ${
                        index === weeklyColumns.length - 1 ? 'border-r' : ''
                      }`}
                    >
                      {slots.length > 0 ? (
                        <div className="space-y-2">
                          {slots.map((slot, slotIndex) => (
                            <div
                              key={`${weekDay}-${time}-${slotIndex}`}
                              className={
                                slotIndex > 0 ? 'border-t border-gray-200 pt-2 dark:border-gray-700' : ''
                              }
                            >
                              <ClassEntry slot={slot} compact />
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
      </div>
    )
  }

  if (daySlots.length === 0) return <Empty>No classes found.</Empty>

  return (
    <div className={`overflow-x-auto ${panelClass}`}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 dark:border-gray-700">
            <th className="w-40 px-4 py-2 text-left font-medium text-black dark:text-white">Time</th>
            <th className="px-4 py-2 text-left font-medium text-black dark:text-white">
              Course / Electives
            </th>
          </tr>
        </thead>
        <tbody>
          {dayTimes.map((time) => (
            <tr key={time} className="border-b border-gray-300 align-top dark:border-gray-700">
              <td className="px-4 py-3 font-medium text-black dark:text-white">
                {formatTimeRange(time)}
              </td>
              <td className="px-4 py-3">
                <div className="space-y-2">
                  {dayGrouped[time].map((slot, index) => (
                    <div
                      key={`${time}-${index}`}
                      className={index > 0 ? 'border-t border-gray-200 pt-2 dark:border-gray-700' : ''}
                    >
                      <ClassEntry slot={slot} />
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
