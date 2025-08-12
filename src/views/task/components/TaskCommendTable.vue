<template>
  <el-card>
    <el-form class="mb-3" @submit.prevent>
      <el-form-item>
        <el-input
          v-model="commentText"
          type="textarea"
          :rows="3"
          placeholder="请输入评论内容"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitComment">发表反馈</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="comments" v-loading="loading" size="small" border>
      <el-table-column label="反馈内容" prop="comment_content" />
      <el-table-column label="评论人" prop="created_by_name" width="120" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-popconfirm title="确认删除这条反馈？" @confirm="deleteComment(row.id)">
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
        :page-sizes="[5, 10, 20, 50]"
        small
      />
    </div>
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { post } from '@/http/request'
import { ElMessage } from 'element-plus'

const props = defineProps({
  taskId: {
    type: Number,
    required: true,
  },
})

const comments = ref([])
const commentText = ref('')
const total = ref(0)
const loading = ref(false)

const pageRequest = ref({
  page_index: 1,
  page_size: 5,
  task_id: props.taskId,
  order_by: 'created_at',
})

const deleteComment = async (id) => {
  await post(`/taskcomment/del/${id}`)
  ElMessage.success('删除成功')
  fetchComments()
}

const fetchComments = async () => {
  if (!props.taskId) return
  loading.value = true
  try {
    const res = await post('/taskcomment/list', pageRequest.value)
    comments.value = res.data || []
    total.value = res.data_count || 0
  } finally {
    loading.value = false
  }
}

const submitComment = async () => {
  if (!commentText.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  await post('/taskcomment/add', {
    task_id: props.taskId,
    comment_content: commentText.value,
  })

  ElMessage.success('评论成功')
  commentText.value = ''
  pageRequest.value.page_index = 1
  await fetchComments()
}

const onPageChange = (page) => {
  pageRequest.value.page_index = page
  fetchComments()
}

const onSizeChange = (size) => {
  pageRequest.value.page_size = size
  pageRequest.value.page_index = 1
  fetchComments()
}

const formatDate = (val) => {
  return val ? new Date(val).toLocaleString() : '-'
}

watch(() => props.taskId, fetchComments, { immediate: true })
</script>

<style scoped>
.card-header {
  font-size: 16px;
  font-weight: bold;
}

.mb-3 {
  margin-bottom: 12px;
}

.pagination {
  margin-top: 12px;
  text-align: right;
}
</style>
