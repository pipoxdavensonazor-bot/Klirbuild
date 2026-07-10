/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/core/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Executive ink — chic navy for construction SaaS */
        brand: {
          DEFAULT: "#1A365D",
          50: "#F2F5F9",
          100: "#E2E8F0",
          200: "#C5D0E0",
          300: "#8FA3BF",
          400: "#5A7599",
          500: "#1A365D",
          600: "#132A4A",
          700: "#0F2744",
          800: "#0A1C31",
          900: "#06101C",
          950: "#040B14",
        },
        /* Champagne brass — refined accent (not flashy gold) */
        accent: {
          DEFAULT: "#C4A574",
          50: "#F9F6F0",
          100: "#F1E9DB",
          200: "#E4D4B8",
          300: "#D4BC94",
          500: "#C4A574",
          600: "#A88955",
          700: "#8A6E42",
        },
        /* Footer / ink surfaces — distinct from page body */
        ink: {
          DEFAULT: "#0B1520",
          soft: "#122033",
          muted: "#8BA0B5",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Segoe UI", "sans-serif"],
        display: ["var(--font-geist-sans)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 39, 68, 0.04), 0 10px 28px rgba(15, 39, 68, 0.07)",
      },
    },
  },
  plugins: [],
};
