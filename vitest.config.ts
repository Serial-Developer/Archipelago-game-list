import { defineConfig } from 'vitest/config'

// Les tests ne couvrent que le pipeline de données : pas besoin des plugins
// Vue/Tailwind du build front, ni d'un environnement DOM.
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
  },
})
