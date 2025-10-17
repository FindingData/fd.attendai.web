// src/stores/authStore.js
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { get, post } from '@/http/request'
import router from '@/router'

function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    _timer: null,
    _alidating: false,
  }),
  getters: {
    isLoggedIn: (state) => !state.isExpired && !!state.token,
    expMs() {
      const p = decodeJwtPayload(this.token)
      return p && p.exp ? p.exp * 1000 : 0
    },
    msLeft() {
      return this.expMs ? this.expMs - Date.now() : 0
    },
    isExpired() {
      return !this.token || this.msLeft <= 0
    },
    prettyLeft() {
      const s = Math.max(Math.floor(this.msLeft / 1000), 0)
      const m = Math.floor(s / 60),
        r = s % 60
      return m > 0 ? `${m}分${r}秒` : `${r}秒`
    },
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
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      } // ← 补上
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      this.scheduleExpiryAction()
      router.push('/login')
    },
    async validate() {
      // 若本地没有 token，没必要打接口
      if (!this.token) return false
      if (this._validating) return false
      this._validating = true
      try {
        // 成功即代表服务端认可；可选：用响应里的 msLeft 同步本地倒计时
        const res = await get('/auth/validate', {})
        // 如果服务端返回 msLeft，可按需重排过期计时器（可选）
        // if (typeof data?.msLeft === 'number') this._rescheduleByServerMsLeft(data.msLeft)
        return true
      } catch (e) {
        // 任何错误（401/403/网络错误）都当作无效处理
        this.logout()
        return false
      } finally {
        this._validating = false
      }
    },
    async init() {
      // 恢复状态后先做本地判断
      if (!this.token) return
      if (this.isExpired) {
        this.logout()
        return
      }
      // 先安排到期动作，避免“窗口期”
      this.scheduleExpiryAction()

      // 轻校验一次（捕获服务器吊销/密钥轮换）
      await this.validate()
    },
    hasPermission(key) {
      if (!this.user || !this.user.resource_keys) return false

      return this.user.resource_keys.includes(key)
    },
    scheduleExpiryAction() {
      if (this._timer) clearTimeout(this._timer)
      if (!this.token) return
      // 提前 120s 处理，避免“刚好过期”抖动
      const lead = 120 * 1000
      const wait = Math.max(this.msLeft - lead, 0)
      console.log(`计划在 ${this.msLeft / 1000} 后执行过期处理`)
      this._timer = setTimeout(() => {
        // 到点动作：直接清空并跳登录页（或尝试调用你的刷新接口）
        this.logout()
        // 这里触发路由跳转，例如：router.push('/login')
      }, wait)
    },
  },
})
