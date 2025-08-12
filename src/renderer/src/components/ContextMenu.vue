<template>
  <teleport to="body">
    <transition name="context-menu">
      <div
        v-if="visible"
        class="context-menu-overlay"
        @click="close"
        @contextmenu.prevent="close"
      >
        <div
          class="context-menu"
          :style="menuStyle"
          @click.stop
        >
          <div
            v-for="(item, index) in filteredItems"
            :key="index"
            class="menu-item"
            :class="{
              'menu-separator': item.type === 'separator',
              'disabled': item.disabled,
              'has-submenu': item.submenu
            }"
            @click="handleItemClick(item)"
            @mouseenter="handleMouseEnter(item, $event)"
            @mouseleave="handleMouseLeave"
          >
            <template v-if="item.type !== 'separator'">
              <span class="menu-icon" v-if="item.icon">
                <component :is="item.icon" />
              </span>
              <span class="menu-label">{{ item.label }}</span>
              <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
              <span class="menu-arrow" v-if="item.submenu">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 12l4-4-4-4v8z"/>
                </svg>
              </span>
            </template>
          </div>
        </div>
        
        <!-- 子菜单 -->
        <div
          v-if="activeSubmenu"
          class="context-menu submenu"
          :style="submenuStyle"
          @click.stop
          @mouseenter="keepSubmenu"
          @mouseleave="hideSubmenu"
        >
          <div
            v-for="(item, index) in activeSubmenu"
            :key="index"
            class="menu-item"
            :class="{
              'menu-separator': item.type === 'separator',
              'disabled': item.disabled
            }"
            @click="handleItemClick(item)"
          >
            <template v-if="item.type !== 'separator'">
              <span class="menu-icon" v-if="item.icon">
                <component :is="item.icon" />
              </span>
              <span class="menu-label">{{ item.label }}</span>
              <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

export interface MenuItem {
  label?: string
  icon?: any
  shortcut?: string
  action?: () => void
  disabled?: boolean
  visible?: boolean
  type?: 'normal' | 'separator'
  submenu?: MenuItem[]
}

interface Props {
  items: MenuItem[]
  x: number
  y: number
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
}>()

const menuStyle = ref({
  left: '0px',
  top: '0px'
})

const submenuStyle = ref({
  left: '0px',
  top: '0px'
})

const activeSubmenu = ref<MenuItem[] | null>(null)
let submenuTimer: NodeJS.Timeout | null = null

// 过滤可见的菜单项
const filteredItems = computed(() => {
  return props.items.filter(item => item.visible !== false)
})

// 计算菜单位置
const calculatePosition = () => {
  nextTick(() => {
    const menuWidth = 200
    const menuHeight = filteredItems.value.length * 30 + 8
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    let left = props.x
    let top = props.y
    
    // 防止菜单超出右边界
    if (left + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 10
    }
    
    // 防止菜单超出下边界
    if (top + menuHeight > windowHeight) {
      top = windowHeight - menuHeight - 10
    }
    
    // 确保不会超出左边界和上边界
    left = Math.max(10, left)
    top = Math.max(10, top)
    
    menuStyle.value = {
      left: `${left}px`,
      top: `${top}px`
    }
  })
}

// 处理菜单项点击
const handleItemClick = (item: MenuItem) => {
  if (item.disabled || item.type === 'separator' || item.submenu) return
  
  if (item.action) {
    item.action()
  }
  close()
}

// 处理鼠标进入菜单项
const handleMouseEnter = (item: MenuItem, event: MouseEvent) => {
  if (submenuTimer) {
    clearTimeout(submenuTimer)
    submenuTimer = null
  }
  
  if (item.submenu && !item.disabled) {
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    
    // 计算子菜单位置
    let left = rect.right + 2
    let top = rect.top
    
    // 防止子菜单超出右边界
    const submenuWidth = 200
    if (left + submenuWidth > window.innerWidth) {
      left = rect.left - submenuWidth - 2
    }
    
    // 防止子菜单超出下边界
    const submenuHeight = item.submenu.length * 30 + 8
    if (top + submenuHeight > window.innerHeight) {
      top = window.innerHeight - submenuHeight - 10
    }
    
    submenuStyle.value = {
      left: `${left}px`,
      top: `${top}px`
    }
    
    activeSubmenu.value = item.submenu
  } else {
    hideSubmenu()
  }
}

// 处理鼠标离开菜单项
const handleMouseLeave = () => {
  if (activeSubmenu.value) {
    submenuTimer = setTimeout(() => {
      activeSubmenu.value = null
    }, 300)
  }
}

// 保持子菜单显示
const keepSubmenu = () => {
  if (submenuTimer) {
    clearTimeout(submenuTimer)
    submenuTimer = null
  }
}

// 隐藏子菜单
const hideSubmenu = () => {
  submenuTimer = setTimeout(() => {
    activeSubmenu.value = null
  }, 300)
}

// 关闭菜单
const close = () => {
  activeSubmenu.value = null
  if (submenuTimer) {
    clearTimeout(submenuTimer)
    submenuTimer = null
  }
  emit('close')
}

// 监听可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    calculatePosition()
  } else {
    activeSubmenu.value = null
  }
})

// 监听位置变化
watch(() => [props.x, props.y], () => {
  if (props.visible) {
    calculatePosition()
  }
})

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (props.visible && e.key === 'Escape') {
    close()
  }
}

// 监听键盘事件
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.context-menu {
  position: fixed;
  background: #252526;
  border: 1px solid #454545;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  min-width: 180px;
  max-width: 300px;
  font-size: 13px;
  color: #cccccc;
  user-select: none;
  z-index: 10000;
}

.context-menu.submenu {
  z-index: 10001;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 26px;
  cursor: pointer;
  position: relative;
}

.menu-item:hover:not(.disabled):not(.menu-separator) {
  background: #094771;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-separator {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background: #454545;
  cursor: default;
}

.menu-icon {
  width: 20px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-icon svg {
  width: 16px;
  height: 16px;
}

.menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-shortcut {
  margin-left: 20px;
  color: #969696;
  font-size: 11px;
  flex-shrink: 0;
}

.menu-arrow {
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 过渡动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s;
}

.context-menu-enter-active .context-menu,
.context-menu-leave-active .context-menu {
  transition: opacity 0.15s, transform 0.15s;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
}

.context-menu-enter-from .context-menu,
.context-menu-leave-to .context-menu {
  opacity: 0;
  transform: scale(0.95);
}
</style>