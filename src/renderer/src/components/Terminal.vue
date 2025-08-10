<template>
  <div class="terminal-container" :class="{ 'dark': isDark }" ref="terminalContainer">
    <div class="terminal-content" ref="terminalContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch, defineExpose } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

const props = defineProps<{
  projectPath?: string | null
  isDark?: boolean
}>()

interface TerminalInstance {
  id: string
  terminal: Terminal
  fitAddon: FitAddon
  label?: string
  type?: string
  username?: string
}

const terminalContainer = ref<HTMLElement>()
const terminalContent = ref<HTMLElement>()
const terminals = ref<TerminalInstance[]>([])
const activeTerminalId = ref<string>('')
let currentTerminal: Terminal | null = null
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

const createTerminal = async (id: string, type: string = 'bash') => {
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
    lineHeight: 1.2,
    allowProposedApi: true  // 允许使用实验性 API
  })

  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  const webLinksAddon = new WebLinksAddon()
  terminal.loadAddon(webLinksAddon)

  // 获取当前用户名
  const username = await window.electron.ipcRenderer.invoke('terminal:get-username')
  
  await window.electron.ipcRenderer.invoke('terminal:create', id, props.projectPath || undefined, type)

  terminal.onData((data) => {
    window.electron.ipcRenderer.invoke('terminal:write', id, data)
  })
  
  terminal.onResize((size) => {
    window.electron.ipcRenderer.invoke('terminal:resize', id, size.cols, size.rows)
  })

  window.electron.ipcRenderer.on(`terminal:data:${id}`, (_, data: string) => {
    // 检测 clear 命令的 ANSI 转义序列
    // \x1b[H\x1b[2J - clear screen and move cursor to home
    // \x1b[2J - clear entire screen
    // \x1b[3J - clear entire screen and scrollback buffer
    // \x1bc - reset terminal
    if (data.includes('\x1b[H\x1b[2J') || data.includes('\x1b[H\x1b[3J')) {
      // Clear screen but keep scrollback
      terminal.clear()
    } else if (data.includes('\x1bc')) {
      // Full reset
      terminal.reset()
    }
    terminal.write(data)
  })

  window.electron.ipcRenderer.on(`terminal:exit:${id}`, () => {
    terminal.write('\r\n[进程已退出]\r\n')
    const index = terminals.value.findIndex(t => t.id === id)
    if (index !== -1) {
      terminals.value.splice(index, 1)
      if (terminals.value.length > 0 && activeTerminalId.value === id) {
        switchTerminal(terminals.value[0].id)
      }
    }
  })

  // 生成终端标签
  const label = `${username || 'user'}:${type}`
  
  return { id, terminal, fitAddon, label, type, username }
}

const createNewTerminal = async (type: string = 'bash') => {
  const id = `terminal-${Date.now()}`
  const termInstance = await createTerminal(id, type)
  terminals.value.push(termInstance)
  await switchTerminal(id)
  return termInstance
}

const switchTerminal = async (id: string) => {
  if (activeTerminalId.value === id) return
  
  if (currentTerminal) {
    const currentElement = currentTerminal.element
    if (currentElement && currentElement.parentNode) {
      currentElement.parentNode.removeChild(currentElement)
    }
  }

  activeTerminalId.value = id
  const termInstance = terminals.value.find(t => t.id === id)
  
  if (termInstance && terminalContent.value) {
    currentTerminal = termInstance.terminal
    termInstance.terminal.open(terminalContent.value)
    await nextTick()
    termInstance.fitAddon.fit()
    termInstance.terminal.focus()
  }
}

const clearTerminal = () => {
  if (currentTerminal) {
    currentTerminal.clear()
  }
}

const closeTerminal = async (id?: string) => {
  const terminalId = id || activeTerminalId.value
  if (!terminalId) return

  await window.electron.ipcRenderer.invoke('terminal:destroy', terminalId)
  
  const index = terminals.value.findIndex(t => t.id === terminalId)
  if (index !== -1) {
    const termInstance = terminals.value[index]
    termInstance.terminal.dispose()
    terminals.value.splice(index, 1)
    
    if (activeTerminalId.value === terminalId && terminals.value.length > 0) {
      await switchTerminal(terminals.value[0].id)
    } else if (terminals.value.length === 0) {
      activeTerminalId.value = ''
      currentTerminal = null
    }
  }
}

const handleResize = () => {
  terminals.value.forEach(termInstance => {
    if (termInstance.id === activeTerminalId.value) {
      termInstance.fitAddon.fit()
      const size = termInstance.fitAddon.proposeDimensions()
      if (size) {
        window.electron.ipcRenderer.invoke('terminal:resize', termInstance.id, size.cols, size.rows)
      }
    }
  })
}

// 监听主题变化并更新所有终端
watch(() => props.isDark, () => {
  // 主题变化时可以在这里更新终端主题
  // 当前使用的是固定的 Windows Terminal 主题，所以不需要切换
  // 如果需要支持明暗主题切换，可以定义两套主题并在这里切换
})

onMounted(async () => {
  await createNewTerminal()
  
  if (terminalContent.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(terminalContent.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  
  terminals.value.forEach(termInstance => {
    window.electron.ipcRenderer.invoke('terminal:destroy', termInstance.id)
    termInstance.terminal.dispose()
  })
  
  terminals.value = []
})

// 切换当前终端的工作目录
const changeDirectory = async (path: string) => {
  if (currentTerminal && activeTerminalId.value) {
    // 发送 cd 命令到当前终端
    const command = `cd "${path}"\r`
    await window.electron.ipcRenderer.invoke('terminal:write', activeTerminalId.value, command)
  }
}

// 在当前终端执行命令
const executeCommand = async (command: string) => {
  if (!currentTerminal || !activeTerminalId.value) {
    // 如果没有活动终端，创建一个新的
    await createNewTerminal()
  }
  
  if (currentTerminal && activeTerminalId.value) {
    // 确保终端获得焦点
    currentTerminal.focus()
    // 发送命令到终端（添加回车符执行）
    const fullCommand = `${command}\r`
    await window.electron.ipcRenderer.invoke('terminal:write', activeTerminalId.value, fullCommand)
  }
}

// 暴露方法给父组件
defineExpose({
  createNewTerminal,
  clearTerminal,
  closeTerminal,
  switchTerminal,
  changeDirectory,
  executeCommand,
  terminals,
  activeTerminalId
})
</script>

<style scoped>
.terminal-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--wt-bg-primary);
  position: relative;
  overflow: hidden;
}

.terminal-content {
  flex: 1;
  overflow: hidden;
  padding: 8px;
  position: relative;
  z-index: 2;
}

:deep(.xterm) {
  height: 100%;
  background: transparent !important;
}

:deep(.xterm-viewport) {
  background: transparent !important;
}

:deep(.xterm-screen) {
  padding: 0;
}

/* 终端滚动条样式 - 确保可以拖动 */
:deep(.xterm-viewport) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 14px;
  background: transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 7px;
  margin: 4px 0;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 7px;
  border: 3px solid transparent;
  background-clip: padding-box;
  min-height: 40px;  /* 确保滚动条拇指有最小高度，便于拖动 */
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.25);
  background-clip: padding-box;
  border: 2px solid transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:active) {
  background: rgba(255, 255, 255, 0.35);
  background-clip: padding-box;
  border: 2px solid transparent;
}
</style>