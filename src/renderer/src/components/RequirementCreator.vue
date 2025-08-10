<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import defaultPromptContent from '@renderer/assets/default-prompt.md?raw'

const props = defineProps<{
  projectPath?: string | null
}>()

const emit = defineEmits<{
  close: []
  back: []
  submit: [data: { iterationId: string; userRequirement: string; prompt: string; jsonSchema: string }]
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 默认提示词
const DEFAULT_PROMPT = defaultPromptContent

const iterationId = ref('')
const userRequirement = ref('')
// 初始化时直接设置默认提示词，避免闪烁
const prompt = ref(DEFAULT_PROMPT)
const jsonSchema = ref('')
const isGenerating = ref(false)
const isExecuting = ref(false)
const generatedCommand = ref('')
const showCommandResult = ref(false)

// 计算属性：判断提示词是否与默认值不同
const isPromptModified = computed(() => {
  return prompt.value !== DEFAULT_PROMPT
})

// 计算属性：判断是否有未保存的内容
const hasUnsavedContent = computed(() => {
  return iterationId.value || userRequirement.value || (prompt.value && prompt.value !== DEFAULT_PROMPT) || jsonSchema.value
})

// 验证迭代ID格式
const validateIterationId = (value: string) => {
  return /^[a-zA-Z0-9_]+$/.test(value)
}

// 处理迭代ID输入
const handleIterationIdInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value
  // 只允许字母数字下划线
  const filtered = value.replace(/[^a-zA-Z0-9_]/g, '')
  if (filtered !== value) {
    iterationId.value = filtered
    input.value = filtered
  }
}

const handleResetPrompt = () => {
  if (prompt.value !== DEFAULT_PROMPT) {
    // 使用自定义确认对话框或静默重置
    prompt.value = DEFAULT_PROMPT
    // 可以添加一个临时提示，但不使用 alert
    console.log('提示词已重置为默认值')
  }
}

const handleGenerateCommand = async () => {
  if (!iterationId.value.trim()) {
    alert('请输入迭代ID')
    return
  }
  
  if (!validateIterationId(iterationId.value)) {
    alert('迭代ID只能包含字母、数字和下划线')
    return
  }
  
  if (!userRequirement.value.trim()) {
    alert('请输入用户需求')
    return
  }
  
  isGenerating.value = true
  try {
    // 保存表单数据到 .se-claude 目录
    const formData = {
      iterationId: iterationId.value,
      userRequirement: userRequirement.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value,
      createdAt: new Date().toISOString()
    }
    
    // 使用 window.api 调用主进程方法
    const result = await window.api.saveRequirement(formData)
    
    if (result.success) {
      // 生成 claude 命令
      generatedCommand.value = `claude "/${iterationId.value}:requirement"`
      showCommandResult.value = true
      
      // 触发提交事件，通知父组件刷新列表
      emit('submit', {
        iterationId: iterationId.value,
        userRequirement: userRequirement.value,
        prompt: prompt.value,
        jsonSchema: jsonSchema.value
      })
    } else {
      alert('保存失败: ' + result.error)
    }
  } catch (error) {
    console.error('生成命令失败:', error)
    alert('生成命令失败')
  } finally {
    isGenerating.value = false
  }
}

const handleExecuteCommand = async () => {
  if (!generatedCommand.value) {
    alert('请先生成命令')
    return
  }
  
  isExecuting.value = true
  try {
    // 触发执行命令事件，在终端中执行生成的命令
    emit('executeCommand', generatedCommand.value)
    
    // 可选：同时触发提交事件保存数据
    if (iterationId.value && userRequirement.value) {
      emit('submit', {
        iterationId: iterationId.value,
        userRequirement: userRequirement.value,
        prompt: prompt.value,
        jsonSchema: jsonSchema.value
      })
    }
    
    // 短暂延迟后关闭创建器，让用户看到终端执行
    setTimeout(() => {
      emit('close')
    }, 500)
  } finally {
    isExecuting.value = false
  }
}

const handleReset = () => {
  iterationId.value = ''
  userRequirement.value = ''
  prompt.value = DEFAULT_PROMPT
  jsonSchema.value = ''
  generatedCommand.value = ''
  showCommandResult.value = false
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
  if (hasUnsavedContent.value) {
    pendingAction.value = 'close'
    showUnsavedWarning.value = true
  } else {
    emit('close')
  }
}

const handleBack = () => {
  if (hasUnsavedContent.value) {
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
</script>

<template>
  <div class="requirement-creator" :class="{ 'dark': isDark }">
    <div class="creator-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="creator-title">新建需求</h3>
      </div>
      <button class="close-btn" @click="handleClose" title="关闭">×</button>
    </div>
    
    <div class="creator-content">
      <div class="form-section">
        <div class="form-group">
          <label class="form-label">
            迭代ID
            <span class="required">*</span>
            <span class="input-hint">仅支持字母、数字、下划线</span>
          </label>
          <input
            v-model="iterationId"
            type="text"
            class="form-input"
            placeholder="请输入迭代ID（如：iter_001、feature_login）..."
            @input="handleIterationIdInput"
            :disabled="isGenerating || isExecuting"
            pattern="[a-zA-Z0-9_]+"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            用户需求
            <span class="required">*</span>
          </label>
          <textarea
            v-model="userRequirement"
            class="form-textarea"
            placeholder="请输入用户需求描述..."
            rows="6"
            :disabled="isGenerating || isExecuting"
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
              userRequirement: userRequirement || '用户需求将在这里显示',
              jsonSchema: jsonSchema || 'JSON Schema 将在这里显示'
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
          :disabled="!iterationId.trim() || !userRequirement.trim() || isGenerating || isExecuting"
        >
          <span class="btn-icon">⚡</span>
          {{ isGenerating ? '生成中...' : '生成命令' }}
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
          :disabled="isGenerating || isExecuting"
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
.requirement-creator {
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
}

.auto-generate-btn:hover:not(:disabled) {
  background: #1177bb;
}

.auto-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #3e3e42;
  background: #1e1e1e;
  color: #d4d4d4;
  font-size: 14px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  line-height: 1.5;
  border-radius: 4px;
  outline: none;
  resize: vertical;
  transition: all 0.15s ease;
}

.form-textarea:focus {
  border-color: #007acc;
  background: #1a1a1a;
}

.form-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-textarea::placeholder {
  color: #6e6e6e;
}

.form-input {
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

.form-input:focus {
  border-color: #007acc;
  background: #1a1a1a;
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: #6e6e6e;
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
.dark .requirement-creator {
  background: #1e1e1e;
}

.dark .creator-header {
  background: #1a1a1a;
  border-bottom-color: #2d2d30;
}

.dark .form-textarea {
  background: #0e0e0e;
  border-color: #2d2d30;
}

.dark .form-textarea:focus {
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