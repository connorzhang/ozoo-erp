/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: [
          "HarmonyOS Sans SC",
          "MiSans",
          "Alibaba PuHuiTi",
          "Microsoft YaHei UI",
          "Microsoft YaHei",
          "PingFang SC",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101A2C",
          850: "#13203A",
          800: "#172647",
          700: "#1F3360",
          200: "#C7D2E6",
        },
        azure: {
          600: "#2F7EF7",
          500: "#3D8BFF",
          400: "#5AA0FF",
        },
      },
      boxShadow: {
        card: "0 12px 28px rgba(10, 16, 30, 0.14)",
        card2: "0 18px 44px rgba(10, 16, 30, 0.18)",
      },
    },
  },
  plugins: [],
};
