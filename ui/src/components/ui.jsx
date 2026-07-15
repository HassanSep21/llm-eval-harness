import { useState } from 'react'

// Shared visual primitives for the eval harness UI.
// Every page composes these instead of hand-rolling Tailwind strings, so the
// glass/hairline/pill language stays consistent across screens.

export function PageHeader({ eyebrow, title, description, action, center = false }) {
  if (center) {
    return (
      <div className="flex flex-col items-center text-center mb-8">
        {eyebrow && (
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-mist/70 mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] leading-[1.15] text-ice">{title}</h1>
        {description && <p className="text-sm text-fog mt-1.5 max-w-md">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        {eyebrow && (
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-mist/70 mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] leading-[1.15] text-ice">{title}</h1>
        {description && <p className="text-sm text-fog mt-1.5 max-w-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-card bg-[rgba(186,214,247,0.035)] shadow-card ring-1 ring-[rgba(186,215,247,0.10)] p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function Button({ variant = 'ghost', className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    // Sole use of the chromatic accent — reserved for the primary submit action per screen
    primary: 'rounded-input bg-violet text-white px-6 py-2.5 hover:bg-[#5a30da]',
    ghost: 'rounded-btn bg-[rgba(186,214,247,0.06)] text-white ring-1 ring-[rgba(186,215,247,0.12)] px-4 py-2 hover:bg-[rgba(186,214,247,0.12)]',
    outline: 'rounded-btn bg-transparent text-frost ring-1 ring-[rgba(186,215,247,0.12)] px-4 py-2 hover:bg-[rgba(186,214,247,0.06)]',
    danger: 'rounded-btn bg-transparent text-ember/70 hover:text-ember hover:bg-[rgba(228,109,76,0.08)] px-3 py-1.5',
    dangerSolid: 'rounded-input bg-[rgba(228,109,76,0.14)] text-ember ring-1 ring-[rgba(228,109,76,0.4)] hover:bg-[rgba(228,109,76,0.22)] px-6 py-2.5',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge bg-[rgba(199,211,234,0.10)] text-mist text-xs font-medium px-2 py-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] ${className}`}
    >
      {children}
    </span>
  )
}

const STATUS_MAP = {
  pending: { label: 'Pending', dot: 'bg-fog', text: 'text-fog' },
  running: { label: 'Running', dot: 'bg-blueprint animate-pulse', text: 'text-blueprint' },
  completed: { label: 'Completed', dot: 'bg-blueprint', text: 'text-blueprint' },
  failed: { label: 'Failed', dot: 'bg-ember', text: 'text-ember' },
  improved: { label: 'Improved', dot: 'bg-blueprint', text: 'text-blueprint' },
  regressed: { label: 'Regressed', dot: 'bg-ember', text: 'text-ember' },
  mixed: { label: 'Mixed', dot: 'bg-mist', text: 'text-mist' },
  neutral: { label: 'Neutral', dot: 'bg-fog', text: 'text-fog' },
}

export function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-badge bg-[rgba(199,211,234,0.08)] px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-mist mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-fog mt-1.5">{hint}</p>}
    </div>
  )
}

const fieldClass =
  'w-full rounded-input bg-[rgba(199,211,234,0.06)] ring-1 ring-[rgba(186,215,247,0.12)] text-white placeholder:text-mist/40 text-sm px-3 py-2 outline-none transition-shadow focus:ring-[rgba(186,215,247,0.28)]'

export function TextInput(props) {
  return <input className={fieldClass} {...props} />
}

export function TextArea(props) {
  return <textarea className={fieldClass} {...props} />
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${fieldClass} appearance-none bg-[rgba(199,211,234,0.06)] ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ id, checked, onChange, label }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer select-none group">
      <span className="relative flex items-center justify-center h-4 w-4 shrink-0">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="h-4 w-4 rounded-[4px] ring-1 ring-[rgba(186,215,247,0.24)] bg-[rgba(199,211,234,0.06)] peer-checked:bg-violet peer-checked:ring-violet transition-colors" />
        <svg className="absolute h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm text-mist group-hover:text-frost transition-colors">{label}</span>
    </label>
  )
}

const CALLOUT_ICONS = {
  info: <path d="M8 7v4.5M8 5.2v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />,
  warning: <path d="M8 6v2.8M8 10.6v.01M7.1 2.9L1.6 12.4a1 1 0 00.87 1.5h11a1 1 0 00.87-1.5L8.9 2.9a1 1 0 00-1.74 0z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  error: <path d="M5.5 5.5l5 5m0-5l-5 5M8 14.5A6.5 6.5 0 108 1.5a6.5 6.5 0 000 13z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
}

export function Callout({ tone = 'info', children }) {
  const tones = {
    info: 'text-mist ring-[rgba(186,215,247,0.14)] bg-[rgba(186,214,247,0.05)]',
    warning: 'text-frost ring-[rgba(186,215,247,0.20)] bg-[rgba(186,214,247,0.07)]',
    error: 'text-ice ring-[rgba(228,109,76,0.3)] bg-[rgba(228,109,76,0.08)]',
  }
  return (
    <div className={`flex items-start gap-2 rounded-input px-3.5 py-2.5 text-sm ring-1 ${tones[tone]}`}>
      <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
        {CALLOUT_ICONS[tone]}
      </svg>
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ title, action }) {
  return (
    <div className="text-center py-14 rounded-card ring-1 ring-dashed ring-[rgba(186,215,247,0.16)]">
      <p className="text-fog mb-3 text-sm">{title}</p>
      {action}
    </div>
  )
}

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className} text-blueprint`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// One hero moment per page — a soft blurred halo behind the single card that
// matters most (verdict, calibration, the primary form). Not for every card;
// using it everywhere would cancel out the emphasis it's meant to create.
export function HeroCard({ children, className = '' }) {
  return (
    <div className="relative">
      <div
        className="absolute -inset-6 rounded-card blur-2xl opacity-70 -z-10"
        style={{ background: 'linear-gradient(180deg, rgba(182,217,252,0.16), rgba(238,186,247,0.08))' }}
      />
      <Card className={className}>{children}</Card>
    </div>
  )
}

// Gradient "hero number" treatment — the one place bg-skywash-style gradient
// text earns its keep, for the standout metric in a report card.
export function StatNumber({ children, className = '' }) {
  return (
    <span
      className={`font-display bg-gradient-to-b from-ice to-skyend bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-badge bg-[rgba(199,211,234,0.08)] ${className}`} />
}

export function SkeletonCard({ lines = 2 }) {
  return (
    <Card>
      <Skeleton className="h-3.5 w-1/3 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 mb-2 last:mb-0 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </Card>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,6,15,0.7)] backdrop-blur-sm px-4"
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        <HeroCard>
          <p className="font-display text-base text-frost mb-1.5">{title}</p>
          <p className="text-sm text-fog mb-5">{message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} autoFocus>Cancel</Button>
            <Button variant="dangerSolid" onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </HeroCard>
      </div>
    </div>
  )
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div className="relative">
      <input
        className={fieldClass}
        value={open ? query : (selected?.label || '')}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
      />
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-56 overflow-auto rounded-input bg-[#0a0c18] ring-1 ring-[rgba(186,215,247,0.16)] shadow-card py-1">
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-fog">No matches</p>}
          {filtered.map((o) => (
            <button
              type="button"
              key={o.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-[rgba(186,214,247,0.08)] ${
                o.value === value ? 'text-frost bg-[rgba(186,214,247,0.06)]' : 'text-mist'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
