<template>
  <TaskFilter
    v-model="filter"
    :task-types="taskTypes"
    :executor-options="executorList"
    :tag-options="tagList"
    :status-options="TaskStatusOptions"
    :priority-options="PriorityOptions"
  />

  <TaskTable :filter="filter" mode="my" />
</template>

<script setup>
import { onMounted, onActivated, ref } from 'vue'

import TaskTable from './components/TaskTable.vue'
import TaskFilter from './components/TaskFilter.vue'

import { useTaskDict } from '@/composables/useTaskDict.js'
import { useTaskFilter } from '@/composables/useTaskFilter.js'
import { TaskStatusOptions } from '@/constants/taskEnums'
import { PriorityOptions } from '@/constants/taskEnums'

defineOptions({
  name: 'MyTasks', // 👈 必须设置，用于 Keep-Alive 识别
})

const { taskTypes, executorList, tagList, loadTaskDict } = useTaskDict()

const { filter } = useTaskFilter()
const taskTableRef = ref(null)

onMounted(() => {
  loadTaskDict()
})

// 3. **核心：在 MyTasks 被激活时，调用子组件的 fetchTasks**
// onActivated(() => {
//   // 确保子组件实例存在
//   if (taskTableRef.value) {
//     // 由于 Keep-Alive 保留了 TaskTable 的 pageRequest 状态，
//     // 此时 taskTableRef.value.pageRequest.value.page_index 就是上次离开时的页码。
//     taskTableRef.value.fetchTasks()
//   }
// })
</script>
