module.exports = {
  presets: [require("../../packages/config/tailwind/preset.cjs")],
  content: [
  "./index.html",
  "./src/**/*.{vue,ts,tsx,js,jsx}",
  "../../packages/ui/src/**/*.{vue,ts,tsx,js,jsx}",
],
  theme: { extend: {} },
  plugins: []
};