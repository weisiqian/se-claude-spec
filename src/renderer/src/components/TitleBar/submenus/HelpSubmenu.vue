<template>
  <div class="submenu-content">
    <div class="menu-item" @click="showAbout">
      <el-icon><InfoFilled /></el-icon>
      <span>关于</span>
      <span class="menu-shortcut">F1</span>
    </div>
    <div class="menu-item" @click="toggleTheme">
      <el-icon><Sunny /></el-icon>
      <span>{{ isDark ? '浅色主题' : '深色主题' }}</span>
      <span class="menu-shortcut">Ctrl+Shift+D</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { InfoFilled, Sunny } from '@element-plus/icons-vue'

const props = defineProps<{
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'show-about'): void
  (e: 'theme-toggle'): void
}>()

const showAbout = () => {
  emit('show-about')
}

const toggleTheme = () => {
  emit('theme-toggle')
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