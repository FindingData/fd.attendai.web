<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>任务详情</span>
      </div>
    </template>
    <el-descriptions :column="2" border :loading="loading">
      <el-descriptions-item label="任务名称">
        {{ task.task_name }}
        <el-tag v-if="task.has_return_apply_pending" size="small" type="danger" effect="dark">
          待退回
        </el-tag>
        <el-tag v-if="task.is_ai_gen" size="middle" @click="viewChat" type="success" class="ml-1"
          >AI</el-tag
        >
      </el-descriptions-item>
      <el-descriptions-item label="任务类型">{{ task.task_type_name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="前置任务">
        <template v-if="task.pre_tasks && task.pre_tasks.length">
          <div class="pre-task-line" v-for="pre in task.pre_tasks" :key="pre.task_id">
            <el-link type="primary" @click="goSubTask(pre.task_id)">
              {{ pre.task_name }}
            </el-link>
            <el-tag
              size="small"
              :type="pre.status_text === '已完成' ? 'success' : 'info'"
              class="ml-1"
            >
              {{ pre.status_text || '-' }}
            </el-tag>
            <span class="pre-due ml-1" v-if="pre.due_date"
              >（截止：{{ formatDate(pre.due_date) }}）</span
            >
          </div>
        </template>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="后续任务">
        <template v-if="task.next_tasks && task.next_tasks.length">
          <div class="next-task-line" v-for="n in task.next_tasks" :key="n.task_id">
            <el-link type="primary" @click="goSubTask(n.task_id)">
              {{ n.task_name }}
            </el-link>
            <el-tag
              size="small"
              :type="n.status_text === '已完成' ? 'success' : 'info'"
              class="ml-1"
            >
              {{ n.status_text || '-' }}
            </el-tag>
            <span class="ml-1 pre-due" v-if="n.due_date"
              >（截止：{{ formatDate(n.due_date) }}）</span
            >
          </div>
        </template>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="标签">
        <el-tag v-for="tag in tagList" :key="tag" class="mr-1" type="info">
          {{ tag.tag_name }}
        </el-tag>
        <span v-if="tagList.length === 0">-</span>
      </el-descriptions-item>
      <el-descriptions-item label="优先级">
        <el-rate :model-value="task.priority_level || 0" :max="5" disabled show-score />
      </el-descriptions-item>
      <el-descriptions-item label="执行人">{{ task.executor_name }}</el-descriptions-item>
      <el-descriptions-item label="任务状态">{{ task.status_text }}</el-descriptions-item>
      <el-descriptions-item label="截止时间">
        {{ formatDate(task.due_date) }}
      </el-descriptions-item>
      <el-descriptions-item label="完成时间">
        {{ formatDate(task.completed_date) }}
      </el-descriptions-item>

      <el-descriptions-item label="备注">{{ task.task_remark || '-' }}</el-descriptions-item>
      <el-descriptions-item label="创建人">
        {{ task.created_name }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="mt-4 flex-row">
      <el-button type="primary" @click="goBack">返回</el-button>
      <el-button type="success" v-if="isExecutor" @click="replyTask">反馈</el-button>
      <el-button
        type="success"
        v-if="can_complete"
        @click="completeTask"
        :disabled="task.status_text === '已完成'"
        >完成任务</el-button
      >
      <el-button
        type="success"
        v-if="canApplyReturn"
        @click="apllyReturnTask"
        :disabled="task.status_text === '已完成'"
        >申请退回</el-button
      >
      <el-button type="danger" v-if="canReviewReturn" @click="reviewReturnTask">
        处理退回申请
      </el-button>
      <el-upload
        class="ml-2"
        :http-request="handleUpload"
        :on-success="handleUploadSuccess"
        :before-upload="beforeUpload"
        :show-file-list="false"
      >
        <el-button type="primary">上传附件</el-button>
      </el-upload>
    </div>
    <template v-if="!isWorkLog && task.sub_tasks && task.sub_tasks.length > 0">
      <el-divider content-position="left">子任务列表</el-divider>
      <el-table :data="task.sub_tasks || []" size="small">
        <el-table-column label="任务名称" prop="task_name" />
        <el-table-column label="执行人" prop="executor_name" />
        <el-table-column label="状态" prop="status_text" />
        <el-table-column label="截止时间">
          {{ formatDate(task.due_date) }}
        </el-table-column>
        <el-table-column label="完成时间">
          {{ formatDate(task.completed_date) }}
        </el-table-column>
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button type="default" size="small" @click="goSubTask(row.task_id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-divider content-position="left">附件列表</el-divider>
    <el-progress
      :percentage="uploadProgress"
      v-if="uploadProgress > 0"
      :text-inside="true"
      status="active"
      style="width: 300px; margin-top: 10px"
    />
    <el-table :data="attachments" size="small" style="margin-top: 10px">
      <el-table-column label="文件名" prop="file_name" />
      <el-table-column
        label="大小"
        prop="file_size"
        :formatter="(row) => formatSize(row.file_size)"
        width="100px"
      />
      <el-table-column label="上传时间" prop="created_at" />
      <el-table-column label="上传人" prop="created_by" width="150px" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <a :href="`${apiBaseUrl}/file/download/${row.file_id}`" target="_blank">下载</a>
          <el-divider direction="vertical" />
          <el-button
            type="default"
            size="small"
            @click="viewSummary(row)"
            :loading="extractingFileId === row.file_id"
          >
            摘要
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-divider content-position="left">反馈列表</el-divider>
    <TaskComment v-if="task.task_id" :task-id="task.task_id" />
  </el-card>

  <el-dialog v-model="descDialogVisible" title="AI摘要" width="600px">
    <div style="white-space: pre-wrap; font-size: 14px; color: #333">
      {{ taskDescContent }}
    </div>
    <template #footer>
      <el-button @click="descDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="summaryDialogVisible" title="文件摘要" width="600px">
    <div style="white-space: pre-wrap; font-size: 14px; color: #333">
      {{ summaryContent }}
    </div>
    <template #footer>
      <el-button @click="summaryDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="applyDialogVisible" title="申请任务退回" width="400px">
    <el-form :model="applyForm" ref="applyFormRef" label-position="top">
      <el-form-item
        label="退回原因"
        prop="reason"
        :rules="[{ required: true, message: '请填写退回原因', trigger: 'blur' }]"
      >
        <el-input
          v-model="applyForm.reason"
          type="textarea"
          :rows="3"
          placeholder="请详细说明您申请退回的原因"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="applyDialogVisible = false">取消</el-button>
      <el-button type="warning" @click="confirmApplyReturn">提交申请</el-button>
    </template>
  </el-dialog>

  <!-- 审核退回 -->
  <el-dialog v-model="reviewDialogVisible" title="处理退回申请" width="500px">
    <el-form :model="reviewForm" label-width="80px">
      <el-form-item label="申请原因">
        <el-input
          :model-value="task.pending_return_reason || '未提供原因'"
          type="textarea"
          :rows="3"
          disabled
        />
      </el-form-item>

      <el-form-item label="处理意见">
        <el-radio-group v-model="reviewForm.aggree">
          <el-radio :label="true">同意退回</el-radio>
          <el-radio :label="false">驳回申请</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="reviewForm.remark"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="可填写同意/驳回原因"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="reviewDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmReviewReturn">确认处理</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, watch, computed, onMounted, watchEffect } from 'vue'
import { ElMessage } from 'element-plus'
import { get, post, upload } from '@/http/request'
import dayjs from 'dayjs'

import TaskComment from './components/TaskCommendTable.vue'

import { TaskTypeEnum } from '@/constants/taskEnums'
import { useAuthStore } from '@/stores/authStore'
const auth = useAuthStore()

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const loading = ref(false)
const router = useRouter()
const route = useRoute()
const task = ref(route.query.task || {})
const tagList = computed(() => (Array.isArray(task.value.tags) ? task.value.tags : []))
const attachments = ref([])
const uploadProgress = ref(0)

const summaryDialogVisible = ref(false)
const summaryContent = ref('')

const taskDescContent = ref('')
const descDialogVisible = ref(false)

const applyDialogVisible = ref(false)
const applyFormRef = ref(null)
const applyForm = ref({
  reason: '',
})

const extractingFileId = ref(null)
const current_user_id = computed(() => auth.user?.user_id)

const can_complete = computed(
  () => task.value && current_user_id.value && task.value.created_by === current_user_id.value
)

// 检查当前用户是否是执行人
const isExecutor = computed(() => {
  return task.value && current_user_id.value === task.value.executor_by
})

const canApplyReturn = computed(() => {
  const status_text = task.value.status_text
  const canStatus = status_text === '进行中'
  return isExecutor.value && canStatus && !task.value.has_return_apply_pending
})

// 管理员/创建人能否审批：任务状态必须是 RETURN_REQ (待审批)，且当前用户是创建人 (作为审批人)
const canReviewReturn = computed(() => {
  // 假设创建人是审批退回申请的默认角色
  return task.value.has_return_apply_pending && current_user_id.value === task.value.created_by
})

const reviewReturnAgree = ref(true)
const reviewDialogVisible = ref(false)
const reviewFormRef = ref(null)
const reviewForm = ref({
  aggree: true,
  remark: '',
})

// 1. 弹出申请对话框
const apllyReturnTask = () => {
  applyForm.value.reason = ''
  applyDialogVisible.value = true
}

// 1. 弹出审批对话框
const reviewReturnTask = () => {
  reviewForm.value.aggree = true
  reviewForm.value.remark = '同意退回申请'
  reviewDialogVisible.value = true
}

// 监听 reviewForm.aggree 的变化并修改备注
watch(
  () => reviewForm.value.aggree,
  (newValue) => {
    // 确保只在对话框显示时自动填充，避免在初始化时触发不必要的修改
    if (!reviewDialogVisible.value) {
      return
    }

    if (newValue === true) {
      // 切换到“同意退回”
      reviewForm.value.remark = '同意退回申请'
    } else {
      // 切换到“驳回申请”
      reviewForm.value.remark = '驳回申请，请重新提交'
    }
  }
)

// 2. 确认审批操作 (批准或拒绝)
const confirmReviewReturn = async (action) => {
  if (!task.value?.pending_return_apply_id) {
    ElMessage.error('未找到待处理的退回申请')
    return
  }

  try {
    await post('/task/return/review', {
      return_apply_id: task.value.pending_return_apply_id,
      agree: reviewForm.value.aggree,
      remark: reviewForm.value.remark,
      // approver_id 同样由后端从登录上下文取
    })
    ElMessage.success(reviewForm.value.aggree ? '已同意退回申请' : '已驳回退回申请')
    reviewDialogVisible.value = false
    await fetchTask()
  } catch (e) {
    ElMessage.error(e?.message || '处理退回申请失败')
  }
}

// 2. 确认提交申请
const confirmApplyReturn = () => {
  applyFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 调用后端 API 发起退回申请
        await post(`/task/return/apply`, {
          task_id: task.value.task_id,
          reason: applyForm.value.reason,
          // created_by (申请人) 后端应从 token/session 中获取
        })
        ElMessage.success('任务退回申请已提交，等待审批')
        applyDialogVisible.value = false
        // 重新拉取任务详情，更新状态到 RETURN_REQ
        fetchTask()
      } catch (e) {
        ElMessage.error(e?.message || '任务退回申请失败')
      }
    }
  })
}

const getFileType = (fileName) => {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

const viewChat = async () => {
  if (task.value.task_desc) {
    taskDescContent.value = task.value.task_desc
    descDialogVisible.value = true
    return
  }
}

const viewSummary = async (row) => {
  if (row.file_summary) {
    summaryContent.value = row.file_summary
    summaryDialogVisible.value = true
    return
  }

  try {
    extractingFileId.value = row.file_id
    const res = await post('/task/ai-extract-summary', {
      file_id: row.file_id,
      file_type: getFileType(row.file_name) || 'docx', // 你可根据后台实际结构修改
      task_id: task.value.task_id,
    })
    row.summary = res
    fetchTask()
  } catch (e) {
    ElMessage.error(e?.message || '摘要提取失败')
  } finally {
    extractingFileId.value = null
  }
}

const goSubTask = (taskId) => {
  router.push({ path: '/task/detail', query: { task_id: taskId } })
}

const fetchTask = async () => {
  const taskId = route.query.task_id
  if (!taskId) {
    ElMessage.error('缺少任务ID')
    return
  }
  loading.value = true
  try {
    const res = await get(`/task/${taskId}`)
    task.value = res
    if (task.value.status_text === '待开始') {
      await onStartTask()
    }
    await fetchAttachments()
  } catch (e) {
    ElMessage.error('获取任务失败' + e.message)
  } finally {
    loading.value = false
  }
}

const fetchAttachments = async () => {
  const res = await get(`/task/${task.value.task_id}/attachments`)
  attachments.value = res || []
}

const replyTask = () => {
  router.push({ path: '/task/CommentChat', query: { task_id: task.value.task_id } })
}

const onStartTask = async () => {
  const res = await post(`/task/${task.value.task_id}/start`)
  fetchTask()
  ElMessage.success('任务已开始')
}

const completeTask = async () => {
  try {
    await post(`/task/${task.value.task_id}/complete`)
    ElMessage.success('任务已完成')
    fetchTask()
  } catch (e) {
    ElMessage.error(e?.message || '任务完成失败')
  }
}

const isWorkLog = computed(() => {
  return task.value?.task_type_id === TaskTypeEnum.WORK_LOG
})

const handleUpload = async ({ file }) => {
  const res = await upload(
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

  const fileId = res?.file_id
  const taskId = task.value.task_id
  await post(`/task/${taskId}/attachments`, {
    file_id: fileId,
    task_id: taskId,
    remark: file.name,
  })

  ElMessage.success('附件已上传并绑定')
}

const handleUploadSuccess = async () => {
  await fetchAttachments()
}

const beforeUpload = (file) => {
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning('附件不能大于20MB')
    return false
  }
  return true
}

const formatSize = (size) => {
  if (!size) return '-'
  const kb = size / 1024
  if (kb < 1024) return kb.toFixed(1) + ' KB'
  return (kb / 1024).toFixed(1) + ' MB'
}

const formatDate = (val) => {
  if (!val) return '-'
  return dayjs(val).format('YYYY-MM-DD HH:mm')
}

const goBack = () => {
  router.back()
}

watchEffect(() => {
  if (route.query.task_id) {
    fetchTask()
  }
})

onMounted(() => {
  //fetchTask()
})
</script>

<style scoped>
.card-header {
  font-size: 16px;
  font-weight: bold;
}
.mr-1 {
  margin-right: 6px;
}
.mt-4 {
  margin-top: 20px;
}
.flex-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ml-2 {
  margin-left: 12px;
}
</style>
