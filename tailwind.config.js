/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Charter", "Georgia", "Times New Roman", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "sans-serif",
        ],
      },
      colors: {
        komment: {
          bg: "#ffffff",
          text: "#1a1a1a",
          muted: "#888888",
          light: "#aaaaaa",
          border: "#f2f2f2",
          hover: "#fafafa",
        },
        platform: {
          instagram: "#C13584",
          x: "#1DA1F2",
          reddit: "#FF4500",
          tiktok: "#000000",
          linkedin: "#0A66C2",
          youtube: "#FF0000",
        },
      },
    },
  },
  plugins: [],
};
