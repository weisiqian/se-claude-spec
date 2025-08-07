<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import TitleBar from './components/TitleBar.vue'
import StepForm from './components/StepForm.vue'
import Terminal from './components/Terminal.vue'
import ResizablePanel from './components/ResizablePanel.vue'

const projectPath = ref<string | null>(null)
const showForm = ref(false)
const formType = ref<'requirement' | 'design' | 'task'>('requirement')
const formAction = ref<'create' | 'update' | 'execute'>('create')
const isDark = ref(false)
const terminalRef = ref<any>(null)
const terminals = ref<Array<{ id: string; label?: string }>>([])
const activeTerminalId = ref<string>('')
const updateInterval = ref<NodeJS.Timeout | null>(null)
const isMaximized = ref(false)

// 提供主题状态给子组件
provide('isDark', isDark)

const handleMenuAction = (type: string, action: string) => {
  formType.value = type as 'requirement' | 'design' | 'task'
  formAction.value = action as 'create' | 'update' | 'execute'
  showForm.value = true
}

const handleDirectorySelected = (path: string) => {
  projectPath.value = path
  localStorage.setItem('projectPath', path)
}

const handleThemeToggle = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

const handleCreateTerminal = async (type: string = 'bash') => {
  await terminalRef.value?.createNewTerminal(type)
  updateTerminalState()
}

const handleSwitchTerminal = (id: string) => {
  terminalRef.value?.switchTerminal(id)
  updateTerminalState()
}

const handleCloseTerminal = async (id: string) => {
  await terminalRef.value?.closeTerminal(id)
  updateTerminalState()
}

const updateTerminalState = () => {
  if (terminalRef.value) {
    terminals.value = [...terminalRef.value.terminals]
    activeTerminalId.value = terminalRef.value.activeTerminalId
  }
}

onMounted(async () => {
  // 恢复保存的项目路径
  const savedPath = localStorage.getItem('projectPath')
  if (savedPath) {
    projectPath.value = savedPath
  }
  
  // 恢复主题设置
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 检测窗口最大化状态
  if (window.api?.windowControls) {
    isMaximized.value = await window.api.windowControls.isMaximized()
    window.api.windowControls.onMaximizedChange((maximized: boolean) => {
      isMaximized.value = maximized
    })
  }
  
  // 定期更新终端状态
  updateInterval.value = setInterval(() => {
    updateTerminalState()
  }, 100)
})

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
})
</script>

<template>
  <div class="app" :class="{ 'dark': isDark, 'maximized': isMaximized }">
    <TitleBar 
      @menu-action="handleMenuAction"
      @directory-selected="handleDirectorySelected"
      @theme-toggle="handleThemeToggle"
      @create-terminal="handleCreateTerminal"
      @switch-terminal="handleSwitchTerminal"
      @close-terminal="handleCloseTerminal"
      :is-dark="isDark"
      :terminals="terminals"
      :active-terminal-id="activeTerminalId"
    />
    <div class="content">
      <ResizablePanel 
        v-if="showForm"
        :initial-side-width="600"
        :min-side-width="400"
        :max-side-width="800"
      >
        <template #main>
          <StepForm 
            :type="formType" 
            :action="formAction"
            :project-path="projectPath"
            @close="showForm = false"
          />
        </template>
        <template #side>
          <Terminal ref="terminalRef" :project-path="projectPath" :is-dark="isDark" />
        </template>
      </ResizablePanel>
      <Terminal v-else ref="terminalRef" :project-path="projectPath" :is-dark="isDark" class="full-terminal" />
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--wt-bg-primary);
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.app.maximized {
  border-radius: 0;
  box-shadow: none;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: var(--wt-bg-primary);
  border-radius: 0 0 8px 8px;
}

.app.maximized .content {
  border-radius: 0;
}

.full-terminal {
  flex: 1;
  background: var(--wt-bg-primary);
  border-radius: 0 0 8px 8px;
}

.app.maximized .full-terminal {
  border-radius: 0;
}
</style>