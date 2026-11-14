/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/**/*.html', './frontend/**/*.js', './frontend/src/**/*.ts'],
  theme: {
    extend: {
      colors: {
        'vec-navy': '#1a2340',
        'vec-cream': '#fdf8f0',
        'vec-page': '#f4efe4',
        'vec-ink': '#1a2340'
      },
      fontFamily: {
        sans: ["'Source Sans 3'", '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
