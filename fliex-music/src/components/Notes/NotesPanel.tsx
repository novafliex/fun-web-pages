/* Fliex Music — 音乐随笔：私人音乐日记（宽幅右侧面板）
   - 本地随笔（draft）可新建 / 编辑 / 删除，自动保存草稿，刷新不丢
   - 公开随笔（published，来自 config/notes.json）只读展示
   - 可选关联曲库歌曲，点击歌名直接播放；写作时音乐不中断
   - Markdown 编辑 / 预览（安全渲染），支持搜索与 JSON 导入导出 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { engine } from '../../audio/AudioEngine'
import { useApp } from '../../app/PlayerProvider'
import { newNoteId } from '../../storage/notes'
import { validateNotes } from '../../storage/notes'
import { renderMarkdown } from './markdown'
import type { Note } from '../../types'

const fmtDate = (ts: number): string => {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()} / ${pad(d.getMonth() + 1)} / ${pad(d.getDate())}`
}

const excerpt = (content: string, len = 64): string =>
  content.replace(/[#>*`\-[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, len)

export function NotesPanel({ newNoteSongId, onNewNoteConsumed }: {
  newNoteSongId: string | null
  onNewNoteConsumed: () => void
}): React.JSX.Element {
  const { notes, publicNotes, saveNote, deleteNote, importNotes, snapshot } = useApp()
  const [editing, setEditing] = useState<Note | null>(null)
  const [preview, setPreview] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const library = engine.libraryList
  const byId = useMemo(() => new Map(library.map(song => [song.id, song])), [library])

  /* 自动保存：编辑内容变化 700ms 后写回（空白草稿不落盘） */
  useEffect(() => {
    if (!editing) return
    const timer = setTimeout(() => {
      if (editing.title.trim() || editing.content.trim()) {
        const stamped = { ...editing, updatedAt: Date.now() }
        saveNote(stamped)
        setSavedAt(stamped.updatedAt)
        setEditing(prev => (prev && prev.id === stamped.id ? stamped : prev))
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [editing, saveNote])

  /* 从 ··· 菜单「为这首歌写随笔」进入：直接建好关联并聚焦标题 */
  useEffect(() => {
    if (!newNoteSongId) return
    const song = byId.get(newNoteSongId)
    setEditing({
      id: newNoteId(),
      title: '',
      content: '',
      songId: newNoteSongId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft',
    })
    setPreview(false)
    setStatus(song ? `正在为「${song.title} — ${song.artist}」写随笔` : '')
    onNewNoteConsumed()
    queueMicrotask(() => titleRef.current?.focus())
  }, [newNoteSongId, byId, onNewNoteConsumed])

  const flash = (text: string) => {
    setStatus(text)
    setTimeout(() => setStatus(''), 2600)
  }

  const startNew = () => {
    setEditing({ id: newNoteId(), title: '', content: '', createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' })
    setPreview(false)
    queueMicrotask(() => titleRef.current?.focus())
  }

  const localSorted = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt), [notes])
  const key = keyword.trim().toLowerCase()
  const matched = key
    ? localSorted.filter(n => n.title.toLowerCase().includes(key) || n.content.toLowerCase().includes(key))
    : localSorted

  const linkedSong = (note: Note) => (note.songId ? byId.get(note.songId) : undefined)

  const doExport = () => {
    const blob = new Blob([JSON.stringify({ format: 'fliex-notes', version: 1, notes }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fliex-notes.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    flash(`已导出 ${notes.length} 篇随笔。`)
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('文件超过 5 MB')
      const raw = JSON.parse(await file.text())
      if (!raw || typeof raw !== 'object' || (raw as { format?: string }).format !== 'fliex-notes') {
        throw new Error('不是有效的 Fliex Music 随笔文件')
      }
      const imported = validateNotes((raw as { notes?: unknown }).notes, 'draft')
      const added = importNotes(imported)
      flash(`导入完成：新增 ${added} 篇，更新 ${imported.length - added} 篇。`)
    } catch (error) {
      flash(error instanceof Error ? error.message : '导入失败')
    }
  }

  /* ── 编辑器视图 ─────────────────────────── */
  if (editing) {
    const linked = editing.songId ? byId.get(editing.songId) : undefined
    return (
      <div className="notes-editor">
        <header className="mp-upl-head">
          <button className="mp-back" onClick={() => { setEditing(null); setConfirmDelete(false) }} aria-label="返回随笔列表">← 随笔</button>
          <div className="mp-upl-actions">
            <button className={`cz-mini${preview ? '' : ' is-on'}`} onClick={() => setPreview(false)} aria-pressed={!preview}>编辑</button>
            <button className={`cz-mini${preview ? ' is-on' : ''}`} onClick={() => setPreview(true)} aria-pressed={preview}>预览</button>
            <button
              className="cz-mini"
              onClick={() => setEditing({ ...editing, status: editing.status === 'done' ? 'draft' : 'done' })}
              aria-pressed={editing.status === 'done'}
              title={editing.status === 'done' ? '已完成，可随时改回草稿' : '标记为已完成'}
            >
              {editing.status === 'done' ? '已完成 ✓' : '标记完成'}
            </button>
            <button className="cz-mini cz-mini-reset" onClick={() => setConfirmDelete(true)}>删除</button>
          </div>
          <p className="mp-upl-count">{savedAt ? `已自动保存 · ${new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '自动保存已开启'}</p>
        </header>

        {confirmDelete && (
          <div className="note-confirm">
            <span>删除这篇随笔？</span>
            <button className="cz-mini cz-mini-reset" onClick={() => { deleteNote(editing.id); setEditing(null); setConfirmDelete(false); flash('随笔已删除。') }}>确认删除</button>
            <button className="cz-mini" onClick={() => setConfirmDelete(false)}>取消</button>
          </div>
        )}

        <div className="note-editor-body">
          <input
            ref={titleRef}
            className="note-title-input"
            value={editing.title}
            onChange={e => setEditing({ ...editing, title: e.target.value })}
            placeholder="给这篇随笔一个标题…"
            aria-label="随笔标题"
          />
          <div className="note-song-link">
            <label className="note-song-label" htmlFor="note-song-select">关联歌曲</label>
            <select
              id="note-song-select"
              className="note-song-select"
              value={editing.songId ?? ''}
              onChange={e => setEditing({ ...editing, songId: e.target.value || undefined })}
            >
              <option value="">不关联</option>
              {/* 关联的歌曲已从曲库移除时，保留 id 并提示可重新选择 */}
              {editing.songId && !byId.has(editing.songId) && (
                <option value={editing.songId}>（歌曲已不在曲库，可重新选择）</option>
              )}
              {library.map(song => (
                <option key={song.id} value={song.id}>{song.title} · {song.artist}</option>
              ))}
            </select>
            {linked && (
              <button className="note-song-play" onClick={() => engine.playFromLibrary(linked.id)} aria-label={`播放 ${linked.title}`}>
                ▶ {linked.title} · {linked.artist}
              </button>
            )}
          </div>

          {preview ? (
            <div className="note-preview markdown" aria-label="随笔预览">
              {editing.content.trim()
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(editing.content) }} />
                : <p className="note-preview-empty">还没有正文。</p>}
            </div>
          ) : (
            <textarea
              className="note-content-input"
              value={editing.content}
              onChange={e => setEditing({ ...editing, content: e.target.value })}
              placeholder={'用 Markdown 记录此刻……\n\n# 小标题\n> 一句引用\n- 一个列表项\n**重要的事**'}
              aria-label="随笔正文（Markdown）"
              spellCheck={false}
            />
          )}
          <p className="note-hint">支持 Markdown：标题、引用、列表、**粗体**、`代码`。内容会自动保存到本机。</p>
        </div>
      </div>
    )
  }

  /* ── 列表视图 ───────────────────────────── */
  return (
    <div className="notes-panel">
      <header className="notes-head">
        <p className="side-kicker">FLIEX MUSIC / MUSIC NOTES</p>
        <h2 className="side-title">音乐随笔.</h2>
        <p className="side-sub">Some songs deserve a few words.</p>
      </header>

      <button className="mp-new-playlist" onClick={startNew}>＋ 写点什么</button>

      {notes.length > 0 && (
        <div className="mp-search">
          <input type="search" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索标题与内容" aria-label="搜索随笔" />
        </div>
      )}

      <div className="notes-list">
        {matched.length === 0 ? (
          <p className="mp-empty">
            {notes.length === 0
              ? '这里是你自己的音乐日记。听到某首歌想说点什么，就写下来。'
              : key ? '没有匹配的随笔。' : ''}
          </p>
        ) : (
          matched.map(note => {
            const song = linkedSong(note)
            return (
              <button key={note.id} className="note-card" onClick={() => { setEditing({ ...note }); setPreview(false) }}>
                <span className="note-date">
                  {fmtDate(note.updatedAt)}
                  {note.status === 'done' && <i className="note-done-mark"> · 已完成</i>}
                </span>
                <span className="note-title">{note.title || '（无标题）'}</span>
                {note.content.trim() && <span className="note-excerpt">{excerpt(note.content)}</span>}
                {song && (
                  <span
                    className="note-song"
                    role="button"
                    tabIndex={0}
                    onClick={e => { e.stopPropagation(); engine.playFromLibrary(song.id) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); engine.playFromLibrary(song.id) } }}
                    aria-label={`播放 ${song.title}`}
                  >
                    ♪ {song.title} · {song.artist}
                    {snapshot.song?.id === song.id && snapshot.status === 'playing' ? '（正在播放）' : ''}
                  </span>
                )}
                {note.songId && !song && <span className="note-song-missing">关联的歌曲已不在曲库 · 可在编辑中重新选择</span>}
              </button>
            )
          })
        )}

        {publicNotes.length > 0 && (
          <>
            <p className="side-section">FROM THE AUTHOR · 只读</p>
            {publicNotes.map(note => {
              const song = note.songId ? byId.get(note.songId) : undefined
              return (
                <div key={note.id} className="note-card is-readonly">
                  <span className="note-date">{fmtDate(note.updatedAt)}</span>
                  <span className="note-title">{note.title}</span>
                  {note.content.trim() && <span className="note-excerpt">{excerpt(note.content)}</span>}
                  {song && <span className="note-song">♪ {song.title} · {song.artist}</span>}
                  <span className="note-readonly-tag">公开随笔 · 只读</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      <footer className="archive-foot">
        <button onClick={doExport}>导出随笔</button>
        <button onClick={() => importRef.current?.click()}>导入随笔</button>
        <p className="archive-note">随笔保存在当前浏览器，导出 JSON 可备份或迁移。</p>
      </footer>
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => { void doImport(e.target.files?.[0]); e.target.value = '' }} />
      {status && <p className="cz-status notes-status" role="status">{status}</p>}
    </div>
  )
}
