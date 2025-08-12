<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  'update:sidePanelWidth': [width: number]
}>()

// 侧边栏宽度（活动栏+侧边面板）
const sidePanelWidth = ref(350) // 48(活动栏) + 302(侧边面板) - 更合理的默认宽度
const minSidePanelWidth = 200 // 最小宽度200px
const minTerminalWidth = 300 // 终端最小宽度300px

// 拖动状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

// 开始拖动
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = sidePanelWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

// 处理拖动
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const delta = e.clientX - dragStartX.value
  const newWidth = dragStartWidth.value + delta
  
  // 计算最大宽度（保留终端最小宽度）
  const maxWidth = window.innerWidth - minTerminalWidth
  
  // 限制宽度范围
  if (newWidth >= minSidePanelWidth && newWidth <= maxWidth) {
    sidePanelWidth.value = newWidth
    emit('update:sidePanelWidth', newWidth)
  } else if (newWidth > maxWidth) {
    sidePanelWidth.value = maxWidth
    emit('update:sidePanelWidth', maxWidth)
  }
}

// 结束拖动
const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // 保存宽度到localStorage
    localStorage.setItem('splitLayoutWidth', sidePanelWidth.value.toString())
  }
}

// 恢复保存的宽度
onMounted(() => {
  const savedWidth = localStorage.getItem('splitLayoutWidth')
  if (savedWidth) {
    sidePanelWidth.value = parseInt(savedWidth)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

defineExpose({
  sidePanelWidth
})
</script>

<template>
  <div class="split-layout">
    <!-- 左侧容器（活动栏 + 侧边面板） -->
    <div 
      class="left-container" 
      :style="{ width: sidePanelWidth + 'px' }"
    >
      <div class="activity-bar-wrapper">
        <slot name="activityBar"></slot>
      </div>
      <div class="side-panel-wrapper" v-if="sidePanelWidth > 48">
        <slot name="sidePanel"></slot>
      </div>
    </div>
    
    <!-- 拖动分隔条 -->
    <div 
      class="splitter" 
      @mousedown="startDrag"
      :class="{ 'dragging': isDragging }"
    ></div>
    
    <!-- 右侧终端（占满剩余空间） -->
    <div class="terminal-container">
      <slot name="terminal"></slot>
    </div>
  </div>
</template>

<style scoped>
.split-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.left-container {
  display: flex;
  flex-shrink: 0;
  overflow: hidden;
}

.activity-bar-wrapper {
  width: 48px;
  flex-shrink: 0;
}

.side-panel-wrapper {
  flex: 1;
  overflow: hidden;
}

.splitter {
  width: 1px;
  height: 100%;
  position: relative;
  cursor: col-resize;
  background: #2d2d30;
  flex-shrink: 0;
  transition: all 0.2s;
  z-index: 10;
}

.splitter::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
  background: transparent;
}

.splitter:hover {
  background: #007acc;
  width: 2px;
  margin: 0 -0.5px;
}

.splitter.dragging {
  background: #007acc;
  width: 2px;
  margin: 0 -0.5px;
}

.terminal-container {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

/* 深色主题适配 */
.dark .splitter {
  background: #3e3e42;
}

.dark .splitter:hover {
  background: #4a90e2;
}

.dark .splitter.dragging {
  background: #4a90e2;
}
</style>