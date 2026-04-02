interface TimetableSelectorProps {
  departments: string[]
  majors: string[]
  years: string[]
  sections: string[]
  days: string[]
  department: string
  setDepartment: (value: string) => void
  major: string
  setMajor: (value: string) => void
  year: string
  setYear: (value: string) => void
  section: string
  setSection: (value: string) => void
  day: string
  setDay: (value: string) => void
}

export default function TimetableSelector({
  departments,
  majors,
  years,
  sections,
  days,
  department,
  setDepartment,
  major,
  setMajor,
  year,
  setYear,
  section,
  setSection,
  day,
  setDay,
}: TimetableSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-black mb-2">Department</label>
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value)
              setMajor('')
              setYear('')
              setSection('')
              setDay('')
            }}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Major</label>
          <select
            value={major}
            onChange={(e) => {
              setMajor(e.target.value)
              setYear('')
              setSection('')
              setDay('')
            }}
            disabled={!department}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">Select Major</option>
            {majors.map((majorOption) => (
              <option key={majorOption} value={majorOption}>
                {majorOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Year</label>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value)
              setSection('')
              setDay('')
            }}
            disabled={!major}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">Select Year</option>
            {years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-black mb-2">Section</label>
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value)
              setDay('')
            }}
            disabled={!year}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">Select Section</option>
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Day</label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={!section}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">Select Day</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
