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
        <el-tag v-if="task.is_ai_gen" size="small" type="success" class="ml-1">AI</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="任务类型">{{ task.task_type_name || '-' }}</el-descriptions-item>
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
      <el-descriptions-item label="截止时间">
        {{ formatDate(task.due_date) }}
      </el-descriptions-item>
      <el-descriptions-item label="完成时间">
        {{ formatDate(task.completed_date) }}
      </el-descriptions-item>
      <el-descriptions-item label="创建人">
        {{ task.created_name }}
      </el-descriptions-item>
      <el-descriptions-item label="备注">{{ task.task_remark || '-' }}</el-descriptions-item>
    </el-descriptions>

    <div class="mt-4 flex-row">
      <el-button type="primary" @click="goBack">返回</el-button>
      <el-button
        type="success"
        v-if="can_complete"
        @click="completeTask"
        :disabled="task.status_text === '已完成'"
        >完成任务</el-button
      >
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
      />
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

  <el-dialog v-model="summaryDialogVisible" title="文件摘要" width="600px">
    <div style="white-space: pre-wrap; font-size: 14px; color: #333">
      {{ summaryContent }}
    </div>
    <template #footer>
      <el-button @click="summaryDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted, watchEffect } from 'vue'
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
const extractingFileId = ref(null)
const current_user_id = computed(() => auth.user?.user_id)

const can_complete = computed(
  () => task.value && current_user_id.value && task.value.created_by === current_user_id.value
)

const getFileType = (fileName) => {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
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

const completeTask = async () => {
  try {
    await post(`/task/${task.value.task_id}/complete`)
    ElMessage.success('任务已完成')
    task.value.status_text = '已完成'
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
  fetchTask()
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
