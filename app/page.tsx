'use client'

import { useEffect, useMemo, useState } from 'react'
import TimetableSelector from '@/components/timetable-selector'
import TimetableDisplay from '@/components/timetable-display'
import Footer from '@/components/footer'
import DarkModeToggle from '@/components/dark-mode-toggle'
import timetableDataJson from '@/lib/timetable-data.json'
import type { TimetableTree } from '@/lib/timetable-types'

const DEFAULT_DAYS = ['Weekly', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function getCookie(name: string): string {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(';').shift() ?? '')
  }
  return ''
}

function keys<T extends Record<string, unknown> | undefined>(value: T): string[] {
  return value ? Object.keys(value) : []
}

function sortYears(yearList: string[]): string[] {
  return [...yearList].sort((a, b) => {
    const aNum = Number((a.match(/^\s*(\d+)/) ?? [])[1] ?? Number.POSITIVE_INFINITY)
    const bNum = Number((b.match(/^\s*(\d+)/) ?? [])[1] ?? Number.POSITIVE_INFINITY)

    if (aNum !== bNum) return aNum - bNum
    return a.localeCompare(b)
  })
}

export default function Home() {
  const timetableData = timetableDataJson as TimetableTree

  const [department, setDepartment] = useState('')
  const [major, setMajor] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [day, setDay] = useState('')

  // Load from localStorage/cookie on mount
  useEffect(() => {
    const saved = localStorage.getItem('timetable_selection')
    if (saved) {
      try {
        const { department: d, major: m, year: y, section: s, day: savedDay } = JSON.parse(saved)
        setDepartment(d || '')
        setMajor(m || '')
        setYear(y || '')
        setSection(s || '')
        setDay(savedDay || getCookie('timetable_day') || '')
      } catch {
        // Invalid data, ignore
      }
    } else {
      setDay(getCookie('timetable_day') || '')
    }
  }, [])

  // Save to localStorage and cookie when selection changes
  useEffect(() => {
    localStorage.setItem('timetable_selection', JSON.stringify({ department, major, year, section, day }))
    document.cookie = `timetable_day=${encodeURIComponent(day)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`
  }, [department, major, year, section, day])

  const departments = useMemo(() => keys(timetableData), [timetableData])
  const majors = useMemo(() => keys(timetableData[department]), [timetableData, department])
  const years = useMemo(
    () => sortYears(keys(timetableData[department]?.[major])),
    [timetableData, department, major],
  )
  const sections = useMemo(
    () => keys(timetableData[department]?.[major]?.[year]),
    [timetableData, department, major, year],
  )
  const days = useMemo(
    () => {
      const parsedDays = keys(timetableData[department]?.[major]?.[year]?.[section])
      return parsedDays.length > 0 ? parsedDays : DEFAULT_DAYS
    },
    [timetableData, department, major, year, section],
  )

  return (
    <div className="min-h-screen flex flex-col bg-white text-black dark:bg-black dark:text-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-6 flex justify-end">
          <DarkModeToggle />
        </div>

        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-black dark:text-white mb-8">NUST Timetable</h1>

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
        </div>

        <div className="mt-12">
          <TimetableDisplay
            timetableData={timetableData}
            department={department}
            major={major}
            year={year}
            section={section}
            day={day}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
