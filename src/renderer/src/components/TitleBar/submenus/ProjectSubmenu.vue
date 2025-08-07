<template>
  <div class="submenu-content">
    <div class="menu-item" @click="selectDirectory">
      <el-icon><FolderOpened /></el-icon>
      <span>选择目录</span>
      <span class="menu-shortcut">Ctrl+O</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpened } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'directory-selected'): void
}>()

const selectDirectory = () => {
  emit('directory-selected')
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