/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/**/*.html', './frontend/**/*.js', './frontend/src/**/*.ts'],
  theme: {
    extend: {
      colors: {
        'vec-navy': 'var(--navy)',
        'vec-cream': 'var(--cream)',
        'vec-page': 'var(--page)',
        'vec-ink': 'var(--ink)'
      },
      fontFamily: {
        sans: ["'Source Sans 3'", '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
