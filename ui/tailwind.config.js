/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#05060f',
        steel: '#2f343e',
        fog: '#9da7ba',      // muted/helper text
        mist: '#c7d3ea',     // secondary labels
        frost: '#d1e4fa',    // primary text
        ice: '#d8ecf8',      // headline top of gradient
        skyend: '#98c0ef',   // headline bottom of gradient
        violet: '#663af3',   // sole chromatic accent — primary submit actions only
        blueprint: '#b6d9fc',// reused as the "positive" signal (improved / passed)
        ember: '#e46d4c',    // reused as the "negative" signal (failed / regressed / destructive)
        gridline: '#3f4959',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        badge: '6px',
        input: '6px',
        modal: '16px',
        btn: '999px',
        icon: '9999px',
      },
      boxShadow: {
        card: 'inset 0 1px 1px rgba(199,211,234,0.12), inset 0 24px 48px rgba(199,211,234,0.05), 0 24px 32px rgba(6,6,14,0.55)',
        modal: 'inset 0 1px 1px rgba(216,236,248,0.2), inset 0 24px 48px rgba(168,216,245,0.06), 0 16px 32px rgba(0,0,0,0.3)',
        glow: '0 0 6px rgba(186,207,247,0.32), 0 0 12px rgba(238,186,247,0.24)',
      },
      backgroundImage: {
        skywash: 'linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%)',
      },
    },
  },
  plugins: [],
}
