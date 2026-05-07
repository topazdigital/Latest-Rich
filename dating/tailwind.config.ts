import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff0f3',
          100: '#ffe0e6',
          200: '#ffc0cc',
          300: '#ff91a5',
          400: '#ff5270',
          500: '#ff1a3e',
          600: '#ed0030',
          700: '#c8002a',
          800: '#a50028',
          900: '#880027',
          950: '#4d0011',
          DEFAULT: '#FF192C',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-heart': 'pulseHeart 0.6s ease-in-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        pulseHeart: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.3)' } },
        bounceIn: { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
