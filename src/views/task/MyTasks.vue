<template>
  <TaskFilter
    v-model="filter"
    :task-types="taskTypes"
    :executor-options="executorList"
    :tag-options="tagList"
    :status-options="TaskStatusOptions"
    :priority-options="PriorityOptions"
    :show-executor="false"
  />

  <TaskTable :filter="filter" mode="my" />
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

onMounted(() => {
  loadTaskDict()
})
</script>
