/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        rounded: ['"Baloo 2"', "system-ui", "sans-serif"]
      },
      colors: {
        bingo: {
          blue: "rgb(var(--color-bingo-blue) / <alpha-value>)",
          mint: "rgb(var(--color-bingo-mint) / <alpha-value>)",
          yellow: "rgb(var(--color-bingo-yellow) / <alpha-value>)",
          lavender: "rgb(var(--color-bingo-lavender) / <alpha-value>)",
          coral: "rgb(var(--color-bingo-coral) / <alpha-value>)",
          navy: "rgb(var(--color-bingo-navy) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "var(--shadow-soft)"
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.5rem"
      }
    }
  },
  plugins: []
};

