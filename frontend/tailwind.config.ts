import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#FF6B6B',
          light: '#FFE0DC',
          dark: '#E55555',
        },
        surface: {
          DEFAULT: '#FAFAFA',
          dark: '#1A1A1A',
        },
        border: {
          DEFAULT: '#E8E8E8',
          dark: '#333333',
        },
        success: '#4CAF82',
        warning: '#F5A623',
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        sans: ['Sora', 'sans-serif'],
      },
      animation: {
        'pulse-coral': 'pulse-coral 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-coral': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
