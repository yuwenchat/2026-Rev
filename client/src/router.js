import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from './stores/user.js'

const routes = [
  {
    path: '/',
    redirect: '/chat'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('./views/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('./views/Chat.vue'),
    meta: { auth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('./views/Admin.vue'),
    meta: { auth: true, admin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const isLoggedIn = !!userStore.token

  if (to.meta.auth && !isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && isLoggedIn) {
    next('/chat')
  } else if (to.meta.admin && (!userStore.user || !userStore.user.isAdmin)) {
    next('/chat')
  } else {
    next()
  }
})

export default router
