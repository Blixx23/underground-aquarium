import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: "#020b18",
          900: "#041525",
          800: "#072236",
          700: "#0a3352",
          600: "#0e4a76",
          500: "#1264a0",
          400: "#1a82cc",
          300: "#3aa3e8",
          200: "#7dc4f0",
          100: "#c2e4fa",
          50:  "#edf7fe",
        },
        brine: {
          900: "#0d1f1a",
          800: "#1a3d32",
          700: "#235043",
          600: "#2e6857",
          500: "#3a836e",
          400: "#4da08a",
          300: "#6bbda7",
          200: "#99d4c4",
          100: "#cceae3",
        },
        coral: {
          500: "#ff6b47",
          400: "#ff8a6b",
          300: "#ffaa91",
        },
        sand: {
          900: "#1a1510",
          800: "#2e2518",
          700: "#4a3d28",
          200: "#d4c4a0",
          100: "#ece4d0",
          50:  "#faf7f0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      backgroundImage: {
        "ocean-gradient": "linear-gradient(135deg, #020b18 0%, #041525 40%, #072236 100%)",
        "brine-gradient": "linear-gradient(135deg, #041525 0%, #0a3352 100%)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
        "bubble": "bubble 4s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bubble: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.6" },
          "50%": { transform: "translateY(-20px) scale(1.05)", opacity: "0.9" },
          "100%": { transform: "translateY(-40px) scale(0.8)", opacity: "0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(26,130,204,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(26,130,204,0.6)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
