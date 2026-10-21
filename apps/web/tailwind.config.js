/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false }, // theme.css (the original stylesheet) owns the base styles
  theme: { extend: {} },
  plugins: [],
};
