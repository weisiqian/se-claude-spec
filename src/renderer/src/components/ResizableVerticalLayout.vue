<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  initialTopHeight?: number // 初始上部高度百分比
  minTopHeight?: number // 最小上部高度百分比
  maxTopHeight?: number // 最大上部高度百分比
  dividerSize?: number // 分隔条大小
}>()

const emit = defineEmits<{
  resize: [topHeight: number]
}>()

// 默认值
const defaultTopHeight = props.initialTopHeight || 50
const minHeight = props.minTopHeight || 20
const maxHeight = props.maxTopHeight || 80
const dividerHeight = props.dividerSize || 4

// 状态
const container = ref<HTMLElement>()
const topHeight = ref(defaultTopHeight)
const isResizing = ref(false)
const startY = ref(0)
const startHeight = ref(0)

// 计算样式
const topStyle = computed(() => ({
  height: `calc(${topHeight.value}% - ${dividerHeight / 2}px)`
}))

const bottomStyle = computed(() => ({
  height: `calc(${100 - topHeight.value}% - ${dividerHeight / 2}px)`
}))

const dividerStyle = computed(() => ({
  height: `${dividerHeight}px`,
  cursor: isResizing.value ? 'row-resize' : 'row-resize'
}))

// 开始调整大小
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startY.value = e.clientY
  startHeight.value = topHeight.value
  
  // 添加全局事件监听
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  // 防止选中文本
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'row-resize'
}

// 处理调整大小
const handleResize = (e: MouseEvent) => {
  if (!isResizing.value || !container.value) return
  
  const containerRect = container.value.getBoundingClientRect()
  const containerHeight = containerRect.height
  const deltaY = e.clientY - startY.value
  const deltaPercent = (deltaY / containerHeight) * 100
  
  let newHeight = startHeight.value + deltaPercent
  
  // 限制高度范围
  newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
  
  topHeight.value = newHeight
  emit('resize', newHeight)
}

// 停止调整大小
const stopResize = () => {
  isResizing.value = false
  
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  
  // 恢复默认样式
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  
  // 保存用户偏好
  localStorage.setItem('resizable-vertical-layout-height', topHeight.value.toString())
}

// 恢复保存的高度
onMounted(() => {
  const savedHeight = localStorage.getItem('resizable-vertical-layout-height')
  if (savedHeight) {
    const height = parseFloat(savedHeight)
    if (!isNaN(height) && height >= minHeight && height <= maxHeight) {
      topHeight.value = height
    }
  }
})

// 清理
onUnmounted(() => {
  if (isResizing.value) {
    stopResize()
  }
})
</script>

<template>
  <div class="resizable-vertical-layout" ref="container">
    <div class="top-panel" :style="topStyle">
      <slot name="top"></slot>
    </div>
    
    <div 
      class="resize-divider" 
      :style="dividerStyle"
      @mousedown="startResize"
      :class="{ resizing: isResizing }"
    >
      <div class="divider-handle"></div>
    </div>
    
    <div class="bottom-panel" :style="bottomStyle">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<style scoped>
.resizable-vertical-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
}

.top-panel {
  overflow: hidden;
  position: relative;
}

.bottom-panel {
  overflow: hidden;
  position: relative;
  flex: 1;
}

.resize-divider {
  background: #2d2d30;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  user-select: none;
}

.resize-divider:hover {
  background: #3e3e42;
}

.resize-divider.resizing {
  background: #007acc;
}

.divider-handle {
  width: 40px;
  height: 2px;
  background: #5a5a5a;
  border-radius: 1px;
  position: relative;
}

.divider-handle::before,
.divider-handle::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  background: #5a5a5a;
  border-radius: 1px;
}

.divider-handle::before {
  top: -3px;
}

.divider-handle::after {
  top: 3px;
}

.resize-divider:hover .divider-handle,
.resize-divider:hover .divider-handle::before,
.resize-divider:hover .divider-handle::after {
  background: #858585;
}

.resize-divider.resizing .divider-handle,
.resize-divider.resizing .divider-handle::before,
.resize-divider.resizing .divider-handle::after {
  background: #ffffff;
}
</style>