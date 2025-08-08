<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  minActivityBarWidth?: number
  minSidePanelWidth?: number
  minTerminalWidth?: number
}>()

const emit = defineEmits<{
  'update:activityBarWidth': [width: number]
  'update:sidePanelWidth': [width: number]
  'update:terminalWidth': [width: number]
}>()

// 默认宽度
const activityBarWidth = ref(48)
const sidePanelWidth = ref(320)
const terminalWidth = ref(600)  // 终端默认宽度

// 最小宽度
const minActivityBar = props.minActivityBarWidth || 48
const minSidePanel = props.minSidePanelWidth || 0  // 允许完全隐藏
const minTerminal = props.minTerminalWidth || 0  // 允许完全隐藏

// 拖动状态
const isDraggingSidePanel = ref(false)
const isDraggingTerminal = ref(false)

// 拖动开始位置
const dragStartX = ref(0)
const dragStartWidth = ref(0)

// 开始拖动侧边栏
const startDragSidePanel = (e: MouseEvent) => {
  isDraggingSidePanel.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = sidePanelWidth.value || 320  // 如果是0，默认展开到320px
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

// 开始拖动终端
const startDragTerminal = (e: MouseEvent) => {
  isDraggingTerminal.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = terminalWidth.value || 600  // 如果是0，默认展开到600px
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

// 处理拖动
const handleMouseMove = (e: MouseEvent) => {
  if (isDraggingSidePanel.value) {
    const delta = e.clientX - dragStartX.value
    const newWidth = dragStartWidth.value + delta
    
    // 计算最大宽度，保留终端最小显示空间
    const maxWidth = window.innerWidth - activityBarWidth.value - (terminalWidth.value > 0 ? Math.max(terminalWidth.value, 200) : 50)
    
    // 限制宽度范围
    if (newWidth >= 50 && newWidth <= maxWidth) {
      sidePanelWidth.value = newWidth
      emit('update:sidePanelWidth', newWidth)
    } else if (newWidth < 50) {
      sidePanelWidth.value = 0  // 完全隐藏
      emit('update:sidePanelWidth', 0)
    } else if (newWidth > maxWidth) {
      sidePanelWidth.value = maxWidth
      emit('update:sidePanelWidth', maxWidth)
    }
  } else if (isDraggingTerminal.value) {
    const delta = dragStartX.value - e.clientX // 终端在右侧，反向计算
    const newWidth = dragStartWidth.value + delta
    
    // 计算最大宽度
    const maxWidth = window.innerWidth - activityBarWidth.value - (sidePanelWidth.value > 0 ? sidePanelWidth.value : 50)
    
    // 限制宽度范围
    if (newWidth >= 50 && newWidth <= maxWidth) {
      terminalWidth.value = newWidth
      emit('update:terminalWidth', newWidth)
    } else if (newWidth < 50) {
      terminalWidth.value = 0  // 完全隐藏
      emit('update:terminalWidth', 0)
    } else if (newWidth > maxWidth) {
      terminalWidth.value = maxWidth
      emit('update:terminalWidth', maxWidth)
    }
  }
}

// 结束拖动
const handleMouseUp = () => {
  if (isDraggingSidePanel.value || isDraggingTerminal.value) {
    isDraggingSidePanel.value = false
    isDraggingTerminal.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // 保存宽度到localStorage
    localStorage.setItem('sidePanelWidth', sidePanelWidth.value.toString())
    localStorage.setItem('terminalWidth', terminalWidth.value.toString())
  }
}

// 恢复保存的宽度
onMounted(() => {
  const savedSidePanelWidth = localStorage.getItem('sidePanelWidth')
  const savedTerminalWidth = localStorage.getItem('terminalWidth')
  
  if (savedSidePanelWidth) {
    sidePanelWidth.value = parseInt(savedSidePanelWidth)
  }
  if (savedTerminalWidth) {
    terminalWidth.value = parseInt(savedTerminalWidth)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

defineExpose({
  activityBarWidth,
  sidePanelWidth,
  terminalWidth
})
</script>

<template>
  <div class="flexible-layout">
    <!-- 活动栏插槽 -->
    <div class="activity-bar-container" :style="{ width: activityBarWidth + 'px' }">
      <slot name="activityBar"></slot>
    </div>
    
    <!-- 侧边栏插槽 -->
    <div 
      v-if="$slots.sidePanel && sidePanelWidth > 0" 
      class="side-panel-container" 
      :style="{ width: sidePanelWidth + 'px' }"
    >
      <slot name="sidePanel"></slot>
      <!-- 侧边栏拖动手柄 -->
      <div 
        class="resize-handle vertical" 
        @mousedown="startDragSidePanel"
        :class="{ 'dragging': isDraggingSidePanel }"
      ></div>
    </div>
    
    <!-- 侧边栏折叠时的展开手柄 -->
    <div 
      v-if="$slots.sidePanel && sidePanelWidth === 0" 
      class="expand-handle left"
      @mousedown="startDragSidePanel"
      title="拖动展开侧边栏"
    >
      <div class="expand-line"></div>
    </div>
    
    <!-- 终端插槽 -->
    <div 
      v-if="$slots.terminal && terminalWidth > 0" 
      class="terminal-container"
      :style="{ width: terminalWidth + 'px' }"
    >
      <!-- 终端拖动手柄 -->
      <div 
        class="resize-handle vertical left" 
        @mousedown="startDragTerminal"
        :class="{ 'dragging': isDraggingTerminal }"
      ></div>
      <slot name="terminal"></slot>
    </div>
    
    <!-- 终端折叠时的展开手柄 -->
    <div 
      v-if="$slots.terminal && terminalWidth === 0" 
      class="expand-handle right"
      @mousedown="startDragTerminal"
      title="拖动展开终端"
    >
      <div class="expand-line"></div>
    </div>
    
    <!-- 占位器，当侧边栏和终端都隐藏时显示 -->
    <div 
      v-if="(!$slots.sidePanel || sidePanelWidth === 0) && (!$slots.terminal || terminalWidth === 0)"
      class="placeholder-container"
    >
      <div class="placeholder-text">拖动边缘展开面板</div>
    </div>
  </div>
</template>

<style scoped>
.flexible-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.activity-bar-container {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.side-panel-container {
  flex-shrink: 0;
  position: relative;
  z-index: 9;
}

.terminal-container {
  flex-shrink: 0;
  position: relative;
  z-index: 9;
}

.placeholder-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
  color: #5a5a5a;
  font-size: 14px;
  user-select: none;
}

.placeholder-text {
  padding: 8px 16px;
  border: 1px dashed #3e3e42;
  border-radius: 4px;
}

.resize-handle {
  position: absolute;
  background: transparent;
  transition: background-color 0.2s;
  z-index: 100;
}

.resize-handle.vertical {
  width: 4px;
  height: 100%;
  right: -2px;
  top: 0;
  cursor: col-resize;
}

.resize-handle.vertical.left {
  left: -2px;
  right: auto;
}

.resize-handle:hover {
  background: #007acc;
  opacity: 0.5;
}

.resize-handle.dragging {
  background: #007acc;
  opacity: 0.8;
}

/* 折叠时的展开手柄 */
.expand-handle {
  position: relative;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s;
  z-index: 100;
}

.expand-handle.left {
  border-right: 1px solid #2d2d30;
}

.expand-handle.right {
  border-left: 1px solid #2d2d30;
}

.expand-handle:hover {
  background: rgba(0, 122, 204, 0.2);
}

.expand-line {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 30px;
  background: #4a90e2;
  opacity: 0;
  transition: opacity 0.2s;
}

.expand-handle:hover .expand-line {
  opacity: 0.8;
}

/* 深色主题适配 */
.dark .resize-handle:hover {
  background: #4a90e2;
}

.dark .resize-handle.dragging {
  background: #4a90e2;
}
</style>