<template>
  <div class="form-container">
    <div class="form-header">
      <h3>{{ formTitle }}</h3>
      <p>{{ formDescription }}</p>
    </div>

    <div class="form-content">
      <!-- 需求文档表单 -->
      <div v-if="type === 'requirement'" class="form-section">
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">需求名称</span>
          </div>
          <el-input 
            v-model="formData.name" 
            placeholder="请输入需求名称"
          />
        </div>

        <div class="input-group">
          <div class="input-label">
            <span class="label-text">需求描述</span>
          </div>
          <MonacoEditor
            v-model="formData.content"
            language="markdown"
            :height="400"
            placeholder="请输入需求描述..."
          />
        </div>
      </div>

      <!-- 设计文档表单 -->
      <div v-if="type === 'design'" class="form-section">
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">设计名称</span>
          </div>
          <el-input 
            v-model="formData.name" 
            placeholder="请输入设计名称"
          />
        </div>

        <div class="input-group">
          <div class="input-label">
            <span class="label-text">设计内容</span>
          </div>
          <MonacoEditor
            v-model="formData.content"
            language="markdown"
            :height="400"
            placeholder="请输入设计内容..."
          />
        </div>
      </div>

      <!-- 任务清单表单 -->
      <div v-if="type === 'task'" class="form-section">
        <div class="input-group">
          <div class="input-label">
            <span class="label-text">任务名称</span>
          </div>
          <el-input 
            v-model="formData.name" 
            placeholder="请输入任务名称"
          />
        </div>

        <div class="input-group">
          <div class="input-label">
            <span class="label-text">任务列表</span>
          </div>
          <MonacoEditor
            v-model="formData.content"
            language="json"
            :height="400"
            placeholder='{"tasks": []}'
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit">
          {{ action === 'create' ? '创建' : action === 'update' ? '更新' : '执行' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps<{
  type: 'requirement' | 'design' | 'task'
  action: 'create' | 'update' | 'execute'
  projectPath: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const formData = ref({
  name: '',
  content: ''
})

const formTitle = computed(() => {
  const titles = {
    requirement: '需求文档',
    design: '设计文档',
    task: '任务清单'
  }
  const actions = {
    create: '新建',
    update: '更新',
    execute: '执行'
  }
  return `${actions[props.action]}${titles[props.type]}`
})

const formDescription = computed(() => {
  const descriptions = {
    requirement: {
      create: '创建新的需求文档',
      update: '更新现有需求文档',
      execute: ''
    },
    design: {
      create: '创建新的设计文档',
      update: '更新现有设计文档',
      execute: ''
    },
    task: {
      create: '创建新的任务清单',
      update: '更新现有任务清单',
      execute: '执行任务清单'
    }
  }
  return descriptions[props.type][props.action]
})

const handleCancel = () => {
  formData.value = {
    name: '',
    content: ''
  }
  emit('close')
}

const handleSubmit = async () => {
  if (!formData.value.name) {
    ElMessage.warning('请输入名称')
    return
  }

  if (!formData.value.content) {
    ElMessage.warning('请输入内容')
    return
  }

  try {
    // 这里添加实际的保存逻辑
    ElMessage.success(`${formTitle.value}成功`)
    handleCancel()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

watch([() => props.type, () => props.action], () => {
  formData.value = {
    name: '',
    content: ''
  }
})
</script>

<style scoped>
.form-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--wt-bg-secondary);
  padding: 24px;
  border-radius: var(--wt-radius);
}

.form-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--wt-border);
}

.form-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--wt-text-primary);
  margin: 0 0 8px 0;
  font-family: var(--wt-font);
}

.form-header p {
  font-size: 14px;
  color: var(--wt-text-secondary);
  margin: 0;
}

.form-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.input-group {
  margin-bottom: 20px;
}

.input-group:last-child {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.input-label {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--wt-text-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--wt-border);
  margin-top: auto;
}

:deep(.el-input__wrapper) {
  background-color: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  color: var(--wt-text-primary);
}

:deep(.el-input__inner) {
  color: var(--wt-text-primary);
  font-family: var(--wt-font);
}

:deep(.el-input__wrapper:hover) {
  border-color: var(--wt-accent);
  background-color: var(--wt-bg-hover);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--wt-accent);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

:deep(.el-button) {
  border-radius: var(--wt-radius);
  font-family: var(--wt-font);
  transition: all 0.15s;
}

:deep(.el-button--default) {
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  color: var(--wt-text-primary);
}

:deep(.el-button--default:hover) {
  background: var(--wt-bg-hover);
  border-color: var(--wt-accent);
  color: var(--wt-accent);
}

:deep(.el-button--primary) {
  background: var(--wt-accent);
  border-color: var(--wt-accent);
}

:deep(.el-button--primary:hover) {
  background: var(--wt-accent-hover);
  border-color: var(--wt-accent-hover);
}
</style>