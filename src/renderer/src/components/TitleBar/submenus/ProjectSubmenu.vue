<template>
  <div class="submenu-content">
    <div class="menu-item" @click="selectDirectory">
      <el-icon><FolderOpened /></el-icon>
      <span>选择目录</span>
      <span class="menu-shortcut">Ctrl+O</span>
    </div>
    
    <!-- 最近打开的目录 -->
    <template v-if="recentDirectories.length > 0">
      <div class="menu-divider"></div>
      <div class="menu-section-title">
        <span>最近打开</span>
      </div>
      <div 
        v-for="(dir, index) in recentDirectories"
        :key="index"
        class="menu-item recent-dir"
        @click="switchWorkspace(dir)"
        :title="dir"
      >
        <el-icon><Folder /></el-icon>
        <span class="recent-dir-path">{{ formatPath(dir) }}</span>
        <span class="recent-dir-number">{{ index + 1 }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FolderOpened, Folder } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits<{
  (e: 'directory-selected', path?: string): void
}>()

const recentDirectories = ref<string[]>([])

const selectDirectory = () => {
  // 选择目录时不传路径，让父组件弹出选择框
  emit('directory-selected')
}

const switchWorkspace = async (dirPath: string) => {
  try {
    // 直接切换工作空间 (这会触发 workspace-changed 事件)
    await window.api?.switchWorkspace(dirPath)
    // 传递路径给父组件
    emit('directory-selected', dirPath)
    ElMessage.success(`已切换到工作空间: ${formatPath(dirPath)}`)
    // 刷新最近目录列表
    loadRecentDirectories()
  } catch (error) {
    console.error('Failed to switch workspace:', error)
    ElMessage.error('切换工作空间失败')
  }
}

const formatPath = (path: string) => {
  // 获取路径的最后两个部分
  const parts = path.split(/[\\\/]/)
  if (parts.length <= 2) {
    return path
  }
  return `.../${parts.slice(-2).join('/')}`
}

const loadRecentDirectories = async () => {
  try {
    if (window.api && typeof window.api.getRecentDirectories === 'function') {
      const dirs = await window.api.getRecentDirectories()
      recentDirectories.value = dirs || []
    }
  } catch (error) {
    console.error('Failed to load recent directories:', error)
    recentDirectories.value = []
  }
}

onMounted(() => {
  loadRecentDirectories()
})
</script>

<style scoped>
.submenu-content {
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  font-size: 13px;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: var(--wt-bg-hover);
}

.menu-item > span:nth-child(2) {
  flex: 1;
  white-space: nowrap;
}

.menu-shortcut {
  margin-left: auto;
  padding-left: 20px;
  font-size: 11px;
  color: var(--wt-text-tertiary);
  white-space: nowrap;
  opacity: 0.8;
}

.menu-divider {
  height: 1px;
  background: var(--wt-border);
  margin: 4px 0;
}

.menu-section-title {
  padding: 4px 20px;
  font-size: 11px;
  color: var(--wt-text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.recent-dir {
  position: relative;
  padding-right: 35px;
}

.recent-dir-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-dir-number {
  position: absolute;
  right: 20px;
  font-size: 10px;
  color: var(--wt-text-tertiary);
  font-weight: 500;
  opacity: 0.6;
}
</style>