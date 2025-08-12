import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/HomeView.vue'
import taskRoutes from './task'
import notifyRoutes from './notify'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { hideHeader: true, anonymous: true },
  },
  ...taskRoutes,
  ...notifyRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ⚠️ 注意：下面代码会在路由守卫执行时才使用 Pinia，避免初始化顺序错误
router.beforeEach(async (to, from, next) => {
  const { useAuthStore } = await import('@/stores/authStore') // 异步引入
  const authStore = useAuthStore()

  // 处理不存在路由
  if (to.matched.length === 0) return next({ path: '/login' })

  if (to.meta?.anonymous || authStore.isLoggedIn) {
    return next()
  }

  next({ path: '/login', query: { redirect: to.fullPath } })
})

export default router
