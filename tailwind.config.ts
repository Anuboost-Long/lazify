import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        soft: "rgb(var(--color-bg-soft) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        accentHover: "rgb(var(--color-accent-hover) / <alpha-value>)",
        accentSoft: "var(--color-accent-soft)",
        border: "var(--color-border)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(6, 24, 16, 0.24)",
        glow: "0 0 0 1px rgba(16, 185, 129, 0.24), 0 20px 60px rgba(16, 185, 129, 0.18)"
      },
      borderRadius: {
        shell: "28px"
      },
      fontFamily: {
        display: ["Google Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        body: ["Google Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        mono: ["SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.08) 1px, transparent 1px)"
      },
      animation: {
        drift: "drift 14s ease-in-out infinite",
        fadeIn: "fadeIn 420ms ease-out forwards",
        pulseLine: "pulseLine 2.6s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translate3d(0, 12px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(12px, -16px, 0) scale(1.03)" }
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
