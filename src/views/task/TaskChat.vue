<template>
  <div class="chat-container">
    <!-- 聊天记录 -->
    <div class="chat-history">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <strong>{{ msg.role === 'user' ? '你' : 'AI' }}：</strong>
        <div v-if="msg.role === 'assistant'" v-html="msg.content"></div>
        <div v-else>{{ msg.content }}</div>
      </div>
    </div>

    <!-- AI 生成任务结果 -->
    <div v-if="taskResult" class="task-preview">
      <h3>AI生成任务：</h3>
      <ul>
        <li><strong>任务名：</strong>{{ taskResult.task_name }}</li>
        <li><strong>描述：</strong>{{ taskResult.task_desc }}</li>
        <li><strong>类型ID：</strong>{{ taskResult.task_type_id }}</li>
        <li><strong>负责人：</strong>{{ taskResult.executor_names?.join(',') }}</li>
        <li><strong>执行人：</strong>{{ taskResult.executor_ids?.join(', ') }}</li>
        <li><strong>标签名称</strong>{{ taskResult.tag_names?.join(', ') }}</li>
        <li><strong>截止时间：</strong>{{ taskResult.due_date }}</li>
      </ul>
    </div>

    <!-- 输入区 -->
    <div class="chat-input">
      <input v-model="input" @keydown.enter="sendMessage" placeholder="请输入任务描述..." />
      <button @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { callAI } from '@/api/ai-api'
import { useAuthStore } from '@/stores/authStore'
export default {
  setup() {
    const input = ref('')
    const messages = ref([{ role: 'system', content: '欢迎使用任务AI助手，请输入任务需求。' }])
    const taskResult = ref(null)
    const authStore = useAuthStore()
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
    }

    return {
      input,
      messages,
      taskResult,
      sendMessage,
    }
  },
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
</style>
