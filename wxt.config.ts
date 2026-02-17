import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tibia Prices',
    description: 'Tibia TC to PLN price converter for the character trade market',
    permissions: ['storage'],
  },
});
