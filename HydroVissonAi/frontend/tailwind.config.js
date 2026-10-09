/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'govt-navy': '#12355B',
        'govt-blue': '#1F4E79',
        'govt-light': '#F4F6F8',
        'govt-dark': '#1F2933',
        'govt-border': '#D9DEE5',
        'govt-green': '#2E7D32',
        'govt-amber': '#C98A00',
        'govt-red': '#B3261E',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'Source Sans 3', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
