import { useEffect } from 'react'
import { FiGithub, FiMoon, FiSun } from 'react-icons/fi'
import { NavLink, Outlet } from 'react-router'
import { useTheme } from '../hooks/useTheme'
import { PrivacyNote } from './PrivacyNote'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/images', label: 'Images', end: false },
  { to: '/pdf', label: 'PDF', end: false },
  { to: '/data', label: 'Data', end: false },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return `btn btn-ghost btn-sm ${isActive ? 'btn-active' : ''}`
}

export function Layout() {
  const { theme, toggle } = useTheme()
  const year = new Date().getFullYear()

  useEffect(() => {
    const prevent = (event: DragEvent) => {
      const types = event.dataTransfer ? [...event.dataTransfer.types] : []
      if (types.includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:btn focus:btn-primary focus:btn-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-base-300/80 bg-base-100/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" end className="flex items-center gap-2">
            <Mark />
            <span className="font-display text-xl leading-none tracking-tight sm:text-2xl">
              Dave's <span className="text-primary">File</span> Converter
            </span>
          </NavLink>
          <div className="flex items-center justify-between gap-2">
            <nav aria-label="Primary" className="flex flex-wrap gap-1">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-pressed={theme === 'ink'}
              aria-label={theme === 'ink' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggle}
            >
              {theme === 'ink' ? <FiSun aria-hidden="true" className="size-4" /> : <FiMoon aria-hidden="true" className="size-4" />}
            </button>
          </div>
        </div>
      </header>
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <Outlet />
      </main>
      <footer className="border-t border-base-300/80 bg-base-100/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Created by{' '}
            <a
              className="link link-hover text-primary"
              href="https://www.linkedin.com/in/daydin14/"
              target="_blank"
              rel="noreferrer noopener"
            >
              David Aydin
            </a>{' '}
            © {year}
          </p>
          <PrivacyNote compact />
          <a
            className="link link-hover inline-flex items-center gap-1"
            href="https://github.com/daydin14/file-converter"
            target="_blank"
            rel="noreferrer noopener"
          >
            <FiGithub aria-hidden="true" />
            Source
          </a>
        </div>
      </footer>
    </div>
  )
}

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 text-primary">
      <rect x="5" y="6" width="16" height="20" rx="3" fill="currentColor" opacity="0.25" />
      <rect x="11" y="4" width="16" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 11h6M16 15h6M16 19h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
