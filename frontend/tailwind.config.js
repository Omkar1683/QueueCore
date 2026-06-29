/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff', 100: '#dbe4ff', 200: '#bac8ff', 300: '#91a7ff',
          400: '#748ffc', 500: '#5c7cfa', 600: '#4c6ef5', 700: '#4263eb',
          800: '#3b5bdb', 900: '#364fc7',
        },
        dark: {
          900: '#0a0a0f', 800: '#111118', 750: '#15151e', 700: '#1a1a27',
          600: '#22223a', 500: '#2d2d4a', 400: '#3d3d5c', 300: '#525270',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { transform: 'translateX(-10px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
