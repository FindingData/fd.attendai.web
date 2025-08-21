export default [
  {
    path: '/task',
    name: 'task-list',
    component: () => import('@/views/task/TaskList.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/task/my',
    name: 'my-tasks',
    component: () => import('@/views/task/MyTasks.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/task/commentchat',
    name: 'comment-chat',
    component: () => import('@/views/task/CommentChat.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/task/detail',
    name: 'task-detail',
    component: () => import('@/views/task/TaskDetail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/task/chat',
    name: 'task-ai',
    component: () => import('@/views/task/TaskChat.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/task/create',
    name: 'task-create',
    component: () => import('@/views/task/TaskCreate.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/worklog',
    name: 'WorkLog',
    component: () => import('@/views/task/WorkLogList.vue'),
    meta: {
      title: '工作日志',
      requireAuth: true,
    },
  },
]
