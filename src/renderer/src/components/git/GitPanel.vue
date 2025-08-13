<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import GitChanges from './GitChanges.vue'
import GitCommit from './GitCommit.vue'
import GitBranch from './GitBranch.vue'
import { useGitStore } from '../../stores/gitStore'

const emit = defineEmits<{
  close: []
  openDiff: [file: string]
  selectFile: [file: string, diff: string]
}>()

const gitStore = useGitStore()
const isRefreshing = ref(false)
const selectedFile = ref<string>('')
const selectedFileDiff = ref<string>('')

// 监听Git状态变化
onMounted(() => {
  gitStore.initialize()
})

onUnmounted(() => {
  gitStore.dispose()
})

// 刷新状态
const refresh = async () => {
  isRefreshing.value = true
  try {
    await gitStore.refresh()
  } catch (error) {
    console.error('刷新Git状态失败', error)
  } finally {
    isRefreshing.value = false
  }
}

// 同步远程
const sync = async () => {
  try {
    await gitStore.sync()
  } catch (error: any) {
    console.error('同步失败:', error.message)
  }
}

// 处理文件点击，获取diff
const handleFileClick = async (file: string, isStaged: boolean) => {
  try {
    selectedFile.value = file
    // 根据文件状态获取对应的diff
    const diff = isStaged 
      ? await gitStore.getStagedDiff(file)  // 暂存文件使用getStagedDiff
      : await gitStore.getDiff(file)         // 未暂存文件使用getDiff
    selectedFileDiff.value = diff
    // 发送事件给父组件
    emit('selectFile', file, diff)
  } catch (error: any) {
    console.error('获取文件diff失败:', error.message)
    selectedFileDiff.value = ''
  }
}

// 计算属性
const hasChanges = computed(() => {
  return gitStore.status && !gitStore.status.isClean
})

const changedFilesCount = computed(() => {
  if (!gitStore.status) return 0
  return gitStore.status.modified.length + 
         gitStore.status.added.length + 
         gitStore.status.deleted.length
})

const isRepoInitialized = computed(() => gitStore.isInitialized)
</script>

<template>
  <div class="git-panel">
    <!-- 标题栏 -->
    <div class="git-header">
      <div class="git-title">
        <svg class="git-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 3a3 3 0 0 0-3 3c0 1.28.81 2.38 1.94 2.81-.06.46-.09.93-.09 1.4v5.58c0 .46.03.93.09 1.4A3.002 3.002 0 0 0 6 23a3 3 0 0 0 1.06-5.81c.06-.47.09-.94.09-1.4V10c0-1.11.89-2 2-2h6a4 4 0 0 1 4 4v3.79c0 .46.03.93.09 1.4A3.002 3.002 0 0 0 18 23a3 3 0 0 0 0-6c-.46 0-.93.03-1.4.09.06-.47.09-.94.09-1.4V12a6 6 0 0 0-6-6H9c-.46 0-.93-.03-1.4-.09A3.002 3.002 0 0 0 6 3zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0 14a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm12 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
        </svg>
        <span>源代码管理</span>
        <span v-if="changedFilesCount > 0" class="changes-badge">{{ changedFilesCount }}</span>
      </div>
      <div class="git-actions">
        <button 
          class="icon-button" 
          @click="refresh"
          :disabled="isRefreshing"
          title="刷新"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" :class="{ 'rotating': isRefreshing }">
            <path d="M13.65 5.26a.75.75 0 1 0-.3-1.47l-.15.04a6.491 6.491 0 0 0-11.71 3.67c0 1.43.46 2.76 1.25 3.84a.75.75 0 1 0 1.14-.97A4.991 4.991 0 0 1 3 7.5a5 5 0 0 1 8.43-3.62L10 5V7.5a.5.5 0 0 0 .5.5H13l-1.15-1.15a6.456 6.456 0 0 1 1.8-1.59zM2.35 10.74a.75.75 0 1 0 .3 1.47l.15-.04A6.491 6.491 0 0 0 14.5 8.5a6.46 6.46 0 0 0-1.25-3.84.75.75 0 0 0-1.14.97c.49.79.76 1.71.76 2.87a5 5 0 0 1-8.43 3.62L6 11V8.5a.5.5 0 0 0-.5-.5H3l1.15 1.15a6.456 6.456 0 0 1-1.8 1.59z"/>
          </svg>
        </button>
        <button 
          class="icon-button"
          @click="sync"
          :disabled="!hasChanges"
          title="同步更改"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1v6l3-3zm0 14V9l-3 3z"/>
            <path d="M3 8.5A5.5 5.5 0 0 1 8.5 3h.45l-.9-.9a.5.5 0 0 1 .71-.71l1.75 1.75a.5.5 0 0 1 0 .71l-1.75 1.75a.5.5 0 0 1-.71-.71l.9-.9H8.5a4.5 4.5 0 1 0 4.5 4.5.5.5 0 0 1 1 0A5.5 5.5 0 1 1 3 8.5z" opacity="0.7"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 未初始化提示 -->
    <div v-if="!isRepoInitialized" class="git-not-initialized">
      <svg class="warning-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p>当前目录不是Git仓库</p>
      <button class="primary-button" @click="gitStore.initRepo()">
        初始化Git仓库
      </button>
    </div>

    <!-- Git内容区 -->
    <div v-else class="git-content">
      <!-- 分支选择器 -->
      <GitBranch />

      <!-- 更改内容 -->
      <div class="changes-content">
        <!-- 提交区域 -->
        <GitCommit />
        
        <!-- 文件更改列表 -->
        <GitChanges @open-diff="handleFileClick" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.git-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #181818;
  color: #cccccc;
  border-left: 1px solid #2d2d30;
}

.git-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #2d2d30;
  background: #212121;
}

.git-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.git-icon {
  width: 16px;
  height: 16px;
}

.changes-badge {
  background: #007acc;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.git-actions {
  display: flex;
  gap: 4px;
}

.icon-button {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-button svg {
  width: 20px;
  height: 20px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.git-not-initialized {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  background: #181818;
}

.warning-icon {
  width: 48px;
  height: 48px;
  color: #808080;
  margin-bottom: 16px;
}

.git-not-initialized p {
  color: #969696;
  margin-bottom: 24px;
  font-size: 14px;
}

.primary-button {
  background: #007acc;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: #005a9e;
}

.git-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #181818;
}

.changes-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 深色主题 */
.dark .git-panel {
  background: #252526;
  color: #cccccc;
}

.dark .git-header {
  background: #2d2d30;
  border-bottom-color: #3e3e42;
}

.dark .icon-button {
  color: #969696;
}

.dark .icon-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #e1e1e1;
}

</style>