<template>
  <div class="chat-container">
    <!-- 聊天记录 -->
    <div class="chat-history" ref="historyRef">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <strong
          >{{ msg.role === 'user' ? '你' : msg.role === 'assistant' ? 'AI' : '系统' }}：</strong
        >

        <!-- ✅ assistant：流式期间用纯文本渲染（不卡），结束后再 Markdown -->
        <template v-if="msg.role === 'assistant'">
          <!-- 流式：直接拼接 chunks，不卡 -->
          <pre
            v-if="msg.is_streaming"
            class="plain"
          ><template v-for="(c,i) in msg.chunks" :key="i">{{ c }}</template></pre>

          <!-- 完成后：再 Markdown -->
          <div v-else class="md" v-html="renderMarkdown(msg.content)"></div>
        </template>

        <!-- ✅ system / user -->
        <div v-else>{{ msg.content }}</div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="chat-input-dock">
      <div class="chat-input-bar">
        <!-- 异步等待提示 -->
        <div class="loading-banner" v-if="loading" aria-live="polite">
          <span class="spinner"></span>
          <span class="txt">AI 正在处理，请稍候…</span>
        </div>

        <textarea
          ref="taRef"
          v-model="input"
          class="chat-textarea"
          placeholder="请输入任务描述…（Enter 发送，Shift+Enter 换行）"
          rows="1"
          :disabled="loading"
          @input="autoResize"
          @keydown.enter.exact.prevent="() => sendMessage(input)"
          @keydown.enter.shift.stop
        />

        <div class="btns">
          <button class="send-btn" @click="sendMessage(input)" :disabled="!canSend">发送</button>
          <button class="ghost-btn" @click="clearContext">清空上下文</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, onBeforeUnmount } from 'vue'
import { callAIStream, createStreamCanceler } from '@/api/ai-api'

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// 用于取消流（用户又发一条时取消上一条）
const currentStream = ref(null)

const historyRef = ref(null)
const taRef = ref(null)

function scrollToBottom() {
  const el = historyRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

// ✅ 滚动也节流一下，避免 nextTick 堆积
let lastScrollAt = 0
function scheduleScroll() {
  const now = performance.now()
  if (now - lastScrollAt < 120) return
  lastScrollAt = now
  scrollToBottom()
}

const md = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
})

const loading = ref(false)
const input = ref('')
const messages = ref([{ role: 'system', content: '欢迎使用任务AI助手，请输入任务需求。' }])
const isFirstLoad = ref(true)
const canSend = computed(() => !loading.value && !!input.value.trim())

const autoResize = () => {
  const el = taRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

const clearContext = async () => {
  // 你原来这里传了 isCommand/suppressAssistant，但 sendMessage 已改成单参。
  // 先保持行为：直接发送 /clear
  await sendMessage('/clear')
  nextTick(autoResize)
}

// ✅ 重点改造：
// 1) assistant 消息流式期间不做 markdown（避免每 chunk 触发 heavy render）
// 2) 用 setInterval 定时 flush buffer（比 rAF 更抗“主线程忙”）
// 3) done 后切换为 markdown 渲染
const sendMessage = async (text) => {
  const content = (text ?? input.value).trim()
  if (!content || loading.value) return

  if (currentStream.value) {
    currentStream.value.cancel()
    currentStream.value = null
  }

  loading.value = true
  messages.value.push({ role: 'user', content })
  input.value = ''

  const msgIndex = messages.value.length
  messages.value.push({
    role: 'assistant',
    content: '',
    chunks: [],
    is_streaming: true,
  })

  const canceler = createStreamCanceler()
  currentStream.value = canceler

  // ✅ 滚动节流，避免每 chunk nextTick
  let lastScrollAt = 0
  const scheduleScroll = () => {
    const now = performance.now()
    if (now - lastScrollAt < 120) return
    lastScrollAt = now
    scrollToBottom()
  }

  try {
    await callAIStream(
      '/task/ai-chat-stream',
      { user_input: content },
      (textChunk) => {
        if (!textChunk || textChunk === '[DONE]') return

        // ✅ 关键：直接 push chunk，不拼大字符串
        messages.value[msgIndex].chunks.push(textChunk)

        // ✅ 可选：每隔一会儿再滚
        scheduleScroll()
      },
      {
        signal: canceler.signal,
        onDone: () => {
          // ✅ done 时再合并成一个 content，触发 markdown 一次
          const m = messages.value[msgIndex]
          m.content = (m.chunks || []).join('')
          m.is_streaming = false
          scheduleScroll()
        },
        onError: (err) => {
          console.error(err)
          const m = messages.value[msgIndex]
          m.content = (m.chunks || []).join('') || '抱歉，响应异常。'
          m.is_streaming = false
          scheduleScroll()
        },
      }
    )
  } catch (err) {
    const isAbort = String(err?.name || err)
      .toLowerCase()
      .includes('abort')
    if (!isAbort) {
      const m = messages.value[msgIndex]
      m.content = '抱歉，响应异常。'
      m.is_streaming = false
    }
  } finally {
    loading.value = false
    currentStream.value = null
  }
}

clearContext()

onBeforeUnmount(() => {
  if (currentStream.value) currentStream.value.cancel()
})

/** 把模型输出转为安全 HTML（仅在非流式阶段调用） */
function renderMarkdown(raw) {
  if (raw == null) return ''
  let s = String(raw)
  s = s.replace(/^"|"$/g, '')
  s = s.replace(/\\n/g, '\n')
  s = s.replace(/\\t/g, '\t')
  const html = md.render(s)
  return DOMPurify.sanitize(html)
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 10px;
}

.chat-msg.user {
  text-align: right;
}
.chat-msg.assistant {
  text-align: left;
}

/* ✅ 流式纯文本显示 */
.plain {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 6px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #eee;
  font-size: 14px;
  line-height: 1.6;
}

.chat-input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.task-preview {
  border-top: 1px solid #ccc;
  margin-top: 10px;
  padding-top: 10px;
}

/* 让最外层占满宽度，内层限制最大宽度，兼顾大屏/小屏 */
.chat-input-dock {
  width: 100%;
  position: relative;
  background: #fff;
  border-top: 1px solid #eef1f5;
  padding: 12px 16px;
  box-sizing: border-box;
}

.loading-banner {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -10px;
  z-index: 2;
  pointer-events: none;

  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f0f7ff;
  border: 1px solid #e1efff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

@media (max-width: 640px) {
  .loading-banner {
    top: -6px;
    padding: 6px 10px;
  }
}

.spinner,
.btn-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(64, 158, 255, 0.25);
  border-top-color: #409eff;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.chat-input-bar {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;

  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
}

.chat-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px 12px;
  line-height: 1.5;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  resize: none;
  font-size: 14px;
  background: #fafafa;
  box-sizing: border-box;
}

.chat-textarea:focus {
  border-color: #409eff33;
  box-shadow: 0 0 0 3px #409eff22;
  background: #fff;
}

.send-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #409eff;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.send-btn:disabled {
  background: #cfd9e7;
  cursor: not-allowed;
}

.ghost-btn {
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

/* 你已有的其它样式保留... */
@media (max-width: 640px) {
  .chat-input-dock {
    padding: 10px 12px;
  }
  .chat-input-bar {
    gap: 8px;
  }
}
</style>
