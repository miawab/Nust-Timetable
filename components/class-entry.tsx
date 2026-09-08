import type { ClassSlot } from '@/lib/timetable/types'
import { faintClass, mutedClass } from '@/lib/ui'

/** Room to show for a slot, falling back to the old "Main" placeholder. */
export function displayRoom(slot: ClassSlot): string {
  const room = String(slot.room ?? '').trim()
  if (!room) return 'Main'
  if (/\bonline\b/i.test(room)) return 'Online'
  return room
}

/**
 * One class, with whatever the workbook knows about it.
 *
 * Course code, instructor and credit hours come from the Overall tab and are
 * missing for roughly one class in eight, so every line below the title is
 * conditional.
 */
export default function ClassEntry({ slot, compact = false }: { slot: ClassSlot; compact?: boolean }) {
  const details = [displayRoom(slot), slot.instructor].filter(Boolean).join(' · ')

  return (
    <div className="text-black dark:text-white">
      <p className={compact ? 'break-words whitespace-normal' : ''}>
        {slot.code ? (
          <span className={`mr-1 whitespace-nowrap text-xs ${faintClass}`}>{slot.code}</span>
        ) : null}
        {slot.course}
        {slot.kind === 'lab' && !/\blab\b/i.test(slot.course) ? (
          <span className={`ml-1 text-xs ${faintClass}`}>(Lab)</span>
        ) : null}
      </p>

      <p className={`text-xs ${mutedClass}`}>{details}</p>

      {slot.labEngineer && slot.kind === 'lab' ? (
        <p className={`text-xs ${faintClass}`}>Lab engineer: {slot.labEngineer}</p>
      ) : null}

      {slot.note ? <p className={`text-xs ${faintClass}`}>{slot.note}</p> : null}
    </div>
  )
}
