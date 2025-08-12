<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  diff: string
  filePath?: string
  loading?: boolean
}>()

// 视图模式：unified（统一） 或 side-by-side（并排）
const viewMode = ref<'unified' | 'side-by-side'>('unified')

// 从 localStorage 读取用户偏好
onMounted(() => {
  const savedMode = localStorage.getItem('git-diff-view-mode')
  if (savedMode === 'side-by-side' || savedMode === 'unified') {
    viewMode.value = savedMode
  }
})

// 保存用户偏好
watch(viewMode, (newMode) => {
  localStorage.setItem('git-diff-view-mode', newMode)
})

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'unified' ? 'side-by-side' : 'unified'
}

// 解析diff内容
const parsedDiff = computed(() => {
  if (!props.diff) return { lines: [], stats: { additions: 0, deletions: 0 } }
  
  const lines = props.diff.split('\n')
  const parsedLines: any[] = []
  let additions = 0
  let deletions = 0
  let inHeader = true
  let lineNumber = { old: 0, new: 0 }
  
  for (const line of lines) {
    // 跳过提交信息头
    if (inHeader) {
      if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++')) {
        inHeader = false
        continue
      }
      if (line.startsWith('commit ') || line.startsWith('Author:') || line.startsWith('Date:')) {
        continue
      }
    }
    
    // 处理hunk header
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        lineNumber.old = parseInt(match[1]) - 1
        lineNumber.new = parseInt(match[2]) - 1
      }
      parsedLines.push({
        type: 'hunk',
        content: line,
        oldLine: null,
        newLine: null
      })
      continue
    }
    
    // 处理diff内容行
    if (line.startsWith('+')) {
      additions++
      lineNumber.new++
      parsedLines.push({
        type: 'add',
        content: line.substring(1),
        oldLine: null,
        newLine: lineNumber.new
      })
    } else if (line.startsWith('-')) {
      deletions++
      lineNumber.old++
      parsedLines.push({
        type: 'delete',
        content: line.substring(1),
        oldLine: lineNumber.old,
        newLine: null
      })
    } else if (line.startsWith('\\')) {
      // 忽略 "\ No newline at end of file"
      parsedLines.push({
        type: 'meta',
        content: line,
        oldLine: null,
        newLine: null
      })
    } else if (!inHeader && line.length > 0) {
      // 普通行
      lineNumber.old++
      lineNumber.new++
      parsedLines.push({
        type: 'normal',
        content: line.startsWith(' ') ? line.substring(1) : line,
        oldLine: lineNumber.old,
        newLine: lineNumber.new
      })
    }
  }
  
  return {
    lines: parsedLines,
    stats: { additions, deletions }
  }
})

// 处理side-by-side视图的数据
const sideBySideDiff = computed(() => {
  if (!parsedDiff.value.lines.length) return []
  
  const result: any[] = []
  let i = 0
  const lines = parsedDiff.value.lines
  
  while (i < lines.length) {
    const line = lines[i]
    
    // hunk header独占一行
    if (line.type === 'hunk') {
      result.push({
        type: 'hunk',
        left: { content: line.content, lineNumber: null },
        right: { content: line.content, lineNumber: null }
      })
      i++
      continue
    }
    
    // meta信息独占一行
    if (line.type === 'meta') {
      result.push({
        type: 'meta',
        left: { content: line.content, lineNumber: null },
        right: { content: line.content, lineNumber: null }
      })
      i++
      continue
    }
    
    // 普通行
    if (line.type === 'normal') {
      result.push({
        type: 'normal',
        left: { content: line.content, lineNumber: line.oldLine },
        right: { content: line.content, lineNumber: line.newLine }
      })
      i++
      continue
    }
    
    // 处理删除和新增的配对
    if (line.type === 'delete') {
      // 查找后续的新增行
      let j = i + 1
      const deleteLines: any[] = [line]
      const addLines: any[] = []
      
      // 收集连续的删除行
      while (j < lines.length && lines[j].type === 'delete') {
        deleteLines.push(lines[j])
        j++
      }
      
      // 收集连续的新增行
      while (j < lines.length && lines[j].type === 'add') {
        addLines.push(lines[j])
        j++
      }
      
      // 配对显示
      const maxLength = Math.max(deleteLines.length, addLines.length)
      for (let k = 0; k < maxLength; k++) {
        const deleteLine = deleteLines[k]
        const addLine = addLines[k]
        
        result.push({
          type: 'modified',
          left: deleteLine ? {
            content: deleteLine.content,
            lineNumber: deleteLine.oldLine,
            type: 'delete'
          } : { content: '', lineNumber: null, type: 'empty' },
          right: addLine ? {
            content: addLine.content,
            lineNumber: addLine.newLine,
            type: 'add'
          } : { content: '', lineNumber: null, type: 'empty' }
        })
      }
      
      i = j
      continue
    }
    
    // 单独的新增行
    if (line.type === 'add') {
      result.push({
        type: 'add',
        left: { content: '', lineNumber: null, type: 'empty' },
        right: { content: line.content, lineNumber: line.newLine, type: 'add' }
      })
      i++
      continue
    }
    
    i++
  }
  
  return result
})

// 获取行的样式类
const getLineClass = (type: string) => {
  switch (type) {
    case 'add':
      return 'line-add'
    case 'delete':
      return 'line-delete'
    case 'hunk':
      return 'line-hunk'
    case 'meta':
      return 'line-meta'
    default:
      return 'line-normal'
  }
}

// 格式化行号
const formatLineNumber = (num: number | null) => {
  return num !== null ? num.toString() : ''
}
</script>

<template>
  <div class="git-diff-viewer">
    <!-- 头部信息 -->
    <div v-if="filePath" class="diff-header">
      <div class="file-name">{{ filePath }}</div>
      <div class="diff-header-actions">
        <!-- 视图切换按钮 -->
        <button 
          class="view-mode-toggle" 
          @click="toggleViewMode"
          :title="viewMode === 'unified' ? '切换到并排视图' : '切换到统一视图'"
        >
          <svg v-if="viewMode === 'unified'" viewBox="0 0 16 16" fill="currentColor">
            <!-- 并排视图图标 -->
            <rect x="1" y="3" width="6" height="10" stroke="currentColor" stroke-width="1" fill="none"/>
            <rect x="9" y="3" width="6" height="10" stroke="currentColor" stroke-width="1" fill="none"/>
          </svg>
          <svg v-else viewBox="0 0 16 16" fill="currentColor">
            <!-- 统一视图图标 -->
            <rect x="2" y="3" width="12" height="10" stroke="currentColor" stroke-width="1" fill="none"/>
            <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1"/>
            <line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1"/>
          </svg>
        </button>
        <div class="diff-stats">
          <span class="additions">+{{ parsedDiff.stats.additions }}</span>
          <span class="deletions">-{{ parsedDiff.stats.deletions }}</span>
        </div>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="diff-loading">
      <svg class="loading-icon rotating" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z"/>
        <path d="M8 1a7 7 0 0 1 0 14" opacity="0.3"/>
      </svg>
      <span>加载diff内容...</span>
    </div>
    
    <!-- diff内容 -->
    <div v-else-if="parsedDiff.lines.length > 0" class="diff-content">
      <!-- 统一视图 -->
      <table v-if="viewMode === 'unified'" class="diff-table unified-view">
        <tbody>
          <tr 
            v-for="(line, index) in parsedDiff.lines" 
            :key="index"
            :class="getLineClass(line.type)"
          >
            <td class="line-number line-number-old">
              {{ formatLineNumber(line.oldLine) }}
            </td>
            <td class="line-number line-number-new">
              {{ formatLineNumber(line.newLine) }}
            </td>
            <td class="line-sign">
              <span v-if="line.type === 'add'">+</span>
              <span v-else-if="line.type === 'delete'">-</span>
            </td>
            <td class="line-content">
              <pre>{{ line.content }}</pre>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- 并排视图 -->
      <table v-else class="diff-table side-by-side-view">
        <tbody>
          <template v-for="(row, index) in sideBySideDiff" :key="index">
            <!-- Hunk header 跨越整行 -->
            <tr v-if="row.type === 'hunk'" class="row-hunk">
              <td colspan="5" class="hunk-header">
                <pre>{{ row.left.content }}</pre>
              </td>
            </tr>
            
            <!-- Meta 信息跨越整行 -->
            <tr v-else-if="row.type === 'meta'" class="row-meta">
              <td colspan="5" class="meta-info">
                <pre>{{ row.left.content }}</pre>
              </td>
            </tr>
            
            <!-- 普通行和修改行 -->
            <tr v-else :class="'row-' + row.type">
              <!-- 左侧（原始内容） -->
              <td class="line-number line-number-old">
                {{ formatLineNumber(row.left.lineNumber) }}
              </td>
              <td 
                class="line-content left-content"
                :class="{
                  'line-delete': row.left.type === 'delete',
                  'line-empty': row.left.type === 'empty'
                }"
              >
                <pre>{{ row.left.content }}</pre>
              </td>
              
              <!-- 分隔线 -->
              <td class="diff-gutter"></td>
              
              <!-- 右侧（修改后内容） -->
              <td class="line-number line-number-new">
                {{ formatLineNumber(row.right.lineNumber) }}
              </td>
              <td 
                class="line-content right-content"
                :class="{
                  'line-add': row.right.type === 'add',
                  'line-empty': row.right.type === 'empty'
                }"
              >
                <pre>{{ row.right.content }}</pre>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="diff-empty">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="9" y1="15" x2="15" y2="15" stroke="white" stroke-width="2"/>
      </svg>
      <p>暂无diff内容</p>
    </div>
  </div>
</template>

<style scoped>
.git-diff-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.file-name {
  color: #cccccc;
  font-weight: 500;
}

.diff-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  background: #1e1e1e;
  color: #969696;
  cursor: pointer;
  transition: all 0.2s;
}

.view-mode-toggle:hover {
  background: #2d2d30;
  color: #cccccc;
  border-color: #464647;
}

.view-mode-toggle svg {
  width: 16px;
  height: 16px;
}

.diff-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.additions {
  color: #3fb950;
}

.deletions {
  color: #f85149;
}

.diff-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
}

.loading-icon {
  width: 32px;
  height: 32px;
  color: #808080;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.diff-loading span {
  font-size: 13px;
  color: #969696;
}

.diff-content {
  flex: 1;
  overflow: auto;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.diff-table tr {
  line-height: 20px;
}

.line-number {
  width: 50px;
  padding: 0 8px;
  text-align: right;
  color: #858585;
  background: #1e1e1e;
  user-select: none;
  vertical-align: top;
}

.line-sign {
  width: 20px;
  text-align: center;
  color: #858585;
  user-select: none;
  vertical-align: top;
}

.line-content {
  padding-left: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  vertical-align: top;
}

.line-content pre {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 行类型样式 */
.line-normal {
  background: #1e1e1e;
  color: #d4d4d4;
}

.line-add {
  background: rgba(63, 185, 80, 0.1);
  color: #d4d4d4;
}

.line-add .line-sign {
  color: #3fb950;
}

.line-delete {
  background: rgba(248, 81, 73, 0.1);
  color: #d4d4d4;
}

.line-delete .line-sign {
  color: #f85149;
}

.line-hunk {
  background: #303030;
  color: #8b949e;
}

.line-hunk .line-content {
  padding-left: 12px;
  font-weight: 600;
}

.line-meta {
  color: #8b949e;
  font-style: italic;
}

/* 悬停效果 */
.diff-table tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.diff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #808080;
  margin-bottom: 16px;
}

.diff-empty p {
  font-size: 14px;
  color: #969696;
  margin: 0;
}

/* Side-by-side 视图样式 */
.side-by-side-view {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.side-by-side-view .diff-gutter {
  width: 2px;
  background: #3e3e42;
  padding: 0;
}

.side-by-side-view .left-content,
.side-by-side-view .right-content {
  width: calc(50% - 52px);
  padding-left: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
  vertical-align: top;
}

.side-by-side-view .line-number {
  width: 50px;
  padding: 0 8px;
  text-align: right;
  color: #858585;
  background: #1e1e1e;
  user-select: none;
  vertical-align: top;
}

.side-by-side-view .line-content pre {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Side-by-side 行样式 */
.side-by-side-view .row-normal {
  background: #1e1e1e;
}

.side-by-side-view .row-normal .line-content {
  color: #d4d4d4;
}

.side-by-side-view .row-modified .left-content.line-delete {
  background: rgba(248, 81, 73, 0.1);
  color: #d4d4d4;
}

.side-by-side-view .row-modified .right-content.line-add {
  background: rgba(63, 185, 80, 0.1);
  color: #d4d4d4;
}

.side-by-side-view .row-add .right-content.line-add {
  background: rgba(63, 185, 80, 0.1);
  color: #d4d4d4;
}

.side-by-side-view .line-empty {
  background: #181818;
}

.side-by-side-view .row-hunk {
  background: #303030;
}

.side-by-side-view .hunk-header {
  color: #8b949e;
  font-weight: 600;
  padding: 2px 12px;
  text-align: center;
}

.side-by-side-view .hunk-header pre {
  margin: 0;
  font-family: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-by-side-view .row-meta .meta-info {
  color: #8b949e;
  font-style: italic;
  padding: 2px 12px;
  text-align: center;
}

.side-by-side-view .meta-info pre {
  margin: 0;
  font-family: inherit;
}

/* Side-by-side 悬停效果 */
.side-by-side-view tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* 过渡动画 */
.diff-content {
  position: relative;
}

.diff-table {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>