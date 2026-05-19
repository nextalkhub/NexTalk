import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': { target: 'http://localhost:8080', changeOrigin: true },
            '/ws':  { target: 'http://localhost:8080', ws: true, changeOrigin: true },
            '/livekit': { target: 'http://localhost:8080', ws: true, changeOrigin: true },
            '/oauth': { target: 'http://localhost:8080', changeOrigin: true },
            '/oidc': { target: 'http://localhost:8080', changeOrigin: true },
            '/.well-known': { target: 'http://localhost:8080', changeOrigin: true },
        },
    },
    build: {
        sourcemap: true,
    },
})