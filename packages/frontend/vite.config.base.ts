import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import tailwindcss from "tailwindcss";

export default defineConfig({
  plugins: [
    vue()
  ],
  optimizeDeps: {
    include: ['highlight.js', 'vue-smart-suggest']
  },
  resolve: {
    alias: [
      // {
      //   'vue-smart-suggest': resolve(__dirname, 'node_modules/vue-smart-suggest/lib/vue-smart-suggest.es.js'),
      // },
      {
        find: "@",
        replacement: resolve(__dirname, "src"),
      },
    ],
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
      ],
    }
  },
});
