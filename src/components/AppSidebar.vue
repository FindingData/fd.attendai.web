<template>
  <aside class="app-sidebar">
    <ul>
      <li><router-link to="/">首页</router-link></li>
      <li><router-link to="/task/create">创建任务</router-link></li>
      <li><router-link to="/task/my">我的任务</router-link></li>
      <li><router-link v-if="auth.hasPermission('012001001')" to="/task">公司任务</router-link></li>
      <li><router-link to="/notify">消息通知</router-link></li>
      <li><router-link to="/worklog">工作日志</router-link></li>
      <li><router-link to="/attendance">考勤</router-link></li>
    </ul>
  </aside>
</template>

 <script setup>
import { useAuthStore } from '@/stores/authStore'
const auth = useAuthStore()
</script>

<style scoped>
.app-sidebar {
  padding: 16px;
}

.app-sidebar ul {
  list-style: none;
  padding: 0;
}

.app-sidebar li {
  margin: 8px 0;
}
</style>
