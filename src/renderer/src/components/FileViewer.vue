<template>
  <div class="file-viewer">
    <!-- 文件标签栏 -->
    <FileTabs
      v-if="openTabs.length > 0"
      :tabs="openTabs"
      :active-tab="currentFile"
      :is-markdown-file="isMarkdownFile"
      :view-mode="viewMode"
      @select-tab="selectTab"
      @close-tab="closeTab"
      @close-all-tabs="closeAllTabs"
      @close-others="closeOthers"
      @close-to-right="closeToRight"
      @change-view-mode="viewMode = $event"
      @convert-preview-tab="convertPreviewToNormal"
      @open-preview-tab="openPreviewInNewTab"
    />
    
    
    <!-- 内容区域 -->
    <div class="content-container" v-if="currentFile">
      <!-- 仅编辑器模式 -->
      <div v-if="!isMarkdownFile || viewMode === 'editor'" class="editor-only">
        <MonacoEditor
          v-model="fileContent"
          :language="language"
          :read-only="isPreviewTab"
          :height="'100%'"
          :minimap="true"
          :line-numbers="'on'"
          :word-wrap="'on'"
          :automatic-layout="true"
          :enable-maximize="false"
          class="file-viewer-editor"
          @scroll="handleEditorScroll"
        />
      </div>
      
      <!-- 分屏模式 -->
      <div v-else-if="viewMode === 'split'" class="split-view" ref="splitContainer">
        <div class="split-panel editor-panel" :style="{ width: leftPanelWidth + '%' }">
          <MonacoEditor
            v-model="fileContent"
            :language="language"
            :read-only="false"
            :height="'100%'"
            :minimap="false"
            :line-numbers="'on'"
            :word-wrap="'on'"
            :automatic-layout="true"
            :enable-maximize="false"
            class="file-viewer-editor"
            @scroll="handleEditorScroll"
          />
        </div>
        <div 
          class="split-divider" 
          @mousedown="startResize"
          :class="{ 'resizing': isResizing }"
        ></div>
        <div class="split-panel preview-panel" :style="{ width: (100 - leftPanelWidth) + '%' }">
          <MarkdownPreview
            :content="fileContent"
            :sync-scroll="true"
            :scroll-percentage="scrollPercentage"
            @scroll="handlePreviewScroll"
          />
        </div>
      </div>
      
      <!-- 仅预览模式 -->
      <div v-else-if="viewMode === 'preview'" class="preview-only">
        <MarkdownPreview
          :content="fileContent"
        />
      </div>
    </div>
    
    <!-- 空状态 -->
    <div class="viewer-empty" v-else>
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" 
                stroke="currentColor" stroke-width="1.5"/>
          <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </div>
      <h3>未选择文件</h3>
      <p>从左侧文件树中选择一个文件来查看</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import FileTabs from './FileTabs.vue'
import MarkdownPreview from './MarkdownPreview.vue'

const props = defineProps<{
  filePath?: string | null
  fileMode?: 'preview' | 'open'
}>()

const currentFile = ref<string | null>(null)
const fileContent = ref('')
const loading = ref(false)
const openTabs = ref<Array<{ 
  path: string
  name: string
  content?: string
  isPreview?: boolean
  viewMode?: 'editor' | 'preview' | 'split'
  isPreviewTab?: boolean  // 标识是否为预览标签
}>>([])
const tabContents = ref<Map<string, string>>(new Map())
const viewMode = ref<'editor' | 'split' | 'preview'>('editor')
const scrollPercentage = ref(0)
const previewTabPath = ref<string | null>(null) // 跟踪当前预览标签

// 拖动调整宽度相关
const leftPanelWidth = ref(50) // 左侧面板宽度百分比
const isResizing = ref(false)
const splitContainer = ref<HTMLElement>()
const startX = ref(0)
const startLeftWidth = ref(0)

// 判断是否为 Markdown 文件
const isMarkdownFile = computed(() => {
  if (!currentFile.value) return false
  // 对于预览标签，检查源文件的扩展名
  const actualPath = currentFile.value.replace('::preview', '')
  const ext = actualPath.split('.').pop()?.toLowerCase()
  return ext === 'md' || ext === 'markdown'
})

// 判断当前是否为预览标签
const isPreviewTab = computed(() => {
  if (!currentFile.value) return false
  const tab = openTabs.value.find(t => t.path === currentFile.value)
  return tab?.isPreviewTab || false
})

// 计算文件语言类型
const language = computed(() => {
  if (!currentFile.value) return 'text'
  
  const ext = currentFile.value.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'vue': 'html',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'gitignore': 'git',
    'env': 'dotenv'
  }
  
  return languageMap[ext || ''] || 'text'
})

// 计算路径段
const pathSegments = computed(() => {
  if (!currentFile.value) return []
  // 使用正斜杠分割路径，同时处理Windows路径
  return currentFile.value.replace(/\\/g, '/').split('/').filter(Boolean)
})

// 加载文件内容
const loadFile = async (path: string, mode: 'preview' | 'open' = 'open') => {
  loading.value = true
  try {
    const content = await window.api.readFile(path)
    
    // 保存内容到缓存
    tabContents.value.set(path, content)
    fileContent.value = content
    currentFile.value = path
    
    const fileName = path.split(/[\\/]/).pop() || 'untitled'
    const existingTab = openTabs.value.find(tab => tab.path === path)
    
    if (mode === 'preview') {
      // 预览模式：替换现有的预览标签或创建新的预览标签
      if (existingTab && !existingTab.isPreview) {
        // 如果已经作为正常标签打开，只切换到该标签
        currentFile.value = path
        fileContent.value = content
        return
      }
      
      // 移除旧的预览标签（如果存在且不是当前文件）
      if (previewTabPath.value && previewTabPath.value !== path) {
        const oldPreviewIndex = openTabs.value.findIndex(tab => tab.path === previewTabPath.value && tab.isPreview)
        if (oldPreviewIndex !== -1) {
          openTabs.value.splice(oldPreviewIndex, 1)
          tabContents.value.delete(previewTabPath.value)
        }
      }
      
      // 如果没有找到该文件的标签，创建新的预览标签
      if (!existingTab) {
        openTabs.value.push({
          path,
          name: fileName,
          content,
          isPreview: true
        })
      }
      
      previewTabPath.value = path
    } else {
      // open 模式：创建或转换为正常标签
      if (existingTab) {
        // 如果是预览标签，转为正常标签
        if (existingTab.isPreview) {
          existingTab.isPreview = false
          if (previewTabPath.value === path) {
            previewTabPath.value = null
          }
        }
        // 切换到该标签
        currentFile.value = path
        fileContent.value = content
      } else {
        // 最多保留 20 个标签
        if (openTabs.value.length >= 20) {
          const firstTab = openTabs.value[0]
          tabContents.value.delete(firstTab.path)
          openTabs.value.shift()
        }
        
        openTabs.value.push({
          path,
          name: fileName,
          content,
          isPreview: false
        })
      }
    }
  } catch (error) {
    console.error('读取文件失败:', error)
    fileContent.value = `无法读取文件: ${error}`
  } finally {
    loading.value = false
  }
}

// 选择标签
const selectTab = (path: string) => {
  const tab = openTabs.value.find(t => t.path === path)
  
  // 对于预览标签，获取源文件的内容
  let contentPath = path
  if (tab && tab.isPreviewTab && path.endsWith('::preview')) {
    contentPath = path.replace('::preview', '')
  }
  
  const content = tabContents.value.get(contentPath)
  
  if (content !== undefined) {
    currentFile.value = path
    fileContent.value = content
    
    // 根据标签类型设置视图模式
    if (tab) {
      if (tab.isPreviewTab) {
        // 预览标签始终使用预览模式
        viewMode.value = 'preview'
      } else if (tab.viewMode) {
        // 使用标签保存的视图模式
        viewMode.value = tab.viewMode
      } else {
        // 默认编辑器模式
        viewMode.value = 'editor'
      }
      
      // 如果选择的是临时预览标签，准备在编辑时转换为正常标签
      if (tab.isPreview) {
        // 监听文件内容变化，一旦编辑就转为正常标签
        // 这将在 watch fileContent 中处理
      }
    }
  } else {
    // 如果缓存中没有内容，重新加载
    loadFile(contentPath, 'open')
  }
}

// 关闭标签
const closeTab = (path: string) => {
  const index = openTabs.value.findIndex(tab => tab.path === path)
  if (index !== -1) {
    openTabs.value.splice(index, 1)
    tabContents.value.delete(path)
    
    // 如果关闭的是当前标签，切换到相邻标签
    if (path === currentFile.value) {
      if (openTabs.value.length > 0) {
        const newIndex = Math.min(index, openTabs.value.length - 1)
        selectTab(openTabs.value[newIndex].path)
      } else {
        currentFile.value = null
        fileContent.value = ''
      }
    }
  }
}

// 关闭所有标签
const closeAllTabs = () => {
  openTabs.value = []
  tabContents.value.clear()
  currentFile.value = null
  fileContent.value = ''
}

// 将预览标签转换为正常标签
const convertPreviewToNormal = (path: string) => {
  const tab = openTabs.value.find(t => t.path === path)
  if (tab && tab.isPreview) {
    tab.isPreview = false
    if (previewTabPath.value === path) {
      previewTabPath.value = null
    }
  }
}

// 关闭其他标签
const closeOthers = (path: string) => {
  const tabToKeep = openTabs.value.find(tab => tab.path === path)
  if (!tabToKeep) return
  
  // 清除所有标签的内容缓存，除了要保留的
  openTabs.value.forEach(tab => {
    if (tab.path !== path) {
      tabContents.value.delete(tab.path)
    }
  })
  
  // 只保留当前标签
  openTabs.value = [tabToKeep]
  
  // 如果关闭的标签中包含预览标签，需要更新 previewTabPath
  if (previewTabPath.value && previewTabPath.value !== path) {
    previewTabPath.value = null
  }
  
  // 切换到保留的标签
  currentFile.value = path
  const content = tabContents.value.get(path)
  if (content !== undefined) {
    fileContent.value = content
  }
}

// 关闭右侧标签
const closeToRight = (path: string) => {
  const index = openTabs.value.findIndex(tab => tab.path === path)
  if (index === -1) return
  
  // 获取要关闭的标签
  const tabsToClose = openTabs.value.slice(index + 1)
  
  // 清除要关闭标签的内容缓存
  tabsToClose.forEach(tab => {
    tabContents.value.delete(tab.path)
    // 如果关闭的是预览标签，重置 previewTabPath
    if (tab.isPreview && previewTabPath.value === tab.path) {
      previewTabPath.value = null
    }
  })
  
  // 保留左侧和当前标签
  openTabs.value = openTabs.value.slice(0, index + 1)
  
  // 如果当前标签在被关闭的标签中，切换到最后一个保留的标签
  const currentTabStillExists = openTabs.value.some(tab => tab.path === currentFile.value)
  if (!currentTabStillExists && openTabs.value.length > 0) {
    const lastTab = openTabs.value[openTabs.value.length - 1]
    selectTab(lastTab.path)
  }
}

// 处理编辑器滚动
const handleEditorScroll = (percentage: number) => {
  scrollPercentage.value = percentage
}

// 处理预览滚动
const handlePreviewScroll = (percentage: number) => {
  scrollPercentage.value = percentage
}

// 在新标签中打开预览
const openPreviewInNewTab = () => {
  if (!currentFile.value || !isMarkdownFile.value) return
  
  // 获取实际的文件路径（去掉可能的 ::preview 后缀）
  const actualPath = currentFile.value.replace('::preview', '')
  const fileName = actualPath.split(/[\\/]/).pop() || 'untitled'
  const previewTabPath = `${actualPath}::preview`
  
  // 检查是否已存在预览标签
  const existingPreviewTab = openTabs.value.find(tab => 
    tab.path === previewTabPath && tab.isPreviewTab
  )
  
  if (existingPreviewTab) {
    // 如果已存在，切换到该标签
    selectTab(previewTabPath)
    return
  }
  
  // 创建新的预览标签
  openTabs.value.push({
    path: previewTabPath,
    name: `[预览] ${fileName}`,
    isPreview: false,
    viewMode: 'preview',
    isPreviewTab: true
  })
  
  // 预览标签不需要单独存储内容，它会从源文件获取
  
  // 切换到预览标签
  selectTab(previewTabPath)
}

// 开始拖动
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startLeftWidth.value = leftPanelWidth.value
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  
  // 防止选中文本
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

// 处理拖动
const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing.value || !splitContainer.value) return
  
  const containerWidth = splitContainer.value.offsetWidth
  const deltaX = e.clientX - startX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  const newLeftWidth = startLeftWidth.value + deltaPercent
  
  // 限制宽度范围 (20% - 80%)
  if (newLeftWidth >= 20 && newLeftWidth <= 80) {
    leftPanelWidth.value = newLeftWidth
  }
}

// 停止拖动
const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  
  // 恢复默认
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  
  // 保存宽度到 localStorage
  localStorage.setItem('markdown-split-width', String(leftPanelWidth.value))
}

// 监听文件路径和模式变化
watch(
  () => ({ path: props.filePath, mode: props.fileMode }),
  (newValue, oldValue) => {
    if (newValue.path) {
      // 如果路径变化了，或者模式变化了
      if (newValue.path !== oldValue?.path) {
        // 路径变化，加载新文件
        loadFile(newValue.path, newValue.mode || 'preview')
      } else if (newValue.mode !== oldValue?.mode && newValue.mode === 'open') {
        // 只有模式变化，从 preview 切换到 open
        const existingTab = openTabs.value.find(tab => tab.path === newValue.path)
        if (existingTab && existingTab.isPreview) {
          // 将预览标签转换为正常标签
          existingTab.isPreview = false
          if (previewTabPath.value === newValue.path) {
            previewTabPath.value = null
          }
        } else if (!existingTab) {
          // 如果标签不存在，重新加载为 open 模式
          loadFile(newValue.path, 'open')
        }
      }
    } else {
      currentFile.value = null
      fileContent.value = ''
    }
  },
  { deep: true }
)

// 当切换到 Markdown 文件时，保持当前模式
watch(isMarkdownFile, (isMd) => {
  // 不自动切换模式，让用户手动控制
  if (!isMd && viewMode.value !== 'editor') {
    viewMode.value = 'editor'
  }
})

// 监听文件内容变化，编辑时自动将预览标签转换为正常标签
let isInitialLoad = true
watch(fileContent, (newContent, oldContent) => {
  // 跳过初次加载
  if (isInitialLoad) {
    isInitialLoad = false
    return
  }
  
  // 如果内容发生变化且当前标签是预览标签，转换为正常标签
  if (newContent !== oldContent && currentFile.value) {
    const currentTab = openTabs.value.find(tab => tab.path === currentFile.value)
    
    // 如果是预览标签，不允许编辑
    if (currentTab && currentTab.isPreviewTab) {
      // 预览标签是只读的，恢复原内容
      fileContent.value = oldContent
      return
    }
    
    if (currentTab && currentTab.isPreview) {
      currentTab.isPreview = false
      if (previewTabPath.value === currentFile.value) {
        previewTabPath.value = null
      }
    }
    
    // 更新缓存中的内容
    if (currentFile.value) {
      // 获取实际的文件路径（去掉 ::preview 后缀）
      const actualPath = currentFile.value.replace('::preview', '')
      tabContents.value.set(actualPath, newContent)
      
      // 同步更新关联的预览标签内容
      const previewPath = `${actualPath}::preview`
      const previewTab = openTabs.value.find(tab => tab.path === previewPath && tab.isPreviewTab)
      if (previewTab) {
        // 预览标签不需要单独存储内容，它会从源文件获取
        // 如果预览标签当前正在显示，触发重新渲染
        if (currentFile.value === previewPath) {
          // 触发预览更新
          nextTick(() => {
            fileContent.value = newContent
          })
        }
      }
    }
  }
})

// 重置初始加载标志
watch(currentFile, () => {
  isInitialLoad = true
})

// 组件挂载时恢复保存的宽度
onMounted(() => {
  const savedWidth = localStorage.getItem('markdown-split-width')
  if (savedWidth) {
    const width = parseFloat(savedWidth)
    if (width >= 20 && width <= 80) {
      leftPanelWidth.value = width
    }
  }
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  if (isResizing.value) {
    stopResize()
  }
})
</script>

<style scoped>
.file-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wt-bg-primary);
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--wt-bg-secondary);
  border-bottom: 1px solid var(--wt-border);
  min-height: 35px;
}

.file-path {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--wt-text-secondary);
  overflow: hidden;
}

.path-segment {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.path-separator {
  margin: 0 4px;
  color: var(--wt-text-tertiary);
}

.path-text {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path-segment:last-child .path-text {
  color: var(--wt-text-primary);
  font-weight: 500;
}

.file-actions {
  display: flex;
  gap: 4px;
  margin-left: 12px;
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

.editor-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 内容容器样式 */
.content-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  min-height: 0;
}

.editor-only,
.preview-only {
  width: 100%;
  height: 100%;
}

.split-view {
  display: flex;
  width: 100%;
  height: 100%;
}

.split-panel {
  overflow: hidden;
  flex-shrink: 0;
}

.split-divider {
  width: 4px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  transition: background 0.15s;
}

.split-divider::before {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 100%;
  background: var(--wt-border);
  transition: all 0.15s;
}

.split-divider:hover {
  background: var(--wt-bg-hover);
}

.split-divider:hover::before {
  background: var(--wt-accent);
  width: 2px;
}

.split-divider.resizing {
  background: var(--wt-bg-active);
}

.split-divider.resizing::before {
  background: var(--wt-accent);
  width: 2px;
}

/* 移除Monaco编辑器的边框和圆角 */
:deep(.monaco-editor-container) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  height: 100% !important;
  flex: 1 !important;
}

:deep(.monaco-editor-container:hover) {
  border: none !important;
}

:deep(.monaco-editor-container:focus-within) {
  border: none !important;
  box-shadow: none !important;
}

/* 确保 Monaco 编辑器填满容器 */
:deep(.monaco-editor-wrapper) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.viewer-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--wt-text-tertiary);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.viewer-empty h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--wt-text-secondary);
}

.viewer-empty p {
  margin: 0;
  font-size: 13px;
}
</style>