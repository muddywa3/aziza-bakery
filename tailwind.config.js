/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d35400',
        secondary: '#e67e22',
        cream: '#f8f0e3',
      }
    },
  },
  plugins: [],
}
