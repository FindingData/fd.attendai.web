import request from '@/http/axios'

/**
 * AI接口专用调用，保留完整结构（ai_status, next_prompt, data）
 * @param {string} url
 * @param {object} input
 * @returns {Promise<object>} 返回完整结构
 */
export async function callAI(url, input = {}, timeoutMs = 60000) {
  const raw = await request.post(url, input, {
    timeout: timeoutMs,
    transformResponse: [
      (data) => {
        if (data == null) return data
        // axios 在 content-type=application/json 时会自动 parse；
        // 但有些后端用 text/plain，这里兜底
        if (typeof data === 'string') {
          try {
            return JSON.parse(data)
          } catch {
            /* 保留原样 */
          }
        }
        return data
      },
    ],
  })
  if (raw?.status === 'error') {
    throw new Error(raw.message || 'AI请求失败')
  }

  return raw
}
