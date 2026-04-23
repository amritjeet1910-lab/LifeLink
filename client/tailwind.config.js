/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#e11d48", // Rose 600
        secondary: "#4f46e5", // Indigo 600
        dark: "#0f172a", // Slate 900
      }
    },
  },
  plugins: [],
}
