/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        twitter: {
          bg: "#0f1419",
          card: "#16181c",
          border: "#2f3336",
          secondary: "#1e2126",
          hover: "#2a2d32",
          text: "#e7e9ea",
          muted: "#71767b",
          primary: "#1d9bf0",
          "primary-hover": "#1a8cd8",
          hot: "#f91880",
          success: "#00ba7c",
          danger: "#ef4444",
          warning: "#ffd400",
        },
      },
    },
  },
  plugins: [],
};
