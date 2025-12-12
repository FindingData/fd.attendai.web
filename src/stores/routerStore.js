// stores/routerStore.js 示例

import { defineStore } from 'pinia'

export const useRouterStore = defineStore('router', {
  state: () => ({
    keptAliveComponents: [], // 存储需要 keep-alive 的组件 name 列表
  }),
  actions: {
    addKeepAliveComponent(name) {
      if (name && !this.keptAliveComponents.includes(name)) {
        this.keptAliveComponents.push(name)
      }
    },
    removeKeepAliveComponent(name) {
      const index = this.keptAliveComponents.indexOf(name)
      if (index > -1) {
        this.keptAliveComponents.splice(index, 1)
      }
    },
  },
})
