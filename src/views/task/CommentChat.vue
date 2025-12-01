<template>
  <div class="chat-container">
    <!-- 聊天记录 -->
    <div ref="historyRef" class="chat-history">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <strong>{{ msg.role === 'user' ? '你' : 'AI' }}：</strong>
        <!-- 仅 assistant 走 markdown 渲染与净化 -->
        <div v-if="msg.role === 'assistant'" class="md" v-html="renderMarkdown(msg.content)"></div>
        <div v-else class="plain">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 输入区（带悬浮等待提示） -->
    <div class="chat-input-dock">
      <el-progress
        :percentage="uploadProgress"
        v-if="uploadProgress > 0"
        :text-inside="true"
        status="active"
        style="width: 300px; margin-top: 10px"
      />

      <div class="chat-input-bar">
        <!-- 等待提示：悬浮在输入条上方，不挤布局 -->
        <div class="loading-banner" v-if="loading" aria-live="polite">
          <span class="spinner"></span>
          <span class="txt">AI 正在处理，请稍候…</span>
        </div>

        <div class="chat-input">
          <el-upload
            class="upload-plus"
            :http-request="handleUpload"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUpload"
            :show-file-list="false"
            :disabled="uploading || analyzing"
          >
            <button
              type="button"
              class="btn-upload-plus"
              :disabled="uploading || analyzing"
              aria-label="上传附件"
              title="上传附件"
            >
              <span v-if="uploading || analyzing" class="btn-spinner"></span>
              <span v-else aria-hidden="true">+</span>
            </button>
          </el-upload>
          <textarea
            ref="taRef"
            v-model="input"
            class="chat-textarea"
            placeholder="请输入任务描述…（Enter 发送，Shift+Enter 换行）"
            rows="1"
            :disabled="loading"
            @input="autoResize"
            @keydown.enter.exact.prevent="onSend"
            @keydown.enter.shift.stop
          />
          <button class="btn btn-send" @click="onSend" :disabled="!canSend">
            <template v-if="!loading">发送</template>
            <template v-else><span class="btn-spinner"></span> 发送中…</template>
          </button>
          <button class="btn btn-detail" @click="showDetail" :disabled="loading">详情</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { callAI } from '@/api/ai-api'
import { useRoute, useRouter } from 'vue-router'
import { post, upload } from '@/http/request'

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

const isFirstLoad = ref(true) // ⭐ 首次进入标记

const canSend = computed(() => !loading.value && !!input.value.trim())

const input = ref('')
const loading = ref(false)
const messages = ref([])

const uploading = ref(false)
const analyzing = ref(false)

const currentFileId = ref(null)
const attachment_id = ref(null)
const historyRef = ref(null)
const uploadProgress = ref(0)

const taRef = ref(null)
const autoResize = () => {
  const el = taRef.value
  if (!el) return
  el.style.height = 'auto' // 先还原
  el.style.height = el.scrollHeight + 'px' // 根据内容自适应
}

const onSend = () => submitToAI(input.value) // 点击/回车统一走这里

const showDetail = () => {
  if (!taskId) return
  // 跳转到任务详情页面
  router.push({ path: '/task/detail', query: { task_id: taskId } })
}

const handleUploadSuccess = async () => {}

const beforeUpload = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('附件不能大于10MB')
    return false
  }
  return true
}

function scrollToBottom() {
  nextTick(() => {
    const el = historyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

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
    const res = await post(`/task/${taskId}/attachments`, {
      file_id: fid,
      task_id: taskId,
      remark: file.name,
    })
    attachment_id.value = res
    currentFileId.value = fid
    messages.value.push({
      role: 'assistant',
      content: `✅ 上传成功（attachment_id=${attachment_id.value}）`,
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
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || String(err)
    messages.value.push({ role: 'assistant', content: `❌ 审核失败：${msg}` })
  } finally {
    analyzing.value = false
    scrollToBottom()
  }
}

// 单独提取一个提交方法，负责调用接口并返回结果
const submitToAI = async (msg, { isCommand = false, suppress = false } = {}) => {
  const content = (msg ?? '').toString().trim()
  if (!content || loading.value) return
  try {
    loading.value = true
    if (!isCommand) {
      messages.value.push({ role: 'user', content })
      if (isFirstLoad.value) isFirstLoad.value = false
    }

    const res = await callAI('/task/ai-comment', {
      user_input: content, // 支持命令式：/clear
      session_key: String(taskId || ''),
      attachment_id: String(attachment_id.value || ''),
    })

    if (!suppress) {
      switch (res.status) {
        case 'comment_complete':
          messages.value.push({ role: 'assistant', content: res.next_prompt })
          break
        default:
          messages.value.push({ role: 'assistant', content: res.next_prompt })
          break
      }
    }
  } catch {
    if (!suppress) {
      messages.value.push({ role: 'assistant', content: '任务解析失败，请重试。' })
    }
  } finally {
    if (!isCommand) input.value = ''
    loading.value = false
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

onMounted(async () => {
  if (taskId) {
    await submitToAI('/clear', { isCommand: true, suppress: true })
    await submitToAI(taskId, { isCommand: true, suppress: false })
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

/* 关键：输入区布局+尺寸 */
.chat-input {
  position: sticky; /* 贴底不抖动 */
  bottom: 0;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 12px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

/* 输入区容器：成为定位上下文，用来悬浮 loading banner */
.chat-input-dock {
  position: relative;
  width: 100%;
  background: #fff;
  border-top: 1px solid #eef1f5;
  padding: 12px 16px;
  box-sizing: border-box;
}

/* 输入行：保持你原来的 input + 两按钮样式结构 */

.chat-textarea {
  flex: 1;
  min-width: 0;
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

.upload-plus {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.btn-upload-plus {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px dashed #cbd5f5;
  background: #fff;
  color: #409eff;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.btn-upload-plus:hover:not(:disabled) {
  background: #f0f7ff;
  border-color: #409eff;
}
.btn-upload-plus:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ✅ 悬浮等待提示，不挤压布局 */
.loading-banner {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -10px; /* 可按需要微调位置 */
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

/* 按钮：与截图一致的圆角块状 */
.btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  white-space: nowrap;
}

/* 发送：浅灰紫底、白字（禁用时更浅） */
.btn-send {
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #409eff;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.btn-send:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-send:active:not(:disabled) {
  transform: translateY(1px);
}
.btn-send:disabled {
  background: #d6dbe3;
  border-color: #d6dbe3;
  color: #fff;
  cursor: not-allowed;
}

/* 清空：白底灰边 */
.btn-detail {
  color: #334155;
  background: #fff;
  border-color: #e2e8f0;
}
.btn-detail:hover {
  background: #f8fafc;
}
.btn-detail:active {
  transform: translateY(1px);
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: #fff;
  animation: blink 1s infinite ease-in-out;
}
@keyframes blink {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .btn {
    height: 36px;
    padding: 0 12px;
  }
  .chat-textarea {
    min-height: 72px;
  }
}
</style>
