import request from '@/http/axios'

/**
 * AI接口专用调用，保留完整结构（ai_status, next_prompt, data）
 * @param {string} url
 * @param {object} input
 * @returns {Promise<object>} 返回完整结构
 */
export async function callAI(url, input = {}) {
  const raw = await request.post(url, input, {
    transformResponse: [(data) => JSON.parse(data)],
  })

  if (raw.status === 'error') {
    throw new Error(raw.message || 'AI请求失败')
  }

  return raw
}
