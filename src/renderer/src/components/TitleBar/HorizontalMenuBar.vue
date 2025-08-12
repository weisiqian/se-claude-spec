<template>
  <div class="horizontal-menu-bar" @dblclick="handleTitleBarDoubleClick">
    <!-- 应用图标 -->
    <AppIcon @dblclick.stop />
    
    <!-- 菜单项 -->
    <div 
      v-for="item in menuItems" 
      :key="item.key"
      class="menu-item"
      @mouseenter="handleMenuHover(item.key)"
      @mouseleave="handleMenuLeave"
      @click="handleMenuClick(item.key)"
      @dblclick.stop
    >
      <span>{{ item.label }}</span>
      
      <!-- 二级菜单 -->
      <transition name="submenu-slide">
        <div 
          v-if="activeMenu === item.key && hasSubmenu(item.key)"
          class="submenu-dropdown"
          @mouseenter="clearMenuTimer"
          @mouseleave="handleMenuLeave"
        >
          <component 
            :is="getSubmenuComponent(item.key)" 
            @action="handleAction"
            @directory-selected="handleDirectorySelected"
            @theme-toggle="handleThemeToggle"
            @show-about="handleShowAbout"
            :isDark="isDark"
          />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件
import AppIcon from './AppIcon.vue'

// 子菜单组件
import ProjectSubmenu from './submenus/ProjectSubmenu.vue'
import RequirementSubmenu from './submenus/RequirementSubmenu.vue'
import DesignSubmenu from './submenus/DesignSubmenu.vue'
import TaskSubmenu from './submenus/TaskSubmenu.vue'
import ModeSubmenu from './submenus/ModeSubmenu.vue'
import HelpSubmenu from './submenus/HelpSubmenu.vue'

const props = defineProps<{
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'menu-action', type: string, action: string): void
  (e: 'directory-selected', path: string): void
  (e: 'theme-toggle'): void
  (e: 'titlebar-double-click'): void
}>()

const activeMenu = ref<string | null>(null)
const menuTimer = ref<NodeJS.Timeout | null>(null)

const menuItems = shallowRef([
  { key: 'project', label: '项目' },
  { key: 'requirement', label: '需求' },
  { key: 'design', label: '设计' },
  { key: 'task', label: '任务' },
  { key: 'execution', label: '执行计划' },
  { key: 'mode', label: '模式' },
  { key: 'help', label: '帮助' }
])

const hasSubmenu = (key: string) => {
  return key !== 'execution'
}

const getSubmenuComponent = (key: string) => {
  const components: Record<string, any> = {
    project: ProjectSubmenu,
    requirement: RequirementSubmenu,
    design: DesignSubmenu,
    task: TaskSubmenu,
    mode: ModeSubmenu,
    help: HelpSubmenu
  }
  return components[key]
}

const handleMenuHover = (key: string) => {
  clearMenuTimer()
  if (hasSubmenu(key)) {
    activeMenu.value = key
  }
}

const handleMenuClick = (key: string) => {
  if (key === 'execution') {
    // 执行计划没有子菜单，直接触发动作
    emit('menu-action', 'execution', 'open-manager')
    activeMenu.value = null
  } else if (hasSubmenu(key)) {
    // 有子菜单的项，点击时切换显示状态
    if (activeMenu.value === key) {
      activeMenu.value = null
    } else {
      activeMenu.value = key
    }
  }
}

const handleMenuLeave = () => {
  menuTimer.value = setTimeout(() => {
    activeMenu.value = null
  }, 300)
}

const clearMenuTimer = () => {
  if (menuTimer.value) {
    clearTimeout(menuTimer.value)
    menuTimer.value = null
  }
}

const handleAction = (type: string, action: string) => {
  activeMenu.value = null
  emit('menu-action', type, action)
}

const handleDirectorySelected = async (path?: string) => {
  activeMenu.value = null
  
  if (path) {
    emit('directory-selected', path)
  } else {
    const result = await window.api?.dialog?.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      emit('directory-selected', result.filePaths[0])
      ElMessage.success(`已选择目录: ${result.filePaths[0]}`)
    }
  }
}

const handleThemeToggle = () => {
  activeMenu.value = null
  emit('theme-toggle')
  ElMessage.success(`已切换至${props.isDark ? '浅色' : '深色'}主题`)
}

// 处理标题栏双击
const handleTitleBarDoubleClick = () => {
  emit('titlebar-double-click')
}

const handleShowAbout = () => {
  activeMenu.value = null
  ElMessageBox.alert(
    '这是一个基于 Electron + Vue 的桌面应用程序',
    '关于',
    {
      confirmButtonText: '确定',
    }
  )
}
</script>

<style scoped>
.horizontal-menu-bar {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  gap: 0;
  -webkit-app-region: no-drag;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  font-size: 13px;
  color: var(--wt-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
  user-select: none;
}

.menu-item:hover {
  background-color: var(--wt-bg-hover);
}

.menu-item.active {
  background-color: var(--wt-bg-hover);
}

.submenu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  box-shadow: var(--wt-shadow);
  z-index: 1000;
  margin-top: 2px;
}

.submenu-slide-enter-active,
.submenu-slide-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 确保子菜单在标题栏下方正确显示 */
.horizontal-menu-bar::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 10px;
  pointer-events: none;
}
</style>