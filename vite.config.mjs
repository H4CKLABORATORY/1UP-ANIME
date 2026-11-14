import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls: false
      }
    }),
    {
      name: 'copy-oneup-static-assets',
      closeBundle() {
        const distData = path.resolve(__dirname, 'dist/data');
        const srcData = path.resolve(__dirname, 'data');
        if (fs.existsSync(srcData)) {
          fs.cpSync(srcData, distData, { recursive: true });
        }
        const distAssets = path.resolve(__dirname, 'dist/assets');
        const srcAssets = path.resolve(__dirname, 'client/assets');
        if (fs.existsSync(srcAssets)) {
          fs.cpSync(srcAssets, distAssets, { recursive: true });
        }
      }
    }
  ],
  root: 'client',
  base: './',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client/index.html')
      }
    }
  },
  server: {
    port: 8765,
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src-vue'),
      '@client': path.resolve(__dirname, 'client')
    }
  }
});
