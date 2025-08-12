<template>
  <el-dialog v-model="visible" title="通知详情" width="500px" @close="$emit('close')">
    <el-descriptions border column="1">
      <el-descriptions-item label="标题">{{ notify.notify_title }}</el-descriptions-item>
      <el-descriptions-item label="内容">{{ notify.notify_content }}</el-descriptions-item>
      <el-descriptions-item label="时间">{{ notify.create_time }}</el-descriptions-item>
    </el-descriptions>

    <template #footer>
      <el-button @click="$emit('close')">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ notify: Object })
const visible = ref(true)
watch(
  () => props.notify,
  () => (visible.value = true)
)
</script>
