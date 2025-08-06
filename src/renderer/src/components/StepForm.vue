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
            <MonacoEditor
              v-model="formData.requirements.userRequirement"
              language="markdown"
              :height="150"
              placeholder="例如：我需要一个在线商城系统，支持商品管理、订单管理、用户管理等功能..."
            />
          </div>
        </div>

        <!-- 提示词输入区 -->
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">提示词</span>
            <span class="label-hint">可以修改默认提示词以满足特定需求</span>
          </div>
          <div class="input-wrapper">
            <MonacoEditor
              v-model="getCurrentFormData().prompt"
              language="markdown"
              :height="activeStep === 0 ? 120 : 150"
              placeholder="在这里输入提示词..."
            />
          </div>
        </div>

        <!-- JSON Schema 输入区 -->
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">JSON Schema</span>
            <span class="label-hint">定义输出的结构化数据格式</span>
          </div>
          <div class="input-wrapper">
            <MonacoEditor
              v-model="getCurrentFormData().schema"
              language="json"
              :height="activeStep === 0 ? 120 : 150"
              placeholder='{"type": "object", "properties": {...}}'
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
              @click="resetToDefault"
              size="large"
            >
              <el-icon><RefreshRight /></el-icon>
              重置默认
            </el-button>
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
import { ArrowLeft, ArrowRight, VideoPlay, RefreshRight } from '@element-plus/icons-vue'
import MonacoEditor from './MonacoEditor.vue'

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

// 预置的提示词和Schema
const defaultPrompts = {
  requirements: `请基于用户需求进行详细的需求分析，包括：
1. 功能需求分析
2. 非功能需求（性能、安全、可用性等）
3. 技术约束和限制
4. 用户角色和权限
5. 业务流程分析`,
  design: `请设计系统架构，包括：
1. 系统架构图
2. 技术选型（前端、后端、数据库等）
3. 模块划分和职责
4. 接口设计
5. 数据模型设计`,
  tasks: `请制定开发任务计划，包括：
1. 任务分解（WBS）
2. 任务优先级
3. 时间估算
4. 依赖关系
5. 里程碑设置`,
  coding: `请根据设计方案编写代码，包括：
1. 核心功能实现
2. 代码结构组织
3. 错误处理
4. 单元测试
5. 代码注释和文档`
}

const defaultSchemas = {
  requirements: JSON.stringify({
    type: 'object',
    properties: {
      functionalRequirements: {
        type: 'array',
        items: { type: 'string' }
      },
      nonFunctionalRequirements: {
        type: 'object',
        properties: {
          performance: { type: 'string' },
          security: { type: 'string' },
          usability: { type: 'string' }
        }
      },
      constraints: {
        type: 'array',
        items: { type: 'string' }
      },
      userRoles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }, null, 2),
  design: JSON.stringify({
    type: 'object',
    properties: {
      architecture: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          layers: { type: 'array', items: { type: 'string' } }
        }
      },
      techStack: {
        type: 'object',
        properties: {
          frontend: { type: 'string' },
          backend: { type: 'string' },
          database: { type: 'string' }
        }
      },
      modules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            responsibility: { type: 'string' }
          }
        }
      }
    }
  }, null, 2),
  tasks: JSON.stringify({
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            estimatedHours: { type: 'number' },
            dependencies: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      milestones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            date: { type: 'string' },
            deliverables: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }, null, 2),
  coding: JSON.stringify({
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            language: { type: 'string' },
            purpose: { type: 'string' },
            code: { type: 'string' }
          }
        }
      },
      tests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    }
  }, null, 2)
}

const formData = reactive({
  requirements: {
    userRequirement: '',
    prompt: defaultPrompts.requirements,
    schema: defaultSchemas.requirements
  },
  design: {
    prompt: defaultPrompts.design,
    schema: defaultSchemas.design
  },
  tasks: {
    prompt: defaultPrompts.tasks,
    schema: defaultSchemas.tasks
  },
  coding: {
    prompt: defaultPrompts.coding,
    schema: defaultSchemas.coding
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

const resetToDefault = () => {
  const currentStep = steps[activeStep.value].key
  const stepData = formData[currentStep as keyof typeof formData]
  
  // 重置提示词和Schema为默认值
  stepData.prompt = defaultPrompts[currentStep as keyof typeof defaultPrompts]
  stepData.schema = defaultSchemas[currentStep as keyof typeof defaultSchemas]
  
  ElMessage.success('已重置为默认值')
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
  min-height: 0;
  background: #fafafa;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  width: 240px;
  min-width: 240px;
  flex-shrink: 0;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
  overflow: hidden;
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
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
  display: flex;
  gap: 10px;
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