/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          hover: '#115E59',
        },
        secondary: {
          DEFAULT: '#14B8A6',
          hover: '#0D9488',
        },
        background: '#FAF8FF',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: {
          primary: '#0B1C30',
          secondary: '#64748B',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        'button': '8px',
        'card': '16px',
        'modal': '24px',
      }
    },
  },
  plugins: [],
}
