import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Use default Vite port 5173
    host: true, // Allow access from network
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "meowchat-frontend-vite-production.up.railway.app",
      ".up.railway.app", // Allow all Railway subdomains
    ],
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
