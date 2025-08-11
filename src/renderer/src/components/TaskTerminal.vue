<template>
  <div class="task-terminal-container" :class="{ 'dark': isDark }">
    <div class="terminal-tabs">
      <div 
        v-for="terminal in terminals"
        :key="terminal.id"
        class="terminal-tab"
        :class="{ 'active': activeTerminalId === terminal.id }"
        @click="switchTerminal(terminal.id)"
      >
        <svg 
          class="tab-icon" 
          :class="getStatusClass(terminal.status)"
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path :d="getStatusIconPath(terminal.status)"/>
        </svg>
        <span class="tab-title">{{ terminal.taskTitle }}</span>
        <button 
          class="tab-close"
          @click.stop="closeTerminal(terminal.id)"
          title="关闭终端"
        >
          ×
        </button>
      </div>
      <div v-if="terminals.length === 0" class="no-terminals">
        暂无运行中的任务终端
      </div>
    </div>
    
    <div class="terminal-content">
      <div 
        v-for="terminal in terminals"
        :key="terminal.id"
        v-show="activeTerminalId === terminal.id"
        :ref="el => setTerminalRef(terminal.id, el)"
        class="terminal-instance"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, inject } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface TaskTerminalInfo {
  id: string
  iterationId: string
  taskId: string
  taskTitle: string
  status: 'running' | 'completed' | 'failed'
  terminal?: Terminal
  fitAddon?: FitAddon
}

const props = defineProps<{
  currentTask?: {
    iterationId: string
    taskId: string
    taskTitle: string
    command?: string
  }
}>()

const emit = defineEmits<{
  terminalCreated: [terminalId: string]
  terminalClosed: [terminalId: string]
}>()

const isDark = inject('isDark', ref(false))

const terminals = ref<TaskTerminalInfo[]>([])
const activeTerminalId = ref<string>('')
const terminalRefs = new Map<string, HTMLElement>()
let resizeObserver: ResizeObserver | null = null

// Windows Terminal 风格主题
const wtTheme = {
  background: '#0c0c0c',
  foreground: '#cccccc',
  cursor: '#ffffff',
  cursorAccent: '#000000',
  black: '#0c0c0c',
  red: '#c50f1f',
  green: '#13a10e',
  yellow: '#c19c00',
  blue: '#0037da',
  magenta: '#881798',
  cyan: '#3a96dd',
  white: '#cccccc',
  brightBlack: '#767676',
  brightRed: '#e74856',
  brightGreen: '#16c60c',
  brightYellow: '#f9f1a5',
  brightBlue: '#3b78ff',
  brightMagenta: '#b4009e',
  brightCyan: '#61d6d6',
  brightWhite: '#f2f2f2',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff'
}

// 设置终端元素引用
const setTerminalRef = (id: string, el: any) => {
  if (el) {
    terminalRefs.set(id, el)
  } else {
    terminalRefs.delete(id)
  }
}

// 创建任务终端
const createTaskTerminal = async (iterationId: string, taskId: string, taskTitle: string, command?: string) => {
  const terminalId = `task-${iterationId}-${taskId}`
  
  // 检查是否已存在
  const existing = terminals.value.find(t => t.id === terminalId)
  if (existing) {
    activeTerminalId.value = terminalId
    return terminalId
  }
  
  // 创建后端终端
  const backendTerminalId = await window.electron.ipcRenderer.invoke(
    'task-terminal:create',
    iterationId,
    taskId,
    taskTitle,
    command || ''
  )
  
  // 创建前端终端
  const terminal = new Terminal({
    fontFamily: '"Cascadia Code", "Cascadia Mono", Consolas, "Courier New", monospace',
    fontSize: 14,
    theme: wtTheme,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000,
    convertEol: true,
    allowTransparency: true,
    fontWeight: 400,
    fontWeightBold: 600,
    letterSpacing: 0,
    lineHeight: 1.2
  })
  
  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())
  
  // 创建终端信息
  const terminalInfo: TaskTerminalInfo = {
    id: terminalId,
    iterationId,
    taskId,
    taskTitle,
    status: 'running',
    terminal,
    fitAddon
  }
  
  terminals.value.push(terminalInfo)
  activeTerminalId.value = terminalId
  
  // 等待DOM更新
  await nextTick()
  
  // 挂载终端到DOM
  const element = terminalRefs.get(terminalId)
  if (element) {
    terminal.open(element)
    fitAddon.fit()
    
    // 设置终端数据处理
    terminal.onData((data) => {
      window.electron.ipcRenderer.invoke('task-terminal:write', terminalId, data)
    })
    
    // 监听后端终端输出
    window.electron.ipcRenderer.on(`task-terminal:data:${terminalId}`, (_, data) => {
      terminal.write(data)
    })
    
    // 监听终端退出
    window.electron.ipcRenderer.on(`task-terminal:exit:${terminalId}`, (_, exitCode) => {
      terminalInfo.status = exitCode === 0 ? 'completed' : 'failed'
    })
  }
  
  emit('terminalCreated', terminalId)
  return terminalId
}

// 切换终端
const switchTerminal = (terminalId: string) => {
  activeTerminalId.value = terminalId
  
  // 调整当前终端大小
  nextTick(() => {
    const terminal = terminals.value.find(t => t.id === terminalId)
    if (terminal?.fitAddon) {
      terminal.fitAddon.fit()
    }
  })
}

// 关闭终端
const closeTerminal = async (terminalId: string) => {
  const index = terminals.value.findIndex(t => t.id === terminalId)
  if (index !== -1) {
    const terminal = terminals.value[index]
    
    // 销毁前端终端
    if (terminal.terminal) {
      terminal.terminal.dispose()
    }
    
    // 销毁后端终端
    await window.electron.ipcRenderer.invoke('task-terminal:destroy', terminalId)
    
    // 移除监听器
    window.electron.ipcRenderer.removeAllListeners(`task-terminal:data:${terminalId}`)
    window.electron.ipcRenderer.removeAllListeners(`task-terminal:exit:${terminalId}`)
    
    // 从列表中移除
    terminals.value.splice(index, 1)
    
    // 切换到其他终端
    if (activeTerminalId.value === terminalId && terminals.value.length > 0) {
      activeTerminalId.value = terminals.value[0].id
    }
    
    emit('terminalClosed', terminalId)
  }
}

// 获取所有终端
const getAllTerminals = () => {
  return terminals.value.map(t => ({
    id: t.id,
    iterationId: t.iterationId,
    taskId: t.taskId,
    taskTitle: t.taskTitle,
    status: t.status
  }))
}

// 获取状态图标SVG路径
const getStatusIconPath = (status: string) => {
  switch (status) {
    case 'running': 
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-2-13v6l5.25 3.15.75-1.23-4.5-2.67V7z'
    case 'completed': 
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
    case 'failed': 
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'
    default: 
      return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z'
  }
}

// 获取状态样式类
const getStatusClass = (status: string) => {
  return `status-${status}`
}

// 设置resize观察器
const setupResizeObserver = () => {
  resizeObserver = new ResizeObserver(() => {
    terminals.value.forEach(terminal => {
      if (terminal.fitAddon) {
        terminal.fitAddon.fit()
      }
    })
  })
  
  const container = document.querySelector('.terminal-content')
  if (container) {
    resizeObserver.observe(container)
  }
}

onMounted(() => {
  setupResizeObserver()
  
  // 如果有当前任务，自动创建终端
  if (props.currentTask) {
    createTaskTerminal(
      props.currentTask.iterationId,
      props.currentTask.taskId,
      props.currentTask.taskTitle,
      props.currentTask.command
    )
  }
})

onBeforeUnmount(() => {
  // 清理所有终端
  terminals.value.forEach(terminal => {
    if (terminal.terminal) {
      terminal.terminal.dispose()
    }
  })
  
  // 清理resize观察器
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 暴露方法给父组件
defineExpose({
  createTaskTerminal,
  switchTerminal,
  closeTerminal,
  getAllTerminals
})
</script>

<style scoped>
.task-terminal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.terminal-tabs {
  display: flex;
  align-items: center;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  min-height: 35px;
  overflow-x: auto;
}

.terminal-tabs::-webkit-scrollbar {
  height: 4px;
}

.terminal-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-tabs::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 2px;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border-right: 1px solid #3e3e42;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: background 0.15s ease;
}

.terminal-tab:hover {
  background: rgba(255, 255, 255, 0.05);
}

.terminal-tab.active {
  background: #1e1e1e;
}

.tab-icon {
  font-size: 12px;
  display: flex;
  align-items: center;
}

.tab-icon.status-running {
  color: #007acc;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.tab-icon.status-completed {
  color: #4caf50;
}

.tab-icon.status-failed {
  color: #f44336;
}

.tab-title {
  font-size: 12px;
  color: #cccccc;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-tab.active .tab-title {
  color: #ffffff;
}

.tab-close {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #969696;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  transition: all 0.15s ease;
}

.tab-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #cccccc;
}

.no-terminals {
  padding: 8px 16px;
  font-size: 12px;
  color: #969696;
  font-style: italic;
}

.terminal-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.terminal-instance {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 4px;
}

/* xterm.js 终端样式覆盖 */
:deep(.xterm) {
  height: 100%;
  padding: 4px;
}

:deep(.xterm-viewport) {
  background-color: transparent !important;
}

:deep(.xterm-screen) {
  height: 100% !important;
}
</style>