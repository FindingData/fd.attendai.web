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
  const { useRouterStore } = await import('@/stores/routerStore') // 异步引入
  const authStore = useAuthStore()
  const routerStore = useRouterStore()
  // 处理不存在路由
  if (to.matched.length === 0) return next({ path: '/login' })

  if (to.meta?.anonymous || authStore.isLoggedIn) {
    // 目标路由标记为需要缓存 (keepAlive: true)
    // if (to.meta.keepAlive) {
    //   // 检查组件名是否已存在，如果不存在，则添加
    //   if (to.name && !routerStore.keptAliveComponents.includes(to.name)) {
    //     // Pinia Store action: 添加组件名到数组
    //     routerStore.addKeepAliveComponent(to.name)
    //   }
    // } else {
    //   // 如果 meta.keepAlive 为 false，确保移除组件缓存
    //   if (to.name && routerStore.keptAliveComponents.includes(to.name)) {
    //     routerStore.removeKeepAliveComponent(to.name) // 需要在 Pinia Store 中实现这个方法
    //   }
    // }
    return next()
  }

  next({ path: '/login', query: { redirect: to.fullPath } })
})

export default router
