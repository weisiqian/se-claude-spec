<template>
  <div class="git-explorer-layout">
    <!-- 上部：Git历史和Diff查看器 -->
    <div 
      class="top-panel" 
      :style="{ height: topHeight + 'px' }"
    >
      <GitHistory 
        @diff-view-toggle="handleDiffViewToggle"
      />
    </div>
    
    <!-- 可拖动的水平分隔条 -->
    <div 
      class="horizontal-splitter"
      @mousedown="startDrag"
      :class="{ 'dragging': isDragging }"
    >
      <div class="splitter-handle"></div>
    </div>
    
    <!-- 下部：终端面板 -->
    <div 
      class="bottom-panel"
      :style="{ height: `calc(100% - ${topHeight}px - 4px)` }"
    >
      <TerminalPanel 
        :project-path="projectPath" 
        :is-dark="isDark"
        @terminals-update="$emit('terminals-update', $event)"
        @active-terminal-update="$emit('active-terminal-update', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import GitHistory from './git/GitHistory.vue'
import TerminalPanel from './TerminalPanel.vue'

const props = defineProps<{
  projectPath?: string | null
  isDark?: boolean
}>()

const emit = defineEmits<{
  'terminals-update': [terminals: any[]]
  'active-terminal-update': [activeTerminalId: string]
}>()

// 面板高度管理
const topHeight = ref(500) // 默认上部高度500px（给Git历史更多空间）
const minTopHeight = 250 // 上部最小高度
const minBottomHeight = 150 // 下部最小高度

// 拖动状态
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartHeight = ref(0)

// 处理diff视图切换
const handleDiffViewToggle = (showDiff: boolean) => {
  // 当显示diff时，可以自动调整面板高度
  if (showDiff && topHeight.value < 400) {
    topHeight.value = 500
  }
}

// 开始拖动
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStartY.value = e.clientY
  dragStartHeight.value = topHeight.value
  
  // 设置拖动时的样式
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
  
  // 添加全局事件监听
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  
  e.preventDefault()
}

// 处理拖动
const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaY = e.clientY - dragStartY.value
  const newHeight = dragStartHeight.value + deltaY
  
  // 获取容器总高度
  const container = document.querySelector('.git-explorer-layout')
  if (!container) return
  
  const containerHeight = container.clientHeight
  const maxTopHeight = containerHeight - minBottomHeight - 4 // 4px是分隔条高度
  
  // 限制高度范围
  if (newHeight >= minTopHeight && newHeight <= maxTopHeight) {
    topHeight.value = newHeight
  } else if (newHeight < minTopHeight) {
    topHeight.value = minTopHeight
  } else if (newHeight > maxTopHeight) {
    topHeight.value = maxTopHeight
  }
}

// 停止拖动
const stopDrag = () => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  // 恢复默认样式
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  // 移除事件监听
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  
  // 保存高度偏好
  localStorage.setItem('gitExplorerTopHeight', topHeight.value.toString())
}

// 恢复保存的高度
onMounted(() => {
  const savedHeight = localStorage.getItem('gitExplorerTopHeight')
  if (savedHeight) {
    const height = parseInt(savedHeight, 10)
    if (!isNaN(height)) {
      topHeight.value = height
    }
  }
})

// 清理
onUnmounted(() => {
  // 确保清理所有事件监听
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.git-explorer-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  position: relative;
}

.top-panel {
  overflow: hidden;
  background: #181818;
  border-bottom: 1px solid #2d2d30;
}

.horizontal-splitter {
  height: 4px;
  background: #2d2d30;
  cursor: ns-resize;
  position: relative;
  transition: background 0.2s;
  user-select: none;
}

.horizontal-splitter:hover {
  background: #3e3e42;
}

.horizontal-splitter.dragging {
  background: #007acc;
}

.splitter-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 2px;
  background: #5a5a5a;
  border-radius: 1px;
}

.horizontal-splitter:hover .splitter-handle {
  background: #858585;
}

.horizontal-splitter.dragging .splitter-handle {
  background: #ffffff;
}

.bottom-panel {
  flex: 1;
  overflow: hidden;
  background: #1e1e1e;
}
</style>