/* Fliex Music — 安全 Markdown 渲染器（随笔用）
   原则：先对全部源文本做 HTML 转义，再叠加我们自己生成的结构标签——
   任何用户输入的 HTML/脚本都不可能进入输出。支持：
   标题 #/##/###、引用 >、无序/有序列表、分隔线 ---、段落、
   **粗体**、*斜体*、`行内代码`、[文字](链接)（仅 http/https/相对地址）。 */

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const SAFE_URL = /^(https?:\/\/|\/|#)/i

function inline(text: string): string {
  let out = escapeHtml(text)
  // 行内代码（先处理，内部不再叠加其他格式）
  out = out.replace(/`([^`]+)`/g, (_, code: string) => `<code>${code}</code>`)
  // 链接：只放行安全协议
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    const decoded = url.replace(/&amp;/g, '&')
    if (!SAFE_URL.test(decoded)) return match
    return `<a href="${escapeHtml(decoded)}" target="_blank" rel="noreferrer noopener">${label}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return out
}

export function renderMarkdown(source: string): string {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let quoteBuffer: string[] = []

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }
  const flushQuote = () => {
    if (quoteBuffer.length) {
      html.push(`<blockquote>${quoteBuffer.map(line => inline(line)).join('<br />')}</blockquote>`)
      quoteBuffer = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      flushQuote()
      continue
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      closeList(); flushQuote()
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      closeList(); flushQuote()
      html.push('<hr />')
      continue
    }
    if (trimmed.startsWith('> ')) {
      closeList()
      quoteBuffer.push(trimmed.slice(2))
      continue
    }
    const ul = trimmed.match(/^[-*]\s+(.*)$/)
    if (ul) {
      flushQuote()
      if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul' }
      html.push(`<li>${inline(ul[1])}</li>`)
      continue
    }
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/)
    if (ol) {
      flushQuote()
      if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol' }
      html.push(`<li>${inline(ol[1])}</li>`)
      continue
    }
    closeList(); flushQuote()
    html.push(`<p>${inline(line)}</p>`)
  }
  closeList()
  flushQuote()
  return html.join('\n')
}
