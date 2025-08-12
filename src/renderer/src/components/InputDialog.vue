<template>
  <teleport to="body">
    <transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="cancel">
        <div class="dialog-container">
          <div class="dialog-header">
            <h3 class="dialog-title">{{ title }}</h3>
          </div>
          <div class="dialog-body">
            <input
              ref="inputRef"
              v-model="inputValue"
              class="dialog-input"
              :placeholder="placeholder"
              @keydown.enter="confirm"
              @keydown.esc="cancel"
            />
          </div>
          <div class="dialog-footer">
            <button class="btn btn-cancel" @click="cancel">取消</button>
            <button class="btn btn-primary" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  visible: boolean
  title: string
  placeholder?: string
  defaultValue?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [value: string]
  'cancel': []
}>()

const inputRef = ref<HTMLInputElement>()
const inputValue = ref('')

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    inputValue.value = props.defaultValue || ''
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
})

const confirm = () => {
  if (inputValue.value.trim()) {
    emit('confirm', inputValue.value.trim())
    emit('update:visible', false)
  }
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

.dialog-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  background: var(--wt-bg-secondary);
  border: 1px solid var(--wt-border);
  border-radius: 4px;
  color: var(--wt-text-primary);
  outline: none;
  transition: border-color 0.2s;
}

.dialog-input:focus {
  border-color: var(--wt-accent);
}

.dialog-input::placeholder {
  color: var(--wt-text-tertiary);
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

.btn-primary {
  background: var(--wt-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--wt-accent-hover);
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