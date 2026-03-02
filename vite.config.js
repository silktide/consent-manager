import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'SilktideConsentManager',
      formats: ['umd', 'es'],
      fileName: (format) => {
        if (format === 'umd') return 'silktide-consent-manager.umd.cjs';
        return 'silktide-consent-manager.js';
      },
      cssFileName: 'silktide-consent-manager',
    },
    outDir: 'dist',
    sourcemap: true,
  },
});
