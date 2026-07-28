/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12201B',
          2: '#1A2C24',
          3: '#223830',
        },
        ticket: {
          DEFAULT: '#F4EEDF',
          2: '#E9E0C9',
          line: '#D9CDA9',
        },
        signal: {
          DEFAULT: '#3FC7B8',
          dark: '#1D8478',
        },
        marigold: {
          DEFAULT: '#FFC24B',
          dark: '#8A6106',
        },
        graphite: '#8FA096',
      },
      fontFamily: {
        space: ['"Space Grotesk"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
