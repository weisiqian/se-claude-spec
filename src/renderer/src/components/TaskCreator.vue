<script setup lang="ts">
import { ref, inject, computed, onMounted, watch } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import defaultTaskPromptContent from '@renderer/assets/default-task-prompt.md?raw'

const props = defineProps<{
  projectPath?: string | null
  requirementId?: string
  designId?: string
}>()

const emit = defineEmits<{
  close: []
  back: []
  submit: [data: { 
    iterationId: string
    userTaskRequest: string
    prompt: string
    jsonSchema?: string
    requirementIterationId?: string
    designIterationId?: string
  }]
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 默认提示词
const DEFAULT_TASK_PROMPT = defaultTaskPromptContent

// 关联文档内容
const requirementsContent = ref('')
const designContent = ref('')
const hasRequirementsDoc = ref(false)
const hasDesignDoc = ref(false)
const isLoadingDocs = ref(false)

const userTaskRequest = ref('')
const prompt = ref(DEFAULT_TASK_PROMPT)
const jsonSchema = ref('')
const isSaving = ref(false)
const isExecuting = ref(false)
const generatedCommand = ref('')
const showCommandResult = ref(false)

// 加载关联的需求和设计（一一对应）
const iterations = ref<Array<{
  id: string
  title: string
  hasRequirement: boolean
  hasDesign: boolean
  hasTask: boolean
}>>([])
const selectedIteration = ref('')

// 计算属性：判断提示词是否与默认值不同
const isPromptModified = computed(() => {
  return prompt.value !== DEFAULT_TASK_PROMPT
})

// 计算属性：判断是否有未保存的内容
const hasUnsavedContent = computed(() => {
  return selectedIteration.value || userTaskRequest.value || (prompt.value && prompt.value !== DEFAULT_TASK_PROMPT) || jsonSchema.value
})

const handleResetPrompt = () => {
  if (prompt.value !== DEFAULT_TASK_PROMPT) {
    prompt.value = DEFAULT_TASK_PROMPT
    console.log('提示词已重置为默认值')
  }
}

const handleGenerateCommand = async () => {
  if (!selectedIteration.value) {
    alert('请选择关联的需求/设计')
    return
  }
  
  // 任务要求不是必填的，可以为空
  
  isSaving.value = true
  try {
    // 保存任务数据，使用选中的迭代ID作为任务的迭代ID
    const taskData = {
      iterationId: selectedIteration.value,  // 使用关联的迭代ID
      userTaskRequest: userTaskRequest.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value || undefined,
      requirementIterationId: selectedIteration.value,
      designIterationId: selectedIteration.value,  // 使用相同的迭代ID
      createdAt: new Date().toISOString()
    }
    
    // 使用 window.api 调用主进程方法
    const result = await window.api.saveTask(taskData)
    
    if (result.success) {
      // 生成 claude 命令
      generatedCommand.value = `claude "/${selectedIteration.value}:task"`
      showCommandResult.value = true
      
      // 触发提交事件
      emit('submit', taskData)
    } else {
      alert('保存失败: ' + result.error)
    }
  } catch (error) {
    console.error('生成命令失败:', error)
    alert('生成命令失败')
  } finally {
    isSaving.value = false
  }
}

const handleExecuteCommand = async () => {
  if (!generatedCommand.value) {
    alert('请先生成命令')
    return
  }
  
  isExecuting.value = true
  try {
    // 触发执行命令事件
    emit('executeCommand', generatedCommand.value)
  } finally {
    isExecuting.value = false
  }
}

const handleReset = () => {
  userTaskRequest.value = ''
  prompt.value = DEFAULT_TASK_PROMPT
  jsonSchema.value = ''
  generatedCommand.value = ''
  showCommandResult.value = false
  selectedIteration.value = ''
}

const copySuccessMessage = ref(false)
const copyCommand = async () => {
  if (generatedCommand.value) {
    await navigator.clipboard.writeText(generatedCommand.value)
    copySuccessMessage.value = true
    setTimeout(() => {
      copySuccessMessage.value = false
    }, 2000)
  }
}

// 添加一个状态来控制是否显示未保存提示
const showUnsavedWarning = ref(false)
const pendingAction = ref<'close' | 'back' | null>(null)

const handleClose = () => {
  if (generatedCommand.value) {
    emit('close')
  } else if (hasUnsavedContent.value) {
    pendingAction.value = 'close'
    showUnsavedWarning.value = true
  } else {
    emit('close')
  }
}

const handleBack = () => {
  if (generatedCommand.value) {
    emit('back')
  } else if (hasUnsavedContent.value) {
    pendingAction.value = 'back'
    showUnsavedWarning.value = true
  } else {
    emit('back')
  }
}

const confirmLeave = () => {
  showUnsavedWarning.value = false
  if (pendingAction.value === 'close') {
    emit('close')
  } else if (pendingAction.value === 'back') {
    emit('back')
  }
  pendingAction.value = null
}

const cancelLeave = () => {
  showUnsavedWarning.value = false
  pendingAction.value = null
}

// 加载关联文档内容
const loadRelatedDocuments = async () => {
  if (!selectedIteration.value) {
    requirementsContent.value = ''
    designContent.value = ''
    hasRequirementsDoc.value = false
    hasDesignDoc.value = false
    return
  }
  
  isLoadingDocs.value = true
  try {
    // 加载需求文档
    const reqResult = await window.api.checkRequirementStatus(selectedIteration.value)
    if (reqResult.executed && reqResult.content) {
      requirementsContent.value = reqResult.content
      hasRequirementsDoc.value = true
    } else {
      requirementsContent.value = ''
      hasRequirementsDoc.value = false
    }
    
    // 加载设计文档
    const designResult = await window.api.checkDesignStatus(selectedIteration.value)
    if (designResult.executed && designResult.content) {
      designContent.value = designResult.content
      hasDesignDoc.value = true
    } else {
      designContent.value = ''
      hasDesignDoc.value = false
    }
  } catch (error) {
    console.error('加载关联文档失败:', error)
  } finally {
    isLoadingDocs.value = false
  }
}

// 监听选中的迭代变化
watch(selectedIteration, () => {
  loadRelatedDocuments()
})

// 加载迭代列表（包含需求和设计信息）
onMounted(async () => {
  try {
    // 加载需求、设计和任务列表
    const [requirementsList, designsList, tasksList] = await Promise.all([
      window.api.getRequirements(),
      window.api.getDesigns(),
      window.api.getTasks()
    ])
    
    // 创建任务迭代ID集合
    const taskIterationIds = new Set(tasksList.map((task: any) => task.iterationId))
    
    // 创建迭代数组，确保需求和设计一一对应
    const iterationsWithBoth: Array<{ id: string, title: string, hasRequirement: boolean, hasDesign: boolean, hasTask: boolean }> = []
    
    // 遍历需求列表，找到对应的设计
    requirementsList.forEach(req => {
      const hasDesign = designsList.some(design => design.iterationId === req.iterationId)
      if (hasDesign) {
        iterationsWithBoth.push({
          id: req.iterationId,
          title: `迭代 ${req.iterationId}`,
          hasRequirement: true,
          hasDesign: true,
          hasTask: taskIterationIds.has(req.iterationId)
        })
      }
    })
    
    // 按迭代ID排序
    iterations.value = iterationsWithBoth.sort((a, b) => a.id.localeCompare(b.id))
      
    // 如果传入了初始值，设置选中的迭代
    if (props.requirementId || props.designId) {
      selectedIteration.value = props.requirementId || props.designId || ''
      // 加载关联文档
      loadRelatedDocuments()
    }
  } catch (error) {
    console.error('加载列表失败:', error)
  }
})
</script>

<template>
  <div class="task-creator" :class="{ 'dark': isDark }">
    <div class="creator-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="creator-title">新建任务</h3>
      </div>
      <button class="close-btn" @click="handleClose" title="关闭">×</button>
    </div>
    
    <div class="creator-content">
      <div class="form-section">
        <div class="form-group">
          <label class="form-label">
            关联需求/设计
            <span class="required">*</span>
            <span class="input-hint">需求和设计是一一对应的</span>
          </label>
          <select v-model="selectedIteration" class="form-select" :disabled="isSaving || isExecuting">
            <option value="">请选择迭代</option>
            <option 
              v-for="iter in iterations" 
              :key="iter.id" 
              :value="iter.id"
              :disabled="iter.hasTask"
            >
              {{ iter.title }}
              <template v-if="iter.hasTask"> (已有任务)</template>
            </option>
          </select>
        </div>
        
        <!-- 关联需求文档 -->
        <div v-if="hasRequirementsDoc && requirementsContent" class="form-group">
          <label class="form-label">
            关联需求文档
            <span class="doc-path">(.design/{{ selectedIteration }}/specs/requirements.md)</span>
          </label>
          <MonacoEditor
            :modelValue="requirementsContent"
            language="markdown"
            :height="250"
            :read-only="true"
            :enable-maximize="true"
            :enable-preview="true"
          />
        </div>
        
        <!-- 关联设计文档 -->
        <div v-if="hasDesignDoc && designContent" class="form-group">
          <label class="form-label">
            关联设计文档
            <span class="doc-path">(.design/{{ selectedIteration }}/specs/design.md)</span>
          </label>
          <MonacoEditor
            :modelValue="designContent"
            language="markdown"
            :height="250"
            :read-only="true"
            :enable-maximize="true"
            :enable-preview="true"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            任务要求
            <span class="optional">(可选)</span>
          </label>
          <textarea
            v-model="userTaskRequest"
            class="form-textarea"
            placeholder="请输入任务要求（可选）..."
            rows="6"
            :disabled="isSaving || isExecuting"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            提示词
            <transition name="fade">
              <button 
                v-if="isPromptModified"
                class="auto-generate-btn"
                @click="handleResetPrompt"
                :disabled="isExecuting"
                title="重置为默认提示词"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
                重置提示词
              </button>
            </transition>
          </label>
          <MonacoEditor
            v-model="prompt"
            language="markdown"
            :height="200"
            :min-height="150"
            :max-height="400"
            placeholder="输入或自动生成提示词..."
            :readonly="isExecuting"
            :enable-maximize="true"
            :enable-preview="true"
            :enable-placeholder="true"
            :placeholder-data="{
              userTaskRequest: userTaskRequest || '任务要求将在这里显示',
              userRequirement: selectedIteration ? '关联需求内容' : '无关联需求',
              userDesignRequest: selectedIteration ? '关联设计内容' : '无关联设计',
              jsonSchema: jsonSchema || 'JSON Schema 将在这里显示',
              iterationId: selectedIteration || '迭代ID将在这里显示'
            }"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            JSON Schema
            <span class="optional">(可选)</span>
          </label>
          <MonacoEditor
            v-model="jsonSchema"
            language="json"
            :height="250"
            :min-height="150"
            :max-height="500"
            placeholder="输入 JSON Schema 定义（可选）..."
            :readonly="isExecuting"
            :enable-maximize="true"
          />
        </div>
      </div>
      
      <!-- 命令生成结果 -->
      <transition name="fade">
        <div v-if="showCommandResult" class="command-result">
          <div class="command-result-header">
            <span class="result-label">生成的命令：</span>
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
          <div class="command-display">
            <code>{{ generatedCommand }}</code>
          </div>
        </div>
      </transition>
      
      <div class="action-buttons">
        <button 
          class="action-btn generate-btn"
          @click="handleGenerateCommand"
          :disabled="!selectedIteration || isSaving || isExecuting"
        >
          <span class="btn-icon">⚡</span>
          {{ isSaving ? '生成中...' : '生成命令' }}
        </button>
        
        <button 
          class="action-btn execute-btn"
          @click="handleExecuteCommand"
          :disabled="!generatedCommand || isExecuting"
        >
          <span class="btn-icon">▶</span>
          {{ isExecuting ? '执行中...' : '执行命令' }}
        </button>
        
        <button 
          class="action-btn reset-btn"
          @click="handleReset"
          :disabled="isSaving || isExecuting"
        >
          <span class="btn-icon">↻</span>
          重置
        </button>
      </div>
    </div>
    
    <!-- 未保存提示 -->
    <transition name="modal-fade">
      <div v-if="showUnsavedWarning" class="unsaved-warning-overlay" @click.self="cancelLeave">
        <div class="unsaved-warning-dialog">
          <div class="warning-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="warning-title">未保存的更改</h3>
          <p class="warning-message">
            您有未保存的内容，确定要{{ pendingAction === 'close' ? '关闭' : '返回' }}吗？
          </p>
          <div class="warning-actions">
            <button class="warning-btn cancel-btn" @click="cancelLeave">
              继续编辑
            </button>
            <button class="warning-btn confirm-btn" @click="confirmLeave">
              {{ pendingAction === 'close' ? '关闭' : '返回' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.task-creator {
  width: 100%;
  height: 100%;
  background: #252526;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #3e3e42;
}

.creator-header {
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

.back-btn svg {
  width: 16px;
  height: 16px;
}

.creator-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
  letter-spacing: 0.3px;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #969696;
  font-size: 20px;
  cursor: pointer;
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

.creator-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px;
}

.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

.doc-path {
  font-size: 11px;
  color: #6e6e6e;
  font-weight: normal;
  margin-left: 8px;
}

.input-hint {
  color: #767676;
  font-size: 12px;
  margin-left: auto;
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

.form-input:disabled,
.form-textarea:disabled,
.form-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #6e6e6e;
}

.form-textarea {
  resize: vertical;
  line-height: 1.5;
}

.form-select {
  cursor: pointer;
}

.command-result {
  margin-top: 16px;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.command-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.result-label {
  font-size: 13px;
  color: #969696;
  font-weight: 500;
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
}

.copy-btn:hover {
  background: #1177bb;
}

.copy-btn svg {
  width: 12px;
  height: 12px;
}

.command-display {
  padding: 8px 12px;
  background: #0e0e0e;
  border: 1px solid #2d2d30;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.command-display code {
  color: #4ec9b0;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #3e3e42;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-icon {
  font-size: 14px;
}

.generate-btn {
  background: #0e639c;
  color: white;
}

.generate-btn:hover:not(:disabled) {
  background: #1177bb;
}

.execute-btn {
  background: #16825d;
  color: white;
}

.execute-btn:hover:not(:disabled) {
  background: #1a9b6e;
}

.reset-btn {
  background: #3e3e42;
  color: #cccccc;
}

.reset-btn:hover:not(:disabled) {
  background: #4e4e52;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* 未保存提示样式 */
.unsaved-warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.unsaved-warning-dialog {
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  text-align: center;
}

.warning-icon {
  margin-bottom: 16px;
  color: #f9c74f;
}

.warning-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #cccccc;
}

.warning-message {
  margin: 0 0 24px;
  font-size: 14px;
  color: #969696;
  line-height: 1.5;
}

.warning-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.warning-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 100px;
}

.cancel-btn {
  background: #3e3e42;
  color: #cccccc;
}

.cancel-btn:hover {
  background: #4e4e52;
}

.confirm-btn {
  background: #0e639c;
  color: white;
}

.confirm-btn:hover {
  background: #1177bb;
}

/* 模态框过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .unsaved-warning-dialog,
.modal-fade-leave-active .unsaved-warning-dialog {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .unsaved-warning-dialog {
  transform: scale(0.9);
}

.modal-fade-leave-to .unsaved-warning-dialog {
  transform: scale(0.9);
}

/* 深色主题适配 */
.dark .task-creator {
  background: #1e1e1e;
}

.dark .creator-header {
  background: #1a1a1a;
  border-bottom-color: #2d2d30;
}

.dark .form-input,
.dark .form-textarea,
.dark .form-select {
  background: #0e0e0e;
  border-color: #2d2d30;
}

.dark .form-input:focus,
.dark .form-textarea:focus,
.dark .form-select:focus {
  background: #1a1a1a;
  border-color: #007acc;
}

/* 滚动条样式 */
.creator-content::-webkit-scrollbar {
  width: 10px;
}

.creator-content::-webkit-scrollbar-track {
  background: transparent;
}

.creator-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.creator-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>