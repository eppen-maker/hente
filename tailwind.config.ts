import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0F1B2D",
          50: "#F4F6F9",
          100: "#E4E9F0",
          200: "#C6D0DE",
          300: "#9AA9C0",
          400: "#6B7E9B",
          500: "#48597A",
          600: "#31415E",
          700: "#1F2E48",
          800: "#152034",
          900: "#0F1B2D",
        },
        sand: {
          DEFAULT: "#FAF9F6",
          100: "#FDFCFA",
          200: "#F4F2ED",
          300: "#E8E5DD",
        },
        accent: "#1F6F5C",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.045em" },
      borderRadius: { xs: "2px" },
    },
  },
  plugins: [],
};

export default config;
