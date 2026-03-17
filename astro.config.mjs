// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  devToolbar: {
    enabled: false
  },
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),

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