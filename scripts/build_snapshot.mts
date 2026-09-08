/**
 * Regenerate lib/timetable/snapshot.json -- the fallback the site serves when
 * the live sheet is unreachable or stops parsing.
 *
 * Reads the live sheet when Google credentials are present, otherwise falls back
 * to the committed fixture. Refuses to write a snapshot that collapsed relative
 * to the one on disk, so a bad parse cannot quietly become the new baseline.
 *
 * Run: node --experimental-strip-types scripts/build_snapshot.ts [--force]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fetchWorkbook, readGoogleConfig } from '../lib/timetable/fetch.ts'
import { parseWorkbook } from '../lib/timetable/parse.ts'
import type { TimetableData, Workbook } from '../lib/timetable/types.ts'

const SNAPSHOT = fileURLToPath(new URL('../lib/timetable/snapshot.json', import.meta.url))
const FIXTURE = fileURLToPath(new URL('../lib/timetable/__fixtures__/workbook.json', import.meta.url))

const force = process.argv.includes('--force')

async function readWorkbook(): Promise<{ workbook: Workbook; origin: string }> {
  const config = readGoogleConfig()

  if (config) {
    console.log('Reading the live sheet...')
    return { workbook: await fetchWorkbook(config), origin: 'live sheet' }
  }

  console.log('No Google credentials in the environment; using the committed fixture.')
  return { workbook: JSON.parse(readFileSync(FIXTURE, 'utf8')) as Workbook, origin: 'fixture' }
}

function previousSlotCount(): number {
  try {
    const existing = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as TimetableData
    return existing.meta?.slotCount ?? 0
  } catch {
    return 0
  }
}

const { workbook, origin } = await readWorkbook()
const data = parseWorkbook(workbook)

const previous = previousSlotCount()
if (previous > 0 && data.meta.slotCount < previous * 0.6 && !force) {
  console.error(
    `Refusing to write: ${data.meta.slotCount} classes parsed, down from ${previous}. ` +
      'Check the sheet layout, then re-run with --force if the drop is real.',
  )
  process.exit(1)
}

writeFileSync(SNAPSHOT, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

console.log(`Wrote snapshot from the ${origin}:`)
console.log(`  semester ${data.meta.semester ?? 'unknown'}`)
console.log(`  ${data.meta.sectionCount} sections, ${data.meta.slotCount} classes`)
console.log(`  ${data.courses.length} course rows, ${data.faculty.length} faculty rows`)

for (const warning of data.meta.warnings) console.warn(`  warning: ${warning}`)
