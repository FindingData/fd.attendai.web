export const TaskTypeEnum = {
  WORK_LOG: 11,
  // ...
}

export const TaskStatusEnum = {
  WAIT_ASSIGN: 40015001,
  WAIT_START: 40015002,
  IN_PROGRESS: 40015003,
  COMPLETED: 40015004,
}

export const TaskStatusOptions = [
  { label: '待分配', value: TaskStatusEnum.WAIT_ASSIGN },
  { label: '待开始', value: TaskStatusEnum.WAIT_START },
  { label: '进行中', value: TaskStatusEnum.IN_PROGRESS },
  { label: '已完成', value: TaskStatusEnum.COMPLETED },
]

export const PriorityOptions = [
  { label: '最低', value: 1 },
  { label: '低', value: 2 },
  { label: '中', value: 3 },
  { label: '高', value: 4 },
  { label: '最高', value: 5 },
]

export const TaskStatusMap = TaskStatusOptions.reduce((map, item) => {
  map[item.value] = item.label
  return map
}, {})
