import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createVersionPlugin, resolveBuildId } from '../scripts/vite-version-plugin.mjs'

const buildId = resolveBuildId('admin-panel');

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
    createVersionPlugin({
      appName: 'admin-panel',
      buildId,
    }),
  ],
  base: '/admin/',
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'firebase', test: /node_modules\/firebase/ },
            { name: 'vendor', test: /node_modules\/(react|react-dom|react-router-dom)/ },
            { name: 'charts', test: /node_modules\/recharts/ },
            { name: 'ui', test: /node_modules\/lucide-react/ },
          ],
        },
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/messaging',
    ],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://saya-backend.vercel.app',
        changeOrigin: true,
      }
    }
  },
})
