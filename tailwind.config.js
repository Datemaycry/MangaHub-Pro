/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            theme: {
                100: 'rgba(var(--theme-100), <alpha-value>)', 200: 'rgba(var(--theme-200), <alpha-value>)',
                300: 'rgba(var(--theme-300), <alpha-value>)', 400: 'rgba(var(--theme-400), <alpha-value>)',
                500: 'rgba(var(--theme-500), <alpha-value>)', 600: 'rgba(var(--theme-600), <alpha-value>)',
                800: 'rgba(var(--theme-800), <alpha-value>)', 900: 'rgba(var(--theme-900), <alpha-value>)',
                950: 'rgba(var(--theme-950), <alpha-value>)'
            }
        }
    }
  },
  plugins: [],
}