<template>
  <div class="file-node">
    <div 
      class="node-item"
      :class="{ 'is-selected': isSelected }"
      :style="{ paddingLeft: (level * 20 + 8) + 'px' }"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <!-- 展开/折叠按钮 -->
      <span 
        v-if="node.type === 'directory'" 
        class="node-arrow"
        @click.stop="toggleExpand"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="!isExpanded" d="M10 17l5-5-5-5v10z"/>
          <path v-else d="M7 10l5 5 5-5H7z"/>
        </svg>
      </span>
      <span v-else class="node-arrow-placeholder"></span>
      
      <!-- 文件/文件夹图标 -->
      <span class="node-icon" :style="{ color: getIconColor(node.name) }">
        <svg v-if="node.type === 'directory'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="isExpanded" d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
          <path v-else d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" opacity="0.8"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path :d="getFileIcon(node.name)" />
        </svg>
      </span>
      
      <!-- 文件/文件夹名称 -->
      <span class="node-name" v-if="!isRenaming">{{ node.name }}</span>
      <input
        v-else
        ref="renameInput"
        class="rename-input"
        :value="node.name"
        @blur="handleRenameComplete"
        @keydown.enter="handleRenameComplete"
        @keydown.esc="cancelRename"
        @click.stop
      />
      
      <!-- 文件大小（可选） -->
      <span v-if="node.type === 'file' && node.size" class="node-size">
        {{ formatFileSize(node.size) }}
      </span>
    </div>
    
    <!-- 子节点 -->
    <div v-if="node.type === 'directory' && isExpanded && node.children" class="node-children">
      <FileTreeNode 
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        @select="$emit('select', $event)"
        @context-menu="$emit('context-menu', $event)"
        @create-file="$emit('create-file', $event)"
        @create-folder="$emit('create-folder', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modified?: string
}

const props = defineProps<{
  node: FileNode
  level: number
}>()

const emit = defineEmits<{
  'select': [path: string]
  'context-menu': [event: { path: string, x: number, y: number, type: 'file' | 'directory', name: string }]
  'create-file': [parentPath: string]
  'create-folder': [parentPath: string]
  'rename': [path: string, oldName: string]
  'delete': [path: string, name: string]
}>()

const isExpanded = ref(false)
const isSelected = ref(false)
const isRenaming = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)

const handleClick = () => {
  if (props.node.type === 'directory') {
    toggleExpand()
  } else {
    // 文件被点击，触发选择事件
    emit('select', props.node.path)
    // 更新选中状态
    document.querySelectorAll('.node-item').forEach(item => {
      item.classList.remove('is-selected')
    })
    isSelected.value = true
  }
}

const toggleExpand = () => {
  if (props.node.type === 'directory') {
    isExpanded.value = !isExpanded.value
  }
}

// 处理右键菜单
const handleContextMenu = (e: MouseEvent) => {
  emit('context-menu', {
    path: props.node.path,
    x: e.clientX,
    y: e.clientY,
    type: props.node.type,
    name: props.node.name
  })
}

// 开始重命名
const startRename = async () => {
  isRenaming.value = true
  await nextTick()
  if (renameInput.value) {
    renameInput.value.select()
    renameInput.value.focus()
  }
}

// 完成重命名
const handleRenameComplete = (e: Event) => {
  const input = e.target as HTMLInputElement
  const newName = input.value.trim()
  
  if (newName && newName !== props.node.name) {
    emit('rename', props.node.path, props.node.name)
  }
  
  isRenaming.value = false
}

// 取消重命名
const cancelRename = () => {
  isRenaming.value = false
}

// 根据文件扩展名返回对应图标
const getFileIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  // 简化图标，都使用文件图标
  return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z'
}

// 根据文件类型返回图标颜色
const getIconColor = (filename: string): string => {
  if (props.node.type === 'directory') return '#dcb67a'
  
  const ext = filename.split('.').pop()?.toLowerCase()
  const colorMap: Record<string, string> = {
    'js': '#f7df1e',
    'jsx': '#61dafb',
    'ts': '#3178c6',
    'tsx': '#3178c6',
    'vue': '#4fc08d',
    'html': '#e34c26',
    'css': '#1572b6',
    'scss': '#cc6699',
    'json': '#5656e7',
    'md': '#083fa1',
    'py': '#3776ab',
    'java': '#007396',
    'c': '#555555',
    'cpp': '#00599c',
    'cs': '#239120',
    'go': '#00add8',
    'rs': '#dea584',
    'php': '#777bb4',
    'rb': '#cc342d',
    'swift': '#fa7343',
    'kt': '#f18e33',
    'yaml': '#cb171e',
    'yml': '#cb171e',
    'xml': '#f69b3e',
    'sql': '#336791',
    'sh': '#4eaa25',
    'bash': '#4eaa25',
    'ps1': '#012456',
    'dockerfile': '#2496ed',
    'gitignore': '#f54d27',
    'env': '#edd711'
  }
  
  return colorMap[ext || ''] || '#cccccc'
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 监听全局事件
const handleCollapseAll = () => {
  isExpanded.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!isSelected.value) return
  
  if (e.key === 'F2') {
    e.preventDefault()
    startRename()
  } else if (e.key === 'Delete') {
    e.preventDefault()
    emit('delete', props.node.path, props.node.name)
  }
}

onMounted(() => {
  window.addEventListener('collapse-all-nodes', handleCollapseAll)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('collapse-all-nodes', handleCollapseAll)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.file-node {
  user-select: none;
}

.node-item {
  display: flex;
  align-items: center;
  height: 22px;
  cursor: pointer;
  color: var(--wt-text-primary);
  transition: background 0.15s;
}

.node-item:hover {
  background: var(--wt-bg-hover);
}

.node-item.is-selected {
  background: var(--wt-bg-active);
}

.node-arrow {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--wt-text-secondary);
}

.node-arrow-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.node-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--wt-accent);
}

.node-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-size {
  margin-left: auto;
  margin-right: 8px;
  font-size: 11px;
  color: var(--wt-text-tertiary);
}

.node-children {
  position: relative;
}

/* 连接线效果（可选） */
.node-children::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--wt-border);
  opacity: 0.3;
}

.rename-input {
  flex: 1;
  font-size: 13px;
  padding: 0 4px;
  margin: 0;
  border: 1px solid var(--wt-accent);
  border-radius: 2px;
  background: var(--wt-bg-primary);
  color: var(--wt-text-primary);
  outline: none;
  font-family: inherit;
}
</style>