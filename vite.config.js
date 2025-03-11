import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: '/', // Asegúrate de que sea '/'
  build: {
    outDir: 'dist'
  }
});

