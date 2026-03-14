// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  devToolbar: {
    enabled: false
  },
  adapter: node({ mode: 'standalone' }),
  server: {
    host: true,
    port: 4321,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
      hmr: {
        clientPort: 443
      }
    }
  }
});