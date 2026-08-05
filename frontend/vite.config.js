import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/vendors': 'http://127.0.0.1:8000',
      '/vendor-categories': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/procurement-requests': 'http://127.0.0.1:8000',
      '/purchase-orders': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
    },
  },
})
