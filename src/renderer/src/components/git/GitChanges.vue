<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGitStore } from '../../stores/gitStore'
import ConfirmDialog from '../common/ConfirmDialog.vue'

const emit = defineEmits<{
  openDiff: [file: string]
}>()

const gitStore = useGitStore()
const expandedGroups = ref<Set<string>>(new Set(['staged', 'changes']))

// 弹窗状态
const discardDialog = ref({
  visible: false,
  file: '',
  isAll: false
})

// 文件状态图标
const getFileIcon = (status: string) => {
  switch (status) {
    case 'M': return { icon: 'M', color: '#e2c08d', title: '已修改' }
    case 'A': return { icon: 'A', color: '#73c991', title: '已添加' }
    case 'D': return { icon: 'D', color: '#f14c4c', title: '已删除' }
    case 'R': return { icon: 'R', color: '#73c991', title: '已重命名' }
    case 'C': return { icon: 'C', color: '#f14c4c', title: '冲突' }
    case 'U': return { icon: 'U', color: '#cccccc', title: '未跟踪' }
    default: return { icon: '?', color: '#cccccc', title: '未知' }
  }
}

// 展开/折叠组
const toggleGroup = (group: string) => {
  if (expandedGroups.value.has(group)) {
    expandedGroups.value.delete(group)
  } else {
    expandedGroups.value.add(group)
  }
}

// 暂存文件
const stageFile = async (file: string) => {
  try {
    await gitStore.stageFiles([file])
  } catch (error: any) {
    console.error('暂存失败:', error.message)
  }
}

// 取消暂存文件
const unstageFile = async (file: string) => {
  try {
    await gitStore.unstageFiles([file])
  } catch (error: any) {
    console.error('取消暂存失败:', error.message)
  }
}

// 暂存所有文件
const stageAll = async () => {
  try {
    await gitStore.stageAll()
  } catch (error: any) {
    console.error('暂存失败:', error.message)
  }
}

// 取消暂存所有文件
const unstageAll = async () => {
  try {
    await gitStore.unstageAll()
  } catch (error: any) {
    console.error('取消暂存失败:', error.message)
  }
}

// 显示放弃更改弹窗
const showDiscardDialog = (file: string, isAll = false) => {
  discardDialog.value = {
    visible: true,
    file,
    isAll
  }
}

// 确认放弃更改
const confirmDiscard = async () => {
  try {
    if (discardDialog.value.isAll) {
      await gitStore.discardAllChanges()
    } else {
      await gitStore.discardChanges([discardDialog.value.file])
    }
  } catch (error: any) {
    console.error('放弃更改失败:', error.message)
  } finally {
    discardDialog.value.visible = false
  }
}

// 取消放弃更改
const cancelDiscard = () => {
  discardDialog.value.visible = false
}


// 计算属性
const stagedFiles = computed(() => gitStore.status?.staged || [])
const modifiedFiles = computed(() => gitStore.status?.modified || [])
const addedFiles = computed(() => gitStore.status?.added || [])
const deletedFiles = computed(() => gitStore.status?.deleted || [])
const conflictedFiles = computed(() => gitStore.status?.conflicted || [])

const allChangedFiles = computed(() => {
  const files = new Map<string, string>()
  
  modifiedFiles.value.forEach(f => files.set(f, 'M'))
  addedFiles.value.forEach(f => files.set(f, 'A'))
  deletedFiles.value.forEach(f => files.set(f, 'D'))
  conflictedFiles.value.forEach(f => files.set(f, 'C'))
  
  return Array.from(files.entries()).map(([file, status]) => ({ file, status }))
})
</script>

<template>
  <div class="git-changes">
    <!-- 暂存的更改 -->
    <div v-if="stagedFiles.length > 0" class="changes-group">
      <div class="group-header" @click="toggleGroup('staged')">
        <svg 
          class="expand-icon" 
          :class="{ expanded: expandedGroups.has('staged') }"
          viewBox="0 0 16 16" 
          fill="currentColor"
        >
          <path d="M6 2l6 6-6 6V2z"/>
        </svg>
        <span class="group-title">暂存的更改</span>
        <span class="group-count">{{ stagedFiles.length }}</span>
        <button 
          class="group-action"
          @click.stop="unstageAll"
          title="取消暂存所有"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
          </svg>
        </button>
      </div>
      
      <div v-if="expandedGroups.has('staged')" class="file-list">
        <div 
          v-for="file in stagedFiles" 
          :key="file"
          class="file-item"
        >
          <div class="file-info" @click="emit('openDiff', file)">
            <span 
              class="file-status"
              :style="{ color: getFileIcon('M').color }"
              :title="getFileIcon('M').title"
            >
              {{ getFileIcon('M').icon }}
            </span>
            <span class="file-name">{{ file }}</span>
          </div>
          <div class="file-actions">
            <button 
              class="file-action"
              @click="unstageFile(file)"
              title="取消暂存"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 更改 -->
    <div v-if="allChangedFiles.length > 0" class="changes-group">
      <div class="group-header" @click="toggleGroup('changes')">
        <svg 
          class="expand-icon" 
          :class="{ expanded: expandedGroups.has('changes') }"
          viewBox="0 0 16 16" 
          fill="currentColor"
        >
          <path d="M6 2l6 6-6 6V2z"/>
        </svg>
        <span class="group-title">更改</span>
        <span class="group-count">{{ allChangedFiles.length }}</span>
        <div class="group-actions">
          <button 
            class="group-action"
            @click.stop="stageAll"
            title="暂存所有"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
          </button>
          <button 
            class="group-action"
            @click.stop="showDiscardDialog('', true)"
            title="放弃所有更改"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 1 0-1.492.15l.66 6.6A1.75 1.75 0 0 0 5.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 0 0-1.492-.149l-.66 6.6a.25.25 0 0 1-.249.225h-5.19a.25.25 0 0 1-.249-.225l-.66-6.6z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div v-if="expandedGroups.has('changes')" class="file-list">
        <div 
          v-for="{ file, status } in allChangedFiles" 
          :key="file"
          class="file-item"
        >
          <div class="file-info" @click="emit('openDiff', file)">
            <span 
              class="file-status"
              :style="{ color: getFileIcon(status).color }"
              :title="getFileIcon(status).title"
            >
              {{ getFileIcon(status).icon }}
            </span>
            <span class="file-name">{{ file }}</span>
          </div>
          <div class="file-actions">
            <button 
              class="file-action"
              @click="stageFile(file)"
              title="暂存"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            </button>
            <button 
              class="file-action"
              @click="showDiscardDialog(file)"
              title="放弃更改"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 1 0-1.492.15l.66 6.6A1.75 1.75 0 0 0 5.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 0 0-1.492-.149l-.66 6.6a.25.25 0 0 1-.249.225h-5.19a.25.25 0 0 1-.249-.225l-.66-6.6z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 无更改提示 -->
    <div v-if="!stagedFiles.length && !allChangedFiles.length" class="no-changes">
      <svg class="no-changes-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <p>没有更改</p>
      <span>您的分支已是最新状态</span>
    </div>
  </div>

  <!-- 放弃更改确认弹窗 -->
  <ConfirmDialog
    :visible="discardDialog.visible"
    :title="discardDialog.isAll ? '放弃所有更改' : '放弃更改'"
    :message="discardDialog.isAll ? 
      '确定要放弃所有更改吗？<br><span class=&quot;warning-text&quot;>此操作将撤销所有未提交的修改，且无法恢复</span>' :
      `确定要放弃 <strong>${discardDialog.file}</strong> 的更改吗？<br><span class='warning-text'>此操作将撤销该文件的所有修改，且无法恢复</span>`"
    type="warning"
    confirm-text="放弃更改"
    cancel-text="取消"
    confirm-button-type="danger"
    @confirm="confirmDiscard"
    @cancel="cancelDiscard"
  />
</template>

<style scoped>
.git-changes {
  flex: 1;
  overflow-y: auto;
  background: #181818;
}

.changes-group {
  border-bottom: 1px solid #2d2d30;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  background: #212121;
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.expand-icon {
  width: 12px;
  height: 12px;
  margin-right: 6px;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.group-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #cccccc;
}

.group-count {
  background: #808080;
  color: #1e1e1e;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 8px;
}

.group-actions {
  display: flex;
  gap: 4px;
}

.group-action {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.group-action:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.group-action svg {
  width: 14px;
  height: 14px;
}

.file-list {
  background: #1a1a1a;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 24px;
  font-size: 13px;
  cursor: pointer;
  color: #cccccc;
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-status {
  font-weight: 600;
  font-family: monospace;
  width: 16px;
  text-align: center;
}

.file-name {
  color: #cccccc;
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.file-action {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.file-action:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.file-action svg {
  width: 14px;
  height: 14px;
}

.no-changes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.no-changes-icon {
  width: 48px;
  height: 48px;
  color: #73c991;
  margin-bottom: 16px;
}

.no-changes p {
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
  margin: 0 0 8px 0;
}

.no-changes span {
  font-size: 12px;
  color: #969696;
}

</style>