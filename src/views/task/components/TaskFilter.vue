<template>
  <el-form :inline="true" :model="filterForm" class="task-filter-form" size="small">
    <el-form-item label="关键词">
      <el-input v-model="filterForm.keyword" placeholder="任务名/项目名" clearable />
    </el-form-item>

    <el-form-item label="任务类型" style="min-width: 220px" v-show="showTaskType">
      <el-select v-model.number="filterForm.task_type_id" placeholder="全部" clearable>
        <el-option
          v-for="item in taskTypes"
          :key="item.task_type_id"
          :label="item.type_name"
          :value="item.task_type_id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="状态" style="min-width: 120px">
      <el-select v-model.number="filterForm.task_status" placeholder="全部" clearable>
        <el-option
          v-for="status in statusOptions"
          :key="status.value"
          :label="status.label"
          :value="status.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="执行人" v-if="showExecutor">
      <el-autocomplete
        v-model="filterForm.executor_name"
        :fetch-suggestions="queryUsers"
        @select="onExecutorSelect"
        :clearable="true"
        @clear="onExecutorClear"
        @change="onExecutorInputChange"
        placeholder="输入姓名选择执行人"
      />
    </el-form-item>

    <el-form-item label="标签">
      <el-autocomplete
        v-model="filterForm.tag_name"
        :fetch-suggestions="queryTags"
        @select="onTagSelect"
        :trigger-on-focus="true"
        :clearable="true"
        @clear="onTagClear"
        @change="onTagInputChange"
        placeholder="输入标签并回车"
      />
    </el-form-item>

    <el-form-item label="截止时间">
      <el-date-picker
        v-model="dueDateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
      />
    </el-form-item>

    <el-form-item label="优先级" style="min-width: 120px">
      <el-select v-model.number="filterForm.priority_level" placeholder="全部" clearable>
        <el-option
          v-for="item in priorityOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="onSearch">筛选</el-button>
      <el-button @click="onReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Object,
  taskTypes: Array,
  executorOptions: Array,
  priorityOptions: Array,
  tagOptions: Array,
  statusOptions: Array,
  showExecutor: { type: Boolean, default: true },
  showTaskType: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'search'])

const filterForm = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const dueDateRange = ref([filterForm.value.due_start, filterForm.value.due_end])

watch(dueDateRange, ([start, end]) => {
  filterForm.value.due_start = start || null
  filterForm.value.due_end = end || null
})

const queryUsers = (queryString, cb) => {
  const result = props.executorOptions
    .filter((u) => u.user_name.toLowerCase().includes(queryString.toLowerCase()))
    .slice(0, 10)
    .map((u) => ({ value: u.user_name, id: u.user_id }))
  cb(result)
}

const queryTags = (queryString, cb) => {
  const results = props.tagOptions
    .filter((tag) => tag.tag_name.toLowerCase().includes(queryString.toLowerCase()))
    .slice(0, 10)
    .map((tag) => ({ value: tag.tag_name, id: tag.tag_id }))
  cb(results)
}

const onSearch = () => {
  emit('search')
}

const onExecutorSelect = (item) => {
  filterForm.value.executor_by = item.id
}

const onExecutorClear = () => {
  filterForm.value.executor_by = null
}

const onTagSelect = (item) => {
  filterForm.value.tag_ids.splice(0)
  filterForm.value.tag_ids.push(item.id)
}

const onTagClear = () => {
  filterForm.value.tag_ids.splice(0)
}

const onExecutorInputChange = (val) => {
  const matched = props.executorOptions.some((tag) => tag.user_name === val)
  if (!matched) {
    filterForm.value.executor_by = null
  }
}

const onTagInputChange = (val) => {
  const matched = props.tagOptions.some((tag) => tag.tag_name === val)
  if (!matched) {
    filterForm.value.tag_ids.splice(0)
  }
}

const onReset = () => {
  Object.assign(filterForm, {
    keyword: '',
    task_type_id: null,
    task_status: null,
    executor_by: null,
    tag_id: null,
    tag_ids: [],
    due_start: null,
    due_end: null,
    priority_level: null,
    page_index: 1,
  })
  dueDateRange.value = [null, null]
  emit('search')
}
</script>

<style scoped>
.task-filter-form {
  margin-bottom: 12px;
  flex-wrap: wrap;
}
</style>
