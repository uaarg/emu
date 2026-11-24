import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      // Live ground-station state from the backend (src/server/browserHub.js)
      "/ws": {
        target: "ws://localhost:3000",
        ws: true
      }
    }
  }
})
