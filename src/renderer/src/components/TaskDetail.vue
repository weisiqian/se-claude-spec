<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import defaultTaskPromptContent from '@renderer/assets/default-task-prompt.md?raw'

interface TaskData {
  id: string
  iterationId: string
  userTaskRequest: string
  prompt: string
  jsonSchema?: string
  requirementIterationId?: string
  designIterationId?: string
  createdAt: string
  updatedAt?: string
  executionStatus?: string
}

const props = defineProps<{
  task: TaskData
  editMode?: boolean
  startInEditMode?: boolean
}>()

const emit = defineEmits<{
  close: []
  back: []
  update: [data: TaskData]
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 默认提示词
const DEFAULT_TASK_PROMPT = defaultTaskPromptContent

// 表单数据
const userTaskRequest = ref('')
const prompt = ref('')
const jsonSchema = ref('')

// 原始数据备份（用于检测变更）
const originalData = ref({
  userTaskRequest: '',
  prompt: '',
  jsonSchema: ''
})

// 状态
const isEditing = ref(props.editMode || props.startInEditMode || false)
const isSaving = ref(false)
const isLoading = ref(false)
const isExecuting = ref(false)
const showGeneratedCommand = ref(false)

// 执行状态
const executionStatus = ref<'not_executed' | 'executed'>('not_executed')
const taskContent = ref('')

// 关联文档内容
const requirementsContent = ref('')
const designContent = ref('')
const hasRequirementsDoc = ref(false)
const hasDesignDoc = ref(false)

// 定时刷新相关
const autoRefreshTimer = ref<NodeJS.Timeout | null>(null)
const AUTO_REFRESH_INTERVAL = 5000 // 5秒自动刷新

// 编辑模式下不需要这些数据，因为不允许修改关联

// 命令相关
const generatedCommand = computed(() => `claude "/${props.task.iterationId}:task"`)

// 检测内容是否有变更
const hasUnsavedChanges = computed(() => {
  return userTaskRequest.value !== originalData.value.userTaskRequest ||
         prompt.value !== originalData.value.prompt ||
         jsonSchema.value !== originalData.value.jsonSchema
})


// 占位符数据，用于预览时替换
const placeholderData = computed(() => ({
  userTaskRequest: props.task.userTaskRequest || '',
  userRequirement: props.task.requirementIterationId ? '关联需求内容' : '',
  userDesignRequest: props.task.designIterationId ? '关联设计内容' : '',
  jsonSchema: props.task.jsonSchema || '',
  iterationId: props.task.iterationId || ''
}))

// 加载关联文档内容
const loadRelatedDocuments = async (iterationId?: string) => {
  const targetId = iterationId || props.task.requirementIterationId || props.task.designIterationId || props.task.iterationId
  if (!targetId) {
    requirementsContent.value = ''
    designContent.value = ''
    hasRequirementsDoc.value = false
    hasDesignDoc.value = false
    return
  }
  
  try {
    // 加载需求文档
    const reqResult = await window.api.checkRequirementStatus(targetId)
    if (reqResult.executed && reqResult.content) {
      requirementsContent.value = reqResult.content
      hasRequirementsDoc.value = true
    } else {
      requirementsContent.value = ''
      hasRequirementsDoc.value = false
    }
    
    // 加载设计文档
    const designResult = await window.api.checkDesignStatus(targetId)
    if (designResult.executed && designResult.content) {
      designContent.value = designResult.content
      hasDesignDoc.value = true
    } else {
      designContent.value = ''
      hasDesignDoc.value = false
    }
  } catch (error) {
    console.error('加载关联文档失败:', error)
  }
}

// 初始化表单数据
const initFormData = () => {
  userTaskRequest.value = props.task.userTaskRequest || ''
  prompt.value = props.task.prompt || DEFAULT_TASK_PROMPT
  jsonSchema.value = props.task.jsonSchema || ''
  
  // 备份原始数据
  originalData.value = {
    userTaskRequest: userTaskRequest.value,
    prompt: prompt.value,
    jsonSchema: jsonSchema.value
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  if (isEditing.value) {
    // 退出编辑模式，恢复原数据
    initFormData()
  }
  isEditing.value = !isEditing.value
}

// 重置表单
const handleReset = () => {
  initFormData()
}

// 取消编辑
const handleCancel = () => {
  // 恢复原始数据并退出编辑模式
  initFormData()
  isEditing.value = false
}

// 保存任务
const handleSave = async () => {
  isSaving.value = true
  try {
    const updatedTask = {
      ...props.task,
      userTaskRequest: userTaskRequest.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value,
      updatedAt: new Date().toISOString()
    }
    
    // 调用保存API
    await window.api.updateTask(updatedTask)
    
    // 更新原始数据备份
    originalData.value = {
      userTaskRequest: userTaskRequest.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value
    }
    
    // 触发更新事件
    emit('update', updatedTask)
    
    // 退出编辑模式
    isEditing.value = false
  } catch (error) {
    console.error('保存任务失败:', error)
    alert('保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 保存并执行
const handleSaveAndExecute = async () => {
  isSaving.value = true
  try {
    const updatedTask = {
      ...props.task,
      userTaskRequest: userTaskRequest.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value,
      updatedAt: new Date().toISOString()
    }
    
    // 调用保存API
    await window.api.updateTask(updatedTask)
    
    // 更新原始数据备份
    originalData.value = {
      userTaskRequest: userTaskRequest.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value
    }
    
    // 触发更新事件
    emit('update', updatedTask)
    
    // 退出编辑模式
    isEditing.value = false
    
    // 执行命令
    setTimeout(() => {
      handleExecuteCommand()
    }, 500)
  } catch (error) {
    console.error('保存任务失败:', error)
    alert('保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}



// 显示命令
const handleGenerateCommand = async () => {
  // 编辑模式下只显示命令，不保存数据
  showGeneratedCommand.value = true
}


// 执行命令
const handleExecuteCommand = () => {
  emit('executeCommand', generatedCommand.value)
  
  // 延迟后检查状态
  setTimeout(() => {
    checkExecutionStatus()
  }, 5000)
}

// 复制命令
const copySuccessMessage = ref(false)
const copyCommand = async () => {
  await navigator.clipboard.writeText(generatedCommand.value)
  copySuccessMessage.value = true
  setTimeout(() => {
    copySuccessMessage.value = false
  }, 2000)
}

// 检查任务执行状态
const checkExecutionStatus = async () => {
  isLoading.value = true
  try {
    const result = await window.api.checkTaskStatus(props.task.iterationId)
    if (result.executed) {
      executionStatus.value = 'executed'
      taskContent.value = result.content || ''
      // 已执行，停止自动刷新
      stopAutoRefresh()
    } else {
      executionStatus.value = 'not_executed'
      taskContent.value = ''
      // 未执行，启动自动刷新
      startAutoRefresh()
    }
  } catch (error) {
    console.error('检查任务状态失败:', error)
    executionStatus.value = 'not_executed'
  } finally {
    isLoading.value = false
  }
}

// 启动自动刷新
const startAutoRefresh = () => {
  // 先清除旧的定时器
  stopAutoRefresh()
  
  // 设置新的定时器
  autoRefreshTimer.value = setInterval(() => {
    if (executionStatus.value === 'not_executed' && !isLoading.value) {
      checkExecutionStatus()
    }
  }, AUTO_REFRESH_INTERVAL)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 刷新状态
const handleRefresh = () => {
  checkExecutionStatus()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '未设置'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(async () => {
  initFormData()
  checkExecutionStatus()
  loadRelatedDocuments()
  
  // 编辑模式下不需要加载迭代列表，因为不允许修改关联
})

onUnmounted(() => {
  // 组件销毁时清理定时器
  stopAutoRefresh()
})
</script>

<template>
  <div class="task-detail" :class="{ 'dark': isDark }">
    <div class="detail-header">
      <div class="header-left">
        <button class="back-btn" @click="emit('back')" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="detail-title">{{ isEditing ? '编辑任务' : '任务详情' }}</h3>
        <span class="iteration-badge">{{ task.iterationId }}</span>
      </div>
      <div class="header-actions">
        <button v-if="!isEditing" class="edit-btn" @click="toggleEditMode" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="close-btn" @click="emit('close')" title="关闭">×</button>
      </div>
    </div>
    
    <div class="detail-content">
      <!-- 查看模式 -->
      <div v-if="!isEditing" class="view-mode">
        <!-- 基本信息 -->
        <div class="info-section">
          <h4 class="section-title">基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>迭代ID：</label>
              <span>{{ task.iterationId }}</span>
            </div>
            <div class="info-item">
              <label>创建时间：</label>
              <span>{{ formatDate(task.createdAt) }}</span>
            </div>
            <div v-if="task.updatedAt" class="info-item">
              <label>更新时间：</label>
              <span>{{ formatDate(task.updatedAt) }}</span>
            </div>
            <div v-if="task.requirementIterationId || task.designIterationId" class="info-item">
              <label>关联需求/设计：</label>
              <span class="relation-badge">迭代 {{ task.requirementIterationId || task.designIterationId }}</span>
            </div>
            <div class="info-item full-width">
              <label>执行状态：</label>
              <span class="status-badge" :class="executionStatus">
                <span v-if="executionStatus === 'not_executed'" class="status-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </span>
                <span v-else class="status-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </span>
                {{ executionStatus === 'not_executed' ? '未执行' : '已执行' }}
              </span>
              <button class="refresh-btn" @click="handleRefresh" :disabled="isLoading" title="刷新状态">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" :class="{ 'rotating': isLoading }">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 关联需求文档 -->
        <div v-if="hasRequirementsDoc && requirementsContent" class="info-section">
          <h4 class="section-title">
            关联需求文档
            <span class="result-path">(.design/{{ task.requirementIterationId || task.iterationId }}/specs/requirements.md)</span>
          </h4>
          <MonacoEditor
            :modelValue="requirementsContent"
            language="markdown"
            :height="250"
            :read-only="true"
            :enable-maximize="true"
            :enable-preview="true"
          />
        </div>
        
        <!-- 任务要求 -->
        <div class="info-section">
          <h4 class="section-title">任务要求</h4>
          <div class="description-content">{{ task.userTaskRequest || '暂无任务要求' }}</div>
        </div>
        
        <!-- 关联设计文档 -->
        <div v-if="hasDesignDoc && designContent" class="info-section">
          <h4 class="section-title">
            关联设计文档
            <span class="result-path">(.design/{{ task.designIterationId || task.iterationId }}/specs/design.md)</span>
          </h4>
          <MonacoEditor
            :modelValue="designContent"
            language="markdown"
            :height="250"
            :read-only="true"
            :enable-maximize="true"
            :enable-preview="true"
          />
        </div>
        
        
        <!-- 生成的命令 -->
        <div class="info-section">
          <h4 class="section-title">生成的命令</h4>
          <div class="command-box">
            <code class="command-text">{{ generatedCommand }}</code>
            <div class="command-actions">
              <button class="copy-btn" @click="copyCommand" title="复制命令">
                <svg v-if="!copySuccessMessage" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.5 1h-7A1.5 1.5 0 0 0 2 2.5v10A1.5 1.5 0 0 0 3.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 10.5 1zM3.5 2h7a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5z"/>
                  <path d="M13.5 4H14a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 14 17H6.5A1.5 1.5 0 0 1 5 15.5V15h1v.5a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-.5V4z"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                {{ copySuccessMessage ? '已复制' : '复制' }}
              </button>
              <button 
                class="execute-btn"
                @click="handleExecuteCommand"
              >
                <span class="btn-icon">▶</span>
                {{ executionStatus === 'executed' ? '重新执行' : '执行命令' }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 提示词 -->
        <div class="info-section">
          <h4 class="section-title">
            提示词
            <span class="section-hint">（只读，预览时自动替换变量）</span>
          </h4>
          <MonacoEditor
            :modelValue="prompt"
            language="markdown"
            :height="200"
            :min-height="150"
            :max-height="400"
            :read-only="true"
            :enable-maximize="true"
            :enable-preview="true"
            :enable-placeholder="true"
            :placeholder-data="placeholderData"
          />
        </div>
        
        <!-- JSON Schema -->
        <div v-if="task.jsonSchema" class="info-section">
          <h4 class="section-title">JSON Schema</h4>
          <MonacoEditor
            :modelValue="jsonSchema"
            language="json"
            :height="200"
            :min-height="150"
            :max-height="400"
            :read-only="true"
            :enable-maximize="true"
          />
        </div>
        
        <!-- 执行结果 -->
        <div v-if="executionStatus === 'executed' && taskContent" class="info-section">
          <h4 class="section-title">
            执行结果
            <span class="result-path">(.design/{{ task.iterationId }}/specs/tasks.md)</span>
          </h4>
          <MonacoEditor
            :modelValue="taskContent"
            language="markdown"
            :height="300"
            :read-only="true"
            :enable-maximize="true"
            :enable-preview="true"
          />
        </div>
      </div>
      
      <!-- 编辑模式 -->
      <div v-else class="edit-mode">
        <div class="form-section">
          <!-- 关联需求/设计（只读） -->
          <div class="form-group">
            <label class="form-label">
              关联需求/设计
              <span class="input-hint">编辑时不可修改</span>
            </label>
            <div class="readonly-field">
              <span class="iteration-badge-readonly">迭代 {{ task.requirementIterationId || task.designIterationId || task.iterationId }}</span>
            </div>
          </div>
          
          <!-- 任务要求 -->
          <div class="form-group">
            <label class="form-label">
              任务要求
              <span class="required">*</span>
            </label>
            <textarea
              v-model="userTaskRequest"
              class="form-textarea"
              placeholder="请输入任务要求..."
              rows="6"
              required
            ></textarea>
          </div>
          
          <!-- 关联需求文档 -->
          <div v-if="hasRequirementsDoc && requirementsContent" class="form-group">
            <label class="form-label">
              关联需求文档
              <span class="doc-path">(.design/{{ task.requirementIterationId || task.iterationId }}/specs/requirements.md)</span>
            </label>
            <MonacoEditor
              :modelValue="requirementsContent"
              language="markdown"
              :height="200"
              :read-only="true"
              :enable-maximize="true"
              :enable-preview="true"
            />
          </div>
          
          <!-- 关联设计文档 -->
          <div v-if="hasDesignDoc && designContent" class="form-group">
            <label class="form-label">
              关联设计文档
              <span class="doc-path">(.design/{{ task.designIterationId || task.iterationId }}/specs/design.md)</span>
            </label>
            <MonacoEditor
              :modelValue="designContent"
              language="markdown"
              :height="200"
              :read-only="true"
              :enable-maximize="true"
              :enable-preview="true"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">
              提示词
              <span class="required">*</span>
              <span class="input-hint">（支持Markdown和变量替换）</span>
            </label>
            <MonacoEditor
              v-model="prompt"
              language="markdown"
              :height="200"
              :min-height="150"
              :max-height="400"
              :read-only="false"
              :enable-maximize="true"
              :enable-preview="true"
              :enable-placeholder="true"
              :placeholder-data="{
                userTaskRequest: userTaskRequest || '任务要求将在这里显示',
                userRequirement: '关联需求内容',
                userDesignRequest: '关联设计内容',
                jsonSchema: jsonSchema || 'JSON Schema 将在这里显示',
                iterationId: task.iterationId || '迭代ID将在这里显示'
              }"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">
              JSON Schema
              <span class="input-hint">（可选）</span>
            </label>
            <MonacoEditor
              v-model="jsonSchema"
              language="json"
              :height="250"
              :min-height="150"
              :max-height="500"
              :read-only="false"
              :enable-maximize="true"
            />
          </div>
        </div>
        
        <!-- 生成的命令 -->
        <transition name="fade">
          <div v-if="showGeneratedCommand" class="command-result">
            <h4 class="section-title">生成的命令</h4>
            <div class="command-box">
              <code class="command-text">{{ generatedCommand }}</code>
              <div class="command-actions">
                <button class="copy-btn" @click="copyCommand" title="复制命令">
                  <svg v-if="!copySuccessMessage" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10.5 1h-7A1.5 1.5 0 0 0 2 2.5v10A1.5 1.5 0 0 0 3.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 10.5 1zM3.5 2h7a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5z"/>
                    <path d="M13.5 4H14a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 14 17H6.5A1.5 1.5 0 0 1 5 15.5V15h1v.5a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-.5V4z"/>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                  </svg>
                  {{ copySuccessMessage ? '已复制' : '复制' }}
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>检查执行状态...</span>
      </div>
    </div>
    
    <!-- 操作按钮（固定在底部） -->
    <div class="edit-actions" v-if="isEditing">
        <button 
            class="action-btn reset-btn"
            @click="handleReset"
            :disabled="isSaving"
            title="重置到原始内容"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            重置
          </button>
          
          <button 
            class="action-btn generate-btn"
            @click="handleGenerateCommand"
            :disabled="isSaving"
          >
            <span class="btn-icon">⚡</span>
            生成命令
          </button>
          
          <button 
            v-if="showGeneratedCommand"
            class="action-btn execute-btn"
            @click="handleExecuteCommand"
            :disabled="isExecuting"
          >
            <span class="btn-icon">▶</span>
            {{ isExecuting ? '执行中...' : '执行命令' }}
          </button>
          
          <div class="actions-right">
            <button class="action-btn cancel-btn" @click="handleCancel" :disabled="isSaving">
              取消
            </button>
            <button 
              class="action-btn save-btn"
              @click="handleSave"
              :disabled="isSaving || !hasUnsavedChanges"
            >
              {{ isSaving ? '保存中...' : '保存更改' }}
            </button>
            <button 
              class="action-btn save-execute-btn"
              @click="handleSaveAndExecute"
              :disabled="isSaving || !hasUnsavedChanges"
            >
              保存并执行
            </button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.task-detail {
  width: 100%;
  height: 100%;
  background: #252526;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #3e3e42;
  position: relative;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a1a1a;
  border-bottom: 1px solid #3e3e42;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #969696;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.detail-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
}

.iteration-badge {
  padding: 2px 10px;
  background: rgba(0, 122, 204, 0.2);
  color: #007acc;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn,
.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #969696;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.edit-btn:hover {
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
}

.close-btn {
  font-size: 20px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 100px; /* 为固定底部按钮留出空间 */
}

/* 查看模式 */
.view-mode {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  padding: 16px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #969696;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-path {
  font-size: 11px;
  color: #6e6e6e;
  text-transform: none;
  font-weight: normal;
}

.section-hint {
  font-size: 11px;
  color: #6e6e6e;
  text-transform: none;
  font-weight: normal;
  font-style: italic;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-size: 13px;
  color: #969696;
  min-width: 80px;
}

.info-item span {
  font-size: 13px;
  color: #d4d4d4;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.not_executed {
  background: rgba(255, 255, 255, 0.1);
  color: #969696;
}

.status-badge.executed {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-icon svg {
  width: 16px;
  height: 16px;
}

.refresh-btn {
  margin-left: 8px;
  padding: 4px;
  background: transparent;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #969696;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
  border-color: #4e4e52;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 14px;
  height: 14px;
}

.refresh-btn svg.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.description-content {
  font-size: 13px;
  color: #d4d4d4;
  line-height: 1.6;
  white-space: pre-wrap;
  padding: 12px;
  background: #0e0e0e;
  border: 1px solid #2d2d30;
  border-radius: 4px;
}

.relation-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.relation-item label {
  font-size: 13px;
  color: #969696;
}

.relation-badge {
  padding: 2px 10px;
  background: rgba(156, 39, 176, 0.15);
  color: #9c27b0;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
}

/* 命令区域 */
.command-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.command-text {
  flex: 1;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #4ec9b0;
}

.command-actions {
  display: flex;
  gap: 8px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #0e639c;
  border: none;
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #1177bb;
}

.execute-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #16825d;
  border: none;
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.execute-btn:hover {
  background: #1a9b6e;
}

.btn-icon {
  font-size: 14px;
}

/* 编辑模式 */
.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #cccccc;
}

.required {
  color: #f48771;
  font-size: 16px;
}

.optional {
  color: #767676;
  font-size: 12px;
}

.input-hint {
  color: #767676;
  font-size: 12px;
  margin-left: auto;
}

.doc-path {
  font-size: 11px;
  color: #6e6e6e;
  font-weight: normal;
  margin-left: 8px;
}

.readonly-field {
  padding: 8px 12px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.iteration-badge-readonly {
  padding: 4px 12px;
  background: rgba(156, 39, 176, 0.15);
  color: #9c27b0;
  font-size: 13px;
  font-weight: 600;
  border-radius: 12px;
}

/* 编辑模式命令结果 */
.command-result {
  margin: 20px 0;
  padding: 16px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 6px;
}

.command-result .section-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #969696;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 操作按钮 */
.actions-right {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.reset-btn {
  background: #3e3e42;
  color: #cccccc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reset-btn:hover:not(:disabled) {
  background: #4e4e52;
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

.generate-btn {
  background: #0e639c;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.generate-btn:hover:not(:disabled) {
  background: #1177bb;
}

.execute-btn.action-btn {
  background: #16825d;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.execute-btn.action-btn:hover:not(:disabled) {
  background: #1a9b6e;
}

.auto-generate-btn {
  margin-left: auto;
  padding: 4px 10px;
  background: #0e639c;
  border: none;
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
}

.auto-generate-btn:hover:not(:disabled) {
  background: #1177bb;
}

.auto-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #3e3e42;
  background: #1e1e1e;
  color: #d4d4d4;
  font-size: 14px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  border-radius: 4px;
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #007acc;
  background: #1a1a1a;
}

.form-textarea {
  resize: vertical;
  line-height: 1.5;
}

.readonly-textarea {
  background: #1a1a1a !important;
  color: #969696 !important;
  cursor: not-allowed !important;
  opacity: 0.8;
}

.edit-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 20px 24px;
  background: #252526;
  border-top: 1px solid #3e3e42;
  z-index: 10;
}

.actions-right {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.action-btn {
  padding: 8px 20px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-btn {
  background: #3e3e42;
  color: #cccccc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reset-btn:hover:not(:disabled) {
  background: #4e4e52;
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

.cancel-btn {
  background: #3e3e42;
  color: #cccccc;
}

.cancel-btn:hover:not(:disabled) {
  background: #4e4e52;
}

.save-btn {
  background: #007acc;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #0062a3;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-execute-btn {
  background: #16825d;
  color: white;
}

.save-execute-btn:hover:not(:disabled) {
  background: #1a9b6e;
}

.save-execute-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #0e639c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay span {
  font-size: 13px;
  color: #969696;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.detail-content::-webkit-scrollbar {
  width: 10px;
}

.detail-content::-webkit-scrollbar-track {
  background: transparent;
}

.detail-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.detail-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>