/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f0f0f",
          secondary: "#161616",
          tertiary: "#1e1e1e",
          elevated: "#242424",
        },
        border: {
          subtle: "#1e1e1e",
          default: "#2a2a2a",
          strong: "#3a3a3a",
        },
        accent: {
          DEFAULT: "#f97316",
          hover: "#ea6c0a",
          subtle: "#1a0f00",
        },
        step: {
          whisper: "#a78bfa",
          llm: "#f97316",
          pdf: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "16px",
      },
      animation: {
        "pulse-slow": "pulse 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "fade-up": "fade-up 0.25s ease",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
