/* Fliex Music — 私人歌单弹窗（创建/编辑 / 歌曲多选 / 确认）
   使用原生 <dialog>，Esc 可关闭；所有数据仅在确认后写入。 */

import { useMemo, useRef, useState } from 'react'
import type { ResolvedSong } from '../../audio/AudioEngine'

function useDialogRef() {
  const ref = useRef<HTMLDialogElement>(null)
  const open = () => ref.current?.showModal()
  return { ref, open }
}

export function PlaylistEditDialog({ initialName, initialDesc, title, onSave, onClose }: {
  initialName?: string
  initialDesc?: string
  title: string
  onSave: (name: string, description: string) => void
  onClose: () => void
}): React.JSX.Element {
  const { ref } = useDialogRef()
  const [name, setName] = useState(initialName ?? '')
  const [desc, setDesc] = useState(initialDesc ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const shown = useRef(false)
  if (!shown.current) {
    shown.current = true
    queueMicrotask(() => {
      ref.current?.showModal()
      inputRef.current?.focus()
    })
  }
  const valid = name.trim().length > 0
  return (
    <dialog className="fm-dialog" ref={ref} onClose={onClose} aria-label={title}>
      <h3>{title}</h3>
      <label className="fm-field">
        <span>歌单名称 *</span>
        <input ref={inputRef} value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="例如：深夜循环" onKeyDown={e => { if (e.key === 'Enter' && valid) onSave(name.trim(), desc.trim()) }} />
      </label>
      <label className="fm-field">
        <span>描述（可选）</span>
        <input value={desc} maxLength={200} onChange={e => setDesc(e.target.value)} placeholder="一句话介绍这个歌单" />
      </label>
      <div className="fm-actions">
        <button onClick={onClose}>取消</button>
        <button className="is-primary" disabled={!valid} onClick={() => onSave(name.trim(), desc.trim())}>保存</button>
      </div>
    </dialog>
  )
}

export function SongPickerDialog({ songs, existingIds, onConfirm, onClose }: {
  songs: ResolvedSong[]
  existingIds: ReadonlySet<string>
  onConfirm: (ids: string[]) => void
  onClose: () => void
}): React.JSX.Element {
  const { ref } = useDialogRef()
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const shown = useRef(false)
  if (!shown.current) {
    shown.current = true
    queueMicrotask(() => ref.current?.showModal())
  }
  const key = keyword.trim().toLowerCase()
  const visible = useMemo(
    () => songs.filter(song => !key || [song.title, song.artist, song.album].some(f => f?.toLowerCase().includes(key))),
    [songs, key],
  )
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  return (
    <dialog className="fm-dialog fm-dialog-wide" ref={ref} onClose={onClose} aria-label="添加歌曲">
      <h3>添加歌曲</h3>
      <input
        className="fm-search"
        type="search"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        placeholder="搜索曲目 / 歌手"
        aria-label="搜索歌曲"
      />
      <div className="fm-picker-list" role="listbox" aria-multiselectable="true" aria-label="可选择的歌曲">
        {visible.map(song => {
          const inList = existingIds.has(song.id)
          const picked = selected.has(song.id)
          return (
            <button
              key={song.id}
              className={`fm-pick${picked ? ' is-picked' : ''}${inList ? ' is-in-list' : ''}`}
              onClick={() => !inList && toggle(song.id)}
              disabled={inList}
              role="option"
              aria-selected={picked}
            >
              <span className="fm-pick-check" aria-hidden="true">{picked ? '✓' : inList ? '已添加' : ''}</span>
              <span className="fm-pick-main">
                <span className="fm-pick-name">{song.title}</span>
                <span className="fm-pick-artist">{song.artist}</span>
              </span>
            </button>
          )
        })}
        {!visible.length && <p className="fm-empty">没有匹配的歌曲。</p>}
      </div>
      <div className="fm-actions">
        <span className="fm-count">已选 {selected.size} 首</span>
        <button onClick={onClose}>取消</button>
        <button className="is-primary" disabled={!selected.size} onClick={() => onConfirm([...selected])}>
          确认添加{selected.size ? `（${selected.size}）` : ''}
        </button>
      </div>
    </dialog>
  )
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose }: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}): React.JSX.Element {
  const { ref } = useDialogRef()
  const shown = useRef(false)
  if (!shown.current) {
    shown.current = true
    queueMicrotask(() => ref.current?.showModal())
  }
  return (
    <dialog className="fm-dialog" ref={ref} onClose={onClose} aria-label={title}>
      <h3>{title}</h3>
      <p className="fm-body">{body}</p>
      <div className="fm-actions">
        <button onClick={onClose}>取消</button>
        <button className="is-danger" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
      </div>
    </dialog>
  )
}
