<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  diff: string
  filePath?: string
  loading?: boolean
}>()

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
      <div class="diff-stats">
        <span class="additions">+{{ parsedDiff.stats.additions }}</span>
        <span class="deletions">-{{ parsedDiff.stats.deletions }}</span>
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
      <table class="diff-table">
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
</style>