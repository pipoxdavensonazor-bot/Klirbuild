/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        /* Drapeau + mer Caraïbe — pas d’orange Amazon */
        brand: {
          DEFAULT: '#00209F',
          dark: '#00145C',
          mid: '#1A3AAD',
          50: '#E9EEF8',
        },
        accent: {
          DEFAULT: '#E8B923',
          hover: '#D4A017',
          50: '#FBF6E3',
        },
        haiti: {
          blue: '#00209F',
          red: '#D21034',
          mist: '#E6F0F2',
          sand: '#F5F0E6',
          sea: '#0A7A8C',
          palm: '#1F7A4D',
        },
      },
    },
  },
  plugins: [],
};
