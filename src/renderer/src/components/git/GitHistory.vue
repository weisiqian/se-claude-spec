<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useGitStore } from '../../stores/gitStore'
import GitGraph from './GitGraph.vue'
import GitDiffViewer from './GitDiffViewer.vue'
import ResizablePanel from '../ResizablePanel.vue'
import ResizableVerticalLayout from '../ResizableVerticalLayout.vue'

const gitStore = useGitStore()
const isLoading = ref(false)
const selectedCommit = ref<any>(null)
const commitFiles = ref<any[]>([])
const isLoadingFiles = ref(false)
const selectedFile = ref<string>('')
const fileDiff = ref<string>('')
const isLoadingDiff = ref(false)

// 提供选中的提交给其他组件
provide('selectedCommit', selectedCommit)

// 加载历史记录
const loadHistory = async () => {
  isLoading.value = true
  try {
    await gitStore.loadHistoryWithGraph()
  } catch (error: any) {
    console.error('加载历史记录失败:', error.message)
  } finally {
    isLoading.value = false
  }
}

// 格式化日期 - 显示相对时间和具体时间
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  // 格式化具体时间
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const exactTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  
  // 计算相对时间
  let relativeTime = ''
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      if (minutes === 0) {
        relativeTime = '刚刚'
      } else {
        relativeTime = `${minutes}分钟前`
      }
    } else {
      relativeTime = `${hours}小时前`
    }
  } else if (days === 1) {
    relativeTime = '昨天'
  } else if (days < 7) {
    relativeTime = `${days}天前`
  } else if (days < 30) {
    relativeTime = `${Math.floor(days / 7)}周前`
  } else if (days < 365) {
    relativeTime = `${Math.floor(days / 30)}个月前`
  } else {
    relativeTime = `${Math.floor(days / 365)}年前`
  }
  
  // 返回组合格式
  return `${relativeTime} (${exactTime})`
}

// 格式化提交哈希
const formatHash = (hash: string) => {
  return hash.substring(0, 7)
}

// 选择提交
const selectCommit = async (commit: any) => {
  if (selectedCommit.value?.hash === commit.hash) {
    // 如果点击已选中的提交，取消选中
    selectedCommit.value = null
    selectedFile.value = ''
    fileDiff.value = ''
    commitFiles.value = []
    return
  }
  
  selectedCommit.value = commit
  selectedFile.value = ''
  fileDiff.value = ''
  
  // 加载提交的文件列表
  isLoadingFiles.value = true
  try {
    commitFiles.value = await gitStore.getCommitFiles(commit.hash)
    // 如果只有一个文件，自动选中
    if (commitFiles.value.length === 1) {
      await selectFile(commitFiles.value[0].path)
    }
  } catch (error: any) {
    console.error('加载提交文件失败:', error.message)
    commitFiles.value = []
  } finally {
    isLoadingFiles.value = false
  }
}

// 选择文件查看diff
const selectFile = async (filePath: string) => {
  if (!selectedCommit.value) return
  
  selectedFile.value = filePath
  isLoadingDiff.value = true
  
  try {
    fileDiff.value = await gitStore.getCommitDiff(selectedCommit.value.hash, filePath)
  } catch (error: any) {
    console.error('加载文件diff失败:', error.message)
    fileDiff.value = ''
  } finally {
    isLoadingDiff.value = false
  }
}

// 查看完整diff
const viewFullDiff = async () => {
  if (!selectedCommit.value) return
  
  selectedFile.value = ''
  isLoadingDiff.value = true
  
  try {
    fileDiff.value = await gitStore.getCommitDiff(selectedCommit.value.hash)
  } catch (error: any) {
    console.error('加载完整diff失败:', error.message)
    fileDiff.value = ''
  } finally {
    isLoadingDiff.value = false
  }
}

// 获取文件状态图标
const getFileStatusIcon = (status: string) => {
  switch (status) {
    case 'added':
      return '+'
    case 'modified':
      return 'M'
    case 'deleted':
      return '-'
    case 'renamed':
      return 'R'
    default:
      return '?'
  }
}

// 获取文件状态颜色
const getFileStatusColor = (status: string) => {
  switch (status) {
    case 'added':
      return '#3fb950'
    case 'modified':
      return '#d29922'
    case 'deleted':
      return '#f85149'
    case 'renamed':
      return '#a371f7'
    default:
      return '#8b949e'
  }
}

// 复制提交哈希
const copyHash = (hash: string) => {
  navigator.clipboard.writeText(hash)
}

// 获取分支标签
const getBranchRefs = (refs: string[]) => {
  if (!refs || refs.length === 0) return []
  return refs.filter(ref => !ref.startsWith('tag:'))
}

// 获取标签
const getTags = (refs: string[]) => {
  if (!refs || refs.length === 0) return []
  return refs.filter(ref => ref.startsWith('tag:')).map(ref => ref.replace('tag: ', ''))
}

// 计算属性
const commits = computed(() => gitStore.commitsWithGraph || [])

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="git-history-container">
    <!-- 未选中提交时：只显示完整的提交历史 -->
    <div v-if="!selectedCommit" class="git-history-full">
      <!-- 工具栏 -->
      <div class="history-toolbar">
        <button class="toolbar-button" @click="loadHistory" :disabled="isLoading">
          <svg viewBox="0 0 16 16" fill="currentColor" :class="{ 'rotating': isLoading }">
            <path d="M13.5 2.5a.5.5 0 0 0-1 0v3.248L10.12 3.37A5.013 5.013 0 0 0 8 3a5 5 0 1 0 4.63 6.87.5.5 0 1 0-.92-.38A4 4 0 1 1 8 4c.63 0 1.23.13 1.77.37L7.5 6.647V3.5a.5.5 0 0 0-1 0v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1H7.752l2.558-2.558c.26.37.49.77.66 1.208l.04.11V2.5z"/>
          </svg>
          刷新
        </button>
        <div class="commit-count">
          {{ commits.length }} 个提交
        </div>
      </div>

      <!-- 提交列表 -->
      <div class="commit-list-container">
        <div v-if="isLoading" class="loading">
          <svg class="loading-icon rotating" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z"/>
            <path d="M8 1a7 7 0 0 1 0 14" opacity="0.3"/>
          </svg>
          <span>加载历史记录...</span>
        </div>

        <div v-else-if="commits.length === 0" class="no-commits">
          <svg class="no-commits-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          <p>暂无提交记录</p>
        </div>

        <div v-else class="commit-list">
          <!-- 图形列 -->
          <div class="graph-column">
            <GitGraph 
              :commits="commits" 
              :selected-commit="selectedCommit"
              :width="80"
              @select="selectCommit"
            />
          </div>
          
          <!-- 提交信息列 -->
          <div class="commits-column">
            <div 
              v-for="(commit, index) in commits" 
              :key="commit.hash"
              class="commit-item"
              :class="{ selected: selectedCommit?.hash === commit.hash }"
              @click="selectCommit(commit)"
            >
              <div class="commit-row">
                <!-- 哈希 -->
                <span class="commit-hash" @click.stop="copyHash(commit.hash)" title="点击复制">
                  {{ formatHash(commit.hash) }}
                </span>
                
                <!-- 分支标签 -->
                <div v-if="commit.refs && commit.refs.length > 0" class="commit-refs">
                  <span 
                    v-for="ref in getBranchRefs(commit.refs)" 
                    :key="ref"
                    class="ref-badge branch"
                  >
                    {{ ref }}
                  </span>
                  <span 
                    v-for="tag in getTags(commit.refs)" 
                    :key="tag"
                    class="ref-badge tag"
                  >
                    {{ tag }}
                  </span>
                </div>
                
                <!-- 提交消息 -->
                <span class="commit-message">{{ commit.message }}</span>
                
                <!-- 作者 -->
                <span class="commit-author">{{ commit.author }}</span>
                
                <!-- 日期 -->
                <span class="commit-date" :title="commit.date">{{ formatDate(commit.date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 选中提交后：显示分割布局 -->
    <ResizableVerticalLayout
      v-else
      :initial-top-height="50"
      :min-top-height="30"
      :max-top-height="70"
    >
      <!-- 上部分：Git历史记录 -->
      <template #top>
        <div class="git-history">
          <!-- 工具栏 -->
          <div class="history-toolbar">
            <button class="toolbar-button" @click="loadHistory" :disabled="isLoading">
              <svg viewBox="0 0 16 16" fill="currentColor" :class="{ 'rotating': isLoading }">
                <path d="M13.5 2.5a.5.5 0 0 0-1 0v3.248L10.12 3.37A5.013 5.013 0 0 0 8 3a5 5 0 1 0 4.63 6.87.5.5 0 1 0-.92-.38A4 4 0 1 1 8 4c.63 0 1.23.13 1.77.37L7.5 6.647V3.5a.5.5 0 0 0-1 0v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1H7.752l2.558-2.558c.26.37.49.77.66 1.208l.04.11V2.5z"/>
              </svg>
              刷新
            </button>
            <div class="commit-count">
              {{ commits.length }} 个提交
            </div>
          </div>

          <!-- 提交列表 -->
          <div class="commit-list-container">
            <div v-if="isLoading" class="loading">
              <svg class="loading-icon rotating" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z"/>
                <path d="M8 1a7 7 0 0 1 0 14" opacity="0.3"/>
              </svg>
              <span>加载历史记录...</span>
            </div>

            <div v-else-if="commits.length === 0" class="no-commits">
              <svg class="no-commits-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
              <p>暂无提交记录</p>
            </div>

            <div v-else class="commit-list">
              <!-- 图形列 -->
              <div class="graph-column">
                <GitGraph 
                  :commits="commits" 
                  :selected-commit="selectedCommit"
                  :width="80"
                  @select="selectCommit"
                />
              </div>
              
              <!-- 提交信息列 -->
              <div class="commits-column">
                <div 
                  v-for="(commit, index) in commits" 
                  :key="commit.hash"
                  class="commit-item"
                  :class="{ selected: selectedCommit?.hash === commit.hash }"
                  @click="selectCommit(commit)"
                >
                  <div class="commit-row">
                    <!-- 哈希 -->
                    <span class="commit-hash" @click.stop="copyHash(commit.hash)" title="点击复制">
                      {{ formatHash(commit.hash) }}
                    </span>
                    
                    <!-- 分支标签 -->
                    <div v-if="commit.refs && commit.refs.length > 0" class="commit-refs">
                      <span 
                        v-for="ref in getBranchRefs(commit.refs)" 
                        :key="ref"
                        class="ref-badge branch"
                      >
                        {{ ref }}
                      </span>
                      <span 
                        v-for="tag in getTags(commit.refs)" 
                        :key="tag"
                        class="ref-badge tag"
                      >
                        {{ tag }}
                      </span>
                    </div>
                    
                    <!-- 提交消息 -->
                    <span class="commit-message">{{ commit.message }}</span>
                    
                    <!-- 作者 -->
                    <span class="commit-author">{{ commit.author }}</span>
                    
                    <!-- 日期 -->
                    <span class="commit-date" :title="commit.date">{{ formatDate(commit.date) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- 下部分：文件列表和Diff -->
      <template #bottom>
        <div class="bottom-panel">
          <!-- 未选中文件时：文件列表占满宽度 -->
          <div v-if="!selectedFile && !fileDiff" class="file-list-section-full">
            <!-- 文件列表头部 -->
            <div class="file-list-header">
              <span class="commit-message-title">{{ selectedCommit?.message }}</span>
              <div class="file-list-actions">
                <span class="file-count">{{ commitFiles.length }} 个文件</span>
                <button class="view-all-button" @click="viewFullDiff" title="查看完整diff">
                  全部
                </button>
              </div>
            </div>
            
            <!-- 文件列表内容 -->
            <div class="file-list-container">
              <div v-if="isLoadingFiles" class="loading-files">
                <svg class="loading-icon rotating" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z"/>
                  <path d="M8 1a7 7 0 0 1 0 14" opacity="0.3"/>
                </svg>
                <span>加载文件...</span>
              </div>
              <div v-else class="file-list">
                <div 
                  v-for="file in commitFiles" 
                  :key="file.path" 
                  class="file-item"
                  :class="{ selected: selectedFile === file.path }"
                  @click="selectFile(file.path)"
                >
                  <span class="file-status" :style="{ color: getFileStatusColor(file.status) }">
                    {{ getFileStatusIcon(file.status) }}
                  </span>
                  <span class="file-path">{{ file.path }}</span>
                  <div class="file-stats">
                    <span v-if="file.additions > 0" class="additions">+{{ file.additions }}</span>
                    <span v-if="file.deletions > 0" class="deletions">-{{ file.deletions }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 选中文件后：显示分割面板 -->
          <ResizablePanel
            v-else
            :initial-side-width="600"
            :min-side-width="100"
            :max-side-width="-1"
            :default-width="600"
            storage-key="git-history-panel-width"
            :divider-width="4"
          >
            <!-- 主栏：文件列表 -->
            <template #main>
              <div class="file-list-section">
                <!-- 文件列表头部 -->
                <div class="file-list-header">
                  <span class="commit-message-title">{{ selectedCommit?.message }}</span>
                  <div class="file-list-actions">
                    <span class="file-count">{{ commitFiles.length }} 个文件</span>
                    <button class="view-all-button" @click="viewFullDiff" title="查看完整diff">
                      全部
                    </button>
                  </div>
                </div>
                
                <!-- 文件列表内容 -->
                <div class="file-list-container">
                  <div v-if="isLoadingFiles" class="loading-files">
                    <svg class="loading-icon rotating" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z"/>
                      <path d="M8 1a7 7 0 0 1 0 14" opacity="0.3"/>
                    </svg>
                    <span>加载文件...</span>
                  </div>
                  <div v-else class="file-list">
                    <div 
                      v-for="file in commitFiles" 
                      :key="file.path" 
                      class="file-item"
                      :class="{ selected: selectedFile === file.path }"
                      @click="selectFile(file.path)"
                    >
                      <span class="file-status" :style="{ color: getFileStatusColor(file.status) }">
                        {{ getFileStatusIcon(file.status) }}
                      </span>
                      <span class="file-path">{{ file.path }}</span>
                      <div class="file-stats">
                        <span v-if="file.additions > 0" class="additions">+{{ file.additions }}</span>
                        <span v-if="file.deletions > 0" class="deletions">-{{ file.deletions }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- 侧栏：Diff内容 -->
            <template #side>
              <div class="diff-section">
                <div class="diff-header">
                  <span v-if="selectedFile" class="diff-file-path">{{ selectedFile }}</span>
                  <span v-else class="diff-file-path">全部更改</span>
                </div>
                <div class="diff-content">
                  <GitDiffViewer 
                    :diff="fileDiff" 
                    :file-path="selectedFile"
                    :loading="isLoadingDiff"
                  />
                </div>
              </div>
            </template>
          </ResizablePanel>
        </div>
      </template>
    </ResizableVerticalLayout>
  </div>
</template>

<style scoped>
.git-history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #181818;
}

.git-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #181818;
}

.git-history-full {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #181818;
}

.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #2d2d30;
  background: #212121;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid #2d2d30;
  border-radius: 4px;
  background: #181818;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: #464647;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-button svg {
  width: 14px;
  height: 14px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.commit-count {
  font-size: 12px;
  color: #969696;
}

.commit-list-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
}

.loading-icon {
  width: 32px;
  height: 32px;
  color: #808080;
}

.loading span {
  font-size: 13px;
  color: #969696;
}

.no-commits {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.no-commits-icon {
  width: 48px;
  height: 48px;
  color: #808080;
  margin-bottom: 16px;
}

.no-commits p {
  font-size: 14px;
  color: #969696;
  margin: 0;
}

.commit-list {
  display: flex;
  height: 100%;
}

.graph-column {
  width: 80px;
  flex-shrink: 0;
  border-right: 1px solid #2d2d30;
  overflow-y: hidden;
}

.commits-column {
  flex: 1;
  overflow-y: auto;
}

.commit-item {
  padding: 0;
  border-bottom: 1px solid #2d2d30;
  cursor: pointer;
  transition: background 0.2s;
  height: 24px;
  display: flex;
  align-items: center;
}

.commit-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.commit-item.selected {
  background: rgba(0, 122, 204, 0.2);
}

.commit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-size: 12px;
  width: 100%;
  height: 24px;
}

.commit-hash {
  font-family: monospace;
  color: #007acc;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.commit-hash:hover {
  background: rgba(255, 255, 255, 0.05);
  text-decoration: underline;
}

.commit-refs {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.ref-badge {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.ref-badge.branch {
  background: rgba(0, 122, 204, 0.2);
  color: #58a6ff;
  border: 1px solid rgba(0, 122, 204, 0.4);
}

.ref-badge.tag {
  background: rgba(163, 113, 247, 0.2);
  color: #a371f7;
  border: 1px solid rgba(163, 113, 247, 0.4);
}

.commit-message {
  flex: 1;
  color: #cccccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-author {
  color: #969696;
  flex-shrink: 0;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-date {
  color: #969696;
  font-size: 11px;
  flex-shrink: 0;
  min-width: 200px;
  text-align: right;
  white-space: nowrap;
}

/* 底部面板 */
.bottom-panel {
  height: 100%;
  background: #1e1e1e;
}

/* 覆盖 ResizablePanel 的样式 */
.bottom-panel :deep(.resizable-panel-container) {
  background: #1e1e1e;
}

.bottom-panel :deep(.main-content) {
  background: #1e1e1e;
  border-radius: 0;
}

.bottom-panel :deep(.side-panel) {
  background: #1e1e1e;
  border-radius: 0;
}

.bottom-panel :deep(.resize-handle) {
  width: 4px;
  background-color: #2d2d30;
}

.bottom-panel :deep(.resize-handle:hover) {
  background-color: #3e3e42;
}

.bottom-panel :deep(.resize-handle.resizing) {
  background-color: #007acc;
}

.bottom-panel :deep(.resize-line) {
  display: none;
}

/* 文件列表部分 */
.file-list-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.file-list-section-full {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.file-list-header {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #252526;
  border-bottom: 1px solid #2d2d30;
  gap: 8px;
}

.commit-message-title {
  font-size: 13px;
  color: #cccccc;
  font-weight: 600;
  word-break: break-all;
}

.file-list-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.file-count {
  color: #969696;
  font-size: 12px;
}

.view-all-button {
  padding: 2px 8px;
  background: transparent;
  border: 1px solid #2d2d30;
  border-radius: 3px;
  color: #969696;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-all-button:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #464647;
  color: #cccccc;
}

.file-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.loading-files {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 12px;
  color: #969696;
  font-size: 12px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #252526;
  border: 1px solid #2d2d30;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #464647;
}

.file-item.selected {
  background: rgba(0, 122, 204, 0.2);
  border-color: #007acc;
}

.file-path {
  flex: 1;
  color: #cccccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-status {
  font-family: monospace;
  font-weight: bold;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.file-stats {
  display: flex;
  gap: 4px;
  font-family: monospace;
  font-size: 10px;
}

.additions {
  color: #3fb950;
}

.deletions {
  color: #f85149;
}

/* Diff显示部分 */
.diff-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.diff-header {
  padding: 12px;
  background: #252526;
  border-bottom: 1px solid #2d2d30;
}

.diff-file-path {
  font-size: 13px;
  color: #cccccc;
  font-weight: 600;
}

.diff-content {
  flex: 1;
  overflow: hidden;
}

</style>