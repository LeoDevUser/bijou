import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://localhost:8080',
        '/auth': 'http://localhost:8080',
        '/public': 'http://localhost:8080',
        '/account/': 'http://localhost:8080',
        [`/${env.VITE_ADMIN_PAGE}/`]: 'http://localhost:8080',
      },
        allowedHosts: [
          'nonschematized-elaine-supersagacious.ngrok-free.dev'
        ]
    },
  }
})
