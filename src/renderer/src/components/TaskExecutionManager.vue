<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, inject } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import TaskTerminal from './TaskTerminal.vue'

interface TaskItem {
  id: string
  title: string
  description: string
  command?: string
  selected: boolean
  status: 'pending' | 'executing' | 'success' | 'failed'
  result?: string
}

interface DesignItem {
  id: string
  title: string
  executed: boolean
  tasks: TaskItem[]
}

interface RequirementItem {
  id: string
  title: string
  executed: boolean
}

interface ExecutionTreeItem {
  iterationId: string
  iterationName: string
  expanded: boolean
  selected: boolean
  partiallySelected: boolean
  requirement?: RequirementItem
  design?: DesignItem
  tasks: TaskItem[]
}

const emit = defineEmits<{
  close: []
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 状态管理
const executionTree = ref<ExecutionTreeItem[]>([])
const selectedTasks = ref<Set<string>>(new Set())
const isLoading = ref(false)
const isExecuting = ref(false)
const searchText = ref('')
const filterStatus = ref<'all' | 'pending' | 'success' | 'failed'>('all')
const selectedTaskDetail = ref<TaskItem | null>(null)
const executionLog = ref('')
const autoRefreshTimer = ref<NodeJS.Timeout | null>(null)
const taskTerminalRef = ref<InstanceType<typeof TaskTerminal> | null>(null)
const showTerminalPanel = ref(false)

// 拖动调整宽度相关
const treePanelWidth = ref(60) // 默认占60%
const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 计算属性
const filteredTree = computed(() => {
  let tree = executionTree.value

  // 按状态筛选
  if (filterStatus.value !== 'all') {
    tree = tree.map(iteration => ({
      ...iteration,
      tasks: iteration.tasks.filter(task => {
        if (filterStatus.value === 'pending') return task.status === 'pending'
        if (filterStatus.value === 'success') return task.status === 'success'
        if (filterStatus.value === 'failed') return task.status === 'failed'
        return true
      })
    })).filter(iteration => iteration.tasks.length > 0)
  }

  // 按搜索文本筛选
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    tree = tree.map(iteration => ({
      ...iteration,
      tasks: iteration.tasks.filter(task =>
        task.title.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search)
      )
    })).filter(iteration => iteration.tasks.length > 0)
  }

  return tree
})

const selectedTasksCount = computed(() => selectedTasks.value.size)

const hasSelectedTasks = computed(() => selectedTasksCount.value > 0)

// 加载执行树
const loadExecutionTree = async (isInitialLoad = false) => {
  // 初始加载时显示loading
  if (isInitialLoad) {
    isLoading.value = true
  }
  
  try {
    const tree = await window.api.getExecutionTree()
    
    // 如果是初始加载，直接设置数据
    if (isInitialLoad || executionTree.value.length === 0) {
      executionTree.value = tree.map((item: any, index: number) => ({
        ...item,
        expanded: index === 0, // 默认展开第一个迭代
        selected: false,
        partiallySelected: false,
        tasks: item.tasks?.map((task: any) => ({
          ...task,
          selected: false,
          status: task.status || 'pending'
        })) || []
      }))
    } else {
      // 非初始加载，智能更新数据
      // 保存当前的选中状态和展开状态
      const expandedIterations = new Set<string>()
      const selectedTaskKeys = new Set<string>()
      
      executionTree.value.forEach(iteration => {
        if (iteration.expanded) {
          expandedIterations.add(iteration.iterationId)
        }
        iteration.tasks.forEach(task => {
          if (task.selected) {
            selectedTaskKeys.add(`${iteration.iterationId}-${task.id}`)
          }
        })
      })
      
      // 只更新有变化的数据
      tree.forEach((newItem: any) => {
        const existingIteration = executionTree.value.find(
          it => it.iterationId === newItem.iterationId
        )
        
        if (existingIteration) {
          // 更新任务状态，但保留选中和展开状态
          const updatedTasks = (newItem.tasks || []).map((task: any) => {
            const taskKey = `${newItem.iterationId}-${task.id}`
            const existingTask = existingIteration.tasks.find(t => t.id === task.id)
            return {
              ...task,
              selected: existingTask?.selected || selectedTaskKeys.has(taskKey),
              status: task.status || 'pending'
            }
          })
          
          // 只在数据真正有变化时更新
          const hasTaskChanges = JSON.stringify(existingIteration.tasks.map(t => ({
            id: t.id,
            status: t.status,
            title: t.title,
            description: t.description
          }))) !== JSON.stringify(updatedTasks.map(t => ({
            id: t.id,
            status: t.status,
            title: t.title,
            description: t.description
          })))
          
          if (hasTaskChanges) {
            existingIteration.tasks = updatedTasks
            
            // 重新计算迭代的选中状态
            const selectedCount = updatedTasks.filter(t => t.selected).length
            existingIteration.selected = selectedCount === updatedTasks.length && updatedTasks.length > 0
            existingIteration.partiallySelected = selectedCount > 0 && selectedCount < updatedTasks.length
          }
        } else {
          // 新的迭代，添加到列表
          executionTree.value.push({
            ...newItem,
            expanded: false,
            selected: false,
            partiallySelected: false,
            tasks: (newItem.tasks || []).map((task: any) => ({
              ...task,
              selected: false,
              status: task.status || 'pending'
            }))
          })
        }
      })
      
      // 移除不存在的迭代
      executionTree.value = executionTree.value.filter(iteration =>
        tree.some((item: any) => item.iterationId === iteration.iterationId)
      )
    }
  } catch (error) {
    console.error('加载执行树失败:', error)
  } finally {
    if (isInitialLoad) {
      isLoading.value = false
    }
  }
}

// 切换迭代展开状态
const toggleIteration = (iteration: ExecutionTreeItem) => {
  iteration.expanded = !iteration.expanded
}

// 选择/取消选择迭代
const toggleIterationSelection = (iteration: ExecutionTreeItem) => {
  iteration.selected = !iteration.selected
  iteration.partiallySelected = false
  
  // 同步更新所有子任务的选择状态
  iteration.tasks.forEach(task => {
    task.selected = iteration.selected
    if (iteration.selected) {
      selectedTasks.value.add(`${iteration.iterationId}-${task.id}`)
    } else {
      selectedTasks.value.delete(`${iteration.iterationId}-${task.id}`)
    }
  })
}

// 选择/取消选择任务
const toggleTaskSelection = (iteration: ExecutionTreeItem, task: TaskItem) => {
  // 找到对应的任务并切换选中状态
  const targetTask = iteration.tasks.find(t => t.id === task.id)
  if (targetTask) {
    targetTask.selected = !targetTask.selected
    const taskKey = `${iteration.iterationId}-${targetTask.id}`
    
    if (targetTask.selected) {
      selectedTasks.value.add(taskKey)
    } else {
      selectedTasks.value.delete(taskKey)
    }
    
    // 更新迭代的选择状态
    const selectedCount = iteration.tasks.filter(t => t.selected).length
    if (selectedCount === 0) {
      iteration.selected = false
      iteration.partiallySelected = false
    } else if (selectedCount === iteration.tasks.length) {
      iteration.selected = true
      iteration.partiallySelected = false
    } else {
      iteration.selected = false
      iteration.partiallySelected = true
    }
  }
}

// 全选
const selectAll = () => {
  filteredTree.value.forEach(iteration => {
    iteration.selected = true
    iteration.partiallySelected = false
    iteration.tasks.forEach(task => {
      task.selected = true
      selectedTasks.value.add(`${iteration.iterationId}-${task.id}`)
    })
  })
}

// 清除选择
const clearSelection = () => {
  executionTree.value.forEach(iteration => {
    iteration.selected = false
    iteration.partiallySelected = false
    iteration.tasks.forEach(task => {
      task.selected = false
    })
  })
  selectedTasks.value.clear()
}

// 执行选中的任务
const executeSelectedTasks = async () => {
  if (!hasSelectedTasks.value || isExecuting.value) return
  
  isExecuting.value = true
  executionLog.value = '开始执行任务...\n'
  showTerminalPanel.value = true
  
  try {
    const tasksToExecute: Array<{ 
      iterationId: string
      taskId: string
      taskTitle: string
      command?: string 
    }> = []
    
    executionTree.value.forEach(iteration => {
      iteration.tasks.forEach(task => {
        if (task.selected) {
          tasksToExecute.push({
            iterationId: iteration.iterationId,
            taskId: task.id,
            taskTitle: task.title,
            command: task.command
          })
          task.status = 'executing'
        }
      })
    })
    
    // 为每个任务创建独立终端并执行
    for (const task of tasksToExecute) {
      if (taskTerminalRef.value && task.command) {
        // 创建任务终端
        await taskTerminalRef.value.createTaskTerminal(
          task.iterationId,
          task.taskId,
          task.taskTitle,
          task.command
        )
        
        // 更新任务状态
        const iteration = executionTree.value.find(i => i.iterationId === task.iterationId)
        if (iteration) {
          const taskItem = iteration.tasks.find(t => t.id === task.taskId)
          if (taskItem) {
            taskItem.status = 'executing'
          }
        }
      }
    }
    
    executionLog.value += '\n所有任务已提交执行，请在终端面板查看执行状态。'
  } catch (error) {
    console.error('执行任务失败:', error)
    executionLog.value += `\n错误: ${error}\n`
  } finally {
    isExecuting.value = false
  }
}

// 查看任务终端
const viewTaskTerminal = (iteration: ExecutionTreeItem, task: TaskItem) => {
  showTerminalPanel.value = true
  
  // 如果终端不存在，创建一个新的
  if (taskTerminalRef.value) {
    const terminalId = `task-${iteration.iterationId}-${task.id}`
    const terminals = taskTerminalRef.value.getAllTerminals()
    const existing = terminals.find(t => t.id === terminalId)
    
    if (existing) {
      // 切换到已存在的终端
      taskTerminalRef.value.switchTerminal(terminalId)
    } else {
      // 创建新终端
      taskTerminalRef.value.createTaskTerminal(
        iteration.iterationId,
        task.id,
        task.title,
        task.command
      )
    }
  }
}

// 显示任务详情
const showTaskDetail = (task: TaskItem) => {
  selectedTaskDetail.value = task
}

// 处理任务点击 - 同时切换选中状态和显示详情
const handleTaskClick = (iteration: ExecutionTreeItem, task: TaskItem) => {
  toggleTaskSelection(iteration, task)
  showTaskDetail(task)
}

// 格式化状态显示
const formatStatus = (status: string) => {
  switch (status) {
    case 'pending': return '待执行'
    case 'executing': return '执行中...'
    case 'success': return '成功'
    case 'failed': return '失败'
    default: return status
  }
}

// 获取状态样式类
const getStatusClass = (status: string) => {
  return `status-${status}`
}

// 启动自动刷新
const startAutoRefresh = () => {
  stopAutoRefresh()
  autoRefreshTimer.value = setInterval(() => {
    loadExecutionTree()
  }, 10000) // 10秒刷新一次
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 开始拖动
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  startX.value = e.clientX
  startWidth.value = treePanelWidth.value
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// 拖动中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const container = document.querySelector('.task-execution-manager .content') as HTMLElement
  if (!container) return
  
  const containerWidth = container.offsetWidth
  const deltaX = e.clientX - startX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  const newWidth = startWidth.value + deltaPercent
  
  // 限制宽度范围
  if (newWidth >= 30 && newWidth <= 80) {
    treePanelWidth.value = newWidth
  }
}

// 停止拖动
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  // 保存用户偏好
  localStorage.setItem('taskExecutionTreePanelWidth', treePanelWidth.value.toString())
}

onMounted(() => {
  loadExecutionTree(true) // 初始加载
  startAutoRefresh()
  
  // 恢复用户之前调整的宽度
  const savedWidth = localStorage.getItem('taskExecutionTreePanelWidth')
  if (savedWidth) {
    treePanelWidth.value = parseFloat(savedWidth)
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="task-execution-manager" :class="{ 'dark': isDark }">
    <div class="header">
      <h2 class="title">执行计划管理</h2>
      <button class="close-btn" @click="emit('close')" title="关闭">×</button>
    </div>
    
    <div class="toolbar">
      <div class="toolbar-left">
        <button 
          class="action-btn primary-btn"
          @click="executeSelectedTasks"
          :disabled="!hasSelectedTasks || isExecuting"
        >
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          {{ isExecuting ? '执行中...' : `执行选中 (${selectedTasksCount})` }}
        </button>
        <button 
          class="action-btn"
          @click="selectAll"
          :disabled="isExecuting"
        >
          全选
        </button>
        <button 
          class="action-btn"
          @click="clearSelection"
          :disabled="!hasSelectedTasks || isExecuting"
        >
          清除选择
        </button>
      </div>
      
      <div class="toolbar-right">
        <select 
          v-model="filterStatus"
          class="filter-select"
        >
          <option value="all">所有状态</option>
          <option value="pending">待执行</option>
          <option value="success">已成功</option>
          <option value="failed">失败</option>
        </select>
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索任务..."
        />
        <button 
          class="action-btn"
          @click="loadExecutionTree"
          :disabled="isLoading"
          title="刷新"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" :class="{ 'rotating': isLoading }">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="content">
      <div class="tree-panel" :style="{ width: treePanelWidth + '%' }">
        <div v-if="isLoading" class="loading">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
        
        <div v-else-if="filteredTree.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <p>暂无任务</p>
        </div>
        
        <div v-else class="tree-list">
          <div 
            v-for="iteration in filteredTree"
            :key="`iteration-${iteration.iterationId}`"
            class="iteration-item"
          >
            <div class="iteration-header">
              <input
                type="checkbox"
                :checked="iteration.selected"
                :indeterminate="iteration.partiallySelected"
                @change="toggleIterationSelection(iteration)"
                :disabled="isExecuting"
              />
              <svg 
                class="expand-icon"
                @click="toggleIteration(iteration)"
                :class="{ 'expanded': iteration.expanded }"
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
              <span class="iteration-name" @click="toggleIteration(iteration)">
                迭代 {{ iteration.iterationId }} - {{ iteration.iterationName }}
              </span>
              <span class="task-count">({{ iteration.tasks.length }} 项任务)</span>
            </div>
            
            <div v-if="iteration.expanded" class="iteration-content">
              <div v-if="iteration.requirement" class="info-item requirement">
                <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <span class="info-label">需求:</span>
                <span class="info-value">{{ iteration.requirement.title }}</span>
                <span v-if="iteration.requirement.executed" class="executed-badge">已执行</span>
              </div>
              
              <div v-if="iteration.design" class="info-item design">
                <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/>
                </svg>
                <span class="info-label">设计:</span>
                <span class="info-value">{{ iteration.design.title }}</span>
                <span v-if="iteration.design.executed" class="executed-badge">已执行</span>
              </div>
              
              <div class="tasks-section">
                <div class="section-header">
                  <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span class="section-title">任务列表</span>
                </div>
                
                <div class="task-list">
                  <div 
                    v-for="task in iteration.tasks"
                    :key="`task-${iteration.iterationId}-${task.id}`"
                    class="task-item"
                    :class="{ 'selected': task.selected }"
                  >
                    <input
                      type="checkbox"
                      :checked="task.selected"
                      @change="toggleTaskSelection(iteration, task)"
                      :disabled="isExecuting"
                    />
                    <div class="task-info" @click="handleTaskClick(iteration, task)">
                      <div class="task-title">{{ task.id }}. {{ task.title }}</div>
                      <div v-if="task.description" class="task-description">{{ task.description }}</div>
                    </div>
                    <button 
                      v-if="task.command"
                      class="terminal-btn"
                      @click.stop="viewTaskTerminal(iteration, task)"
                      title="查看终端"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-7H6v-1h12v1zm0 2H6v-1h12v1zm-6 2H6v-1h6v1z"/>
                      </svg>
                    </button>
                    <span class="task-status" :class="getStatusClass(task.status)">
                      {{ formatStatus(task.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        class="resize-handle"
        @mousedown="startDrag"
        :class="{ 'dragging': isDragging }"
      ></div>
      
      <div class="detail-panel" :style="{ width: `calc(${100 - treePanelWidth}% - 4px)` }">
        <div class="panel-tabs">
          <button 
            class="panel-tab"
            :class="{ active: !showTerminalPanel }"
            @click="showTerminalPanel = false"
          >
            详情
          </button>
          <button 
            class="panel-tab"
            :class="{ active: showTerminalPanel }"
            @click="showTerminalPanel = true"
          >
            终端
          </button>
        </div>
        
        <div v-if="!showTerminalPanel && selectedTaskDetail" class="task-detail">
          <h3 class="detail-title">任务详情</h3>
          <div class="detail-content">
            <div class="detail-item">
              <label>任务ID:</label>
              <span>{{ selectedTaskDetail.id }}</span>
            </div>
            <div class="detail-item">
              <label>任务标题:</label>
              <span>{{ selectedTaskDetail.title }}</span>
            </div>
            <div class="detail-item">
              <label>任务描述:</label>
              <span>{{ selectedTaskDetail.description || '无' }}</span>
            </div>
            <div class="detail-item">
              <label>执行命令:</label>
              <code class="command-text">{{ selectedTaskDetail.command || '无' }}</code>
            </div>
            <div class="detail-item">
              <label>执行状态:</label>
              <span :class="getStatusClass(selectedTaskDetail.status)">
                {{ formatStatus(selectedTaskDetail.status) }}
              </span>
            </div>
            
            <div v-if="selectedTaskDetail.result" class="result-section">
              <h4>执行结果</h4>
              <MonacoEditor
                :modelValue="selectedTaskDetail.result"
                language="text"
                :height="200"
                :read-only="true"
              />
            </div>
          </div>
        </div>
        
        <div v-else-if="!showTerminalPanel && executionLog" class="execution-log">
          <h3 class="detail-title">执行日志</h3>
          <MonacoEditor
            :modelValue="executionLog"
            language="text"
            :height="400"
            :read-only="true"
          />
        </div>
        
        <div v-else-if="!showTerminalPanel" class="detail-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
          <p>选择一个任务查看详情</p>
        </div>
        
        <div v-if="showTerminalPanel" class="terminal-panel">
          <TaskTerminal ref="taskTerminalRef" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-execution-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #252526;
  color: #cccccc;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a1a1a;
  border-bottom: 1px solid #3e3e42;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #969696;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  background: #3e3e42;
  color: #cccccc;
  font-size: 12px;
  font-weight: 500;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover:not(:disabled) {
  background: #4e4e52;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-btn {
  background: #007acc;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #0062a3;
}

.btn-icon {
  font-size: 14px;
}

.filter-select {
  padding: 4px 8px;
  background: #3e3e42;
  border: 1px solid #4e4e52;
  color: #cccccc;
  font-size: 12px;
  border-radius: 3px;
  outline: none;
}

.search-input {
  padding: 4px 8px;
  width: 200px;
  background: #3e3e42;
  border: 1px solid #4e4e52;
  color: #cccccc;
  font-size: 12px;
  border-radius: 3px;
  outline: none;
}

.search-input:focus {
  border-color: #007acc;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.tree-panel {
  overflow-y: auto;
  min-width: 300px;
  position: relative;
}

.detail-panel {
  flex: 1;
  min-width: 300px;
  background: #1e1e1e;
  position: relative;
  display: flex;
  flex-direction: column;
}

.resize-handle {
  width: 4px;
  background: #3e3e42;
  cursor: col-resize;
  position: relative;
  transition: background-color 0.15s ease;
}

.resize-handle:hover {
  background: #007acc;
}

.resize-handle.dragging {
  background: #007acc;
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}

.loading,
.empty-state,
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #969696;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #007acc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.rotating {
  animation: spin 1s linear infinite;
}

.tree-list {
  padding: 8px;
}

.iteration-item {
  margin-bottom: 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.iteration-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.iteration-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.expand-icon {
  font-size: 10px;
  transition: transform 0.15s ease;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.iteration-name {
  font-weight: 500;
  color: #cccccc;
}

.task-count {
  margin-left: auto;
  font-size: 11px;
  color: #969696;
}

.iteration-content {
  padding: 0 12px 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin: 4px 0;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 3px;
}

.info-icon {
  font-size: 14px;
}

.info-label {
  font-size: 12px;
  color: #969696;
}

.info-value {
  font-size: 12px;
  color: #d4d4d4;
}

.executed-badge {
  margin-left: auto;
  padding: 2px 6px;
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  font-size: 10px;
  font-weight: 600;
  border-radius: 10px;
}

.tasks-section {
  margin-top: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin: 4px 0;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 3px;
}

.section-icon {
  font-size: 14px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: #969696;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 0;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.task-item:hover {
  background: #2d2d30;
}

.task-item.selected {
  background: rgba(0, 122, 204, 0.1);
  border-color: #007acc;
}

.status-pending {
  color: #969696;
}

.status-executing {
  color: #007acc;
}

.status-success {
  color: #4caf50;
}

.status-failed {
  color: #f44336;
}

.task-info {
  flex: 1;
  cursor: pointer;
}

.task-title {
  font-size: 13px;
  color: #cccccc;
}

.task-description {
  font-size: 11px;
  color: #969696;
  margin-top: 2px;
}

.task-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
}

.terminal-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: #969696;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.terminal-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #007acc;
}

.panel-tabs {
  display: flex;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.panel-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #969696;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.panel-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.panel-tab.active {
  background: #1e1e1e;
  color: #ffffff;
  border-bottom: 2px solid #007acc;
}

.terminal-panel {
  position: absolute;
  top: 33px;
  left: 0;
  right: 0;
  bottom: 0;
}

.task-detail,
.execution-log {
  padding: 16px;
}

.detail-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 11px;
  color: #969696;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span,
.detail-item code {
  font-size: 13px;
  color: #d4d4d4;
}

.command-text {
  padding: 4px 8px;
  background: #0e0e0e;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #4ec9b0;
}

.result-section {
  margin-top: 16px;
}

.result-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #969696;
}

/* 复选框样式 */
input[type="checkbox"] {
  -webkit-appearance: checkbox;
  appearance: checkbox;
  width: 14px;
  height: 14px;
  margin: 1px 1px 0 1px;
  cursor: pointer;
  flex-shrink: 0;
}

input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 滚动条样式 */
.tree-panel::-webkit-scrollbar,
.detail-panel::-webkit-scrollbar {
  width: 10px;
}

.tree-panel::-webkit-scrollbar-track,
.detail-panel::-webkit-scrollbar-track {
  background: transparent;
}

.tree-panel::-webkit-scrollbar-thumb,
.detail-panel::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.tree-panel::-webkit-scrollbar-thumb:hover,
.detail-panel::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>