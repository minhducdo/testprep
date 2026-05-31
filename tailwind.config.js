/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './exam.html'],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#faf5f0',
          100: '#f0e6da',
          200: '#e8d5c4',
          300: '#c5a46e',
          400: '#b08a4a',
          500: '#8b6f6a',
          600: '#722f37',
          700: '#5a2530',
          800: '#2c2528',
          900: '#1f1a1d',
          950: '#181315',
        },
      },
    },
  },
  plugins: [],
}
