import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Monaco editor
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
            return 'monaco';
          }
          // React Flow
          if (id.includes('@xyflow')) {
            return 'reactflow';
          }
          // DnD Kit
          if (id.includes('@dnd-kit')) {
            return 'dnd';
          }
          // React and related
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          // State management
          if (id.includes('zustand')) {
            return 'zustand';
          }
        }
      }
    }
  }
})
