import { defineConfig } from 'vite';
import { resolve } from 'path'; // Needed for resolving __dirname

// https://vitejs.dev/config/
export default defineConfig({
  base: '/JulesDraw/', // Added base path
  server: {
    open: true, // Automatically open in browser on dev server start
  },
  build: {
    outDir: 'dist', // Output directory, matches tsconfig.json
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Entry point for the app
        sw: resolve(__dirname, 'sw.ts'),      // Entry point for the service worker
      },
      output: {
        entryFileNames: assetInfo => {
          // Output sw.ts as sw.js in the root of dist
          if (assetInfo.name === 'sw') {
            return 'sw.js';
          }
          // For other JS entry points (like from index.html), use Vite's default hashing
          return 'assets/[name]-[hash].js';
        },
        // Ensure other chunks also follow a pattern if needed,
        // but for a simple app, entryFileNames for main and sw is key.
        // chunkFileNames: 'assets/[name]-[hash].js',
        // assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  },
  // If your tsconfig.json is not in the root or has a different name:
  // tsconfig: 'path/to/your/tsconfig.json'
});
