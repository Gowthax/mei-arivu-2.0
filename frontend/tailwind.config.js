/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Core backgrounds
          dark: '#050f0e',   // deepest background
          deeper: '#073B3A',   // mid-night green
          light: '#f2faf5',   // off-white (text on dark)
          mist: '#0B6E4F',   // sherlock green surface
          // Text
          ink: '#f2faf5',   // bright text
          mid: '#7aafa4',   // muted green-grey
          subtle: '#2e5954',   // faint decorative
          // Accent — user palette
          emerald: '#08A045',   // pigment green — primary
          deep: '#054d26',   // dark accent
          light2: '#6BBF59',   // mantis highlight
          bright: '#21D375',   // emerald bright
          acid: '#6BBF59',   // alias for highlight
          // Semantic
          danger: '#ef4444',
          warn: '#f59e0b',
          info: '#06b6d4',
        }
      },
      fontFamily: {
        // Display/heading: elegant high-contrast modern serif matches Mafgin
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        // Body/data: luxury clean geometric sans
        body: ['"Outfit"', '-apple-system', 'sans-serif'],
        // Alias
        mono: ['"Outfit"', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slam-in': 'slamIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'wipe-right': 'wipeRight 0.5s ease forwards',
        'cinema-fade': 'cinemaFade 0.8s ease forwards',
        'counter-up': 'counterUp 0.4s ease forwards',
        'march': 'march 1.2s linear infinite',
      },
      keyframes: {
        slamIn: {
          '0%': { opacity: '0', transform: 'translateY(40px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        wipeRight: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        cinemaFade: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        counterUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        march: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
      },
      boxShadow: {
        'emerald-glow': '0 0 30px rgba(16, 185, 129, 0.25)',
        'emerald-sm': '0 0 12px rgba(16, 185, 129, 0.15)',
        'brutal': '4px 4px 0px #10b981',
        'brutal-lg': '8px 8px 0px #10b981',
        'brutal-dark': '4px 4px 0px #064e3b',
      },
    },
  },
  plugins: [],
}
