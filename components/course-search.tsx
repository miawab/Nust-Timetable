'use client'

import { useMemo, useState } from 'react'
import { WEEK_DAYS, compareTimes, compareYears, formatTimeRange } from '@/lib/timetable/format'
import { displayRoom } from '@/components/class-entry'
import type { ClassSlot, TimetableTree } from '@/lib/timetable/types'
import { faintClass, inputClass, labelClass, mutedClass, panelClass } from '@/lib/ui'

interface Hit {
  major: string
  year: string
  section: string
  day: string
  slot: ClassSlot
}

interface CourseGroup {
  key: string
  title: string
  code: string
  instructors: string[]
  hits: Hit[]
}

const MAX_GROUPS = 25

function flatten(tree: TimetableTree): Hit[] {
  const hits: Hit[] = []

  for (const majors of Object.values(tree)) {
    for (const [major, years] of Object.entries(majors)) {
      for (const [year, sections] of Object.entries(years)) {
        for (const [section, days] of Object.entries(sections)) {
          for (const [day, slots] of Object.entries(days)) {
            for (const slot of slots) hits.push({ major, year, section, day, slot })
          }
        }
      }
    }
  }

  return hits
}

export default function CourseSearch({ tree }: { tree: TimetableTree }) {
  const [query, setQuery] = useState('')

  const hits = useMemo(() => flatten(tree), [tree])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) return []

    const matched = hits.filter(({ slot }) => {
      const haystack = `${slot.code ?? ''} ${slot.course} ${slot.instructor ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })

    const byCourse = new Map<string, CourseGroup>()
    for (const hit of matched) {
      const title = hit.slot.course.replace(/^makeup:\s*/i, '').trim()
      const key = `${hit.slot.code ?? ''}|${title.toLowerCase()}`

      let group = byCourse.get(key)
      if (!group) {
        group = { key, title, code: hit.slot.code ?? '', instructors: [], hits: [] }
        byCourse.set(key, group)
      }

      group.hits.push(hit)
      if (hit.slot.instructor && !group.instructors.includes(hit.slot.instructor)) {
        group.instructors.push(hit.slot.instructor)
      }
    }

    return [...byCourse.values()]
      .sort((a, b) => b.hits.length - a.hits.length || a.title.localeCompare(b.title))
      .slice(0, MAX_GROUPS)
  }, [hits, query])

  const totalMatches = useMemo(
    () => groups.reduce((total, group) => total + group.hits.length, 0),
    [groups],
  )

  return (
    <div className="space-y-6">
      <div>
        <label className={labelClass} htmlFor="course-search">
          Search course, code or teacher
        </label>
        <input
          id="course-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. EE-330, Signal, Taha"
          className={inputClass}
        />
      </div>

      {query.trim().length < 2 ? (
        <div className={`${panelClass} p-4`}>
          <p className={`text-sm ${mutedClass}`}>
            Type at least two characters to search every section in the timetable.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className={`${panelClass} p-4`}>
          <p className={`text-sm ${mutedClass}`}>No classes match “{query.trim()}”.</p>
        </div>
      ) : (
        <>
          <p className={`text-xs ${faintClass}`}>
            {groups.length} course{groups.length === 1 ? '' : 's'} · {totalMatches} class
            {totalMatches === 1 ? '' : 'es'}
            {groups.length === MAX_GROUPS ? ' (showing the first 25 — narrow the search)' : ''}
          </p>

          <div className="space-y-4">
            {groups.map((group) => {
              const sections = [...new Set(group.hits.map((h) => `${h.major} ${h.year} · ${h.section}`))]
                .sort((a, b) => compareYears(a.split('·')[0] ?? '', b.split('·')[0] ?? '') || a.localeCompare(b))

              return (
                <div key={group.key} className={panelClass}>
                  <div className="border-b border-gray-300 px-4 py-2 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-black dark:text-white">
                      {group.code ? <span className={`mr-2 text-xs ${faintClass}`}>{group.code}</span> : null}
                      {group.title}
                    </h2>
                    {group.instructors.length > 0 ? (
                      <p className={`text-xs ${mutedClass}`}>{group.instructors.join(', ')}</p>
                    ) : null}
                  </div>

                  <div className="px-4 py-3">
                    <p className={`mb-2 text-xs ${faintClass}`}>{sections.join('  |  ')}</p>

                    <div className="space-y-1">
                      {WEEK_DAYS.map((day) => {
                        const dayHits = group.hits
                          .filter((hit) => hit.day === day)
                          .sort((a, b) => compareTimes(a.slot.time, b.slot.time))

                        if (dayHits.length === 0) return null

                        const seen = new Set<string>()
                        const unique = dayHits.filter((hit) => {
                          const key = `${hit.slot.time}|${hit.section}|${displayRoom(hit.slot)}`
                          if (seen.has(key)) return false
                          seen.add(key)
                          return true
                        })

                        return (
                          <div key={day} className="flex gap-3 text-sm">
                            <span className="w-24 shrink-0 text-black dark:text-white">{day}</span>
                            <span className={mutedClass}>
                              {unique
                                .map(
                                  (hit) =>
                                    `${formatTimeRange(hit.slot.time)} ${hit.section} (${displayRoom(hit.slot)})`,
                                )
                                .join(', ')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
