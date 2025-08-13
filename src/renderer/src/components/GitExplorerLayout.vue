<template>
  <div class="git-explorer-layout">
    <!-- 上部：Git历史和Diff查看器 -->
    <div 
      class="top-panel" 
      :style="{ height: topHeight + 'px' }"
    >
      <!-- 有选中文件时显示diff -->
      <div v-if="props.selectedFile" class="diff-viewer-container">
        <div class="diff-header">
          <span class="diff-title">{{ props.selectedFile }}</span>
          <button class="close-button" @click="emit('clear-selection')">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        </div>
        <div class="diff-content">
          <GitDiffViewer 
            :diff="props.selectedFileDiff || ''"
            :file-path="props.selectedFile"
          />
        </div>
      </div>
      <!-- 没有选中文件时显示历史记录 -->
      <GitHistory 
        v-else
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
import GitDiffViewer from './git/GitDiffViewer.vue'
import TerminalPanel from './TerminalPanel.vue'

const props = defineProps<{
  projectPath?: string | null
  isDark?: boolean
  selectedFile?: string
  selectedFileDiff?: string
}>()

const emit = defineEmits<{
  'terminals-update': [terminals: any[]]
  'active-terminal-update': [activeTerminalId: string]
  'clear-selection': []
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

.diff-viewer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #181818;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #212121;
  border-bottom: 1px solid #2d2d30;
}

.diff-title {
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
}

.close-button {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.close-button svg {
  width: 16px;
  height: 16px;
}

.diff-content {
  flex: 1;
  overflow: hidden;
}
</style>