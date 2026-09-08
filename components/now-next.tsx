'use client'

import { useEffect, useState } from 'react'
import ClassEntry from '@/components/class-entry'
import { endMinutes, formatTimeRange, startMinutes, weekdayName } from '@/lib/timetable/format'
import type { ClassSlot, DaySchedule } from '@/lib/timetable/types'
import { faintClass, mutedClass, panelClass } from '@/lib/ui'

interface NowNextProps {
  schedule: DaySchedule
  label: string
}

function minutesUntil(target: number, now: number): string {
  const delta = target - now
  if (delta <= 0) return 'now'
  if (delta < 60) return `in ${delta} min`

  const hours = Math.floor(delta / 60)
  const minutes = delta % 60
  return minutes ? `in ${hours}h ${minutes}m` : `in ${hours}h`
}

/**
 * The class happening now and the one after it.
 *
 * Renders nothing until mounted: the current time differs between server and
 * client, and rendering it during SSR causes a hydration mismatch.
 */
export default function NowNext({ schedule, label }: NowNextProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (!now) return null

  const day = weekdayName(now)
  if (!day) {
    return (
      <div className={`${panelClass} p-4`}>
        <p className={`text-sm ${mutedClass}`}>No classes today — it&apos;s the weekend.</p>
      </div>
    )
  }

  const minutes = now.getHours() * 60 + now.getMinutes()
  const slots = [...(schedule[day] ?? [])].sort((a, b) => startMinutes(a.time) - startMinutes(b.time))

  const current: ClassSlot[] = slots.filter(
    (slot) => startMinutes(slot.time) <= minutes && minutes < endMinutes(slot.time),
  )

  const upcomingTime = slots
    .map((slot) => startMinutes(slot.time))
    .filter((start) => start > minutes)
    .sort((a, b) => a - b)[0]

  const upcoming = slots.filter((slot) => startMinutes(slot.time) === upcomingTime)

  if (current.length === 0 && upcoming.length === 0) {
    return (
      <div className={`${panelClass} p-4`}>
        <p className={`text-sm ${mutedClass}`}>
          Nothing left today for {label}.
        </p>
      </div>
    )
  }

  return (
    <div className={`${panelClass} divide-y divide-gray-300 dark:divide-gray-700`}>
      <div className="flex items-baseline justify-between gap-2 px-4 py-2">
        <h2 className="text-sm font-semibold text-black dark:text-white">{day}</h2>
        <span className={`text-xs ${faintClass}`}>{label}</span>
      </div>

      <div className="p-4">
        <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${faintClass}`}>Now</p>
        {current.length > 0 ? (
          <div className="space-y-3">
            {current.map((slot, index) => (
              <div key={`now-${index}`}>
                <p className={`text-xs ${mutedClass}`}>{formatTimeRange(slot.time)}</p>
                <ClassEntry slot={slot} />
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${mutedClass}`}>Free right now.</p>
        )}
      </div>

      {upcoming.length > 0 ? (
        <div className="p-4">
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${faintClass}`}>
            Next · {minutesUntil(upcomingTime, minutes)}
          </p>
          <div className="space-y-3">
            {upcoming.map((slot, index) => (
              <div key={`next-${index}`}>
                <p className={`text-xs ${mutedClass}`}>{formatTimeRange(slot.time)}</p>
                <ClassEntry slot={slot} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
