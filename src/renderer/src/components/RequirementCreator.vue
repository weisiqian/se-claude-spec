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
  submit: [data: { userRequirement: string; prompt: string; jsonSchema: string }]
}>()

const isDark = inject('isDark', ref(false))

// 默认提示词
const DEFAULT_PROMPT = defaultPromptContent

const userRequirement = ref('')
// 初始化时直接设置默认提示词，避免闪烁
const prompt = ref(DEFAULT_PROMPT)
const jsonSchema = ref('')
const isGenerating = ref(false)
const isExecuting = ref(false)

// 计算属性：判断提示词是否与默认值不同
const isPromptModified = computed(() => {
  return prompt.value !== DEFAULT_PROMPT
})

// 计算属性：判断是否有未保存的内容
const hasUnsavedContent = computed(() => {
  return userRequirement.value || (prompt.value && prompt.value !== DEFAULT_PROMPT) || jsonSchema.value
})

const handleResetPrompt = () => {
  if (prompt.value !== DEFAULT_PROMPT) {
    // 使用自定义确认对话框或静默重置
    prompt.value = DEFAULT_PROMPT
    // 可以添加一个临时提示，但不使用 alert
    console.log('提示词已重置为默认值')
  }
}

const handleGenerateCommand = async () => {
  if (!userRequirement.value.trim()) {
    alert('请输入用户需求')
    return
  }
  
  isGenerating.value = true
  try {
    // TODO: 调用 AI API 生成命令
    console.log('生成命令:', {
      userRequirement: userRequirement.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value
    })
    
    // 模拟生成过稌
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 生成示例 JSON Schema
    if (!jsonSchema.value) {
      jsonSchema.value = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }, null, 2)
    }
  } finally {
    isGenerating.value = false
  }
}

const handleExecuteCommand = async () => {
  if (!userRequirement.value.trim()) {
    alert('请输入用户需求')
    return
  }
  
  if (!prompt.value.trim()) {
    alert('请先生成或输入提示词')
    return
  }
  
  isExecuting.value = true
  try {
    // 触发提交事件
    emit('submit', {
      userRequirement: userRequirement.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value
    })
    
    // TODO: 执行命令逻辑
    console.log('执行命令:', {
      userRequirement: userRequirement.value,
      prompt: prompt.value,
      jsonSchema: jsonSchema.value
    })
    
    // 模拟执行过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 清空表单
    handleReset()
  } finally {
    isExecuting.value = false
  }
}

const handleReset = () => {
  userRequirement.value = ''
  prompt.value = DEFAULT_PROMPT
  jsonSchema.value = ''
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
      
      <div class="action-buttons">
        <button 
          class="action-btn generate-btn"
          @click="handleGenerateCommand"
          :disabled="!userRequirement.trim() || isGenerating || isExecuting"
        >
          <span class="btn-icon">⚡</span>
          {{ isGenerating ? '生成中...' : '生成命令' }}
        </button>
        
        <button 
          class="action-btn execute-btn"
          @click="handleExecuteCommand"
          :disabled="!userRequirement.trim() || !prompt.trim() || isExecuting"
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