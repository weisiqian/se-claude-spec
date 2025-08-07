<template>
  <div class="title-bar-controls">
    <button class="title-bar-button minimize" @click="minimize" title="最小化">
      <svg width="14" height="14" viewBox="0 0 12 12">
        <rect x="2" y="6" width="8" height="1" fill="#ffffff" />
      </svg>
    </button>
    <button class="title-bar-button maximize" @click="maximize" :title="isMaximized ? '还原' : '最大化'">
      <svg v-if="!isMaximized" width="14" height="14" viewBox="0 0 12 12">
        <rect x="2" y="2" width="8" height="8" stroke="#ffffff" stroke-width="1" fill="none" />
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 12 12">
        <rect x="2" y="3" width="6" height="6" stroke="#ffffff" stroke-width="1" fill="none" />
        <rect x="4" y="2" width="6" height="6" stroke="#ffffff" stroke-width="1" fill="none" />
      </svg>
    </button>
    <button class="title-bar-button close" @click="close" title="关闭">
      <svg width="14" height="14" viewBox="0 0 12 12">
        <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="#ffffff" stroke-width="1" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'maximize-state-change', isMaximized: boolean): void
}>()

const isMaximized = ref(false)

const minimize = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.minimize()
  }
}

const maximize = async () => {
  if (window.api?.windowControls) {
    const currentMaximized = await window.api.windowControls.isMaximized()
    window.api.windowControls.maximize()
    isMaximized.value = !currentMaximized
    emit('maximize-state-change', isMaximized.value)
  }
}

const close = () => {
  if (window.api?.windowControls) {
    window.api.windowControls.close()
  }
}

const updateMaximizeState = async () => {
  if (window.api?.windowControls) {
    isMaximized.value = await window.api.windowControls.isMaximized()
  }
}

onMounted(async () => {
  if (window.api?.windowControls) {
    await updateMaximizeState()
    
    window.api.windowControls.onMaximizedChange((maximized: boolean) => {
      isMaximized.value = maximized
      emit('maximize-state-change', maximized)
    })
  }
})

onUnmounted(() => {
  if (window.api?.windowControls?.removeMaximizedListener) {
    window.api.windowControls.removeMaximizedListener()
  }
})
</script>

<style scoped>
.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
  flex: 0 0 auto;
}

.title-bar-button {
  width: 46px;
  height: 38px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  transition: background-color 0.15s;
}

.title-bar-button:hover {
  background-color: var(--wt-bg-hover);
}

.title-bar-button.close:hover {
  background-color: #e81123;
  color: white;
}

.title-bar-button:active {
  background-color: var(--wt-bg-active);
}

.title-bar-button.close:active {
  background-color: #c50e1f;
}
</style>