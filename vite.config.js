import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: './', // Usa './' en lugar de '/'
  build: {
    outDir: 'dist'
  }
});

