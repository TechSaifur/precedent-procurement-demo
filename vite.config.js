import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// viteSingleFile inlines JS/CSS so the build is one portable HTML file.
export default defineConfig({ plugins: [react(), viteSingleFile()] });
