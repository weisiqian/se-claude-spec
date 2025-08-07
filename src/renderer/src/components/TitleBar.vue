<template>
  <div class="title-bar">
    <!-- 应用图标和菜单 -->
    <div class="app-menu" @mouseenter="showMenu = true" @mouseleave="handleMenuLeave">
      <div class="app-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" fill="currentColor" />
          <rect x="14" y="3" width="7" height="7" fill="currentColor" />
          <rect x="3" y="14" width="7" height="7" fill="currentColor" />
          <rect x="14" y="14" width="7" height="7" fill="currentColor" />
        </svg>
      </div>
      <transition name="menu-slide">
        <div class="dropdown-menu" v-show="showMenu">
          <!-- 一级菜单 -->
          <div class="primary-menu">
            <div class="primary-menu-item" 
                 @mouseenter="activeSubmenu = 'project'"
                 @click="handlePrimaryClick('project')">
              <el-icon><FolderOpened /></el-icon>
              <span>项目</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="activeSubmenu = 'requirement'"
                 @click="handlePrimaryClick('requirement')">
              <el-icon><Document /></el-icon>
              <span>需求</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="activeSubmenu = 'design'"
                 @click="handlePrimaryClick('design')">
              <el-icon><Brush /></el-icon>
              <span>设计</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="activeSubmenu = 'task'"
                 @click="handlePrimaryClick('task')">
              <el-icon><Tickets /></el-icon>
              <span>任务</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="activeSubmenu = 'help'"
                 @click="handlePrimaryClick('help')">
              <el-icon><QuestionFilled /></el-icon>
              <span>帮助</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
          
          <!-- 二级菜单 -->
          <transition name="submenu-slide">
            <div class="secondary-menu" v-show="activeSubmenu">
              <!-- 项目子菜单 -->
              <div v-if="activeSubmenu === 'project'" class="submenu-content">
                <div class="menu-item" @click="selectDirectory">
                  <el-icon><FolderOpened /></el-icon>
                  <span>选择目录</span>
                  <span class="menu-shortcut">Ctrl+O</span>
                </div>
              </div>
              
              <!-- 需求子菜单 -->
              <div v-if="activeSubmenu === 'requirement'" class="submenu-content">
                <div class="menu-item" @click="handleAction('requirement', 'create')">
                  <el-icon><DocumentAdd /></el-icon>
                  <span>新建需求文档</span>
                  <span class="menu-shortcut">Ctrl+N</span>
                </div>
                <div class="menu-item" @click="handleAction('requirement', 'update')">
                  <el-icon><Edit /></el-icon>
                  <span>更新需求文档</span>
                  <span class="menu-shortcut">Ctrl+U</span>
                </div>
              </div>
              
              <!-- 设计子菜单 -->
              <div v-if="activeSubmenu === 'design'" class="submenu-content">
                <div class="menu-item" @click="handleAction('design', 'create')">
                  <el-icon><DocumentAdd /></el-icon>
                  <span>新建设计文档</span>
                  <span class="menu-shortcut">Ctrl+Shift+N</span>
                </div>
                <div class="menu-item" @click="handleAction('design', 'update')">
                  <el-icon><Edit /></el-icon>
                  <span>更新设计文档</span>
                  <span class="menu-shortcut">Ctrl+Shift+U</span>
                </div>
              </div>
              
              <!-- 任务子菜单 -->
              <div v-if="activeSubmenu === 'task'" class="submenu-content">
                <div class="menu-item" @click="handleAction('task', 'create')">
                  <el-icon><DocumentAdd /></el-icon>
                  <span>新建任务清单</span>
                  <span class="menu-shortcut">Ctrl+T</span>
                </div>
                <div class="menu-item" @click="handleAction('task', 'update')">
                  <el-icon><Edit /></el-icon>
                  <span>更新任务清单</span>
                  <span class="menu-shortcut">Ctrl+Shift+T</span>
                </div>
                <div class="menu-item" @click="handleAction('task', 'execute')">
                  <el-icon><VideoPlay /></el-icon>
                  <span>执行任务清单</span>
                  <span class="menu-shortcut">Ctrl+E</span>
                </div>
              </div>
              
              <!-- 帮助子菜单 -->
              <div v-if="activeSubmenu === 'help'" class="submenu-content">
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
            </div>
          </transition>
        </div>
      </transition>
    </div>

    <!-- 终端标签区域 -->
    <div class="terminal-tabs-container">
      <div class="terminal-tabs">
        <div
          v-for="(terminal, index) in terminals"
          :key="terminal.id"
          :class="['terminal-tab', { active: activeTerminalId === terminal.id }]"
          @click="switchTerminal(terminal.id)"
        >
          <span>{{ terminal.label || `终端 ${index + 1}` }}</span>
          <el-icon
            v-if="terminals.length > 1"
            class="tab-close"
            @click.stop="closeTerminal(terminal.id)"
          >
            <Close />
          </el-icon>
        </div>
        <!-- 新建终端按钮组 -->
        <div class="new-terminal-group" @mouseleave="handleTerminalMenuLeave">
          <button class="new-terminal-button" @click="createNewTerminal('bash')" title="新建终端">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="terminal-type-selector" @click="toggleTerminalMenu" @mouseenter="clearTerminalMenuTimer" title="选择终端类型">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <!-- 终端类型下拉菜单 -->
          <transition name="menu-slide">
            <div class="terminal-type-menu" v-show="showTerminalMenu" @mouseenter="clearTerminalMenuTimer" @mouseleave="handleTerminalMenuLeave">
              <div class="menu-option" @click="createNewTerminal('bash')">
                <span class="terminal-icon">$</span>
                <span>Bash</span>
              </div>
              <div class="menu-option" @click="createNewTerminal('powershell')" v-if="isWindows">
                <span class="terminal-icon">PS</span>
                <span>PowerShell</span>
              </div>
              <div class="menu-option" @click="createNewTerminal('cmd')" v-if="isWindows">
                <span class="terminal-icon">></span>
                <span>Command Prompt</span>
              </div>
              <div class="menu-option" @click="createNewTerminal('zsh')" v-if="!isWindows">
                <span class="terminal-icon">%</span>
                <span>Zsh</span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 可拖拽区域 -->
    <div class="title-bar-drag-region"></div>

    <!-- 窗口控制按钮 -->
    <div class="title-bar-controls">
      <button class="title-bar-button minimize" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="6" width="8" height="1" fill="currentColor" />
        </svg>
      </button>
      <button class="title-bar-button maximize" @click="maximize" :title="isMaximized ? '还原' : '最大化'">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="3" width="6" height="6" stroke="currentColor" stroke-width="1" fill="none" />
          <rect x="4" y="2" width="6" height="6" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
      </button>
      <button class="title-bar-button close" @click="close" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  FolderOpened, 
  DocumentAdd, 
  Edit, 
  VideoPlay, 
  InfoFilled, 
  Sunny,
  Close,
  ArrowRight,
  Document,
  Brush,
  Tickets,
  QuestionFilled
} from '@element-plus/icons-vue'

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
const showMenu = ref(false)
const showTerminalMenu = ref(false)
const activeSubmenu = ref<string | null>(null)
const menuLeaveTimer = ref<NodeJS.Timeout | null>(null)
const terminalMenuTimer = ref<NodeJS.Timeout | null>(null)
const terminals = ref<Array<{ id: string; label?: string }>>(props.terminals || [])
const activeTerminalId = ref(props.activeTerminalId || '')
const isWindows = ref(false)

// 监听 props 变化
watch(() => props.terminals, (newTerminals) => {
  terminals.value = newTerminals || []
})

watch(() => props.activeTerminalId, (newId) => {
  activeTerminalId.value = newId || ''
})

const handleAction = (type: string, action: string) => {
  showMenu.value = false
  activeSubmenu.value = null
  emit('menu-action', type, action)
}

const handlePrimaryClick = (menu: string) => {
  activeSubmenu.value = menu
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

const selectDirectory = async () => {
  showMenu.value = false
  activeSubmenu.value = null
  const result = await window.api?.dialog?.openDirectory()
  if (result && !result.canceled && result.filePaths.length > 0) {
    emit('directory-selected', result.filePaths[0])
    ElMessage.success(`已选择目录: ${result.filePaths[0]}`)
  }
}

const showAbout = () => {
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

const toggleTheme = () => {
  showMenu.value = false
  activeSubmenu.value = null
  emit('theme-toggle')
  ElMessage.success(`已切换至${props.isDark ? '浅色' : '深色'}主题`)
}

const createNewTerminal = (type: string) => {
  showTerminalMenu.value = false
  emit('create-terminal', type)
}

const toggleTerminalMenu = () => {
  showTerminalMenu.value = !showTerminalMenu.value
  if (showTerminalMenu.value) {
    clearTerminalMenuTimer()
  }
}

const handleTerminalMenuLeave = () => {
  terminalMenuTimer.value = setTimeout(() => {
    showTerminalMenu.value = false
  }, 300)
}

const clearTerminalMenuTimer = () => {
  if (terminalMenuTimer.value) {
    clearTimeout(terminalMenuTimer.value)
    terminalMenuTimer.value = null
  }
}

const switchTerminal = (id: string) => {
  emit('switch-terminal', id)
}

const closeTerminal = (id: string) => {
  emit('close-terminal', id)
}

const minimize = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.minimize()
  }
}

const maximize = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.maximize()
  }
}

const close = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.close()
  }
}

const updateMaximizeState = async () => {
  if (window.api?.windowControls) {
    isMaximized.value = await window.api.windowControls.isMaximized()
  }
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

onMounted(async () => {
  if (window.api?.windowControls) {
    await updateMaximizeState()
    
    window.api.windowControls.onMaximizedChange((maximized: boolean) => {
      isMaximized.value = maximized
    })
  }
  
  // 检测操作系统
  const platform = navigator.platform.toLowerCase()
  isWindows.value = platform.includes('win')
  
  // 注册键盘事件监听
  document.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  if (window.api?.windowControls?.removeMaximizedListener) {
    window.api.windowControls.removeMaximizedListener()
  }
  if (menuLeaveTimer.value) {
    clearTimeout(menuLeaveTimer.value)
  }
  if (terminalMenuTimer.value) {
    clearTimeout(terminalMenuTimer.value)
  }
  document.removeEventListener('keydown', handleKeyboard)
})
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 32px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #d0d0d0;
  user-select: none;
  transition: background-color 0.3s, border-color 0.3s;
}

.dark .title-bar {
  background-color: #2d2d2d;
  border-bottom-color: #404040;
}

/* 应用菜单 */
.app-menu {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

.app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.app-icon:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

/* 下拉菜单容器 */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  background: transparent;
  z-index: 1000;
}

/* 一级菜单 */
.primary-menu {
  width: 180px;
  background: var(--bg-secondary, #fff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.primary-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.primary-menu-item:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.menu-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary, #999);
}

/* 二级菜单 */
.secondary-menu {
  position: absolute;
  left: 180px;
  top: 0;
  min-width: 260px;
  background: var(--bg-secondary, #fff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 0 6px 6px 6px;
  box-shadow: 2px 4px 12px rgba(0, 0, 0, 0.15);
  margin-left: 2px;
}

.submenu-content {
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.menu-item > span:nth-child(2) {
  flex: 1;
  white-space: nowrap;
}

.menu-shortcut {
  margin-left: 20px;
  font-size: 11px;
  color: var(--text-secondary, #999);
  white-space: nowrap;
}

/* 终端标签容器 */
.terminal-tabs-container {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.terminal-tabs {
  display: flex;
  align-items: center;
  height: 100%;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 100%;
  font-size: 13px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  border-right: 1px solid var(--border-primary, #e0e0e0);
  transition: background-color 0.2s, color 0.2s;
}

.terminal-tab:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.terminal-tab.active {
  color: var(--text-primary, #333);
  background-color: #ffffff;
  position: relative;
}

.terminal-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #0066cc;
}

.dark .terminal-tab.active {
  color: #fff;
  background-color: #1e1e1e;
}

.dark .terminal-tab.active::after {
  background-color: #3b8eea;
}

.tab-close {
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.tab-close:hover {
  opacity: 1;
}

/* 新建终端按钮组 */
.new-terminal-group {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: 4px;
  -webkit-app-region: no-drag;
}

.new-terminal-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px 0 0 4px;
  background: transparent;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.new-terminal-button:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.terminal-type-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 28px;
  border: none;
  border-left: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 0 4px 4px 0;
  background: transparent;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.terminal-type-selector:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

/* 终端类型菜单 */
.terminal-type-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  margin-top: 2px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 999;
}

.dark .terminal-type-menu {
  background: #2d2d2d;
  border-color: #404040;
}

.terminal-type-menu .menu-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
}

.terminal-type-menu .menu-option:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .terminal-type-menu .menu-option {
  color: #fff;
}

.dark .terminal-type-menu .menu-option:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.terminal-type-menu .menu-option:first-child {
  border-radius: 4px 4px 0 0;
}

.terminal-type-menu .menu-option:last-child {
  border-radius: 0 0 4px 4px;
}

.terminal-icon {
  display: inline-block;
  width: 20px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: bold;
  color: var(--text-secondary, #666);
}

/* 拖拽区域 */
.title-bar-drag-region {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

/* 窗口控制按钮 */
.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.title-bar-button {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #333);
  transition: background-color 0.1s ease;
}

.title-bar-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.title-bar-button.close:hover {
  background-color: #e81123;
  color: white;
}

.title-bar-button:active {
  background-color: rgba(0, 0, 0, 0.2);
}

.title-bar-button.close:active {
  background-color: #c50e1f;
}

/* 菜单动画 */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 二级菜单动画 */
.submenu-slide-enter-active,
.submenu-slide-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 深色主题支持 */
.dark .dropdown-menu {
  --bg-secondary: #2d2d2d;
  --border-primary: #404040;
  --text-primary: #fff;
  --text-secondary: #999;
  --hover-bg: rgba(255, 255, 255, 0.1);
}

.dark .menu-shortcut {
  color: #666;
}
</style>