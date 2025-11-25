/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00ffcc',
        'neon-pink': '#ff00de',
        'neon-purple': '#6a00ff',
        'dark-bg': '#0a0a0a',
        'panel-bg': 'rgba(0, 0, 0, 0.85)',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}
