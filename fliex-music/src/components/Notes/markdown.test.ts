import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'
import { mergeNotes, validateNotes } from '../../storage/notes'

describe('renderMarkdown（安全渲染）', () => {
  it('标题 / 段落 / 引用 / 列表 / 分隔线', () => {
    const html = renderMarkdown('## 标题\n\n正文一行\n\n> 引用一句\n\n- 甲\n- 乙\n\n1. one\n2. two\n\n---')
    expect(html).toContain('<h2>标题</h2>')
    expect(html).toContain('<p>正文一行</p>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<hr />')
  })
  it('粗体 / 斜体 / 行内代码', () => {
    const html = renderMarkdown('这是 **重点** 和 *语气* 与 `code()`')
    expect(html).toContain('<strong>重点</strong>')
    expect(html).toContain('<em>语气</em>')
    expect(html).toContain('<code>code()</code>')
  })
  it('脚本注入被转义，不会产生可执行标签', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })
  it('链接仅允许安全协议', () => {
    const ok = renderMarkdown('[站点](https://a.b/)')
    expect(ok).toContain('<a href="https://a.b/"')
    const bad = renderMarkdown('[点我](javascript:alert(1))')
    expect(bad).not.toContain('<a href="javascript')
  })
  it('链接带 rel 安全属性', () => {
    const html = renderMarkdown('[x](/relative/path)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
  })
})

describe('notes 存储', () => {
  it('validateNotes 过滤无效并裁剪字段', () => {
    const list = validateNotes([
      null,
      { id: 'a', title: 't', content: 'c', createdAt: 1, updatedAt: 2 },
      { id: 'a', title: 'dup', content: '' },
      { id: 'b', title: '', content: '' },
      { id: 'c', content: 'no-title' },
    ])
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('draft')
  })
  it('songId 可选关联', () => {
    const list = validateNotes([{ id: 'a', title: 't', content: 'c', songId: 's1' }])
    expect(list[0].songId).toBe('s1')
  })
  it('mergeNotes 同 id 保留较新版本并统计新增', () => {
    const local = validateNotes([{ id: 'a', title: '旧', content: '', updatedAt: 100, createdAt: 1 }])
    const imported = validateNotes([
      { id: 'a', title: '新', content: '', updatedAt: 200, createdAt: 1 },
      { id: 'b', title: '新增', content: '', updatedAt: 5, createdAt: 5 },
    ])
    const { list, added } = mergeNotes(local, imported)
    expect(added).toBe(1)
    expect(list.find(n => n.id === 'a')!.title).toBe('新')
  })
})
