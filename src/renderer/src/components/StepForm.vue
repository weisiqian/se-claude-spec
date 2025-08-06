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

      <div class="form-wrapper">
        <div class="form-container">
        <!-- 用户需求输入区（仅在需求分析阶段显示） -->
        <div v-if="activeStep === 0" class="input-group">
          <div class="input-label">
            <span class="label-text">用户需求</span>
            <span class="label-hint">请详细描述您的项目需求</span>
          </div>
          <div class="input-wrapper">
            <MonacoEditor
              ref="userRequirementEditor"
              v-model="formData.requirements.userRequirement"
              language="markdown"
              :height="150"
              placeholder="例如：我需要一个在线商城系统，支持商品管理、订单管理、用户管理等功能..."
              @contextmenu="showSimpleContextMenu"
              @maximize="handleSimpleEditorMaximize"
            />
          </div>
        </div>

        <!-- 提示词输入区 -->
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">提示词</span>
            <span class="label-hint">
              可使用占位符动态插入内容
              <el-tooltip 
                placement="top-start"
                :width="400"
                :height="240"
                effect="light"
              >
                <template #content>
                  <div class="placeholder-help">
                    <h4>可用占位符：</h4>
                    <div class="placeholder-item">
                      <code v-text="'{{userRequirement}}'"></code>
                      <span>用户输入的需求描述（仅在需求分析阶段可用）</span>
                    </div>
                    <div class="placeholder-item">
                      <code v-text="'{{jsonSchema}}'"></code>
                      <span>当前步骤定义的 JSON Schema</span>
                    </div>
                    <div class="placeholder-item">
                      <code v-text="'{{previousResult}}'"></code>
                      <span>上一步骤的执行结果（第二步开始可用）</span>
                    </div>
                    <h4 style="margin-top: 12px;">使用示例：</h4>
                    <div class="placeholder-example">
                      <pre v-text="placeholderExample"></pre>
                    </div>
                    <p class="placeholder-tip">
                      占位符会在执行时自动替换为实际内容。点击"预览提示词"可查看替换后的效果。
                    </p>
                  </div>
                </template>
                <el-icon class="help-icon">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </div>
          <div class="input-wrapper">
            <MonacoEditor
              ref="promptEditor"
              v-model="getCurrentFormData().prompt"
              language="markdown"
              :height="activeStep === 0 ? 230 : 150"
              placeholder="在这里输入提示词..."
              :readOnly="isPreviewMode"
              @contextmenu="showContextMenu"
              @maximize="handleMaximizeChange"
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
              ref="schemaEditor"
              v-model="getCurrentFormData().schema"
              language="json"
              :height="activeStep === 0 ? 230 : 150"
              placeholder='{"type": "object", "properties": {...}}'
              @contextmenu="showSimpleContextMenu"
              @maximize="handleSimpleEditorMaximize"
            />
          </div>
        </div>
      </div>

      <!-- 操作按钮区（固定在底部） -->
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
  
  <!-- 右键菜单 -->
  <div 
    v-if="contextMenuVisible"
    class="context-menu"
    :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
    @click.stop
  >
    <!-- 占位符菜单项 -->
    <div 
      class="context-menu-item has-submenu"
      @mouseenter="showSubmenu = 'placeholder'"
      @mouseleave="handleSubmenuLeave"
    >
      <span class="menu-text">插入占位符</span>
      <el-icon class="menu-arrow"><ArrowRight /></el-icon>
      
      <!-- 二级菜单 -->
      <div 
        v-if="showSubmenu === 'placeholder'"
        class="context-submenu"
        @mouseenter="handleSubmenuEnter"
        @mouseleave="handleSubmenuLeave"
      >
        <div 
          v-for="placeholder in availablePlaceholders" 
          :key="placeholder.value"
          class="context-menu-item submenu-item"
          @click="insertPlaceholder(placeholder.value)"
        >
          <code class="menu-code">{{ placeholder.value }}</code>
          <span class="menu-desc">{{ placeholder.label }}</span>
        </div>
      </div>
    </div>
    
    <div class="context-menu-divider"></div>
    
    <!-- 预览菜单项 -->
    <div 
      class="context-menu-item"
      @click="togglePreviewMode"
    >
      <span class="menu-text">{{ isPreviewMode ? '取消预览' : '预览提示词' }}</span>
      <span class="menu-shortcut">{{ isPreviewMode ? 'Esc' : 'Ctrl+P' }}</span>
    </div>
    
    <div class="context-menu-divider"></div>
    
    <!-- 最大化菜单项 -->
    <div 
      class="context-menu-item"
      @click="toggleMaximizeForCurrentEditor"
    >
      <span class="menu-text">{{ isMaximized ? '退出最大化' : '最大化' }}</span>
      <span class="menu-shortcut">{{ isMaximized ? 'ESC' : 'F11' }}</span>
    </div>
  </div>
  
  <!-- 简单右键菜单（仅全屏） -->
  <div 
    v-if="simpleContextMenuVisible"
    class="context-menu"
    :style="{ left: simpleContextMenuPosition.x + 'px', top: simpleContextMenuPosition.y + 'px' }"
    @click.stop
  >
    <div 
      class="context-menu-item"
      @click="toggleMaximizeForSimpleEditor"
    >
      <span class="menu-text">{{ currentEditorMaximized ? '退出最大化' : '最大化' }}</span>
      <span class="menu-shortcut">{{ currentEditorMaximized ? 'ESC' : 'F11' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { ElMessage, ElTooltip } from 'element-plus'
import { ArrowLeft, ArrowRight, VideoPlay, RefreshRight, Close, QuestionFilled } from '@element-plus/icons-vue'
import MonacoEditor from './MonacoEditor.vue'

interface StepFormData {
  prompt: string
  schema: string
  userRequirement?: string
  result?: string // 存储每个步骤的执行结果
}

interface Step {
  key: string
  title: string
  subtitle: string
  description: string
}

const activeStep = ref(0)
const promptEditor = ref<any>(null)
const userRequirementEditor = ref<any>(null)
const schemaEditor = ref<any>(null)
const isPreviewMode = ref(false)
const originalPrompt = ref('')
const isMaximized = ref(false)
const currentEditorRef = ref<any>(null)
const currentEditorMaximized = ref(false)

// 右键菜单相关
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const showSubmenu = ref<string | null>(null)
let submenuTimer: NodeJS.Timeout | null = null

// 简单右键菜单相关
const simpleContextMenuVisible = ref(false)
const simpleContextMenuPosition = ref({ x: 0, y: 0 })

// 可用的占位符
const availablePlaceholders = computed(() => {
  const placeholders = [
    { value: '{{jsonSchema}}', label: '当前步骤的 JSON Schema' }
  ]
  
  // 需求分析阶段可以使用 userRequirement
  if (activeStep.value === 0) {
    placeholders.unshift({ value: '{{userRequirement}}', label: '用户输入的需求' })
  }
  
  // 非第一步可以使用 previousResult
  if (activeStep.value > 0) {
    placeholders.push({ value: '{{previousResult}}', label: '上一步的执行结果' })
  }
  
  return placeholders
})

// 占位符示例文本
const placeholderExample = `基于用户需求：
{{userRequirement}}

请按照以下格式输出：
{{jsonSchema}}`

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

// 预置的提示词和Schema (支持占位符)
const defaultPrompts = {
  requirements: `用户需求：
{{userRequirement}}

请基于以上用户需求进行详细的需求分析，输出格式需要符合以下 JSON Schema：
{{jsonSchema}}

分析内容包括：
1. 功能需求分析
2. 非功能需求（性能、安全、可用性等）
3. 技术约束和限制
4. 用户角色和权限
5. 业务流程分析`,
  design: `基于需求分析结果：
{{previousResult}}

请设计系统架构，输出格式需要符合以下 JSON Schema：
{{jsonSchema}}

设计内容包括：
1. 系统架构图
2. 技术选型（前端、后端、数据库等）
3. 模块划分和职责
4. 接口设计
5. 数据模型设计`,
  tasks: `基于系统设计方案：
{{previousResult}}

请制定开发任务计划，输出格式需要符合以下 JSON Schema：
{{jsonSchema}}

计划内容包括：
1. 任务分解（WBS）
2. 任务优先级
3. 时间估算
4. 依赖关系
5. 里程碑设置`,
  coding: `基于开发任务：
{{previousResult}}

请根据设计方案编写代码，输出格式需要符合以下 JSON Schema：
{{jsonSchema}}

开发内容包括：
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
    schema: defaultSchemas.requirements,
    result: ''
  },
  design: {
    prompt: defaultPrompts.design,
    schema: defaultSchemas.design,
    result: ''
  },
  tasks: {
    prompt: defaultPrompts.tasks,
    schema: defaultSchemas.tasks,
    result: ''
  },
  coding: {
    prompt: defaultPrompts.coding,
    schema: defaultSchemas.coding,
    result: ''
  }
})

const getCurrentFormData = () => {
  const key = steps[activeStep.value].key
  return formData[key as keyof typeof formData]
}

// 替换提示词中的占位符
const replacePlaceholders = (prompt: string, stepKey: string): string => {
  let finalPrompt = prompt
  const stepData = formData[stepKey as keyof typeof formData]
  
  // 替换 {{userRequirement}} 占位符
  if ('userRequirement' in stepData && stepData.userRequirement) {
    finalPrompt = finalPrompt.replace(/\{\{userRequirement\}\}/g, stepData.userRequirement)
  }
  
  // 替换 {{jsonSchema}} 占位符
  if (stepData.schema) {
    finalPrompt = finalPrompt.replace(/\{\{jsonSchema\}\}/g, stepData.schema)
  }
  
  // 替换 {{previousResult}} 占位符 - 获取上一步的结果
  if (stepKey !== 'requirements') {
    const prevStepIndex = steps.findIndex(s => s.key === stepKey) - 1
    if (prevStepIndex >= 0) {
      const prevStepKey = steps[prevStepIndex].key
      const prevStepData = formData[prevStepKey as keyof typeof formData]
      if ('result' in prevStepData && prevStepData.result) {
        finalPrompt = finalPrompt.replace(/\{\{previousResult\}\}/g, prevStepData.result)
      } else {
        finalPrompt = finalPrompt.replace(/\{\{previousResult\}\}/g, '（上一步结果尚未生成）')
      }
    }
  }
  
  return finalPrompt
}

// 切换预览模式
const togglePreviewMode = () => {
  const currentStep = steps[activeStep.value].key
  const stepData = formData[currentStep as keyof typeof formData]
  
  if (!isPreviewMode.value) {
    // 进入预览模式
    if (!stepData.prompt) {
      ElMessage.warning('请先输入提示词')
      hideContextMenu()
      return
    }
    
    originalPrompt.value = stepData.prompt
    stepData.prompt = replacePlaceholders(stepData.prompt, currentStep)
    isPreviewMode.value = true
  } else {
    // 取消预览模式
    stepData.prompt = originalPrompt.value
    isPreviewMode.value = false
  }
  
  hideContextMenu()
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

// 显示右键菜单
const showContextMenu = (event: { x: number, y: number, position: any }) => {
  contextMenuPosition.value = { x: event.x, y: event.y }
  contextMenuVisible.value = true
  currentEditorRef.value = promptEditor.value
  
  // 添加全局点击监听，用于关闭菜单
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true })
  }, 0)
}

// 显示简单右键菜单
const showSimpleContextMenu = (event: { x: number, y: number, position: any }) => {
  simpleContextMenuPosition.value = { x: event.x, y: event.y }
  simpleContextMenuVisible.value = true
  
  // 根据事件来源确定当前编辑器
  if (event.x && event.y) {
    // 通过判断是哪个编辑器触发的事件
    if (activeStep.value === 0 && userRequirementEditor.value) {
      currentEditorRef.value = userRequirementEditor.value
    } else if (schemaEditor.value) {
      currentEditorRef.value = schemaEditor.value
    }
  }
  
  // 添加全局点击监听，用于关闭菜单
  setTimeout(() => {
    document.addEventListener('click', hideSimpleContextMenu, { once: true })
  }, 0)
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
  showSubmenu.value = null
  if (submenuTimer) {
    clearTimeout(submenuTimer)
    submenuTimer = null
  }
}

// 隐藏简单右键菜单
const hideSimpleContextMenu = () => {
  simpleContextMenuVisible.value = false
}

// 插入占位符
const insertPlaceholder = (placeholder: string) => {
  if (promptEditor.value) {
    promptEditor.value.insertTextAtCursor(placeholder)
  }
  hideContextMenu()
}

// 处理子菜单鼠标离开事件
const handleSubmenuLeave = () => {
  // 添加延迟，避免鼠标快速移动时子菜单立即关闭
  if (submenuTimer) {
    clearTimeout(submenuTimer)
  }
  submenuTimer = setTimeout(() => {
    showSubmenu.value = null
  }, 300)
}

// 处理子菜单鼠标进入事件
const handleSubmenuEnter = () => {
  // 清除定时器，保持子菜单打开
  if (submenuTimer) {
    clearTimeout(submenuTimer)
    submenuTimer = null
  }
  showSubmenu.value = 'placeholder'
}

// 处理最大化状态变化
const handleMaximizeChange = (maximized: boolean) => {
  isMaximized.value = maximized
}

// 处理简单编辑器最大化状态变化
const handleSimpleEditorMaximize = (maximized: boolean) => {
  currentEditorMaximized.value = maximized
}

// 切换当前编辑器的最大化
const toggleMaximizeForCurrentEditor = () => {
  if (promptEditor.value) {
    promptEditor.value.toggleMaximize()
  }
  hideContextMenu()
}

// 切换简单菜单编辑器的最大化
const toggleMaximizeForSimpleEditor = () => {
  if (currentEditorRef.value) {
    currentEditorRef.value.toggleMaximize()
  }
  hideSimpleContextMenu()
}

// 监听ESC键退出预览模式
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isPreviewMode.value) {
    togglePreviewMode()
  }
}

// 监听预览模式变化
watch(isPreviewMode, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleEscKey)
  } else {
    document.removeEventListener('keydown', handleEscKey)
  }
})

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
  
  // 替换占位符，获取最终提示词
  const finalPrompt = replacePlaceholders(stepData.prompt, stepName)
  
  // 这里可以添加实际的执行逻辑，将 finalPrompt 发送给 AI API
  console.log('最终提示词:', finalPrompt)
  console.log('JSON Schema:', stepData.schema)
  
  // 模拟生成结果并保存
  if ('result' in stepData) {
    stepData.result = `这是 ${steps[activeStep.value].title} 的执行结果（模拟数据）`
  }
  
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
  overflow: hidden;
}

.content-header {
  padding: 24px 32px 0;
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

.form-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 32px;
}

.form-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.form-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
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
  position: relative;
}

/* 预览模式容器 */
.preview-mode-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 100;
}

.preview-exit-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.preview-exit-btn:hover {
  background: #ffffff;
  border-color: #d1d5db;
  color: #374151;
  transform: scale(1.05);
}

.preview-exit-btn:active {
  background: #f9fafb;
  transform: scale(0.95);
}


/* 操作栏样式 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
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

/* 预览对话框样式 */
.final-prompt-container {
  padding: 10px 0;
}

.prompt-hint {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
  border-left: 3px solid #4f46e5;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.el-dialog__body) {
  padding: 20px;
  max-height: 70vh;
  overflow: auto;
}

:deep(.el-dialog__footer) {
  padding: 15px 20px;
  border-top: 1px solid #e5e7eb;
}

/* Tooltip 帮助图标样式 */
.help-icon {
  color: #4f46e5;
  cursor: help;
  margin-left: 4px;
  font-size: 14px;
  vertical-align: middle;
  transition: color 0.2s;
}

.help-icon:hover {
  color: #4338ca;
}

/* Tooltip 内容样式 */
.placeholder-help {
  padding: 4px;
  font-size: 13px;
  line-height: 1.6;
}

.placeholder-help h4 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
}

.placeholder-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
}

.placeholder-item code {
  background: #f3f4f6;
  color: #4f46e5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  white-space: nowrap;
  min-width: 140px;
}

.placeholder-item span {
  color: #6b7280;
  flex: 1;
}

.placeholder-example {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  margin: 8px 0;
}

.placeholder-example pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #374151;
  white-space: pre-wrap;
}

.placeholder-tip {
  margin: 12px 0 0 0;
  padding: 8px;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  color: #1e40af;
  font-size: 12px;
}

/* Tooltip 样式覆盖 */
:deep(.el-tooltip__popper.is-light) {
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.el-tooltip__popper.is-light[data-popper-placement^="top"] .el-tooltip__arrow::before) {
  border-top-color: #e5e7eb;
}

/* 右键菜单样式 - 桌面应用风格 */
.context-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 4px 0;
  z-index: 10000;
  min-width: 200px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-size: 13px;
}


.context-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  color: #1f2937;
  position: relative;
  white-space: nowrap;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-item.has-submenu {
  padding-right: 12px;
}


.menu-text {
  flex: 1;
}

.menu-arrow {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 24px;
}

.menu-shortcut {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
}

/* 分隔线样式 */
.context-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

/* 二级菜单样式 */
.context-submenu {
  position: absolute;
  left: 100%;
  top: -4px;
  margin-left: 2px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 4px 0;
  min-width: 240px;
}

.context-submenu .submenu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
}

.context-submenu .submenu-item:hover {
  background: #f3f4f6;
}

.menu-code {
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  font-size: 12px;
  color: #4f46e5;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 3px;
  min-width: 120px;
}

.menu-desc {
  font-size: 12px;
  color: #6b7280;
  flex: 1;
}

</style>