<template>
  <div class="chat-container">
    <!-- 聊天记录 -->
    <div class="chat-history">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <strong>{{ msg.role === 'user' ? '你' : 'AI' }}：</strong>
        <!-- 仅 assistant 走 markdown 渲染与净化 -->
        <div v-if="msg.role === 'assistant'" class="md" v-html="renderMarkdown(msg.content)"></div>
        <div v-else class="plain">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="chat-input">
      <input v-model="input" @keydown.enter="sendMessage" placeholder="请输入任务描述..." />
      <button @click="sendMessage">发送</button>
      <button @click="showDetail">详情</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { callAI } from '@/api/ai-api'
import { useRoute, useRouter } from 'vue-router'

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  breaks: true, // 让单个换行也生效
  html: false, // 禁止原生 HTML（更安全）
  linkify: true,
  typographer: true,
})

const route = useRoute()
const router = useRouter()

const taskId = route.query.task_id || null // 从路由参数获取 task_id

const input = ref('')
const messages = ref([{ role: 'system', content: '欢迎使用任务AI助手，请输入你要反馈的内容。' }])

const sendMessage = async () => {
  if (!input.value.trim()) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: input.value })
  try {
    await submitToAI(input.value)
  } catch {
    messages.value.push({ role: 'assistant', content: '任务解析失败，请重试。' })
  }
  input.value = ''
}

const showDetail = () => {
  if (!taskId) return
  // 跳转到任务详情页面
  router.push({ path: '/task/detail', query: { task_id: taskId } })
}

// 单独提取一个提交方法，负责调用接口并返回结果
const submitToAI = async (msg) => {
  const res = await callAI('/task/ai-comment', {
    user_input: msg,
    session_key: String(taskId || ''),
  })
  switch ((res.status = status)) {
    case 'comment_complete':
      messages.value.push({ role: 'assistant', content: JSON.stringify(res.data) })
      break
    default:
      messages.value.push({ role: 'assistant', content: res.next_prompt })
      break
  }
}

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

onMounted(() => {
  if (taskId) {
    // 进入界面时默认发送一条带 task_id 的消息
    submitToAI(taskId)
  }
})
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
</style>
