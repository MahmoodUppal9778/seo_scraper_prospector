import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/results',
    name: 'Results',
    component: () => import('@/views/Results.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
