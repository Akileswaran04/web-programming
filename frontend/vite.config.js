import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api is proxied to Spring Boot so the browser sees one origin (no CORS, CSRF cookie just works).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8080" } },
});
