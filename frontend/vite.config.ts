import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Rewrite Origin so the backend's CORS filter (which only allows
  // localhost:5173 in dev) accepts requests arriving via an ngrok tunnel.
  // The browser treats these as same-origin, so no client-side CORS applies.
  const backend = {
    target: 'http://localhost:8080',
    changeOrigin: true,
    headers: { origin: 'http://localhost:5173' },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': backend,
        '/auth': backend,
        '/public': backend,
        '/account/': backend,
        [`/${env.VITE_ADMIN_PAGE}/`]: backend,
      },
        allowedHosts: [
          'nonschematized-elaine-supersagacious.ngrok-free.dev'
        ]
    },
  }
})
