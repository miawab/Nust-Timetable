const departments = ['Computer Science', 'Engineering', 'Business', 'Arts']
const sections = ['A', 'B', 'C']
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

interface TimetableSelectorProps {
  department: string
  setDepartment: (value: string) => void
  section: string
  setSection: (value: string) => void
  day: string
  setDay: (value: string) => void
}

export default function TimetableSelector({
  department,
  setDepartment,
  section,
  setSection,
  day,
  setDay,
}: TimetableSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <label className="block text-sm font-medium text-black mb-2">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
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

        <div className="flex-1">
          <label className="block text-sm font-medium text-black mb-2">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black"
          >
            <option value="">Select Section</option>
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-black mb-2">Day</label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 bg-white text-black focus:outline-none focus:border-black"
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
