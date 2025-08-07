<template>
  <div class="title-bar">
    <!-- 应用菜单 -->
    <AppMenu 
      :isDark="isDark"
      @menu-action="handleMenuAction"
      @directory-selected="handleDirectorySelected"
      @theme-toggle="handleThemeToggle"
    />

    <!-- 终端标签 -->
    <TerminalTabs
      :terminals="terminals"
      :activeTerminalId="activeTerminalId"
      @create-terminal="handleCreateTerminal"
      @switch-terminal="handleSwitchTerminal"
      @close-terminal="handleCloseTerminal"
      @titlebar-double-click="handleTitleBarDoubleClick"
    />

    <!-- 窗口控制按钮 -->
    <WindowControls 
      @maximize-state-change="handleMaximizeStateChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppMenu from './AppMenu.vue'
import TerminalTabs from './TerminalTabs.vue'
import WindowControls from './WindowControls.vue'
import { useKeyboardShortcuts } from '@renderer/composables/useKeyboardShortcuts'

const props = defineProps<{
  isDark?: boolean
  terminals?: Array<{ id: string; label?: string }>
  activeTerminalId?: string
}>()

const emit = defineEmits<{
  (e: 'menu-action', type: string, action: string): void
  (e: 'directory-selected', path: string): void
  (e: 'theme-toggle'): void
  (e: 'create-terminal', type: string): void
  (e: 'switch-terminal', id: string): void
  (e: 'close-terminal', id: string): void
}>()

const isMaximized = ref(false)

// 处理菜单动作
const handleMenuAction = (type: string, action: string) => {
  emit('menu-action', type, action)
}

// 处理目录选择
const handleDirectorySelected = (path: string) => {
  emit('directory-selected', path)
}

// 处理主题切换
const handleThemeToggle = () => {
  emit('theme-toggle')
}

// 处理创建终端
const handleCreateTerminal = (type: string) => {
  emit('create-terminal', type)
}

// 处理切换终端
const handleSwitchTerminal = (id: string) => {
  emit('switch-terminal', id)
}

// 处理关闭终端
const handleCloseTerminal = (id: string) => {
  emit('close-terminal', id)
}

// 处理标题栏双击
const handleTitleBarDoubleClick = async () => {
  if (window.api?.windowControls) {
    const currentMaximized = await window.api.windowControls.isMaximized()
    window.api.windowControls.maximize()
    isMaximized.value = !currentMaximized
  }
}

// 处理最大化状态变化
const handleMaximizeStateChange = (maximized: boolean) => {
  isMaximized.value = maximized
}

// 选择目录
const selectDirectory = async () => {
  const result = await window.api?.dialog?.openDirectory()
  if (result && !result.canceled && result.filePaths.length > 0) {
    emit('directory-selected', result.filePaths[0])
    ElMessage.success(`已选择目录: ${result.filePaths[0]}`)
  }
}

// 显示关于对话框
const showAbout = () => {
  ElMessageBox.alert(
    '这是一个基于 Electron + Vue 的桌面应用程序',
    '关于',
    {
      confirmButtonText: '确定',
    }
  )
}

// 使用键盘快捷键
useKeyboardShortcuts({
  selectDirectory,
  createRequirement: () => handleMenuAction('requirement', 'create'),
  updateRequirement: () => handleMenuAction('requirement', 'update'),
  createDesign: () => handleMenuAction('design', 'create'),
  updateDesign: () => handleMenuAction('design', 'update'),
  createTask: () => handleMenuAction('task', 'create'),
  updateTask: () => handleMenuAction('task', 'update'),
  executeTask: () => handleMenuAction('task', 'execute'),
  toggleTheme: handleThemeToggle,
  showAbout
})
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 38px;
  background-color: var(--wt-bg-secondary);
  user-select: none;
  position: relative;
  z-index: 100;
  transition: border-radius 0.2s;
  justify-content: space-between;
  overflow: visible !important;
}

:global(.app.maximized) .title-bar {
  border-radius: 0;
}
</style>