module.exports = {
  presets: [require('../../packages/config/tailwind/preset.cjs')],
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
