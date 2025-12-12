

<template>
  <layout>
    <router-view v-slot="{ Component }">
      <keep-alive :include="cachedViews">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </layout>
</template>

<script setup>
import layout from './layout/Layout.vue'
import { ref } from 'vue'

const cachedViews = ref(['TaskList', 'MyTasks'])
</script>
