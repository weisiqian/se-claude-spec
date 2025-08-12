<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <span class="header-title">资源管理器</span>
      <div class="header-actions">
        <button class="action-btn" @click="showNewFileDialog" title="新建文件">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M10.5 2H4.5A1.5 1.5 0 0 0 3 3.5v11A1.5 1.5 0 0 0 4.5 16h9A1.5 1.5 0 0 0 15 14.5V6.5L10.5 2z" 
                  stroke="currentColor" stroke-width="1.5"/>
            <polyline points="10.5 2 10.5 6.5 15 6.5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="9" y1="12.5" x2="9" y2="9.5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="7.5" y1="11" x2="10.5" y2="11" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="action-btn" @click="showNewFolderDialog" title="新建文件夹">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M16 13.5a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h4l1.5 1.5h6.5a1 1 0 0 1 1 1v7.5z" 
                  stroke="currentColor" stroke-width="1.5"/>
            <line x1="9" y1="8.5" x2="9" y2="11.5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="7.5" y1="10" x2="10.5" y2="10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="action-btn" @click="refreshTree" title="刷新 (F5)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M15.5 3v4h-4M2.5 9a6.5 6.5 0 0 1 10.8-4.9L15.5 6M2.5 15v-4h4M15.5 9a6.5 6.5 0 0 1-10.8 4.9L2.5 12" 
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="action-btn" @click="toggleExpandCollapse" :title="allExpanded ? '全部折叠' : '全部展开'">
          <svg v-if="!allExpanded" width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <!-- 展开所有图标 - 使用折叠的树形图标 -->
            <path d="M3 3h3v3H3zM8 4.5h7M3 12h3v3H3zM8 13.5h7" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M11 7.5v-3M11 10.5v3" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <rect x="10" y="7" width="2" height="2" rx="0.5"/>
            <rect x="10" y="9.5" width="2" height="2" rx="0.5"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <!-- 折叠所有图标 - 使用展开的树形图标 -->
            <path d="M3 3h3v3H3zM8 4.5h7M3 8h3v3H3zM8 9.5h7M3 13h3v3H3zM8 14.5h7" stroke="currentColor" stroke-width="1.5" fill="none"/>
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
    
    <div class="explorer-content" v-if="fileTree && workspaceExpanded" @contextmenu.prevent="handleEmptyAreaContextMenu">
      <FileTreeNode 
        v-for="node in fileTree.children" 
        :key="node.path"
        :node="node"
        :level="0"
        @select="handleFileSelect"
        @select-node="(node) => { selectedNode = node }"
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
    
    <!-- 输入对话框 -->
    <InputDialog
      v-model:visible="dialogVisible"
      :title="dialogTitle"
      :placeholder="dialogPlaceholder"
      :default-value="dialogDefaultValue"
      @confirm="handleDialogConfirm"
    />
    
    <!-- 确认对话框 -->
    <ConfirmDialog
      v-model:visible="confirmDialogVisible"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="handleConfirmDelete"
    />
    
    <!-- 空白区域右键菜单 -->
    <ContextMenu
      :items="emptyAreaMenuItems"
      :x="emptyAreaMenuX"
      :y="emptyAreaMenuY"
      :visible="emptyAreaMenuVisible"
      @close="emptyAreaMenuVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineAsyncComponent, computed } from 'vue'
import InputDialog from './InputDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import ContextMenu from './ContextMenu.vue'
import type { MenuItem } from './ContextMenu.vue'

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
  'file-select': [path: string, mode?: 'preview' | 'open']
}>()

const fileTree = ref<FileNode | null>(null)
const loading = ref(false)
const currentWorkspace = ref<string | null>(null)
const workspaceExpanded = ref(true)
const selectedPath = ref<string | null>(null)
const selectedNode = ref<{ path: string, type: 'file' | 'directory' } | null>(null)
const allExpanded = ref(false)

// 输入对话框相关
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogPlaceholder = ref('')
const dialogDefaultValue = ref('')
const dialogType = ref<'file' | 'folder' | 'rename' | ''>('')
const dialogContext = ref<'root' | 'node'>('root')
const dialogParentPath = ref('')

// 确认对话框相关
const confirmDialogVisible = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const deleteTarget = ref<{ path: string, name: string } | null>(null)

// 空白区域右键菜单相关
const emptyAreaMenuVisible = ref(false)
const emptyAreaMenuX = ref(0)
const emptyAreaMenuY = ref(0)
const emptyAreaMenuItems = ref<MenuItem[]>([])

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

const expandAll = () => {
  // 发送事件让所有节点展开
  window.dispatchEvent(new CustomEvent('expand-all-nodes'))
}

const toggleWorkspace = () => {
  workspaceExpanded.value = !workspaceExpanded.value
}

const handleFileSelect = (path: string, mode: string) => {
  // mode can be 'preview', 'open', or 'directory'
  selectedPath.value = path
  
  if (mode === 'preview') {
    // 单击文件：仅预览，不打开标签
    selectedNode.value = { path, type: 'file' }
    emit('file-select', path, 'preview')
  } else if (mode === 'open') {
    // 双击文件：打开标签进行编辑
    selectedNode.value = { path, type: 'file' }
    emit('file-select', path, 'open')
  } else if (mode === 'directory') {
    // 单击目录：仅更新选中状态，不触发文件选择
    selectedNode.value = { path, type: 'directory' }
  }
}

const toggleExpandCollapse = () => {
  if (allExpanded.value) {
    collapseAll()
  } else {
    expandAll()
  }
  allExpanded.value = !allExpanded.value
}

const handleContextMenu = (event: { path: string, x: number, y: number, type: 'file' | 'directory' }) => {
  // 显示右键菜单
  console.log('Context menu:', event)
}

const handleEmptyAreaContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  // 生成空白区域的菜单项
  emptyAreaMenuItems.value = [
    {
      label: '新建文件',
      action: () => showNewFileDialog()
    },
    {
      label: '新建文件夹',
      action: () => showNewFolderDialog()
    },
    { type: 'separator' },
    {
      label: '刷新',
      shortcut: 'F5',
      action: () => refreshTree()
    },
    { type: 'separator' },
    {
      label: '全部展开',
      action: () => {
        if (!allExpanded.value) {
          expandAll()
          allExpanded.value = true
        }
      },
      disabled: allExpanded.value
    },
    {
      label: '全部折叠',
      action: () => {
        if (allExpanded.value) {
          collapseAll()
          allExpanded.value = false
        }
      },
      disabled: !allExpanded.value
    },
    { type: 'separator' },
    {
      label: '在资源管理器中打开',
      action: () => {
        if (currentWorkspace.value) {
          window.api.showItemInFolder(currentWorkspace.value)
        }
      }
    }
  ]
  
  emptyAreaMenuX.value = e.clientX
  emptyAreaMenuY.value = e.clientY
  emptyAreaMenuVisible.value = true
}

const showNewFileDialog = () => {
  if (!currentWorkspace.value) {
    alert('请先打开一个工作空间')
    return
  }
  
  dialogType.value = 'file'
  dialogTitle.value = '新建文件'
  dialogPlaceholder.value = '请输入文件名'
  dialogDefaultValue.value = ''
  dialogContext.value = 'root'
  dialogVisible.value = true
}

const showNewFolderDialog = () => {
  if (!currentWorkspace.value) {
    alert('请先打开一个工作空间')
    return
  }
  
  dialogType.value = 'folder'
  dialogTitle.value = '新建文件夹'
  dialogPlaceholder.value = '请输入文件夹名'
  dialogDefaultValue.value = ''
  dialogContext.value = 'root'
  dialogVisible.value = true
}

const handleDialogConfirm = async (value: string) => {
  if (!value.trim()) return
  
  try {
    if (dialogType.value === 'rename') {
      // 处理重命名
      if (value !== dialogDefaultValue) {
        await window.api.renameItem(dialogParentPath.value, value)
        await refreshTree()
      }
    } else {
      // 处理创建文件或文件夹
      if (!currentWorkspace.value) return
      
      let targetPath = currentWorkspace.value
      
      // 如果是从节点右键菜单触发的，使用节点路径
      if (dialogContext.value === 'node' && dialogParentPath.value) {
        targetPath = dialogParentPath.value
      } else if (selectedNode.value && selectedNode.value.type === 'directory') {
        // 否则优先在选中的文件夹中创建
        targetPath = selectedNode.value.path
      }
      
      if (dialogType.value === 'file') {
        await window.api.createFile(targetPath, value)
      } else if (dialogType.value === 'folder') {
        await window.api.createDirectory(targetPath, value)
      }
      
      await refreshTree()
      
      // 展开父文件夹
      if ((dialogContext.value === 'node' && dialogParentPath.value) || 
          (selectedNode.value && selectedNode.value.type === 'directory')) {
        window.dispatchEvent(new CustomEvent('expand-node', { detail: { path: targetPath } }))
      }
    }
  } catch (error) {
    const action = dialogType.value === 'rename' ? '重命名' : 
                   `创建${dialogType.value === 'file' ? '文件' : '文件夹'}`
    console.error(`${action}失败:`, error)
    alert(`${action}失败: ${error}`)
  }
}

const handleCreateFile = async (parentPath: string) => {
  dialogType.value = 'file'
  dialogTitle.value = '新建文件'
  dialogPlaceholder.value = '请输入文件名'
  dialogDefaultValue.value = ''
  dialogContext.value = 'node'
  dialogParentPath.value = parentPath
  dialogVisible.value = true
}

const handleCreateFolder = async (parentPath: string) => {
  dialogType.value = 'folder'
  dialogTitle.value = '新建文件夹'
  dialogPlaceholder.value = '请输入文件夹名'
  dialogDefaultValue.value = ''
  dialogContext.value = 'node'
  dialogParentPath.value = parentPath
  dialogVisible.value = true
}

const handleRename = async (path: string, oldName: string) => {
  dialogType.value = 'rename'
  dialogTitle.value = '重命名'
  dialogPlaceholder.value = '请输入新名称'
  dialogDefaultValue.value = oldName
  dialogContext.value = 'node'
  dialogParentPath.value = path
  dialogVisible.value = true
}

const handleDelete = async (path: string, name: string) => {
  deleteTarget.value = { path, name }
  confirmDialogTitle.value = '确认删除'
  confirmDialogMessage.value = `确定要删除 "${name}" 吗？此操作不可恢复。`
  confirmDialogVisible.value = true
}

const handleConfirmDelete = async () => {
  if (!deleteTarget.value) return
  
  try {
    await window.api.deleteItem(deleteTarget.value.path)
    await refreshTree()
    deleteTarget.value = null
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
  background: rgba(255, 255, 255, 0.03);
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
  width: 24px;
  height: 24px;
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