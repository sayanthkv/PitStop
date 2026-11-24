/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        carbon: {
          950: '#09090b',
          900: '#121215',
          850: '#18181c',
          800: '#222227',
          700: '#2e2e36',
          600: '#3f3f4a',
        },
        cluster: {
          amber: '#f59e0b',
          orange: '#ea580c',
          glow: '#fbbf24',
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'JetBrains Mono', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
