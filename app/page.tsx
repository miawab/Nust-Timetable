import TimetableApp from '@/components/timetable-app'
import { loadTimetable } from '@/lib/timetable/load'

/**
 * Re-render at most every 5 minutes so an edit in the sheet reaches the site
 * without a redeploy. loadTimetable never rejects: if Google is unreachable it
 * serves the committed snapshot and reports why.
 */
export const revalidate = 300

export default async function Home() {
  const { data, source, fetchedAt, error } = await loadTimetable()

  return <TimetableApp data={data} source={source} fetchedAt={fetchedAt} error={error} />
}
