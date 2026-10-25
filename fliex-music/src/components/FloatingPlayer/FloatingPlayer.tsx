/* Fliex Music — 悬浮播放控制器
   进度可拖动/点击；模式（列表循环/单曲循环/随机）有可辨识状态；
   音源错误提供重试/跳过；任何操作不销毁音频元素。 */

import { useRef, useState } from 'react'
import { engine } from '../../audio/AudioEngine'
import { useApp } from '../../app/PlayerProvider'

const fmt = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function FloatingPlayer({ onOpenPanel }: { onOpenPanel: () => void }): React.JSX.Element {
  const { snapshot, favorites, toggleFavorite } = useApp()
  const song = snapshot.song
  const progressRef = useRef<HTMLDivElement>(null)
  const [scrub, setScrub] = useState<number | null>(null)

  const duration = snapshot.duration || song?.duration || 0
  const ratio = scrub !== null ? scrub : duration > 0 ? Math.min(1, snapshot.currentTime / duration) : 0
  const shownTime = scrub !== null ? scrub * duration : snapshot.currentTime

  const ratioFromEvent = (clientX: number): number => {
    const el = progressRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrub(ratioFromEvent(e.clientX))
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrub === null || !duration) return
    setScrub(ratioFromEvent(e.clientX))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrub === null || !duration) return
    const final = ratioFromEvent(e.clientX)
    engine.seek(final * duration)
    setScrub(null)
  }

  const isFav = song ? favorites.has(song.id) : false
  const playing = snapshot.status === 'playing'
  const indexLabel = snapshot.songs.length
    ? `${String(snapshot.index + 1).padStart(2, '0')} / ${String(snapshot.songs.length).padStart(2, '0')}`
    : '-- / --'

  return (
    <section className="player" aria-label="播放控制">
      <header className="player-head">
        <span className="player-kicker">NOW PLAYING</span>
        <span className="player-index">{indexLabel}</span>
      </header>

      <div className="player-track">
        <div className="player-meta">
          <strong className="player-title" title={song?.title}>{song?.title ?? '未在播放'}</strong>
          <span className="player-artist">{song?.artist ?? '—'}</span>
        </div>
        <div className="player-track-actions">
          <button
            className="icon-btn"
            onClick={() => song && toggleFavorite(song.id)}
            disabled={!song}
            aria-pressed={isFav}
            aria-label={isFav ? '取消收藏' : '收藏这首歌'}
            title={isFav ? '取消收藏' : '收藏'}
          >
            {isFav ? '♥' : '♡'}
          </button>
          <button className="icon-btn" onClick={onOpenPanel} aria-label="打开播放列表" title="播放列表">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`player-progress${scrub !== null ? ' is-scrubbing' : ''}`}
        ref={progressRef}
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shownTime)}
        tabIndex={0}
        onKeyDown={e => {
          if (!duration) return
          if (e.key === 'ArrowRight') { e.preventDefault(); engine.seek(snapshot.currentTime + 5) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); engine.seek(Math.max(0, snapshot.currentTime - 5)) }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setScrub(null)}
      >
        <div className="player-progress-rail">
          <div className="player-progress-fill" style={{ width: `${ratio * 100}%` }} />
          <div className="player-progress-thumb" style={{ left: `${ratio * 100}%` }} />
        </div>
      </div>
      <div className="player-times">
        <span>{fmt(shownTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      <div className="player-controls">
        <button
          className={`ctl${snapshot.mode === 'shuffle' ? ' is-on' : ''}`}
          onClick={() => engine.setMode(snapshot.mode === 'shuffle' ? 'list' : 'shuffle')}
          aria-pressed={snapshot.mode === 'shuffle'}
          aria-label={snapshot.mode === 'shuffle' ? '随机播放（开）' : '随机播放'}
          title={snapshot.mode === 'shuffle' ? '随机播放（开）' : '随机播放'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3c4 0 6 10 10 10h3M4 17h3c1.6 0 3-1.7 4.3-4M13 9c1.3-1.3 2.5-2 4-2h3M17 4l3 3-3 3M17 14l3 3-3 3" /></svg>
        </button>
        <button className="ctl" onClick={() => engine.previous()} aria-label="上一首" title="上一首">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M19 5v14L9 12z" /></svg>
        </button>
        <button className="ctl ctl-play" onClick={() => engine.toggle()} aria-label={playing ? '暂停' : '播放'} title={playing ? '暂停' : '播放'}>
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5h3.2v14H7.5zM13.3 5h3.2v14h-3.2z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14l11-7z" /></svg>
          )}
        </button>
        <button className="ctl" onClick={() => engine.next()} aria-label="下一首" title="下一首">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5v14M5 5v14l10-7z" /></svg>
        </button>
        <button
          className={`ctl${snapshot.mode === 'single' ? ' is-on' : ''}`}
          onClick={() => engine.setMode(snapshot.mode === 'single' ? 'list' : 'single')}
          aria-pressed={snapshot.mode === 'single'}
          aria-label={snapshot.mode === 'single' ? '单曲循环（开）' : '列表循环'}
          title={snapshot.mode === 'single' ? '单曲循环' : '列表循环'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 0 0-13-3L4 8m0-4v4h4M4 16a8 8 0 0 0 13 3l3-3m0 4v-4h-4" /></svg>
          {snapshot.mode === 'single' && <i className="ctl-badge">1</i>}
        </button>
      </div>

      <div className="player-volume">
        <button
          className="icon-btn"
          onClick={() => engine.toggleMute()}
          aria-label={snapshot.muted ? '取消静音' : '静音'}
          title={snapshot.muted ? '取消静音' : '静音'}
        >
          {snapshot.muted || snapshot.volume === 0 ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9l5 6M21 9l-5 6" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={snapshot.muted ? 0 : snapshot.volume}
          onChange={e => engine.setVolume(Number(e.target.value))}
          aria-label="音量"
        />
      </div>

      {snapshot.status === 'error' && (
        <div className="player-error" role="alert">
          <span>{snapshot.error}</span>
          <div>
            <button onClick={() => engine.retry()}>重试</button>
            <button onClick={() => engine.next()}>下一首</button>
          </div>
        </div>
      )}
      {snapshot.status === 'loading' && <p className="player-loading" aria-live="polite">音源加载中…</p>}
    </section>
  )
}
