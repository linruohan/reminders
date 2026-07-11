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
        'apple-red': '#FF3B30',
        'apple-orange': '#FF9500',
        'apple-yellow': '#FFCC00',
        'apple-green': '#4CD964',
        'apple-purple': '#5856D6',
        'apple-pink': '#FF2D55',
        'apple-gray': '#8E8E93',
        'apple-gray-light': '#F2F2F7',
        'apple-gray-dark': '#C7C7CC',
        'apple-divider': '#0000000D',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'apple': '12px',
        'apple-sm': '8px',
        'apple-md': '10px',
        'apple-lg': '16px',
      },
      boxShadow: {
        'apple': '0 4px 20px rgba(0, 0, 0, 0.1)',
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}