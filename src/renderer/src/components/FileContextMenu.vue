<template>
  <transition name="context-menu">
    <div
      v-if="visible"
      class="context-menu"
      :style="menuStyle"
      @click.stop
    >
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item"
        :class="{ 
          'disabled': item.disabled,
          'separator': item.type === 'separator'
        }"
        @click="handleItemClick(item)"
      >
        <template v-if="item.type !== 'separator'">
          <span class="menu-icon" v-if="item.icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path :d="item.icon" stroke="currentColor" stroke-width="2"/>
            </svg>
          </span>
          <span class="menu-label">{{ item.label }}</span>
          <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  id: string
  label?: string
  icon?: string
  shortcut?: string
  type?: 'item' | 'separator'
  disabled?: boolean
  action?: () => void
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  targetType: 'file' | 'directory' | 'workspace'
  targetPath?: string
}>()

const emit = defineEmits<{
  'close': []
  'create-file': []
  'create-folder': []
  'rename': []
  'delete': []
  'copy-path': []
  'show-in-folder': []
  'refresh': []
}>()

// 计算菜单位置
const menuStyle = computed(() => {
  const menuWidth = 200
  const menuHeight = 300 // 估计高度
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  let left = props.x
  let top = props.y
  
  // 确保菜单不超出视窗
  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 10
  }
  
  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 10
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

// 根据目标类型生成菜单项
const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []
  
  if (props.targetType === 'workspace') {
    // 工作空间菜单
    items.push(
      {
        id: 'new-file',
        label: '新建文件',
        icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2l6 6',
        shortcut: 'Ctrl+N',
        action: () => emit('create-file')
      },
      {
        id: 'new-folder',
        label: '新建文件夹',
        icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
        shortcut: 'Ctrl+Shift+N',
        action: () => emit('create-folder')
      },
      { id: 'sep1', type: 'separator' },
      {
        id: 'refresh',
        label: '刷新',
        icon: 'M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8',
        shortcut: 'F5',
        action: () => emit('refresh')
      }
    )
  } else if (props.targetType === 'directory') {
    // 文件夹菜单
    items.push(
      {
        id: 'new-file',
        label: '新建文件',
        icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2l6 6',
        action: () => emit('create-file')
      },
      {
        id: 'new-folder',
        label: '新建文件夹',
        icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
        action: () => emit('create-folder')
      },
      { id: 'sep1', type: 'separator' },
      {
        id: 'rename',
        label: '重命名',
        icon: 'M3 10h11M3 14h7M17 14l1 1-1.5 1.5a2 2 0 1 0 2.828 2.828L21 17.5 22 16.5',
        shortcut: 'F2',
        action: () => emit('rename')
      },
      {
        id: 'delete',
        label: '删除',
        icon: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
        shortcut: 'Delete',
        action: () => emit('delete')
      },
      { id: 'sep2', type: 'separator' },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
        action: () => emit('copy-path')
      },
      {
        id: 'show-in-folder',
        label: '在文件管理器中显示',
        icon: 'M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8',
        action: () => emit('show-in-folder')
      }
    )
  } else {
    // 文件菜单
    items.push(
      {
        id: 'rename',
        label: '重命名',
        icon: 'M3 10h11M3 14h7M17 14l1 1-1.5 1.5a2 2 0 1 0 2.828 2.828L21 17.5 22 16.5',
        shortcut: 'F2',
        action: () => emit('rename')
      },
      {
        id: 'delete',
        label: '删除',
        icon: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
        shortcut: 'Delete',
        action: () => emit('delete')
      },
      { id: 'sep1', type: 'separator' },
      {
        id: 'copy-path',
        label: '复制路径',
        icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
        action: () => emit('copy-path')
      },
      {
        id: 'show-in-folder',
        label: '在文件管理器中显示',
        icon: 'M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8',
        action: () => emit('show-in-folder')
      }
    )
  }
  
  return items
})

const handleItemClick = (item: MenuItem) => {
  if (item.disabled || item.type === 'separator') return
  if (item.action) {
    item.action()
  }
  emit('close')
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.context-menu')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('contextmenu', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
})
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 10000;
  background: var(--wt-bg-tertiary);
  border: 1px solid var(--wt-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  min-width: 180px;
  font-size: 12px;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--wt-text-primary);
}

.menu-item:hover:not(.disabled):not(.separator) {
  background: var(--wt-bg-hover);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.separator {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background: var(--wt-border);
  cursor: default;
}

.menu-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wt-text-secondary);
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  margin-left: 20px;
  font-size: 11px;
  color: var(--wt-text-tertiary);
}

/* 过渡动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>