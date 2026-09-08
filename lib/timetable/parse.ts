import type {
  ClassSlot,
  CourseRecord,
  FacultyRecord,
  SheetRows,
  SlotKind,
  TimetableData,
  TimetableTree,
  Workbook,
} from './types'

/**
 * Thrown when the workbook no longer looks like a timetable at all.
 *
 * The sheet is maintained upstream and its shape can change without warning, so
 * anything we cannot confidently read must fail the sync rather than publish a
 * half-empty timetable. Recoverable oddities go into meta.warnings instead.
 */
export class TimetableShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimetableShapeError'
  }
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

/** Tabs that hold metadata rather than a class grid. */
const META_TABS = new Set([
  'Settings',
  'Mappings',
  'Processing Logs',
  'Faculty Timetable',
  'Overall',
  'LMS Data',
])

const GRID_HEADER = 'time/days'
const TIME_CELL = /^\d{3,4}\s*-\s*\d{3,4}$/
const NON_CLASS_CELL = /seminar\/workshop\/library period|lunch|prayer break|timings/i
const MAKEUP_LABEL = /^\s*@?\s*(makeups?(\s+lab)?|makeshift)\b/i

/**
 * Words that make a token a place rather than a course. Keep this tight in both
 * directions: a looser test ate course suffixes like "(Gp-01)" and "(1x)", and a
 * bare "computing" swallowed the course "Parallel and Distributed Computing".
 */
const ROOM_WORDS = /\b(cr|lab|labs|hall|block|room|mrc|lh|iaec|smrimms|auditorium|online)\b/i
const NOT_A_ROOM = new Set(['lab', 'main', 'none', 'null', ''])
const PERSON_TITLE = /\b(dr|mr|ms|mrs|prof|engr)\b\.?\s/i

const YEAR_LABELS = ['1 - Freshman', '2 - Sophomore', '3 - Junior', '4 - Senior']

function norm(value: unknown): string {
  return String(value ?? '').replace(/\r/g, '').trim()
}

function normKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

function cell(rows: SheetRows, row: number, col: number): string {
  return norm(rows[row]?.[col])
}

function isRoomToken(value: string): boolean {
  const text = norm(value)
  if (NOT_A_ROOM.has(text.toLowerCase())) return false
  // "SAS - CR-11-UG Block-Dr. Neelma Naz" names a room but is not one.
  if (PERSON_TITLE.test(text)) return false
  return ROOM_WORDS.test(text)
}

/** Subject text reduced to a join key: case, spacing and qualifier suffixes dropped. */
function subjectKey(value: string): string {
  return norm(value)
    .replace(/\((?:lab|gp-?\s*\d+|\d+x|am|pm)\)/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function splitCode(value: string): { code: string; title: string } {
  const match = norm(value).match(/^([A-Z]{2,4}\s*-?\s*\d{3}[A-Z]?)\s*-\s*(.+)$/i)
  if (!match) return { code: '', title: norm(value) }
  return { code: match[1].replace(/\s+/g, ''), title: match[2].trim() }
}

/**
 * Room named inside a free-text entry.
 *
 * Preference order matters: an explicit "in/at <room>" beats a room-shaped
 * fragment, which in turn beats a bare "online" -- entries like
 * "@ 1000-1250 online / CR-02-UG Block" name both, and the physical room is the
 * more useful answer.
 */
function extractRoomFromText(text: string): string {
  const explicit = text.match(/@\s*[^|\n]*?\b(?:in|at)\s+([^|\n]+?)(?=\s*(?:\||$))/i)
  if (explicit) return explicit[1].trim().replace(/[.\s]+$/, '')

  for (const fragment of text.split(/[|/,]/).reverse()) {
    const candidate = fragment.trim().replace(/^\((.+)\)$/, '$1').trim()
    if (candidate && candidate.length < 40 && isRoomToken(candidate) && !/@|\d{4}\s*-\s*\d{4}/.test(candidate)) {
      return candidate
    }
  }

  if (/\bonline\b/i.test(text)) return 'Online'
  return ''
}

// ---------------------------------------------------------------------------
// Cell parsing
// ---------------------------------------------------------------------------

const isBatchPart = (p: string) =>
  /\dK\d{2}\s*-\s*[A-Za-z]+/i.test(p) || /^[A-Za-z]{3,6}[\s-]?\d{1,2}\b/.test(p)
const isPersonPart = (p: string) => /^(dr|mr|ms|mrs|prof|engr)\b\.?/i.test(p)
const isWhenPart = (p: string) =>
  p.includes('@') ||
  /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i.test(p) ||
  /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(p)

/**
 * Parse a pipe-delimited entry into a single slot.
 *
 * Covers both makeups ("Makeups | 2K22-BEE-14A | EE381-Robotics-1 | Mr. X | Thu
 * 14 May @ 1400-1450", and the shorter "Makeshift | LCS | Fri, 24 Apr") and
 * unlabelled announcements ("BESE-14 A and BESE 15 A | Industrial Visit | NICAT
 * | Thursday, Apr 30 @ 1330-1700"). Field order is not stable across entries, so
 * the course is found by elimination rather than at a fixed index -- otherwise
 * the whole raw string ends up displayed as the course name.
 */
function parsePipeEntry(text: string, time: string): ClassSlot | null {
  const parts = text.split('|').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const labelled = MAKEUP_LABEL.test(parts[0])
  const candidates = labelled ? parts.slice(1) : parts

  const courseIdx = candidates.findIndex(
    (p) => !isBatchPart(p) && !isPersonPart(p) && !isWhenPart(p),
  )
  // Every field is a date, room or person: this is an annotation on the class
  // above it ("(CR-18-IAEC) @ 1400-1550 Online | Mon, 27 Apr | Instead of @
  // 0900"), not a class of its own. The caller folds it into the previous slot.
  if (courseIdx < 0) return null

  const course = candidates[courseIdx]
  const when = candidates.find(isWhenPart)
  const teacher = candidates.find(isPersonPart)

  const { code, title } = splitCode(course)
  const label = title || course

  // A short non-date field right after the course is usually where it happens.
  const trailing = courseIdx >= 0 ? candidates[courseIdx + 1] : undefined
  const venue =
    trailing && !isWhenPart(trailing) && !isPersonPart(trailing) && trailing.length < 40
      ? trailing
      : ''

  const room = extractRoomFromText(text) || venue

  return {
    time,
    course: labelled ? `Makeup: ${label}` : label,
    room: room || null,
    kind: labelled ? 'makeup' : 'class',
    ...(code ? { code } : {}),
    ...(teacher ? { instructor: teacher } : {}),
    ...(when ? { note: when.replace(/\s*\/\s*[^/]*$/, '').trim() || when } : {}),
  }
}

/** Break a cell into course-or-room tokens, preserving order. */
function tokenize(text: string): string[] {
  const tokens: string[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // A pipe entry owns its whole line: it carries '/' inside dates and rooms,
    // so it must not go through the '/' split below.
    if (trimmed.includes('|')) {
      tokens.push(trimmed)
      continue
    }

    for (const piece of trimmed.split('/')) {
      const part = piece.trim()
      if (part) tokens.push(part)
    }
  }

  return tokens
}

/**
 * Turn one grid cell into class slots.
 *
 * A cell mixes courses with the rooms that belong to them, separated by either a
 * newline or a slash ("Linear Control Systems / (CR-19-IAEC)"). Room tokens
 * attach to the course before them; only course tokens open a new slot. The old
 * parser split single-line cells on '/' and treated every piece as its own
 * class, which both lost the room and emitted rooms as fake courses.
 */
export function parseCell(raw: string, time: string): ClassSlot[] {
  const text = norm(raw)
  if (!text || NON_CLASS_CELL.test(text)) return []

  const slots: ClassSlot[] = []

  for (const token of tokenize(text)) {
    const previous = slots[slots.length - 1]

    if (token.includes('|')) {
      const entry = parsePipeEntry(token, time)
      if (entry) {
        slots.push(entry)
      } else if (previous) {
        previous.note = previous.note ? `${previous.note}; ${token}` : token
      }
      continue
    }

    const last = previous

    // "Room: CR-14-UG Block"
    const explicitRoom = token.match(/^room\s*:\s*(.+)$/i)
    if (explicitRoom) {
      if (last) last.room = explicitRoom[1].trim()
      continue
    }

    // A bare "(PM)" or "(PM) (CR-02-UG Block)" qualifies the preceding course.
    const shift = token.match(/^\((AM|PM)\)\s*(?:\(([^)]+)\))?$/i)
    if (shift && last) {
      const marker = `(${shift[1].toUpperCase()})`
      if (!last.course.includes(marker)) last.course = `${last.course} ${marker}`
      if (shift[2] && !last.room) last.room = shift[2].trim()
      continue
    }

    const unwrapped = token.replace(/^\((.+)\)$/, '$1').trim()
    if (isRoomToken(unwrapped) && !/^\(?(am|pm)\)?$/i.test(unwrapped)) {
      // Room-only token: belongs to the course before it.
      const looksLikeCourseWithRoom = /\s\(/.test(token) && !/^\(/.test(token)
      if (!looksLikeCourseWithRoom) {
        if (last && !last.room) last.room = unwrapped
        continue
      }
    }

    // Otherwise it opens a class; a trailing "(...)" may still carry its room.
    let course = token
    let room: string | null = null
    let instructor = ''

    // "SAS - CR-11-UG Block-Dr. Neelma Naz" packs three fields into one token.
    const packed = token.match(
      /^(.+?)\s*-\s*(.*?(?:cr\s*-|block|lab|hall|iaec|mrc).*?)\s*-\s*((?:dr|mr|ms|mrs|prof|engr)\b\.?\s.+)$/i,
    )
    if (packed) {
      course = packed[1].trim()
      room = packed[2].trim()
      instructor = packed[3].trim()
    }

    const trailing = course.match(/\(([^()]+)\)\s*$/)
    if (!room && trailing && isRoomToken(trailing[1])) {
      room = trailing[1].trim()
      course = course.slice(0, trailing.index).trim()
    }

    course = course.replace(/\/+$/, '').trim()
    if (!course) continue

    if (/\bonline\b/i.test(token)) room = 'Online'
    if (room && NOT_A_ROOM.has(room.toLowerCase())) room = null

    const kind: SlotKind = /\(lab\)|\blab\b/i.test(token) ? 'lab' : 'class'
    slots.push({ time, course, room, kind, ...(instructor ? { instructor } : {}) })
  }

  return slots
}

// ---------------------------------------------------------------------------
// Metadata tabs
// ---------------------------------------------------------------------------

function headerIndex(header: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = header.findIndex((h) => normKey(h) === normKey(name))
    if (idx >= 0) return idx
  }
  return -1
}

function parseCourses(rows: SheetRows | undefined, warnings: string[]): CourseRecord[] {
  if (!rows || rows.length < 2) {
    warnings.push('Overall tab missing or empty; classes will have no instructor or course code.')
    return []
  }

  const header = rows[0].map(norm)
  const idx = {
    batch: headerIndex(header, 'Batch'),
    section: headerIndex(header, 'Section'),
    code: headerIndex(header, 'Code'),
    subject: headerIndex(header, 'Subject'),
    dept: headerIndex(header, 'Dept'),
    instructor: headerIndex(header, 'Instructor Name', 'Instructor'),
    labEngineer: headerIndex(header, 'Lab Engineer'),
    creditHours: headerIndex(header, 'Credit Hrs', 'Credit Hours'),
  }

  if (idx.batch < 0 || idx.subject < 0) {
    warnings.push(`Overall tab header not recognised (got: ${header.filter(Boolean).join(', ')}).`)
    return []
  }

  const pick = (row: string[], i: number) => (i >= 0 ? norm(row[i]) : '')

  return rows
    .slice(1)
    .filter((row) => norm(row[idx.batch]) && norm(row[idx.subject]))
    .map((row) => ({
      batch: pick(row, idx.batch),
      section: pick(row, idx.section),
      code: pick(row, idx.code),
      subject: pick(row, idx.subject),
      dept: pick(row, idx.dept),
      instructor: pick(row, idx.instructor),
      labEngineer: pick(row, idx.labEngineer),
      creditHours: pick(row, idx.creditHours),
    }))
}

function parseFaculty(rows: SheetRows | undefined, warnings: string[]): FacultyRecord[] {
  if (!rows || rows.length < 2) {
    warnings.push('Faculty Timetable tab missing or empty; faculty lookup will be unavailable.')
    return []
  }

  const header = rows[0].map(norm)
  const idx = {
    faculty: headerIndex(header, 'Faculty'),
    day: headerIndex(header, 'Day'),
    time: headerIndex(header, 'Time'),
    batch: headerIndex(header, 'Batch'),
    subject: headerIndex(header, 'Subject'),
    location: headerIndex(header, 'Location'),
  }

  if (idx.faculty < 0 || idx.day < 0) {
    warnings.push(`Faculty Timetable header not recognised (got: ${header.filter(Boolean).join(', ')}).`)
    return []
  }

  const pick = (row: string[], i: number) => (i >= 0 ? norm(row[i]) : '')

  return rows
    .slice(1)
    .filter((row) => norm(row[idx.faculty]))
    .map((row) => ({
      faculty: pick(row, idx.faculty),
      day: pick(row, idx.day),
      time: pick(row, idx.time),
      batch: pick(row, idx.batch),
      subject: pick(row, idx.subject),
      location: pick(row, idx.location),
    }))
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

/** Academic year in progress; the intake-year fallback counts from it. */
function academicStartYear(now: Date): number {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

/**
 * Study-year label. Prefer the semester number in the heading ("6th Semester")
 * since that survives new intakes; fall back to intake-year arithmetic. The old
 * parser hardcoded a 2K22-2K25 lookup, so a 2K26 intake would have silently
 * vanished from the site.
 */
function yearLabel(semester: number | null, intake: string, now: Date): string {
  let index: number

  if (semester && semester > 0) {
    index = Math.ceil(semester / 2)
  } else {
    const match = intake.match(/^(\d)K(\d{2})$/i)
    if (!match) return 'Unknown Year'
    const intakeYear = Number(`${match[1]}0${match[2]}`)
    index = academicStartYear(now) - intakeYear + 1
  }

  if (index < 1) return 'Unknown Year'
  return YEAR_LABELS[index - 1] ?? `${index} - Year ${index}`
}

function findHeading(rows: SheetRows, headerRow: number): string {
  for (let i = headerRow - 1; i >= Math.max(0, headerRow - 8); i -= 1) {
    if (normKey(cell(rows, i, 0)) === GRID_HEADER) break
    const text = (rows[i] ?? []).map(norm).filter(Boolean).join(' ')
    if (/schedule\s+for/i.test(text)) return text
  }
  return ''
}

function defaultRoomFrom(heading: string): string | null {
  const trailing = heading.match(/-\s*\(([^()]+)\)\s*$/)
  if (trailing && isRoomToken(trailing[1])) return trailing[1].trim()

  const all = [...heading.matchAll(/\(([^()]+)\)/g)]
  for (let i = all.length - 1; i >= 0; i -= 1) {
    if (isRoomToken(all[i][1])) return all[i][1].trim()
  }
  return null
}

interface Block {
  major: string
  section: string
  year: string
  batch: string
  slots: Array<{ day: string; slot: ClassSlot }>
}

function parseBlock(
  rows: SheetRows,
  headerRow: number,
  now: Date,
  warnings: string[],
  sheetName: string,
): Block | null {
  const header = (rows[headerRow] ?? []).map(norm)

  const dayColumns = DAY_NAMES.map((day) => ({
    day,
    index: header.findIndex((h) => normKey(h) === normKey(day)),
  })).filter((entry) => entry.index >= 0)

  if (dayColumns.length === 0) {
    warnings.push(`${sheetName} row ${headerRow + 1}: no weekday columns in the header row.`)
    return null
  }
  if (dayColumns.length < DAY_NAMES.length) {
    const missing = DAY_NAMES.filter((d) => !dayColumns.some((c) => c.day === d))
    warnings.push(`${sheetName} row ${headerRow + 1}: missing columns for ${missing.join(', ')}.`)
  }

  const heading = findHeading(rows, headerRow)
  // Case-insensitive on purpose: headings mix "2K25" and "2k25", and a
  // case-sensitive match silently dropped six freshman sections.
  const batchMatch = heading.match(/(\dK\d{2})\s*-\s*([A-Za-z]+)\s*-?\s*(\d*)\s*([A-Za-z])\b/i)
  if (!batchMatch) {
    if (/schedule\s+for/i.test(heading)) {
      warnings.push(`${sheetName} row ${headerRow + 1}: unreadable batch in heading "${heading.slice(0, 90)}".`)
    }
    return null
  }

  const [, intake, majorRaw, batchNumber, sectionRaw] = batchMatch
  const semester = Number(heading.match(/(\d+)(?:st|nd|rd|th)\s+semester/i)?.[1] ?? '') || null
  const defaultRoom = defaultRoomFrom(heading)

  const block: Block = {
    major: majorRaw.toUpperCase(),
    section: sectionRaw.toUpperCase(),
    year: yearLabel(semester, intake.toUpperCase(), now),
    batch: `${intake.toUpperCase()}-${majorRaw.toUpperCase()}-${batchNumber}`,
    slots: [],
  }

  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const first = cell(rows, r, 0)
    if (normKey(first) === GRID_HEADER) break
    if (/^code\b/i.test(first) || /course code/i.test(first)) break
    if (!TIME_CELL.test(first)) continue

    for (const { day, index } of dayColumns) {
      for (const slot of parseCell(cell(rows, r, index), first)) {
        if (!slot.room && defaultRoom) slot.room = defaultRoom
        block.slots.push({ day, slot })
      }
    }
  }

  return block
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function parseWorkbook(workbook: Workbook, now: Date = new Date()): TimetableData {
  const warnings: string[] = []

  const courses = parseCourses(workbook['Overall'], warnings)
  const faculty = parseFaculty(workbook['Faculty Timetable'], warnings)

  // Course metadata is keyed batch+section first, then batch-only, so a section
  // with its own instructor wins but a shared course still resolves.
  const bySection = new Map<string, CourseRecord>()
  const byBatch = new Map<string, CourseRecord>()
  for (const record of courses) {
    const subject = subjectKey(record.subject)
    for (const section of record.section.split(/[^A-Za-z]+/).filter(Boolean)) {
      bySection.set(`${record.batch}|${section.toUpperCase()}|${subject}`, record)
    }
    if (!byBatch.has(`${record.batch}|${subject}`)) {
      byBatch.set(`${record.batch}|${subject}`, record)
    }
  }

  const tree: TimetableTree = {}
  let slotCount = 0
  let sectionCount = 0
  let semesterName: string | null = null

  for (const [sheetName, rows] of Object.entries(workbook)) {
    if (META_TABS.has(sheetName) || !rows?.length) continue

    for (let r = 0; r < rows.length; r += 1) {
      if (normKey(cell(rows, r, 0)) !== GRID_HEADER) continue

      const block = parseBlock(rows, r, now, warnings, sheetName)
      if (!block) continue

      if (!semesterName) {
        const heading = findHeading(rows, r)
        semesterName = heading.match(/\b(spring|fall|summer|autumn|winter)\s+(20\d{2})\b/i)?.[0] ?? null
      }

      const department = 'SEECS'
      const days: Record<string, ClassSlot[]> = {}
      for (const day of DAY_NAMES) days[day] = []

      for (const { day, slot } of block.slots) {
        const key = subjectKey(slot.course.replace(/^makeup:\s*/i, ''))
        const record =
          bySection.get(`${block.batch}|${block.section}|${key}`) ??
          byBatch.get(`${block.batch}|${key}`)

        if (record) {
          if (!slot.code && record.code) slot.code = record.code
          if (!slot.instructor && record.instructor) slot.instructor = record.instructor
          if (record.labEngineer) slot.labEngineer = record.labEngineer
          if (record.creditHours) slot.creditHours = record.creditHours
        }

        days[day] ??= []
        days[day].push(slot)
        slotCount += 1
      }

      tree[department] ??= {}
      tree[department][block.major] ??= {}
      tree[department][block.major][block.year] ??= {}

      // A repeated block for the same section appends rather than replaces.
      const existing = tree[department][block.major][block.year][block.section]
      if (existing) {
        for (const day of Object.keys(days)) {
          existing[day] = [...(existing[day] ?? []), ...days[day]]
        }
      } else {
        tree[department][block.major][block.year][block.section] = days
        sectionCount += 1
      }
    }
  }

  if (sectionCount === 0) {
    throw new TimetableShapeError(
      'No timetable grids found. Expected a "TIME / DAYS" header row above each ' +
        `schedule block; got tabs: ${Object.keys(workbook).join(', ')}.`,
    )
  }

  return {
    meta: {
      generatedAt: now.toISOString(),
      semester: semesterName,
      slotCount,
      sectionCount,
      warnings,
    },
    tree,
    courses,
    faculty,
  }
}
