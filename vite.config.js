import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: 'src',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Tell Vue that <webview> is a native Electron element, not a component
          isCustomElement: tag => tag === 'webview',
        },
      },
    }),
  ],
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
        newtab: path.resolve(__dirname, 'src/newtab.html'),
      },
    },
  },
})
