/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    colors: {
      'white': '#ffffff',
      'blue': '#1fb6ff',
      'purple': '#7e5bef',
      'pink': '#ff49db',
      'orange': '#ff7849',
      'green': '#13ce66',
      'yellow': '#ffc82c',
      'gray-dark': '#273444',
      'gray': '#8492a6',
      'gray-light': '#d3dce6',
      'deep-charocal': '#2C2C2C',
      'black-russian' : '#1c1c20',
      'dark-silver' : '#766d72',
      'dark-pink': '#23162e',
      'plume': '#2e2b4d',
      'darker-plume': '#140919',
      'dark-plume': '#050205',
      'red': '#FF0000',
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    extend: {
      spacing: {
        '8xl': '96rem',
        '9xl': '128rem',
      },
      margin: {
        '200': '50rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      dropShadow: {
        'plume': '0 25px 25px rgba(46, 43, 77, 0.25)',
        'goldish': '0 25px 25px rgba(136, 89, 114, 0.10)',
      }
    }
  },
}

