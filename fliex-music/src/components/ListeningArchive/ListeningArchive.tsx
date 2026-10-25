/* Fliex Music — LISTENING ARCHIVE 听歌档案
   默认是歌单底部的紧凑单行入口；点击后在右侧同一区域切换为历史列表。
   数据只来自本机有效收听记录，空状态显示真实文案，不预埋示例。 */

import { useState } from 'react'
import { useApp } from '../../app/PlayerProvider'
import type { HistoryEntry } from '../../types'

const fmtClock = (at: number): string => {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const ago = (at: number): string => {
  const diff = Date.now() - at
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return fmtClock(at)
}

export function ArchiveEntry({ onOpen }: { onOpen: () => void }): React.JSX.Element {
  return (
    <button className="archive-entry" onClick={onOpen} aria-label="展开听歌档案">
      <span className="archive-entry-head">
        <i className="archive-icon" aria-hidden="true">◷</i>
        <span className="archive-entry-title">LISTENING ARCHIVE</span>
        <span aria-hidden="true">↗</span>
      </span>
      <span className="archive-entry-sub">记录每一首曾停留过的歌。</span>
    </button>
  )
}

export function ArchiveList({ onBack }: { onBack: () => void }): React.JSX.Element {
  const { history, clearHistoryList } = useApp()
  const [confirming, setConfirming] = useState(false)

  const totalBySong = new Map<string, number>()
  for (const entry of history) totalBySong.set(entry.songId, (totalBySong.get(entry.songId) ?? 0) + 1)
  const distinct = totalBySong.size

  return (
    <div className="archive-list">
      <header className="archive-head">
        <button className="archive-back" onClick={onBack} aria-label="返回播放列表">← 播放列表</button>
        <h2 className="archive-title">LISTENING ARCHIVE</h2>
        <p className="archive-summary">
          {history.length ? `有效收听 ${history.length} 次 · ${distinct} 首` : '记录每一首曾停留过的歌。'}
        </p>
      </header>

      <div className="archive-rows">
        {history.length === 0 ? (
          <p className="archive-empty">这里还没有听歌记录。</p>
        ) : (
          history.map((entry: HistoryEntry, i) => (
            <div className="archive-row" key={`${entry.songId}-${entry.at}-${i}`}>
              {entry.cover ? <img src={entry.cover} alt="" loading="lazy" /> : <span className="archive-cover-fallback" aria-hidden="true">♪</span>}
              <div className="archive-row-main">
                <span className="archive-row-title">{entry.title}</span>
                <span className="archive-row-artist">
                  {entry.artist}
                  {totalBySong.get(entry.songId)! > 1 && <i className="archive-count">×{totalBySong.get(entry.songId)}</i>}
                </span>
              </div>
              <time className="archive-row-time" dateTime={new Date(entry.at).toISOString()} title={fmtClock(entry.at)}>
                {ago(entry.at)}
              </time>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <footer className="archive-foot">
          {confirming ? (
            <>
              <span>删除全部本机听歌记录？</span>
              <button className="archive-danger" onClick={() => { clearHistoryList(); setConfirming(false) }}>确认清空</button>
              <button onClick={() => setConfirming(false)}>取消</button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)}>清空记录</button>
          )}
          <p className="archive-note">数据仅保存在当前浏览器。</p>
        </footer>
      )}
    </div>
  )
}
