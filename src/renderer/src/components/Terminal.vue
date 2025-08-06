<template>
  <div class="terminal-container" ref="terminalContainer">
    <div class="terminal-header">
      <span class="terminal-title">终端</span>
      <div class="terminal-actions">
        <el-button
          :icon="Plus"
          size="small"
          circle
          @click="createNewTerminal"
          title="新建终端"
        />
        <el-button
          :icon="Delete"
          size="small"
          circle
          @click="clearTerminal"
          title="清空"
        />
        <el-button
          :icon="Close"
          size="small"
          circle
          @click="closeTerminal"
          title="关闭"
        />
      </div>
    </div>
    <div class="terminal-tabs" v-if="terminals.length > 1">
      <div
        v-for="(term, index) in terminals"
        :key="term.id"
        :class="['terminal-tab', { active: activeTerminalId === term.id }]"
        @click="switchTerminal(term.id)"
      >
        <span>终端 {{ index + 1 }}</span>
        <el-icon
          class="tab-close"
          @click.stop="closeTerminal(term.id)"
          v-if="terminals.length > 1"
        >
          <Close />
        </el-icon>
      </div>
    </div>
    <div class="terminal-content" ref="terminalContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { Plus, Delete, Close } from '@element-plus/icons-vue'
import 'xterm/css/xterm.css'

interface TerminalInstance {
  id: string
  terminal: Terminal
  fitAddon: FitAddon
}

const terminalContainer = ref<HTMLElement>()
const terminalContent = ref<HTMLElement>()
const terminals = ref<TerminalInstance[]>([])
const activeTerminalId = ref<string>('')
let currentTerminal: Terminal | null = null
let resizeObserver: ResizeObserver | null = null

const createTerminal = async (id: string) => {
  const terminal = new Terminal({
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    theme: {
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
    },
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 1000,
    convertEol: true
  })

  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  const webLinksAddon = new WebLinksAddon()
  terminal.loadAddon(webLinksAddon)

  await window.electron.ipcRenderer.invoke('terminal:create', id)

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

  return { id, terminal, fitAddon }
}

const createNewTerminal = async () => {
  const id = `terminal-${Date.now()}`
  const termInstance = await createTerminal(id)
  terminals.value.push(termInstance)
  await switchTerminal(id)
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
</script>

<style scoped>
.terminal-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-left: 1px solid #e1e4e8;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  min-height: 35px;
}

.terminal-title {
  color: #24292e;
  font-size: 13px;
  font-weight: 500;
}

.terminal-actions {
  display: flex;
  gap: 4px;
}

.terminal-actions :deep(.el-button) {
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  color: #586069;
}

.terminal-actions :deep(.el-button:hover) {
  background-color: #e1e4e8;
  color: #24292e;
}

.terminal-tabs {
  display: flex;
  background-color: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  overflow-x: auto;
  min-height: 30px;
}

.terminal-tab {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  color: #586069;
  font-size: 12px;
  cursor: pointer;
  border-right: 1px solid #e1e4e8;
  white-space: nowrap;
  user-select: none;
}

.terminal-tab:hover {
  background-color: #e1e4e8;
}

.terminal-tab.active {
  background-color: #ffffff;
  color: #24292e;
  font-weight: 500;
}

.tab-close {
  margin-left: 8px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
}

.tab-close:hover {
  opacity: 1;
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