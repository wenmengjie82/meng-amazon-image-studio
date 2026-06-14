import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#221b2f',
        blush: '#f9edf3',
        rose: '#c76c95',
        sand: '#f6efe8'
      }
    }
  },
  plugins: []
};

export default config;
