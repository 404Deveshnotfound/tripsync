/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#1a090a',
          100: '#2d1012',
          200: '#4b080b',
          300: '#6c1b1f',
          400: '#9d1117',
          500: '#d42a2f',
          600: '#e18a8a',
          700: '#d8c49d',
          800: '#f2eee5',
          900: '#faf8f4',
        },
        ts: {
          black: '#050505',
          'black-2': '#0a0a0b',
          panel: '#101011',
          'panel-2': '#151516',
          line: '#272526',
          'line-soft': '#1d1b1c',
          red: '#9d1117',
          'red-bright': '#d42a2f',
          gold: '#d8c49d',
          cream: '#f2eee5',
          muted: '#9c9791',
          green: '#a8c49b',
          danger: '#e18a8a',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
