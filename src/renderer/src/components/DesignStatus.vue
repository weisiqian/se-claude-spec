<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'

interface DesignData {
  id: string
  iterationId: string
  userDesignRequest: string
  prompt: string
  jsonSchema?: string
  createdAt: string
  updatedAt?: string
  requirementIterationId?: string
}

const props = defineProps<{
  design: DesignData
}>()

const emit = defineEmits<{
  close: []
  back: []
  edit: []
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 执行状态
const executionStatus = ref<'not_executed' | 'executed'>('not_executed')
const designContent = ref('')
const isLoading = ref(false)
const generatedCommand = computed(() => `claude "/${props.design.iterationId}:design"`)

// 定时刷新相关
const autoRefreshTimer = ref<NodeJS.Timeout | null>(null)
const AUTO_REFRESH_INTERVAL = 5000 // 5秒自动刷新

// 复制命令相关
const copySuccessMessage = ref(false)

// 需求文档内容
const requirementsContent = ref('')
const hasRequirements = ref(false)

// 检查设计执行状态
const checkExecutionStatus = async () => {
  isLoading.value = true
  try {
    // 检查设计输出文件是否存在
    const designPath = `.design/${props.design.iterationId}/specs/design.md`
    // 这里应该调用一个 API 来检查文件是否存在
    // 暂时使用类似需求的检查方式
    const result = await window.api.checkDesignStatus?.(props.design.iterationId)
    if (result?.executed) {
      executionStatus.value = 'executed'
      designContent.value = result.content || ''
      // 已执行，停止自动刷新
      stopAutoRefresh()
    } else {
      executionStatus.value = 'not_executed'
      designContent.value = ''
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

// 加载关联需求内容
const loadRequirementsContent = async () => {
  if (!props.design.requirementIterationId && !props.design.iterationId) {
    return
  }
  
  try {
    // 优先使用关联的需求迭代ID，如果没有则使用设计的迭代ID
    const iterationId = props.design.requirementIterationId || props.design.iterationId
    const result = await window.api.checkRequirementStatus(iterationId)
    if (result.executed && result.content) {
      requirementsContent.value = result.content
      hasRequirements.value = true
    } else {
      hasRequirements.value = false
    }
  } catch (error) {
    console.error('加载需求文档失败:', error)
    hasRequirements.value = false
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
const copyCommand = async () => {
  if (generatedCommand.value) {
    await navigator.clipboard.writeText(generatedCommand.value)
    copySuccessMessage.value = true
    setTimeout(() => {
      copySuccessMessage.value = false
    }, 2000)
  }
}

// 编辑设计
const handleEdit = () => {
  emit('edit')
}

// 初始化
onMounted(() => {
  // 检查执行状态
  checkExecutionStatus()
  // 加载关联需求内容
  loadRequirementsContent()
})

onUnmounted(() => {
  // 组件销毁时清理定时器
  stopAutoRefresh()
})

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
  <div class="design-status" :class="{ 'dark': isDark }">
    <div class="status-header">
      <div class="header-left">
        <button class="back-btn" @click="emit('back')" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="status-title">设计详情</h3>
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
            <span class="info-value">{{ design.iterationId }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间：</span>
            <span class="info-value">{{ formatDate(design.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新时间：</span>
            <span class="info-value">{{ design.updatedAt ? formatDate(design.updatedAt) : '未更新' }}</span>
          </div>
          <div class="info-item">
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

      <!-- 关联需求文档 -->
      <div v-if="hasRequirements && requirementsContent" class="info-section">
        <h4 class="section-title">
          关联需求文档
          <span class="result-path">(.design/{{ design.requirementIterationId || design.iterationId }}/specs/requirements.md)</span>
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

      <!-- 设计要求 -->
      <div v-if="design.userDesignRequest" class="info-section">
        <h4 class="section-title">设计要求</h4>
        <div class="content-box">
          <pre class="content-text">{{ design.userDesignRequest }}</pre>
        </div>
      </div>

      <!-- 提示词 -->
      <div class="info-section">
        <h4 class="section-title">提示词</h4>
        <MonacoEditor
          :modelValue="design.prompt"
          language="markdown"
          :height="300"
          :read-only="true"
          :enable-maximize="true"
          :enable-preview="true"
        />
      </div>

      <!-- JSON Schema -->
      <div v-if="design.jsonSchema" class="info-section">
        <h4 class="section-title">JSON Schema</h4>
        <MonacoEditor
          :modelValue="design.jsonSchema"
          language="json"
          :height="200"
          :read-only="true"
          :enable-maximize="true"
        />
      </div>

      <!-- 执行结果 -->
      <div v-if="executionStatus === 'executed' && designContent" class="info-section">
        <h4 class="section-title">
          执行结果
          <span class="result-path">(.design/{{ design.iterationId }}/specs/design.md)</span>
        </h4>
        <MonacoEditor
          :modelValue="designContent"
          language="markdown"
          :height="400"
          :read-only="true"
          :enable-maximize="true"
          :enable-preview="true"
        />
      </div>
    </div>

    <!-- 操作按钮（固定在底部） -->
    <div class="action-buttons">
        <button class="btn btn-primary" @click="handleEdit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          编辑设计
        </button>
    </div>
  </div>
</template>

<style scoped>
.design-status {
  width: 100%;
  height: 100%;
  background: #252526;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #3e3e42;
  position: relative;
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
  padding-bottom: 100px; /* 为固定底部按钮留出空间 */
}

.info-section {
  margin-bottom: 32px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  padding: 20px;
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

.btn-icon {
  font-size: 14px;
}

.content-box {
  padding: 16px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.content-text {
  margin: 0;
  font-size: 13px;
  color: #d4d4d4;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

.action-buttons {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: #252526;
  border-top: 1px solid #3e3e42;
  z-index: 10;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-primary:hover {
  background: #0062a3;
}

.btn svg {
  width: 16px;
  height: 16px;
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