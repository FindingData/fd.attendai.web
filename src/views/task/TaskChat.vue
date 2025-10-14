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
        <textarea
          ref="taRef"
          v-model="input"
          class="chat-textarea"
          placeholder="请输入任务描述…（Enter 发送，Shift+Enter 换行）"
          rows="1"
          @input="autoResize"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.stop
        />
        <div class="btns">
          <button class="send-btn" @click="sendMessage" :disabled="!input.trim()">发送</button>
          <button class="ghost-btn" @click="clearContext">清空上下文</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { callAI } from '@/api/ai-api'

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  breaks: true, // 让单个换行也生效
  html: false, // 禁止原生 HTML（更安全）
  linkify: true,
  typographer: true,
})

const input = ref('')
const messages = ref([{ role: 'system', content: '欢迎使用任务AI助手，请输入任务需求。' }])

const taRef = ref('')
const autoResize = () => {
  const el = taRef.value
  if (!el) return
  el.style.height = 'auto' // 先还原
  el.style.height = el.scrollHeight + 'px' // 根据内容自适应
}

const clearContext = async () => {
  input.value = 'clear'
  await sendMessage()
  nextTick(autoResize)
}

const sendMessage = async () => {
  if (!input.value.trim()) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: input.value })
  try {
    const res = await callAI('/task/ai-chat', {
      user_input: input.value,
      //session_id: authStore.token,
    })
    switch (res.status) {
      case 'query_complete':
        messages.value.push({ role: 'assistant', content: JSON.stringify(res.data) })
        break
      case 'create_complete':
        messages.value.push({ role: 'assistant', content: JSON.stringify(res.data) })
        break
      case 'update_complete':
        messages.value.push({ role: 'assistant', content: JSON.stringify(res.data) })
        break
      default:
        messages.value.push({ role: 'assistant', content: res.next_prompt })
        break
    }
  } catch {
    messages.value.push({ role: 'assistant', content: '任务解析失败，请重试。' })
  }
  input.value = ''
  nextTick(autoResize)
}

nextTick(autoResize)

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
  background: #fff;
  border-top: 1px solid #eef1f5;
  padding: 12px 16px;
  box-sizing: border-box;
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

@media (max-width: 640px) {
  .chat-input-dock {
    padding: 10px 12px;
  }
  .input-row {
    gap: 8px;
  }
}
</style>
