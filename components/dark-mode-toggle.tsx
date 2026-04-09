'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm"
      >
        Toggle
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  )
}
