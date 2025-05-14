import { defineConfig } from "@caido-community/dev";
import tailwindCaido from "@caido/tailwindcss";
import vue from "@vitejs/plugin-vue";
import path from "path";
import prefixwrap from "postcss-prefixwrap";
import tailwindcss from "tailwindcss";
import tailwindPrimeui from "tailwindcss-primeui";

const id = "notesplusplus";
export default defineConfig({
  id,
  name: "Notes++",
  description: "Create and edit notes in Caido",
  version: "2.0.0",
  author: {
    name: "_StaticFlow_",
    email: "tanner.barnes@kashx.io",
    url: "https://github.com/caido-community/NotesPlusPlus",
  },
  plugins: [
    {
      kind: "backend",
      id: "backend",
      root: "packages/backend",
    },
    {
      kind: "frontend",
      id: "frontend",
      root: "packages/frontend",
      backend: {
        id: "backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: ["@caido/frontend-sdk"],
          },
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        css: {
          postcss: {
            plugins: [
              // This plugin wraps the root element in a unique ID
              // This is necessary to prevent styling conflicts between plugins
              prefixwrap(`#plugin--${id}`),

              tailwindcss({
                corePlugins: {
                  preflight: false,
                },
                content: [
                  "./packages/frontend/src/**/*.{vue,ts}",
                  "./node_modules/@caido/primevue/dist/primevue.mjs",
                ],
                // Check the [data-mode="dark"] attribute on the <html> element to determine the mode
                // This attribute is set in the Caido core application
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [
                  // This plugin injects the necessary Tailwind classes for PrimeVue components
                  tailwindPrimeui,

                  // This plugin injects the necessary Tailwind classes for the Caido theme
                  tailwindCaido,
                ],
              }),
            ],
          },
        },
      },
    },
  ],
});
