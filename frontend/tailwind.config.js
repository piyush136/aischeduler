/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#09090f',
          900: '#11111b',
          850: '#171726',
          800: '#1b1b2d',
          700: '#2b2b45',
        },
        mist: {
          50: '#fcfcff',
          100: '#f7f7fb',
          200: '#ececf5',
          300: '#d7d7e6',
        },
        aurora: {
          50: '#f3f6ff',
          100: '#e8edff',
          200: '#d3ddff',
          300: '#b3c3ff',
          400: '#8399ff',
          500: '#5f78f6',
          600: '#4860db',
          700: '#394db1',
          800: '#32428e',
          900: '#2c396f',
        },
        primary: {
          50: '#eefbf9',
          100: '#d5f4ef',
          200: '#aee8de',
          300: '#79d6c8',
          400: '#43bbaa',
          500: '#259688',
          600: '#1d786f',
          700: '#1b605a',
          800: '#1a4d49',
          900: '#193f3c',
        },
        rosefire: {
          100: '#f8eee3',
          300: '#e5c49c',
          500: '#c9965f',
          700: '#93663d',
        }
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'float': 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.8s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(95, 120, 246, 0)' },
          '50%': { boxShadow: '0 0 32px rgba(95, 120, 246, 0.22)' },
        }
      }
    },
  },
  plugins: [],
}
