<template>
  <div class="task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
        </div>
      </template>

      <div class="table-wrap">
        <el-table
          :data="tasks"
          stripe
          :fit="false"
          table-layout="fixed"
          :loading="loading"
          style="width: 100%"
        >
          <el-table-column prop="task_id" label="ID" width="50" fixed="left" />

          <el-table-column label="任务名称" min-width="260">
            <template #default="{ row }">
              <div class="cell-task">
                <span class="task-text" :title="row.task_name">{{ row.task_name }}</span>
                <el-tag
                  v-if="row.has_return_apply_pending"
                  size="small"
                  type="danger"
                  effect="dark"
                >
                  待退回
                </el-tag>
                <el-tag v-if="row.is_ai_gen" size="small" type="success">AI</el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="task_type_text" label="任务类型" width="100" />
          <el-table-column prop="due_date" label="截止日期" width="100">
            <template #default="{ row }">{{ formatDate(row.due_date) }}</template>
          </el-table-column>
          <el-table-column prop="status_text" label="状态" width="80" />
          <el-table-column prop="completed_date" label="完成日期" width="100">
            <template #default="{ row }">{{ formatDate(row.completed_date) }}</template>
          </el-table-column>

          <!-- 标签列：给固定最小宽度，超出省略 + tooltip -->
          <el-table-column label="标签" min-width="140">
            <template #default="{ row }">
              <div class="tags-cell">
                <template v-if="row.tags && row.tags.length">
                  <el-tag
                    v-for="tag in row.tags.slice(0, 2)"
                    :key="tag.id"
                    size="small"
                    class="tag"
                  >
                    {{ tag.tag_name }}
                  </el-tag>
                  <el-popover
                    v-if="row.tags.length > 2"
                    placement="top"
                    width="240"
                    trigger="hover"
                  >
                    <template #reference>
                      <el-tag size="small" class="tag">+{{ row.tags.length - 2 }}</el-tag>
                    </template>
                    <div class="tags-pop">
                      <el-tag
                        v-for="tag in row.tags.slice(2)"
                        :key="tag.id"
                        size="small"
                        class="tag"
                      >
                        {{ tag.tag_name }}
                      </el-tag>
                    </div>
                  </el-popover>
                </template>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="executor_name" label="执行人" width="100" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons-wrap">
                <template v-if="canSchedule(row)">
                  <el-button type="primary" size="small" @click="openScheduleDialog(row)"
                    >调度</el-button
                  >
                </template>
                <template v-else>
                  <el-button type="primary" size="small" style="visibility: hidden">调度</el-button>
                </template>
                <el-button type="default" size="small" @click="viewDetail(row)">查看</el-button>
                <el-divider direction="vertical" />
                <el-popconfirm title="确认删除该任务？" @confirm="deleteTask(row.task_id)">
                  <template #reference>
                    <el-button type="default" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="total"
          :page-size="pageRequest.page_size"
          :current-page="pageRequest.page_index"
          @current-change="onPageChange"
          @size-change="onSizeChange"
          :page-sizes="[10, 20, 50, 100]"
        />
      </div>
    </el-card>
    <el-dialog v-model="scheduleDialogVisible" title="调度任务" width="400px">
      <el-form :model="scheduleForm" ref="scheduleFormRef" label-width="80px">
        <el-form-item label="任务名称">
          <el-input :model-value="currentTaskName" disabled />
        </el-form-item>

        <el-form-item
          label="执行人"
          prop="executor_by"
          :rules="[{ required: true, message: '请选择执行人', trigger: 'change' }]"
        >
          <el-autocomplete
            v-model="scheduleForm.executor_name"
            :fetch-suggestions="querySearchUser"
            :trigger-on-focus="true"
            @select="handleUserSelect"
            placeholder="搜索并选择新的执行人"
            value-key="user_name"
            clearable
            style="width: 100%"
          >
            <template #default="{ item }">
              <div class="user-item">
                <span class="user-name">{{ item.user_name }}</span>
                <span class="user-id">ID: {{ item.user_id }}</span>
              </div>
            </template>
          </el-autocomplete>
          <input type="hidden" v-model="scheduleForm.executor_by" />
        </el-form-item>

        <el-form-item label="截止日期" prop="due_date">
          <el-date-picker
            v-model="scheduleForm.due_date"
            type="datetime"
            placeholder="选择新的截止时间"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSchedule">确认调度</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { watchEffect, computed, watch, ref, onMounted, defineExpose } from 'vue'
import { post, get } from '@/http/request'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
const auth = useAuthStore()

const props = defineProps({
  mode: {
    type: String,
    default: 'my', // 'my' | 'all' | 'depart'
  },
  filter: {
    type: Object,
    default: () => ({}),
  },
})

const tasks = ref([])
const total = ref(0)
const loading = ref(false)
const router = useRouter()

const scheduleDialogVisible = ref(false)
const scheduleFormRef = ref(null)
const currentTask = ref(null)

const scheduleForm = ref({
  task_id: null,
  executor_by: null, // 新执行人ID
  executor_name: '', // 新执行人名称（用于显示）
  due_date: null, // 新截止日期
})

// 显示在对话框中的任务名称
const currentTaskName = computed(() => (currentTask.value ? currentTask.value.task_name : ''))

const canSchedule = (row) => {
  const isCreator = auth.user?.user_id === row.created_by
  return isCreator && auth.hasPermission('012001001')
}

// 1. 打开调度对话框
const openScheduleDialog = (row) => {
  currentTask.value = row
  // 初始化表单数据
  scheduleForm.value.task_id = row.task_id
  scheduleForm.value.executor_by = row.executor_by || null // 默认使用当前执行人
  scheduleForm.value.executor_name = row.executor_name || ''
  scheduleForm.value.due_date = row.due_date ? new Date(row.due_date) : null // 默认使用当前截止日期

  scheduleDialogVisible.value = true

  // 重置表单验证状态
  if (scheduleFormRef.value) {
    scheduleFormRef.value.clearValidate()
  }
}
const userListCache = ref([]) // 新增：用于缓存全部用户列表
const fetchAllUsers = async () => {
  // 仅在初次或需要刷新时调用，获取全部数据并缓存
  if (userListCache.value.length === 0) {
    try {
      const data = await get('/user/GetCustomerUsers')
      userListCache.value = data || []
    } catch (e) {
      console.error('获取全部用户列表失败:', e)
    }
  }
}
const querySearchUser = async (queryString, cb) => {
  // 确保数据已加载
  await fetchAllUsers()
  // 1. 获取所有缓存数据
  const results = userListCache.value
  if (!queryString) {
    // 如果没有输入，显示空列表或整个列表 (根据业务需求，通常是空列表)
    cb(results.slice(0, 5)) // 显示前10个作为示例
    return
  }

  // 2. [核心] 在前端根据输入字符串进行筛选
  const filteredResults = results.filter((user) => {
    // 假设用户对象有 user_name 属性
    const name = user.user_name || ''
    // 检查用户名是否包含（不区分大小写）输入字符串
    return name.toLowerCase().includes(queryString.toLowerCase())
  })

  // 3. 将筛选结果返回给 Autocomplete
  cb(filteredResults)
}

// 3. 用户选择事件
const handleUserSelect = (item) => {
  // 当用户选择一个选项时，将 ID 存储在 form 中，并更新显示的名称
  scheduleForm.value.executor_by = item.user_id
  scheduleForm.value.executor_name = item.user_name // 这一步 Autocomplete 内部也会处理

  // 手动触发验证，确保 executor_by 校验通过
  scheduleFormRef.value?.validateField('executor_by')
}

// 4. 确认调度操作 (无需修改逻辑，但需注意传递的数据)
const confirmSchedule = () => {
  scheduleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 确保我们发送的是 ID
        const requestBody = {
          task_id: scheduleForm.value.task_id,
          executor_by: scheduleForm.value.executor_by, // **使用 ID**
          new_due_date: scheduleForm.value.due_date,
        }

        const res = await post(`/task/${requestBody.task_id}/dispatch`, requestBody)
        ElMessage.success(res?.message || '任务调度成功')
        scheduleDialogVisible.value = false
        fetchTasks()
      } catch (e) {
        ElMessage.error(e?.message || '调度失败') // 新增：处理调度失败的情况
      }
    }
  })
}

const pageRequest = ref({
  page_index: 1,
  page_size: 10,
  order_by: 'created_at',
  order_direction: 'desc',
  mode: props.mode,
})

const deleteTask = async (taskId) => {
  try {
    await post(`/task/del/${taskId}`)
    ElMessage.success('任务已删除')
    fetchTasks()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const request = {
      ...pageRequest.value,
      ...props.filter,
      ...props.mode,
    }
    const res = await post('/task/list', request)
    tasks.value = res.data || []
    total.value = res.data_count || 0
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr) => {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '-'
}

const viewDetail = (task) => {
  router.push({ path: '/task/detail', query: { task_id: task.task_id } })
}

const reply = (task) => {
  router.push({ path: '/task/CommentChat', query: { task_id: task.task_id } })
}

const audit = (task) => {
  router.push({ path: '/task/AuditChat', query: { task_id: task.task_id } })
}

const onPageChange = (page) => {
  pageRequest.value.page_index = page
  fetchTasks()
}

const onSizeChange = (size) => {
  pageRequest.value.page_size = size
  pageRequest.value.page_index = 1
  fetchTasks()
}

watch(
  () => [props.filter, props.mode],
  ([newFilter, newMode], [oldFilter, oldMode]) => {
    // 当过滤条件 (filter) 或模式 (mode) 发生变化时：
    // 1. 重置页码到第一页
    pageRequest.value.page_index = 1
    // 2. 重新拉取数据
    fetchTasks()
  },
  {
    deep: true, // 深度监听 filter 对象内部属性的变化
  }
)

onMounted(fetchTasks)

defineExpose({
  fetchTasks,
})
</script>

<style scoped>
.action-buttons-wrap {
  display: flex;
  align-items: center; /* 确保垂直居中对齐 */
  gap: 4px; /* 按钮之间增加一点间距 */
}

/* 确保 el-divider 在 flex 布局中垂直居中 */
.el-divider--vertical {
  margin: 0 4px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto; /* 容器横向滚动，避免列被挤压 */
}

/* 任务名单行省略，AI 标签不被挤掉 */
.cell-task {
  display: flex;
  align-items: center;
  gap: 6px;
}
.task-text {
  flex: 1;
  min-width: 0; /* 允许在列内收缩 */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 标签列：避免多标签撑爆 */
.tags-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
}
.tag {
  flex: 0 0 auto;
}
.tags-pop {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
