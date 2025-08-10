<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'

interface RequirementData {
  id: string
  iterationId: string
  userRequirement: string
  prompt: string
  jsonSchema: string
  createdAt: string
  title?: string
  description?: string
  status?: string
}

const props = defineProps<{
  requirement: RequirementData
}>()

const emit = defineEmits<{
  close: []
  back: []
  save: [shouldClose: boolean]
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 表单数据
const formData = ref({
  userRequirement: '',
  prompt: '',
  jsonSchema: ''
})

// 原始数据备份（用于重置）
const originalData = ref({
  userRequirement: '',
  prompt: '',
  jsonSchema: ''
})

// 保存状态
const isSaving = ref(false)
const showSaveDropdown = ref(false)

// 执行状态
const executionStatus = ref<'not_executed' | 'executed'>('not_executed')
const requirementsContent = ref('')
const isLoading = ref(false)
const generatedCommand = computed(() => `claude "/${props.requirement.iterationId}:requirement"`)

// 定时刷新相关
const autoRefreshTimer = ref<NodeJS.Timeout | null>(null)
const AUTO_REFRESH_INTERVAL = 5000 // 5秒自动刷新

// 取消确认弹窗
const showCancelDialog = ref(false)
const hasUnsavedChanges = computed(() => {
  return formData.value.userRequirement !== originalData.value.userRequirement ||
         formData.value.prompt !== originalData.value.prompt ||
         formData.value.jsonSchema !== originalData.value.jsonSchema
})

// 占位符数据，用于预览时替换
const placeholderData = computed(() => ({
  userRequirement: formData.value.userRequirement || '',
  jsonSchema: formData.value.jsonSchema || '',
  iterationId: props.requirement.iterationId || ''
}))

// 检查执行状态
const checkExecutionStatus = async () => {
  isLoading.value = true
  try {
    const result = await window.api.checkRequirementStatus(props.requirement.iterationId)
    if (result.executed) {
      executionStatus.value = 'executed'
      requirementsContent.value = result.content || ''
      // 已执行，停止自动刷新
      stopAutoRefresh()
    } else {
      executionStatus.value = 'not_executed'
      requirementsContent.value = ''
      // 未执行，启动自动刷新
      startAutoRefresh()
    }
  } catch (error) {
    console.error('检查执行状态失败:', error)
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

// 重置表单
const handleReset = () => {
  formData.value = { ...originalData.value }
}

// 执行命令
const handleExecuteCommand = async () => {
  emit('executeCommand', generatedCommand.value)
  
  // 延迟后检查状态
  setTimeout(() => {
    checkExecutionStatus()
  }, 5000)
}

// 复制命令
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

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const dropdown = document.querySelector('.save-dropdown')
  if (dropdown && !dropdown.contains(event.target as Node)) {
    showSaveDropdown.value = false
  }
}

// 初始化表单数据
onMounted(() => {
  const initialData = {
    userRequirement: props.requirement.userRequirement || '',
    prompt: props.requirement.prompt || '',
    jsonSchema: props.requirement.jsonSchema || ''
  }
  formData.value = { ...initialData }
  originalData.value = { ...initialData }
  
  // 检查执行状态
  checkExecutionStatus()
  
  // 添加点击外部事件监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 组件销毁时清理定时器
  stopAutoRefresh()
  
  // 移除事件监听
  document.removeEventListener('click', handleClickOutside)
})

// 保存更改
const handleSave = async (executeAfterSave = false) => {
  isSaving.value = true
  showSaveDropdown.value = false
  try {
    const updatedData = {
      ...props.requirement,
      ...formData.value,
      updatedAt: new Date().toISOString()
    }
    
    // 调用保存API
    await window.api.updateRequirement(updatedData)
    
    // 更新原始数据，这样保存后就不会显示未保存更改
    originalData.value = { ...formData.value }
    
    if (executeAfterSave) {
      // 保存后执行，停留在当前页面
      emit('save', false) // false表示不关闭编辑器
      setTimeout(() => {
        handleExecuteCommand()
      }, 500) // 给一点延迟让保存完成
    } else {
      // 仅保存，返回列表
      emit('save', true) // true表示关闭编辑器
      emit('back')
    }
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 保存并执行
const handleSaveAndExecute = () => {
  handleSave(true)
}

// 取消编辑
const handleCancel = () => {
  if (hasUnsavedChanges.value) {
    showCancelDialog.value = true
  } else {
    emit('back')
  }
}

// 确认取消
const confirmCancel = () => {
  showCancelDialog.value = false
  emit('back')
}

// 关闭取消弹窗
const closeCancelDialog = () => {
  showCancelDialog.value = false
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<template>
  <div class="requirement-editor" :class="{ 'dark': isDark }">
    <div class="editor-header">
      <div class="header-left">
        <button class="back-btn" @click="emit('back')" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="editor-title">编辑需求</h3>
      </div>
      <button class="close-btn" @click="emit('close')" title="关闭">×</button>
    </div>
    
    <div class="editor-content">
      <!-- 基本信息（只读） -->
      <div class="info-section">
        <h4 class="section-title">基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">迭代ID：</span>
            <span class="info-value">{{ requirement.iterationId }}</span>
            <span class="info-hint">（不可修改）</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间：</span>
            <span class="info-value">{{ formatDate(requirement.createdAt) }}</span>
          </div>
          <div class="info-item full-width">
            <span class="info-label">执行状态：</span>
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
          </div>
        </div>
      </div>

      <!-- 生成的命令（只读） -->
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

      <!-- 用户需求 -->
      <div class="form-section">
        <h4 class="section-title">
          用户需求
          <span class="required">*</span>
        </h4>
        <div class="form-group">
          <textarea 
            v-model="formData.userRequirement" 
            class="form-textarea large"
            rows="6"
            placeholder="输入用户需求..."
            required
          ></textarea>
        </div>
      </div>

      <!-- 提示词 -->
      <div class="form-section">
        <h4 class="section-title">
          提示词
          <span class="required">*</span>
          <span class="section-hint">（支持Markdown和变量替换）</span>
        </h4>
        <MonacoEditor
          v-model="formData.prompt"
          language="markdown"
          :height="300"
          :enable-maximize="true"
          :enable-preview="true"
          :enable-placeholder="true"
          :placeholder-data="placeholderData"
        />
      </div>

      <!-- JSON Schema -->
      <div class="form-section">
        <h4 class="section-title">JSON Schema（可选）</h4>
        <MonacoEditor
          v-model="formData.jsonSchema"
          language="json"
          :height="200"
          :enable-maximize="true"
        />
      </div>

      <!-- 执行结果（只读） -->
      <div v-if="executionStatus === 'executed' && requirementsContent" class="form-section">
        <h4 class="section-title">
          执行结果
          <span class="result-path">(.design/{{ requirement.iterationId }}/specs/requirements.md)</span>
        </h4>
        <MonacoEditor
          :modelValue="requirementsContent"
          language="markdown"
          :height="300"
          :read-only="true"
          :enable-maximize="true"
          :enable-preview="true"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button class="btn btn-secondary" @click="handleReset" title="重置到原始内容">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
          重置
        </button>
        <div class="actions-right">
          <button class="btn btn-cancel" @click="handleCancel">
            取消
          </button>
          <div class="save-dropdown" :class="{ 'open': showSaveDropdown }">
            <div class="save-btn-group">
              <button 
                class="btn btn-primary save-main-btn" 
                @click="handleSave()"
                :disabled="isSaving || !hasUnsavedChanges || !formData.userRequirement || !formData.prompt"
              >
                <span v-if="!isSaving">保存更改</span>
                <span v-else>保存中...</span>
              </button>
              <button 
                class="btn btn-primary save-dropdown-btn"
                @click="showSaveDropdown = !showSaveDropdown"
                :disabled="isSaving || !hasUnsavedChanges || !formData.userRequirement || !formData.prompt"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div v-if="showSaveDropdown" class="save-dropdown-menu">
              <button class="dropdown-item" @click="handleSaveAndExecute">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 3v18l7-6 7 6V3z"/>
                </svg>
                <span>保存并执行</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 取消确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCancelDialog" class="cancel-dialog-overlay" @click.self="closeCancelDialog">
          <div class="cancel-dialog">
            <div class="dialog-header">
              <h3 class="dialog-title">确认取消</h3>
              <button class="dialog-close-btn" @click="closeCancelDialog">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="dialog-content">
              <div class="dialog-icon warning">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <p class="dialog-message">
                您有未保存的更改，确定要放弃这些更改吗？
              </p>
              <div class="changed-items">
                <div v-if="formData.userRequirement !== originalData.userRequirement" class="changed-item">
                  <span class="changed-label">• 用户需求已修改</span>
                </div>
                <div v-if="formData.prompt !== originalData.prompt" class="changed-item">
                  <span class="changed-label">• 提示词已修改</span>
                </div>
                <div v-if="formData.jsonSchema !== originalData.jsonSchema" class="changed-item">
                  <span class="changed-label">• JSON Schema已修改</span>
                </div>
              </div>
            </div>
            <div class="dialog-footer">
              <button class="dialog-btn dialog-btn-secondary" @click="closeCancelDialog">
                继续编辑
              </button>
              <button class="dialog-btn dialog-btn-danger" @click="confirmCancel">
                放弃更改
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.requirement-editor {
  width: 100%;
  height: 100%;
  background: #252526;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #3e3e42;
}

.editor-header {
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

.editor-title {
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

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.info-section,
.form-section {
  margin-bottom: 32px;
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

.section-hint {
  font-size: 11px;
  color: #6e6e6e;
  text-transform: none;
  font-weight: normal;
  font-style: italic;
}

.required {
  color: #f44336;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  color: #969696;
}

.info-value {
  font-size: 13px;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
}

.info-hint {
  font-size: 11px;
  color: #6e6e6e;
  font-style: italic;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #cccccc;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #007acc;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.form-textarea.large {
  min-height: 120px;
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
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.execute-btn:hover:not(:disabled) {
  background: #1a9b6e;
}

.execute-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 14px;
}

.result-path {
  font-size: 11px;
  color: #6e6e6e;
  text-transform: none;
  font-weight: normal;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  border-top: 1px solid #3e3e42;
  margin-top: 24px;
}

.actions-right {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.btn-secondary {
  background: #3e3e42;
  color: #cccccc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary:hover {
  background: #4e4e52;
}

.btn-secondary svg {
  width: 16px;
  height: 16px;
}

.btn-cancel {
  background: #3e3e42;
  color: #cccccc;
}

.btn-cancel:hover {
  background: #4e4e52;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0062a3;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 保存下拉按钮组样式 */
.save-dropdown {
  position: relative;
}

.save-btn-group {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
}

.save-main-btn {
  border-radius: 4px 0 0 4px !important;
  border-right: 1px solid rgba(0, 0, 0, 0.2);
}

.save-dropdown-btn {
  padding: 8px 10px;
  border-radius: 0 4px 4px 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-dropdown-btn svg {
  transition: transform 0.2s ease;
}

.save-dropdown.open .save-dropdown-btn svg {
  transform: rotate(180deg);
}

.save-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: #cccccc;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dropdown-item:hover {
  background: #37373d;
}

.dropdown-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 滚动条样式 */
.editor-content::-webkit-scrollbar {
  width: 10px;
}

.editor-content::-webkit-scrollbar-track {
  background: transparent;
}

.editor-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.editor-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}

/* 取消确认弹窗样式 */
.cancel-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.cancel-dialog {
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  width: 480px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #3e3e42;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #cccccc;
}

.dialog-close-btn {
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

.dialog-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.dialog-content {
  padding: 24px;
  text-align: center;
}

.dialog-icon {
  margin: 0 auto 20px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-icon.warning {
  color: #ffa500;
}

.dialog-icon svg {
  width: 48px;
  height: 48px;
}

.dialog-message {
  margin: 0 0 20px;
  font-size: 14px;
  color: #d4d4d4;
  line-height: 1.6;
}

.changed-items {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 16px;
  text-align: left;
  margin-top: 16px;
}

.changed-item {
  margin-bottom: 8px;
}

.changed-item:last-child {
  margin-bottom: 0;
}

.changed-label {
  font-size: 13px;
  color: #969696;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid #3e3e42;
}

.dialog-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.dialog-btn-secondary {
  background: #007acc;
  color: white;
}

.dialog-btn-secondary:hover {
  background: #0062a3;
}

.dialog-btn-danger {
  background: #f44336;
  color: white;
}

.dialog-btn-danger:hover {
  background: #da190b;
}

/* 模态框过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .cancel-dialog,
.modal-leave-active .cancel-dialog {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from .cancel-dialog {
  transform: scale(0.9);
  opacity: 0;
}

.modal-leave-to .cancel-dialog {
  transform: scale(0.9);
  opacity: 0;
}
</style>