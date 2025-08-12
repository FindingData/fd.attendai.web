export default [
  {
    path: '/notify',
    name: 'notify',
    component: () => import('@/views/notify/Index.vue'),
    meta: {
      title: '通知中心',
      requiresAuth: true,
    },
  },
]
