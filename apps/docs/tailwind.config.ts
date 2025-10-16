import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        aurora: {
          primary: '#009688',
          accent: '#2B6CB0',
        },
      },
    },
  },
  plugins: [],
};

export default config;
