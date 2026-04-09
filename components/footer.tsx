import Link from 'next/link'
import { Github, Linkedin, Instagram } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-300 bg-white dark:border-gray-700 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-6">
          <span className="text-sm text-gray-600 dark:text-gray-300">Made by Ibrahim Awab</span>
          <div className="flex gap-4">
            <Link
              href="https://www.linkedin.com/in/ibrahim-awab-743a2a325/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
            >
              <Linkedin size={18} />
            </Link>
            <Link
              href="https://www.instagram.com/miawab/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
            >
              <Instagram size={18} />
            </Link>
            <Link
              href="https://github.com/miawab"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
            >
              <Github size={18} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
