// vite.config.ts
import { defineConfig } from "file:///D:/work/patho-lab/patho-lab-app/node_modules/vite/dist/node/index.js";
import path from "node:path";
import electron from "file:///D:/work/patho-lab/patho-lab-app/node_modules/vite-plugin-electron/dist/simple.mjs";
import react from "file:///D:/work/patho-lab/patho-lab-app/node_modules/@vitejs/plugin-react/dist/index.js";
import { nodePolyfills } from "file:///D:/work/patho-lab/patho-lab-app/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_dirname = "D:\\work\\patho-lab\\patho-lab-app";
var vite_config_default = defineConfig(({ mode }) => {
  return {
    base: "./",
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0")
    },
    build: {
      commonjsOptions: {
        // Required: Transform require() in modules that mix ESM and CJS
        // Without this, require("events") from queue library (dep of @react-pdf/renderer)
        // passes through as a raw require() call, which fails in Electron renderer
        transformMixedEsModules: true
      }
    },
    plugins: [
      react(),
      // CRITICAL: Two fixes for Electron's file:// protocol:
      // 1. Strip crossorigin attributes (CORS blocks file:// resources)
      // 2. Inject a require shim for the 'events' module (queue library uses CJS require)
      {
        name: "electron-renderer-fixes",
        transformIndexHtml(html) {
          html = html.replace(/\s*crossorigin/g, "");
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
</script>`;
          return html.replace('<script type="module"', requireShim + '\n    <script type="module"');
        }
      },
      // Polyfill Node.js modules for @react-pdf/renderer
      nodePolyfills({
        include: ["events", "stream", "util", "buffer", "process"],
        globals: {
          Buffer: true,
          global: true,
          process: true
        }
      }),
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            // define: {
            //   'process.env.PUBLIC_KEY': JSON.stringify(env.PUBLIC_KEY),
            // },
            build: {
              rollupOptions: {
                external: ["better-sqlite3"]
              }
            }
          }
        },
        preload: {
          input: path.join(__vite_injected_original_dirname, "electron/preload.ts")
        },
        renderer: process.env.NODE_ENV === "test" ? void 0 : {}
      })
    ]
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx3b3JrXFxcXHBhdGhvLWxhYlxcXFxwYXRoby1sYWItYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFx3b3JrXFxcXHBhdGhvLWxhYlxcXFxwYXRoby1sYWItYXBwXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi93b3JrL3BhdGhvLWxhYi9wYXRoby1sYWItYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24vc2ltcGxlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscydcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICAvLyBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTogJy4vJyxcclxuICAgIGRlZmluZToge1xyXG4gICAgICBfX0FQUF9WRVJTSU9OX186IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX3ZlcnNpb24gfHwgJzEuMC4wJyksXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgY29tbW9uanNPcHRpb25zOiB7XHJcbiAgICAgICAgLy8gUmVxdWlyZWQ6IFRyYW5zZm9ybSByZXF1aXJlKCkgaW4gbW9kdWxlcyB0aGF0IG1peCBFU00gYW5kIENKU1xyXG4gICAgICAgIC8vIFdpdGhvdXQgdGhpcywgcmVxdWlyZShcImV2ZW50c1wiKSBmcm9tIHF1ZXVlIGxpYnJhcnkgKGRlcCBvZiBAcmVhY3QtcGRmL3JlbmRlcmVyKVxyXG4gICAgICAgIC8vIHBhc3NlcyB0aHJvdWdoIGFzIGEgcmF3IHJlcXVpcmUoKSBjYWxsLCB3aGljaCBmYWlscyBpbiBFbGVjdHJvbiByZW5kZXJlclxyXG4gICAgICAgIHRyYW5zZm9ybU1peGVkRXNNb2R1bGVzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgLy8gQ1JJVElDQUw6IFR3byBmaXhlcyBmb3IgRWxlY3Ryb24ncyBmaWxlOi8vIHByb3RvY29sOlxyXG4gICAgICAvLyAxLiBTdHJpcCBjcm9zc29yaWdpbiBhdHRyaWJ1dGVzIChDT1JTIGJsb2NrcyBmaWxlOi8vIHJlc291cmNlcylcclxuICAgICAgLy8gMi4gSW5qZWN0IGEgcmVxdWlyZSBzaGltIGZvciB0aGUgJ2V2ZW50cycgbW9kdWxlIChxdWV1ZSBsaWJyYXJ5IHVzZXMgQ0pTIHJlcXVpcmUpXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiAnZWxlY3Ryb24tcmVuZGVyZXItZml4ZXMnLFxyXG4gICAgICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sKSB7XHJcbiAgICAgICAgICAvLyBTdHJpcCBjcm9zc29yaWdpbiBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICBodG1sID0gaHRtbC5yZXBsYWNlKC9cXHMqY3Jvc3NvcmlnaW4vZywgJycpXHJcbiAgICAgICAgICAvLyBJbmplY3QgYSByZXF1aXJlIHNoaW0gYmVmb3JlIHRoZSBtb2R1bGUgc2NyaXB0c1xyXG4gICAgICAgICAgY29uc3QgcmVxdWlyZVNoaW0gPSBgPHNjcmlwdD5cclxuLy8gU2hpbSByZXF1aXJlKCkgZm9yIENKUyBtb2R1bGVzIGJ1bmRsZWQgaW4gdGhlIHJlbmRlcmVyIChlLmcuIHF1ZXVlIGxpYnJhcnkpXHJcbmlmICh0eXBlb2Ygd2luZG93LnJlcXVpcmUgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgdmFyIF9fZXZlbnRzX21vZHVsZSA9IHsgRXZlbnRFbWl0dGVyOiBmdW5jdGlvbigpIHsgdGhpcy5fZXZlbnRzID0ge307IH0gfTtcclxuICBfX2V2ZW50c19tb2R1bGUuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGUsIGZuKSB7ICh0aGlzLl9ldmVudHNbZV0gPSB0aGlzLl9ldmVudHNbZV0gfHwgW10pLnB1c2goZm4pOyByZXR1cm4gdGhpczsgfTtcclxuICBfX2V2ZW50c19tb2R1bGUuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZSkgeyB2YXIgYSA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTsgKHRoaXMuX2V2ZW50c1tlXSB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihmbikgeyBmbi5hcHBseShudWxsLCBhKTsgfSk7IH07XHJcbiAgX19ldmVudHNfbW9kdWxlLkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbihlLCBmbikgeyB2YXIgbCA9IHRoaXMuX2V2ZW50c1tlXTsgaWYgKGwpIHsgdmFyIGkgPSBsLmluZGV4T2YoZm4pOyBpZiAoaSA+IC0xKSBsLnNwbGljZShpLCAxKTsgfSByZXR1cm4gdGhpczsgfTtcclxuICBfX2V2ZW50c19tb2R1bGUuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihlKSB7IHJldHVybiB0aGlzLl9ldmVudHNbZV0gfHwgW107IH07XHJcbiAgd2luZG93LnJlcXVpcmUgPSBmdW5jdGlvbihtKSB7IGlmIChtID09PSAnZXZlbnRzJykgcmV0dXJuIF9fZXZlbnRzX21vZHVsZTsgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgcmVxdWlyZTogJyArIG0pOyB9O1xyXG59XHJcbjwvc2NyaXB0PmBcclxuICAgICAgICAgIHJldHVybiBodG1sLnJlcGxhY2UoJzxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiJywgcmVxdWlyZVNoaW0gKyAnXFxuICAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiJylcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICAvLyBQb2x5ZmlsbCBOb2RlLmpzIG1vZHVsZXMgZm9yIEByZWFjdC1wZGYvcmVuZGVyZXJcclxuICAgICAgbm9kZVBvbHlmaWxscyh7XHJcbiAgICAgICAgaW5jbHVkZTogWydldmVudHMnLCAnc3RyZWFtJywgJ3V0aWwnLCAnYnVmZmVyJywgJ3Byb2Nlc3MnXSxcclxuICAgICAgICBnbG9iYWxzOiB7XHJcbiAgICAgICAgICBCdWZmZXI6IHRydWUsXHJcbiAgICAgICAgICBnbG9iYWw6IHRydWUsXHJcbiAgICAgICAgICBwcm9jZXNzOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICBlbGVjdHJvbih7XHJcbiAgICAgICAgbWFpbjoge1xyXG4gICAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluLnRzJyxcclxuICAgICAgICAgIHZpdGU6IHtcclxuICAgICAgICAgICAgLy8gZGVmaW5lOiB7XHJcbiAgICAgICAgICAgIC8vICAgJ3Byb2Nlc3MuZW52LlBVQkxJQ19LRVknOiBKU09OLnN0cmluZ2lmeShlbnYuUFVCTElDX0tFWSksXHJcbiAgICAgICAgICAgIC8vIH0sXHJcbiAgICAgICAgICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgZXh0ZXJuYWw6IFsnYmV0dGVyLXNxbGl0ZTMnXSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHByZWxvYWQ6IHtcclxuICAgICAgICAgIGlucHV0OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnZWxlY3Ryb24vcHJlbG9hZC50cycpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVuZGVyZXI6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAndGVzdCdcclxuICAgICAgICAgID8gdW5kZWZpbmVkXHJcbiAgICAgICAgICA6IHt9LFxyXG4gICAgICB9KSxcclxuICAgIF0sXHJcbiAgfVxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVSLFNBQVMsb0JBQTZCO0FBQzdULE9BQU8sVUFBVTtBQUNqQixPQUFPLGNBQWM7QUFDckIsT0FBTyxXQUFXO0FBQ2xCLFNBQVMscUJBQXFCO0FBSjlCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBR3hDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGlCQUFpQixLQUFLLFVBQVUsUUFBUSxJQUFJLHVCQUF1QixPQUFPO0FBQUEsSUFDNUU7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBSWYseUJBQXlCO0FBQUEsTUFDM0I7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFJTjtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sbUJBQW1CLE1BQU07QUFFdkIsaUJBQU8sS0FBSyxRQUFRLG1CQUFtQixFQUFFO0FBRXpDLGdCQUFNLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVdwQixpQkFBTyxLQUFLLFFBQVEseUJBQXlCLGNBQWMsNkJBQTZCO0FBQUEsUUFDMUY7QUFBQSxNQUNGO0FBQUE7QUFBQSxNQUVBLGNBQWM7QUFBQSxRQUNaLFNBQVMsQ0FBQyxVQUFVLFVBQVUsUUFBUSxVQUFVLFNBQVM7QUFBQSxRQUN6RCxTQUFTO0FBQUEsVUFDUCxRQUFRO0FBQUEsVUFDUixRQUFRO0FBQUEsVUFDUixTQUFTO0FBQUEsUUFDWDtBQUFBLE1BQ0YsQ0FBQztBQUFBLE1BQ0QsU0FBUztBQUFBLFFBQ1AsTUFBTTtBQUFBLFVBQ0osT0FBTztBQUFBLFVBQ1AsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBSUosT0FBTztBQUFBLGNBQ0wsZUFBZTtBQUFBLGdCQUNiLFVBQVUsQ0FBQyxnQkFBZ0I7QUFBQSxjQUM3QjtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLFFBQ0EsU0FBUztBQUFBLFVBQ1AsT0FBTyxLQUFLLEtBQUssa0NBQVcscUJBQXFCO0FBQUEsUUFDbkQ7QUFBQSxRQUNBLFVBQVUsUUFBUSxJQUFJLGFBQWEsU0FDL0IsU0FDQSxDQUFDO0FBQUEsTUFDUCxDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
