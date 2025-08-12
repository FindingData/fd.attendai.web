import { ref } from 'vue'
import { fetchRootTaskTypes, fetchUserList, fetchTagList } from '@/api/task' // 示例方法名

export function useTaskDict() {
  const taskTypes = ref([])
  const executorList = ref([])
  const tagList = ref([])

  const loadTaskDict = async () => {
    const [types, users, tags] = await Promise.all([
      fetchRootTaskTypes(),
      fetchUserList(),
      fetchTagList(),
    ])
    taskTypes.value = types || []
    executorList.value = users || []
    tagList.value = tags || []
  }

  return {
    taskTypes,
    executorList,
    tagList,
    loadTaskDict,
  }
}
