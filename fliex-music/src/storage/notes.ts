/* Fliex Music — 音乐随笔存储（访客本机数据）
   - 本地随笔存 localStorage（键 notes），公开随笔由 config/notes.json 只读下发
   - 导入合并策略：同 id 保留 updatedAt 较新的一方
   - 上限 500 篇；字段经校验裁剪，损坏数据安全回退 */

import type { Note } from '../types'
import type { KV } from './storage'

const KEY = 'notes'
export const NOTES_LIMIT = 500
const TITLE_MAX = 120
const CONTENT_MAX = 20000

export function validateNotes(input: unknown, status: Note['status'] = 'draft'): Note[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const list: Note[] = []
  for (const raw of input.slice(0, NOTES_LIMIT)) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    if (typeof r.id !== 'string' || !r.id || seen.has(r.id)) continue
    if (typeof r.title !== 'string' || typeof r.content !== 'string') continue
    if (!r.title.trim() && !r.content.trim()) continue
    seen.add(r.id)
    list.push({
      id: r.id.slice(0, 80),
      title: r.title.slice(0, TITLE_MAX),
      content: r.content.slice(0, CONTENT_MAX),
      songId: typeof r.songId === 'string' && r.songId ? r.songId.slice(0, 80) : undefined,
      createdAt: typeof r.createdAt === 'number' && r.createdAt >= 0 ? r.createdAt : Date.now(),
      updatedAt: typeof r.updatedAt === 'number' && r.updatedAt >= 0 ? r.updatedAt : Date.now(),
      status: status,
    })
  }
  return list
}

export function loadNotes(kv: KV): Note[] {
  return validateNotes(kv.get<unknown>(KEY, []), 'draft')
}

export function saveNotes(kv: KV, notes: Note[]): void {
  kv.set(KEY, notes.filter(n => n.status === 'draft'))
}

export function newNoteId(): string {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 合并导入的随笔：同 id 保留 updatedAt 较新者；返回合并结果与新增数量 */
export function mergeNotes(local: Note[], imported: Note[]): { list: Note[]; added: number } {
  const byId = new Map(local.map(n => [n.id, n]))
  let added = 0
  for (const note of imported) {
    const existing = byId.get(note.id)
    if (!existing) {
      byId.set(note.id, note)
      added++
      continue
    }
    if (note.updatedAt > existing.updatedAt) byId.set(note.id, note)
  }
  const list = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, NOTES_LIMIT)
  return { list, added }
}
