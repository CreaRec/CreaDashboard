/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{tsx,ts}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8f9fa',
          border: '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
};
