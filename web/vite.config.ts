import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import fs from "node:fs";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(() => {
  const backend = resolveBackend();
  return {
    appType: "spa",
    server: {
      proxy: {
        "/health": backend,
        "/ozon": backend,
        "/tools": backend,
        "/dict": backend,
        "/api": backend,
        "/pricing/calc": backend,
      },
    },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths()
  ],
  }
})

function resolveBackend() {
  const env = process.env.OZON_ERP_BACKEND;
  if (env) return env;

  const root = path.resolve(__dirname, "..");
  const envPath = path.join(root, ".env");
  try {
    const s = fs.readFileSync(envPath, "utf-8");
    const m = s.match(/^\s*HTTP_ADDR\s*=\s*(.+)\s*$/m);
    if (m?.[1]) {
      const addr = m[1].trim();
      if (addr) return `http://${addr}`;
    }
  } catch {}

  return "http://127.0.0.1:8080";
}
