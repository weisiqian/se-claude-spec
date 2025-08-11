<template>
  <div class="app-menu" @mouseenter="showMenu = true" @mouseleave="handleMenuLeave">
    <div class="app-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" fill="#ffffff" />
        <rect x="14" y="3" width="7" height="7" fill="#ffffff" />
        <rect x="3" y="14" width="7" height="7" fill="#ffffff" />
        <rect x="14" y="14" width="7" height="7" fill="#ffffff" />
      </svg>
    </div>
    <transition name="menu-slide">
      <div class="dropdown-menu" v-show="showMenu">
        <!-- 一级菜单 -->
        <div class="primary-menu">
          <div 
            v-for="item in menuItems" 
            :key="item.key"
            class="primary-menu-item" 
            @mouseenter="() => { activeSubmenu = item.key; updateSubmenuPosition(item.key); }"
            @click="handlePrimaryClick(item.key)">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
            <el-icon class="menu-arrow" v-if="item.key !== 'execution'"><ArrowRight /></el-icon>
          </div>
        </div>
        
        <!-- 二级菜单 -->
        <transition name="submenu-slide">
          <div class="secondary-menu" 
               v-show="activeSubmenu"
               :style="{ top: submenuTopPosition + 'px', left: submenuLeftPosition + 'px' }">
            <component 
              :is="getSubmenuComponent(activeSubmenu)" 
              v-if="activeSubmenu"
              @action="handleAction"
              @directory-selected="handleDirectorySelected"
              @theme-toggle="handleThemeToggle"
              @show-about="handleShowAbout"
              :isDark="isDark"
            />
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  FolderOpened, 
  DocumentAdd, 
  Edit, 
  VideoPlay, 
  InfoFilled, 
  Sunny,
  ArrowRight,
  Document,
  Brush,
  Tickets,
  QuestionFilled,
  Operation
} from '@element-plus/icons-vue'

// 子菜单组件
import ProjectSubmenu from './submenus/ProjectSubmenu.vue'
import RequirementSubmenu from './submenus/RequirementSubmenu.vue'
import DesignSubmenu from './submenus/DesignSubmenu.vue'
import TaskSubmenu from './submenus/TaskSubmenu.vue'
import HelpSubmenu from './submenus/HelpSubmenu.vue'

const props = defineProps<{
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'menu-action', type: string, action: string): void
  (e: 'directory-selected', path: string): void
  (e: 'theme-toggle'): void
}>()

const showMenu = ref(false)
const activeSubmenu = ref<string | null>(null)
const menuLeaveTimer = ref<NodeJS.Timeout | null>(null)
const submenuTopPosition = ref<number>(0)
const submenuLeftPosition = ref<number>(0)

const menuItems = shallowRef([
  { key: 'project', label: '项目', icon: FolderOpened },
  { key: 'requirement', label: '需求', icon: Document },
  { key: 'design', label: '设计', icon: Brush },
  { key: 'task', label: '任务', icon: Tickets },
  { key: 'execution', label: '执行计划', icon: Operation },
  { key: 'help', label: '帮助', icon: QuestionFilled }
])

const getSubmenuComponent = (key: string) => {
  const components: Record<string, any> = {
    project: ProjectSubmenu,
    requirement: RequirementSubmenu,
    design: DesignSubmenu,
    task: TaskSubmenu,
    help: HelpSubmenu
  }
  return components[key]
}

const handlePrimaryClick = (menu: string) => {
  // 如果是执行计划，直接触发打开执行管理页面
  if (menu === 'execution') {
    showMenu.value = false
    activeSubmenu.value = null
    emit('menu-action', 'execution', 'open-manager')
    return
  }
  
  activeSubmenu.value = menu
  updateSubmenuPosition(menu)
}

const updateSubmenuPosition = (menu: string) => {
  const primaryMenu = document.querySelector('.primary-menu') as HTMLElement
  if (!primaryMenu) return
  
  const menuItems = primaryMenu.querySelectorAll('.primary-menu-item')
  const menuLabels: Record<string, string> = {
    'project': '项目',
    'requirement': '需求',
    'design': '设计',
    'task': '任务',
    'execution': '执行计划',
    'help': '帮助'
  }
  
  menuItems.forEach((item) => {
    const span = item.querySelector('span')
    if (span && span.textContent === menuLabels[menu]) {
      const rect = item.getBoundingClientRect()
      const primaryRect = primaryMenu.getBoundingClientRect()
      submenuTopPosition.value = rect.top
      submenuLeftPosition.value = primaryRect.right
    }
  })
}

const handleMenuLeave = () => {
  if (menuLeaveTimer.value) {
    clearTimeout(menuLeaveTimer.value)
  }
  menuLeaveTimer.value = setTimeout(() => {
    showMenu.value = false
    activeSubmenu.value = null
  }, 300)
}

const handleAction = (type: string, action: string) => {
  showMenu.value = false
  activeSubmenu.value = null
  emit('menu-action', type, action)
}

const handleDirectorySelected = async (path?: string) => {
  showMenu.value = false
  activeSubmenu.value = null
  
  // 如果传入了路径，说明是从最近目录选择的，直接使用
  if (path) {
    emit('directory-selected', path)
  } else {
    // 否则弹出选择框
    const result = await window.api?.dialog?.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      emit('directory-selected', result.filePaths[0])
      ElMessage.success(`已选择目录: ${result.filePaths[0]}`)
    }
  }
}

const handleThemeToggle = () => {
  showMenu.value = false
  activeSubmenu.value = null
  emit('theme-toggle')
  ElMessage.success(`已切换至${props.isDark ? '浅色' : '深色'}主题`)
}

const handleShowAbout = () => {
  showMenu.value = false
  activeSubmenu.value = null
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
.app-menu {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
  flex: 0 0 auto;
}

.app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s;
}

.app-icon:hover {
  background-color: var(--wt-bg-hover);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  background: transparent;
  z-index: 1000;
}

.primary-menu {
  width: 200px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  box-shadow: var(--wt-shadow);
  overflow: hidden;
  margin-top: 4px;
}

.primary-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
}

.primary-menu-item:hover {
  background-color: var(--wt-bg-hover);
}

.menu-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.secondary-menu {
  position: fixed;
  min-width: 280px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  box-shadow: var(--wt-shadow);
}

.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.submenu-slide-enter-active,
.submenu-slide-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>