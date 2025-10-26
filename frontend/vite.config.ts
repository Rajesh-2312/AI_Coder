import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React 18 features
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@context': resolve(__dirname, './src/context'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types')
    }
  },
  build: {
    // Optimize build performance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'monaco-vendor': ['@monaco-editor/react'],
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
          'network-vendor': ['socket.io-client', 'axios'],
          'virtualization-vendor': ['react-window', 'react-window-infinite-loader', 'react-virtualized']
        },
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging
    sourcemap: true,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable compression
    reportCompressedSize: true,
    outDir: 'dist',
    emptyOutDir: true
  },
  // Development server optimization
  server: {
    port: 3001, // Main AI-Coder application port
    host: true,
    // Enable HMR for better development experience
    hmr: {
      overlay: true
    },
    // Optimize file watching
    watch: {
      usePolling: false,
      interval: 100
    }
  },
  // Preview server optimization
  preview: {
    port: 3002, // AI-created projects will run on this port for testing
    host: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@monaco-editor/react',
      'socket.io-client',
      'axios',
      'lucide-react',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [
      'react-window',
      'react-window-infinite-loader',
      'react-virtualized'
    ]
  },
  // Performance optimizations
  esbuild: {
    // Enable tree shaking
    treeShaking: true,
    // Optimize for production
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  },
  // CSS optimization
  css: {
    devSourcemap: true
  },
  base: './'
})

