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
          border
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
                    v-for="(tag, _) in row.tags.slice(0, 2)"
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
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="default" size="small" @click="viewDetail(row)">查看</el-button>
              <el-button type="default" size="small" @click="reply(row)">反馈</el-button>
              <el-divider direction="vertical" />
              <el-popconfirm title="确认删除该任务？" @confirm="deleteTask(row.task_id)">
                <template #reference>
                  <el-button type="default" size="small">删除</el-button>
                </template>
              </el-popconfirm>
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

watchEffect(() => {
  pageRequest.value.page_index = 1
  fetchTasks()
})
onMounted(fetchTasks)

defineExpose({
  fetchTasks,
})
</script>

<style scoped>
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
