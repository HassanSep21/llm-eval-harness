import { useMemo } from 'react'

// Deterministic-enough random field of drifting/fading particles.
// Count kept modest (55) since these are decorative, not the focal point.
function makeStars(count) {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 1.6 + 0.6, // 0.6px - 2.2px
    opacity: Math.random() * 0.5 + 0.05,
    duration: Math.random() * 1 + 0.7,
    delay: Math.random() * -18, // negative delay staggers the loop on mount
    drift: Math.random() * 18 + 10, // px risen before fading out
  }))
}

export default function Starfield({ count = 250 }) {
  const stars = useMemo(() => makeStars(count), [count])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            '--star-op': s.opacity,
            '--star-drift': `${s.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
