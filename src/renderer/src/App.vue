<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import TitleBar from './components/TitleBar/index.vue'
import StepForm from './components/StepForm.vue'
import Terminal from './components/Terminal.vue'
import ResizablePanel from './components/ResizablePanel.vue'
import ActivityBar from './components/ActivityBar.vue'
import SidePanel from './components/SidePanel.vue'
import SplitLayout from './components/SplitLayout.vue'
import RequirementCreator from './components/RequirementCreator.vue'
import RequirementStatus from './components/RequirementStatus.vue'
import RequirementEditor from './components/RequirementEditor.vue'

const projectPath = ref<string | null>(null)
const showForm = ref(false)
const formType = ref<'requirement' | 'design' | 'task'>('requirement')
const formAction = ref<'create' | 'update' | 'execute'>('create')
const isDark = ref(false)
const activePanel = ref<'requirement' | 'design' | 'task' | ''>('')
const terminalRef = ref<any>(null)
const terminals = ref<Array<{ id: string; label?: string }>>([])
const activeTerminalId = ref<string>('')
const updateInterval = ref<NodeJS.Timeout | null>(null)
const isMaximized = ref(false)
const showRequirementCreator = ref(false)
const showRequirementStatus = ref(false)
const showRequirementEditor = ref(false)
const selectedRequirement = ref<any>(null)

// 提供主题状态给子组件
provide('isDark', isDark)

const handleMenuAction = (type: string, action: string) => {
  if (type === 'requirement' && action === 'create') {
    // 点击新建需求文档，打开需求创建器
    activePanel.value = 'requirement'
    showRequirementCreator.value = true
    showRequirementStatus.value = false
    showRequirementEditor.value = false
    showForm.value = false
  } else if (action === 'list') {
    // 点击列表项，显示对应的侧边栏
    activePanel.value = type as 'requirement' | 'design' | 'task'
    showForm.value = false
    showRequirementCreator.value = false
    showRequirementStatus.value = false
    showRequirementEditor.value = false
  } else {
    // 其他操作（设计和任务的创建）
    formType.value = type as 'requirement' | 'design' | 'task'
    formAction.value = action as 'create' | 'update' | 'execute'
    showForm.value = true
    activePanel.value = ''
    showRequirementCreator.value = false
    showRequirementStatus.value = false
    showRequirementEditor.value = false
  }
}

const handleDirectorySelected = (path: string) => {
  // 只更新本地状态，不切换终端目录
  // 终端目录切换会在 workspace-changed 事件中统一处理
  projectPath.value = path
  localStorage.setItem('projectPath', path)
}

const handleThemeToggle = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

const handleActivitySelect = (id: string) => {
  activePanel.value = id as 'requirement' | 'design' | 'task' | ''
  showForm.value = false
}

const handlePanelItemSelect = (item: any) => {
  if (!item) {
    // 点击新建按钮
    if (activePanel.value === 'requirement') {
      // 如果是需求管理，显示新的需求创建器
      showRequirementCreator.value = true
      showRequirementStatus.value = false
      showRequirementEditor.value = false
    } else {
      // 其他类型使用原有的表单页面
      formType.value = activePanel.value as 'requirement' | 'design' | 'task'
      formAction.value = 'create'
      showForm.value = true
      activePanel.value = ''
    }
  } else {
    // 点击现有项
    if (activePanel.value === 'requirement') {
      // 如果是需求，显示需求状态页面
      selectedRequirement.value = item
      showRequirementStatus.value = true
      showRequirementCreator.value = false
      showRequirementEditor.value = false
    } else {
      // 其他类型编辑
      formType.value = activePanel.value as 'requirement' | 'design' | 'task'
      formAction.value = 'update'
      showForm.value = true
      activePanel.value = ''
    }
  }
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

const handleRequirementSubmit = (data: any) => {
  console.log('新建需求提交:', data)
  // 不再自动关闭创建器，让用户停留在当前页面继续操作
  // 需求列表会自动刷新（SidePanel 监听了工作空间变化）
}

const handleExecuteCommand = async (command: string) => {
  // 在终端中执行命令
  if (terminalRef.value) {
    await terminalRef.value.executeCommand(command)
  }
}

const handleEditRequirement = (item: any) => {
  // 编辑需求
  selectedRequirement.value = item
  showRequirementEditor.value = true
  showRequirementCreator.value = false
  showRequirementStatus.value = false
}

const handleSaveRequirement = (shouldClose = true) => {
  // 根据参数决定是否关闭编辑器
  if (shouldClose) {
    showRequirementEditor.value = false
  }
  // 需求列表会自动刷新
}

onMounted(async () => {
  // 获取当前工作空间
  if (window.api?.getCurrentWorkspace) {
    const currentWorkspace = await window.api.getCurrentWorkspace()
    if (currentWorkspace) {
      projectPath.value = currentWorkspace
      localStorage.setItem('projectPath', currentWorkspace)
    }
  } else {
    // 恢复保存的项目路径
    const savedPath = localStorage.getItem('projectPath')
    if (savedPath) {
      projectPath.value = savedPath
    }
  }
  
  // 监听工作空间变化
  if (window.api?.onWorkspaceChanged) {
    window.api.onWorkspaceChanged((workspace: string) => {
      projectPath.value = workspace
      localStorage.setItem('projectPath', workspace)
      // 切换终端工作目录
      terminalRef.value?.changeDirectory(workspace)
    })
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
      <SplitLayout v-if="activePanel">
        <template #activityBar>
          <ActivityBar 
            :is-dark="isDark"
            :active-id="activePanel"
            @select="handleActivitySelect"
          />
        </template>
        <template #sidePanel>
          <RequirementCreator
            v-if="showRequirementCreator && activePanel === 'requirement'"
            :project-path="projectPath"
            @close="showRequirementCreator = false"
            @back="showRequirementCreator = false"
            @submit="handleRequirementSubmit"
            @execute-command="handleExecuteCommand"
          />
          <RequirementStatus
            v-else-if="showRequirementStatus && activePanel === 'requirement' && selectedRequirement"
            :requirement="selectedRequirement"
            @close="showRequirementStatus = false"
            @back="showRequirementStatus = false"
            @execute-command="handleExecuteCommand"
          />
          <RequirementEditor
            v-else-if="showRequirementEditor && activePanel === 'requirement' && selectedRequirement"
            :requirement="selectedRequirement"
            @close="showRequirementEditor = false"
            @back="showRequirementEditor = false"
            @save="handleSaveRequirement"
            @execute-command="handleExecuteCommand"
          />
          <SidePanel
            v-else
            :type="activePanel"
            :is-dark="isDark"
            @close="activePanel = ''"
            @item-select="handlePanelItemSelect"
            @edit-requirement="handleEditRequirement"
          />
        </template>
        <template #terminal>
          <Terminal ref="terminalRef" :project-path="projectPath" :is-dark="isDark" />
        </template>
      </SplitLayout>
      <ResizablePanel 
        v-else-if="showForm"
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
  position: relative;
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