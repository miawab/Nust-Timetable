import snapshotJson from './snapshot.json'
import { fetchWorkbook, readGoogleConfig } from './fetch'
import { parseWorkbook } from './parse'
import type { TimetableData } from './types'

const snapshot = snapshotJson as unknown as TimetableData

/** How long a successful live read is reused before refetching. */
const TTL_MS = 5 * 60 * 1000

/**
 * A live read this much smaller than the snapshot is treated as a parse failure
 * rather than as real data. The sheet is edited upstream at any time, and a
 * restructure that halves the output should show the last good timetable and a
 * loud warning -- not silently empty half the sections.
 */
const COLLAPSE_RATIO = 0.4

export type TimetableSource = 'live' | 'snapshot'

export interface LoadResult {
  data: TimetableData
  source: TimetableSource
  /** Why the snapshot is being served, when it is. */
  error?: string
  fetchedAt: string
}

let cached: LoadResult | null = null
let cachedAt = 0
let inFlight: Promise<LoadResult> | null = null

function snapshotResult(error?: string): LoadResult {
  return {
    data: snapshot,
    source: 'snapshot',
    fetchedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  }
}

async function readLive(fresh: boolean): Promise<LoadResult> {
  const config = readGoogleConfig()
  if (!config) {
    return snapshotResult('Google credentials are not configured; serving the committed snapshot.')
  }

  const workbook = await fetchWorkbook(config, { fresh })
  const data = parseWorkbook(workbook)

  const floor = snapshot.meta.slotCount * COLLAPSE_RATIO
  if (snapshot.meta.slotCount > 0 && data.meta.slotCount < floor) {
    return snapshotResult(
      `Live sheet parsed to only ${data.meta.slotCount} classes (snapshot has ` +
        `${snapshot.meta.slotCount}). The sheet layout has probably changed; serving the ` +
        'last known-good snapshot. Re-run the parser checks against the new layout.',
    )
  }

  return { data, source: 'live', fetchedAt: new Date().toISOString() }
}

/**
 * Current timetable, from the live sheet when possible.
 *
 * Never rejects: any failure downgrades to the committed snapshot and reports
 * why, so the site keeps serving a timetable when Google is unreachable, the
 * refresh token has expired, or the sheet stops parsing.
 */
export async function loadTimetable(options: { force?: boolean } = {}): Promise<LoadResult> {
  if (!options.force && cached && Date.now() - cachedAt < TTL_MS) {
    return cached
  }

  // Collapse concurrent misses into one upstream read.
  if (!options.force && inFlight) return inFlight

  const task = readLive(options.force ?? false)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      return snapshotResult(message)
    })
    .then((result) => {
      // Only a live read refreshes the cache clock; a fallback stays retryable.
      cached = result
      cachedAt = result.source === 'live' ? Date.now() : 0
      return result
    })
    .finally(() => {
      inFlight = null
    })

  inFlight = task
  return task
}

export { snapshot }
