<template>
  <div class="file-explorer-layout">
    <!-- 上部：文件查看器 -->
    <div 
      class="top-panel" 
      :style="{ height: topHeight + 'px' }"
    >
      <FileViewer :file-path="selectedFile" />
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
      :style="{ height: `calc(100% - ${topHeight}px - 1px)` }"
    >
      <TerminalPanel 
        :project-path="projectPath" 
        :is-dark="isDark"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import FileViewer from './FileViewer.vue'
import TerminalPanel from './TerminalPanel.vue'

const props = defineProps<{
  selectedFile?: string | null
  projectPath?: string | null
  isDark?: boolean
}>()

// 面板高度管理
const topHeight = ref(400) // 默认上部高度400px
const minTopHeight = 200 // 上部最小高度
const minBottomHeight = 150 // 下部最小高度

// 拖动状态
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartHeight = ref(0)

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
  const container = document.querySelector('.file-explorer-layout')
  if (!container) return
  
  const containerHeight = container.clientHeight
  const maxTopHeight = containerHeight - minBottomHeight - 1 // 1px是分隔条高度
  
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
  
  // 恢复样式
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  // 移除事件监听
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  
  // 保存用户设置
  localStorage.setItem('fileExplorerTopHeight', topHeight.value.toString())
}

// 恢复保存的高度设置
onMounted(() => {
  const savedHeight = localStorage.getItem('fileExplorerTopHeight')
  if (savedHeight) {
    const height = parseInt(savedHeight)
    // 验证高度是否合理
    if (height >= minTopHeight && height <= window.innerHeight - minBottomHeight - 100) {
      topHeight.value = height
    }
  }
})

// 清理事件监听
onUnmounted(() => {
  if (isDragging.value) {
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', stopDrag)
  }
})
</script>

<style scoped>
.file-explorer-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--wt-bg-primary);
}

.top-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 200px;
  background: var(--wt-bg-primary);
}

.horizontal-splitter {
  height: 1px;
  width: 100%;
  background: var(--wt-border);
  cursor: ns-resize;
  position: relative;
  flex-shrink: 0;
  transition: all 0.15s;
  user-select: none;
}

/* 扩大可拖动区域 */
.horizontal-splitter::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -4px;
  bottom: -4px;
  background: transparent;
  z-index: 1;
}

.splitter-handle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 4px;
  background: transparent;
  border-radius: 2px;
  transition: all 0.15s;
  opacity: 0;
  z-index: 2;
}

.horizontal-splitter:hover {
  background: var(--wt-accent);
  height: 2px;
  margin-top: -0.5px;
}

.horizontal-splitter:hover .splitter-handle {
  opacity: 1;
  background: var(--wt-accent);
}

.horizontal-splitter.dragging {
  background: var(--wt-accent);
  height: 2px;
  margin-top: -0.5px;
}

.horizontal-splitter.dragging .splitter-handle {
  opacity: 1;
  background: var(--wt-accent);
  width: 50px;
}

.bottom-panel {
  flex: 1;
  overflow: hidden;
  min-height: 150px;
  background: var(--wt-bg-primary);
}

/* 拖动时的全局样式 */
:global(body.dragging-horizontal) {
  cursor: ns-resize !important;
  user-select: none !important;
}

/* 响应式调整 */
@media (max-height: 600px) {
  .top-panel {
    min-height: 150px;
  }
  
  .bottom-panel {
    min-height: 100px;
  }
}
</style>