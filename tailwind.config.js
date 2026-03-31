/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,js,ts,html}'],
  theme: {
    extend: {
      colors: {
        app:      'rgb(var(--color-app)      / <alpha-value>)',
        app2:     'rgb(var(--color-app2)     / <alpha-value>)',
        surface:  'rgb(var(--color-surface)  / <alpha-value>)',
        surface2: 'rgb(var(--color-surface2) / <alpha-value>)',
        accent:   'rgb(var(--color-accent)   / <alpha-value>)',
        accent2:  'rgb(var(--color-accent2)  / <alpha-value>)',
        accent3:  'rgb(var(--color-accent3)  / <alpha-value>)',
        fg:       'rgb(var(--color-fg)       / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:      '0 0 20px rgba(108,99,255,0.3)',
        'glow-sm': '0 0 10px rgba(108,99,255,0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
