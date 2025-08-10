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
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 状态数据
const executionStatus = ref<'not_executed' | 'executed'>('not_executed')
const requirementsContent = ref('')
const isLoading = ref(false)
const generatedCommand = computed(() => `claude "/${props.requirement.iterationId}:requirement"`)

// 定时刷新相关
const autoRefreshTimer = ref<NodeJS.Timeout | null>(null)
const AUTO_REFRESH_INTERVAL = 5000 // 5秒自动刷新

// 占位符数据，用于预览时替换
const placeholderData = computed(() => ({
  userRequirement: props.requirement.userRequirement || '',
  jsonSchema: props.requirement.jsonSchema || '',
  iterationId: props.requirement.iterationId || ''
}))

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

// 刷新状态
const handleRefresh = () => {
  checkExecutionStatus()
}

onMounted(() => {
  checkExecutionStatus()
})

onUnmounted(() => {
  // 组件销毁时清理定时器
  stopAutoRefresh()
})
</script>

<template>
  <div class="requirement-status" :class="{ 'dark': isDark }">
    <div class="status-header">
      <div class="header-left">
        <button class="back-btn" @click="emit('back')" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="status-title">需求详情</h3>
      </div>
      <button class="close-btn" @click="emit('close')" title="关闭">×</button>
    </div>
    
    <div class="status-content">
      <!-- 基本信息 -->
      <div class="info-section">
        <h4 class="section-title">基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">迭代ID：</span>
            <span class="info-value">{{ requirement.iterationId }}</span>
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
            <button class="refresh-btn" @click="handleRefresh" :disabled="isLoading" title="刷新状态">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" :class="{ 'rotating': isLoading }">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 用户需求 -->
      <div class="info-section">
        <h4 class="section-title">用户需求</h4>
        <div class="requirement-text">{{ requirement.userRequirement }}</div>
      </div>

      <!-- 生成的命令 -->
      <div class="info-section">
        <h4 class="section-title">生成的命令</h4>
        <div class="command-box">
          <code class="command-text">{{ generatedCommand }}</code>
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
        
        <!-- 执行按钮 -->
        <div v-if="executionStatus === 'not_executed'" class="execute-section">
          <button 
            class="execute-btn"
            @click="handleExecuteCommand"
          >
            <span class="btn-icon">▶</span>
            执行命令
          </button>
          <span class="execute-hint">点击执行命令，将在终端中运行</span>
        </div>
      </div>

      <!-- 提示词 -->
      <div class="info-section">
        <h4 class="section-title">
          提示词
          <span class="section-hint">（只读，预览时自动替换变量）</span>
        </h4>
        <MonacoEditor
          :modelValue="requirement.prompt"
          language="markdown"
          :height="200"
          :read-only="true"
          :enable-maximize="true"
          :enable-preview="true"
          :enable-placeholder="true"
          :placeholder-data="placeholderData"
        />
      </div>

      <!-- JSON Schema -->
      <div v-if="requirement.jsonSchema" class="info-section">
        <h4 class="section-title">JSON Schema</h4>
        <MonacoEditor
          :modelValue="requirement.jsonSchema"
          language="json"
          :height="200"
          :read-only="true"
          :enable-maximize="true"
        />
      </div>

      <!-- 执行结果 -->
      <div v-if="executionStatus === 'executed' && requirementsContent" class="info-section">
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

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>检查执行状态...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.requirement-status {
  width: 100%;
  height: 100%;
  background: #252526;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #3e3e42;
}

.status-header {
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

.status-title {
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

.status-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}

.info-section {
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
  grid-template-columns: 1fr 1fr;
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

.info-label {
  font-size: 13px;
  color: #969696;
}

.info-value {
  font-size: 13px;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
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

.requirement-text {
  padding: 12px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
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

.execute-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.execute-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #16825d;
  border: none;
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.execute-btn:hover {
  background: #1a9b6e;
}

.btn-icon {
  font-size: 14px;
}

.execute-hint {
  font-size: 12px;
  color: #6e6e6e;
}

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

/* 滚动条样式 */
.status-content::-webkit-scrollbar {
  width: 10px;
}

.status-content::-webkit-scrollbar-track {
  background: transparent;
}

.status-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.status-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>