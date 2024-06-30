/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'
import daisyui from 'daisyui'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arealRNIDS: ['"Ubuntu"', 'sans-serif']
      }
    }
  },
  plugins: [typography, daisyui],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#30bb73',
          secondary: '#a9dac0',
          accent: '#46c380',
          neutral: '#252727',
          'base-100': '#e0e1e1',

          '--rounded-box': '1.5rem',
          '--rounded-btn': '1rem',
          '--rounded-badge': '2rem'
        },
        dark: {
          primary: '#44cf87',
          secondary: '#25563c',
          accent: '#3cb976',
          neutral: '#252727',
          'base-100': '#1e1f1f',

          '--rounded-box': '1.5rem',
          '--rounded-btn': '1rem',
          '--rounded-badge': '2rem'
        }
      }
    ]
  }
}
