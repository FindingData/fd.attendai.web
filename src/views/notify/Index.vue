<template>
  <el-card>
    <div class="mb-2 text-right">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedIds.length === 0"
        @click="batchMarkRead"
      >
        批量标记为已读
      </el-button>
    </div>

    <NotifyTable
      :data="list"
      :loading="loading"
      :selected-ids="selectedIds"
      @update:selection="(val) => (selectedIds = val)"
      @view="viewDetail"
    />

    <el-pagination
      class="mt-4 text-right"
      background
      layout="prev, pager, next, total"
      :current-page="page.page_index"
      :page-size="page.page_size"
      :total="total"
      @current-change="handlePageChange"
    />

    <NotifyDetail v-if="showDetail" :notify="selected" @close="showDetail = false" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getNotifyList, markAsRead, batchMarkAsRead } from '@/api/notify'
import NotifyTable from './components/NotifyTable.vue'
import NotifyDetail from './components/NotifyDetail.vue'
import { ElMessage } from 'element-plus'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref({ page_index: 1, page_size: 10 })

const selected = ref(null)
const showDetail = ref(false)
const selectedIds = ref([])

async function loadList() {
  loading.value = true
  const res = await getNotifyList(page.value)
  list.value = res.data || []
  total.value = res.data_count || 0
  selectedIds.value = []
  loading.value = false
}

function handlePageChange(newPage) {
  page.value.page_index = newPage
  loadList()
}

async function viewDetail(row) {
  if (!row.is_read) {
    await markAsRead(row.id)
    row.is_read = true
  }
  selected.value = row
  showDetail.value = true
}

async function batchMarkRead() {
  await batchMarkAsRead(selectedIds.value)
  ElMessage.success('标记成功') // 由调用者决定是否提示
  loadList()
}

onMounted(loadList)
</script>
