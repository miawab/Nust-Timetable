import { NextResponse } from 'next/server'
import { loadTimetable } from '@/lib/timetable/load'

/**
 * Current timetable as JSON.
 *
 * Only parsed teaching data is exposed -- the timetable grid, the course
 * catalogue and the faculty schedule. The workbook's Settings, Mappings and
 * Processing Logs tabs are never read into the response.
 */
export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get('refresh') === '1'
  const result = await loadTimetable({ force })

  return NextResponse.json(
    {
      source: result.source,
      fetchedAt: result.fetchedAt,
      ...(result.error ? { error: result.error } : {}),
      meta: result.data.meta,
      tree: result.data.tree,
      courses: result.data.courses,
      faculty: result.data.faculty,
    },
    {
      headers: {
        // Serve stale instantly while a refresh happens behind it.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    },
  )
}
