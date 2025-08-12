<template>
  <div class="worklog-page">
    <div class="worklog-header">
      <el-button type="primary" @click="showDialog = true">+ 新建日志</el-button>
    </div>

    <TaskTable ref="taskTableRef" :filter="logFilter" :mode="'my'" />

    <LogDialog v-model:visible="showDialog" @success="onLogSuccess" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TaskTable from './components/TaskTable.vue'
import LogDialog from './components/LogDialog.vue'

import { TaskTypeEnum } from '@/constants/taskEnums'

const taskTableRef = ref()

const showDialog = ref(false)

const logFilter = {
  task_type_id: TaskTypeEnum.WORK_LOG,
}

const onLogSuccess = () => {
  showDialog.value = false
  taskTableRef.value?.fetchTasks()
}
</script>

<style scoped>
.worklog-header {
  margin-bottom: 12px;
  text-align: right;
}
</style>
