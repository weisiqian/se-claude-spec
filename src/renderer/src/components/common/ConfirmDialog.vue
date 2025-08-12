<script setup lang="ts">
import { computed } from 'vue'

export interface ConfirmDialogProps {
  visible: boolean
  title?: string
  message: string
  type?: 'warning' | 'danger' | 'info'
  confirmText?: string
  cancelText?: string
  confirmButtonType?: 'primary' | 'danger'
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  title: '确认操作',
  type: 'warning',
  confirmText: '确定',
  cancelText: '取消',
  confirmButtonType: 'danger'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

// 根据类型获取图标颜色
const iconColor = computed(() => {
  switch (props.type) {
    case 'danger':
      return '#f44336'
    case 'info':
      return '#007acc'
    case 'warning':
    default:
      return '#f9c74f'
  }
})

// 根据类型获取图标
const iconPath = computed(() => {
  switch (props.type) {
    case 'danger':
      // 删除/危险图标
      return 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14M10 11v6M14 11v6'
    case 'info':
      // 信息图标
      return 'M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'warning':
    default:
      // 警告图标
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  }
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-dialog-overlay" @click.self="handleCancel">
        <div class="confirm-dialog">
          <div class="dialog-icon">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="1.5"
              :style="{ color: iconColor }"
            >
              <path :d="iconPath"/>
            </svg>
          </div>
          <h3 class="dialog-title">{{ title }}</h3>
          <div class="dialog-message" v-html="message"></div>
          <div class="dialog-actions">
            <button class="dialog-btn cancel-btn" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button 
              class="dialog-btn confirm-btn"
              :class="`confirm-${confirmButtonType}`"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-dialog-overlay {
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

.confirm-dialog {
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

.dialog-message :deep(strong) {
  color: #d4d4d4;
  font-weight: 500;
}

.dialog-message :deep(.warning-text) {
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

.confirm-btn.confirm-danger {
  background: #f44336;
  color: white;
}

.confirm-btn.confirm-danger:hover {
  background: #da190b;
}

.confirm-btn.confirm-primary {
  background: #007acc;
  color: white;
}

.confirm-btn.confirm-primary:hover {
  background: #005a9e;
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

.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from .confirm-dialog {
  transform: scale(0.9);
  opacity: 0;
}

.modal-leave-to .confirm-dialog {
  transform: scale(0.9);
  opacity: 0;
}
</style>