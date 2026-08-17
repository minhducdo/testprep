/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './exam.html'],
  theme: {
    extend: {
      colors: {
        // Aurelier palette (light editorial)
        wine: {
          50:  '#F7F3EC',
          100: '#EFE8DD',
          200: '#E4D9C9',
          300: '#B08D57', // muted gold — accents, "Pass" grade, labels
          400: '#9A7742',
          500: '#7A2E39', // mid oxblood — focus rings
          600: '#4A1F26', // primary oxblood
          700: '#3A171D',
          800: '#2A2320', // charcoal text
          900: '#1A1A1A',
          950: '#141210',
        },
      },
    },
  },
  plugins: [],
}
