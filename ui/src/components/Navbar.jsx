import { NavLink } from 'react-router-dom'

const links = [
  { to: '/datasets', label: 'Datasets' },
  { to: '/runs/new', label: 'New Run' },
  { to: '/regression', label: 'Regression' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[rgba(5,6,15,0.75)] ring-1 ring-[rgba(186,215,247,0.10)]">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center h-16 gap-8">
        <span className="font-display text-[17px] text-ice tracking-tight">
          LLM Eval<span className="text-blueprint"> Harness</span>
        </span>

        <nav className="flex items-center gap-1">
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
      </div>
    </header>
  )
}
