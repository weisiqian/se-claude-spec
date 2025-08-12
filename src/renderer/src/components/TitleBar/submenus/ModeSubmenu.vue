<template>
  <div class="submenu-content">
    <div 
      class="submenu-item" 
      @click="handleModeSwitch('terminal')"
      :class="{ active: currentMode === 'terminal' }"
    >
      <el-icon><Monitor /></el-icon>
      <span>终端模式</span>
      <el-icon v-if="currentMode === 'terminal'" class="check-icon"><Check /></el-icon>
    </div>
    <div 
      class="submenu-item" 
      @click="handleModeSwitch('spc')"
      :class="{ active: currentMode === 'spc' }"
    >
      <el-icon><Grid /></el-icon>
      <span>SPC模式</span>
      <el-icon v-if="currentMode === 'spc'" class="check-icon"><Check /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Monitor, Grid, Check } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'action', type: string, action: string): void
}>()

const currentMode = ref<'terminal' | 'spc'>('terminal')

const handleModeSwitch = (mode: 'terminal' | 'spc') => {
  if (currentMode.value === mode) return
  currentMode.value = mode
  emit('action', 'mode', mode)
}

onMounted(() => {
  // 从 localStorage 读取当前模式
  const savedMode = localStorage.getItem('appMode')
  if (savedMode === 'spc' || savedMode === 'terminal') {
    currentMode.value = savedMode
  }
})
</script>

<style scoped>
.submenu-content {
  padding: 4px 0;
  min-width: 200px;
}

.submenu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--wt-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
}

.submenu-item:hover {
  background-color: var(--wt-bg-hover);
}

.submenu-item.active {
  background-color: var(--wt-bg-active);
  color: var(--wt-accent);
}

.submenu-item span {
  flex: 1;
}

.check-icon {
  margin-left: auto;
  color: var(--wt-accent);
  font-size: 16px;
}
</style>