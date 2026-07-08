import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    modulePreload: {
      // Don't eagerly preload heavy non-critical chunks
      resolveDependencies: (filename, deps) => {
        return deps.filter(dep =>
          !dep.includes('recharts') &&
          !dep.includes('react-three') &&
          !dep.includes('three')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'react-three': ['@react-three/fiber', '@react-three/drei'],
          'recharts': ['recharts'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})
