<template>
  <el-table
    :data="data"
    :loading="loading"
    border
    stripe
    style="width: 100%"
    @selection-change="
      $emit(
        'update:selection',
        $event.map((row) => row.id)
      )
    "
  >
    <el-table-column type="selection" width="50" />
    <el-table-column label="标题" prop="notify_title" min-width="200" />
    <el-table-column label="时间" prop="create_time" width="180" />
    <el-table-column label="状态" width="100">
      <template #default="{ row }">
        <el-tag :type="row.is_read ? 'info' : 'danger'">
          {{ row.is_read ? '已读' : '未读' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="100">
      <template #default="{ row }">
        <el-button type="primary" size="small" @click="$emit('view', row)">查看</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
defineProps({
  data: Array,
  loading: Boolean,
  selectedIds: Array,
})
</script>
