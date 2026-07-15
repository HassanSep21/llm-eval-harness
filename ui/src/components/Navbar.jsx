import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/datasets', label: 'Datasets' },
  { to: '/runs/new', label: 'New Run' },
  { to: '/regression', label: 'Regression' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[rgba(5,6,15,0.75)] ring-1 ring-[rgba(186,215,247,0.10)]">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
        <span className="font-display text-[17px] text-ice tracking-tight">
          LLM Eval<span className="text-blueprint"> Harness</span>
        </span>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative px-3.5 py-2 rounded-btn text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-[rgba(186,214,247,0.09)] ring-1 ring-[rgba(186,215,247,0.14)]'
                    : 'text-mist hover:text-white hover:bg-[rgba(186,214,247,0.05)]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-btn ring-1 ring-[rgba(186,215,247,0.14)] text-frost"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {open ? (
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="md:hidden flex flex-col gap-1 px-6 pb-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-3.5 py-2.5 rounded-input text-sm font-medium ${
                  isActive ? 'text-white bg-[rgba(186,214,247,0.09)]' : 'text-mist hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
