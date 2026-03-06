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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx3b3JrXFxcXHBhdGhvLWxhYlxcXFxwYXRoby1sYWItYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFx3b3JrXFxcXHBhdGhvLWxhYlxcXFxwYXRoby1sYWItYXBwXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi93b3JrL3BhdGhvLWxhYi9wYXRoby1sYWItYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24vc2ltcGxlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscydcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICAvLyBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTogJy4vJyxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIGNvbW1vbmpzT3B0aW9uczoge1xyXG4gICAgICAgIC8vIFJlcXVpcmVkOiBUcmFuc2Zvcm0gcmVxdWlyZSgpIGluIG1vZHVsZXMgdGhhdCBtaXggRVNNIGFuZCBDSlNcclxuICAgICAgICAvLyBXaXRob3V0IHRoaXMsIHJlcXVpcmUoXCJldmVudHNcIikgZnJvbSBxdWV1ZSBsaWJyYXJ5IChkZXAgb2YgQHJlYWN0LXBkZi9yZW5kZXJlcilcclxuICAgICAgICAvLyBwYXNzZXMgdGhyb3VnaCBhcyBhIHJhdyByZXF1aXJlKCkgY2FsbCwgd2hpY2ggZmFpbHMgaW4gRWxlY3Ryb24gcmVuZGVyZXJcclxuICAgICAgICB0cmFuc2Zvcm1NaXhlZEVzTW9kdWxlczogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KCksXHJcbiAgICAgIC8vIENSSVRJQ0FMOiBUd28gZml4ZXMgZm9yIEVsZWN0cm9uJ3MgZmlsZTovLyBwcm90b2NvbDpcclxuICAgICAgLy8gMS4gU3RyaXAgY3Jvc3NvcmlnaW4gYXR0cmlidXRlcyAoQ09SUyBibG9ja3MgZmlsZTovLyByZXNvdXJjZXMpXHJcbiAgICAgIC8vIDIuIEluamVjdCBhIHJlcXVpcmUgc2hpbSBmb3IgdGhlICdldmVudHMnIG1vZHVsZSAocXVldWUgbGlicmFyeSB1c2VzIENKUyByZXF1aXJlKVxyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogJ2VsZWN0cm9uLXJlbmRlcmVyLWZpeGVzJyxcclxuICAgICAgICB0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbCkge1xyXG4gICAgICAgICAgLy8gU3RyaXAgY3Jvc3NvcmlnaW4gYXR0cmlidXRlc1xyXG4gICAgICAgICAgaHRtbCA9IGh0bWwucmVwbGFjZSgvXFxzKmNyb3Nzb3JpZ2luL2csICcnKVxyXG4gICAgICAgICAgLy8gSW5qZWN0IGEgcmVxdWlyZSBzaGltIGJlZm9yZSB0aGUgbW9kdWxlIHNjcmlwdHNcclxuICAgICAgICAgIGNvbnN0IHJlcXVpcmVTaGltID0gYDxzY3JpcHQ+XHJcbi8vIFNoaW0gcmVxdWlyZSgpIGZvciBDSlMgbW9kdWxlcyBidW5kbGVkIGluIHRoZSByZW5kZXJlciAoZS5nLiBxdWV1ZSBsaWJyYXJ5KVxyXG5pZiAodHlwZW9mIHdpbmRvdy5yZXF1aXJlID09PSAndW5kZWZpbmVkJykge1xyXG4gIHZhciBfX2V2ZW50c19tb2R1bGUgPSB7IEV2ZW50RW1pdHRlcjogZnVuY3Rpb24oKSB7IHRoaXMuX2V2ZW50cyA9IHt9OyB9IH07XHJcbiAgX19ldmVudHNfbW9kdWxlLkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbihlLCBmbikgeyAodGhpcy5fZXZlbnRzW2VdID0gdGhpcy5fZXZlbnRzW2VdIHx8IFtdKS5wdXNoKGZuKTsgcmV0dXJuIHRoaXM7IH07XHJcbiAgX19ldmVudHNfbW9kdWxlLkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGUpIHsgdmFyIGEgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7ICh0aGlzLl9ldmVudHNbZV0gfHwgW10pLmZvckVhY2goZnVuY3Rpb24oZm4pIHsgZm4uYXBwbHkobnVsbCwgYSk7IH0pOyB9O1xyXG4gIF9fZXZlbnRzX21vZHVsZS5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24oZSwgZm4pIHsgdmFyIGwgPSB0aGlzLl9ldmVudHNbZV07IGlmIChsKSB7IHZhciBpID0gbC5pbmRleE9mKGZuKTsgaWYgKGkgPiAtMSkgbC5zcGxpY2UoaSwgMSk7IH0gcmV0dXJuIHRoaXM7IH07XHJcbiAgX19ldmVudHNfbW9kdWxlLkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZSkgeyByZXR1cm4gdGhpcy5fZXZlbnRzW2VdIHx8IFtdOyB9O1xyXG4gIHdpbmRvdy5yZXF1aXJlID0gZnVuY3Rpb24obSkgeyBpZiAobSA9PT0gJ2V2ZW50cycpIHJldHVybiBfX2V2ZW50c19tb2R1bGU7IHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJlcXVpcmU6ICcgKyBtKTsgfTtcclxufVxyXG48L3NjcmlwdD5gXHJcbiAgICAgICAgICByZXR1cm4gaHRtbC5yZXBsYWNlKCc8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIicsIHJlcXVpcmVTaGltICsgJ1xcbiAgICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIicpXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgLy8gUG9seWZpbGwgTm9kZS5qcyBtb2R1bGVzIGZvciBAcmVhY3QtcGRmL3JlbmRlcmVyXHJcbiAgICAgIG5vZGVQb2x5ZmlsbHMoe1xyXG4gICAgICAgIGluY2x1ZGU6IFsnZXZlbnRzJywgJ3N0cmVhbScsICd1dGlsJywgJ2J1ZmZlcicsICdwcm9jZXNzJ10sXHJcbiAgICAgICAgZ2xvYmFsczoge1xyXG4gICAgICAgICAgQnVmZmVyOiB0cnVlLFxyXG4gICAgICAgICAgZ2xvYmFsOiB0cnVlLFxyXG4gICAgICAgICAgcHJvY2VzczogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAgZWxlY3Ryb24oe1xyXG4gICAgICAgIG1haW46IHtcclxuICAgICAgICAgIGVudHJ5OiAnZWxlY3Ryb24vbWFpbi50cycsXHJcbiAgICAgICAgICB2aXRlOiB7XHJcbiAgICAgICAgICAgIC8vIGRlZmluZToge1xyXG4gICAgICAgICAgICAvLyAgICdwcm9jZXNzLmVudi5QVUJMSUNfS0VZJzogSlNPTi5zdHJpbmdpZnkoZW52LlBVQkxJQ19LRVkpLFxyXG4gICAgICAgICAgICAvLyB9LFxyXG4gICAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgIGV4dGVybmFsOiBbJ2JldHRlci1zcWxpdGUzJ10sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwcmVsb2FkOiB7XHJcbiAgICAgICAgICBpbnB1dDogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2VsZWN0cm9uL3ByZWxvYWQudHMnKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlbmRlcmVyOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Rlc3QnXHJcbiAgICAgICAgICA/IHVuZGVmaW5lZFxyXG4gICAgICAgICAgOiB7fSxcclxuICAgICAgfSksXHJcbiAgICBdLFxyXG4gIH1cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UixTQUFTLG9CQUE2QjtBQUM3VCxPQUFPLFVBQVU7QUFDakIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sV0FBVztBQUNsQixTQUFTLHFCQUFxQjtBQUo5QixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUd4QyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUlmLHlCQUF5QjtBQUFBLE1BQzNCO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSU47QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLG1CQUFtQixNQUFNO0FBRXZCLGlCQUFPLEtBQUssUUFBUSxtQkFBbUIsRUFBRTtBQUV6QyxnQkFBTSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFXcEIsaUJBQU8sS0FBSyxRQUFRLHlCQUF5QixjQUFjLDZCQUE2QjtBQUFBLFFBQzFGO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFFQSxjQUFjO0FBQUEsUUFDWixTQUFTLENBQUMsVUFBVSxVQUFVLFFBQVEsVUFBVSxTQUFTO0FBQUEsUUFDekQsU0FBUztBQUFBLFVBQ1AsUUFBUTtBQUFBLFVBQ1IsUUFBUTtBQUFBLFVBQ1IsU0FBUztBQUFBLFFBQ1g7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNELFNBQVM7QUFBQSxRQUNQLE1BQU07QUFBQSxVQUNKLE9BQU87QUFBQSxVQUNQLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQSxZQUlKLE9BQU87QUFBQSxjQUNMLGVBQWU7QUFBQSxnQkFDYixVQUFVLENBQUMsZ0JBQWdCO0FBQUEsY0FDN0I7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFNBQVM7QUFBQSxVQUNQLE9BQU8sS0FBSyxLQUFLLGtDQUFXLHFCQUFxQjtBQUFBLFFBQ25EO0FBQUEsUUFDQSxVQUFVLFFBQVEsSUFBSSxhQUFhLFNBQy9CLFNBQ0EsQ0FBQztBQUFBLE1BQ1AsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
