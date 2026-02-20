import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Polyfill Node.js modules for @react-pdf/renderer
      nodePolyfills({
        include: ['events', 'stream', 'util', 'buffer', 'process'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            // define: {
            //   'process.env.PUBLIC_KEY': JSON.stringify(env.PUBLIC_KEY),
            // },
            build: {
              rollupOptions: {
                external: ['better-sqlite3'],
              },
            },
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        renderer: process.env.NODE_ENV === 'test'
          ? undefined
          : {},
      }),
    ],
  }
})
