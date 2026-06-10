/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608dfa",
          500: "#3b66f6",
          600: "#2547eb",
          700: "#1d35d8",
          800: "#1e2daf",
          900: "#1e2b8a",
          950: "#171d54"
        },
        surface: {
          light: "#ffffff",
          dark: "#15171c"
        },
        canvas: {
          light: "#f4f5f7",
          dark: "#0b0d10"
        }
      }
    }
  },
  plugins: []
};
