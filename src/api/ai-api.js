import request from '@/http/axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAuthStore } from '@/stores/authStore'
// 你原来的 callAI 不用动；这里只放 stream 版本
export function callAIStream(url, body, onChunk, opts = {}) {
  const authStore = useAuthStore()

  const {
    baseUrl = import.meta.env.VITE_API_BASE_URL || '/api', // 如果你有统一 API 前缀，填这里
    headers = { Authorization: `Bearer ${authStore.token}` }, // 例如 Authorization
    onDone,
    onError,
    signal, // 外部可传 AbortController.signal
    timeoutMs = 0, // 可选：0 表示不超时
  } = opts

  const ctrl = new AbortController()
  const mergedSignal = signal ? anySignal([signal, ctrl.signal]) : ctrl.signal

  let timeoutId = null
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => ctrl.abort(), timeoutMs)
  }

  // 这里假设后端是 SSE：Content-Type: text/event-stream
  // 且每条消息是 SSE event，data 里可能是：
  // 1) 纯文本 chunk
  // 2) JSON：{ type:"delta"|"done"|"error", data:"..." }
  return fetchEventSource(baseUrl + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body || {}),
    signal: mergedSignal,
    openWhenHidden: true, // 页面切后台也不断
    onopen(res) {
      if (!res.ok) {
        throw new Error(`SSE open failed: ${res.status} ${res.statusText}`)
      }
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('text/event-stream')) {
        throw new Error(`Not SSE: ${ct}`)
      }
    },
    onmessage(ev) {
      if (!ev.data) return

      // ✅ 1) OpenAI 风格结束标记
      if (ev.data === '[DONE]') {
        onDone?.()
        return
      }

      // ✅ 2) 先尝试 JSON
      if (ev.data[0] === '{') {
        let obj
        try {
          obj = JSON.parse(ev.data)
        } catch {
          obj = null
        }

        if (obj) {
          // ✅ 你自己定义的协议：{ type:"delta", data:"..." }
          if (obj.type === 'delta') {
            onChunk?.(obj.data ?? '')
            return
          }
          if (obj.type === 'done') {
            onDone?.()
            return
          }

          // ✅ 常见简化：{ data:"..." }
          if (obj.data != null) {
            onChunk?.(String(obj.data))
            return
          }

          // ✅ 你下游可能是：{ content:"..." }
          if (obj.content != null) {
            onChunk?.(String(obj.content))
            return
          }

          // ✅ 你下游可能是：{ message:"..." }
          if (obj.message != null) {
            onChunk?.(String(obj.message))
            return
          }

          // ✅ OpenAI/兼容：{ choices:[{ delta:{ content:"..." } }] }
          const delta = obj?.choices?.[0]?.delta?.content
          if (delta != null) {
            onChunk?.(String(delta))
            return
          }

          // ✅ 有些会是：{ choices:[{ text:"..." }] }
          const text = obj?.choices?.[0]?.text
          if (text != null) {
            onChunk?.(String(text))
            return
          }

          // ✅ 再不行就别追加（避免把 JSON 整坨显示出来）
          return
        }
      }

      // ✅ 3) 纯文本 chunk（你下游如果直接推文本）
      onChunk?.(ev.data)
    },
    onclose() {
      if (timeoutId) clearTimeout(timeoutId)
      onDone?.()
    },
    onerror(err) {
      if (timeoutId) clearTimeout(timeoutId)
      onError?.(err)
      // throw 会触发库的自动重连；聊天一般不想重连，就不 throw
      // throw err
    },
  }).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

// 给外部一个 cancel 能力（可选）
export function createStreamCanceler() {
  const ctrl = new AbortController()
  return {
    signal: ctrl.signal,
    cancel: () => ctrl.abort(),
  }
}

// 合并多个 AbortSignal（浏览器原生还没统一实现，这里自己做）
function anySignal(signals) {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  signals.forEach((s) => {
    if (!s) return
    if (s.aborted) ctrl.abort()
    else s.addEventListener('abort', onAbort, { once: true })
  })
  return ctrl.signal
}
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
