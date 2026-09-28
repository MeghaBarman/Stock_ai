/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef9f4',
          100: '#d5f0e5',
          400: '#34c77b',
          500: '#22a865',
          600: '#178a50',
          900: '#0a3d25',
        }
      }
    },
  },
  plugins: [],
}
