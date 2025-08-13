<template>
  <div class="resizable-panel-container">
    <div class="main-content" :style="{ width: mainWidth }">
      <slot name="main"></slot>
    </div>
    <div 
      class="resize-handle" 
      @mousedown="startResize"
      @dblclick="handleDoubleClick"
      :class="{ 'resizing': isResizing }"
      :style="{ width: `${dividerWidth}px` }"
      title="拖动调整宽度，双击重置"
    >
      <div class="resize-line"></div>
    </div>
    <div class="side-panel" :style="{ width: sidePanelWidth }">
      <slot name="side"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  initialSideWidth: {
    type: Number,
    default: 400
  },
  minSideWidth: {
    type: Number,
    default: 50  // 降低最小宽度，仅防止完全消失
  },
  maxSideWidth: {
    type: Number,
    default: -1  // -1 表示无限制
  },
  storageKey: {
    type: String,
    default: 'terminal-panel-width'
  },
  dividerWidth: {
    type: Number,
    default: 6
  },
  defaultWidth: {
    type: Number,
    default: 400  // 双击重置时的默认宽度
  }
})

const sidePanelPixelWidth = ref(props.initialSideWidth)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const sidePanelWidth = computed(() => `${sidePanelPixelWidth.value}px`)
const mainWidth = computed(() => `calc(100% - ${sidePanelPixelWidth.value}px - ${props.dividerWidth}px)`)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = sidePanelPixelWidth.value
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  
  // 防止选中文本
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing.value) return
  
  const diff = startX.value - e.clientX
  const newWidth = startWidth.value + diff
  
  // 获取容器宽度
  const container = document.querySelector('.resizable-panel-container') as HTMLElement
  const containerWidth = container ? container.offsetWidth : window.innerWidth
  
  // 计算左侧面板的最小宽度（防止右侧面板完全消失）
  const minMainWidth = 50
  const maxSideWidth = containerWidth - minMainWidth - props.dividerWidth
  
  // 智能限制宽度范围
  let finalWidth = newWidth
  
  // 最小宽度限制
  if (finalWidth < props.minSideWidth) {
    finalWidth = props.minSideWidth
  }
  
  // 最大宽度限制（如果设置了且不是-1）
  if (props.maxSideWidth > 0 && finalWidth > props.maxSideWidth) {
    finalWidth = props.maxSideWidth
  }
  
  // 容器宽度限制
  if (finalWidth > maxSideWidth) {
    finalWidth = maxSideWidth
  }
  
  sidePanelPixelWidth.value = finalWidth
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  
  // 恢复默认
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  
  // 保存宽度到 localStorage
  localStorage.setItem(props.storageKey, String(sidePanelPixelWidth.value))
}

// 双击重置到默认宽度
const handleDoubleClick = () => {
  sidePanelPixelWidth.value = props.defaultWidth || props.initialSideWidth
  localStorage.setItem(props.storageKey, String(sidePanelPixelWidth.value))
}

// 处理窗口大小调整
const handleWindowResize = () => {
  const container = document.querySelector('.resizable-panel-container') as HTMLElement
  if (!container) return
  
  const containerWidth = container.offsetWidth
  const minMainWidth = 50
  const maxSideWidth = containerWidth - minMainWidth - props.dividerWidth
  
  // 如果当前宽度超过了容器允许的最大宽度，调整它
  if (sidePanelPixelWidth.value > maxSideWidth) {
    sidePanelPixelWidth.value = maxSideWidth
  }
}

onMounted(() => {
  // 从 localStorage 恢复宽度
  const savedWidth = localStorage.getItem(props.storageKey)
  if (savedWidth) {
    const width = parseInt(savedWidth)
    // 只检查最小宽度
    if (width >= props.minSideWidth) {
      // 如果有最大宽度限制且不是-1，则检查最大宽度
      if (props.maxSideWidth > 0 && width > props.maxSideWidth) {
        sidePanelPixelWidth.value = props.maxSideWidth
      } else {
        sidePanelPixelWidth.value = width
      }
    }
  }
  
  // 监听窗口大小调整
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style scoped>
.resizable-panel-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--wt-bg-primary);
}

.main-content {
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  background: var(--wt-bg-secondary);
  border-radius: var(--wt-radius) 0 0 var(--wt-radius);
}

.side-panel {
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  background: var(--wt-bg-primary);
  border-radius: 0 var(--wt-radius) var(--wt-radius) 0;
}

.resize-handle {
  width: 6px;
  height: 100%;
  cursor: col-resize;
  position: relative;
  background-color: transparent;
  transition: all 0.15s;
  flex-shrink: 0;
}

.resize-handle:hover {
  background-color: var(--wt-bg-hover);
}

.resize-handle.resizing {
  background-color: var(--wt-bg-active);
}

.resize-line {
  position: absolute;
  left: 2.5px;
  top: 20px;
  bottom: 20px;
  width: 1px;
  background-color: var(--wt-border);
  transition: all 0.15s;
}

.resize-handle:hover .resize-line,
.resize-handle.resizing .resize-line {
  background-color: var(--wt-accent);
  width: 2px;
  left: 2px;
  top: 10px;
  bottom: 10px;
}
</style>