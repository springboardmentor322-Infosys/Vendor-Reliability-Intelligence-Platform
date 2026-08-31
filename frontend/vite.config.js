import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = 'http://127.0.0.1:8000'

// All FastAPI route prefixes used by the frontend (dev proxy → backend)
const apiPrefixes = [
  '/auth',
  '/vendors',
  '/vendor-categories',
  '/admin',
  '/procurement-requests',
  '/purchase-orders',
  '/contracts',
  '/messages',
  '/audit-logs',
  '/notifications',
  '/support',
  '/uploads',
  '/dashboard',
  '/analytics',
  '/reports',
  '/products',
  '/deliveries',
  '/invoices',
  '/quality-inspections',
  '/compliance-documents',
]

const proxy = Object.fromEntries(
  apiPrefixes.map((prefix) => [
    prefix,
    {
      target: backendTarget,
      changeOrigin: true,
      bypass(req) {
        if (req.headers['sec-fetch-dest'] === 'document' || req.headers.accept?.includes('text/html')) {
          return req.url
        }
        return undefined
      },
    },
  ]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy,
  },
})
