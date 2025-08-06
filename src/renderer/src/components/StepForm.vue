<template>
  <div class="step-form-container">
    <!-- 侧边栏步骤导航 -->
    <div class="sidebar">
      <div class="step-list">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          :class="['step-item', { active: activeStep === index, completed: index < activeStep }]"
          @click="activeStep = index"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-info">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-subtitle">{{ step.subtitle }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <div class="content-header">
        <h2>{{ steps[activeStep].title }}</h2>
        <p>{{ steps[activeStep].description }}</p>
      </div>

      <div class="form-container">
        <!-- 用户需求输入区（仅在需求分析阶段显示） -->
        <div v-if="activeStep === 0" class="input-group">
          <div class="input-label">
            <span class="label-text">用户需求</span>
            <span class="label-hint">请详细描述您的项目需求</span>
          </div>
          <div class="input-wrapper">
            <el-input
              v-model="formData.requirements.userRequirement"
              type="textarea"
              :rows="6"
              placeholder="例如：我需要一个在线商城系统，支持商品管理、订单管理、用户管理等功能..."
              resize="none"
            />
          </div>
        </div>

        <!-- 提示词输入区 -->
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">提示词</span>
            <span class="label-hint">{{ activeStep === 0 ? '补充分析要求（可选）' : '描述您的需求和期望' }}</span>
          </div>
          <div class="input-wrapper">
            <el-input
              v-model="getCurrentFormData().prompt"
              type="textarea"
              :rows="activeStep === 0 ? 4 : 8"
              :placeholder="activeStep === 0 ? '例如：请重点分析性能需求和安全需求...' : '在这里输入提示词...'"
              resize="none"
            />
          </div>
        </div>

        <!-- JSON Schema 输入区 -->
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">JSON Schema</span>
            <span class="label-hint">定义输出格式（可选）</span>
          </div>
          <div class="input-wrapper">
            <el-input
              v-model="getCurrentFormData().schema"
              type="textarea"
              :rows="activeStep === 0 ? 4 : 8"
              placeholder='{"type": "object", "properties": {...}}'
              resize="none"
            />
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="action-bar">
          <div class="action-left">
            <el-button 
              v-if="activeStep > 0" 
              size="large"
              @click="previousStep"
            >
              <el-icon><ArrowLeft /></el-icon>
              上一步
            </el-button>
          </div>
          <div class="action-center">
            <el-button 
              type="primary" 
              size="large"
              @click="executeStep(steps[activeStep].key)"
            >
              <el-icon><VideoPlay /></el-icon>
              执行{{ steps[activeStep].title }}
            </el-button>
          </div>
          <div class="action-right">
            <el-button 
              v-if="activeStep < 3" 
              size="large"
              @click="nextStep"
            >
              下一步
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, VideoPlay } from '@element-plus/icons-vue'

interface StepFormData {
  prompt: string
  schema: string
  userRequirement?: string
}

interface Step {
  key: string
  title: string
  subtitle: string
  description: string
}

const activeStep = ref(0)

const steps: Step[] = [
  {
    key: 'requirements',
    title: '需求分析',
    subtitle: '理解项目需求',
    description: '分析和定义系统的功能需求、性能需求和约束条件'
  },
  {
    key: 'design',
    title: '系统设计',
    subtitle: '架构与技术方案',
    description: '设计系统架构、技术选型和模块划分'
  },
  {
    key: 'tasks',
    title: '任务制定',
    subtitle: '分解开发任务',
    description: '将需求分解为可执行的开发任务和里程碑'
  },
  {
    key: 'coding',
    title: '编码开发',
    subtitle: '实现功能代码',
    description: '根据设计方案编写代码，实现系统功能'
  }
]

const formData = reactive({
  requirements: {
    userRequirement: '',
    prompt: '',
    schema: ''
  },
  design: {
    prompt: '',
    schema: ''
  },
  tasks: {
    prompt: '',
    schema: ''
  },
  coding: {
    prompt: '',
    schema: ''
  }
})

const getCurrentFormData = () => {
  const key = steps[activeStep.value].key
  return formData[key as keyof typeof formData]
}

const nextStep = () => {
  if (activeStep.value < 3) {
    activeStep.value++
  }
}

const previousStep = () => {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

const executeStep = (stepName: string) => {
  const stepData = formData[stepName as keyof typeof formData]
  
  // 需求分析阶段验证用户需求
  if (stepName === 'requirements' && 'userRequirement' in stepData) {
    if (!stepData.userRequirement.trim()) {
      ElMessage.warning('请输入用户需求')
      return
    }
  }
  
  // 验证输入
  if (!stepData.prompt.trim()) {
    ElMessage.warning('请输入提示词')
    return
  }
  
  if (stepData.schema.trim()) {
    try {
      JSON.parse(stepData.schema)
    } catch (error) {
      ElMessage.error('JSON Schema 格式不正确')
      return
    }
  }
  
  // 这里可以添加实际的执行逻辑
  ElMessage.success(`${steps[activeStep.value].title}执行成功！`)
  
  // 自动进入下一步
  if (activeStep.value < 3) {
    setTimeout(() => {
      nextStep()
    }, 1000)
  }
}
</script>

<style scoped>
.step-form-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #fafafa;
}

/* 侧边栏样式 */
.sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #e4e4e7;
  padding: 20px;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: white;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-item:hover {
  background: #f9f9f9;
  border-color: #e4e4e7;
}

.step-item.active {
  background: #4f46e5;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
}

.step-item.completed {
  opacity: 0.7;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  margin-right: 12px;
  font-size: 13px;
}

.step-item.active .step-number {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.step-info {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.step-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.step-item.active .step-title {
  color: white;
}

.step-item.active .step-subtitle {
  color: rgba(255, 255, 255, 0.85);
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
}

.content-header {
  margin-bottom: 20px;
}

.content-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6px;
}

.content-header p {
  font-size: 14px;
  color: #6b7280;
}

.form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.label-text {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.label-hint {
  font-size: 12px;
  color: #9ca3af;
}

.input-wrapper {
  flex: 1;
}

/* 自定义输入框样式 */
:deep(.el-textarea) {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-textarea__inner) {
  background: white;
  border: 1px solid #e5e7eb;
  color: #1f2937;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.el-textarea__inner:hover) {
  border-color: #d1d5db;
  background: #fafafa;
}

:deep(.el-textarea__inner:focus) {
  border-color: #4f46e5;
  background: white;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

:deep(.el-textarea__inner::placeholder) {
  color: #9ca3af;
}

/* 操作栏样式 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.action-left,
.action-right {
  flex: 0 0 100px;
}

.action-center {
  flex: 0 0 auto;
}

/* 按钮样式 */
:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  padding: 8px 16px;
  height: auto;
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
  transition: all 0.2s ease;
}

:deep(.el-button:hover) {
  background: #f9fafb;
  border-color: #d1d5db;
}

:deep(.el-button--primary) {
  background: #4f46e5;
  border: none;
  color: white;
}

:deep(.el-button--primary:hover) {
  background: #4338ca;
}

:deep(.el-button--large) {
  font-size: 14px;
  padding: 10px 20px;
}

:deep(.el-icon) {
  font-size: 14px;
}
</style>