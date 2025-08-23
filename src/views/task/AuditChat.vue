<template>
  <div class="chat-container">
    <!-- 聊天记录 -->
    <div ref="historyRef" class="chat-history">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <strong>{{ msg.role === 'user' ? '你' : 'AI' }}：</strong>
        <div v-if="msg.role === 'assistant'" class="md" v-html="renderMarkdown(msg.content)"></div>
        <div v-else class="plain">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 上传 + 输入区 -->
    <div class="toolbar">
      <el-upload
        class="ml-2"
        :http-request="handleUpload"
        :on-success="handleUploadSuccess"
        :before-upload="beforeUpload"
        :show-file-list="false"
      >
        <button :disabled="uploading || analyzing">
          {{ uploading ? '上传中...' : analyzing ? '审核中...' : '选择文件并审核' }}
        </button>
      </el-upload>
    </div>
    <el-progress
      :percentage="uploadProgress"
      v-if="uploadProgress > 0"
      :text-inside="true"
      status="active"
      style="width: 300px; margin-top: 10px"
    />

    <div class="chat-input">
      <input
        v-model="input"
        :disabled="sending || uploading || analyzing"
        @keydown.enter.prevent="sendMessage"
        placeholder="请输入审核意见（Shift+Enter 换行）..."
      />
      <button :disabled="sending || !input.trim()" @click="sendMessage">
        {{ sending ? '发送中...' : '发送' }}
      </button>
      <button :disabled="!taskId" @click="showDetail">详情</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { callAI } from '@/api/ai-api'
import { post, upload } from '@/http/request'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { ElMessage } from 'element-plus'

// Markdown
const md = new MarkdownIt({ breaks: true, html: false, linkify: true, typographer: true })

const route = useRoute()
const router = useRouter()
const taskId = route.query.task_id ? String(route.query.task_id) : null

const input = ref('')
const sending = ref(false)
const uploading = ref(false)
const analyzing = ref(false)

const currentFileId = ref(null)
const historyRef = ref(null)
const uploadProgress = ref(0)

const messages = ref([
  {
    role: 'assistant',
    content: taskId
      ? `已关联任务（task_id=${taskId}）。你也可以直接上传文件进行审核。`
      : '欢迎进入审核对话。可直接上传文件进行审核。',
  },
])

function scrollToBottom() {
  nextTick(() => {
    const el = historyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const handleUploadSuccess = async () => {}

const beforeUpload = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('附件不能大于10MB')
    return false
  }
  return true
}

function renderMarkdown(raw) {
  if (raw == null) return ''
  let s = String(raw).replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
  return DOMPurify.sanitize(md.render(s))
}

function showDetail() {
  if (!taskId) return
  router.push({ path: '/task/detail', query: { task_id: taskId } })
}

/* ===== 文件上传 → 触发审核 → 轮询 → 拉取结果 ===== */

async function handleUpload({ file, onSuccess, onError }) {
  // —— 上传阶段 ——
  try {
    uploading.value = true
    messages.value.push({ role: 'assistant', content: `📤 正在上传「${file.name}」...` })
    scrollToBottom()

    const resp = await upload(
      '/file/upload',
      file,
      {},
      {
        onUploadProgress: (e) => {
          if (e.total) {
            uploadProgress.value = Math.round((e.loaded / e.total) * 100)
          }
        },
      }
    )

    onSuccess?.(resp) // 通知 el-upload 成功

    const fid = resp?.file_id || resp
    if (!fid) throw new Error('上传返回无 file_id')
    await post(`/task/${taskId}/attachments`, {
      file_id: fid,
      task_id: taskId,
      remark: file.name,
    })

    currentFileId.value = fid
    messages.value.push({
      role: 'assistant',
      content: `✅ 上传成功（file_id=${fid}），开始审核...`,
    })
    scrollToBottom()
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || String(err)
    messages.value.push({ role: 'assistant', content: `❌ 上传失败：${msg}` })
    onError?.(err) // 通知 el-upload 失败
    uploading.value = false
    scrollToBottom()
    return
  } finally {
    uploading.value = false
  }

  // —— 审核阶段（触发 LLM → 轮询 → 拉取结果） ——
  try {
    analyzing.value = true

    // 2) 触发 LLM 审核
    await submitToAI(String(currentFileId.value || ''))
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || String(err)
    messages.value.push({ role: 'assistant', content: `❌ 审核失败：${msg}` })
  } finally {
    analyzing.value = false
    scrollToBottom()
  }
}

/* ===== 原有聊天 ===== */

async function submitToAI(msg) {
  const res = await callAI('/task/ai-audit', {
    user_input: msg,
    session_key: String(taskId || ''),
  })
  const status = (res && res.status) || 'ok'
  const data = res?.data ?? res?.payload
  const next = res?.next_prompt || res?.message

  switch (status) {
    case 'audit_complete':
      messages.value.push({ role: 'assistant', content: '✅ 已提交审核结果入库。' })
      break
    case 'review_needed': {
      const total = data?.summary?.stats?.total ?? data?.issues?.length ?? 0
      const byCat = data?.summary?.stats?.by_category || {}
      const line = data?.summary?.summary_line || `发现 ${total} 处问题。`
      messages.value.push({
        role: 'assistant',
        content: `${line}\n分类统计：\n\`\`\`json\n${JSON.stringify(
          byCat,
          null,
          2
        )}\n\`\`\`\n是否提交入库？（回复：确认 / 取消）`,
      })
      break
    }
    default:
      messages.value.push({ role: 'assistant', content: next || '已处理。' })
      break
  }
}

async function sendMessage() {
  const text = input.value
  if (!text.trim() || sending.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  sending.value = true
  scrollToBottom()
  try {
    await submitToAI(text)
  } catch {
    messages.value.push({ role: 'assistant', content: '❌ 请求失败，请稍后重试。' })
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

onMounted(() => {})
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
.chat-msg {
  margin: 8px 0;
  line-height: 1.6;
}
.chat-msg.user {
  text-align: right;
}
.chat-msg.assistant {
  text-align: left;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.chat-input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.chat-input input {
  flex: 1;
  padding: 8px;
}
.md :deep(pre) {
  overflow: auto;
  padding: 8px;
  background: #f6f6f6;
  border-radius: 6px;
}
</style>
