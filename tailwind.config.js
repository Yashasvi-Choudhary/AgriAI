/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./templates/**/*.html", "./static/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(15 61 46)",
        primaryLight: "rgb(26 92 68)",
        primaryDark: "rgb(10 42 30)",

        accent: "rgb(184 150 46)",
        accentLight: "rgb(212 175 55)",

        background: "rgb(245 247 243)",
        backgroundDark: "rgb(232 237 228)",

        textDark: "rgb(13 31 23)",
        textMid: "rgb(58 82 70)",
        textLight: "rgb(122 154 136)",
      },

      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        heading: ["Syne", "sans-serif"], // for headings

        display: ["Playfair Display", "serif"],
      },

      boxShadow: {
        "card-hover": "0 12px 48px rgba(15,61,46,0.18)",
      },

      animation: {
        "fade-up": "fadeUp 0.8s ease forwards",
        "fade-in": "fadeIn 0.3s ease",
        "slide-up": "slideUp 0.4s cubic-bezier(.22,.68,0,1.2)",
        "fade-in-up": "fadeInUp 0.5s ease both",
      },

      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
