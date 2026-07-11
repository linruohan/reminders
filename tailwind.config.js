/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apple-blue': '#007AFF',
        'apple-blue-hover': '#0066CC',
        'apple-red': '#FF3B30',
        'apple-orange': '#FF9500',
        'apple-yellow': '#FFCC00',
        'apple-green': '#4CD964',
        'apple-purple': '#5856D6',
        'apple-pink': '#FF2D55',
        'apple-teal': '#5AC8FA',
        'apple-gray': '#8E8E93',
        'apple-gray-light': '#F2F2F7',
        'apple-gray-dark': '#C7C7CC',
        'apple-gray-darker': '#636366',
        'apple-divider': '#0000000D',
        'apple-bg': '#F5F5F7',
        'apple-card': '#FFFFFF',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        'apple': '12px',
        'apple-sm': '8px',
        'apple-md': '10px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        'apple-2xl': '24px',
        'apple-full': '9999px',
      },
      boxShadow: {
        'apple': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'apple-xl': '0 12px 48px rgba(0, 0, 0, 0.16)',
        'apple-glow': '0 0 20px rgba(0, 122, 255, 0.25)',
        'apple-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        'float-slow': 'floatSlow 16s ease-in-out infinite',
        'float-medium': 'floatMedium 20s ease-in-out infinite',
        'float-fast': 'floatFast 14s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(2%, -2%) scale(1.02)' },
          '66%': { transform: 'translate(-2%, 2%) scale(0.98)' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-1.5%, 1.5%) scale(1.01)' },
          '66%': { transform: 'translate(1.5%, -1.5%) scale(0.99)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(1%, 1%)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
