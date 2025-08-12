<template>
  <div class="task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
        </div>
      </template>

      <el-table :data="tasks" stripe border style="width: 100%" :loading="loading">
        <el-table-column prop="task_id" label="ID" width="80" />
        <el-table-column label="任务名称">
          <template #default="{ row }">
            <span>{{ row.task_name }}</span>
            <el-tag v-if="row.is_ai_gen" size="small" type="success" class="ml-1"> AI </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="task_type_text" label="任务类型" width="120" />
        <el-table-column prop="due_date" label="截止日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.due_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status_text" label="状态" width="100" />
        <el-table-column prop="completed_date" label="完成日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.completed_date) }}
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag.id" class="tag" size="small">
              {{ tag.tag_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="executor_name" label="执行人" width="100" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="default" size="small" @click="viewDetail(row)">查看</el-button>
            <el-divider direction="vertical" />
            <el-popconfirm title="确认删除该任务？" @confirm="deleteTask(row.task_id)">
              <template #reference>
                <el-button type="default" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

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
  </div>
</template>

<script setup>
import { watchEffect, ref, onMounted, defineExpose } from 'vue'
import { post } from '@/http/request'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

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

const onPageChange = (page) => {
  pageRequest.value.page_index = page
  fetchTasks()
}

const onSizeChange = (size) => {
  pageRequest.value.page_size = size
  pageRequest.value.page_index = 1
  fetchTasks()
}

watchEffect(() => {
  props.filter.page_index
  fetchTasks()
})
onMounted(fetchTasks)

defineExpose({
  fetchTasks,
})
</script>

<style scoped>
.card-header {
  font-size: 18px;
  font-weight: bold;
}

.tag {
  margin-right: 4px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>
