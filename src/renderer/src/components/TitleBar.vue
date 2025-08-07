<template>
  <div class="title-bar">
    <!-- 应用图标和菜单 - 固定在最左边 -->
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
            <div class="primary-menu-item" 
                 @mouseenter="() => { activeSubmenu = 'project'; updateSubmenuPosition('project'); }"
                 @click="handlePrimaryClick('project')">
              <el-icon><FolderOpened /></el-icon>
              <span>项目</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="() => { activeSubmenu = 'requirement'; updateSubmenuPosition('requirement'); }"
                 @click="handlePrimaryClick('requirement')">
              <el-icon><Document /></el-icon>
              <span>需求</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="() => { activeSubmenu = 'design'; updateSubmenuPosition('design'); }"
                 @click="handlePrimaryClick('design')">
              <el-icon><Brush /></el-icon>
              <span>设计</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="() => { activeSubmenu = 'task'; updateSubmenuPosition('task'); }"
                 @click="handlePrimaryClick('task')">
              <el-icon><Tickets /></el-icon>
              <span>任务</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="primary-menu-item" 
                 @mouseenter="() => { activeSubmenu = 'help'; updateSubmenuPosition('help'); }"
                 @click="handlePrimaryClick('help')">
              <el-icon><QuestionFilled /></el-icon>
              <span>帮助</span>
              <el-icon class="menu-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
          
          <!-- 二级菜单 -->
          <transition name="submenu-slide">
            <div class="secondary-menu" 
                 v-show="activeSubmenu"
                 :style="{ top: submenuTopPosition + 'px', left: submenuLeftPosition + 'px' }">
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

    <!-- 中间区域：终端标签和可拖拽区域 -->
    <div class="terminal-tabs-container" ref="tabsContainer" @dblclick="handleTitleBarDoubleClick">
      <div class="terminal-tabs-scroll-wrapper" ref="scrollWrapper" @wheel="handleWheel" @mousedown="handleMouseDown">
        <div class="terminal-tabs" ref="tabsWrapper">
          <!-- 所有标签 -->
          <div
            v-for="(terminal, index) in terminals"
            :key="terminal.id"
            :class="['terminal-tab', { active: activeTerminalId === terminal.id }]"
            @click.stop="switchTerminal(terminal.id)"
            @dblclick.stop
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
        </div>
      </div>
      
      <!-- 新建终端按钮组 -->
      <div class="new-terminal-group" @mouseenter="clearTerminalMenuTimer" @mouseleave="handleTerminalMenuLeave" @dblclick.stop>
        <button class="new-terminal-button" @click.stop="createNewTerminal('bash')" title="新建终端">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="terminal-type-selector" @click.stop="toggleTerminalMenu" @mouseenter="handleTerminalSelectorHover" title="选择终端类型">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
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

    <!-- 窗口控制按钮 - 固定在最右边 -->
    <div class="title-bar-controls">
      <button class="title-bar-button minimize" @click="minimize" title="最小化">
        <svg width="14" height="14" viewBox="0 0 12 12">
          <rect x="2" y="6" width="8" height="1" fill="#ffffff" />
        </svg>
      </button>
      <button class="title-bar-button maximize" @click="maximize" :title="isMaximized ? '还原' : '最大化'">
        <svg v-if="!isMaximized" width="14" height="14" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" stroke="#ffffff" stroke-width="1" fill="none" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 12 12">
          <rect x="2" y="3" width="6" height="6" stroke="#ffffff" stroke-width="1" fill="none" />
          <rect x="4" y="2" width="6" height="6" stroke="#ffffff" stroke-width="1" fill="none" />
        </svg>
      </button>
      <button class="title-bar-button close" @click="close" title="关闭">
        <svg width="14" height="14" viewBox="0 0 12 12">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="#ffffff" stroke-width="1" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
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
const resizeDebounceTimer = ref<NodeJS.Timeout | null>(null)
const submenuTopPosition = ref<number>(0)
const submenuLeftPosition = ref<number>(0)
const terminals = ref<Array<{ id: string; label?: string }>>(props.terminals || [])
const activeTerminalId = ref(props.activeTerminalId || '')
const isWindows = ref(false)
const tabsContainer = ref<HTMLElement>()
const tabsWrapper = ref<HTMLElement>()
const scrollWrapper = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null
let isDragging = ref(false)
let startX = 0
let scrollLeft = 0

// 处理鼠标滚轮事件
const handleWheel = (e: WheelEvent) => {
  if (!scrollWrapper.value) return
  e.preventDefault()
  scrollWrapper.value.scrollLeft += e.deltaY
}

// 处理拖动开始
const handleMouseDown = (e: MouseEvent) => {
  if (!scrollWrapper.value) return
  
  // 如果点击的是关闭按钮或新建终端按钮组，不进行拖动
  const target = e.target as HTMLElement
  if (target.closest('.tab-close') || target.closest('.new-terminal-group')) return
  
  isDragging.value = true
  startX = e.pageX - scrollWrapper.value.offsetLeft
  scrollLeft = scrollWrapper.value.scrollLeft
  scrollWrapper.value.classList.add('dragging')
  e.preventDefault()
}

// 处理拖动移动
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !scrollWrapper.value) return
  e.preventDefault()
  const x = e.pageX - scrollWrapper.value.offsetLeft
  const walk = (x - startX) * 1.5 // 调整拖动灵敏度
  scrollWrapper.value.scrollLeft = scrollLeft - walk
}

// 处理拖动结束
const handleMouseUp = () => {
  if (!isDragging.value) return
  isDragging.value = false
  if (scrollWrapper.value) {
    scrollWrapper.value.classList.remove('dragging')
  }
}

// 确保激活的标签可见
const ensureActiveTabVisible = () => {
  if (!scrollWrapper.value || !tabsWrapper.value) return
  
  const activeTab = tabsWrapper.value.querySelector('.terminal-tab.active') as HTMLElement
  if (!activeTab) return
  
  const scrollLeft = scrollWrapper.value.scrollLeft
  const scrollWidth = scrollWrapper.value.clientWidth
  const tabLeft = activeTab.offsetLeft
  const tabWidth = activeTab.offsetWidth
  
  // 如果标签在左侧不可见
  if (tabLeft < scrollLeft) {
    scrollWrapper.value.scrollLeft = tabLeft
  }
  // 如果标签在右侧不可见
  else if (tabLeft + tabWidth > scrollLeft + scrollWidth) {
    scrollWrapper.value.scrollLeft = tabLeft + tabWidth - scrollWidth
  }
}

// 监听 props 变化
watch(() => props.terminals, (newTerminals) => {
  terminals.value = newTerminals || []
})

watch(() => props.activeTerminalId, async (newId) => {
  activeTerminalId.value = newId || ''
  await nextTick()
  ensureActiveTabVisible()
})

const handleAction = (type: string, action: string) => {
  showMenu.value = false
  activeSubmenu.value = null
  emit('menu-action', type, action)
}

const handlePrimaryClick = (menu: string) => {
  activeSubmenu.value = menu
  updateSubmenuPosition(menu)
}

const updateSubmenuPosition = (menu: string) => {
  // 获取一级菜单容器
  const primaryMenu = document.querySelector('.primary-menu') as HTMLElement
  if (!primaryMenu) return
  
  // 获取对应的一级菜单项
  const menuItems = primaryMenu.querySelectorAll('.primary-menu-item')
  const menuLabels: Record<string, string> = {
    'project': '项目',
    'requirement': '需求',
    'design': '设计',
    'task': '任务',
    'help': '帮助'
  }
  
  menuItems.forEach((item) => {
    const span = item.querySelector('span')
    if (span && span.textContent === menuLabels[menu]) {
      const rect = item.getBoundingClientRect()
      const primaryRect = primaryMenu.getBoundingClientRect()
      // 设置二级菜单的位置为一级菜单项的顶部对齐，左侧为一级菜单的右侧
      submenuTopPosition.value = rect.top
      submenuLeftPosition.value = primaryRect.right + 2
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

const handleTerminalSelectorHover = () => {
  showTerminalMenu.value = true
  clearTerminalMenuTimer()
}


const clearTerminalMenuTimer = () => {
  if (terminalMenuTimer.value) {
    clearTimeout(terminalMenuTimer.value)
    terminalMenuTimer.value = null
  }
}

const switchTerminal = async (id: string) => {
  // 立即更新本地的激活状态，使UI响应更快
  activeTerminalId.value = id
  emit('switch-terminal', id)
  // 确保新激活的标签可见
  await nextTick()
  ensureActiveTabVisible()
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

const handleTitleBarDoubleClick = async () => {
  if (window.api?.windowControls) {
    // 先获取当前的实际状态
    const currentMaximized = await window.api.windowControls.isMaximized()
    // 然后切换状态
    window.api.windowControls.maximize()
    // 更新本地状态以确保同步
    isMaximized.value = !currentMaximized
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
  
  // 添加全局拖动事件监听（mousedown 已在模板中绑定）
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mouseleave', handleMouseUp)
  
  // 初始化激活标签位置
  await nextTick()
  ensureActiveTabVisible()
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
  if (resizeDebounceTimer.value) {
    clearTimeout(resizeDebounceTimer.value)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mouseleave', handleMouseUp)
  document.removeEventListener('keydown', handleKeyboard)
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
  /* border-radius: 8px 8px 0 0; */
  transition: border-radius 0.2s;
  justify-content: space-between;
  overflow: visible; /* 确保下拉菜单可以显示 */
}

:global(.app.maximized) .title-bar {
  border-radius: 0;
}

/* 应用菜单 - 固定在左边 */
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

/* 二级菜单 */
.secondary-menu {
  position: fixed;
  min-width: 280px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  box-shadow: var(--wt-shadow);
  margin-left: 4px;
}

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

/* 终端标签容器 - 占用中间全部空间 */
.terminal-tabs-container {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  padding: 0 4px;
  -webkit-app-region: drag; /* 默认可拖拽 */
  min-width: 0;
  height: 100%;
  position: relative;
  gap: 4px;
}

/* 滚动容器 */
.terminal-tabs-scroll-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-app-region: no-drag;
  user-select: none;
  cursor: grab;
  
  /* 完全隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* 隐藏 Webkit 滚动条 */
.terminal-tabs-scroll-wrapper::-webkit-scrollbar {
  display: none;
}

/* 拖动状态 */
.terminal-tabs-scroll-wrapper.dragging {
  cursor: grabbing;
}

.terminal-tabs {
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 2px;
  padding-bottom: 0;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px; /* 稍微增加内边距以适应更大的字体 */
  height: 34px;
  margin: 4px 0 0 0;
  font-size: 14px;  
  font-weight: bold;
  color: #999999;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: transparent;
  border: 1px solid transparent;
  min-width: 100px;
  max-width: 180px;
  flex: 0 0 auto;
  white-space: nowrap;
  -webkit-app-region: no-drag; /* 标签不可拖拽 */
}

.terminal-tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--wt-bg-tab);
  opacity: 0;
  border-radius: 6px 6px 0 0;
  transition: opacity 0.2s;
  z-index: -1;
}

.terminal-tab:hover::before {
  opacity: 0.5;
}

.terminal-tab:hover {
  color: #ffffff;
}

.terminal-tab.active {
  color: #ffffff;
  background: var(--wt-bg-tab-active);
  border: 1px solid transparent;
  border-bottom: none;
  margin-bottom: -1px;
  padding-bottom: 1px;
  z-index: 10;
}

.terminal-tab span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  transition: all 0.15s;
  opacity: 0;
  margin-right: -4px;
}

.terminal-tab:hover .tab-close {
  opacity: 0.6;
}

.tab-close:hover {
  opacity: 1;
  background: var(--wt-bg-hover);
}

.terminal-tab.active .tab-close {
  opacity: 0.4;
}

.terminal-tab.active:hover .tab-close {
  opacity: 0.8;
}



/* 新建终端按钮组 */
.new-terminal-group {
  position: relative;
  display: flex;
  align-items: center;
  height: 30px;
  margin: 4px 0;
  -webkit-app-region: no-drag; /* 不可拖拽 */
  flex-shrink: 0; /* 防止按钮组被压缩 */
}

.new-terminal-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px 0 0 6px;
  background: transparent;
  color: var(--wt-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.new-terminal-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--wt-bg-hover);
  border-radius: 6px 0 0 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.new-terminal-button:hover::before {
  opacity: 1;
}

.new-terminal-button:hover {
  color: var(--wt-text-primary);
}

.new-terminal-button svg {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.terminal-type-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 28px;
  border: none;
  border-left: 1px solid var(--wt-border);
  border-radius: 0 6px 6px 0;
  background: transparent;
  color: var(--wt-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  pointer-events: auto;
}

.terminal-type-selector::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--wt-bg-hover);
  border-radius: 0 6px 6px 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.terminal-type-selector:hover::before {
  opacity: 1;
}

.terminal-type-selector:hover {
  color: var(--wt-text-primary);
}

.terminal-type-selector svg {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

/* 终端类型菜单 */
.terminal-type-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 180px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  box-shadow: var(--wt-shadow);
  z-index: 10000;  /* 增加z-index确保菜单在最上层 */
  overflow: hidden;
}

.terminal-type-menu .menu-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--wt-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
}

.terminal-type-menu .menu-option:hover {
  background-color: var(--wt-bg-hover);
}

.terminal-type-menu .menu-option:first-child {
  border-radius: 4px 4px 0 0;
}

.terminal-type-menu .menu-option:last-child {
  border-radius: 0 0 4px 4px;
}

.terminal-icon {
  display: inline-block;
  width: 24px;
  font-family: var(--wt-font-mono);
  font-weight: 600;
  color: var(--wt-accent);
  text-align: center;
}

/* 窗口控制按钮 - 固定在右边 */
.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
  flex: 0 0 auto;
}

.title-bar-button {
  width: 46px;
  height: 38px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  transition: background-color 0.15s;
}

.title-bar-button:hover {
  background-color: var(--wt-bg-hover);
}

.title-bar-button.close:hover {
  background-color: #e81123;
  color: white;
}

.title-bar-button:active {
  background-color: var(--wt-bg-active);
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

.menu-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--wt-text-tertiary);
  opacity: 0.6;
}
</style>