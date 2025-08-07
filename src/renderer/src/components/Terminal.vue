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

// 定义浅色和深色主题
const lightTheme = {
  background: '#ffffff',
  foreground: '#333333',
  cursor: '#333333',
  black: '#000000',
  red: '#d14a14',
  green: '#3a7f00',
  yellow: '#b08800',
  blue: '#0066cc',
  magenta: '#b200b2',
  cyan: '#008080',
  white: '#bbbbbb',
  brightBlack: '#555555',
  brightRed: '#ff6b68',
  brightGreen: '#4fc414',
  brightYellow: '#ffd93d',
  brightBlue: '#6cb8ff',
  brightMagenta: '#ff6fff',
  brightCyan: '#5fdfdf',
  brightWhite: '#ffffff',
  selectionBackground: '#b5d5ff',
  selectionForeground: '#000000'
}

const darkTheme = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#ffffff',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff'
}

const createTerminal = async (id: string, type: string = 'bash') => {
  const terminal = new Terminal({
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    theme: props.isDark ? darkTheme : lightTheme,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 1000,
    convertEol: true
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
watch(() => props.isDark, (isDark) => {
  const theme = isDark ? darkTheme : lightTheme
  terminals.value.forEach(termInstance => {
    termInstance.terminal.options.theme = theme
  })
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

// 暴露方法给父组件
defineExpose({
  createNewTerminal,
  clearTerminal,
  closeTerminal,
  switchTerminal,
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
  background-color: #ffffff;
  border-left: 1px solid #e1e4e8;
  transition: background-color 0.3s, border-color 0.3s;
}

.terminal-container.dark {
  background-color: #1e1e1e;
  border-left-color: #333;
}

.terminal-content {
  flex: 1;
  overflow: hidden;
  padding: 4px;
}

:deep(.xterm) {
  height: 100%;
}

:deep(.xterm-viewport) {
  background-color: #ffffff;
}

:deep(.xterm-screen) {
  padding: 4px;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 10px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: #f6f8fa;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #c1c4cb;
  border-radius: 5px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #959da5;
}
</style>