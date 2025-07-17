import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // This configuration is necessary for the Vite development server
    // to work correctly within the sandboxed environment.
    // It ensures that the Hot Module Replacement (HMR) feature,
    // which uses WebSockets, can establish a connection.
    hmr: {
        port: 443,
    }
  }
})