import { reactive } from 'vue'

export function useTaskFilter() {
  const filter = reactive({
    keyword: '',
    task_type_id: null,
    task_status: null,
    executor_by: null,
    executor_name: '',
    tag_ids: [],
    tag_name: '',
    due_start: null,
    due_end: null,
    priority_level: null,
  })
  return { filter }
}
