import type { Config } from 'tailwindcss'
import tailwindCaido from '@caido/tailwindcss';
import tailwindPrimeui from 'tailwindcss-primeui';

export default {
  content: [
    './index.html',
    './src/**/*.{vue,ts}',
    './node_modules/@caido/primevue/dist/primevue.mjs'
  ],
  darkMode: ["selector", '[data-mode="dark"]'],
  plugins: [
    tailwindPrimeui,
    tailwindCaido,
  ],

  // Disable preflight to avoid conflicts when loaded in Caido
  //preflight: false,
} satisfies Config