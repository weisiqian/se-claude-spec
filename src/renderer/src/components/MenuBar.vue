<template>
  <div class="menu-bar" @mouseleave="closeMenu">
    <div class="menu-item" 
         @mouseenter="openMenu('project')"
         @click="toggleMenu('project')">
      <span>项目</span>
      <transition name="menu-fade">
        <div class="menu-dropdown" v-show="activeMenu === 'project'">
          <div class="menu-option" @click="selectDirectory">
            <el-icon><FolderOpened /></el-icon>
            <span>选择目录</span>
            <span class="menu-shortcut">Ctrl+O</span>
          </div>
        </div>
      </transition>
    </div>
    
    <div class="menu-item" 
         @mouseenter="openMenu('requirement')"
         @click="toggleMenu('requirement')">
      <span>需求</span>
      <transition name="menu-fade">
        <div class="menu-dropdown" v-show="activeMenu === 'requirement'">
          <div class="menu-option" @click="handleAction('requirement', 'create')">
            <el-icon><DocumentAdd /></el-icon>
            <span>新建需求文档</span>
            <span class="menu-shortcut">Ctrl+N</span>
          </div>
          <div class="menu-option" @click="handleAction('requirement', 'update')">
            <el-icon><Edit /></el-icon>
            <span>更新需求文档</span>
            <span class="menu-shortcut">Ctrl+U</span>
          </div>
        </div>
      </transition>
    </div>
    
    <div class="menu-item" 
         @mouseenter="openMenu('design')"
         @click="toggleMenu('design')">
      <span>设计</span>
      <transition name="menu-fade">
        <div class="menu-dropdown" v-show="activeMenu === 'design'">
          <div class="menu-option" @click="handleAction('design', 'create')">
            <el-icon><DocumentAdd /></el-icon>
            <span>新建设计文档</span>
            <span class="menu-shortcut">Ctrl+Shift+N</span>
          </div>
          <div class="menu-option" @click="handleAction('design', 'update')">
            <el-icon><Edit /></el-icon>
            <span>更新设计文档</span>
            <span class="menu-shortcut">Ctrl+Shift+U</span>
          </div>
        </div>
      </transition>
    </div>
    
    <div class="menu-item" 
         @mouseenter="openMenu('task')"
         @click="toggleMenu('task')">
      <span>任务</span>
      <transition name="menu-fade">
        <div class="menu-dropdown" v-show="activeMenu === 'task'">
          <div class="menu-option" @click="handleAction('task', 'create')">
            <el-icon><DocumentAdd /></el-icon>
            <span>新建任务清单</span>
            <span class="menu-shortcut">Ctrl+T</span>
          </div>
          <div class="menu-option" @click="handleAction('task', 'update')">
            <el-icon><Edit /></el-icon>
            <span>更新任务清单</span>
            <span class="menu-shortcut">Ctrl+Shift+T</span>
          </div>
          <div class="menu-option" @click="handleAction('task', 'execute')">
            <el-icon><VideoPlay /></el-icon>
            <span>执行任务清单</span>
            <span class="menu-shortcut">Ctrl+E</span>
          </div>
        </div>
      </transition>
    </div>
    
    <div class="menu-item" 
         @mouseenter="openMenu('help')"
         @click="toggleMenu('help')">
      <span>帮助</span>
      <transition name="menu-fade">
        <div class="menu-dropdown" v-show="activeMenu === 'help'">
          <div class="menu-option" @click="showAbout">
            <el-icon><InfoFilled /></el-icon>
            <span>关于</span>
            <span class="menu-shortcut">F1</span>
          </div>
          <div class="menu-option" @click="toggleTheme">
            <el-icon><Sunny /></el-icon>
            <span>主题</span>
            <span class="menu-shortcut">Ctrl+Shift+D</span>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  FolderOpened, 
  DocumentAdd, 
  Edit, 
  VideoPlay, 
  InfoFilled, 
  Sunny 
} from '@element-plus/icons-vue'

const props = defineProps<{
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'menu-action', type: string, action: string): void
  (e: 'directory-selected', path: string): void
  (e: 'theme-toggle'): void
}>()

const activeMenu = ref<string | null>(null)
const menuHoverTimer = ref<NodeJS.Timeout | null>(null)
const isMenuOpen = ref(false)

const openMenu = (menu: string) => {
  if (menuHoverTimer.value) {
    clearTimeout(menuHoverTimer.value)
  }
  
  if (isMenuOpen.value || activeMenu.value) {
    activeMenu.value = menu
  }
}

const closeMenu = () => {
  menuHoverTimer.value = setTimeout(() => {
    if (isMenuOpen.value) {
      activeMenu.value = null
      isMenuOpen.value = false
    }
  }, 300)
}

const toggleMenu = (menu: string) => {
  if (activeMenu.value === menu) {
    activeMenu.value = null
    isMenuOpen.value = false
  } else {
    activeMenu.value = menu
    isMenuOpen.value = true
  }
}

const selectDirectory = async () => {
  activeMenu.value = null
  isMenuOpen.value = false
  
  const result = await window.api?.dialog?.openDirectory()
  if (result && !result.canceled && result.filePaths.length > 0) {
    emit('directory-selected', result.filePaths[0])
    ElMessage.success(`已选择目录: ${result.filePaths[0]}`)
  }
}

const handleAction = (type: string, action: string) => {
  activeMenu.value = null
  isMenuOpen.value = false
  emit('menu-action', type, action)
}

const showAbout = () => {
  activeMenu.value = null
  isMenuOpen.value = false
  ElMessageBox.alert(
    '这是一个基于 Electron + Vue 的桌面应用程序',
    '关于',
    {
      confirmButtonText: '确定',
    }
  )
}

const toggleTheme = () => {
  activeMenu.value = null
  isMenuOpen.value = false
  emit('theme-toggle')
  ElMessage.success(`已切换至${props.isDark ? '浅色' : '深色'}主题`)
}

const handleKeyboard = (event: KeyboardEvent) => {
  const ctrl = event.ctrlKey || event.metaKey
  const shift = event.shiftKey
  const key = event.key.toLowerCase()
  
  if (ctrl && !shift && key === 'o') {
    event.preventDefault()
    selectDirectory()
  } else if (ctrl && !shift && key === 'n') {
    event.preventDefault()
    handleAction('requirement', 'create')
  } else if (ctrl && !shift && key === 'u') {
    event.preventDefault()
    handleAction('requirement', 'update')
  } else if (ctrl && shift && key === 'n') {
    event.preventDefault()
    handleAction('design', 'create')
  } else if (ctrl && shift && key === 'u') {
    event.preventDefault()
    handleAction('design', 'update')
  } else if (ctrl && !shift && key === 't') {
    event.preventDefault()
    handleAction('task', 'create')
  } else if (ctrl && shift && key === 't') {
    event.preventDefault()
    handleAction('task', 'update')
  } else if (ctrl && !shift && key === 'e') {
    event.preventDefault()
    handleAction('task', 'execute')
  } else if (ctrl && shift && key === 'd') {
    event.preventDefault()
    toggleTheme()
  } else if (key === 'f1') {
    event.preventDefault()
    showAbout()
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const menuBar = document.querySelector('.menu-bar')
  if (menuBar && !menuBar.contains(event.target as Node)) {
    activeMenu.value = null
    isMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyboard)
  if (menuHoverTimer.value) {
    clearTimeout(menuHoverTimer.value)
  }
})
</script>

<style scoped>
.menu-bar {
  display: flex;
  height: 100%;
  user-select: none;
  position: relative;
  z-index: 1000;
}

.menu-item {
  position: relative;
  padding: 0 12px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #333);
  transition: background-color 0.1s;
}

.menu-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.menu-option {
  padding: 8px 16px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
  position: relative;
}

.menu-option > span:first-of-type {
  flex: 1;
}

.menu-shortcut {
  margin-left: auto;
  font-size: 11px;
  color: #999;
  padding-left: 20px;
}

.menu-option:hover {
  background-color: #f5f5f5;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.menu-option:first-child {
  border-radius: 4px 4px 0 0;
}

.menu-option:last-child {
  border-radius: 0 0 4px 4px;
}

.dark .menu-bar {
  background-color: #2d2d2d;
  border-bottom-color: #404040;
}

.dark .menu-item {
  color: #fff;
}

.dark .menu-item:hover {
  background-color: #3a3a3a;
}

.dark .menu-dropdown {
  background: #2d2d2d;
  border-color: #404040;
}

.dark .menu-option {
  color: #fff;
}

.dark .menu-option:hover {
  background-color: #3a3a3a;
}

.dark .menu-shortcut {
  color: #666;
}
</style>