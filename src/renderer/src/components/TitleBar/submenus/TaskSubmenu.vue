<template>
  <div class="submenu-content">
    <div class="menu-item" @click="handleAction('create')">
      <el-icon><DocumentAdd /></el-icon>
      <span>新建任务清单</span>
      <span class="menu-shortcut">Ctrl+T</span>
    </div>
    <div class="menu-item" @click="handleAction('update')">
      <el-icon><Edit /></el-icon>
      <span>更新任务清单</span>
      <span class="menu-shortcut">Ctrl+Shift+T</span>
    </div>
    <div class="menu-item" @click="handleAction('execute')">
      <el-icon><VideoPlay /></el-icon>
      <span>执行任务清单</span>
      <span class="menu-shortcut">Ctrl+E</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DocumentAdd, Edit, VideoPlay } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'action', type: string, action: string): void
}>()

const handleAction = (action: string) => {
  emit('action', 'task', action)
}
</script>

<style scoped>
.submenu-content {
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  font-size: 13px;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: var(--wt-bg-hover);
}

.menu-item > span:nth-child(2) {
  flex: 1;
  white-space: nowrap;
}

.menu-shortcut {
  margin-left: auto;
  padding-left: 20px;
  font-size: 11px;
  color: var(--wt-text-tertiary);
  white-space: nowrap;
  opacity: 0.8;
}
</style>