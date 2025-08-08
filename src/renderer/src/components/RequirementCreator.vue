<script setup lang="ts">
import { ref, inject } from 'vue'

const props = defineProps<{
  projectPath?: string | null
}>()

const emit = defineEmits<{
  close: []
  back: []
  submit: [data: { userRequirement: string; prompt: string; jsonSchema: string }]
}>()

const isDark = inject('isDark', ref(false))

const userRequirement = ref('')
const prompt = ref('')
const jsonSchema = ref('')
const isGenerating = ref(false)
const isExecuting = ref(false)

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
    
    // 模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 生成示例提示词
    if (!prompt.value) {
      prompt.value = `基于以下需求生成代码：\n${userRequirement.value}`
    }
    
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
  prompt.value = ''
  jsonSchema.value = ''
}

const handleClose = () => {
  if (userRequirement.value || prompt.value || jsonSchema.value) {
    if (confirm('确定要关闭吗？未保存的内容将丢失。')) {
      emit('close')
    }
  } else {
    emit('close')
  }
}

const handleBack = () => {
  if (userRequirement.value || prompt.value || jsonSchema.value) {
    if (confirm('确定要返回吗？未保存的内容将丢失。')) {
      emit('back')
    }
  } else {
    emit('back')
  }
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
            <button 
              class="auto-generate-btn"
              @click="handleGenerateCommand"
              :disabled="!userRequirement.trim() || isGenerating || isExecuting"
              title="基于用户需求自动生成"
            >
              {{ isGenerating ? '生成中...' : '自动生成' }}
            </button>
          </label>
          <textarea
            v-model="prompt"
            class="form-textarea"
            placeholder="输入或自动生成提示词..."
            rows="8"
            :disabled="isExecuting"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            JSON Schema
            <span class="optional">(可选)</span>
          </label>
          <textarea
            v-model="jsonSchema"
            class="form-textarea code-input"
            placeholder="输入 JSON Schema 定义（可选）..."
            rows="10"
            :disabled="isExecuting"
          ></textarea>
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

.code-input {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
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