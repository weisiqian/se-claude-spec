<template>
  <div class="resizable-panel-container">
    <div class="main-content" :style="{ width: mainWidth }">
      <slot name="main"></slot>
    </div>
    <div 
      class="resize-handle" 
      @mousedown="startResize"
      :class="{ 'resizing': isResizing }"
      :style="{ width: `${dividerWidth}px` }"
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
    default: 300
  },
  maxSideWidth: {
    type: Number,
    default: 800
  },
  storageKey: {
    type: String,
    default: 'terminal-panel-width'
  },
  dividerWidth: {
    type: Number,
    default: 6
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
  
  // 限制宽度范围
  if (newWidth >= props.minSideWidth && newWidth <= props.maxSideWidth) {
    sidePanelPixelWidth.value = newWidth
  }
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

onMounted(() => {
  // 从 localStorage 恢复宽度
  const savedWidth = localStorage.getItem(props.storageKey)
  if (savedWidth) {
    const width = parseInt(savedWidth)
    if (width >= props.minSideWidth && width <= props.maxSideWidth) {
      sidePanelPixelWidth.value = width
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
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