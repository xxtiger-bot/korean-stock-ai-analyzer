import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        surface: "#ffffff",
        line: "#dfe6ee",
        "dark-surface": "#111827",
        "dark-panel": "#182235",
        "dark-line": "#2a364a",
        brand: "#1769ff",
        mint: "#10b981",
        danger: "#e23b3b",
        down: "#2563eb"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
