<template>
  <div class="monaco-editor-wrapper">
    <!-- 预览模式 -->
    <div v-if="showPreviewMode && !isMaximized" 
         class="preview-mode-container" 
         :style="{ height: currentHeight + 'px' }"
         @contextmenu.prevent="handlePreviewContextMenu">
      <div class="markdown-preview-wrapper" v-html="renderedMarkdown"></div>
    </div>
    <!-- 右键菜单 -->
    <transition name="context-menu">
      <div 
        v-if="showContextMenu"
        class="context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <div class="context-menu-item" @click="handleCopy">
          <span class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </span>
          <span class="menu-text">复制</span>
          <span class="menu-shortcut">Ctrl+C</span>
        </div>
        <div class="context-menu-item" @click="handleCut" :class="{ 'disabled': showPreviewMode }">
          <span class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="6" cy="6" r="3"/>
              <circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              <line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </span>
          <span class="menu-text">剪切</span>
          <span class="menu-shortcut">Ctrl+X</span>
        </div>
        <div class="context-menu-item" @click="handlePaste" :class="{ 'disabled': showPreviewMode }">
          <span class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </span>
          <span class="menu-text">粘贴</span>
          <span class="menu-shortcut">Ctrl+V</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" @click="handleSelectAll">
          <span class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 5h2m0 0h2M5 5v2m0-2V3"/>
              <path d="M3 19h2m0 0h2m-2 0v2m0-2v-2"/>
              <path d="M19 5h2m0 0v2m0-2h-2m2 0V3"/>
              <path d="M19 19h2m0 0v-2m0 2h-2m2 0v2"/>
              <rect x="9" y="9" width="6" height="6" stroke-dasharray="2 2"/>
            </svg>
          </span>
          <span class="menu-text">全选</span>
          <span class="menu-shortcut">Ctrl+A</span>
        </div>
        <div class="context-menu-divider" v-if="props.enablePreview && props.language === 'markdown'"></div>
        <div class="context-menu-item" @click="togglePreviewMode" v-if="props.enablePreview && props.language === 'markdown'">
          <span class="menu-icon">
            <svg v-if="!showPreviewMode" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </span>
          <span class="menu-text">{{ showPreviewMode ? '退出预览' : '预览 Markdown' }}</span>
          <span class="menu-shortcut">{{ showPreviewMode ? 'ESC' : 'Ctrl+Shift+V' }}</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" @click="toggleMaximizeFromMenu">
          <span class="menu-icon">
            <svg v-if="!isMaximized" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          </span>
          <span class="menu-text">{{ isMaximized ? '还原' : '最大化' }}</span>
          <span class="menu-shortcut">{{ isMaximized ? 'ESC' : '' }}</span>
        </div>
      </div>
    </transition>

    <!-- 最大化遮罩层 -->
    <div v-if="isMaximized" class="maximized-overlay">
      <div class="maximized-container">
        <!-- 最大化预览模式 -->
        <div v-if="showPreviewMode" 
             class="maximized-preview-mode"
             @contextmenu.prevent="handlePreviewContextMenu">
          <div class="maximized-preview-content">
            <div class="markdown-preview-wrapper" v-html="renderedMarkdown"></div>
          </div>
        </div>
        
        <!-- 最大化编辑器 -->
        <div v-show="!showPreviewMode" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
          <!-- 工具栏 -->
          <div class="editor-toolbar maximized-toolbar">
            <!-- 自定义工具栏插槽 -->
            <slot name="maximized-toolbar"></slot>
            <button 
              class="toolbar-btn maximize-btn"
              @click="toggleMaximize"
              title="退出最大化 (ESC)"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            </button>
          </div>
          
          <div ref="maximizedEditorContainer" class="editor-instance maximized-editor-instance"></div>
        </div>
        
        <!-- 最大化时的退出提示 -->
        <transition name="fade">
          <div v-if="showMaximizedHint" class="maximized-hint">
            按 ESC 退出最大化
          </div>
        </transition>
      </div>
    </div>
    
    <!-- 正常编辑器容器 -->
    <div 
      class="monaco-editor-container" 
      :style="{ height: currentHeight + 'px' }"
      ref="containerRef"
      v-show="!isMaximized && !showPreviewMode"
    >
      <!-- 工具栏 -->
      <div class="editor-toolbar">
        <button 
          class="toolbar-btn maximize-btn"
          @click="toggleMaximize"
          title="最大化"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
        </button>
      </div>
      
      <div ref="editorContainer" class="editor-instance"></div>
      
      <!-- Placeholder overlay -->
      <div 
        v-if="showPlaceholder" 
        class="monaco-placeholder-overlay"
        @click="focusEditor"
      >
        {{ placeholder }}
      </div>
    </div>
    
    <!-- 拖动手柄（最大化时隐藏） -->
    <div 
      v-if="!isMaximized"
      class="resize-handle"
      @mousedown="startResize"
      title="拖动调整高度"
    >
      <div class="resize-handle-bar"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
// 只导入核心功能，不导入语言支持
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import type { editor } from 'monaco-editor'
import { renderMarkdown } from '@renderer/utils/markdownRenderer'
import '@renderer/styles/markdown.css'

// 配置 Monaco 环境 - 完全禁用 workers
self.MonacoEnvironment = {
  getWorkerUrl: function() {
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
      self.onmessage = function() {
        // 空 worker，避免加载错误
      };
    `)
  },
  getWorker: function() {
    return new Worker(self.MonacoEnvironment.getWorkerUrl())
  }
}

interface Props {
  modelValue: string
  language?: string
  theme?: string
  readOnly?: boolean
  minimap?: boolean
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval'
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
  fontSize?: number
  height?: string | number
  minHeight?: number
  maxHeight?: number
  placeholder?: string
  tabSize?: number
  automaticLayout?: boolean
  enableMaximize?: boolean
  enablePreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  language: 'text',
  theme: 'vs',
  readOnly: false,
  minimap: false,
  lineNumbers: 'on',
  wordWrap: 'on',
  fontSize: 13,
  height: 200,
  minHeight: 100,
  maxHeight: 600,
  placeholder: '',
  tabSize: 2,
  automaticLayout: true,
  enableMaximize: true,
  enablePreview: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'blur': []
  'focus': []
  'resize': [height: number]
  'maximize': [isMaximized: boolean]
  'contextmenu': [event: { x: number, y: number, position: any }]
  'preview': []
}>()

const editorContainer = ref<HTMLElement>()
const maximizedEditorContainer = ref<HTMLElement>()
const containerRef = ref<HTMLElement>()
let editorInstance: editor.IStandaloneCodeEditor | null = null
let maximizedEditorInstance: editor.IStandaloneCodeEditor | null = null
const showPlaceholder = ref(false)
const showPreviewMode = ref(false)

// 右键菜单相关
const showContextMenu = ref(false)
const contextMenuStyle = ref({
  left: '0px',
  top: '0px'
})

// 生成唯一的编辑器ID
const editorId = `monaco-editor-${Math.random().toString(36).substr(2, 9)}`

// 高度管理
const currentHeight = ref<number>(
  typeof props.height === 'number' ? props.height : parseInt(props.height)
)

// 拖动相关
const isResizing = ref(false)
const startY = ref(0)
const startHeight = ref(0)

// 最大化相关
const isMaximized = ref(false)
const showMaximizedHint = ref(false)
let maximizedHintTimer: NodeJS.Timeout | null = null
let escKeyListener: ((e: KeyboardEvent) => void) | null = null

// 计算是否显示 placeholder
const updatePlaceholderVisibility = () => {
  const value = editorInstance?.getValue() || props.modelValue || ''
  showPlaceholder.value = !value && !!props.placeholder
}

const focusEditor = () => {
  editorInstance?.focus()
}

// 创建最大化编辑器实例
const createMaximizedEditor = () => {
  if (!maximizedEditorContainer.value || maximizedEditorInstance) return
  
  const currentValue = editorInstance?.getValue() || props.modelValue || ''
  const currentModel = editorInstance?.getModel()
  const currentLanguage = currentModel ? monaco.editor.getModel(currentModel.uri)?.getLanguageId() : props.language
  
  // 创建最大化编辑器
  maximizedEditorInstance = monaco.editor.create(maximizedEditorContainer.value, {
    value: currentValue,
    language: currentLanguage,
    theme: 'wtDark',
    readOnly: props.readOnly,
    minimap: {
      enabled: props.minimap
    },
    lineNumbers: props.lineNumbers,
    wordWrap: props.wordWrap,
    fontSize: props.fontSize,
    tabSize: props.tabSize,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderWhitespace: 'none',
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
    fontLigatures: true,
    padding: {
      top: 10,
      bottom: 10
    },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    renderLineHighlight: 'all',
    quickSuggestions: false,
    parameterHints: {
      enabled: false
    },
    suggestOnTriggerCharacters: false,
    acceptSuggestionOnCommitCharacter: false,
    snippetSuggestions: 'none',
    showFoldingControls: 'hover',
    folding: true,
    foldingStrategy: 'indentation',
    'bracketPairColorization.enabled': true,
    guides: {
      indentation: true,
      bracketPairs: true
    },
    contextmenu: true,
    hover: {
      enabled: false
    },
    links: false,
    colorDecorators: false,
    lightbulb: {
      enabled: false
    },
    codeActionsOnSaveTimeout: 0
  })
  
  // 监听最大化编辑器的内容变化
  maximizedEditorInstance.onDidChangeModelContent(() => {
    const value = maximizedEditorInstance?.getValue() || ''
    emit('update:modelValue', value)
    emit('change', value)
    // 同步到主编辑器
    if (editorInstance) {
      editorInstance.setValue(value)
    }
  })
  
  // 监听焦点事件
  maximizedEditorInstance.onDidFocusEditorText(() => {
    emit('focus')
  })
  
  maximizedEditorInstance.onDidBlurEditorText(() => {
    emit('blur')
  })
  
  // 监听右键菜单事件
  maximizedEditorInstance.onContextMenu((e) => {
    e.event.preventDefault()
    e.event.stopPropagation()
    showCustomContextMenu(e.event.posx, e.event.posy)
  })
  
  // 聚焦最大化编辑器
  maximizedEditorInstance.focus()
}

// 切换最大化
const toggleMaximize = async () => {
  isMaximized.value = !isMaximized.value
  
  if (isMaximized.value) {
    // 进入最大化
    showMaximizedHint.value = true
    
    // 3秒后隐藏提示
    if (maximizedHintTimer) {
      clearTimeout(maximizedHintTimer)
    }
    maximizedHintTimer = setTimeout(() => {
      showMaximizedHint.value = false
    }, 3000)
    
    // 等待 DOM 更新后创建最大化编辑器
    await nextTick()
    createMaximizedEditor()
  } else {
    // 退出最大化
    showMaximizedHint.value = false
    if (maximizedHintTimer) {
      clearTimeout(maximizedHintTimer)
      maximizedHintTimer = null
    }
    
    // 保存最大化编辑器的内容到主编辑器
    if (maximizedEditorInstance && editorInstance) {
      const value = maximizedEditorInstance.getValue()
      editorInstance.setValue(value)
    }
    
    // 销毁最大化编辑器
    if (maximizedEditorInstance) {
      maximizedEditorInstance.dispose()
      maximizedEditorInstance = null
    }
    
    // 重新聚焦主编辑器
    setTimeout(() => {
      editorInstance?.focus()
      editorInstance?.layout()
    }, 100)
  }
  
  // 触发事件
  emit('maximize', isMaximized.value)
}

// 显示自定义右键菜单
const showCustomContextMenu = (x: number, y: number) => {
  // 计算菜单位置，确保不超出视窗
  const menuWidth = 200
  const menuHeight = 250
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  let left = x
  let top = y
  
  if (x + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 10
  }
  
  if (y + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 10
  }
  
  contextMenuStyle.value = {
    left: `${left}px`,
    top: `${top}px`
  }
  
  showContextMenu.value = true
  
  // 点击其他地方关闭菜单
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true })
    document.addEventListener('contextmenu', hideContextMenu, { once: true })
  }, 0)
}

// 隐藏右键菜单
const hideContextMenu = () => {
  showContextMenu.value = false
}

// 右键菜单操作
const handleCopy = () => {
  if (showPreviewMode.value) {
    // 预览模式下直接复制选中的文本
    document.execCommand('copy')
  } else {
    const editor = isMaximized.value ? maximizedEditorInstance : editorInstance
    if (editor) {
      editor.focus()
      document.execCommand('copy')
    }
  }
  hideContextMenu()
}

const handleCut = () => {
  if (showPreviewMode.value) {
    // 预览模式下不允许剪切
    hideContextMenu()
    return
  }
  const editor = isMaximized.value ? maximizedEditorInstance : editorInstance
  if (editor) {
    editor.focus()
    document.execCommand('cut')
  }
  hideContextMenu()
}

const handlePaste = async () => {
  if (showPreviewMode.value) {
    // 预览模式下不允许粘贴
    hideContextMenu()
    return
  }
  const editor = isMaximized.value ? maximizedEditorInstance : editorInstance
  if (editor) {
    editor.focus()
    try {
      const text = await navigator.clipboard.readText()
      const selection = editor.getSelection()
      if (selection) {
        editor.executeEdits('paste', [{
          range: selection,
          text: text
        }])
      }
    } catch (err) {
      document.execCommand('paste')
    }
  }
  hideContextMenu()
}

const handleSelectAll = () => {
  if (showPreviewMode.value) {
    // 预览模式下选择所有预览内容
    const selection = window.getSelection()
    if (selection) {
      const previewElement = document.querySelector('.markdown-preview-wrapper')
      if (previewElement) {
        const range = document.createRange()
        range.selectNodeContents(previewElement)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  } else {
    const editor = isMaximized.value ? maximizedEditorInstance : editorInstance
    if (editor) {
      const model = editor.getModel()
      if (model) {
        const totalLines = model.getLineCount()
        const lastLineLength = model.getLineContent(totalLines).length
        editor.setSelection(new monaco.Range(1, 1, totalLines, lastLineLength + 1))
        editor.focus()
      }
    }
  }
  hideContextMenu()
}

const toggleMaximizeFromMenu = () => {
  hideContextMenu()
  toggleMaximize()
}

// Markdown 渲染
const renderedMarkdown = computed(() => {
  if (!props.modelValue) return ''
  return renderMarkdown(props.modelValue)
})

const togglePreviewMode = () => {
  hideContextMenu()
  if (showPreviewMode.value) {
    exitPreviewMode()
  } else {
    showPreviewMode.value = true
    emit('preview')
  }
}

const exitPreviewMode = () => {
  showPreviewMode.value = false
  // 重新聚焦编辑器
  setTimeout(() => {
    if (isMaximized.value) {
      maximizedEditorInstance?.focus()
    } else {
      editorInstance?.focus()
    }
  }, 100)
}

// 处理预览模式下的右键菜单
const handlePreviewContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  showCustomContextMenu(e.clientX, e.clientY)
}

// ESC 键退出最大化或预览
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showPreviewMode.value) {
      e.preventDefault()
      e.stopPropagation()
      exitPreviewMode()
    } else if (isMaximized.value) {
      e.preventDefault()
      e.stopPropagation()
      toggleMaximize()
    }
  }
}

// 开始拖动
const startResize = (e: MouseEvent) => {
  if (isMaximized.value) return
  
  isResizing.value = true
  startY.value = e.pageY
  startHeight.value = currentHeight.value
  
  // 添加全局事件监听
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  // 防止选中文本
  e.preventDefault()
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ns-resize'
}

// 处理拖动
const handleResize = (e: MouseEvent) => {
  if (!isResizing.value || isMaximized.value) return
  
  const deltaY = e.pageY - startY.value
  let newHeight = startHeight.value + deltaY
  
  // 限制高度范围
  newHeight = Math.max(props.minHeight, Math.min(props.maxHeight, newHeight))
  currentHeight.value = newHeight
  
  // 触发resize事件
  emit('resize', newHeight)
  
  // 通知编辑器调整大小
  if (editorInstance) {
    editorInstance.layout()
  }
}

// 停止拖动
const stopResize = () => {
  isResizing.value = false
  
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  
  // 恢复默认样式
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// 为 JSON 注册简单的语法规则
const registerJsonLanguage = () => {
  monaco.languages.register({ id: 'json' })
  
  // 设置 JSON 的语法规则
  monaco.languages.setMonarchTokensProvider('json', {
    tokenizer: {
      root: [
        [/\{/, 'delimiter.bracket'],
        [/\}/, 'delimiter.bracket'],
        [/\[/, 'delimiter.bracket'],
        [/\]/, 'delimiter.bracket'],
        [/:/, 'delimiter.colon'],
        [/,/, 'delimiter.comma'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        [/\/\/.*$/, 'comment'],
        [/[-+]?\d*\.?\d+([eE][-+]?\d+)?/, 'number'],
        [/true|false/, 'keyword'],
        [/null/, 'keyword.null'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ]
    }
  })

  // 设置 JSON 的配置
  monaco.languages.setLanguageConfiguration('json', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' }
    ]
  })
}

// 为 Markdown 注册简单的语法规则
const registerMarkdownLanguage = () => {
  monaco.languages.register({ id: 'markdown' })
  
  monaco.languages.setMonarchTokensProvider('markdown', {
    tokenizer: {
      root: [
        [/^#{1,6}\s.*$/, 'keyword'],
        [/^\s*[-*+]\s/, 'keyword'],
        [/^\s*\d+\.\s/, 'keyword'],
        [/\*\*([^*]|\*(?!\*))+\*\*/, 'strong'],
        [/\*([^*])+\*/, 'emphasis'],
        [/`[^`]+`/, 'variable'],
        [/```[\s\S]*?```/, 'string'],
        [/\[([^\]]+)\]\([^)]+\)/, 'string.link'],
        [/^>\s+.*$/, 'comment']
      ]
    }
  })
}

onMounted(async () => {
  await nextTick()
  
  // 注册自定义语言
  registerJsonLanguage()
  registerMarkdownLanguage()
  
  // 添加键盘事件监听 - 使用独立的监听器实例
  if (props.enableMaximize) {
    escKeyListener = handleEscKey
    // 使用捕获阶段，避免被其他元素阻止
    document.addEventListener('keydown', escKeyListener, false)
  }
  
  // 配置 Windows Terminal 风格主题
  monaco.editor.defineTheme('wtDark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'keyword.null', foreground: 'f44747' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'string.invalid', foreground: 'f44747' },
      { token: 'string.escape', foreground: 'd7ba7d' },
      { token: 'string.link', foreground: '3794ff', fontStyle: 'underline' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'delimiter', foreground: 'd4d4d4' },
      { token: 'delimiter.bracket', foreground: 'd4d4d4' },
      { token: 'delimiter.colon', foreground: 'd4d4d4' },
      { token: 'delimiter.comma', foreground: 'd4d4d4' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'emphasis', fontStyle: 'italic' }
    ],
    colors: {
      'editor.background': '#1a1a1a',
      'editor.foreground': '#cccccc',
      'editor.lineHighlightBackground': '#252525',
      'editorLineNumber.foreground': '#666666',
      'editorLineNumber.activeForeground': '#cccccc',
      'editorCursor.foreground': '#ffffff',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#1e3a5f',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#606060',
      'editorBracketMatch.background': '#0078d433',
      'editorBracketMatch.border': '#0078d4',
      'scrollbar.shadow': '#000000',
      'scrollbarSlider.background': '#79797966',
      'scrollbarSlider.hoverBackground': '#646464b3',
      'scrollbarSlider.activeBackground': '#bfbfbf66'
    }
  })

  if (editorContainer.value) {
    // 创建编辑器实例
    editorInstance = monaco.editor.create(editorContainer.value, {
      value: props.modelValue || '',
      language: props.language,
      theme: 'wtDark',
      readOnly: props.readOnly,
      minimap: {
        enabled: props.minimap
      },
      lineNumbers: props.lineNumbers,
      wordWrap: props.wordWrap,
      fontSize: props.fontSize,
      tabSize: props.tabSize,
      automaticLayout: props.automaticLayout,
      scrollBeyondLastLine: false,
      renderWhitespace: 'none',
      fontFamily: "'Cascadia Code', 'Cascadia Mono', Consolas, 'Courier New', monospace",
      fontLigatures: true,
      padding: {
        top: 10,
        bottom: 10
      },
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      renderLineHighlight: 'all',
      // 禁用建议和提示功能，避免加载额外的模块
      quickSuggestions: false,
      parameterHints: {
        enabled: false
      },
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnCommitCharacter: false,
      snippetSuggestions: 'none',
      showFoldingControls: 'hover',
      folding: true,
      foldingStrategy: 'indentation',
      'bracketPairColorization.enabled': true,
      guides: {
        indentation: true,
        bracketPairs: true
      },
      // 启用右键菜单但使用自定义处理
      contextmenu: true,
      hover: {
        enabled: false
      },
      links: false,
      colorDecorators: false,
      lightbulb: {
        enabled: false
      },
      codeActionsOnSaveTimeout: 0
    })

    // 监听内容变化
    editorInstance.onDidChangeModelContent(() => {
      const value = editorInstance?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)
      updatePlaceholderVisibility()
    })

    // 监听焦点事件
    editorInstance.onDidFocusEditorText(() => {
      emit('focus')
      updatePlaceholderVisibility()
    })

    editorInstance.onDidBlurEditorText(() => {
      emit('blur')
      updatePlaceholderVisibility()
    })

    // 监听右键菜单事件
    editorInstance.onContextMenu((e) => {
      // 阻止默认的 Monaco 右键菜单
      e.event.preventDefault()
      e.event.stopPropagation()
      
      // 显示自定义右键菜单
      showCustomContextMenu(e.event.posx, e.event.posy)
    })

    // 初始化 placeholder 可见性
    updatePlaceholderVisibility()
  }
})

// 监听modelValue变化
watch(() => props.modelValue, (newValue) => {
  if (editorInstance && editorInstance.getValue() !== newValue) {
    editorInstance.setValue(newValue || '')
    updatePlaceholderVisibility()
  } else if (!editorInstance) {
    // 如果编辑器还没初始化，更新 placeholder 状态
    showPlaceholder.value = !newValue && !!props.placeholder
  }
  
  // 同步更新最大化编辑器的值
  if (maximizedEditorInstance && maximizedEditorInstance.getValue() !== newValue) {
    maximizedEditorInstance.setValue(newValue || '')
  }
})

// 监听 height prop 变化
watch(() => props.height, (newHeight) => {
  const height = typeof newHeight === 'number' ? newHeight : parseInt(newHeight)
  currentHeight.value = Math.max(props.minHeight, Math.min(props.maxHeight, height))
  if (editorInstance) {
    editorInstance.layout()
  }
})

// 初始设置 placeholder 状态
watch(() => props.placeholder, () => {
  updatePlaceholderVisibility()
}, { immediate: true })

// 监听语言变化
watch(() => props.language, (newLanguage) => {
  if (editorInstance && monaco) {
    const model = editorInstance.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, newLanguage)
    }
  }
})

// 监听主题变化
watch(() => props.theme, (newTheme) => {
  if (monaco && editorInstance) {
    monaco.editor.setTheme(newTheme === 'vs' ? 'customLight' : newTheme)
  }
})

// 监听只读状态变化
watch(() => props.readOnly, (newReadOnly) => {
  if (editorInstance) {
    editorInstance.updateOptions({ readOnly: newReadOnly })
  }
  if (maximizedEditorInstance) {
    maximizedEditorInstance.updateOptions({ readOnly: newReadOnly })
  }
})

onUnmounted(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
  if (maximizedEditorInstance) {
    maximizedEditorInstance.dispose()
  }
  // 清理拖动事件
  if (isResizing.value) {
    stopResize()
  }
  // 清理键盘事件
  if (escKeyListener) {
    document.removeEventListener('keydown', escKeyListener, false)
    escKeyListener = null
  }
  // 清理定时器
  if (maximizedHintTimer) {
    clearTimeout(maximizedHintTimer)
  }
})

// 监听键盘快捷键 Ctrl+Shift+V
const handleKeyboardShortcut = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'V' && props.enablePreview && props.language === 'markdown') {
    e.preventDefault()
    if (showPreviewMode.value) {
      exitPreviewMode()
    } else {
      showPreviewMode.value = true
      emit('preview')
    }
  }
}

// 添加键盘快捷键监听
onMounted(() => {
  document.addEventListener('keydown', handleKeyboardShortcut)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardShortcut)
})

// 暴露方法供外部调用
defineExpose({
  focus: () => editorInstance?.focus(),
  getValue: () => editorInstance?.getValue() || '',
  setValue: (value: string) => editorInstance?.setValue(value || ''),
  getEditor: () => editorInstance,
  insertTextAtCursor: (text: string) => {
    if (editorInstance) {
      const position = editorInstance.getPosition()
      if (position) {
        const range = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        )
        editorInstance.executeEdits('insert-placeholder', [{
          range: range,
          text: text
        }])
        // 移动光标到插入文本的末尾
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + text.length
        }
        editorInstance.setPosition(newPosition)
        editorInstance.focus()
      }
    }
  },
  setHeight: (height: number) => {
    currentHeight.value = Math.max(props.minHeight, Math.min(props.maxHeight, height))
    if (editorInstance) {
      editorInstance.layout()
    }
  },
  toggleMaximize,
  exitMaximize: () => {
    if (isMaximized.value) {
      toggleMaximize()
    }
  }
})
</script>

<style scoped>
.monaco-editor-wrapper {
  position: relative;
  width: 100%;
}

/* 最大化遮罩层 */
.maximized-overlay {
  position: fixed;
  top: 38px; /* Windows Terminal 标题栏高度 */
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--wt-bg-primary);
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.maximized-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.maximized-editor-instance {
  flex: 1;
  width: 100%;
  height: 100%;
}

.maximized-toolbar {
  position: absolute !important;
  top: 16px;
  right: 16px;
  z-index: 10000;
}

.monaco-editor-container {
  position: relative;
  width: 100%;
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  overflow: hidden;
  background: var(--wt-bg-tertiary);
  transition: all 0.15s;
}

.monaco-editor-container:hover {
  border-color: var(--wt-accent);
}

.monaco-editor-container:focus-within {
  border-color: var(--wt-accent);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

/* 工具栏 */
.editor-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wt-bg-secondary);
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  cursor: pointer;
  color: var(--wt-text-secondary);
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: var(--wt-bg-hover);
  border-color: var(--wt-accent);
  color: var(--wt-text-primary);
}

.toolbar-btn:active {
  background: var(--wt-bg-active);
}

.toolbar-btn svg {
  width: 16px;
  height: 16px;
}

.editor-instance {
  width: 100%;
  height: 100%;
}

.monaco-placeholder-overlay {
  position: absolute;
  top: 10px;
  left: 12px;
  right: 12px;
  color: var(--wt-text-tertiary);
  font-family: var(--wt-font-mono);
  font-size: 13px;
  line-height: 1.5;
  pointer-events: auto;
  cursor: text;
  user-select: none;
  padding-left: 40px; /* 为行号留出空间 */
  white-space: pre-wrap;
}

/* 当编辑器聚焦时隐藏 placeholder */
.monaco-editor-container:focus-within .monaco-placeholder-overlay {
  display: none;
}

/* 拖动手柄样式 */
.resize-handle {
  position: relative;
  width: 100%;
  height: 12px;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
  opacity: 0;
}

.monaco-editor-wrapper:hover .resize-handle {
  opacity: 1;
}

.resize-handle-bar {
  width: 40px;
  height: 3px;
  background: var(--wt-border);
  border-radius: 2px;
  transition: all 0.15s;
}

.resize-handle:hover .resize-handle-bar {
  background: var(--wt-accent);
  width: 60px;
}

.resize-handle:active .resize-handle-bar {
  background: var(--wt-accent-hover);
}

/* 最大化提示 */
.maximized-hint {
  position: fixed;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--wt-bg-tertiary);
  color: var(--wt-text-primary);
  padding: 8px 16px;
  border: 1px solid var(--wt-border);
  border-radius: var(--wt-radius);
  font-size: 14px;
  z-index: 10000;
  box-shadow: var(--wt-shadow);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Monaco 编辑器全局样式覆盖 */
:global(.monaco-editor .margin-view-overlays .line-numbers) {
  color: var(--wt-text-tertiary) !important;
}

:global(.monaco-editor .current-line ~ .line-numbers) {
  color: var(--wt-text-primary) !important;
}

:global(.monaco-editor.vs-dark .monaco-editor-background) {
  background-color: transparent !important;
}

/* 去掉 Monaco Editor 的蓝色焦点边框 */
:global(.monaco-editor),
:global(.monaco-diff-editor .synthetic-focus),
:global(.monaco-editor),
:global(.monaco-diff-editor [tabindex="0"]:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor [tabindex="-1"]:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor button:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor input[type=button]:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor input[type=checkbox]:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor input[type=search]:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor input[type=text]:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor select:focus),
:global(.monaco-editor),
:global(.monaco-diff-editor textarea:focus) {
  outline: none !important;
  outline-width: 0 !important;
}

/* 拖动时的光标样式 */
:global(body.resizing-monaco) {
  cursor: ns-resize !important;
  user-select: none !important;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 10001;
  background: #252526;
  border: 1px solid #454545;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  min-width: 200px;
  font-size: 13px;
  color: #cccccc;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.context-menu-item:hover:not(.disabled) {
  background: #094771;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.menu-icon {
  width: 20px;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.menu-text {
  flex: 1;
}

.menu-shortcut {
  margin-left: 20px;
  color: #969696;
  font-size: 11px;
}

.context-menu-divider {
  height: 1px;
  background: #454545;
  margin: 4px 0;
}

/* 右键菜单过渡动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 预览模式样式 */
.preview-mode-container {
  width: 100%;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  background: #1e1e1e;
  overflow-y: auto;
  padding: 20px;
}

/* Markdown 预览容器 */
.markdown-preview-wrapper {
  user-select: text;
  cursor: text;
}

/* 预览模式滚动条 */
.preview-mode-container::-webkit-scrollbar {
  width: 10px;
}

.preview-mode-container::-webkit-scrollbar-track {
  background: transparent;
}

.preview-mode-container::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.preview-mode-container::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}

/* 最大化预览模式 */
.maximized-preview-mode {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.maximized-preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px 60px;
}

.maximized-preview-content .markdown-preview-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

/* 最大化预览滚动条 */
.maximized-preview-content::-webkit-scrollbar {
  width: 10px;
}

.maximized-preview-content::-webkit-scrollbar-track {
  background: transparent;
}

.maximized-preview-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.maximized-preview-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>