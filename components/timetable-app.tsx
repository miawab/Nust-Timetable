'use client'

import { useEffect, useMemo, useState } from 'react'
import CourseSearch from '@/components/course-search'
import DarkModeToggle from '@/components/dark-mode-toggle'
import FacultyFinder from '@/components/faculty-finder'
import Footer from '@/components/footer'
import FreeRoomFinder from '@/components/free-room-finder'
import NowNext from '@/components/now-next'
import TimetableDisplay from '@/components/timetable-display'
import TimetableSelector from '@/components/timetable-selector'
import { compareYears } from '@/lib/timetable/format'
import type { TimetableData } from '@/lib/timetable/types'
import { faintClass, tabClass } from '@/lib/ui'

const VIEWS = [
  { id: 'timetable', label: 'Timetable Viewer' },
  { id: 'rooms', label: 'Free Room Finder' },
  { id: 'faculty', label: 'Teacher Schedule' },
  { id: 'courses', label: 'Course Search' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const STORAGE_KEY = 'timetable_selection'

interface TimetableAppProps {
  data: TimetableData
  source: 'live' | 'snapshot'
  fetchedAt: string
  error?: string
}

function keys(value: Record<string, unknown> | undefined): string[] {
  return value ? Object.keys(value) : []
}

export default function TimetableApp({ data, source, fetchedAt, error }: TimetableAppProps) {
  const { tree, faculty } = data

  const [department, setDepartment] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [day, setDay] = useState('')
  const [view, setView] = useState<ViewId>('timetable')
  const [restored, setRestored] = useState(false)

  // Restore the last selection so returning students land on their own section.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Record<string, string>>
        setDepartment(parsed.department ?? '')
        setMajor(parsed.major ?? '')
        setYear(parsed.year ?? '')
        setSection(parsed.section ?? '')
        setDay(parsed.day ?? '')
        if (VIEWS.some((entry) => entry.id === parsed.viewMode)) {
          setView(parsed.viewMode as ViewId)
        }
      }
    } catch {
      // Corrupt or unavailable storage just means starting fresh.
    }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ department, major, year, section, day, viewMode: view }),
      )
    } catch {
      // Private browsing can refuse writes; the app works without persistence.
    }
  }, [restored, department, major, year, section, day, view])

  const departments = useMemo(() => keys(tree), [tree])
  const majors = useMemo(() => keys(tree[department]), [tree, department])
  const years = useMemo(
    () => keys(tree[department]?.[major]).sort(compareYears),
    [tree, department, major],
  )
  const sections = useMemo(
    () => keys(tree[department]?.[major]?.[year]),
    [tree, department, major, year],
  )

  const schedule = useMemo(
    () => tree[department]?.[major]?.[year]?.[section] ?? {},
    [tree, department, major, year, section],
  )

  const days = useMemo(() => keys(schedule), [schedule])

  // A single department needs no dropdown decision from the student.
  useEffect(() => {
    if (!restored) return
    if (!department && departments.length === 1) setDepartment(departments[0])
  }, [restored, department, departments])

  const sectionChosen = Boolean(department && major && year && section)
  const sectionLabel = sectionChosen ? `${major} ${year} · Section ${section}` : ''

  return (
    <div className="min-h-screen flex flex-col bg-white text-black dark:bg-black dark:text-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-6 flex justify-end">
          <DarkModeToggle />
        </div>

        <div className="mb-12">
          <h1 className="mb-3 text-3xl font-semibold text-black dark:text-white">NUST-view</h1>

          {data.meta.semester ? (
            <p className={`mb-6 text-xs ${faintClass}`}>
              {data.meta.semester}
              {source === 'snapshot' ? ' · showing last saved copy' : ''}
            </p>
          ) : null}

          {/* Visitors get the fact, not the cause: the detailed reason is
              operational information and stays in /api/timetable. */}
          {error ? (
            <div className="mb-6 border border-gray-300 p-3 text-xs dark:border-gray-700">
              <p className="font-medium text-black dark:text-white">Showing the last saved copy</p>
              <p className={faintClass}>
                The live timetable sheet could not be read just now, so this may be out of date.
              </p>
            </div>
          ) : null}

          <div className="mb-8 flex flex-wrap items-center gap-2">
            {VIEWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setView(entry.id)}
                className={tabClass(view === entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {view === 'timetable' ? (
            <TimetableSelector
              departments={departments}
              majors={majors}
              years={years}
              sections={sections}
              days={days}
              department={department}
              setDepartment={setDepartment}
              major={major}
              setMajor={setMajor}
              year={year}
              setYear={setYear}
              section={section}
              setSection={setSection}
              day={day}
              setDay={setDay}
            />
          ) : null}

          {view === 'rooms' ? <FreeRoomFinder tree={tree} /> : null}
          {view === 'faculty' ? <FacultyFinder faculty={faculty} /> : null}
          {view === 'courses' ? <CourseSearch tree={tree} /> : null}
        </div>

        {view === 'timetable' ? (
          <div className="mt-12 space-y-8">
            {sectionChosen ? <NowNext schedule={schedule} label={sectionLabel} /> : null}

            <TimetableDisplay
              schedule={schedule}
              day={day}
              ready={sectionChosen && Boolean(day)}
            />
          </div>
        ) : null}

        <p className={`mt-12 text-xs ${faintClass}`}>
          {source === 'live' ? 'Synced from the timetable sheet' : 'Saved copy'} ·{' '}
          {new Date(fetchedAt).toLocaleString()} · {data.meta.sectionCount} sections
        </p>
      </main>

      <Footer />
    </div>
  )
}
