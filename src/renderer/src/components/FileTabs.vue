<template>
  <div class="file-tabs">
    <!-- 标签容器 -->
    <div class="tabs-wrapper">
      <div class="tabs-container" ref="tabsContainer" @wheel="handleWheel">
        <div
          v-for="(tab, index) in tabs"
          :key="tab.path"
          class="tab-item"
          :class="{ 
            active: tab.path === activeTab,
            'has-unsaved': tab.unsaved
          }"
          @click="selectTab(tab.path)"
          @mousedown.middle="closeTab(tab.path)"
          @contextmenu.prevent="showContextMenu($event, tab)"
          :title="tab.path"
        >
          <!-- 文件图标 -->
          <span class="tab-icon">
            <component :is="getFileIcon(tab.name)" />
          </span>
          
          <!-- 文件名 -->
          <span class="tab-label">{{ tab.name }}</span>
          
          <!-- 未保存标记 -->
          <span v-if="tab.unsaved" class="tab-unsaved-dot"></span>
          
          <!-- 关闭按钮 -->
          <span 
            class="tab-close"
            :class="{ 'always-visible': tab.path === activeTab }"
            @click.stop="closeTab(tab.path)"
            title="关闭 (Ctrl+W)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
    
    <!-- 标签栏操作区 -->
    <div class="tabs-actions">
      <!-- 显示所有打开的编辑器 -->
      <button 
        class="action-btn" 
        @click="showOpenEditors" 
        title="显示所有打开的编辑器"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 3.5v2h13v-2h-13zm0 5v2h13v-2h-13zm0 5v2h13v-2h-13z"/>
        </svg>
      </button>
      
      <!-- 更多操作 -->
      <button 
        class="action-btn" 
        @click="showMoreActions" 
        title="更多操作..."
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="8" cy="3.5" r="1.5"/>
          <circle cx="8" cy="12.5" r="1.5"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, h } from 'vue'

interface FileTab {
  path: string
  name: string
  content?: string
  language?: string
  unsaved?: boolean
}

const props = defineProps<{
  tabs: FileTab[]
  activeTab: string | null
}>()

const emit = defineEmits<{
  'select-tab': [path: string]
  'close-tab': [path: string]
  'close-all-tabs': []
  'close-others': [path: string]
  'close-to-right': [path: string]
  'show-in-explorer': [path: string]
}>()

const tabsContainer = ref<HTMLElement>()

const selectTab = (path: string) => {
  emit('select-tab', path)
}

const closeTab = (path: string) => {
  emit('close-tab', path)
}

const closeAllTabs = () => {
  emit('close-all-tabs')
}

// 处理鼠标滚轮事件
const handleWheel = (e: WheelEvent) => {
  if (tabsContainer.value) {
    e.preventDefault()
    tabsContainer.value.scrollLeft += e.deltaY
  }
}

// 显示所有打开的编辑器
const showOpenEditors = () => {
  // TODO: 实现显示所有打开编辑器的下拉列表
  console.log('Show open editors')
}

// 显示更多操作菜单
const showMoreActions = () => {
  // TODO: 实现更多操作菜单
  console.log('Show more actions')
}

// 显示右键菜单
const showContextMenu = (e: MouseEvent, tab: FileTab) => {
  // TODO: 实现右键菜单
  console.log('Show context menu for', tab.name)
}

// 获取文件图标组件
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  // 文件类型图标映射
  const iconMap: Record<string, any> = {
    // JavaScript/TypeScript
    'js': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#f7df1e' },
      h('path', { d: 'M1 1v14h14V1H1zm7.5 11.5c0 1.1-.9 1.5-1.5 1.5s-1.2-.4-1.4-1l1-.6c.1.2.3.4.5.4.3 0 .4-.1.4-.5V7h1.5v5.5zm3.5 1.5c-.7 0-1.2-.3-1.5-.8l1-.6c.2.3.4.5.7.5.3 0 .5-.2.5-.4 0-.3-.2-.4-.6-.6l-.3-.1c-.8-.3-1.3-.7-1.3-1.6 0-.8.6-1.4 1.5-1.4.7 0 1.1.2 1.4.8l-1 .6c-.2-.3-.4-.4-.6-.4-.3 0-.4.2-.4.4 0 .3.2.4.5.5l.3.1c.9.4 1.4.8 1.4 1.7 0 1-.8 1.5-1.8 1.5z' })
    ),
    'jsx': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#61dafb' },
      h('g', {}, [
        h('circle', { cx: 8, cy: 8, r: 1.5 }),
        h('ellipse', { cx: 8, cy: 8, rx: 7, ry: 3, fill: 'none', stroke: 'currentColor', 'stroke-width': 1 }),
        h('ellipse', { cx: 8, cy: 8, rx: 3, ry: 7, fill: 'none', stroke: 'currentColor', 'stroke-width': 1 })
      ])
    ),
    'ts': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#3178c6' },
      h('path', { d: 'M1 1v14h14V1H1zm8 5h-2v7h-1.5V6H3V4.5h6V6zm4.5 7h-1.7l-.8-2h-2l-.8 2H6.5l2.5-6h1.5l2.5 6z' })
    ),
    'tsx': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#3178c6' },
      h('g', {}, [
        h('circle', { cx: 8, cy: 8, r: 1.5 }),
        h('ellipse', { cx: 8, cy: 8, rx: 7, ry: 3, fill: 'none', stroke: 'currentColor', 'stroke-width': 1 }),
        h('ellipse', { cx: 8, cy: 8, rx: 3, ry: 7, fill: 'none', stroke: 'currentColor', 'stroke-width': 1 })
      ])
    ),
    
    // Vue
    'vue': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#4fc08d' },
      h('path', { d: 'M12.8 2L8 10 3.2 2H1L8 14 15 2h-2.2zm-2.4 0L8 6.4 5.6 2H3.8L8 9.2 12.2 2h-1.8z' })
    ),
    
    // Web
    'html': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#e34c26' },
      h('path', { d: 'M1.5 1l1.2 13.4L8 16l5.3-1.6L14.5 1h-13zm10.8 4.4H5.7l.2 1.8h6.2l-.5 5.5-3.6 1-3.6-1-.2-2.8h1.8l.1 1.4 2 .5 2-.5.2-2.3H4l-.5-5.4h9l-.2 1.8z' })
    ),
    'css': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#1572b6' },
      h('path', { d: 'M1.5 1l1.2 13.4L8 16l5.3-1.6L14.5 1h-13zm10.6 4.3l-.4 4.4L8 10.9l-3.7-1.2-.3-2.9h1.8l.1 1.5 2 .5 2.1-.5.2-2.5H4l-.2-1.7h6.5l.2-1.8H3.7L3.5 2.5h9.2l-.6 6.8z' })
    ),
    'scss': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#cc6699' },
      h('path', { d: 'M8 1a7 7 0 100 14A7 7 0 008 1zm3.5 5.5c-.5 2-1.5 2.5-2.5 2.8.4.2.7.6.7 1.2 0 1.4-1.2 1.5-2.2 1.5H5V7h2.5c1 0 2.2.1 2.2 1.5 0 .6-.3 1-.7 1.2 1-.3 2-1 2.5-2.8l.5.6z' })
    ),
    
    // Data
    'json': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#5656e7' },
      h('path', { d: 'M3 1v14h10V1H3zm8 12H5v-1h6v1zm0-3H5V9h6v1zm0-3H5V6h6v1zm0-3H5V3h6v1z' })
    ),
    'xml': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#f69b3e' },
      h('path', { d: 'M1 3l2 2L1 7v2l4-4L1 1v2zm5 0v2l2 2-2 2v2l4-4-4-4zm4 10v-2h5v2h-5z' })
    ),
    'yaml': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#cb171e' },
      h('path', { d: 'M3 2v2l3 3v2L3 6v2l3 3v2l-3-3v2l3 3 3-3v-2l-3 3V9l3-3V4L6 7V5l3-3V2L6 5 3 2z' })
    ),
    'yml': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#cb171e' },
      h('path', { d: 'M3 2v2l3 3v2L3 6v2l3 3v2l-3-3v2l3 3 3-3v-2l-3 3V9l3-3V4L6 7V5l3-3V2L6 5 3 2z' })
    ),
    
    // Markdown
    'md': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#083fa1' },
      h('path', { d: 'M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zM6 10H4V9l2-2 2 2v1H6zm3 0V7l2-2 1.5 1.5L11 8h1.5L10 10.5 7.5 8H9v2z' })
    ),
    
    // Programming Languages
    'py': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#3776ab' },
      h('path', { d: 'M7.5 1C5 1 3 2.5 3 4.5V7h4.5V8H4c-2 0-3.5 1.5-3.5 4s1.5 4 3.5 4h2V13c0-1.5 1.5-3 3-3h3c1.5 0 3-1.5 3-3V4.5C14.5 2.5 12.5 1 10 1H7.5zM5.5 3.5a1 1 0 110 2 1 1 0 010-2zm5 6a1 1 0 110 2 1 1 0 010-2z' })
    ),
    'java': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#007396' },
      h('path', { d: 'M6 10s-1 .5.5.7c2 .2 3 .2 5-.2 0 0 .5.3 1.2.6-4.3 1.8-9.7-.1-6.7-1.1zm-.5-2s-1 .8.4 1c1.8.2 3.2.2 5.6-.3 0 0 .4.4.9.6-5 1.5-10.5.1-6.9-1.3zm6.8 3.6s.7.5-.7.9c-2.8.7-11.6.9-14 0-.8-.3.7-.8 1.2-.9.5-.1.8-.1.8-.1-1-.7-6.3 1.3-2.7 1.9 9.8 1.6 17.9-.7 15.4-1.8zM6.5 6s-4.5 1 1.6 1.4c1.5.1 3.8 0 6.1-.1 2-.1 4-.3 4-.3s-.7.3-1.2.6c-4.5 1.2-13.3.6-10.8-.6 2.1-.9 3.3-.8 3.3-.8zm8 4.3c4.6-2.4 2.5-4.7.1-4.4-.6.1-.8.2-.8.2s.2-.3.6-.4c4.3-1.5 7.6 4.5-.1 6.9 0 0 .1-.1.2-.3z' })
    ),
    'c': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#555555' },
      h('path', { d: 'M13.5 8.3c0 2.5-1.5 4.5-3.8 5.2-2.3.7-4.9-.1-6.4-2.1C1.8 9.4 1.5 6.8 2.8 4.5c1.3-2.3 3.8-3.5 6.3-3 2.5.5 4.3 2.7 4.4 5.3v1.5zm-2.2-.3c0-1.7-1-3.2-2.5-3.8-1.5-.6-3.2-.2-4.3 1.1-1.1 1.3-1.3 3.1-.5 4.6.8 1.5 2.4 2.3 4 2 1.6-.3 2.8-1.5 3.2-3.1.1-.3.1-.5.1-.8z' })
    ),
    'cpp': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#00599c' },
      h('path', { d: 'M13.5 8.3c0 2.5-1.5 4.5-3.8 5.2-2.3.7-4.9-.1-6.4-2.1C1.8 9.4 1.5 6.8 2.8 4.5c1.3-2.3 3.8-3.5 6.3-3 2.5.5 4.3 2.7 4.4 5.3v1.5zm-2.2-.3c0-1.7-1-3.2-2.5-3.8-1.5-.6-3.2-.2-4.3 1.1-1.1 1.3-1.3 3.1-.5 4.6.8 1.5 2.4 2.3 4 2 1.6-.3 2.8-1.5 3.2-3.1.1-.3.1-.5.1-.8zm-1.3 0h-1V7h-1v1h-1v1h1v1h1V9h1V8zm3 0h-1V7h-1v1h-1v1h1v1h1V9h1V8z' })
    ),
    'cs': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#239120' },
      h('path', { d: 'M8 1a7 7 0 100 14A7 7 0 008 1zm3.5 7.5h-1v1h-1v-1h-1v-1h1v-1h1v1h1v1zm3 0h-1v1h-1v-1h-1v-1h1v-1h1v1h1v1z' })
    ),
    'go': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#00add8' },
      h('path', { d: 'M2.8 7.5c0 .1-.1.1-.2.1s-.1 0-.1-.1l.2-.7c0-.1.1-.1.2-.1h1c.1 0 .1 0 .1.1l-.2.7zm-1.5.6c0 .1-.1.1-.2.1s-.1 0-.1-.1l.2-.7c0-.1.1-.1.2-.1h1c.1 0 .1 0 .1.1l-.2.7H1.3zm2.9.1c-.1 0-.1 0-.2-.1l-.3-.4c-.1-.1 0-.2.1-.2l.5-.3c.1 0 .2 0 .2.1l.3.4c.1.1 0 .2-.1.2l-.5.3zm7.6-1.7c-.4-.3-1-.3-1.5-.2-.5.2-.9.5-1.1 1-.2.4-.2.9 0 1.3.2.4.6.7 1.1.8.5.1 1 0 1.4-.3.4-.3.7-.7.8-1.2.1-.5 0-1-.7-1.4zm-.6 2c-.2.3-.5.4-.9.4s-.7-.2-.9-.5c-.2-.3-.2-.7 0-1 .2-.3.5-.5.9-.5s.7.2.9.5c.2.3.2.7 0 1.1z' })
    ),
    'rs': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#dea584' },
      h('path', { d: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5c1 0 1.8.3 2.4.9l.7.7-1.5 1.5-.7-.7c-.3-.3-.7-.4-1.1-.4-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6c.4 0 .8-.2 1.1-.4l.7-.7 1.5 1.5-.7.7c-.6.6-1.5.9-2.4.9-2 0-3.6-1.6-3.6-3.6S6 3.5 8 3.5z' })
    ),
    'php': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#777bb4' },
      h('path', { d: 'M8 3c-3.3 0-6 2.2-6 5s2.7 5 6 5 6-2.2 6-5-2.7-5-6-5zm-2.3 7H4.5V9h1.2c.5 0 .8-.3.8-.8s-.3-.8-.8-.8H4.5v3.6zm3.1 0h-1V6.4h1v1.2c.3-.3.6-.4 1-.4.8 0 1.4.6 1.4 1.4v1.4h-1V8.8c0-.4-.2-.6-.5-.6s-.5.2-.5.6v1.2h-.4zm3.7 0h-1V6.4h1v1.2c.3-.3.6-.4 1-.4.8 0 1.4.6 1.4 1.4v1.4h-1V8.8c0-.4-.2-.6-.5-.6s-.5.2-.5.6v1.2h-.4z' })
    ),
    'rb': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#cc342d' },
      h('path', { d: 'M1 9l2-2V5l3 3 3-3v2l2 2-5 5-5-5zm14-4l-3-3-3 3 3 3 3-3z' })
    ),
    
    // Shell
    'sh': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#4eaa25' },
      h('path', { d: 'M13 13H3V3h7l3 3v7zm-2-8l-1-1H5v8h6V5z' })
    ),
    'bash': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#4eaa25' },
      h('path', { d: 'M13 13H3V3h7l3 3v7zm-2-8l-1-1H5v8h6V5z' })
    ),
    
    // Database
    'sql': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#336791' },
      h('path', { d: 'M8 2C5 2 2 3 2 4.5V12c0 1.5 3 2.5 6 2.5s6-1 6-2.5V4.5C14 3 11 2 8 2zm0 10c-2.2 0-4-.7-4-1.5v-2c1 .6 2.4 1 4 1s3-.4 4-1v2c0 .8-1.8 1.5-4 1.5zm0-3.5c-2.2 0-4-.7-4-1.5V5c1 .6 2.4 1 4 1s3-.4 4-1v2c0 .8-1.8 1.5-4 1.5z' })
    ),
    
    // Config
    'dockerfile': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#2496ed' },
      h('path', { d: 'M10 7V6h1V5h-1V4h-1v1H8v1h1v1H8v1h1v1h1V8h1V7h-1zm-7 3h14v1c0 .5-.5 1-1 1H2c-.5 0-1-.5-1-1v-1h2zm1-8h1v1H4V2zm2 0h1v1H6V2zm2 0h1v1H8V2zM4 4h1v1H4V4zm2 0h1v1H6V4zm2 0h1v1H8V4zM2 6h1v1H2V6zm2 0h1v1H4V6zm2 0h1v1H6V6z' })
    ),
    'gitignore': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#f54d27' },
      h('path', { d: 'M14.5 6.5L10 2v3C6 5 3 6 1 10c1-1 2.5-1.5 5-1.5v3l4.5-4.5z' })
    ),
    'env': () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#edd711' },
      h('path', { d: 'M8 1l2 3h3v7l-2 3H5l-2-3V4h3l2-3zm0 2L6.5 5H4v5l1 2h6l1-2V5h-2.5L8 3z' })
    ),
  }
  
  // 返回对应的图标组件，如果没有匹配则返回默认文件图标
  return iconMap[ext || ''] || (() => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: '#cccccc' },
    h('path', { d: 'M10 1H3L2 2v12l1 1h10l1-1V5l-4-4zm3 12H3V2h6v4h4v7z' })
  ))
}

// 滚动到活动标签
watch(() => props.activeTab, async () => {
  await nextTick()
  if (tabsContainer.value && props.activeTab) {
    const activeElement = tabsContainer.value.querySelector('.tab-item.active') as HTMLElement
    if (activeElement) {
      const containerRect = tabsContainer.value.getBoundingClientRect()
      const elementRect = activeElement.getBoundingClientRect()
      
      // 如果标签不在可视区域内，滚动到中心位置
      if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
        const scrollLeft = activeElement.offsetLeft - (containerRect.width / 2) + (elementRect.width / 2)
        tabsContainer.value.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        })
      }
    }
  }
})
</script>

<style scoped>
.file-tabs {
  display: flex;
  align-items: center;
  height: 35px;
  background: #252526;
  user-select: none;
  border-bottom: 1px solid #1e1e1e;
}

.tabs-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.tabs-container {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

/* 标签项 */
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 35px;
  min-width: 120px;
  max-width: 240px;
  background: #2d2d30;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  border-right: 1px solid #252526;
  transition: background-color 0.1s;
}

.tab-item:hover {
  background: #2a2a2a;
}

.tab-item.active {
  background: #1e1e1e;
  border-right-color: #1e1e1e;
}

/* 活动标签顶部高亮条 */
.tab-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #007acc;
}

/* 文件图标 */
.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 文件名 */
.tab-label {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.tab-item.active .tab-label {
  color: #ffffff;
}

/* 未保存标记 */
.tab-unsaved-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cccccc;
  flex-shrink: 0;
  margin-left: 4px;
}

.tab-item.active .tab-unsaved-dot {
  background: #ffffff;
}

/* 关闭按钮 */
.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0 -4px 0 2px;
  border-radius: 5px;
  opacity: 0;
  transition: opacity 0.1s, background-color 0.1s;
  flex-shrink: 0;
}

.tab-item:hover .tab-close,
.tab-close.always-visible {
  opacity: 0.7;
}

.tab-close:hover {
  opacity: 1;
  background: rgba(90, 93, 94, 0.31);
}

/* 标签栏操作区 */
.tabs-actions {
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  background: #252526;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  border: none;
  background: transparent;
  color: #cccccc;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.1s;
  opacity: 0.7;
}

.action-btn:hover {
  background: rgba(90, 93, 94, 0.31);
  opacity: 1;
}

/* 动画效果 */
.tab-item {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tab-item {
    min-width: 100px;
    max-width: 180px;
  }
  
  .tab-label {
    font-size: 12px;
  }
}
</style>