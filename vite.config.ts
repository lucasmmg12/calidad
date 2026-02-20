import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Target older browsers common in hospital/medical environments
      targets: [
        'Chrome >= 64',      // Android 9+ (2018) and older desktop Chrome
        'Safari >= 12',      // iOS 12+ (iPhone 5s+, 2018)
        'Firefox >= 67',     // 2019+
        'Edge >= 79',        // Chromium-based Edge
        'Samsung >= 9.2',    // Samsung Internet on older Galaxy devices
        'ChromeAndroid >= 64',
      ],
      // Generate legacy chunks with polyfills
      renderLegacyChunks: true,
      // Polyfills for older browsers
      modernPolyfills: true,
    }),
  ],
})

