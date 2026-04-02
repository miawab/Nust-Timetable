import type { TimeSlot, TimetableTree } from '../lib/timetable-types'

interface TimetableDisplayProps {
  timetableData: TimetableTree
  department: string
  major: string
  year: string
  section: string
  day: string
}

function sortTimes(a: string, b: string): number {
  const aStart = Number.parseInt(a.split('-')[0]?.trim() ?? '', 10)
  const bStart = Number.parseInt(b.split('-')[0]?.trim() ?? '', 10)

  if (Number.isNaN(aStart) || Number.isNaN(bStart)) {
    return a.localeCompare(b)
  }

  return aStart - bStart
}

export default function TimetableDisplay({
  timetableData,
  department,
  major,
  year,
  section,
  day,
}: TimetableDisplayProps) {
  if (!department || !major || !year || !section || !day) {
    return (
      <div className="border border-gray-300 p-4 text-sm text-gray-600">
        Select department, major, year, section, and day to view timetable.
      </div>
    )
  }

  const rawSlots: TimeSlot[] = timetableData[department]?.[major]?.[year]?.[section]?.[day] ?? []

  if (rawSlots.length === 0) {
    return <div className="border border-gray-300 p-4 text-sm text-gray-600">No classes found.</div>
  }

  const groupedByTime = rawSlots.reduce<Record<string, TimeSlot[]>>((acc: Record<string, TimeSlot[]>, slot: TimeSlot) => {
    acc[slot.time] ??= []
    acc[slot.time].push(slot)
    return acc
  }, {})

  const orderedTimes = Object.keys(groupedByTime).sort(sortTimes)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-white border-b border-gray-300">
            <th className="px-4 py-2 text-left font-medium text-black w-40">Time</th>
            <th className="px-4 py-2 text-left font-medium text-black">Course / Electives</th>
          </tr>
        </thead>
        <tbody>
          {orderedTimes.map((time) => (
            <tr key={time} className="border-b border-gray-300 align-top">
              <td className="px-4 py-3 font-medium text-black bg-white">{time}</td>
              <td className="px-4 py-3 bg-white">
                <div className="space-y-2">
                  {groupedByTime[time].map((slot: TimeSlot, idx: number) => (
                    <div key={`${time}-${idx}`} className="text-black">
                      <p>{slot.course}</p>
                      <p className="text-xs text-gray-600">Room: {slot.room || 'Main'}</p>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
