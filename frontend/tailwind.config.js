/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#006747',
          accent: '#f3b022'
        }
      }
    }
  },
  plugins: []
}
