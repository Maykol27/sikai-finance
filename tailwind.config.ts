import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#1a88ff", // Sikai Blue
          cyan: "#26d8c4", // Sikai Cyan
          foreground: "#ffffff",
          glow: "rgba(26, 136, 255, 0.5)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
      },
      fontFamily: {
        headline: ["var(--font-poppins)"],
        body: ["var(--font-pt-sans)"],
        mono: ["var(--font-source-code-pro)"],
      },
      boxShadow: {
        'neon': '0 0 5px theme("colors.primary.DEFAULT"), 0 0 20px theme("colors.primary.glow")',
        'neon-cyan': '0 0 5px theme("colors.primary.cyan"), 0 0 20px rgba(38, 216, 196, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'tech-grid': "linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
};
export default config;
