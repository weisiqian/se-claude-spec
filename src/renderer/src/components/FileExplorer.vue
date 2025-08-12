<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <span class="header-title">资源管理器</span>
      <div class="header-actions">
        <button class="action-btn" @click="createNewFile" title="新建文件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
                  stroke="currentColor" stroke-width="2"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="action-btn" @click="createNewFolder" title="新建文件夹">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" 
                  stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="action-btn" @click="refreshTree" title="刷新 (F5)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="action-btn" @click="collapseAll" title="全部折叠">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="explorer-workspace" v-if="currentWorkspace">
      <div class="workspace-name" @click="toggleWorkspace">
        <span class="workspace-arrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="!workspaceExpanded" d="M10 17l5-5-5-5v10z"/>
            <path v-else d="M7 10l5 5 5-5H7z"/>
          </svg>
        </span>
        <span class="workspace-label">{{ workspaceName }}</span>
      </div>
    </div>
    
    <div class="explorer-content" v-if="fileTree && workspaceExpanded">
      <FileTreeNode 
        v-for="node in fileTree.children" 
        :key="node.path"
        :node="node"
        :level="0"
        @select="handleFileSelect"
        @context-menu="handleContextMenu"
        @create-file="handleCreateFile"
        @create-folder="handleCreateFolder"
        @rename="handleRename"
        @delete="handleDelete"
      />
    </div>
    
    <div class="explorer-loading" v-else-if="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineAsyncComponent, computed } from 'vue'

// 递归组件需要异步导入避免循环依赖
const FileTreeNode = defineAsyncComponent(() => import('./FileTreeNode.vue'))

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modified?: string
}

const emit = defineEmits<{
  'file-select': [path: string]
}>()

const fileTree = ref<FileNode | null>(null)
const loading = ref(false)
const currentWorkspace = ref<string | null>(null)
const workspaceExpanded = ref(true)
const selectedPath = ref<string | null>(null)

// 计算工作空间名称
const workspaceName = computed(() => {
  if (!currentWorkspace.value) return ''
  const parts = currentWorkspace.value.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || parts[parts.length - 2] || '工作空间'
})

const loadFileTree = async () => {
  if (!currentWorkspace.value) {
    fileTree.value = null
    return
  }
  
  loading.value = true
  try {
    const tree = await window.api.getDirectoryTree(currentWorkspace.value)
    fileTree.value = tree
  } catch (error) {
    console.error('加载文件树失败:', error)
    fileTree.value = null
  } finally {
    loading.value = false
  }
}

const refreshTree = () => {
  loadFileTree()
}

const collapseAll = () => {
  // 发送事件让所有节点折叠
  window.dispatchEvent(new CustomEvent('collapse-all-nodes'))
}

const toggleWorkspace = () => {
  workspaceExpanded.value = !workspaceExpanded.value
}

const handleFileSelect = (path: string) => {
  selectedPath.value = path
  emit('file-select', path)
}

const handleContextMenu = (event: { path: string, x: number, y: number, type: 'file' | 'directory' }) => {
  // 显示右键菜单
  console.log('Context menu:', event)
}

const createNewFile = async () => {
  // 在根目录创建新文件
  if (!currentWorkspace.value) return
  const fileName = prompt('请输入文件名：')
  if (!fileName) return
  
  try {
    await window.api.createFile(currentWorkspace.value, fileName)
    await refreshTree()
  } catch (error) {
    console.error('创建文件失败:', error)
    alert('创建文件失败: ' + error)
  }
}

const createNewFolder = async () => {
  // 在根目录创建新文件夹
  if (!currentWorkspace.value) return
  const folderName = prompt('请输入文件夹名：')
  if (!folderName) return
  
  try {
    await window.api.createDirectory(currentWorkspace.value, folderName)
    await refreshTree()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    alert('创建文件夹失败: ' + error)
  }
}

const handleCreateFile = async (parentPath: string) => {
  const fileName = prompt('请输入文件名：')
  if (!fileName) return
  
  try {
    await window.api.createFile(parentPath, fileName)
    await refreshTree()
  } catch (error) {
    console.error('创建文件失败:', error)
    alert('创建文件失败: ' + error)
  }
}

const handleCreateFolder = async (parentPath: string) => {
  const folderName = prompt('请输入文件夹名：')
  if (!folderName) return
  
  try {
    await window.api.createDirectory(parentPath, folderName)
    await refreshTree()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    alert('创建文件夹失败: ' + error)
  }
}

const handleRename = async (path: string, oldName: string) => {
  const newName = prompt('重命名为：', oldName)
  if (!newName || newName === oldName) return
  
  try {
    await window.api.renameItem(path, newName)
    await refreshTree()
  } catch (error) {
    console.error('重命名失败:', error)
    alert('重命名失败: ' + error)
  }
}

const handleDelete = async (path: string, name: string) => {
  if (!confirm(`确定要删除 "${name}" 吗？`)) return
  
  try {
    await window.api.deleteItem(path)
    await refreshTree()
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败: ' + error)
  }
}

// 初始化时加载当前工作空间
onMounted(async () => {
  try {
    const workspace = await window.api.getCurrentWorkspace()
    if (workspace) {
      currentWorkspace.value = workspace
      await loadFileTree()
    }
  } catch (error) {
    console.error('获取工作空间失败:', error)
  }
  
  // 监听工作空间变化
  if (window.api?.onWorkspaceChanged) {
    window.api.onWorkspaceChanged((workspace: string) => {
      currentWorkspace.value = workspace
      loadFileTree()
    })
  }
  
  // 添加键盘快捷键
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'F5') {
      e.preventDefault()
      refreshTree()
    }
  }
  document.addEventListener('keydown', handleKeydown)
  
  // 清理
  return () => {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wt-bg-primary);
  color: var(--wt-text-primary);
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wt-border);
  background: var(--wt-bg-secondary);
}

.header-title {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--wt-text-secondary);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--wt-text-secondary);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--wt-bg-hover);
  color: var(--wt-text-primary);
}

.explorer-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0;
}

.explorer-content::-webkit-scrollbar {
  width: 10px;
}

.explorer-content::-webkit-scrollbar-track {
  background: transparent;
}

.explorer-content::-webkit-scrollbar-thumb {
  background: var(--wt-border);
  border-radius: 5px;
}

.explorer-content::-webkit-scrollbar-thumb:hover {
  background: var(--wt-text-tertiary);
}

.explorer-workspace {
  padding: 4px 0;
  border-bottom: 1px solid var(--wt-border);
}

.workspace-name {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--wt-text-secondary);
  transition: background 0.15s;
}

.workspace-name:hover {
  background: var(--wt-bg-hover);
}

.workspace-arrow {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 2px;
}

.workspace-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.explorer-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--wt-text-tertiary);
  padding: 20px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--wt-border);
  border-top-color: var(--wt-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.explorer-loading p {
  margin: 0;
  font-size: 13px;
}
</style>