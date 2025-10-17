<template>
  <div class="chat-container">
    <!-- 聊天记录 -->
    <div class="chat-history">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <strong>{{ msg.role === 'user' ? '你' : 'AI' }}：</strong>
        <div v-if="msg.role === 'assistant'" class="md" v-html="renderMarkdown(msg.content)"></div>
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
import { ref, nextTick, computed } from 'vue'
import { callAI } from '@/api/ai-api'

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  breaks: true, // 让单个换行也生效
  html: false, // 禁止原生 HTML（更安全）
  linkify: true,
  typographer: true,
})
const loading = ref(false)
const input = ref('')
const messages = ref([{ role: 'system', content: '欢迎使用任务AI助手，请输入任务需求。' }])
const isFirstLoad = ref(true)
const canSend = computed(() => !loading.value && !!input.value.trim())
const taRef = ref('')
const autoResize = () => {
  const el = taRef.value
  if (!el) return
  el.style.height = 'auto' // 先还原
  el.style.height = el.scrollHeight + 'px' // 根据内容自适应
}

const clearContext = async () => {
  // 命令式：通过发送管道走 /clear，但不把命令显示到消息区
  await sendMessage('/clear', /*isCommand*/ true, /*suppressAssistant*/ isFirstLoad.value)
  nextTick(autoResize)
}
// 统一发送：可传 text & 是否命令
const sendMessage = async (text, isCommand = false, suppressAssistant = false) => {
  const content = (text ?? input.value).trim()
  if (!content || loading.value) return

  loading.value = true
  try {
    // 命令不入消息区；普通消息才 push 用户消息
    if (!isCommand) {
      messages.value.push({ role: 'user', content })
    }
    if (isFirstLoad.value) isFirstLoad.value = false

    const res = await callAI('/task/ai-chat', {
      user_input: content,
      // session_id: authStore.token,
    })

    // 后端返回分支
    if (!suppressAssistant) {
      switch (res.status) {
        case 'query_complete':
        case 'create_complete':
        case 'update_complete':
          messages.value.push({ role: 'assistant', content: JSON.stringify(res.data) })
          break
        default:
          messages.value.push({ role: 'assistant', content: res.next_prompt })
          break
      }
    }
  } catch {
    messages.value.push({ role: 'assistant', content: '任务解析失败，请重试。' })
  } finally {
    // 只有在不是命令时，才清空输入框
    if (!isCommand) input.value = ''
    await nextTick()
    autoResize()
    loading.value = false
  }
}

clearContext()

/** 把模型输出（可能带外层引号 & \n）转为安全 HTML */
function renderMarkdown(raw) {
  if (raw == null) return ''
  let s = String(raw)
  // 去掉可能的开头/结尾引号（很多 LLM 会包一层）
  s = s.replace(/^"|"$/g, '')
  // 把转义的 \n 变成真正换行
  s = s.replace(/\\n/g, '\n')
  // 可选：把转义的 \t 也还原
  s = s.replace(/\\t/g, '\t')
  // 转 HTML 并净化
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
  position: relative; /* ← 新增 */
  background: #fff;
  border-top: 1px solid #eef1f5;
  padding: 12px 16px;
  box-sizing: border-box;
}

/* 提示条改为悬浮，不占据布局空间 */
.loading-banner {
  position: absolute; /* ← 改为绝对定位 */
  left: 50%;
  transform: translateX(-50%);
  top: -10px; /* 贴着输入区上沿，可按需微调 -14 ~ 0 */
  z-index: 2;
  pointer-events: none; /* 避免挡住输入与按钮 */

  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f0f7ff;
  border: 1px solid #e1efff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}
/* 可选：窄屏时稍微靠近输入条 */
@media (max-width: 640px) {
  .loading-banner {
    top: -6px;
    padding: 6px 10px;
  }
}

/* 其余已存在样式保持不变（示例） */
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
  /* 拉宽：占满容器，并设置一个合理的最大宽度 */
  width: 100%;
  max-width: 960px; /* 你也可以改成 1140px/1280px */
  margin: 0 auto;

  display: grid;
  grid-template-columns: 1fr auto; /* 文本域占满，按钮自适应 */
  gap: 12px;
  align-items: end;
}

.chat-textarea {
  width: 100%;
  min-height: 44px; /* 初始就更高一些 */
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
  box-sizing: border-box; /* 避免 padding 导致宽度超出 */
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

/* 工具栏：两枚文本按钮 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.left {
  display: flex;
  gap: 6px;
}
.spacer {
  flex: 1;
}

.tool-btn {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  opacity: 0.9;
  cursor: pointer;
}
.tool-btn:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-color: color-mix(in srgb, currentColor 18%, transparent);
}
.tool-btn:active {
  transform: translateY(1px);
}

/* 等待提示：动态省略号 */
.loading-hint {
  max-width: 960px;
  margin: 8px auto 0;
  font-size: 13px;
  opacity: 0.85;
  user-select: none;
}
.dots {
  display: inline-block;
  width: 1.4em;
  text-align: left;
}
.dots i {
  opacity: 0;
  animation: blink 1.4s infinite;
  font-style: normal;
}
.dots i:nth-child(1) {
  animation-delay: 0s;
}
.dots i:nth-child(2) {
  animation-delay: 0.2s;
}
.dots i:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%,
  20% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (max-width: 640px) {
  .chat-input-dock {
    padding: 10px 12px;
  }
  .chat-input-bar {
    gap: 8px;
  }
}
</style>
