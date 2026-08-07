import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// Hash mode : GitHub Pages sert des fichiers statiques, aucune règle de rewrite
// n'est possible — /#/game/xxx est donc la seule forme de deep link fiable.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'liste', component: HomeView },
    { path: '/:pasTrouve(.*)*', redirect: '/' },
  ],
})
