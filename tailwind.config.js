/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        emerald: {
          950: "#2d6a4f",
        },
      },
      fontFamily: {
        manrope: ["Manrope", "Inter", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        "round-eight": "8px",
      },
    },
  },
  plugins: [],
};
