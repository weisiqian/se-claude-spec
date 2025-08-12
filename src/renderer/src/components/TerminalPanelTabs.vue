<template>
  <div class="terminal-panel-tabs">
    <div class="tab-list">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="handleTabClick(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Tab {
  id: string
  label: string
}

const emit = defineEmits<{
  (e: 'tab-change', tabId: string): void
}>()

const activeTab = ref('terminal')

const tabs: Tab[] = [
  { id: 'terminal', label: '终端' },
  { id: 'sdk', label: 'SDK' }
]

const handleTabClick = (tabId: string) => {
  activeTab.value = tabId
  emit('tab-change', tabId)
}

// 暴露方法给父组件
defineExpose({
  activeTab
})
</script>

<style scoped>
.terminal-panel-tabs {
  height: 32px;
  background: var(--wt-bg-primary);
  border-bottom: 1px solid var(--wt-border);
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.tab-list {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 0;
}

.tab-button {
  height: 28px;
  padding: 0 16px;
  border: none;
  background: transparent;
  color: var(--wt-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  transition: all 0.15s ease;
  position: relative;
  margin: 0 1px;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  background: var(--wt-bg-hover);
  color: var(--wt-text-primary);
}

.tab-button.active {
  background: var(--wt-bg-primary);
  color: var(--wt-text-primary);
  border-bottom: 2px solid var(--wt-accent);
}

.tab-button.active::before {
  content: '';
  position: absolute;
  left: -1px;
  right: -1px;
  bottom: -1px;
  height: 1px;
  background: var(--wt-bg-primary);
  z-index: 1;
}
</style>