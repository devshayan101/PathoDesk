import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    build: {
      commonjsOptions: {
        // Required: Transform require() in modules that mix ESM and CJS
        // Without this, require("events") from queue library (dep of @react-pdf/renderer)
        // passes through as a raw require() call, which fails in Electron renderer
        transformMixedEsModules: true,
      },
    },
    plugins: [
      react(),
      // CRITICAL: Two fixes for Electron's file:// protocol:
      // 1. Strip crossorigin attributes (CORS blocks file:// resources)
      // 2. Inject a require shim for the 'events' module (queue library uses CJS require)
      {
        name: 'electron-renderer-fixes',
        transformIndexHtml(html) {
          // Strip crossorigin attributes
          html = html.replace(/\s*crossorigin/g, '')
          // Inject a require shim before the module scripts
          const requireShim = `<script>
// Shim require() for CJS modules bundled in the renderer (e.g. queue library)
if (typeof window.require === 'undefined') {
  var __events_module = { EventEmitter: function() { this._events = {}; } };
  __events_module.EventEmitter.prototype.on = function(e, fn) { (this._events[e] = this._events[e] || []).push(fn); return this; };
  __events_module.EventEmitter.prototype.emit = function(e) { var a = [].slice.call(arguments, 1); (this._events[e] || []).forEach(function(fn) { fn.apply(null, a); }); };
  __events_module.EventEmitter.prototype.removeListener = function(e, fn) { var l = this._events[e]; if (l) { var i = l.indexOf(fn); if (i > -1) l.splice(i, 1); } return this; };
  __events_module.EventEmitter.prototype.listeners = function(e) { return this._events[e] || []; };
  window.require = function(m) { if (m === 'events') return __events_module; throw new Error('Cannot require: ' + m); };
}
</script>`
          return html.replace('<script type="module"', requireShim + '\n    <script type="module"')
        },
      },
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
