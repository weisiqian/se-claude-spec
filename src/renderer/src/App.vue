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

onMounted(() => {
  // 恢复保存的项目路径
  const savedPath = localStorage.getItem('projectPath')
  if (savedPath) {
    projectPath.value = savedPath
  }
  
  // 恢复主题设置
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
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
  <div class="app" :class="{ 'dark': isDark }">
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
  background: #f5f5f5;
  overflow: hidden;
  transition: background-color 0.3s;
}

.app.dark {
  background: #1e1e1e;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.full-terminal {
  flex: 1;
}
</style>