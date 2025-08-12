<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>创建任务</span>
        <router-link to="/task/chat">
          <el-button type="primary" size="small">AI生成任务</el-button>
        </router-link>
      </div>
    </template>

    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="任务名称" prop="task_name">
        <el-input v-model="form.task_name" />
      </el-form-item>

      <el-form-item label="任务类型" prop="task_type_name">
        <el-select v-model="form.task_type_id" placeholder="请选择">
          <el-option
            v-for="item in taskTypeOptions"
            :key="item.task_type_id"
            :label="item.type_name"
            :value="item.task_type_id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="截止时间" prop="due_date">
        <el-date-picker
          v-model="form.due_date"
          type="datetime"
          placeholder="请选择时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </el-form-item>

      <el-form-item label="执行人" prop="executor_names">
        <div>
          <el-autocomplete
            v-model="userInput"
            :fetch-suggestions="queryUsers"
            placeholder="输入姓名选择执行人"
            @select="selectExecutor"
            style="width: 300px"
          />
          <div class="mt-2">
            <el-tag
              v-for="(name, index) in form.executor_names"
              :key="name"
              closable
              @close="removeExecutor(index)"
              class="mr-1"
            >
              {{ name }}
            </el-tag>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="备注">
        <el-input type="textarea" v-model="form.task_remark" />
      </el-form-item>

      <el-form-item label="优先级">
        <el-rate
          v-model="form.priority_level"
          show-text
          :texts="['最低', '低', '中', '高', '最高']"
          :max="5"
        />
      </el-form-item>

      <el-form-item label="标签">
        <div>
          <el-autocomplete
            v-model="tagInput"
            :fetch-suggestions="queryTags"
            :trigger-on-focus="true"
            placeholder="输入标签并回车"
            @select="selectTag"
            style="width: 300px"
          />
          <div class="mt-2">
            <el-tag
              v-for="(tag, index) in form.tag_names"
              :key="tag"
              closable
              @close="removeTag(index)"
              class="mr-1"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="submit">提交</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createTask,
  createTaskBatch,
  fetchUserList,
  fetchRootTaskTypes,
  fetchTagList,
} from '@/api/task' // 自定义 API 调用
import { useRouter } from 'vue-router'

const router = useRouter()

const formRef = ref()
const form = reactive({
  task_name: '',
  task_remark: '',
  task_type_name: '',
  project_id: null,
  due_date: null,
  executor_names: [],
  department: null,
  priority_level: null,
  tag_names: [],
  is_ai_gen: false,
  executor_ids: [],
  task_desc: null,
  tag_ids: [],
  task_type_id: null,
})

const rules = {
  task_name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  task_type_id: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  due_date: [{ required: true, message: '请选择截止时间', trigger: 'change' }],
  executor_names: [{ required: true, message: '请选择执行人', trigger: 'change' }],
}

const tagInput = ref('')
const taskTypeOptions = ref([])
const allTags = ref([])
const userInput = ref('')
const allUsers = ref([]) // 后端返回所有用户列表（含 user_name）

const loadUsers = async () => {
  const res = await fetchUserList()
  allUsers.value = res || []
}

const queryUsers = (queryString, cb) => {
  const result = allUsers.value
    .filter((u) => u.user_name.toLowerCase().includes(queryString.toLowerCase()))
    .slice(0, 10) // 👈 只取前 10 个
    .map((u) => ({ value: u.user_name, id: u.user_id }))
  cb(result)
}

// const addExecutor = (item) => {
//   const name = item.value
//   if (name && !form.executor_names.includes(name)) {
//     form.executor_names.push(name)
//   }
//   userInput.value = ''
// }

const selectExecutor = (item) => {
  if (!form.executor_ids.includes(item.id)) {
    form.executor_ids.push(item.id)
    form.executor_names.push(item.value)
  }
  userInput.value = ''
}

// const handleUserEnter = () => {
//   if (userInput.value.trim()) {
//     addExecutor({ value: userInput.value.trim() })
//   }
// }

const removeExecutor = (index) => {
  form.executor_names.splice(index, 1)
  form.executor_ids.splice(index, 1)
}

const loadTaskTypes = async () => {
  const typeRes = await fetchRootTaskTypes()
  taskTypeOptions.value = typeRes || []
}

// 获取所有标签
const loadTags = async () => {
  const res = await fetchTagList()
  allTags.value = res || []
}

// 自动提示过滤
const queryTags = (queryString, cb) => {
  const results = allTags.value
    .filter((tag) => tag.tag_name.toLowerCase().includes(queryString.toLowerCase()))
    .slice(0, 10) // 👈 只取前 10 个
    .map((tag) => ({ value: tag.tag_name, id: tag.tag_id })) // 👈 必须返回对象数组

  cb(results)
}

// const handleEnter = () => {
//   if (tagInput.value.trim()) {
//     addTag(tagInput.value.trim())
//   }
// }

const selectTag = (item) => {
  if (!form.tag_ids.includes(item.id)) {
    form.tag_ids.push(item.id)
    form.tag_names.push(item.value)
  }
  tagInput.value = ''
}

// 添加标签
// const addTag = (tag) => {
//   const value = typeof tag === 'string' ? tag : tagInput.value
//   if (value && !form.tag_ids.includes(value)) {
//     form.tag_ids.push(value)
//   }
//   tagInput.value = ''
// }

// 删除标签
const removeTag = (index) => {
  form.tag_ids.splice(index, 1)
  form.tag_names.splice(index, 1)
}

onMounted(() => {
  loadUsers()
  loadTaskTypes()
  loadTags()
})

const submit = async () => {
  await formRef.value.validate()
  const isMultiple = form.executor_ids?.length > 1

  try {
    await (isMultiple ? createTaskBatch(form) : createTask(form))
    ElMessage.success('任务创建成功')
    router.push('/task/my')
  } catch (err) {
    ElMessage.error(err.message || '创建失败')
  }
}

const resetForm = () => {
  Object.assign(form, {
    task_name: '',
    task_remark: '',
    task_type_name: '',
    project_id: null,
    due_date: null,
    executor_names: [],
    department: null,
    priority_level: null,
    tag_names: [],
    is_ai_gen: true,
    executor_ids: [],
    task_desc: null,
    tag_ids: [],
    task_type_id: null,
  })
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mr-1 {
  margin-right: 0.5rem;
}
</style>
