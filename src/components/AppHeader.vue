<!-- src/components/AppHeader.vue -->
<template>
  <header class="app-header">
    <div class="brand" @click="goHome">
      <img class="logo" src="../assets/logo.svg" alt="logo" />
      <span class="title">AttendAI</span>
    </div>

    <div class="actions">
      <div class="user">
        <!-- <img class="avatar" :src="avatar_url" alt="avatar" /> -->
        <span class="name" v-if="user_name">{{ user_name }}</span>
      </div>

      <!-- 右上角退出按钮 -->
      <button class="btn btn-logout" @click="logout">退出</button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()

// 这里可以替换为你的用户信息来源（Pinia / API / localStorage）
const authStore = useAuthStore()
const user_name = authStore.user?.user_name || ''

function logout() {
  authStore.logout()
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.logo {
  width: 28px;
  height: 28px;
}
.title {
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #1f2937;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 30px;
}
.btn-logout {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);
}
.btn-logout:hover {
  filter: brightness(0.95);
}
.btn-logout:active {
  transform: translateY(1px);
}
</style>
