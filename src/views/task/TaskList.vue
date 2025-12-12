<template>
  <div class="task-list">
    <TaskFilter
      v-model="filter"
      :task-types="taskTypes"
      :executor-options="executorList"
      :tag-options="tagList"
      :status-options="TaskStatusOptions"
      :priority-options="PriorityOptions"
    />
    <TaskTable :filter="filter" mode="all" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

import TaskTable from './components/TaskTable.vue'
import TaskFilter from './components/TaskFilter.vue'

import { useTaskDict } from '@/composables/useTaskDict.js'
import { useTaskFilter } from '@/composables/useTaskFilter.js'
import { TaskStatusOptions } from '@/constants/taskEnums'
import { PriorityOptions } from '@/constants/taskEnums'

const { taskTypes, executorList, tagList, loadTaskDict } = useTaskDict()

const { filter } = useTaskFilter()

// 必须设置组件名称，如果您的 Vue 版本支持 defineOptions
defineOptions({
  name: 'TaskList', // 👈 必须设置，用于 Keep-Alive 识别
})

onMounted(() => {
  loadTaskDict()
})
</script>
