/* Fliex Music — 右侧音乐工作区：长播放列表 + 私人歌单系统
   视图：全部 / 配置歌单 / 私人歌单（索引 → 详情）/ 我喜欢的。
   播放队列与歌单分离：播放歌单只是把歌单快照设为临时队列，
   队列内的上一首/下一首/随机按队列执行，不修改歌单本身。 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { engine } from '../../audio/AudioEngine'
import type { ResolvedSong } from '../../audio/AudioEngine'
import { useApp } from '../../app/PlayerProvider'
import { ConfirmDialog, PlaylistEditDialog, SongPickerDialog } from '../Playlists/PlaylistDialogs'
import { NotesPanel } from '../Notes/NotesPanel'
import type { UserPlaylist } from '../../types'

type Tab = 'all' | 'favorites' | 'user' | 'notes' | string
type Dialog = { type: 'create' } | { type: 'edit'; id: string } | { type: 'delete'; id: string } | { type: 'picker'; id: string } | { type: 'addTo'; songId: string } | null

const fmt = (seconds?: number): string => {
  if (!Number.isFinite(seconds) || (seconds as number) <= 0) return '--:--'
  const m = Math.floor((seconds as number) / 60)
  const s = Math.floor((seconds as number) % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function MusicPanel(): React.JSX.Element {
  const { snapshot, data, favorites, toggleFavorite, userPlaylists, createUserPlaylist, updatePlaylist, deletePlaylist, addSongsToPlaylist, removeSongFromPlaylist, moveSongInPlaylist } = useApp()
  const [tab, setTab] = useState<Tab>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [userView, setUserView] = useState<{ mode: 'index' } | { mode: 'detail'; id: string }>({ mode: 'index' })
  const [menu, setMenu] = useState<{ songId: string; x: number; y: number } | null>(null)
  const [addToTarget, setAddToTarget] = useState<string | null>(null) // ··> 添加到歌单时暂存歌曲 id
  const [dialog, setDialog] = useState<Dialog>(null)
  const [noteDraftSongId, setNoteDraftSongId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const library = engine.libraryList
  const currentId = snapshot.song?.id ?? null
  const playing = snapshot.status === 'playing'

  /* 点击外部关闭行内菜单 */
  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const playlistTabs = useMemo(
    () => (data?.playlists ?? []).filter(p => p.songIds.length > 0),
    [data?.playlists],
  )
  const byId = useMemo(() => new Map(library.map(song => [song.id, song])), [library])
  const resolveList = (ids: string[]): ResolvedSong[] => ids.map(id => byId.get(id)).filter((s): s is ResolvedSong => Boolean(s))

  const key = keyword.trim().toLowerCase()
  const match = (song: ResolvedSong) => !key || [song.title, song.artist, song.album].some(f => f?.toLowerCase().includes(key))

  const allSongs = library.map((song, i) => ({ song, no: i + 1 })).filter(({ song }) => match(song))
  const favoriteSongs = library.map((song, i) => ({ song, no: i + 1 })).filter(({ song }) => favorites.has(song.id) && match(song))

  const selectedUser = userView.mode === 'detail' ? userPlaylists.find(p => p.id === userView.id) : undefined
  const detailMatched = selectedUser
    ? selectedUser.songIds.map(id => byId.get(id)).filter((s): s is ResolvedSong => Boolean(s)).filter(match)
    : []

  const playUserPlaylist = (playlist: UserPlaylist, shuffle = false) => {
    const list = resolveList(playlist.songIds)
    if (!list.length) return
    if (shuffle) engine.setMode('shuffle')
    engine.playList(list)
  }

  const rowButtons = (song: ResolvedSong, onPlay: () => void) => (
    <>
      <span className="mp-time">{fmt(song.duration)}</span>
      <button
        className="icon-btn mp-fav"
        onClick={() => toggleFavorite(song.id)}
        aria-pressed={favorites.has(song.id)}
        aria-label={favorites.has(song.id) ? `取消收藏 ${song.title}` : `收藏 ${song.title}`}
      >
        {favorites.has(song.id) ? '♥' : '♡'}
      </button>
      <button
        className="icon-btn mp-more"
        aria-label={`更多操作：${song.title}`}
        onClick={e => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setMenu(menu?.songId === song.id ? null : { songId: song.id, x: Math.min(r.left, window.innerWidth - 200), y: Math.min(r.bottom + 4, window.innerHeight - 230) })
        }}
      >
        ···
      </button>
      {menu?.songId === song.id && (
        <div className="mp-menu" ref={menuRef} style={{ left: menu.x, top: menu.y }} role="menu">
          <button role="menuitem" onClick={() => { onPlay(); setMenu(null) }}>播放</button>
          <button role="menuitem" onClick={() => { engine.playNextUp(song.id); setMenu(null) }}>下一首播放</button>
          <button role="menuitem" onClick={() => { setAddToTarget(song.id); setMenu(null) }}>添加到歌单</button>
          <button role="menuitem" onClick={() => { setNoteDraftSongId(song.id); setTab('notes'); setMenu(null) }}>为这首歌写随笔</button>
          <button role="menuitem" onClick={() => { toggleFavorite(song.id); setMenu(null) }}>{favorites.has(song.id) ? '取消收藏' : '收藏'}</button>
        </div>
      )}
    </>
  )

  const libRow = (song: ResolvedSong, no: number, onPlay: () => void) => {
    const isCurrent = song.id === currentId
    return (
      <div key={song.id} className={`mp-row${isCurrent ? ' is-current' : ''}`} role="listitem">
        <span className="mp-no" aria-hidden="true">
          {isCurrent ? <i className={`eq${playing ? '' : ' is-paused'}`}><i /><i /><i /></i> : String(no).padStart(2, '0')}
        </span>
        <button className="mp-main" onClick={onPlay} title={`${song.title} — ${song.artist}`}>
          <span className="mp-name">{song.title}</span>
          <span className="mp-artist">{song.artist}</span>
        </button>
        {rowButtons(song, onPlay)}
      </div>
    )
  }

  const tabButton = (id: Tab, label: string) => (
    <button
      key={id}
      className={`mp-tab${tab === id ? ' is-active' : ''}`}
      onClick={() => {
        setTab(id)
        if (id === 'user') setUserView({ mode: 'index' })
      }}
      aria-current={tab === id ? 'true' : undefined}
    >
      {label}
    </button>
  )

  // 当前 tab 下可见行数（用于空状态判断）
  const visibleCount =
    tab === 'all' ? allSongs.length
      : tab === 'favorites' ? favoriteSongs.length
        : tab === 'user' ? (userView.mode === 'detail' ? detailMatched.length : userPlaylists.length)
          : (() => {
            const pl = playlistTabs.find(p => p.id === tab)
            return pl ? pl.songIds.length : 0
          })()

  const emptyHint = !library.length
    ? '曲库为空。站点作者可在 public/config/songs.json 中添加歌曲。'
    : (tab === 'favorites' || tab === 'user' || playlistTabs.some(p => p.id === tab)) && !visibleCount
      ? tab === 'favorites'
        ? '还没有收藏。点击列表右侧的 ♡ 收藏喜欢的歌。'
        : tab === 'user'
          ? null // 私人歌单索引有自己的空状态
          : '歌单为空。'
      : keyword && !visibleCount
        ? '没有匹配的曲目。'
        : null

  return (
    <div className="music-panel">
      {tab !== 'notes' && (
        <header className="mp-head">
          <h2 className="mp-title">{tab === 'user' && userView.mode === 'detail' && selectedUser ? selectedUser.name : '播放列表'}</h2>
          <span className="mp-count">
            {snapshot.songs.length ? `${String(snapshot.index + 1).padStart(2, '0')} / ${String(snapshot.songs.length).padStart(2, '0')}` : '-- / --'}
          </span>
          <button
            className={`icon-btn mp-search-toggle${searchOpen ? ' is-on' : ''}`}
            onClick={() => { setSearchOpen(o => !o); if (searchOpen) setKeyword('') }}
            aria-pressed={searchOpen}
            aria-label="搜索曲目"
            title="搜索"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20 20" /></svg>
          </button>
        </header>
      )}

      {tab !== 'notes' && snapshot.queueActive && (
        <div className="mp-queue-banner">
          <span>正在播放歌单队列</span>
          <button onClick={() => engine.exitQueue()}>回到曲库</button>
        </div>
      )}

      {tab !== 'notes' && searchOpen && (
        <div className="mp-search">
          <input type="search" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索曲目 / 歌手 / 专辑" aria-label="搜索曲目" autoFocus />
        </div>
      )}

      <nav className="mp-tabs" aria-label="歌曲分类">
        {tabButton('all', '全部')}
        {playlistTabs.map(p => tabButton(p.id, p.name))}
        {tabButton('user', '私人歌单')}
        {tabButton('favorites', '我喜欢的')}
        {tabButton('notes', '音乐随笔')}
      </nav>

      {tab === 'notes' ? (
        <NotesPanel newNoteSongId={noteDraftSongId} onNewNoteConsumed={() => setNoteDraftSongId(null)} />
      ) : (
      <div className="mp-list" role="list">
        {tab === 'user' && userView.mode === 'index' && (
          <>
            <button className="mp-new-playlist" onClick={() => setDialog({ type: 'create' })}>＋ 创建歌单</button>
            {userPlaylists.length === 0 ? (
              <p className="mp-empty">还没有私人歌单。创建一个，把喜欢的歌放在一起。</p>
            ) : (
              userPlaylists.map(playlist => (
                <div key={playlist.id} className="mp-row mp-upl-row">
                  <span className="mp-no" aria-hidden="true">♪</span>
                  <button className="mp-main" onClick={() => setUserView({ mode: 'detail', id: playlist.id })} title={playlist.name}>
                    <span className="mp-name">{playlist.name}</span>
                    <span className="mp-artist">{playlist.songIds.length} Songs{playlist.description ? ` · ${playlist.description}` : ''}</span>
                  </button>
                  <button className="icon-btn mp-play-btn" onClick={() => playUserPlaylist(playlist)} aria-label={`播放歌单 ${playlist.name}`} disabled={!playlist.songIds.length}>▶</button>
                  <button className="icon-btn mp-fav" onClick={() => setUserView({ mode: 'detail', id: playlist.id })} aria-label={`打开歌单 ${playlist.name}`}>›</button>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'user' && userView.mode === 'detail' && selectedUser && (
          <>
            <div className="mp-upl-head">
              <button className="mp-back" onClick={() => setUserView({ mode: 'index' })} aria-label="返回歌单列表">← 歌单</button>
              <div className="mp-upl-actions">
                <button className="cz-mini" onClick={() => playUserPlaylist(selectedUser)} disabled={!selectedUser.songIds.length}>播放全部</button>
                <button className="cz-mini" onClick={() => playUserPlaylist(selectedUser, true)} disabled={!selectedUser.songIds.length}>随机播放</button>
                <button className="cz-mini" onClick={() => setDialog({ type: 'picker', id: selectedUser.id })}>添加歌曲</button>
                <button className="cz-mini" onClick={() => setDialog({ type: 'edit', id: selectedUser.id })}>编辑</button>
                <button className="cz-mini cz-mini-reset" onClick={() => setDialog({ type: 'delete', id: selectedUser.id })}>删除</button>
              </div>
              {selectedUser.description && <p className="mp-upl-desc">{selectedUser.description}</p>}
              <p className="mp-upl-count">{selectedUser.songIds.length} Songs</p>
            </div>
            {detailMatched.length === 0 ? (
              <p className="mp-empty">{selectedUser.songIds.length === 0 ? '还没有歌曲，添加一些喜欢的音乐吧。' : '没有匹配的曲目。'}</p>
            ) : (
              detailMatched.map((song, i) => {
                const isCurrent = song.id === currentId
                const globalIdx = selectedUser.songIds.indexOf(song.id)
                return (
                  <div key={song.id} className={`mp-row${isCurrent ? ' is-current' : ''}`} role="listitem">
                    <span className="mp-no" aria-hidden="true">
                      {isCurrent ? <i className={`eq${playing ? '' : ' is-paused'}`}><i /><i /><i /></i> : String(i + 1).padStart(2, '0')}
                    </span>
                    <button className="mp-main" onClick={() => engine.playFromList(resolveList(selectedUser.songIds), song.id)} title={`${song.title} — ${song.artist}`}>
                      <span className="mp-name">{song.title}</span>
                      <span className="mp-artist">{song.artist}</span>
                    </button>
                    <span className="mp-time">{fmt(song.duration)}</span>
                    <span className="mp-order">
                      <button className="icon-btn mp-order-btn" onClick={() => moveSongInPlaylist(selectedUser.id, song.id, -1)} disabled={globalIdx === 0} aria-label={`上移 ${song.title}`}>↑</button>
                      <button className="icon-btn mp-order-btn" onClick={() => moveSongInPlaylist(selectedUser.id, song.id, 1)} disabled={globalIdx === selectedUser.songIds.length - 1} aria-label={`下移 ${song.title}`}>↓</button>
                    </span>
                    <button className="icon-btn mp-fav" onClick={() => removeSongFromPlaylist(selectedUser.id, song.id)} aria-label={`从歌单移除 ${song.title}`} title="从歌单移除">✕</button>
                  </div>
                )
              })
            )}
          </>
        )}

        {tab !== 'user' && (emptyHint ? (
          <p className="mp-empty">{emptyHint}</p>
        ) : (
          <>
            {tab === 'all' && allSongs.map(({ song, no }) => libRow(song, no, () => engine.playFromLibrary(song.id)))}
            {tab === 'favorites' && favoriteSongs.map(({ song, no }) => libRow(song, no, () => engine.playFromLibrary(song.id)))}
            {playlistTabs.filter(p => p.id === tab).map(pl => {
              const list = resolveList(pl.songIds).filter(match)
              return list.map((song, i) => libRow(song, i + 1, () => engine.playFromList(resolveList(pl.songIds), song.id)))
            })}
          </>
        ))}
      </div>
      )}

      {/* ··· 菜单的「添加到歌单」二级菜单 */}
      {addToTarget && (
        <div className="mp-menu is-addto" role="menu" aria-label="选择目标歌单">
          <p className="mp-menu-title">添加到歌单</p>
          {userPlaylists.length === 0 && <p className="mp-menu-empty">还没有歌单</p>}
          {userPlaylists.map(playlist => {
            const already = playlist.songIds.includes(addToTarget)
            return (
              <button
                key={playlist.id}
                role="menuitem"
                disabled={already}
                onClick={() => {
                  addSongsToPlaylist(playlist.id, [addToTarget])
                  setAddToTarget(null)
                  flashAdd(already ? '已在歌单中' : `已添加到「${playlist.name}」`)
                }}
              >
                {playlist.name}{already ? ' · 已添加' : ''}
              </button>
            )
          })}
          <button role="menuitem" className="is-new" onClick={() => setDialog({ type: 'create' })}>＋ 新建歌单</button>
          <button role="menuitem" onClick={() => setAddToTarget(null)}>取消</button>
        </div>
      )}

      {dialog?.type === 'create' && (
        <PlaylistEditDialog
          title="创建歌单"
          onClose={() => setDialog(null)}
          onSave={(name, desc) => {
            const created = createUserPlaylist(name, desc)
            setDialog(null)
            setTab('user')
            setUserView({ mode: 'detail', id: created.id })
            if (addToTarget) {
              addSongsToPlaylist(created.id, [addToTarget])
              setAddToTarget(null)
            }
          }}
        />
      )}
      {dialog?.type === 'edit' && (
        <PlaylistEditDialog
          title="编辑歌单"
          initialName={userPlaylists.find(p => p.id === dialog.id)?.name}
          initialDesc={userPlaylists.find(p => p.id === dialog.id)?.description}
          onClose={() => setDialog(null)}
          onSave={(name, desc) => { updatePlaylist(dialog.id, { name, description: desc }); setDialog(null) }}
        />
      )}
      {dialog?.type === 'picker' && (
        <SongPickerDialog
          songs={library}
          existingIds={new Set(userPlaylists.find(p => p.id === dialog.id)?.songIds ?? [])}
          onClose={() => setDialog(null)}
          onConfirm={ids => { addSongsToPlaylist(dialog.id, ids); setDialog(null) }}
        />
      )}
      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="删除歌单"
          body={`「${userPlaylists.find(p => p.id === dialog.id)?.name ?? ''}」将被删除。曲库与收藏不受影响。`}
          confirmLabel="删除歌单"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            deletePlaylist(dialog.id)
            setUserView({ mode: 'index' })
          }}
        />
      )}
    </div>
  )

  function flashAdd(text: string) {
    // 轻量反馈：短暂插入一条提示
    const note = document.createElement('p')
    note.className = 'mp-flash'
    note.textContent = text
    document.querySelector('.music-panel')?.prepend(note)
    setTimeout(() => note.remove(), 2200)
  }
}
