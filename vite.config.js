import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const vendorChunks = id => {
  if (!id.includes('node_modules')) return
  if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor/')) return 'charts'
  if (id.includes('node_modules/lucide-react/')) return 'icons'
  if (id.includes('node_modules/aos/')) return 'aos'
  if (id.includes('node_modules/react') || id.includes('node_modules/scheduler/')) return 'react-vendor'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunks,
      },
    },
  },
})
