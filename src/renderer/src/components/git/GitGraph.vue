<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GitCommitWithGraph } from '../../stores/gitStore'

const props = defineProps<{
  commits: GitCommitWithGraph[]
  selectedCommit?: GitCommitWithGraph | null
  width?: number
}>()

const emit = defineEmits<{
  select: [commit: GitCommitWithGraph]
}>()

const canvas = ref<HTMLCanvasElement>()
const containerHeight = ref(0)

// 配色方案
const branchColors = [
  '#007acc', // 蓝色 - 主分支
  '#3fb950', // 绿色
  '#f85149', // 红色
  '#a371f7', // 紫色
  '#d29922', // 黄色
  '#58a6ff', // 浅蓝
  '#ff7b72', // 浅红
  '#8b949e', // 灰色
]

// 绘制配置
const config = {
  commitRadius: 4,
  commitSpacing: 24,
  branchSpacing: 16,
  leftPadding: 8,
  topPadding: 12
}

// 分支索引映射
const branchMap = ref<Map<string, number>>(new Map())
const maxBranchIndex = ref(0)

// 解析图形字符，分配分支索引
const parseGraphLines = () => {
  branchMap.value.clear()
  maxBranchIndex.value = 0
  
  props.commits.forEach((commit, index) => {
    const graphLine = commit.graphLine || '*'
    let branchIndex = 0
    
    // 简单的分支索引分配算法
    // 根据图形字符中的位置分配列
    const starPos = graphLine.indexOf('*')
    if (starPos >= 0) {
      branchIndex = Math.floor(starPos / 2)
    }
    
    // 如果有refs，优先使用主分支
    if (commit.refs.some(ref => ref.includes('main') || ref.includes('master'))) {
      branchIndex = 0
    }
    
    branchMap.value.set(commit.hash, branchIndex)
    maxBranchIndex.value = Math.max(maxBranchIndex.value, branchIndex)
  })
}

// 获取分支颜色
const getBranchColor = (index: number) => {
  return branchColors[index % branchColors.length]
}

// 绘制图形
const draw = () => {
  if (!canvas.value) return
  
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  
  const width = props.width || 80
  const height = props.commits.length * config.commitSpacing + config.topPadding * 2
  
  canvas.value.width = width
  canvas.value.height = height
  containerHeight.value = height
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  // 启用抗锯齿
  ctx.imageSmoothingEnabled = true
  
  // 绘制连接线
  props.commits.forEach((commit, index) => {
    const branchIndex = branchMap.value.get(commit.hash) || 0
    const x = config.leftPadding + branchIndex * config.branchSpacing
    const y = config.topPadding + index * config.commitSpacing
    
    // 绘制到父提交的连线
    if (commit.parents && commit.parents.length > 0) {
      commit.parents.forEach(parentHash => {
        const parentIndex = props.commits.findIndex(c => c.hash === parentHash)
        if (parentIndex > index) {
          const parentBranchIndex = branchMap.value.get(parentHash) || 0
          const parentX = config.leftPadding + parentBranchIndex * config.branchSpacing
          const parentY = config.topPadding + parentIndex * config.commitSpacing
          
          ctx.strokeStyle = getBranchColor(branchIndex)
          ctx.lineWidth = 2
          ctx.beginPath()
          
          if (parentBranchIndex === branchIndex) {
            // 同一分支，直线
            ctx.moveTo(x, y)
            ctx.lineTo(parentX, parentY)
          } else {
            // 不同分支，曲线
            ctx.moveTo(x, y)
            ctx.bezierCurveTo(
              x, y + config.commitSpacing / 2,
              parentX, parentY - config.commitSpacing / 2,
              parentX, parentY
            )
          }
          
          ctx.stroke()
        }
      })
    }
  })
  
  // 绘制提交节点
  props.commits.forEach((commit, index) => {
    const branchIndex = branchMap.value.get(commit.hash) || 0
    const x = config.leftPadding + branchIndex * config.branchSpacing
    const y = config.topPadding + index * config.commitSpacing
    
    // 绘制提交圆点
    ctx.fillStyle = getBranchColor(branchIndex)
    ctx.strokeStyle = props.selectedCommit?.hash === commit.hash ? '#ffffff' : getBranchColor(branchIndex)
    ctx.lineWidth = props.selectedCommit?.hash === commit.hash ? 3 : 2
    
    ctx.beginPath()
    ctx.arc(x, y, config.commitRadius, 0, Math.PI * 2)
    ctx.fill()
    
    if (props.selectedCommit?.hash === commit.hash) {
      ctx.stroke()
    }
  })
}

// 处理点击事件
const handleClick = (event: MouseEvent) => {
  if (!canvas.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // 查找点击的提交
  for (let i = 0; i < props.commits.length; i++) {
    const commit = props.commits[i]
    const branchIndex = branchMap.value.get(commit.hash) || 0
    const commitX = config.leftPadding + branchIndex * config.branchSpacing
    const commitY = config.topPadding + i * config.commitSpacing
    
    const distance = Math.sqrt((x - commitX) ** 2 + (y - commitY) ** 2)
    if (distance <= config.commitRadius + 2) {
      emit('select', commit)
      break
    }
  }
}

// 监听提交变化
watch(() => props.commits, () => {
  parseGraphLines()
  draw()
}, { immediate: true, deep: true })

// 监听选中状态变化
watch(() => props.selectedCommit, () => {
  draw()
})

onMounted(() => {
  parseGraphLines()
  draw()
})
</script>

<template>
  <div class="git-graph">
    <canvas 
      ref="canvas"
      :style="{ height: containerHeight + 'px' }"
      @click="handleClick"
    />
  </div>
</template>

<style scoped>
.git-graph {
  width: 100%;
  overflow: hidden;
  background: #1e1e1e;
}

canvas {
  display: block;
  width: 100%;
  cursor: pointer;
}

canvas:hover {
  background: rgba(255, 255, 255, 0.02);
}
</style>