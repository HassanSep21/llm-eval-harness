import { NavLink } from 'react-router-dom'

const links = [
  { to: '/datasets', label: 'Datasets' },
  { to: '/runs/new', label: 'New Run' },
  { to: '/regression', label: 'Regression' },
]

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="font-semibold text-gray-800">LLM Eval Harness</span>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
