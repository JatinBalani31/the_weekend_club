import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // "Night Run" palette. Semantic names only - never use raw hex in components.
      colors: {
        bg: "#0A0A0B",
        surface: "#161618",
        "surface-hover": "#1F1F23",
        border: "#2A2A2F",
        accent: "#C6F432",
        "accent-hover": "#B2E01C",
        text: "#FAFAFA",
        "text-muted": "#A1A1AA",
        success: "#22C55E",
        error: "#EF4444",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
