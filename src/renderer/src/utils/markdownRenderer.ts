import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github-dark.css'

// 注册语言
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)

// 创建 MarkdownIt 实例
const md = new MarkdownIt({
  html: true,              // 启用 HTML 标签
  xhtmlOut: true,         // 使用 '/' 来闭合单标签
  breaks: true,           // 转换换行符为 <br>
  linkify: true,          // 自动识别 URL 并转换为链接
  typographer: true,      // 启用更好看的引号和其他符号转换
  langPrefix: 'language-', // 代码块语言类名前缀
  quotes: '""\'\'',         // 引号替换
  
  // 代码高亮配置
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`
      } catch (__) {
        // 忽略错误
      }
    }
    
    // 没有指定语言或语言不支持时，使用自动检测
    try {
      return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`
    } catch (__) {
      // 如果高亮失败，返回原始代码
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
    }
  }
})

// 配置规则
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx]
  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    // 为外部链接添加 target="_blank"
    const href = token.attrs![hrefIndex][1]
    if (href.startsWith('http://') || href.startsWith('https://')) {
      token.attrPush(['target', '_blank'])
      token.attrPush(['rel', 'noopener noreferrer'])
    }
  }
  return self.renderToken(tokens, idx, options)
}

// 自定义表格渲染
md.renderer.rules.table_open = function() {
  return '<div class="table-wrapper"><table class="markdown-table">'
}

md.renderer.rules.table_close = function() {
  return '</table></div>'
}

// 自定义引用块渲染
const defaultBlockquoteOpen = md.renderer.rules.blockquote_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.blockquote_open = function(tokens, idx, options, env, self) {
  tokens[idx].attrPush(['class', 'markdown-blockquote'])
  return defaultBlockquoteOpen(tokens, idx, options, env, self)
}

// 导出渲染函数
export function renderMarkdown(content: string): string {
  if (!content) return ''
  return md.render(content)
}

// 导出 md 实例，以便需要时自定义
export default md