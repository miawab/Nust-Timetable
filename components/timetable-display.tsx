interface TimeSlot {
  time: string
  course: string
  room: string
}

interface DaySchedule {
  [key: string]: TimeSlot[]
}

interface SectionSchedule {
  [key: string]: DaySchedule
}

interface DepartmentTimetable {
  [key: string]: SectionSchedule
}

const timetableData: DepartmentTimetable = {
  'Computer Science': {
    A: {
      Monday: [
        { time: '9:00 - 10:30', course: 'Data Structures', room: 'A101' },
        { time: '10:45 - 12:15', course: 'Web Development', room: 'A205' },
        { time: '1:00 - 2:30', course: 'Database Design', room: 'A301' },
      ],
      Tuesday: [
        { time: '9:00 - 10:30', course: 'Algorithms', room: 'A102' },
        { time: '11:00 - 12:30', course: 'Operating Systems', room: 'A203' },
      ],
      Wednesday: [
        { time: '9:00 - 10:30', course: 'Software Engineering', room: 'A201' },
        { time: '1:00 - 2:30', course: 'Mobile Development', room: 'A305' },
      ],
      Thursday: [
        { time: '9:00 - 10:30', course: 'Data Structures Lab', room: 'A401' },
        { time: '11:00 - 1:00', course: 'Web Dev Lab', room: 'A402' },
      ],
      Friday: [
        { time: '9:00 - 10:30', course: 'AI Fundamentals', room: 'A105' },
      ],
    },
    B: {
      Monday: [
        { time: '10:45 - 12:15', course: 'Data Structures', room: 'B101' },
        { time: '1:00 - 2:30', course: 'Web Development', room: 'B205' },
      ],
      Tuesday: [
        { time: '10:45 - 12:15', course: 'Algorithms', room: 'B102' },
      ],
      Wednesday: [
        { time: '10:45 - 12:15', course: 'Software Engineering', room: 'B201' },
      ],
      Thursday: [
        { time: '1:00 - 3:00', course: 'Data Structures Lab', room: 'B401' },
      ],
      Friday: [
        { time: '10:45 - 12:15', course: 'AI Fundamentals', room: 'B105' },
      ],
    },
  },
  Engineering: {
    A: {
      Monday: [
        { time: '9:00 - 10:30', course: 'Circuit Analysis', room: 'E101' },
        { time: '1:00 - 2:30', course: 'Thermodynamics', room: 'E201' },
      ],
      Tuesday: [
        { time: '9:00 - 10:30', course: 'Mechanics', room: 'E102' },
      ],
      Wednesday: [],
      Thursday: [
        { time: '9:00 - 11:00', course: 'Circuit Lab', room: 'E401' },
      ],
      Friday: [
        { time: '9:00 - 10:30', course: 'Materials Science', room: 'E105' },
      ],
    },
    B: {
      Monday: [
        { time: '10:45 - 12:15', course: 'Circuit Analysis', room: 'E102' },
      ],
      Tuesday: [
        { time: '10:45 - 12:15', course: 'Mechanics', room: 'E103' },
      ],
      Wednesday: [
        { time: '10:45 - 12:15', course: 'Thermodynamics', room: 'E202' },
      ],
      Thursday: [
        { time: '1:00 - 3:00', course: 'Circuit Lab', room: 'E402' },
      ],
      Friday: [],
    },
  },
  Business: {
    A: {
      Monday: [
        { time: '9:00 - 10:30', course: 'Accounting', room: 'B101' },
      ],
      Tuesday: [
        { time: '9:00 - 10:30', course: 'Finance', room: 'B102' },
        { time: '1:00 - 2:30', course: 'Economics', room: 'B201' },
      ],
      Wednesday: [],
      Thursday: [
        { time: '9:00 - 10:30', course: 'Business Law', room: 'B105' },
      ],
      Friday: [
        { time: '1:00 - 2:30', course: 'Management', room: 'B301' },
      ],
    },
    B: {
      Monday: [
        { time: '10:45 - 12:15', course: 'Accounting', room: 'B102' },
      ],
      Tuesday: [
        { time: '10:45 - 12:15', course: 'Finance', room: 'B103' },
      ],
      Wednesday: [
        { time: '10:45 - 12:15', course: 'Economics', room: 'B202' },
      ],
      Thursday: [],
      Friday: [
        { time: '10:45 - 12:15', course: 'Management', room: 'B302' },
      ],
    },
  },
  Arts: {
    A: {
      Monday: [
        { time: '9:00 - 10:30', course: 'Literature', room: 'A101' },
      ],
      Tuesday: [
        { time: '9:00 - 10:30', course: 'History', room: 'A102' },
        { time: '1:00 - 2:30', course: 'Philosophy', room: 'A201' },
      ],
      Wednesday: [
        { time: '9:00 - 10:30', course: 'Art History', room: 'A105' },
      ],
      Thursday: [],
      Friday: [
        { time: '9:00 - 10:30', course: 'Creative Writing', room: 'A301' },
      ],
    },
    B: {
      Monday: [
        { time: '10:45 - 12:15', course: 'Literature', room: 'A102' },
      ],
      Tuesday: [
        { time: '10:45 - 12:15', course: 'History', room: 'A103' },
      ],
      Wednesday: [],
      Thursday: [
        { time: '10:45 - 12:15', course: 'Philosophy', room: 'A202' },
      ],
      Friday: [
        { time: '10:45 - 12:15', course: 'Art History', room: 'A106' },
      ],
    },
  },
}

interface TimetableDisplayProps {
  department: string
  section: string
  day: string
}

export default function TimetableDisplay({
  department,
  section,
  day,
}: TimetableDisplayProps) {
  const hasSelection = department && section && day

  if (!hasSelection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Select department, section, and day to view timetable</p>
      </div>
    )
  }

  const schedule = timetableData[department]?.[section]?.[day] || []

  if (schedule.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No classes found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-3 px-4 font-semibold text-black">Time</th>
            <th className="text-left py-3 px-4 font-semibold text-black">Course</th>
            <th className="text-left py-3 px-4 font-semibold text-black">Room</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((slot, index) => (
            <tr key={index} className="border-b border-gray-300">
              <td className="py-3 px-4 text-black">{slot.time}</td>
              <td className="py-3 px-4 text-black">{slot.course}</td>
              <td className="py-3 px-4 text-black">{slot.room}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
