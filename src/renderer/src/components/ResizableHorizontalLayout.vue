<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  initialLeftWidth?: number // 初始左栏宽度百分比
  initialMiddleWidth?: number // 初始中栏宽度百分比
  minLeftWidth?: number // 最小左栏宽度百分比
  minMiddleWidth?: number // 最小中栏宽度百分比
  minRightWidth?: number // 最小右栏宽度百分比
}>()

const emit = defineEmits<{
  resize: [leftWidth: number, middleWidth: number]
}>()

// 默认值
const defaultLeftWidth = props.initialLeftWidth || 30
const defaultMiddleWidth = props.initialMiddleWidth || 30
const minLeft = props.minLeftWidth || 15
const minMiddle = props.minMiddleWidth || 15
const minRight = props.minRightWidth || 20

// 状态
const container = ref<HTMLElement>()
const leftWidth = ref(defaultLeftWidth)
const middleWidth = ref(defaultMiddleWidth)
const isDraggingLeft = ref(false)
const isDraggingRight = ref(false)
const startX = ref(0)
const startLeftWidth = ref(0)
const startMiddleWidth = ref(0)

// 计算右栏宽度
const rightWidth = computed(() => 100 - leftWidth.value - middleWidth.value)

// 计算样式
const leftStyle = computed(() => ({
  width: `${leftWidth.value}%`
}))

const middleStyle = computed(() => ({
  width: `${middleWidth.value}%`
}))

const rightStyle = computed(() => ({
  width: `${rightWidth.value}%`
}))

// 开始拖动左分隔条
const startDragLeft = (e: MouseEvent) => {
  isDraggingLeft.value = true
  startX.value = e.clientX
  startLeftWidth.value = leftWidth.value
  
  document.addEventListener('mousemove', handleDragLeft)
  document.addEventListener('mouseup', stopDrag)
  
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

// 开始拖动右分隔条
const startDragRight = (e: MouseEvent) => {
  isDraggingRight.value = true
  startX.value = e.clientX
  startMiddleWidth.value = middleWidth.value
  
  document.addEventListener('mousemove', handleDragRight)
  document.addEventListener('mouseup', stopDrag)
  
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

// 处理左分隔条拖动
const handleDragLeft = (e: MouseEvent) => {
  if (!isDraggingLeft.value || !container.value) return
  
  const containerRect = container.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const deltaX = e.clientX - startX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  
  let newLeftWidth = startLeftWidth.value + deltaPercent
  
  // 限制宽度范围
  const maxLeftWidth = 100 - middleWidth.value - minRight
  newLeftWidth = Math.max(minLeft, Math.min(maxLeftWidth, newLeftWidth))
  
  leftWidth.value = newLeftWidth
  emit('resize', leftWidth.value, middleWidth.value)
}

// 处理右分隔条拖动
const handleDragRight = (e: MouseEvent) => {
  if (!isDraggingRight.value || !container.value) return
  
  const containerRect = container.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const deltaX = e.clientX - startX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  
  let newMiddleWidth = startMiddleWidth.value + deltaPercent
  
  // 限制宽度范围
  const maxMiddleWidth = 100 - leftWidth.value - minRight
  newMiddleWidth = Math.max(minMiddle, Math.min(maxMiddleWidth, newMiddleWidth))
  
  middleWidth.value = newMiddleWidth
  emit('resize', leftWidth.value, middleWidth.value)
}

// 停止拖动
const stopDrag = () => {
  if (isDraggingLeft.value || isDraggingRight.value) {
    isDraggingLeft.value = false
    isDraggingRight.value = false
    
    document.removeEventListener('mousemove', handleDragLeft)
    document.removeEventListener('mousemove', handleDragRight)
    document.removeEventListener('mouseup', stopDrag)
    
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    // 保存用户偏好
    localStorage.setItem('resizable-horizontal-layout-left', leftWidth.value.toString())
    localStorage.setItem('resizable-horizontal-layout-middle', middleWidth.value.toString())
  }
}

// 恢复保存的宽度
onMounted(() => {
  const savedLeft = localStorage.getItem('resizable-horizontal-layout-left')
  const savedMiddle = localStorage.getItem('resizable-horizontal-layout-middle')
  
  if (savedLeft && savedMiddle) {
    const left = parseFloat(savedLeft)
    const middle = parseFloat(savedMiddle)
    const right = 100 - left - middle
    
    // 验证宽度是否合理
    if (!isNaN(left) && !isNaN(middle) && 
        left >= minLeft && middle >= minMiddle && right >= minRight) {
      leftWidth.value = left
      middleWidth.value = middle
    }
  }
})

// 清理
onUnmounted(() => {
  if (isDraggingLeft.value || isDraggingRight.value) {
    stopDrag()
  }
})
</script>

<template>
  <div class="resizable-horizontal-layout" ref="container">
    <!-- 左栏 -->
    <div class="left-panel" :style="leftStyle">
      <slot name="left"></slot>
    </div>
    
    <!-- 左分隔条 -->
    <div 
      class="resize-divider left-divider" 
      @mousedown="startDragLeft"
      :class="{ resizing: isDraggingLeft }"
    >
      <div class="divider-handle"></div>
    </div>
    
    <!-- 中栏 -->
    <div class="middle-panel" :style="middleStyle">
      <slot name="middle"></slot>
    </div>
    
    <!-- 右分隔条 -->
    <div 
      class="resize-divider right-divider" 
      @mousedown="startDragRight"
      :class="{ resizing: isDraggingRight }"
    >
      <div class="divider-handle"></div>
    </div>
    
    <!-- 右栏 -->
    <div class="right-panel" :style="rightStyle">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<style scoped>
.resizable-horizontal-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  position: relative;
}

.left-panel,
.middle-panel,
.right-panel {
  overflow: hidden;
  position: relative;
  height: 100%;
}

.resize-divider {
  width: 4px;
  background: #2d2d30;
  position: relative;
  cursor: col-resize;
  transition: background 0.2s;
  user-select: none;
  flex-shrink: 0;
}

.resize-divider:hover {
  background: #3e3e42;
}

.resize-divider.resizing {
  background: #007acc;
}

.divider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background: #5a5a5a;
  border-radius: 1px;
}

.resize-divider:hover .divider-handle {
  background: #858585;
}

.resize-divider.resizing .divider-handle {
  background: #ffffff;
}
</style>