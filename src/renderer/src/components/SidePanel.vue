<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export interface DataItem {
  id: string
  title: string
  description?: string
  status?: string
  createdAt: Date
  updatedAt?: Date
}

const props = defineProps<{
  type: 'requirement' | 'design' | 'task' | ''
  isDark?: boolean
}>()

const emit = defineEmits<{
  close: []
  itemSelect: [item: DataItem | null]
}>()

const showForm = ref(false)
const selectedItem = ref<DataItem | null>(null)
const searchText = ref('')

const items = ref<DataItem[]>([])

// 删除确认弹窗相关
const showDeleteDialog = ref(false)
const deleteTarget = ref<DataItem | null>(null)

const filteredItems = computed(() => {
  if (!searchText.value) return items.value
  const search = searchText.value.toLowerCase()
  return items.value.filter(item => 
    item.title.toLowerCase().includes(search) ||
    item.description?.toLowerCase().includes(search)
  )
})

const panelTitle = computed(() => {
  switch (props.type) {
    case 'requirement': return '需求管理'
    case 'design': return '设计管理'
    case 'task': return '任务管理'
    default: return ''
  }
})

const formFields = computed(() => {
  switch (props.type) {
    case 'requirement':
      return [
        { name: 'title', label: '需求标题', type: 'text', required: true },
        { name: 'description', label: '需求描述', type: 'textarea', required: true },
        { name: 'priority', label: '优先级', type: 'select', options: ['高', '中', '低'] },
        { name: 'status', label: '状态', type: 'select', options: ['待分析', '分析中', '已完成'] }
      ]
    case 'design':
      return [
        { name: 'title', label: '设计标题', type: 'text', required: true },
        { name: 'description', label: '设计说明', type: 'textarea', required: true },
        { name: 'type', label: '设计类型', type: 'select', options: ['架构设计', 'UI设计', '数据库设计'] },
        { name: 'status', label: '状态', type: 'select', options: ['草稿', '评审中', '已确认'] }
      ]
    case 'task':
      return [
        { name: 'title', label: '任务标题', type: 'text', required: true },
        { name: 'description', label: '任务描述', type: 'textarea', required: true },
        { name: 'assignee', label: '负责人', type: 'text' },
        { name: 'dueDate', label: '截止日期', type: 'date' },
        { name: 'status', label: '状态', type: 'select', options: ['待开始', '进行中', '已完成', '已取消'] }
      ]
    default:
      return []
  }
})

const formData = ref<Record<string, any>>({})

watch(() => props.type, (newType) => {
  if (newType) {
    loadItems()
    showForm.value = false
    selectedItem.value = null
    formData.value = {}
  }
})

const loadItems = async () => {
  // 如果是需求管理，从文件系统读取真实数据
  if (props.type === 'requirement') {
    try {
      const requirements = await window.api.getRequirements()
      items.value = requirements.map((req: any) => ({
        id: req.id,
        title: req.title || req.userRequirement.substring(0, 50),
        description: req.description || req.userRequirement,
        status: req.status || 'created',
        createdAt: new Date(req.createdAt),
        updatedAt: req.updatedAt ? new Date(req.updatedAt) : undefined,
        iterationId: req.iterationId,
        userRequirement: req.userRequirement,
        prompt: req.prompt,
        jsonSchema: req.jsonSchema
      }))
    } catch (error) {
      console.error('加载需求列表失败:', error)
      items.value = []
    }
  } else {
    // 其他类型仍从 localStorage 读取
    const storageKey = `${props.type}_items`
    const savedItems = localStorage.getItem(storageKey)
    if (savedItems) {
      items.value = JSON.parse(savedItems).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
      }))
    } else {
      items.value = []
    }
  }
}

const saveItems = () => {
  const storageKey = `${props.type}_items`
  localStorage.setItem(storageKey, JSON.stringify(items.value))
}

const handleCreate = () => {
  // 触发原有的表单页面
  emit('itemSelect', null)
}

const handleEdit = (item: DataItem) => {
  // 如果是需求类型，点击查看详情
  // 对于其他类型，跳转到编辑页面
  emit('itemSelect', item)
}

const handleDelete = (item: DataItem) => {
  deleteTarget.value = item
  showDeleteDialog.value = true
}

const confirmDelete = () => {
  if (deleteTarget.value) {
    const index = items.value.findIndex(i => i.id === deleteTarget.value!.id)
    if (index > -1) {
      items.value.splice(index, 1)
      saveItems()
    }
  }
  cancelDelete()
}

const cancelDelete = () => {
  showDeleteDialog.value = false
  deleteTarget.value = null
}

const handleSubmit = () => {
  if (selectedItem.value) {
    const index = items.value.findIndex(i => i.id === selectedItem.value!.id)
    if (index > -1) {
      items.value[index] = {
        ...formData.value,
        updatedAt: new Date()
      }
    }
  } else {
    const newItem: DataItem = {
      ...formData.value,
      id: Date.now().toString(),
      createdAt: new Date()
    }
    items.value.unshift(newItem)
  }
  saveItems()
  showForm.value = false
  selectedItem.value = null
  formData.value = {}
}

const handleCancel = () => {
  showForm.value = false
  selectedItem.value = null
  formData.value = {}
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 组件挂载时加载数据
onMounted(() => {
  if (props.type) {
    loadItems()
  }
})

// 监听工作空间变化，重新加载需求
if (window.api?.onWorkspaceChanged) {
  window.api.onWorkspaceChanged(() => {
    if (props.type === 'requirement') {
      loadItems()
    }
  })
}
</script>

<template>
  <div class="side-panel" :class="{ 'dark': isDark }" v-if="type">
    <div class="panel-header">
      <h3 class="panel-title">{{ panelTitle }}</h3>
      <button class="close-btn" @click="emit('close')" title="关闭面板">×</button>
    </div>
    
    <div class="panel-toolbar">
      <button class="toolbar-btn primary" @click="handleCreate">
        <span>+ 新建</span>
      </button>
      <input 
        v-model="searchText"
        type="text" 
        class="search-input" 
        :placeholder="`搜索${panelTitle.slice(0, 2)}...`"
      >
    </div>

    <div class="panel-content">
      <div v-if="!showForm" class="items-list">
        <div v-if="filteredItems.length === 0" class="empty-state">
          <div class="empty-icon">
            <!-- 需求空状态图标 -->
            <svg v-if="type === 'requirement'" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="8" width="40" height="48" rx="2" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <line x1="20" y1="20" x2="44" y2="20" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="20" y1="28" x2="44" y2="28" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="20" y1="36" x2="38" y2="36" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="20" y1="44" x2="32" y2="44" stroke="currentColor" stroke-width="2" opacity="0.5"/>
            </svg>
            <!-- 设计空状态图标 -->
            <svg v-else-if="type === 'design'" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="20" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <rect x="8" y="36" width="16" height="16" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <polygon points="48,36 56,52 40,52" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <line x1="32" y1="28" x2="32" y2="32" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="16" y1="44" x2="20" y2="44" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="48" y1="44" x2="44" y2="48" stroke="currentColor" stroke-width="2" opacity="0.5"/>
            </svg>
            <!-- 任务空状态图标 -->
            <svg v-else-if="type === 'task'" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="12" width="40" height="40" rx="2" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <rect x="18" y="20" width="4" height="4" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="26" y1="22" x2="44" y2="22" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <rect x="18" y="30" width="4" height="4" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="26" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <rect x="18" y="40" width="4" height="4" stroke="currentColor" stroke-width="2" opacity="0.5"/>
              <line x1="26" y1="42" x2="38" y2="42" stroke="currentColor" stroke-width="2" opacity="0.5"/>
            </svg>
          </div>
          <p>暂无{{ panelTitle.slice(0, 2) }}</p>
          <button class="link-btn" @click="handleCreate">创建第一个{{ panelTitle.slice(0, 2) }}</button>
        </div>
        <div 
          v-else
          v-for="item in filteredItems" 
          :key="item.id"
          class="list-item"
          @click="handleEdit(item)"
        >
          <div class="item-header">
            <h4 class="item-title">{{ item.title }}</h4>
            <span v-if="item.status" class="item-status" :class="`status-${item.status}`">
              {{ item.status }}
            </span>
          </div>
          <p v-if="item.description" class="item-description">{{ item.description }}</p>
          <div class="item-footer">
            <span class="item-date">{{ formatDate(item.createdAt) }}</span>
            <button class="delete-btn" @click.stop="handleDelete(item)" title="删除">🗑️</button>
          </div>
        </div>
      </div>

      <div v-else class="form-container">
        <h3 class="form-title">{{ selectedItem ? '编辑' : '新建' }}{{ panelTitle.slice(0, 2) }}</h3>
        <form @submit.prevent="handleSubmit">
          <div v-for="field in formFields" :key="field.name" class="form-group">
            <label :for="field.name" class="form-label">
              {{ field.label }}
              <span v-if="field.required" class="required">*</span>
            </label>
            <input
              v-if="field.type === 'text' || field.type === 'date'"
              :id="field.name"
              v-model="formData[field.name]"
              :type="field.type"
              class="form-input"
              :required="field.required"
            >
            <textarea
              v-else-if="field.type === 'textarea'"
              :id="field.name"
              v-model="formData[field.name]"
              class="form-textarea"
              rows="4"
              :required="field.required"
            ></textarea>
            <select
              v-else-if="field.type === 'select'"
              :id="field.name"
              v-model="formData[field.name]"
              class="form-select"
              :required="field.required"
            >
              <option v-for="option in field.options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn cancel" @click="handleCancel">取消</button>
            <button type="submit" class="btn submit">保存</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteDialog" class="delete-dialog-overlay" @click.self="cancelDelete">
          <div class="delete-dialog">
            <div class="dialog-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14M10 11v6M14 11v6"/>
              </svg>
            </div>
            <h3 class="dialog-title">确认删除</h3>
            <p class="dialog-message">
              确定要删除需求 <strong>"{{ deleteTarget?.title }}"</strong> 吗？
              <br>
              <span class="warning-text">此操作无法撤销</span>
            </p>
            <div class="dialog-actions">
              <button class="dialog-btn cancel-btn" @click="cancelDelete">
                取消
              </button>
              <button class="dialog-btn delete-confirm-btn" @click="confirmDelete">
                删除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.side-panel {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #3e3e42;
  background: #1a1a1a;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
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

.panel-toolbar {
  padding: 12px 16px;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  padding: 6px 12px;
  border: 1px solid #3e3e42;
  background: #2d2d30;
  color: #cccccc;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: #37373d;
}

.toolbar-btn.primary {
  background: #007acc;
  color: white;
  border-color: #007acc;
}

.toolbar-btn.primary:hover {
  background: #0062a3;
}

.search-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #3e3e42;
  background: #1e1e1e;
  color: #cccccc;
  font-size: 13px;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: #007acc;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #5a5a5a;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state p {
  margin: 0 0 16px;
  color: #7a7a7a;
  font-size: 14px;
  font-weight: 500;
}

.link-btn {
  color: #4a90e2;
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 4px;
}

.link-btn:hover {
  background: rgba(74, 144, 226, 0.1);
  color: #5ba0f2;
}

.list-item {
  padding: 12px;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.list-item:hover {
  background: #37373d;
  border-color: #007acc;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;
}

.item-status {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 12px;
  font-weight: 600;
  background: #3e3e42;
  color: #969696;
}

.item-status.status-已完成,
.item-status.status-已确认 {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.item-status.status-进行中,
.item-status.status-分析中,
.item-status.status-评审中 {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.item-status.status-待开始,
.item-status.status-待分析,
.item-status.status-草稿 {
  background: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}

.item-description {
  margin: 0 0 8px;
  font-size: 13px;
  color: #969696;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-date {
  font-size: 11px;
  color: #767676;
}

.delete-btn {
  padding: 4px;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.delete-btn:hover {
  opacity: 1;
}

.form-container {
  padding: 4px;
}

.form-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: #cccccc;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #cccccc;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #3e3e42;
  background: #1e1e1e;
  color: #cccccc;
  font-size: 13px;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #007acc;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #3e3e42;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #3e3e42;
  background: #2d2d30;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:hover {
  background: #37373d;
}

.btn.submit {
  background: #007acc;
  color: white;
  border-color: #007acc;
}

.btn.submit:hover {
  background: #0062a3;
}

.dark .side-panel {
  background: #1e1e1e;
}

.dark .panel-header {
  background: #1a1a1a;
  border-bottom-color: #2d2d30;
}

.dark .panel-toolbar {
  background: #1e1e1e;
  border-bottom-color: #2d2d30;
}

.dark .list-item {
  background: #252526;
  border-color: #2d2d30;
}

.dark .list-item:hover {
  background: #2d2d30;
  transform: translateX(2px);
}

.dark .empty-icon {
  color: #5a5a5a;
}

.dark .empty-state p {
  color: #7a7a7a;
}

.dark .search-input {
  background: #0c0c0c;
  border-color: #2d2d30;
}

.dark .search-input:focus {
  background: #1a1a1a;
  border-color: #4a90e2;
}

.dark .form-input,
.dark .form-textarea,
.dark .form-select {
  background: #0c0c0c;
  border-color: #2d2d30;
}

.dark .btn {
  background: #252526;
  border-color: #2d2d30;
}

.dark .btn:hover {
  background: #2d2d30;
}

.dark .link-btn {
  color: #4a90e2;
}

.dark .link-btn:hover {
  background: rgba(74, 144, 226, 0.1);
  color: #5ba0f2;
}

/* 删除确认弹窗样式 */
.delete-dialog-overlay {
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
  backdrop-filter: blur(2px);
}

.delete-dialog {
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 12px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  text-align: center;
}

.dialog-icon {
  margin-bottom: 20px;
  color: #f44336;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-icon svg {
  width: 48px;
  height: 48px;
}

.dialog-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: #cccccc;
}

.dialog-message {
  margin: 0 0 28px;
  font-size: 14px;
  color: #969696;
  line-height: 1.6;
}

.dialog-message strong {
  color: #d4d4d4;
  font-weight: 500;
}

.warning-text {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #f9c74f;
  font-style: italic;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
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

.delete-confirm-btn {
  background: #f44336;
  color: white;
}

.delete-confirm-btn:hover {
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

.modal-enter-active .delete-dialog,
.modal-leave-active .delete-dialog {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from .delete-dialog {
  transform: scale(0.9);
  opacity: 0;
}

.modal-leave-to .delete-dialog {
  transform: scale(0.9);
  opacity: 0;
}
</style>