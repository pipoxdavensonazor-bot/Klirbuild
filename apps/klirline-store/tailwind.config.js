/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#004F6E',
          dark: '#0A1C31',
          mid: '#1A365D',
          50: '#F2F7FA',
        },
        accent: {
          DEFAULT: '#D4AF37',
          hover: '#C4A574',
          50: '#F9F6F0',
        },
      },
    },
  },
  plugins: [],
};
