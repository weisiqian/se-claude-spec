<template>
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
        
        <!-- 新建终端按钮组 - 当不需要滚动时紧贴标签 -->
        <div v-if="!needsScroll" class="new-terminal-group inline" ref="inlineTerminalGroup" 
             @mouseenter="clearTerminalMenuTimer" 
             @mouseleave="handleTerminalMenuLeave" 
             @dblclick.stop>
          <button class="new-terminal-button" @click.stop="createNewTerminal('bash')" title="新建终端">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="terminal-type-selector" @click.stop="toggleTerminalMenu" 
                  @mouseenter="handleTerminalSelectorHover" title="选择终端类型">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 新建终端按钮组 - 当需要滚动时固定在右侧 -->
    <div v-if="needsScroll" class="new-terminal-group fixed" ref="fixedTerminalGroup" 
         @mouseenter="clearTerminalMenuTimer" 
         @mouseleave="handleTerminalMenuLeave" 
         @dblclick.stop>
      <button class="new-terminal-button" @click.stop="createNewTerminal('bash')" title="新建终端">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="terminal-type-selector" @click.stop="toggleTerminalMenu" 
              @mouseenter="handleTerminalSelectorHover" title="选择终端类型">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    
    <!-- 终端类型下拉菜单 -->
    <transition name="menu-slide">
      <div 
        class="terminal-type-menu-absolute" 
        v-show="showTerminalMenu" 
        :style="terminalMenuStyle"
        @mouseenter="clearTerminalMenuTimer" 
        @mouseleave="handleTerminalMenuLeave">
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps<{
  terminals?: Array<{ id: string; label?: string }>
  activeTerminalId?: string
}>()

const emit = defineEmits<{
  (e: 'create-terminal', type: string): void
  (e: 'switch-terminal', id: string): void
  (e: 'close-terminal', id: string): void
  (e: 'titlebar-double-click'): void
}>()

const terminals = ref<Array<{ id: string; label?: string }>>(props.terminals || [])
const activeTerminalId = ref(props.activeTerminalId || '')
const showTerminalMenu = ref(false)
const terminalMenuTimer = ref<NodeJS.Timeout | null>(null)
const resizeDebounceTimer = ref<NodeJS.Timeout | null>(null)
const isWindows = ref(false)
const tabsContainer = ref<HTMLElement>()
const tabsWrapper = ref<HTMLElement>()
const scrollWrapper = ref<HTMLElement>()
const inlineTerminalGroup = ref<HTMLElement>()
const fixedTerminalGroup = ref<HTMLElement>()
const needsScroll = ref(false)
const terminalMenuStyle = ref({ top: '0px', left: '0px' })

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
  const walk = (x - startX) * 1.5
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

// 检查是否需要滚动
const checkNeedsScroll = () => {
  if (!scrollWrapper.value || !tabsWrapper.value) return
  
  const tabs = tabsWrapper.value.querySelectorAll('.terminal-tab')
  let totalTabsWidth = 0
  tabs.forEach((tab) => {
    totalTabsWidth += (tab as HTMLElement).offsetWidth + 2
  })
  
  const buttonGroupWidth = 50
  const totalContentWidth = totalTabsWidth + buttonGroupWidth + 20
  const containerWidth = scrollWrapper.value.clientWidth
  
  needsScroll.value = totalContentWidth > containerWidth
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
  
  if (tabLeft < scrollLeft) {
    scrollWrapper.value.scrollLeft = tabLeft
  } else if (tabLeft + tabWidth > scrollLeft + scrollWidth) {
    scrollWrapper.value.scrollLeft = tabLeft + tabWidth - scrollWidth
  }
}

const createNewTerminal = (type: string) => {
  showTerminalMenu.value = false
  emit('create-terminal', type)
}

const toggleTerminalMenu = () => {
  showTerminalMenu.value = !showTerminalMenu.value
  if (showTerminalMenu.value) {
    clearTerminalMenuTimer()
    updateTerminalMenuPosition()
  }
}

const updateTerminalMenuPosition = () => {
  const buttonGroup = needsScroll.value ? fixedTerminalGroup.value : inlineTerminalGroup.value
  if (!buttonGroup) return
  
  const rect = buttonGroup.getBoundingClientRect()
  terminalMenuStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`
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
  updateTerminalMenuPosition()
}

const clearTerminalMenuTimer = () => {
  if (terminalMenuTimer.value) {
    clearTimeout(terminalMenuTimer.value)
    terminalMenuTimer.value = null
  }
}

const switchTerminal = async (id: string) => {
  activeTerminalId.value = id
  emit('switch-terminal', id)
  await nextTick()
  ensureActiveTabVisible()
}

const closeTerminal = (id: string) => {
  emit('close-terminal', id)
}

const handleTitleBarDoubleClick = () => {
  emit('titlebar-double-click')
}

// 监听 props 变化
watch(() => props.terminals, async (newTerminals) => {
  terminals.value = newTerminals || []
  await nextTick()
  checkNeedsScroll()
})

watch(() => props.activeTerminalId, async (newId) => {
  activeTerminalId.value = newId || ''
  await nextTick()
  ensureActiveTabVisible()
  checkNeedsScroll()
})

onMounted(async () => {
  // 检测操作系统
  const platform = navigator.platform.toLowerCase()
  isWindows.value = platform.includes('win')
  
  // 添加全局拖动事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mouseleave', handleMouseUp)
  
  // 初始化激活标签位置和滚动状态
  await nextTick()
  ensureActiveTabVisible()
  checkNeedsScroll()
  
  // 监听容器大小变化
  if (scrollWrapper.value) {
    resizeObserver = new ResizeObserver(() => {
      if (resizeDebounceTimer.value) {
        clearTimeout(resizeDebounceTimer.value)
      }
      resizeDebounceTimer.value = setTimeout(() => {
        checkNeedsScroll()
      }, 100)
    })
    resizeObserver.observe(scrollWrapper.value)
  }
})

onUnmounted(() => {
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
})
</script>

<style scoped>
.terminal-tabs-container {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  padding: 0 4px;
  -webkit-app-region: drag;
  min-width: 0;
  height: 100%;
  position: relative;
  gap: 4px;
  overflow: visible;
}

.terminal-tabs-scroll-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-app-region: no-drag;
  user-select: none;
  cursor: grab;
  position: relative;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.terminal-tabs-scroll-wrapper::-webkit-scrollbar {
  display: none;
}

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
  position: relative;
  overflow: visible;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
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
  -webkit-app-region: no-drag;
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

.new-terminal-group {
  position: relative;
  display: flex;
  align-items: center;
  height: 30px;
  margin: 4px 0;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.new-terminal-group.inline {
  margin-left: 4px;
  z-index: 100;
}

.new-terminal-group.fixed {
  position: sticky;
  right: 0;
  margin-left: 8px;
  background: linear-gradient(to right, transparent, var(--wt-bg-secondary) 8px);
  padding-left: 12px;
  z-index: 100;
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

.terminal-type-menu-absolute {
  position: fixed;
  min-width: 180px;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  box-shadow: var(--wt-shadow);
  z-index: 10000;
  overflow: hidden;
}

.terminal-type-menu-absolute .menu-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--wt-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
}

.terminal-type-menu-absolute .menu-option:hover {
  background-color: var(--wt-bg-hover);
}

.terminal-type-menu-absolute .menu-option:first-child {
  border-radius: 4px 4px 0 0;
}

.terminal-type-menu-absolute .menu-option:last-child {
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

.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>