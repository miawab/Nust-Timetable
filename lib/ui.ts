/**
 * Shared Tailwind class strings.
 *
 * The site's look is deliberately plain -- square borders, no radius, black on
 * white and white on black. Keeping the strings here stops each new view from
 * drifting into its own slightly different shade of grey.
 */

export const selectClass =
  'w-full border border-gray-300 bg-white px-4 py-2 text-black focus:border-black focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white dark:disabled:bg-gray-900 dark:disabled:text-gray-500'

export const inputClass = selectClass

export const labelClass = 'mb-2 block text-sm font-medium text-black dark:text-white'

export const panelClass = 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-black'

export const mutedClass = 'text-gray-600 dark:text-gray-300'

export const faintClass = 'text-gray-500 dark:text-gray-400'

export function tabClass(active: boolean): string {
  const base = 'h-10 min-w-40 border px-4 text-sm transition-all'
  return active
    ? `${base} border-black font-semibold shadow-[inset_0_-2px_0_0_black] dark:border-white dark:shadow-[inset_0_-2px_0_0_white]`
    : `${base} border-gray-300 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900`
}
