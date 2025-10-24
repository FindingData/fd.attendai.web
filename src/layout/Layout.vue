<template>
  <div class="layout">
    <AppHeader class="header" v-if="!route.meta.hideHeader" />
    <div class="content">
      <AppSidebar class="sidebar" v-if="!route.meta.hideHeader" />
      <main class="main">
        <slot />
      </main>
    </div>
    <AppFooter class="footer" />
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 98vh; /* 铺满视口 */
  width: 95vw; /* 铺满视口 */
  background: radial-gradient(1200px 600px at 10% -20%, #e8f0ff 0%, transparent 55%),
    radial-gradient(1000px 500px at 110% 0%, #fce7f3 0%, transparent 50%), #f7f8fa;
}

.content {
  flex: 1;
  display: flex;
  gap: 12px; /* 主体与侧栏留点缝隙更清爽 */
  padding: 12px 12px 0 12px;
  box-sizing: border-box;
}

.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
  color: #e5e7eb;
  border-radius: 14px;
  overflow: hidden auto;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.main {
  flex: 1;
  padding: 16px;
  background: #ffffff;
  width: 0; /* 防止被 sidebar 挤压 */
  box-sizing: border-box;
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.footer {
  height: 44px;
  background: transparent;
  text-align: center;
  line-height: 44px;
  color: #6b7280;
}

/* 去掉开发时的虚线边框 */
.layout,
.content,
.main,
.sidebar {
  border: none;
}

/* 小屏自适应：隐藏侧栏，主内容全宽 */
@media (max-width: 1024px) {
  .content {
    padding: 8px;
    gap: 8px;
  }
  .sidebar {
    display: none;
  }
  .main {
    border-radius: 10px;
  }
}
</style>

