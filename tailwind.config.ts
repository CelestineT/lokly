import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette Lokly
        blue: {
          DEFAULT: '#1500C8',
          50:  '#EEF0FF',
          100: '#DDE3FF',
          200: '#B8C0FF',
          300: '#8F9EFF',
          400: '#5A6BFF',
          500: '#2E3BFF',
          600: '#1500C8',
          700: '#1000A0',
          800: '#0B0078',
          900: '#060050',
        },
        green: {
          DEFAULT: '#10B981',
          50:  '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
