'use client'

import { useState } from 'react'
import TimetableSelector from '@/components/timetable-selector'
import TimetableDisplay from '@/components/timetable-display'
import Footer from '@/components/footer'

export default function Home() {
  const [department, setDepartment] = useState('')
  const [section, setSection] = useState('')
  const [day, setDay] = useState('')

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-black mb-8 text-center">University Timetable</h1>
          <TimetableSelector
            department={department}
            setDepartment={setDepartment}
            section={section}
            setSection={setSection}
            day={day}
            setDay={setDay}
          />
        </div>

        <div className="mt-12">
          <TimetableDisplay department={department} section={section} day={day} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
