/**
 * Parse the fixture workbook and report data-quality numbers.
 *
 * Run: node --experimental-strip-types scripts/check_parser.ts [pythonOutput.json]
 *
 * The optional second argument is the old parser.py timetable.json, which is
 * compared slot-for-slot so a port regression shows up as a diff rather than as
 * a number that merely looks plausible.
 */

import { readFileSync } from 'node:fs'
import { parseWorkbook } from '../lib/timetable/parse.ts'
import type { ClassSlot, Workbook } from '../lib/timetable/types.ts'

const fixture = JSON.parse(
  readFileSync(new URL('../lib/timetable/__fixtures__/workbook.json', import.meta.url), 'utf8'),
) as Workbook

const data = parseWorkbook(fixture)

interface Located {
  major: string
  year: string
  section: string
  day: string
  slot: ClassSlot
}

const located: Located[] = []
for (const majors of Object.values(data.tree)) {
  for (const [major, years] of Object.entries(majors)) {
    for (const [year, sections] of Object.entries(years)) {
      for (const [section, days] of Object.entries(sections)) {
        for (const [day, slots] of Object.entries(days)) {
          for (const slot of slots) located.push({ major, year, section, day, slot })
        }
      }
    }
  }
}

const pipeLeaks = located.filter((l) => l.slot.course.includes('|'))
const roomAsCourse = located.filter((l) => /^\(?(cr-|computing lab|lec-hall)/i.test(l.slot.course))
const withRoom = located.filter((l) => l.slot.room)
const withInstructor = located.filter((l) => l.slot.instructor)
const withCode = located.filter((l) => l.slot.code)
const makeups = located.filter((l) => l.slot.kind === 'makeup')

const pct = (n: number) => `${((n / located.length) * 100).toFixed(1)}%`

console.log('=== parse results ===')
console.log('semester      ', data.meta.semester)
console.log('sections      ', data.meta.sectionCount)
console.log('slots         ', located.length)
console.log('courses (tab) ', data.courses.length)
console.log('faculty rows  ', data.faculty.length)
console.log()
console.log('=== quality ===')
console.log('pipe leaks in course ', pipeLeaks.length, '(want 0)')
console.log('room-as-course       ', roomAsCourse.length, '(want 0)')
console.log('slots with room      ', withRoom.length, pct(withRoom.length))
console.log('slots with instructor', withInstructor.length, pct(withInstructor.length))
console.log('slots with code      ', withCode.length, pct(withCode.length))
console.log('makeup slots         ', makeups.length)

if (data.meta.warnings.length) {
  console.log()
  console.log('=== warnings ===')
  for (const w of data.meta.warnings) console.log(' -', w)
}

for (const label of ['pipe leaks', 'room-as-course'] as const) {
  const sample = label === 'pipe leaks' ? pipeLeaks : roomAsCourse
  if (sample.length) {
    console.log()
    console.log(`=== sample ${label} ===`)
    for (const l of sample.slice(0, 5)) {
      console.log(' ', `${l.major} ${l.section} ${l.day}`, JSON.stringify(l.slot.course).slice(0, 100))
    }
  }
}

console.log()
console.log('=== sample makeups ===')
for (const l of makeups.slice(0, 4)) {
  console.log(' ', JSON.stringify(l.slot))
}

// --- parity against parser.py -------------------------------------------------

const pythonPath = process.argv[2]
if (pythonPath) {
  const py = JSON.parse(readFileSync(pythonPath, 'utf8')) as Record<
    string,
    Record<string, Record<string, Record<string, Record<string, Array<{ course: string; time: string }>>>>>
  >

  let pyCount = 0
  const pyKeys = new Set<string>()
  for (const majors of Object.values(py)) {
    for (const [major, years] of Object.entries(majors)) {
      for (const [year, sections] of Object.entries(years)) {
        for (const [section, days] of Object.entries(sections)) {
          for (const [day, slots] of Object.entries(days)) {
            for (const slot of slots) {
              pyCount += 1
              pyKeys.add(`${major}|${year}|${section}|${day}|${slot.time}`)
            }
          }
        }
      }
    }
  }

  const tsKeys = new Set(
    located.map((l) => `${l.major}|${l.year}|${l.section}|${l.day}|${l.slot.time}`),
  )

  const missing = [...pyKeys].filter((k) => !tsKeys.has(k))
  const added = [...tsKeys].filter((k) => !pyKeys.has(k))

  console.log()
  console.log('=== parity vs parser.py ===')
  console.log('python slots  ', pyCount)
  console.log('ts slots      ', located.length)
  console.log('slot-positions only python has:', missing.length)
  console.log('slot-positions only ts has    :', added.length)
  for (const k of missing.slice(0, 8)) console.log('   py-only:', k)
  for (const k of added.slice(0, 8)) console.log('   ts-only:', k)
}
