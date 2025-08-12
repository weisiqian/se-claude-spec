<template>
  <div class="markdown-preview" ref="previewRef">
    <div class="markdown-body" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { renderMarkdown } from '../utils/markdownRenderer'
import '../styles/markdown.css'

const props = defineProps<{
  content: string
  syncScroll?: boolean
  scrollPercentage?: number
}>()

const emit = defineEmits<{
  'scroll': [percentage: number]
}>()

const previewRef = ref<HTMLElement>()
const renderedContent = computed(() => renderMarkdown(props.content))

// 处理同步滚动
watch(() => props.scrollPercentage, (percentage) => {
  if (props.syncScroll && percentage !== undefined && previewRef.value) {
    const scrollHeight = previewRef.value.scrollHeight - previewRef.value.clientHeight
    previewRef.value.scrollTop = scrollHeight * percentage
  }
})

// 监听滚动事件
const handleScroll = () => {
  if (props.syncScroll && previewRef.value) {
    const scrollHeight = previewRef.value.scrollHeight - previewRef.value.clientHeight
    const percentage = scrollHeight > 0 ? previewRef.value.scrollTop / scrollHeight : 0
    emit('scroll', percentage)
  }
}

// 组件挂载后添加滚动监听
watch(previewRef, (el) => {
  if (el) {
    el.addEventListener('scroll', handleScroll)
  }
}, { immediate: true })
</script>

<style scoped>
.markdown-preview {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--wt-bg-primary);
  color: var(--wt-text-primary);
}

.markdown-preview::-webkit-scrollbar {
  width: 10px;
}

.markdown-preview::-webkit-scrollbar-track {
  background: transparent;
}

.markdown-preview::-webkit-scrollbar-thumb {
  background: var(--wt-border);
  border-radius: 5px;
}

.markdown-preview::-webkit-scrollbar-thumb:hover {
  background: var(--wt-text-tertiary);
}

.markdown-body {
  padding: 20px 30px;
  max-width: 900px;
  margin: 0 auto;
}
</style>

<style>
/* Markdown 内容样式 */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--wt-text-primary);
}

.markdown-body h1 {
  font-size: 2em;
  border-bottom: 1px solid var(--wt-border);
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em;
  border-bottom: 1px solid var(--wt-border);
  padding-bottom: 0.3em;
}

.markdown-body h3 {
  font-size: 1.25em;
}

.markdown-body h4 {
  font-size: 1em;
}

.markdown-body h5 {
  font-size: 0.875em;
}

.markdown-body h6 {
  font-size: 0.85em;
  color: var(--wt-text-secondary);
}

.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body blockquote {
  margin: 0;
  padding: 0 1em;
  color: var(--wt-text-secondary);
  border-left: 0.25em solid var(--wt-border);
}

.markdown-body ul,
.markdown-body ol {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-body li {
  margin-top: 0.25em;
}

.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(110, 118, 129, 0.15);
  border-radius: 3px;
  font-family: var(--wt-font-mono);
}

.markdown-body pre {
  margin-top: 0;
  margin-bottom: 16px;
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--wt-bg-secondary);
  border-radius: 6px;
}

.markdown-body pre code {
  display: inline;
  max-width: 100%;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}

.markdown-body table {
  display: block;
  width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.markdown-body table th {
  font-weight: 600;
  padding: 6px 13px;
  border: 1px solid var(--wt-border);
  background-color: var(--wt-bg-secondary);
}

.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid var(--wt-border);
}

.markdown-body table tr {
  background-color: transparent;
  border-top: 1px solid var(--wt-border);
}

.markdown-body table tr:nth-child(2n) {
  background-color: rgba(255, 255, 255, 0.03);
}

.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--wt-border);
  border: 0;
}

.markdown-body a {
  color: var(--wt-accent);
  text-decoration: none;
  transition: color 0.2s;
}

.markdown-body a:hover {
  color: var(--wt-accent-hover);
  text-decoration: underline;
}

.markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
  background-color: transparent;
}

.markdown-body strong {
  font-weight: 600;
}

.markdown-body em {
  font-style: italic;
}

.markdown-body del {
  text-decoration: line-through;
}

.markdown-body input[type="checkbox"] {
  margin: 0 0.2em 0.25em -1.6em;
  vertical-align: middle;
}

/* 代码高亮样式 */
.markdown-body .hljs {
  background: var(--wt-bg-secondary);
  color: var(--wt-text-primary);
}
</style>