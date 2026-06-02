/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vestr brand colors
        vestr: {
          bg:       "#0a0a0f",
          card:     "#12121a",
          border:   "#1e1e2e",
          accent:   "#6366f1",
          green:    "#22c55e",
          red:      "#ef4444",
          yellow:   "#eab308",
          text:     "#e2e8f0",
          muted:    "#64748b",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}