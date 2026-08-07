import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// base : le site est servi depuis https://<user>.github.io/Archipelago-game-list/
export default defineConfig({
  base: '/Archipelago-game-list/',
  plugins: [vue(), tailwindcss()],
})
