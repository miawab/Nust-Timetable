/** A tab of the workbook, as the Sheets API returns it: rows of cell strings. */
export type SheetRows = string[][]
export type Workbook = Record<string, SheetRows>

export type SlotKind = 'class' | 'lab' | 'makeup'

export interface ClassSlot {
  /** Raw grid time, e.g. "0900-0950". Kept raw so sorting stays cheap. */
  time: string
  course: string
  room: string | null
  kind: SlotKind
  /** Course code, either joined from the Overall tab or read off a makeup entry. */
  code?: string
  instructor?: string
  labEngineer?: string
  creditHours?: string
  /** Makeup date/time detail, e.g. "Thursday 14 May, 2026 @ 1400-1450". */
  note?: string
}

export type DaySchedule = Record<string, ClassSlot[]>
export type SectionSchedule = Record<string, DaySchedule>
export type YearSchedule = Record<string, SectionSchedule>
export type MajorSchedule = Record<string, YearSchedule>
export type TimetableTree = Record<string, MajorSchedule>

/** One row of the Overall tab: the course catalogue, keyed by batch + section. */
export interface CourseRecord {
  batch: string
  section: string
  code: string
  subject: string
  dept: string
  instructor: string
  labEngineer: string
  creditHours: string
}

/** One row of the Faculty Timetable tab. */
export interface FacultyRecord {
  faculty: string
  day: string
  time: string
  batch: string
  subject: string
  location: string
}

export interface TimetableMeta {
  generatedAt: string
  /** e.g. "Spring 2026", read off a schedule heading. Null when absent. */
  semester: string | null
  slotCount: number
  sectionCount: number
  /** Non-fatal shape surprises. Fatal ones throw instead. */
  warnings: string[]
}

export interface TimetableData {
  meta: TimetableMeta
  tree: TimetableTree
  courses: CourseRecord[]
  faculty: FacultyRecord[]
}
