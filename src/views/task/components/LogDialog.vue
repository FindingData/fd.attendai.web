<template>
  <el-dialog v-model="dialogVisible" title="新建工作日志" width="500px" @close="resetForm">
    <el-form :model="form" label-width="80px">
      <el-form-item label="工作内容" required>
        <el-input v-model="form.task_remark" type="textarea" :rows="4" />
      </el-form-item>
      <el-form-item label="工作日期" required>
        <el-date-picker v-model="form.due_date" type="date" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submit">提交</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { createTask } from '@/api/task'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import dayjs from 'dayjs'
import { TaskTypeEnum } from '@/constants/taskEnums'

const props = defineProps({
  visible: Boolean,
})
const emit = defineEmits(['update:visible', 'success'])

const form = ref({
  task_remark: '',
  due_date: new Date(),
})

const authStore = useAuthStore()
const user = authStore.user

const submit = async () => {
  if (!form.value.task_remark) {
    ElMessage.warning('请填写工作内容')
    return
  }
  try {
    await createTask({
      task_name: '工作日志：' + form.value.task_remark.slice(0, 10),
      task_remark: form.value.task_remark,
      due_date: dayjs(form.value.due_date).format('YYYY-MM-DDT17:30:00'),
      task_type_id: TaskTypeEnum.WORK_LOG, // 工作日志类型ID
      executor_ids: null,
      executor_names: [user.user_name],
      is_ai_gen: false,
      priority_level: null,
      tag_names: null,
      tag_ids: null,
      project_id: null,
      task_desc: null,
    })
    ElMessage.success('日志创建成功')
    emit('update:visible', false)
    emit('success')
  } catch (err) {
    ElMessage.error(err.message || '创建失败')
  }
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const resetForm = () => {
  form.value = {
    task_remark: '',
    due_date: new Date(),
  }
}
watch(
  () => props.visible,
  (val) => {
    if (val) resetForm()
  }
)
</script>
