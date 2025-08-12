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
  height: 95vh;
  width: 95vw; /* ✅ 加这一句确保铺满整个页面 */
}

.content {
  flex: 1;
  display: flex;
}

.sidebar {
  width: 200px;
  background-color: #34495e;
  color: white;
  overflow-y: auto;
}

.main {
  flex: 1;
  padding: 16px;
  background: #f5f5f5;
  width: 0; /* ✅ 避免被 sidebar 挤压 */
  box-sizing: border-box;
}

.footer {
  height: 40px;
  background-color: #ecf0f1;
  text-align: center;
  line-height: 40px;
  flex-shrink: 0;
}

.layout,
.content,
.main,
.sidebar {
  border: 1px dashed red;
}
</style>
