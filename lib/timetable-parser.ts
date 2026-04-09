import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { ParsedTimetableResponse, TimeSlot, TimetableTree } from '@/lib/timetable-types'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx') as typeof import('xlsx')

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads')
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function cleanCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .trim()
}

function convertBatchYear(code: string): number {
  const match = code.match(/^(\d)K(\d{2})$/i)
  if (!match) return Number.NaN
  return Number(`${match[1]}0${match[2]}`)
}

function getStudyLevel(batchYear: number, currentYear: number): string {
  const diff = currentYear - batchYear
  if (diff === 1) return 'Freshman'
  if (diff === 2) return 'Sophomore'
  if (diff === 3) return 'Junior'
  if (diff === 4) return 'Senior'
  return `Year-${Math.max(diff, 0)}`
}

function getDepartmentShortName(rawName: string): string {
  const tokens = rawName
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !['nust', 'of', 'and', 'the', 'for'].includes(token.toLowerCase()))

  const acronym = tokens.map((token) => token[0]?.toUpperCase() ?? '').join('')
  return acronym || 'DEPT'
}

function parseBatchCode(batchCode: string): {
  batchYearCode: string
  major: string
  section: string
} | null {
  const match = cleanCell(batchCode).match(/^(\dK\d{2})-([A-Za-z]+)-(\d+)([A-Za-z])$/i)
  if (!match) return null

  return {
    batchYearCode: match[1].toUpperCase(),
    major: match[2].toUpperCase(),
    section: match[4].toUpperCase(),
  }
}

function parseClassCell(rawValue: string): { course: string; room: string } {
  const normalized = rawValue.replace(/\r/g, '').trim()
  if (!normalized) return { course: '', room: '' }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const firstLine = lines[0] ?? normalized
  const roomFromMakeupPattern =
    normalized.match(/@\s*[^|\n]*?\b(?:in|at)\s+([^|\n]+?)(?=\s*(?:\||$))/i)?.[1]?.trim() ?? ''
  const roomFromParentheses = normalized.match(/\(([^()]+)\)\s*$/)?.[1]?.trim() ?? ''

  const room = roomFromMakeupPattern || roomFromParentheses

  return {
    course: firstLine.replace(/\s*\([^()]*\)\s*$/, '').trim(),
    room,
  }
}

function extractSectionDefaultRoom(rows: unknown[][], gridStart: number): string {
  // In this workbook, schedule heading is above day header row for each block.
  // Search upward inside current block only.
  for (let idx = gridStart - 3; idx >= Math.max(0, gridStart - 10); idx -= 1) {
    if (idx < 0 || idx >= rows.length) continue

    const firstCell = cleanCell(rows[idx]?.[0])
    if (normalizeHeader(firstCell) === normalizeHeader('TIME / DAYS')) {
      break
    }

    const rowValues = rows[idx] ?? []
    const text = rowValues
      .map((cell) => cleanCell(cell))
      .filter(Boolean)
      .join(' ')

    if (!text) continue
    if (!/schedule\s+for/i.test(text)) continue

    const scheduleMatch = text.match(/-\s*\(([^()]+)\)\s*$/)
    if (scheduleMatch?.[1]) {
      return scheduleMatch[1].trim()
    }

    const parenMatches = [...text.matchAll(/\(([^()]+)\)/g)]
    for (let i = parenMatches.length - 1; i >= 0; i -= 1) {
      const candidate = cleanCell(parenMatches[i][1])
      if (/(cr-|block|hall|room|lab|mrc|lh|iaec|seminar|\d)/i.test(candidate)) {
        return candidate
      }
    }
  }

  return ''
}

function getLatestWorkbookPath(): { fileName: string; filePath: string } {
  if (!fs.existsSync(UPLOADS_DIR)) {
    throw new Error('Uploads directory does not exist.')
  }

  const files = fs
    .readdirSync(UPLOADS_DIR)
    .filter((file) => /\.(xlsx|xls)$/i.test(file))
    .map((fileName) => {
      const filePath = path.join(UPLOADS_DIR, fileName)
      return {
        fileName,
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  if (files.length === 0) {
    throw new Error('No Excel file found in data/uploads.')
  }

  const [latest] = files
  return { fileName: latest.fileName, filePath: latest.filePath }
}

function ensurePath(
  data: TimetableTree,
  department: string,
  major: string,
  studyLevel: string,
  section: string,
  day: string,
): TimeSlot[] {
  data[department] ??= {}
  data[department][major] ??= {}
  data[department][major][studyLevel] ??= {}
  data[department][major][studyLevel][section] ??= {}
  data[department][major][studyLevel][section][day] ??= []
  return data[department][major][studyLevel][section][day]
}

export function parseLatestTimetableFromUploads(): ParsedTimetableResponse {
  const { fileName, filePath } = getLatestWorkbookPath()
  const workbook = XLSX.readFile(filePath)

  const mappingSheet = workbook.Sheets['Mappings']
  if (!mappingSheet) {
    throw new Error('Mappings sheet is missing in the workbook.')
  }

  const mappingRows = XLSX.utils.sheet_to_json(mappingSheet, { header: 1, defval: '' }) as unknown[][]
  if (mappingRows.length < 2) {
    throw new Error('Mappings sheet does not contain any mapping rows.')
  }

  const header = mappingRows[0].map(normalizeHeader)
  const sheetNameIdx = header.findIndex((col) => col === 'sheetname')
  const batchIdx = header.findIndex((col) => col === 'batch')
  const gridStartIdx = header.findIndex((col) => col === 'gridstart')
  const gridEndIdx = header.findIndex((col) => col === 'gridend')

  if ([sheetNameIdx, batchIdx, gridStartIdx, gridEndIdx].some((idx) => idx < 0)) {
    throw new Error('Mappings sheet is missing one or more required columns.')
  }

  const timetableSheetName = workbook.SheetNames.find(
    (sheet) => sheet !== 'Mappings' && sheet !== 'Processing Logs',
  )

  if (!timetableSheetName) {
    throw new Error('No timetable sheets found in workbook.')
  }

  const firstTimetableSheet = workbook.Sheets[timetableSheetName]
  const departmentRaw = cleanCell(firstTimetableSheet?.A1?.v ?? '')
  const department = getDepartmentShortName(departmentRaw)
  const currentYear = new Date().getFullYear()

  const data: TimetableTree = {}

  for (const row of mappingRows.slice(1)) {
    const sheetName = cleanCell(row[sheetNameIdx])
    const batchCode = cleanCell(row[batchIdx])
    const gridStart = Number(row[gridStartIdx])
    const gridEnd = Number(row[gridEndIdx])

    if (!sheetName || !batchCode || !Number.isFinite(gridStart) || !Number.isFinite(gridEnd)) {
      continue
    }

    const parsedBatch = parseBatchCode(batchCode)
    if (!parsedBatch) {
      continue
    }

    const batchYear = convertBatchYear(parsedBatch.batchYearCode)
    if (!Number.isFinite(batchYear)) {
      continue
    }

    const studyLevel = getStudyLevel(batchYear, currentYear)
    const major = parsedBatch.major
    const section = parsedBatch.section

    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      continue
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
    const sectionDefaultRoom = extractSectionDefaultRoom(rows, gridStart)
    const headerRow = rows[gridStart - 2] ?? []

    const dayColumns = DAY_NAMES.map((day) => {
      const index = headerRow.findIndex((cell) => normalizeHeader(cell) === normalizeHeader(day))
      return { day, index }
    }).filter((entry) => entry.index >= 0)

    for (let r = gridStart - 1; r <= gridEnd - 1; r += 1) {
      const rowValues = rows[r] ?? []
      const time = cleanCell(rowValues[0])
      if (!/^\d{3,4}\s*-\s*\d{3,4}$/.test(time)) {
        continue
      }

      for (const { day, index } of dayColumns) {
        const rawCell = cleanCell(rowValues[index])
        if (!rawCell) {
          continue
        }

        if (/lunch\s*\+\s*prayer\s*break|prayer\s*break/i.test(rawCell)) {
          continue
        }

        const { course, room } = parseClassCell(rawCell)
        if (!course) {
          continue
        }

        const resolvedRoom =
          room && room.trim().toLowerCase() !== 'main'
            ? room.trim()
            : sectionDefaultRoom || room.trim()

        ensurePath(data, department, major, studyLevel, section, day).push({
          time,
          course,
          room: resolvedRoom,
          raw: rawCell,
        })
      }
    }
  }

  return {
    sourceFile: fileName,
    departmentRaw,
    department,
    currentYear,
    generatedAt: new Date().toISOString(),
    data,
  }
}
