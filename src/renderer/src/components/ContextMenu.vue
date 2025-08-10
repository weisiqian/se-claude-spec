<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="visible"
        class="context-menu"
        :style="{
          left: position.x + 'px',
          top: position.y + 'px'
        }"
        @contextmenu.prevent
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="menu-item-wrapper"
        >
          <div
            v-if="item.type === 'separator'"
            class="menu-separator"
          />
          <div
            v-else
            class="menu-item"
            :class="{
              'disabled': item.enabled === false,
              'has-selection': item.highlight
            }"
            @click="handleClick(item)"
          >
            <span class="menu-label">{{ item.label }}</span>
            <span v-if="item.accelerator" class="menu-accelerator">{{ formatAccelerator(item.accelerator) }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface MenuItem {
  label?: string
  action?: string
  accelerator?: string
  enabled?: boolean
  type?: 'separator' | 'item'
  highlight?: boolean
}

interface MenuPosition {
  x: number
  y: number
}

const props = defineProps<{
  items: MenuItem[]
  visible: boolean
  position: MenuPosition
}>()

const emit = defineEmits<{
  select: [action: string]
  close: []
}>()

const formatAccelerator = (accelerator: string) => {
  return accelerator
    .replace('Ctrl', 'Ctrl')
    .replace('Shift', 'Shift')
    .replace('+', '+')
}

const handleClick = (item: MenuItem) => {
  if (item.enabled === false) return
  if (item.action) {
    emit('select', item.action)
  }
  emit('close')
}

const handleClickOutside = (e: MouseEvent) => {
  const menu = document.querySelector('.context-menu')
  if (menu && !menu.contains(e.target as Node)) {
    emit('close')
  }
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.context-menu {
  position: fixed;
  z-index: 10000;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 3px 0;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
  backdrop-filter: blur(10px);
  background: rgba(26, 26, 26, 0.95);
}

.menu-item-wrapper {
  width: 100%;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  cursor: pointer;
  color: #ccc;
  white-space: nowrap;
  user-select: none;
  transition: all 0.1s ease;
}

.menu-item:hover:not(.disabled) {
  background: #264f78;
  color: #fff;
}

.menu-item.disabled {
  opacity: 0.4;
  cursor: default;
  color: #666;
}

.menu-item.has-selection {
  background: rgba(38, 79, 120, 0.2);
}

.menu-label {
  flex: 1;
  margin-right: 20px;
}

.menu-accelerator {
  font-size: 11px;
  color: #888;
  margin-left: auto;
}

.menu-item:hover:not(.disabled) .menu-accelerator {
  color: #aaa;
}

.menu-separator {
  height: 1px;
  background: #333;
  margin: 3px 8px;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .context-menu {
    background: rgba(28, 28, 28, 0.95);
    border-color: #444;
  }
  
  .menu-separator {
    background: #444;
  }
}
</style>