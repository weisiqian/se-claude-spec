<template>
  <teleport to="body">
    <transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="cancel">
        <div class="dialog-container">
          <div class="dialog-header">
            <h3 class="dialog-title">{{ title }}</h3>
          </div>
          <div class="dialog-body">
            <p class="dialog-message">{{ message }}</p>
          </div>
          <div class="dialog-footer">
            <button class="btn btn-cancel" @click="cancel">{{ cancelText }}</button>
            <button class="btn btn-danger" @click="confirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

withDefaults(defineProps<Props>(), {
  confirmText: '确定',
  cancelText: '取消'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const confirm = () => {
  emit('confirm')
  emit('update:visible', false)
}

const cancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog-container {
  background: var(--wt-bg-primary);
  border: 1px solid var(--wt-border);
  border-radius: 6px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--wt-border);
}

.dialog-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--wt-text-primary);
}

.dialog-body {
  padding: 20px;
}

.dialog-message {
  margin: 0;
  font-size: 13px;
  color: var(--wt-text-secondary);
  line-height: 1.5;
}

.dialog-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--wt-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-cancel {
  background: var(--wt-bg-secondary);
  color: var(--wt-text-secondary);
}

.btn-cancel:hover {
  background: var(--wt-bg-hover);
  color: var(--wt-text-primary);
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

/* 过渡动画 */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s;
}

.dialog-enter-active .dialog-container,
.dialog-leave-active .dialog-container {
  transition: transform 0.2s, opacity 0.2s;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-container,
.dialog-leave-to .dialog-container {
  transform: scale(0.95);
  opacity: 0;
}
</style>