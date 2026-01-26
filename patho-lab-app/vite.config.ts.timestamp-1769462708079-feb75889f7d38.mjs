// vite.config.ts
import { defineConfig } from "file:///D:/work/patho-lab/patho-lab-app/node_modules/vite/dist/node/index.js";
import path from "node:path";
import electron from "file:///D:/work/patho-lab/patho-lab-app/node_modules/vite-plugin-electron/dist/simple.mjs";
import react from "file:///D:/work/patho-lab/patho-lab-app/node_modules/@vitejs/plugin-react/dist/index.js";
import { nodePolyfills } from "file:///D:/work/patho-lab/patho-lab-app/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_dirname = "D:\\work\\patho-lab\\patho-lab-app";
var vite_config_default = defineConfig({
  plugins: [
    react(),
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
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx3b3JrXFxcXHBhdGhvLWxhYlxcXFxwYXRoby1sYWItYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFx3b3JrXFxcXHBhdGhvLWxhYlxcXFxwYXRoby1sYWItYXBwXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi93b3JrL3BhdGhvLWxhYi9wYXRoby1sYWItYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24vc2ltcGxlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscydcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIC8vIFBvbHlmaWxsIE5vZGUuanMgbW9kdWxlcyBmb3IgQHJlYWN0LXBkZi9yZW5kZXJlclxyXG4gICAgbm9kZVBvbHlmaWxscyh7XHJcbiAgICAgIGluY2x1ZGU6IFsnZXZlbnRzJywgJ3N0cmVhbScsICd1dGlsJywgJ2J1ZmZlcicsICdwcm9jZXNzJ10sXHJcbiAgICAgIGdsb2JhbHM6IHtcclxuICAgICAgICBCdWZmZXI6IHRydWUsXHJcbiAgICAgICAgZ2xvYmFsOiB0cnVlLFxyXG4gICAgICAgIHByb2Nlc3M6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICAgIGVsZWN0cm9uKHtcclxuICAgICAgbWFpbjoge1xyXG4gICAgICAgIGVudHJ5OiAnZWxlY3Ryb24vbWFpbi50cycsXHJcbiAgICAgICAgdml0ZToge1xyXG4gICAgICAgICAgYnVpbGQ6IHtcclxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbJ2JldHRlci1zcWxpdGUzJ10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHByZWxvYWQ6IHtcclxuICAgICAgICBpbnB1dDogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2VsZWN0cm9uL3ByZWxvYWQudHMnKSxcclxuICAgICAgfSxcclxuICAgICAgcmVuZGVyZXI6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAndGVzdCdcclxuICAgICAgICA/IHVuZGVmaW5lZFxyXG4gICAgICAgIDoge30sXHJcbiAgICB9KSxcclxuICBdLFxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVSLFNBQVMsb0JBQW9CO0FBQ3BULE9BQU8sVUFBVTtBQUNqQixPQUFPLGNBQWM7QUFDckIsT0FBTyxXQUFXO0FBQ2xCLFNBQVMscUJBQXFCO0FBSjlCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBLElBRU4sY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLFVBQVUsVUFBVSxRQUFRLFVBQVUsU0FBUztBQUFBLE1BQ3pELFNBQVM7QUFBQSxRQUNQLFFBQVE7QUFBQSxRQUNSLFFBQVE7QUFBQSxRQUNSLFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsUUFDSixPQUFPO0FBQUEsUUFDUCxNQUFNO0FBQUEsVUFDSixPQUFPO0FBQUEsWUFDTCxlQUFlO0FBQUEsY0FDYixVQUFVLENBQUMsZ0JBQWdCO0FBQUEsWUFDN0I7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLE9BQU8sS0FBSyxLQUFLLGtDQUFXLHFCQUFxQjtBQUFBLE1BQ25EO0FBQUEsTUFDQSxVQUFVLFFBQVEsSUFBSSxhQUFhLFNBQy9CLFNBQ0EsQ0FBQztBQUFBLElBQ1AsQ0FBQztBQUFBLEVBQ0g7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
