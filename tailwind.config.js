/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Monochrome "ink" scale — the Kagu brand is black/white/gray like the
        // origami-bird logo. Keep in sync with lib/theme.ts.
        ink: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#0b0b0d"
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
