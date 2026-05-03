/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF2F2',
          100: '#FFE4E4',
          200: '#FFCECE',
          300: '#F4A4A4',
          400: '#E88585',
          500: '#D97878',
          600: '#C56060',
        },
      },
    },
  },
  plugins: [],
}
