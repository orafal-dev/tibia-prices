import path from 'path';
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
// Alias matches react-shadcn guide: https://github.com/wxt-dev/examples/blob/main/examples/react-shadcn/README.md
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  }),
  manifest: {
    name: 'Tibia Prices',
    description: 'Tibia TC to PLN price converter for the character trade market',
    permissions: ['storage'],
    browser_specific_settings: {
      gecko: {
        data_collection_permissions: {
          required: ['none'],
          optional: [],
        },
      },
    },
  },
});
