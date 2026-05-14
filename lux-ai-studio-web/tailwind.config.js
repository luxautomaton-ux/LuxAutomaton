/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Primary */
        "primary-container": "#ff6b00",
        "primary": "#ffb693",
        "on-primary": "#561f00",
        "on-primary-container": "#572000",
        "primary-fixed": "#ffdbcc",
        "primary-fixed-dim": "#ffb693",
        
        /* Secondary */
        "secondary": "#4edea3",
        "secondary-container": "#00a572",
        "on-secondary": "#003824",
        "on-secondary-container": "#00311f",
        "on-secondary-fixed": "#002113",
        "on-secondary-fixed-variant": "#005236",
        "secondary-fixed": "#6ffbbe",
        "secondary-fixed-dim": "#4edea3",
        
        /* Tertiary */
        "tertiary": "#b7c8e1",
        "tertiary-container": "#8a9ab2",
        "on-tertiary": "#213145",
        "on-tertiary-container": "#223246",
        "tertiary-fixed": "#d3e4fe",
        "tertiary-fixed-dim": "#b7c8e1",
        "on-tertiary-fixed": "#0b1c30",
        "on-tertiary-fixed-variant": "#38485d",
        
        /* Error */
        "error": "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        
        /* Surface */
        "surface-dim": "#1d100a",
        "surface": "#1d100a",
        "surface-container": "#2b1c16",
        "surface-container-low": "#261812",
        "surface-container-lowest": "#170b06",
        "surface-container-high": "#362720",
        "surface-container-highest": "#41312a",
        "surface-bright": "#46362e",
        
        /* On Surface */
        "on-surface": "#f8ddd2",
        "on-surface-variant": "#e2bfb0",
        "on-background": "#f8ddd2",
        
        /* Inverse */
        "inverse-surface": "#f8ddd2",
        "inverse-on-surface": "#3d2d26",
        "inverse-primary": "#a04100",
        
        /* Outline */
        "outline": "#a98a7d",
        "outline-variant": "#5a4136",
      },
      fontFamily: {
        "mono-data": ["JetBrains Mono", "monospace"],
        "code-label": ["JetBrains Mono", "monospace"],
        "body-sm": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "headline-xl": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
      },
      fontSize: {
        "mono-data": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "code-label": ["13px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "500" }],
        "body-sm": ["14px", { lineHeight: "1.4", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-xl": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
      },
      borderRadius: {
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem",
      },
      spacing: {
        "xs": "8px",
        "sm": "16px",
        "md": "24px",
        "lg": "40px",
        "xl": "64px",
        "container-max": "1440px",
        "grid-gutter": "20px",
      },
    },
  },
  plugins: [],
}