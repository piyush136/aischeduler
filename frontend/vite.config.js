import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BACKEND_PROXY_TARGET = process.env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:5000'
const MCP_PROXY_TARGET = process.env.VITE_MCP_PROXY_TARGET || 'http://127.0.0.1:5001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'AI Smart Scheduling System',
        short_name: 'AI Scheduler',
        description: 'An AI-powered smart scheduling system and task manager',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/mcp': {
        target: MCP_PROXY_TARGET,
        changeOrigin: true
      }
    }
  }
})
