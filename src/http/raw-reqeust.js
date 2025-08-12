import axios from 'axios'

// 独立创建不带拦截器的 Axios 实例
const rawInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
})

export const postRaw = (url, data = {}) => {
  return rawInstance.post(url, data, {
    transformResponse: [(data) => JSON.parse(data)],
  })
}
