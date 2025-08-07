<template>
  <div class="title-bar">
    <!-- 应用图标和菜单 -->
    <div class="app-menu" @mouseenter="showMenu = true" @mouseleave="showMenu = false">
      <div class="app-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" fill="currentColor" />
          <rect x="14" y="3" width="7" height="7" fill="currentColor" />
          <rect x="3" y="14" width="7" height="7" fill="currentColor" />
          <rect x="14" y="14" width="7" height="7" fill="currentColor" />
        </svg>
      </div>
      <transition name="menu-slide">
        <div class="dropdown-menu" v-show="showMenu">
          <div class="menu-group">
            <div class="menu-title">项目</div>
            <div class="menu-item" @click="selectDirectory">
              <el-icon><FolderOpened /></el-icon>
              <span>选择目录</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-group">
            <div class="menu-title">需求</div>
            <div class="menu-item" @click="handleAction('requirement', 'create')">
              <el-icon><DocumentAdd /></el-icon>
              <span>新建需求文档</span>
            </div>
            <div class="menu-item" @click="handleAction('requirement', 'update')">
              <el-icon><Edit /></el-icon>
              <span>更新需求文档</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-group">
            <div class="menu-title">设计</div>
            <div class="menu-item" @click="handleAction('design', 'create')">
              <el-icon><DocumentAdd /></el-icon>
              <span>新建设计文档</span>
            </div>
            <div class="menu-item" @click="handleAction('design', 'update')">
              <el-icon><Edit /></el-icon>
              <span>更新设计文档</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-group">
            <div class="menu-title">任务</div>
            <div class="menu-item" @click="handleAction('task', 'create')">
              <el-icon><DocumentAdd /></el-icon>
              <span>新建任务清单</span>
            </div>
            <div class="menu-item" @click="handleAction('task', 'update')">
              <el-icon><Edit /></el-icon>
              <span>更新任务清单</span>
            </div>
            <div class="menu-item" @click="handleAction('task', 'execute')">
              <el-icon><VideoPlay /></el-icon>
              <span>执行任务清单</span>
            </div>
          </div>
          
          <div class="menu-divider"></div>
          
          <div class="menu-group">
            <div class="menu-title">帮助</div>
            <div class="menu-item" @click="showAbout">
              <el-icon><InfoFilled /></el-icon>
              <span>关于</span>
            </div>
            <div class="menu-item" @click="toggleTheme">
              <el-icon><Sunny /></el-icon>
              <span>{{ isDark ? '浅色主题' : '深色主题' }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 终端标签区域 -->
    <div class="terminal-tabs-container">
      <div class="terminal-tabs">
        <div
          v-for="(terminal, index) in terminals"
          :key="terminal.id"
          :class="['terminal-tab', { active: activeTerminalId === terminal.id }]"
          @click="switchTerminal(terminal.id)"
        >
          <span>{{ terminal.label || `终端 ${index + 1}` }}</span>
          <el-icon
            v-if="terminals.length > 1"
            class="tab-close"
            @click.stop="closeTerminal(terminal.id)"
          >
            <Close />
          </el-icon>
        </div>
        <!-- 新建终端按钮组 -->
        <div class="new-terminal-group">
          <button class="new-terminal-button" @click="createNewTerminal('bash')" title="新建终端">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="terminal-type-selector" @click="toggleTerminalMenu" title="选择终端类型">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <!-- 终端类型下拉菜单 -->
          <transition name="menu-slide">
            <div class="terminal-type-menu" v-show="showTerminalMenu">
              <div class="menu-option" @click="createNewTerminal('bash')">
                <span class="terminal-icon">$</span>
                <span>Bash</span>
              </div>
              <div class="menu-option" @click="createNewTerminal('powershell')" v-if="isWindows">
                <span class="terminal-icon">PS</span>
                <span>PowerShell</span>
              </div>
              <div class="menu-option" @click="createNewTerminal('cmd')" v-if="isWindows">
                <span class="terminal-icon">></span>
                <span>Command Prompt</span>
              </div>
              <div class="menu-option" @click="createNewTerminal('zsh')" v-if="!isWindows">
                <span class="terminal-icon">%</span>
                <span>Zsh</span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 可拖拽区域 -->
    <div class="title-bar-drag-region"></div>

    <!-- 窗口控制按钮 -->
    <div class="title-bar-controls">
      <button class="title-bar-button minimize" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="6" width="8" height="1" fill="currentColor" />
        </svg>
      </button>
      <button class="title-bar-button maximize" @click="maximize" :title="isMaximized ? '还原' : '最大化'">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="3" width="6" height="6" stroke="currentColor" stroke-width="1" fill="none" />
          <rect x="4" y="2" width="6" height="6" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
      </button>
      <button class="title-bar-button close" @click="close" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  FolderOpened, 
  DocumentAdd, 
  Edit, 
  VideoPlay, 
  InfoFilled, 
  Sunny,
  Close
} from '@element-plus/icons-vue'

const props = defineProps<{
  isDark?: boolean
  terminals?: Array<{ id: string; label?: string }>
  activeTerminalId?: string
}>()

const emit = defineEmits<{
  (e: 'menu-action', type: string, action: string): void
  (e: 'directory-selected', path: string): void
  (e: 'theme-toggle'): void
  (e: 'create-terminal', type: string): void
  (e: 'switch-terminal', id: string): void
  (e: 'close-terminal', id: string): void
}>()

const isMaximized = ref(false)
const showMenu = ref(false)
const showTerminalMenu = ref(false)
const terminals = ref<Array<{ id: string; label?: string }>>(props.terminals || [])
const activeTerminalId = ref(props.activeTerminalId || '')
const isWindows = ref(false)

// 监听 props 变化
watch(() => props.terminals, (newTerminals) => {
  terminals.value = newTerminals || []
})

watch(() => props.activeTerminalId, (newId) => {
  activeTerminalId.value = newId || ''
})

const handleAction = (type: string, action: string) => {
  showMenu.value = false
  emit('menu-action', type, action)
}

const selectDirectory = async () => {
  showMenu.value = false
  const result = await window.api?.dialog?.openDirectory()
  if (result && !result.canceled && result.filePaths.length > 0) {
    emit('directory-selected', result.filePaths[0])
    ElMessage.success(`已选择目录: ${result.filePaths[0]}`)
  }
}

const showAbout = () => {
  showMenu.value = false
  ElMessageBox.alert(
    '这是一个基于 Electron + Vue 的桌面应用程序',
    '关于',
    {
      confirmButtonText: '确定',
    }
  )
}

const toggleTheme = () => {
  showMenu.value = false
  emit('theme-toggle')
  ElMessage.success(`已切换至${props.isDark ? '浅色' : '深色'}主题`)
}

const createNewTerminal = (type: string) => {
  showTerminalMenu.value = false
  emit('create-terminal', type)
}

const toggleTerminalMenu = () => {
  showTerminalMenu.value = !showTerminalMenu.value
}

const switchTerminal = (id: string) => {
  emit('switch-terminal', id)
}

const closeTerminal = (id: string) => {
  emit('close-terminal', id)
}

const minimize = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.minimize()
  }
}

const maximize = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.maximize()
  }
}

const close = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.close()
  }
}

const updateMaximizeState = async () => {
  if (window.api?.windowControls) {
    isMaximized.value = await window.api.windowControls.isMaximized()
  }
}

onMounted(async () => {
  if (window.api?.windowControls) {
    await updateMaximizeState()
    
    window.api.windowControls.onMaximizedChange((maximized: boolean) => {
      isMaximized.value = maximized
    })
  }
  
  // 检测操作系统
  const platform = navigator.platform.toLowerCase()
  isWindows.value = platform.includes('win')
})

onUnmounted(() => {
  if (window.api?.windowControls?.removeMaximizedListener) {
    window.api.windowControls.removeMaximizedListener()
  }
})
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 32px;
  background-color: var(--titlebar-bg, #f0f0f0);
  border-bottom: 1px solid var(--titlebar-border, #d0d0d0);
  user-select: none;
  transition: background-color 0.3s, border-color 0.3s;
}

/* 应用菜单 */
.app-menu {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

.app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.app-icon:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

/* 下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 220px;
  max-height: 70vh;
  overflow-y: auto;
  background: var(--bg-secondary, #fff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.menu-group {
  padding: 4px 0;
}

.menu-title {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.menu-divider {
  height: 1px;
  margin: 4px 0;
  background-color: var(--border-primary, #e0e0e0);
}

/* 终端标签容器 */
.terminal-tabs-container {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.terminal-tabs {
  display: flex;
  align-items: center;
  height: 100%;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 100%;
  font-size: 13px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  border-right: 1px solid var(--border-primary, #e0e0e0);
  transition: background-color 0.2s, color 0.2s;
}

.terminal-tab:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.terminal-tab.active {
  color: var(--text-primary, #333);
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.03));
}

.tab-close {
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.tab-close:hover {
  opacity: 1;
}

/* 新建终端按钮组 */
.new-terminal-group {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: 4px;
  -webkit-app-region: no-drag;
}

.new-terminal-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px 0 0 4px;
  background: transparent;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.new-terminal-button:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.terminal-type-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 28px;
  border: none;
  border-left: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 0 4px 4px 0;
  background: transparent;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.terminal-type-selector:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

/* 终端类型菜单 */
.terminal-type-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 160px;
  margin-top: 2px;
  background: var(--bg-secondary, #fff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.terminal-type-menu .menu-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: background-color 0.2s;
}

.terminal-type-menu .menu-option:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.terminal-type-menu .menu-option:first-child {
  border-radius: 4px 4px 0 0;
}

.terminal-type-menu .menu-option:last-child {
  border-radius: 0 0 4px 4px;
}

.terminal-icon {
  display: inline-block;
  width: 20px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: bold;
  color: var(--text-secondary, #666);
}

/* 拖拽区域 */
.title-bar-drag-region {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

/* 窗口控制按钮 */
.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.title-bar-button {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #333);
  transition: background-color 0.1s ease;
}

.title-bar-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.title-bar-button.close:hover {
  background-color: #e81123;
  color: white;
}

.title-bar-button:active {
  background-color: rgba(0, 0, 0, 0.2);
}

.title-bar-button.close:active {
  background-color: #c50e1f;
}

/* 菜单动画 */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>