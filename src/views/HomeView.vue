<template>
  <div class="home">
    <el-card shadow="hover" class="welcome-card">
      <h2>欢迎回来，{{ username || '用户' }} 👋</h2>
      <p>这是 AttendAI 系统首页，你可以在左侧菜单中进入任务管理、考勤管理等功能。</p>
    </el-card>

    <div class="quick-links">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card shadow="hover" @click="$router.push('/task')" class="quick-card">
            <h3>🗂 任务管理</h3>
            <p>创建、指派并跟踪任务</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover" @click="$router.push('/worklog')" class="quick-card">
            <h3>📝 工作日志</h3>
            <p>记录并查看每日工作</p>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
defineOptions({
  name: 'HomeView', // 👈 必须设置，用于 Keep-Alive 识别
})

const authStore = useAuthStore()
const username = authStore.user?.user_name || ''
</script>

<style scoped>
.home {
  padding: 20px;
}

.welcome-card {
  margin-bottom: 24px;
}

.quick-links .quick-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.quick-links .quick-card:hover {
  transform: scale(1.02);
}
</style>
