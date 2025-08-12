<template>
  <div class="terminal-panel">
    <!-- 顶部标签栏（终端 | SDK） -->
    <div class="panel-tabs">
      <button 
        :class="['panel-tab', { active: activeView === 'terminal' }]"
        @click="activeView = 'terminal'"
      >
        终端
      </button>
      <button 
        :class="['panel-tab', { active: activeView === 'sdk' }]"
        @click="activeView = 'sdk'"
      >
        SDK
      </button>
    </div>
    
    <!-- 终端视图 -->
    <div v-show="activeView === 'terminal'" class="terminal-view">
      <!-- 终端内容区域（左侧） -->
      <div class="terminal-content">
        <Terminal 
          ref="terminalRef" 
          :project-path="projectPath" 
          :is-dark="isDark"
        />
      </div>
      
      <!-- 拖动分隔条 -->
      <div 
        class="sidebar-splitter"
        @mousedown="startDragSidebar"
        :class="{ 'dragging': isDraggingSidebar }"
      ></div>
      
      <!-- 右侧终端标签栏（VSCode风格） -->
      <div class="terminal-sidebar" :style="{ width: sidebarWidth + 'px' }">
        <!-- 终端工具栏（顶部） -->
        <div class="terminal-toolbar">
          <!-- 终端类型下拉选择 -->
          <div class="terminal-selector" @click="toggleTerminalMenu">
            <button class="selector-btn" title="选择终端类型">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            
            <!-- 终端类型菜单 -->
            <transition name="menu-fade">
              <div v-if="showTerminalMenu" class="terminal-menu">
                <div class="menu-item" @click="handleCreateTerminal('bash')">
                  <span class="menu-icon">$</span>
                  <span>Bash</span>
                </div>
                <div v-if="isWindows" class="menu-item" @click="handleCreateTerminal('powershell')">
                  <span class="menu-icon">PS</span>
                  <span>PowerShell</span>
                </div>
                <div v-if="isWindows" class="menu-item" @click="handleCreateTerminal('cmd')">
                  <span class="menu-icon">></span>
                  <span>Command Prompt</span>
                </div>
                <div v-if="!isWindows" class="menu-item" @click="handleCreateTerminal('zsh')">
                  <span class="menu-icon">%</span>
                  <span>Zsh</span>
                </div>
              </div>
            </transition>
          </div>
          
          <!-- 新建终端 -->
          <button class="toolbar-btn" @click="handleCreateTerminal('bash')" title="新建终端">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <!-- 终端标签列表 -->
        <div class="terminal-tabs-list">
          <div 
            v-for="(terminal, index) in terminals"
            :key="terminal.id"
            :class="['terminal-tab', { active: activeTerminalId === terminal.id }]"
            @click="handleSwitchTerminal(terminal.id)"
          >
            <span class="tab-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 6l6 6-6 6M12 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="tab-label">{{ terminal.label || `终端 ${index + 1}` }}</span>
            <button 
              v-if="terminals.length > 1"
              class="tab-close"
              @click.stop="handleCloseTerminal(terminal.id)"
              title="关闭"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- SDK视图 -->
    <div v-show="activeView === 'sdk'" class="sdk-view">
      <div class="sdk-content">
        <div class="sdk-empty">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" 
                    stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>SDK 功能</h3>
          <p>SDK相关功能开发中...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import Terminal from './Terminal.vue'

const props = defineProps<{
  projectPath?: string | null
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'terminals-update', terminals: Array<{ id: string; label?: string }>): void
  (e: 'active-terminal-update', id: string): void
}>()

// 状态
const activeView = ref<'terminal' | 'sdk'>('terminal')
const terminalRef = ref<any>(null)
const terminals = ref<Array<{ id: string; label?: string }>>([])
const activeTerminalId = ref<string>('')
const isWindows = ref(false)
const showTerminalMenu = ref(false)

// 侧边栏拖动相关
const sidebarWidth = ref(180)
const isDraggingSidebar = ref(false)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

// 终端操作
const handleCreateTerminal = async (type: string) => {
  showTerminalMenu.value = false
  if (terminalRef.value) {
    const newTerminal = await terminalRef.value.createNewTerminal(type)
    updateTerminalState()
  }
}

const handleSwitchTerminal = async (id: string) => {
  if (terminalRef.value) {
    await terminalRef.value.switchTerminal(id)
    updateTerminalState()
  }
}

const handleCloseTerminal = async (id: string) => {
  if (!id || terminals.value.length <= 1) return
  if (terminalRef.value) {
    await terminalRef.value.closeTerminal(id)
    updateTerminalState()
  }
}


const toggleTerminalMenu = () => {
  showTerminalMenu.value = !showTerminalMenu.value
}

const updateTerminalState = () => {
  if (terminalRef.value) {
    terminals.value = terminalRef.value.terminals || []
    activeTerminalId.value = terminalRef.value.activeTerminalId || ''
    emit('terminals-update', terminals.value)
    emit('active-terminal-update', activeTerminalId.value)
  }
}

// 暴露方法给父组件
const executeCommand = async (command: string) => {
  if (terminalRef.value) {
    await terminalRef.value.executeCommand(command)
  }
}

const changeDirectory = async (path: string) => {
  if (terminalRef.value) {
    await terminalRef.value.changeDirectory(path)
  }
}

// 处理点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.terminal-selector')) {
    showTerminalMenu.value = false
  }
}

// 侧边栏拖动处理
const startDragSidebar = (e: MouseEvent) => {
  isDraggingSidebar.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = sidebarWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDraggingSidebar.value) return
  
  const delta = dragStartX.value - e.clientX // 注意方向是反的
  const newWidth = dragStartWidth.value + delta
  
  // 动态计算最大宽度，保留终端最小显示宽度400px
  const maxWidth = window.innerWidth - 400
  
  // 限制宽度范围 (最小0px，最大为窗口宽度-400px)
  if (newWidth >= 0 && newWidth <= maxWidth) {
    sidebarWidth.value = newWidth
  } else if (newWidth < 0) {
    sidebarWidth.value = 0
  } else if (newWidth > maxWidth) {
    sidebarWidth.value = maxWidth
  }
}

const handleMouseUp = () => {
  if (isDraggingSidebar.value) {
    isDraggingSidebar.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // 保存宽度到localStorage
    localStorage.setItem('terminalSidebarWidth', sidebarWidth.value.toString())
  }
}

onMounted(() => {
  // 检测操作系统
  const platform = navigator.platform.toLowerCase()
  isWindows.value = platform.includes('win')
  
  // 恢复保存的侧边栏宽度
  const savedWidth = localStorage.getItem('terminalSidebarWidth')
  if (savedWidth) {
    sidebarWidth.value = parseInt(savedWidth)
  }
  
  // 初始化终端状态
  setTimeout(() => {
    updateTerminalState()
  }, 100)
  
  // 添加事件监听
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// 监听终端状态变化
watch(() => terminalRef.value?.terminals, () => {
  updateTerminalState()
}, { deep: true })

watch(() => terminalRef.value?.activeTerminalId, () => {
  updateTerminalState()
})

defineExpose({
  executeCommand,
  changeDirectory,
  handleCreateTerminal,
  handleSwitchTerminal,
  handleCloseTerminal,
  terminals,
  activeTerminalId
})
</script>

<style scoped>
.terminal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--wt-bg-primary);
}

/* 顶部标签栏 */
.panel-tabs {
  display: flex;
  height: 35px;
  background: var(--wt-bg-primary);
  border-bottom: 1px solid var(--wt-border);
  padding: 0 8px;
  gap: 0;
}

.panel-tab {
  padding: 0 16px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--wt-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
  position: relative;
}

.panel-tab:hover {
  color: var(--wt-text-primary);
  background: var(--wt-bg-hover);
}

.panel-tab.active {
  color: var(--wt-text-primary);
  background: var(--wt-bg-secondary);
  border-bottom-color: var(--wt-accent);
}

/* 终端视图 */
.terminal-view {
  flex: 1;
  display: flex;
  flex-direction: row; /* 横向布局 */
  overflow: hidden;
}

.terminal-content {
  flex: 1;
  overflow: hidden;
}

/* 拖动分隔条 */
.sidebar-splitter {
  width: 1px;
  height: 100%;
  background: var(--wt-border);
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  transition: background 0.15s;
}

.sidebar-splitter::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
  background: transparent;
}

.sidebar-splitter:hover,
.sidebar-splitter.dragging {
  background: var(--wt-accent);
  width: 2px;
  margin: 0 -0.5px;
}

/* 右侧终端标签栏 */
.terminal-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--wt-bg-primary);
  flex-shrink: 0;
  overflow: hidden;
  min-width: 0;
}

.terminal-tabs-list {
  flex: 1;
  display: flex;
  flex-direction: column; /* 竖向排列 */
  gap: 1px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
}

.terminal-tabs-list::-webkit-scrollbar {
  width: 3px;
}

.terminal-tabs-list::-webkit-scrollbar-thumb {
  background: var(--wt-border);
  border-radius: 1px;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  min-height: 32px;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  width: 100%;
}

.terminal-tab:hover {
  background: var(--wt-bg-hover);
}

.terminal-tab.active {
  background: var(--wt-bg-active);
}

.terminal-tab.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--wt-accent);
}

.tab-icon {
  display: flex;
  align-items: center;
  color: var(--wt-text-secondary);
}

.terminal-tab.active .tab-icon {
  color: var(--wt-accent);
}

.tab-label {
  font-size: 12px;
  color: var(--wt-text-primary);
  white-space: nowrap;
  flex: 1;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--wt-text-secondary);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.15s;
  padding: 0;
  margin-left: auto;
}

.terminal-tab:hover .tab-close {
  opacity: 0.7;
}

.tab-close:hover {
  opacity: 1;
  background: var(--wt-bg-hover);
  color: var(--wt-text-primary);
}

/* 终端工具栏 */
.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  padding: 8px 8px;
  border-bottom: 1px solid var(--wt-border);
  flex-wrap: wrap;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--wt-text-secondary);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--wt-bg-hover);
  color: var(--wt-text-primary);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 终端类型选择器 */
.terminal-selector {
  position: relative;
}

.selector-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--wt-text-secondary);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
}

.selector-btn:hover {
  background: var(--wt-bg-hover);
  color: var(--wt-text-primary);
}

.terminal-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 150px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: 6px;
  box-shadow: var(--wt-shadow);
  overflow: hidden;
  z-index: 1000;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--wt-text-primary);
  cursor: pointer;
  transition: background 0.15s;
}

.menu-item:hover {
  background: var(--wt-bg-hover);
}

.menu-icon {
  display: inline-block;
  width: 20px;
  font-family: var(--wt-font-mono);
  font-weight: 600;
  color: var(--wt-accent);
  text-align: center;
}

/* SDK视图 */
.sdk-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sdk-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.sdk-empty {
  text-align: center;
  color: var(--wt-text-secondary);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.sdk-empty h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--wt-text-primary);
  margin: 0 0 8px 0;
}

.sdk-empty p {
  font-size: 14px;
  margin: 0;
}

/* 动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>