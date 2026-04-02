export const departments = ['Computer Science', 'Engineering', 'Business', 'Arts'] as const

export type Department = (typeof departments)[number]

export const majorsByDepartment: Record<Department, string[]> = {
  'Computer Science': ['Software Engineering', 'Artificial Intelligence', 'Data Science'],
  Engineering: ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'],
  Business: ['Accounting & Finance', 'Marketing', 'Management Sciences'],
  Arts: ['English', 'History', 'Media Studies'],
}

export const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const
export const sections = ['A', 'B', 'C'] as const
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

export interface TimeSlot {
  time: string
  course: string
  room: string
}

export type DaySchedule = Record<string, TimeSlot[]>
export type SectionSchedule = Record<string, DaySchedule>
export type YearSchedule = Record<string, SectionSchedule>
export type MajorSchedule = Record<string, YearSchedule>
export type DepartmentTimetable = Record<Department, MajorSchedule>

const baseSchedules: Record<Department, DaySchedule> = {
  'Computer Science': {
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
    Friday: [{ time: '9:00 - 10:30', course: 'AI Fundamentals', room: 'A105' }],
  },
  Engineering: {
    Monday: [
      { time: '9:00 - 10:30', course: 'Circuit Analysis', room: 'E101' },
      { time: '1:00 - 2:30', course: 'Thermodynamics', room: 'E201' },
    ],
    Tuesday: [{ time: '9:00 - 10:30', course: 'Mechanics', room: 'E102' }],
    Wednesday: [],
    Thursday: [{ time: '9:00 - 11:00', course: 'Circuit Lab', room: 'E401' }],
    Friday: [{ time: '9:00 - 10:30', course: 'Materials Science', room: 'E105' }],
  },
  Business: {
    Monday: [{ time: '9:00 - 10:30', course: 'Accounting', room: 'B101' }],
    Tuesday: [
      { time: '9:00 - 10:30', course: 'Finance', room: 'B102' },
      { time: '1:00 - 2:30', course: 'Economics', room: 'B201' },
    ],
    Wednesday: [],
    Thursday: [{ time: '9:00 - 10:30', course: 'Business Law', room: 'B105' }],
    Friday: [{ time: '1:00 - 2:30', course: 'Management', room: 'B301' }],
  },
  Arts: {
    Monday: [{ time: '9:00 - 10:30', course: 'Literature', room: 'A101' }],
    Tuesday: [
      { time: '9:00 - 10:30', course: 'History', room: 'A102' },
      { time: '1:00 - 2:30', course: 'Philosophy', room: 'A201' },
    ],
    Wednesday: [{ time: '9:00 - 10:30', course: 'Art History', room: 'A105' }],
    Thursday: [],
    Friday: [{ time: '9:00 - 10:30', course: 'Creative Writing', room: 'A301' }],
  },
}

function cloneDaySchedule(schedule: DaySchedule): DaySchedule {
  return Object.fromEntries(
    Object.entries(schedule).map(([day, slots]) => [
      day,
      slots.map((slot) => ({ ...slot })),
    ]),
  )
}

function buildDepartmentTimetable(): DepartmentTimetable {
  return departments.reduce((departmentAcc, department) => {
    const majors = majorsByDepartment[department]

    departmentAcc[department] = majors.reduce((majorAcc, major) => {
      majorAcc[major] = years.reduce((yearAcc, year) => {
        yearAcc[year] = sections.reduce((sectionAcc, section) => {
          sectionAcc[section] = cloneDaySchedule(baseSchedules[department])
          return sectionAcc
        }, {} as SectionSchedule)

        return yearAcc
      }, {} as YearSchedule)

      return majorAcc
    }, {} as MajorSchedule)

    return departmentAcc
  }, {} as DepartmentTimetable)
}

export const timetableData = buildDepartmentTimetable()
