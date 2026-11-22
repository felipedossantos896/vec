/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/**/*.html', './frontend/**/*.js', './frontend/src/**/*.ts', '!./frontend/admin/vendor/**'],
  theme: {
    extend: {
      colors: {
        'vec-navy': 'var(--navy)',
        'vec-cream': 'var(--cream)',
        'vec-page': 'var(--page)',
        'vec-ink': 'var(--ink)'
      },
      fontFamily: {
        sans: ["'Instrument Sans'", '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
