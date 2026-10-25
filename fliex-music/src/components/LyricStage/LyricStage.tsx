/* Fliex Music — 中央漂浮歌词
   当前行最亮；上下文 2–3 行可见；点击跳转；手动滚动暂停自动跟随并提供返回入口；
   无歌词/纯音乐展示歌曲信息与极简占位，绝不报错。 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { engine } from '../../audio/AudioEngine'
import { useApp } from '../../app/PlayerProvider'
import { activeLineIndex } from '../../lyrics/lrc'

export function LyricStage(): React.JSX.Element {
  const { snapshot, lyricsState, preferences } = useApp()
  const song = snapshot.song
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const autoFollow = preferences.lyricAutoScroll

  const lyrics = lyricsState && lyricsState.songId === song?.id ? lyricsState.lyrics : null
  const active = lyrics?.synced ? activeLineIndex(lyrics.lines, snapshot.currentTime) : -1

  // 切歌时重置手动滚动状态
  useEffect(() => {
    setUserScrolled(false)
  }, [song?.id])

  // 自动跟随：活动行居中（自动滚动关闭或用户手动滚动时暂停）
  useLayoutEffect(() => {
    if (!autoFollow || userScrolled || active < 0) return
    const container = scrollRef.current
    const el = container?.querySelector<HTMLElement>(`[data-line="${active}"]`)
    if (!container || !el) return
    const top = container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top, behavior: preferences.reduceMotion ? 'instant' : 'smooth' })
  }, [active, userScrolled, autoFollow, preferences.reduceMotion])

  const backToNow = () => {
    setUserScrolled(false)
    const container = scrollRef.current
    const el = container?.querySelector<HTMLElement>(`[data-line="${Math.max(0, active)}"]`)
    if (container && el) {
      const top = container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTo({ top, behavior: 'instant' })
    }
  }

  const markUserScroll = () => {
    if (!userScrolled) setUserScrolled(true)
  }

  return (
    <section className="lyrics" aria-label="歌词">
      {!song ? (
        <div className="lyrics-placeholder">
          <p className="lyrics-placeholder-title">SIGNAL FROM SOMEWHERE</p>
          <p>选择右侧播放列表中的一首歌，开始收听。</p>
        </div>
      ) : lyrics === null ? (
        <div className="lyrics-placeholder">
          <p className="lyrics-placeholder-title">{song.title}</p>
          <p className="lyrics-placeholder-artist">{song.artist}{song.album ? ` · ${song.album}` : ''}</p>
          <p className="lyrics-placeholder-note">
            {lyricsState?.loading ? '歌词加载中…' : song.lyrics === undefined && song.lyricsUrl === undefined ? '纯音乐 · 请欣赏' : '暂无歌词 · 请欣赏'}
          </p>
        </div>
      ) : (
        <>
          <div
            className="lyrics-scroll"
            ref={scrollRef}
            onWheel={markUserScroll}
            onTouchMove={markUserScroll}
          >
            <div className="lyrics-lines">
              {lyrics.lines.map((line, i) => (
                <p
                  key={i}
                  data-line={i}
                  className={
                    'lyric-line' +
                    (i === active ? ' is-active' : '') +
                    (Math.abs(i - active) === 1 ? ' is-near' : '') +
                    (lyrics.synced && line.text ? ' is-clickable' : '')
                  }
                  onClick={() => lyrics.synced && line.text && engine.seek(line.time + 0.05)}
                  role={lyrics.synced && line.text ? 'button' : undefined}
                  tabIndex={lyrics.synced && line.text ? 0 : undefined}
                  onKeyDown={e => {
                    if (lyrics.synced && line.text && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      engine.seek(line.time + 0.05)
                    }
                  }}
                  aria-label={lyrics.synced && line.text ? `跳转到 ${line.text}` : undefined}
                >
                  {line.text || '\u00A0'}
                </p>
              ))}
            </div>
          </div>
          {(userScrolled || !autoFollow) && active >= 0 && (
            <button className="lyrics-back" onClick={backToNow}>
              ↻ 返回正在播放
            </button>
          )}
        </>
      )}
    </section>
  )
}
