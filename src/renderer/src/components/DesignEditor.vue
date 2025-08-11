<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import defaultDesignPromptContent from '@renderer/assets/default-design-prompt.md?raw'

interface DesignData {
  id: string
  iterationId: string
  userDesignRequest: string
  prompt: string
  jsonSchema?: string
  createdAt: string
  updatedAt?: string
  requirementData?: any
}

const props = defineProps<{
  requirement?: any
  design?: DesignData
  isNew: boolean
}>()

const emit = defineEmits<{
  close: []
  back: []
  save: [data: DesignData]
  executeCommand: [command: string]
}>()

const isDark = inject('isDark', ref(false))

// 默认提示词
const DEFAULT_DESIGN_PROMPT = defaultDesignPromptContent

// 表单数据
const formData = ref({
  userDesignRequest: '',
  prompt: '',
  jsonSchema: ''
})

// 原始数据备份（用于检查更改和重置）
const originalData = ref({
  userDesignRequest: '',
  prompt: '',
  jsonSchema: ''
})

// 生成的命令
const generatedCommand = ref('')
const showCommandResult = ref(false)
const isGenerating = ref(false)
const isExecuting = ref(false)

// 需求文档内容
const requirementsContent = ref('')
const showRequirementsContent = ref(false)
const isLoadingRequirements = ref(false)

// 保存状态
const isSaving = ref(false)

// 复制命令相关
const copySuccessMessage = ref(false)

// 保存下拉菜单
const showSaveDropdown = ref(false)

// 选择的迭代ID（无关联需求时使用）
const selectedIterationId = ref('')
// 可用的迭代ID列表
const availableIterations = ref<Array<{ 
  id: string
  title: string
  hasDesign: boolean
  hasRequirementsDoc: boolean
}>>([])

// 使用关联需求的迭代ID作为设计迭代ID
const iterationId = computed(() => {
  // 如果是编辑已有设计，使用设计的迭代ID
  if (props.design?.iterationId) {
    return props.design.iterationId
  }
  // 新建设计时，优先使用关联需求的迭代ID
  if (props.requirement?.iterationId) {
    return props.requirement.iterationId
  }
  // 如果没有关联需求，使用选择的迭代ID
  return selectedIterationId.value
})

// 占位符数据，用于预览时替换
const placeholderData = computed(() => ({
  userDesignRequest: formData.value.userDesignRequest || '',
  jsonSchema: formData.value.jsonSchema || '',
  iterationId: iterationId.value || '',
  requirementIterationId: props.requirement?.iterationId || '',
  requirementContent: props.requirement?.userRequirement || '',
  userRequirement: props.requirement?.userRequirement || ''  // 添加 userRequirement 以支持 {{USER_REQUIREMENT}} 占位符
}))

// 计算属性：判断是否有未保存的更改
const hasUnsavedChanges = computed(() => {
  return formData.value.userDesignRequest !== originalData.value.userDesignRequest ||
         formData.value.prompt !== originalData.value.prompt ||
         formData.value.jsonSchema !== originalData.value.jsonSchema
})

// 计算属性：判断提示词是否与默认值不同
const isPromptModified = computed(() => {
  return formData.value.prompt !== DEFAULT_DESIGN_PROMPT
})

// 验证迭代ID格式
const validateIterationId = (id: string) => {
  return /^[a-zA-Z0-9_]+$/.test(id)
}

// 加载需求文档内容
const loadRequirementsContent = async () => {
  if (!iterationId.value) {
    return
  }
  
  isLoadingRequirements.value = true
  try {
    const result = await window.api.checkRequirementStatus(iterationId.value)
    if (result.executed && result.content) {
      requirementsContent.value = result.content
      showRequirementsContent.value = true
    } else {
      showRequirementsContent.value = false
    }
  } catch (error) {
    console.error('加载需求文档失败:', error)
    showRequirementsContent.value = false
  } finally {
    isLoadingRequirements.value = false
  }
}

// 加载可用的迭代ID列表（需求和设计一一对应）
const loadAvailableIterations = async () => {
  try {
    // 获取所有需求
    const requirements = await window.api.getRequirements()
    // 获取所有设计
    const designs = await window.api.getDesigns()
    
    // 创建设计的迭代ID集合
    const designIterationIds = new Set(designs.map((d: any) => d.iterationId))
    
    // 构建可用迭代列表
    // 注意：因为需求和设计是一一对应的，所以只显示没有设计的需求
    availableIterations.value = await Promise.all(
      requirements
        .filter((req: any) => !designIterationIds.has(req.iterationId)) // 只显示没有设计的需求
        .map(async (req: any) => {
          // 检查是否有requirements.md文件
          const statusResult = await window.api.checkRequirementStatus(req.iterationId)
          return {
            id: req.iterationId,
            title: `迭代 ${req.iterationId}`,
            hasDesign: false, // 已经过滤了有设计的，所以这里一定是false
            hasRequirementsDoc: statusResult.executed // 是否有需求文档
          }
        })
    )
    
    // 如果没有关联需求且没有选中的迭代ID，选择第一个有需求文档的迭代
    if (!props.requirement && !selectedIterationId.value) {
      const firstAvailable = availableIterations.value.find(iter => iter.hasRequirementsDoc)
      if (firstAvailable) {
        selectedIterationId.value = firstAvailable.id
      }
    }
  } catch (error) {
    console.error('加载可用迭代失败:', error)
  }
}

// 初始化表单数据
onMounted(async () => {
  // 如果没有关联需求，加载可用迭代列表
  if (!props.requirement) {
    await loadAvailableIterations()
  }
  
  if (props.design && !props.isNew) {
    // 编辑现有设计
    const initialData = {
      userDesignRequest: props.design.userDesignRequest || '',
      prompt: props.design.prompt || '',
      jsonSchema: props.design.jsonSchema || ''
    }
    formData.value = { ...initialData }
    originalData.value = { ...initialData }
    // 如果是编辑模式，显示已生成的命令
    if (props.design.iterationId) {
      generatedCommand.value = `claude "/${props.design.iterationId}:design"`
      showCommandResult.value = true
    }
  } else {
    // 新建设计
    const initialData = {
      userDesignRequest: '',
      prompt: DEFAULT_DESIGN_PROMPT,
      jsonSchema: ''
    }
    formData.value = { ...initialData }
    originalData.value = { ...initialData }
  }
  
  // 加载需求文档内容
  loadRequirementsContent()
})

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

// 生成命令
const handleGenerateCommand = async () => {
  if (!iterationId.value) {
    alert('缺少关联的需求迭代ID')
    return
  }
  
  
  if (!formData.value.prompt.trim()) {
    alert('请输入提示词')
    return
  }
  
  isGenerating.value = true
  
  try {
    // 先保存设计到文件系统
    const designData = {
      iterationId: iterationId.value,
      userDesignRequest: formData.value.userDesignRequest,
      prompt: formData.value.prompt,
      jsonSchema: formData.value.jsonSchema,
      requirementIterationId: props.requirement?.iterationId,
      createdAt: props.design?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const result = await window.api.saveDesign(designData)
    
    if (result.success) {
      // 生成命令
      generatedCommand.value = `claude "/${iterationId.value}:design"`
      showCommandResult.value = true
      
      // 更新原始数据
      originalData.value = { ...formData.value }
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

// 执行命令
const handleExecuteCommand = async () => {
  if (!generatedCommand.value) {
    alert('请先生成命令')
    return
  }
  
  isExecuting.value = true
  try {
    // 触发执行命令事件，在终端中执行生成的命令
    emit('executeCommand', generatedCommand.value)
    
    // 延迟一下让用户看到执行状态
    setTimeout(() => {
      isExecuting.value = false
    }, 2000)
  } catch (error) {
    console.error('执行命令失败:', error)
    alert('执行命令失败')
    isExecuting.value = false
  }
}

// 重置表单
const handleReset = () => {
  formData.value = {
    userDesignRequest: '',
    prompt: DEFAULT_DESIGN_PROMPT,
    jsonSchema: ''
  }
  generatedCommand.value = ''
  showCommandResult.value = false
}

// 重置提示词为默认值
const handleResetPrompt = () => {
  formData.value.prompt = DEFAULT_DESIGN_PROMPT
}

// 取消编辑
const handleCancel = () => {
  if (hasUnsavedChanges.value) {
    if (confirm('您有未保存的更改，确定要放弃吗？')) {
      emit('back')
    }
  } else {
    emit('back')
  }
}

// 保存设计
const handleSave = async (shouldClose = true) => {
  if (!iterationId.value) {
    alert('请选择迭代ID')
    return
  }
  
  isSaving.value = true
  
  try {
    const designData = {
      iterationId: iterationId.value,
      userDesignRequest: formData.value.userDesignRequest,
      prompt: formData.value.prompt,
      jsonSchema: formData.value.jsonSchema,
      requirementIterationId: props.requirement?.iterationId,
      createdAt: props.design?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const result = props.design 
      ? await window.api.updateDesign(designData)
      : await window.api.saveDesign(designData)
    
    if (result.success) {
      // 更新原始数据
      originalData.value = { ...formData.value }
      
      if (shouldClose) {
        emit('save', {
        ...designData,
        id: props.design?.id || iterationId.value
      } as DesignData)
      }
    } else {
      alert('保存失败: ' + result.error)
    }
  } catch (error) {
    console.error('保存设计失败:', error)
    alert('保存设计失败')
  } finally {
    isSaving.value = false
    showSaveDropdown.value = false
  }
}

// 保存并执行
const handleSaveAndExecute = async () => {
  await handleSave(false)
  if (!isSaving.value && generatedCommand.value) {
    handleExecuteCommand()
  }
}

// 保存并关闭
const handleSaveAndClose = async () => {
  await handleSave(true)
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
  <div class="design-editor" :class="{ 'dark': isDark }">
    <div class="editor-header">
      <div class="header-left">
        <button class="back-btn" @click="emit('back')" title="返回列表">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3 class="editor-title">{{ isNew ? '新建设计文档' : '编辑设计文档' }}</h3>
      </div>
      <button class="close-btn" @click="emit('close')" title="关闭">×</button>
    </div>
    
    <div class="editor-content">
      <!-- 基本信息 -->
      <div class="compact-info-section">
        <div class="compact-info-item">
          <span class="info-label">迭代ID：</span>
          <span v-if="requirement || design" class="info-value">{{ iterationId || '无关联需求' }}</span>
          <select 
            v-else 
            v-model="selectedIterationId" 
            class="iteration-select"
            :disabled="isGenerating || isExecuting || availableIterations.length === 0"
          >
            <option value="" disabled>
              {{ availableIterations.length === 0 ? '暂无迭代' : '请选择迭代ID' }}
            </option>
            <option 
              v-for="iter in availableIterations" 
              :key="iter.id" 
              :value="iter.id"
              :disabled="!iter.hasRequirementsDoc"
            >
              {{ iter.title }}
              <template v-if="!iter.hasRequirementsDoc"> (需先执行需求)</template>
            </option>
          </select>
        </div>
      </div>

      <!-- 关联需求摘要 -->
      <div v-if="requirement" class="compact-info-section">
        <div class="compact-requirement-info">
          <span class="info-label">关联需求：</span>
          <span class="requirement-brief">{{ (requirement.userRequirement || requirement.description || '').substring(0, 100) }}{{ (requirement.userRequirement || requirement.description || '').length > 100 ? '...' : '' }}</span>
        </div>
      </div>

      <!-- 关联需求文档内容 -->
      <div v-if="showRequirementsContent && requirementsContent" class="info-section">
        <h4 class="section-title">
          关联需求文档
          <span v-if="isLoadingRequirements" class="section-hint">（加载中...）</span>
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

      <!-- 用户设计要求 -->
      <div class="form-section">
        <h4 class="section-title">
          设计要求
        </h4>
        <div class="form-group">
          <textarea 
            v-model="formData.userDesignRequest" 
            class="form-textarea large"
            rows="6"
            placeholder="输入设计要求..."
          ></textarea>
        </div>
      </div>

      <!-- 提示词 -->
      <div class="form-section">
        <h4 class="section-title">
          提示词
          <span class="required">*</span>
          <span class="section-hint">（支持Markdown和变量替换）</span>
          <button 
            v-if="isPromptModified"
            class="reset-prompt-btn"
            @click="handleResetPrompt"
            title="重置为默认提示词"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            重置提示词
          </button>
        </h4>
        <MonacoEditor
          v-model="formData.prompt"
          language="markdown"
          :height="300"
          :enable-maximize="true"
          :enable-preview="true"
          :enable-placeholder="true"
          :placeholder-data="placeholderData"
          :show-design-placeholder="true"
        />
      </div>

      <!-- JSON Schema（可选） -->
      <div class="form-section">
        <h4 class="section-title">JSON Schema（可选）</h4>
        <MonacoEditor
          v-model="formData.jsonSchema"
          language="json"
          :height="200"
          :enable-maximize="true"
        />
      </div>

      <!-- 生成的命令结果 -->
      <transition name="slide-fade">
        <div v-if="showCommandResult" class="command-result">
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
        
        <button 
          class="btn btn-secondary generate-btn"
          @click="handleGenerateCommand"
          :disabled="!iterationId || isGenerating || isExecuting"
        >
          <span class="btn-icon">⚡</span>
          {{ isGenerating ? '生成中...' : '生成命令' }}
        </button>
        
        <button 
          v-if="generatedCommand"
          class="btn btn-secondary execute-btn"
          @click="handleExecuteCommand"
          :disabled="!generatedCommand || isExecuting"
        >
          <span class="btn-icon">▶</span>
          {{ isExecuting ? '执行中...' : '执行命令' }}
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
                :disabled="isSaving || !hasUnsavedChanges || !iterationId"
              >
                <span v-if="!isSaving">保存更改</span>
                <span v-else>保存中...</span>
              </button>
              <button 
                class="btn btn-primary save-dropdown-btn"
                @click="showSaveDropdown = !showSaveDropdown"
                :disabled="isSaving || !hasUnsavedChanges || !iterationId"
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
              <button class="dropdown-item" @click="handleSaveAndClose">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                <span>保存并关闭</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.design-editor {
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
  margin-bottom: 24px;
}

.form-input {
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

.form-input:focus {
  border-color: #007acc;
}

.form-input:disabled {
  background: #0c0c0c;
  color: #767676;
  cursor: not-allowed;
}

.info-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 6px;
}

.compact-info-section {
  margin-bottom: 12px;
  padding: 10px 16px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 6px;
}

.compact-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compact-requirement-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.requirement-brief {
  flex: 1;
  font-size: 13px;
  color: #969696;
  line-height: 1.5;
}

.iteration-select {
  flex: 1;
  padding: 4px 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
  cursor: pointer;
}

.iteration-select:focus {
  border-color: #007acc;
}

.iteration-select:disabled {
  background: #0c0c0c;
  color: #767676;
  cursor: not-allowed;
}

.iteration-select option:disabled {
  color: #767676;
  font-style: italic;
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

.reset-prompt-btn {
  margin-left: auto;
  padding: 4px 8px;
  background: #0e639c;
  border: none;
  color: white;
  font-size: 11px;
  font-weight: normal;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: none;
}

.reset-prompt-btn:hover {
  background: #1177bb;
}

.reset-prompt-btn svg {
  width: 12px;
  height: 12px;
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


.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.executed {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-badge svg {
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

.execute-btn:hover {
  background: #1a9b6e;
}

.btn-icon {
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

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
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.form-textarea:focus {
  border-color: #007acc;
}

.form-textarea.large {
  min-height: 120px;
}

.command-result {
  margin-bottom: 24px;
  padding: 16px;
  background: #1a1a1a;
  border: 1px solid #3e3e42;
  border-radius: 6px;
}

.command-result .section-title {
  margin-bottom: 12px;
}


.form-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #3e3e42;
}

.actions-right {
  margin-left: auto;
  display: flex;
  gap: 12px;
  align-items: center;
}

.save-dropdown {
  position: relative;
}

.save-btn-group {
  display: flex;
}

.save-main-btn {
  border-radius: 4px 0 0 4px;
  border-right: 1px solid rgba(0, 0, 0, 0.2);
}

.save-dropdown-btn {
  padding: 8px 10px;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  min-width: 180px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #cccccc;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dropdown-item:hover {
  background: #2d2d30;
}

.dropdown-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.btn-icon {
  font-size: 14px;
}

.generate-btn.btn-secondary {
  background: #0e639c;
  color: white;
  border-color: #0e639c;
}

.generate-btn.btn-secondary:hover:not(:disabled) {
  background: #1177bb;
  border-color: #1177bb;
}

.execute-btn.btn-secondary {
  background: #16825d;
  color: white;
  border-color: #16825d;
}

.execute-btn.btn-secondary:hover:not(:disabled) {
  background: #1a9b6e;
  border-color: #1a9b6e;
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

.btn-success {
  background: #16825d;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1a9b6e;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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



/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>