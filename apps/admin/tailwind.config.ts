import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
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
