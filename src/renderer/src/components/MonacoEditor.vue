<template>
  <div class="monaco-editor-wrapper">
    <!-- 全屏遮罩层 -->
    <div v-if="isFullscreen" class="fullscreen-overlay">
      <div class="fullscreen-container">
        <!-- 工具栏 -->
        <div class="editor-toolbar fullscreen-toolbar">
          <button 
            class="toolbar-btn fullscreen-btn"
            @click="toggleFullscreen"
            title="退出全屏 (ESC)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          </button>
        </div>
        
        <div ref="fullscreenEditorContainer" class="editor-instance fullscreen-editor-instance"></div>
        
        <!-- 全屏时的退出提示 -->
        <transition name="fade">
          <div v-if="showFullscreenHint" class="fullscreen-hint">
            按 ESC 退出全屏
          </div>
        </transition>
      </div>
    </div>
    
    <!-- 正常编辑器容器 -->
    <div 
      class="monaco-editor-container" 
      :style="{ height: currentHeight + 'px' }"
      ref="containerRef"
      v-show="!isFullscreen"
    >
      <!-- 工具栏 -->
      <div class="editor-toolbar">
        <button 
          class="toolbar-btn fullscreen-btn"
          @click="toggleFullscreen"
          title="全屏显示"
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
    
    <!-- 拖动手柄（全屏时隐藏） -->
    <div 
      v-if="!isFullscreen"
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
  enableFullscreen?: boolean
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
  enableFullscreen: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'blur': []
  'focus': []
  'resize': [height: number]
  'fullscreen': [isFullscreen: boolean]
}>()

const editorContainer = ref<HTMLElement>()
const fullscreenEditorContainer = ref<HTMLElement>()
const containerRef = ref<HTMLElement>()
let editorInstance: editor.IStandaloneCodeEditor | null = null
let fullscreenEditorInstance: editor.IStandaloneCodeEditor | null = null
const showPlaceholder = ref(false)

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

// 全屏相关
const isFullscreen = ref(false)
const showFullscreenHint = ref(false)
let fullscreenHintTimer: NodeJS.Timeout | null = null
let escKeyListener: ((e: KeyboardEvent) => void) | null = null

// 计算是否显示 placeholder
const updatePlaceholderVisibility = () => {
  const value = editorInstance?.getValue() || props.modelValue || ''
  showPlaceholder.value = !value && !!props.placeholder
}

const focusEditor = () => {
  editorInstance?.focus()
}

// 创建全屏编辑器实例
const createFullscreenEditor = () => {
  if (!fullscreenEditorContainer.value || fullscreenEditorInstance) return
  
  const currentValue = editorInstance?.getValue() || props.modelValue || ''
  const currentModel = editorInstance?.getModel()
  const currentLanguage = currentModel ? monaco.editor.getModel(currentModel.uri)?.getLanguageId() : props.language
  
  // 创建全屏编辑器
  fullscreenEditorInstance = monaco.editor.create(fullscreenEditorContainer.value, {
    value: currentValue,
    language: currentLanguage,
    theme: 'customLight',
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
    contextmenu: false,
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
  
  // 监听全屏编辑器的内容变化
  fullscreenEditorInstance.onDidChangeModelContent(() => {
    const value = fullscreenEditorInstance?.getValue() || ''
    emit('update:modelValue', value)
    emit('change', value)
    // 同步到主编辑器
    if (editorInstance) {
      editorInstance.setValue(value)
    }
  })
  
  // 监听焦点事件
  fullscreenEditorInstance.onDidFocusEditorText(() => {
    emit('focus')
  })
  
  fullscreenEditorInstance.onDidBlurEditorText(() => {
    emit('blur')
  })
  
  // 聚焦全屏编辑器
  fullscreenEditorInstance.focus()
}

// 切换全屏
const toggleFullscreen = async () => {
  isFullscreen.value = !isFullscreen.value
  
  if (isFullscreen.value) {
    // 进入全屏
    showFullscreenHint.value = true
    
    // 3秒后隐藏提示
    if (fullscreenHintTimer) {
      clearTimeout(fullscreenHintTimer)
    }
    fullscreenHintTimer = setTimeout(() => {
      showFullscreenHint.value = false
    }, 3000)
    
    // 等待 DOM 更新后创建全屏编辑器
    await nextTick()
    createFullscreenEditor()
  } else {
    // 退出全屏
    showFullscreenHint.value = false
    if (fullscreenHintTimer) {
      clearTimeout(fullscreenHintTimer)
      fullscreenHintTimer = null
    }
    
    // 保存全屏编辑器的内容到主编辑器
    if (fullscreenEditorInstance && editorInstance) {
      const value = fullscreenEditorInstance.getValue()
      editorInstance.setValue(value)
    }
    
    // 销毁全屏编辑器
    if (fullscreenEditorInstance) {
      fullscreenEditorInstance.dispose()
      fullscreenEditorInstance = null
    }
    
    // 重新聚焦主编辑器
    setTimeout(() => {
      editorInstance?.focus()
      editorInstance?.layout()
    }, 100)
  }
  
  // 触发事件
  emit('fullscreen', isFullscreen.value)
}

// ESC 键退出全屏
const handleEscKey = (e: KeyboardEvent) => {
  // 只在全屏模式下处理 ESC 键
  if (e.key === 'Escape' && isFullscreen.value) {
    e.preventDefault()
    e.stopPropagation()
    toggleFullscreen()
  }
}

// 开始拖动
const startResize = (e: MouseEvent) => {
  if (isFullscreen.value) return
  
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
  if (!isResizing.value || isFullscreen.value) return
  
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
  if (props.enableFullscreen) {
    escKeyListener = handleEscKey
    // 使用捕获阶段，避免被其他元素阻止
    document.addEventListener('keydown', escKeyListener, false)
  }
  
  // 配置自定义主题
  monaco.editor.defineTheme('customLight', {
    base: 'vs',
    inherit: true,
    rules: [
      // 通用规则
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'keyword.null', foreground: 'dc2626' },
      { token: 'string', foreground: '059669' },
      { token: 'string.invalid', foreground: 'dc2626' },
      { token: 'string.escape', foreground: '0891b2' },
      { token: 'string.link', foreground: '2563eb', fontStyle: 'underline' },
      { token: 'number', foreground: '0969da' },
      { token: 'delimiter', foreground: '374151' },
      { token: 'delimiter.bracket', foreground: '374151' },
      { token: 'delimiter.colon', foreground: '374151' },
      { token: 'delimiter.comma', foreground: '374151' },
      { token: 'variable', foreground: 'ea580c' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'emphasis', fontStyle: 'italic' }
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1f2937',
      'editor.lineHighlightBackground': '#f9fafb',
      'editorLineNumber.foreground': '#9ca3af',
      'editorLineNumber.activeForeground': '#4f46e5',
      'editorCursor.foreground': '#4f46e5',
      'editor.selectionBackground': '#ddd6fe',
      'editor.inactiveSelectionBackground': '#e9e9fb',
      'editorIndentGuide.background': '#e5e7eb',
      'editorIndentGuide.activeBackground': '#d1d5db',
      'editorBracketMatch.background': '#ddd6fe',
      'editorBracketMatch.border': '#4f46e5'
    }
  })

  if (editorContainer.value) {
    // 创建编辑器实例
    editorInstance = monaco.editor.create(editorContainer.value, {
      value: props.modelValue || '',
      language: props.language,
      theme: 'customLight',
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
      // 禁用更多可能导致问题的功能
      contextmenu: false,
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
})

onUnmounted(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
  if (fullscreenEditorInstance) {
    fullscreenEditorInstance.dispose()
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
  if (fullscreenHintTimer) {
    clearTimeout(fullscreenHintTimer)
  }
})

// 暴露方法供外部调用
defineExpose({
  focus: () => editorInstance?.focus(),
  getValue: () => editorInstance?.getValue() || '',
  setValue: (value: string) => editorInstance?.setValue(value || ''),
  getEditor: () => editorInstance,
  setHeight: (height: number) => {
    currentHeight.value = Math.max(props.minHeight, Math.min(props.maxHeight, height))
    if (editorInstance) {
      editorInstance.layout()
    }
  },
  toggleFullscreen,
  exitFullscreen: () => {
    if (isFullscreen.value) {
      toggleFullscreen()
    }
  }
})
</script>

<style scoped>
.monaco-editor-wrapper {
  position: relative;
  width: 100%;
}

/* 全屏遮罩层 */
.fullscreen-overlay {
  position: fixed;
  top: 32px; /* 留出标题栏高度 */
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.fullscreen-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.fullscreen-editor-instance {
  flex: 1;
  width: 100%;
  height: 100%;
}

.fullscreen-toolbar {
  position: absolute !important;
  top: 16px;
  right: 16px;
  z-index: 10000;
}

.monaco-editor-container {
  position: relative;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.monaco-editor-container:hover {
  border-color: #d1d5db;
}

.monaco-editor-container:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.toolbar-btn:hover {
  background: #ffffff;
  border-color: #d1d5db;
  color: #374151;
}

.toolbar-btn:active {
  background: #f9fafb;
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
  color: #9ca3af;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
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
  transition: opacity 0.2s ease;
  opacity: 0;
}

.monaco-editor-wrapper:hover .resize-handle {
  opacity: 1;
}

.resize-handle-bar {
  width: 40px;
  height: 4px;
  background: #d1d5db;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.resize-handle:hover .resize-handle-bar {
  background: #9ca3af;
}

.resize-handle:active .resize-handle-bar {
  background: #6b7280;
}

/* 全屏提示 */
.fullscreen-hint {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(31, 41, 55, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 10000;
  backdrop-filter: blur(4px);
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
  color: #9ca3af !important;
}

:global(.monaco-editor .current-line ~ .line-numbers) {
  color: #4f46e5 !important;
}

:global(.monaco-editor.vs .monaco-editor-background) {
  background-color: #ffffff !important;
}

/* 拖动时的光标样式 */
:global(body.resizing-monaco) {
  cursor: ns-resize !important;
  user-select: none !important;
}
</style>