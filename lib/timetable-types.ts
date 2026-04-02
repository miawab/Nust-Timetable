export interface TimeSlot {
  time: string
  course: string
  room: string
}

export type TimetableTree = Record<
  string,
  Record<string, Record<string, Record<string, Record<string, TimeSlot[]>>>>
>

export interface ParsedTimetableResponse {
  sourceFile: string
  departmentRaw: string
  department: string
  currentYear: number
  generatedAt: string
  data: TimetableTree
}
