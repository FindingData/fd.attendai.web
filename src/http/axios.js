import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import router from '@/router'

// 创建 Axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 支持环境变量配置
  timeout: 50000,
  withCredentials: true,
})

// 请求拦截器：自动添加 token
service.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers['Authorization'] = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    Promise.reject(error)
  },
)

// 响应拦截器：处理 .NET 返回结构
service.interceptors.response.use(
  (response) => {
    const res = response.data
    const url = response?.config?.url || ''
    // ✅ 如果是 AI 接口（统一以 /ai- 开头）
    if (isAIRequest(url)) {
      // 不拆结构，前端拿 ai_status、next_prompt 自行处理
      return res
    }
    // .NET 返回结构统一处理
    if (res.status === true) {
      return res.data // 直接返回 data
    } else {
      // 权限不足提示
      if (res.code === 401 || res.code === 403) {
        ElMessage.warning('未登录或权限不足，请重新登录')
        router.push({ path: '/login' }) // 跳转登录页
      } else {
        ElMessage.error(res.message || '请求失败')
      }
      return Promise.reject(res)
    }
  },
  (error) => {
    ElMessage.error(error.message || '网络异常')
    // if (!error.response) {
    //   console.error('网络异常', error)
    //   window.location.href = '/login'
    // }

    if (error.response && error.response.status === 401) {
      // Token失效，跳转到登录页面
      window.location.href = '/login' // 或者使用 Vue Router
    }
    return Promise.reject(error)
  },
)

function isAIRequest(url) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  try {
    const pathname = new URL(url, base).pathname // e.g., /task/ai-gen-task
    const segments = pathname.split('/').filter(Boolean) // 移除空段
    const last = segments[segments.length - 1] || ''
    return last.startsWith('ai-')
  } catch (e) {
    console.warn('URL解析失败:', url)
    return false
  }
}

export default service
