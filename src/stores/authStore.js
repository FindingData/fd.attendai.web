// src/stores/authStore.js
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { post } from '@/http/request'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(username, password) {
      try {
        const res = await post('/auth/web-login', { username, password, Device_Type: 'web' })
        this.token = res.token
        this.user = res
        localStorage.setItem('token', res.token)
        localStorage.setItem('user', JSON.stringify(res))

        ElMessage.success('登录成功')
        router.push('/')
      } catch (error) {
        ElMessage.error(error.message || '登录失败')
        throw error
      }
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      router.push('/login')
    },
    hasPermission(key) {
      if (!this.user || !this.user.resource_keys) return false
      return this.user.resource_keys.includes(key)
    },
  },
})
