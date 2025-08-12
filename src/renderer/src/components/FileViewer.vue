<template>
  <div class="file-viewer">
    <!-- 文件标签栏 -->
    <FileTabs
      v-if="openTabs.length > 0"
      :tabs="openTabs"
      :active-tab="currentFile"
      @select-tab="selectTab"
      @close-tab="closeTab"
      @close-all-tabs="closeAllTabs"
    />
    
    <!-- Monaco Editor -->
    <div class="editor-container" v-if="currentFile">
      <MonacoEditor
        v-model="fileContent"
        :language="language"
        :read-only="true"
        :height="'100%'"
        :minimap="true"
        :line-numbers="'on'"
        :word-wrap="'on'"
        :automatic-layout="true"
        :enable-maximize="false"
        class="file-viewer-editor"
      />
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
import { ref, computed, watch } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import FileTabs from './FileTabs.vue'

const props = defineProps<{
  filePath?: string | null
}>()

const currentFile = ref<string | null>(null)
const fileContent = ref('')
const loading = ref(false)
const openTabs = ref<Array<{ path: string; name: string; content?: string }>>([])
const tabContents = ref<Map<string, string>>(new Map())

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
const loadFile = async (path: string, addToTabs = true) => {
  loading.value = true
  try {
    const content = await window.api.readFile(path)
    
    // 保存内容到缓存
    tabContents.value.set(path, content)
    fileContent.value = content
    currentFile.value = path
    
    // 添加到标签栏
    if (addToTabs) {
      const fileName = path.split(/[\\/]/).pop() || 'untitled'
      const existingTab = openTabs.value.find(tab => tab.path === path)
      
      if (!existingTab) {
        // 最多保留 20 个标签
        if (openTabs.value.length >= 20) {
          const firstTab = openTabs.value[0]
          tabContents.value.delete(firstTab.path)
          openTabs.value.shift()
        }
        
        openTabs.value.push({
          path,
          name: fileName,
          content
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
  const content = tabContents.value.get(path)
  if (content !== undefined) {
    currentFile.value = path
    fileContent.value = content
  } else {
    // 如果缓存中没有内容，重新加载
    loadFile(path, false)
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


// 监听文件路径变化
watch(() => props.filePath, (newPath) => {
  if (newPath) {
    loadFile(newPath)
  } else {
    currentFile.value = null
    fileContent.value = ''
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