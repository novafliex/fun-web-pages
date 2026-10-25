/* Fliex Music — 全局状态 Provider
   职责：配置加载 → 引擎装配；收藏 / 历史 / 偏好 / 播放状态的本地持久化；
   歌词按需加载（带竞态保护）。UI 只读快照，不直接操作音频元素。 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { engine, type AudioSnapshot, type ResolvedSong } from '../audio/AudioEngine'
import { ConfigError, loadConfig, resolveAsset } from '../data/loadConfig'
import { parseLrc, type Lyrics } from '../lyrics/lrc'
import { createKV } from '../storage/storage'
import { loadFavorites, saveFavorites } from '../storage/favorites'
import { addHistory, clearHistory, ListenTracker, loadHistory, type HistoryEntry } from '../storage/history'
import { loadPreferences, savePreferences, validatePreferences } from '../storage/preferences'
import { loadPlayerState, savePlayerState } from '../storage/player-state'
import { clearBackgroundImage, loadBackgroundImage, saveBackgroundImage } from '../storage/bg-store'
import { createUserPlaylist, loadUserPlaylists, saveUserPlaylists } from '../storage/user-playlists'
import { loadNotes, mergeNotes, saveNotes } from '../storage/notes'
import { DEFAULT_PREFERENCES, type LibraryData, type Note, type Preferences, type UserPlaylist } from '../types'

const kv = createKV()

interface LyricsState {
  songId: string
  lyrics: Lyrics | null
  loading: boolean
}

interface AppContextValue {
  data: LibraryData | null
  configError: string | null
  storageAvailable: boolean
  snapshot: AudioSnapshot
  favorites: ReadonlySet<string>
  toggleFavorite: (id: string) => void
  history: HistoryEntry[]
  clearHistoryList: () => void
  preferences: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  applyPreferences: (patch: Partial<Preferences>) => void
  /** 临时预览一套偏好（不写入存储）；传 null 恢复已保存的值。用于 Before/After 对比 */
  previewPreferences: (raw: Preferences | null) => void
  resetPreferences: () => void
  importPreferences: (raw: unknown) => void
  bgImageUrl: string | null
  setCustomBackground: (file: File) => Promise<void>
  removeCustomBackground: () => Promise<void>
  userPlaylists: UserPlaylist[]
  createUserPlaylist: (name: string, description?: string) => UserPlaylist
  updatePlaylist: (id: string, patch: { name?: string; description?: string }) => void
  deletePlaylist: (id: string) => void
  addSongsToPlaylist: (id: string, songIds: string[]) => void
  removeSongFromPlaylist: (id: string, songId: string) => void
  moveSongInPlaylist: (id: string, songId: string, dir: -1 | 1) => void
  /** 本地随笔（draft）与公开随笔（published，配置只读） */
  notes: Note[]
  publicNotes: Note[]
  saveNote: (note: Note) => void
  deleteNote: (id: string) => void
  /** 合并导入的随笔，返回新增数量 */
  importNotes: (imported: Note[]) => number
  lyricsState: LyricsState | null
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp 必须在 PlayerProvider 内使用')
  return value
}

export function PlayerProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const [data, setData] = useState<LibraryData | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => loadFavorites(kv))
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory(kv))
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(kv))
  const [lyricsState, setLyricsState] = useState<LyricsState | null>(null)

  /* ── 配置加载与引擎装配 ─────────────────── */
  useEffect(() => {
    let cancelled = false
    loadConfig()
      .then(loaded => {
        if (cancelled) return
        const resolved: ResolvedSong[] = loaded.songs.map(song => ({
          ...song,
          audioUrl: resolveAsset(song.audio),
          coverUrl: song.cover ? resolveAsset(song.cover) : undefined,
          lyricsUrl: song.lyrics ? resolveAsset(song.lyrics) : undefined,
        }))
        const saved = loadPlayerState(kv)
        const index = saved.songId ? resolved.findIndex(song => song.id === saved.songId) : 0
        engine.setLibrary(resolved, {
          index: index >= 0 ? index : 0,
          time: saved.time,
          mode: saved.mode,
          volume: saved.volume,
          muted: saved.muted,
          queueSongIds: saved.queueSongIds,
        })
        setData(loaded)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setConfigError(error instanceof ConfigError ? error.message : '配置加载失败，请刷新重试')
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* ── 收藏 ───────────────────────────────── */
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavorites(kv, next)
      return next
    })
  }, [])

  /* ── 历史清空 ───────────────────────────── */
  const clearHistoryList = useCallback(() => {
    clearHistory(kv)
    setHistory([])
  }, [])

  /* ── 偏好 ───────────────────────────────── */
  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value }
      savePreferences(kv, next)
      return next
    })
  }, [])
  const applyPreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences(prev => {
      const next = validatePreferences({ ...prev, ...patch })
      savePreferences(kv, next)
      return next
    })
  }, [])
  const previewPreferences = useCallback((raw: Preferences | null) => {
    if (raw) {
      setPreferences({ ...raw })
    } else {
      setPreferences(loadPreferences(kv))
    }
  }, [])
  const resetPreferences = useCallback(() => {
    setPreferences(() => {
      savePreferences(kv, DEFAULT_PREFERENCES)
      return { ...DEFAULT_PREFERENCES }
    })
  }, [])
  const importPreferences = useCallback((raw: unknown) => {
    setPreferences(() => {
      const next = validatePreferences(raw)
      savePreferences(kv, next)
      return next
    })
  }, [])

  /* ── 自定义背景图（IndexedDB） ──────────── */
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null)
  const bgUrlRef = useRef<string | null>(null)
  const setBgUrl = useCallback((blob: Blob | null) => {
    if (bgUrlRef.current) {
      URL.revokeObjectURL(bgUrlRef.current)
      bgUrlRef.current = null
    }
    if (blob) {
      const url = URL.createObjectURL(blob)
      bgUrlRef.current = url
      setBgImageUrl(url)
    } else {
      setBgImageUrl(null)
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    loadBackgroundImage().then(blob => {
      if (!cancelled && blob) setBgUrl(blob)
    })
    return () => {
      cancelled = true
    }
  }, [setBgUrl])
  const setCustomBackground = useCallback(async (file: File) => {
    const ok = await saveBackgroundImage(file)
    if (!ok) throw new Error('背景图保存失败，本次会话内仍可预览')
    setBgUrl(file)
  }, [setBgUrl])
  const removeCustomBackground = useCallback(async () => {
    await clearBackgroundImage()
    setBgUrl(null)
  }, [setBgUrl])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.lyricSize = preferences.lyricSize
    root.dataset.contrast = preferences.highContrast ? 'high' : 'normal'
    root.dataset.motion = preferences.reduceMotion ? 'reduced' : 'full'
    root.dataset.lyricPreset = preferences.lyricPreset
    root.dataset.playerMode = preferences.playerMode
    root.dataset.playerPosition = preferences.playerPosition
    root.dataset.navVisible = String(preferences.navVisible)
    root.style.setProperty('--lyric-lh', String(preferences.lyricLineHeight))
    root.style.setProperty('--lyric-window', String(preferences.lyricWindow))
    root.style.setProperty('--lyric-align', preferences.lyricAlign)
    root.style.setProperty('--lyric-top', `${preferences.lyricTop}%`)
    root.style.setProperty('--lyric-width', `${preferences.lyricWidth}%`)
    root.style.setProperty('--lyric-active-b', String(preferences.lyricActiveBrightness))
    root.style.setProperty('--lyric-inactive-a', String(preferences.lyricInactiveAlpha))
    root.style.setProperty('--grain-opacity', String(preferences.grainOpacity / 100))
    root.style.setProperty('--console-w', `${preferences.consoleWidth}px`)
    root.style.setProperty('--player-opacity', String(preferences.playerOpacity))
    root.style.setProperty('--player-scale', String(preferences.playerScale))
  }, [preferences])

  /* ── 歌词加载（竞态保护 + 缓存） ────────── */
  const lyricsCache = useRef(new Map<string, Lyrics>())
  const lyricsGeneration = useRef(0)
  useEffect(() => {
    const song = snapshot.song
    if (!song) {
      setLyricsState(null)
      return
    }
    const cached = lyricsCache.current.get(song.id)
    if (cached) {
      setLyricsState({ songId: song.id, lyrics: cached, loading: false })
      return
    }
    if (!song.lyricsUrl) {
      setLyricsState({ songId: song.id, lyrics: null, loading: false })
      return
    }
    const generation = ++lyricsGeneration.current
    setLyricsState({ songId: song.id, lyrics: null, loading: true })
    fetch(song.lyricsUrl, { cache: 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error(String(response.status))
        return response.text()
      })
      .then(text => {
        if (generation !== lyricsGeneration.current) return // 旧请求迟到，丢弃
        const lyrics = parseLrc(text)
        lyricsCache.current.set(song.id, lyrics)
        setLyricsState({ songId: song.id, lyrics, loading: false })
      })
      .catch(() => {
        if (generation !== lyricsGeneration.current) return
        setLyricsState({ songId: song.id, lyrics: null, loading: false })
      })
  }, [snapshot.song])

  /* ── 有效听歌计时 + 播放状态持久化 ──────── */
  const trackerRef = useRef<ListenTracker | null>(null)
  if (!trackerRef.current) trackerRef.current = new ListenTracker()
  const trackerSongId = useRef<string | null>(null)
  const lastSaveAt = useRef(0)
  const lastSavedSongId = useRef<string | null>(null)

  const pushEntry = useCallback((entry: HistoryEntry) => {
    setHistory(addHistory(kv, entry))
  }, [])

  useEffect(() => {
    const tracker = trackerRef.current!
    const song = snapshot.song
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible'
    const counting = snapshot.status === 'playing' && visible

    if (song && song.id !== trackerSongId.current) {
      const entry = tracker.switchSong(song)
      trackerSongId.current = song.id
      if (entry) pushEntry(entry)
    } else {
      if (counting) {
        tracker.setCounting(true)
        tracker.heartbeat()
      } else {
        tracker.setCounting(false)
      }
    }

    const now = Date.now()
    if (song && (song.id !== lastSavedSongId.current || now - lastSaveAt.current > 3000 || snapshot.status === 'ready')) {
      lastSavedSongId.current = song.id
      lastSaveAt.current = now
      const state = engine.saveState
      savePlayerState(kv, state)
    }
  }, [snapshot, pushEntry])

  useEffect(() => {
    const onHide = () => {
      const tracker = trackerRef.current
      if (!tracker) return
      tracker.setCounting(false)
      savePlayerState(kv, engine.saveState)
      const entry = tracker.settle()
      if (entry) pushEntry(entry)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        trackerRef.current?.setCounting(false)
        savePlayerState(kv, engine.saveState)
      }
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pushEntry])

  /* ── 私人歌单（访客本机数据，与播放队列/收藏独立） ── */
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>(() => loadUserPlaylists(kv))
  const createUserPlaylistAction = useCallback((name: string, description?: string) => {
    const playlist = createUserPlaylist(name, description)
    setUserPlaylists(prev => {
      const next = [...prev, playlist]
      saveUserPlaylists(kv, next)
      return next
    })
    return playlist
  }, [])
  const updatePlaylist = useCallback((id: string, patch: { name?: string; description?: string }) => {
    setUserPlaylists(prev => {
      const next = prev.map(pl => (pl.id === id ? { ...pl, ...patch } : pl))
      saveUserPlaylists(kv, next)
      return next
    })
  }, [])
  const deletePlaylist = useCallback((id: string) => {
    setUserPlaylists(prev => {
      const next = prev.filter(pl => pl.id !== id)
      saveUserPlaylists(kv, next)
      return next
    })
  }, [])
  const addSongsToPlaylist = useCallback((id: string, songIds: string[]) => {
    setUserPlaylists(prev => {
      const next = prev.map(pl => {
        if (pl.id !== id) return pl
        // 去重追加，保持已有顺序
        const add = songIds.filter(songId => !pl.songIds.includes(songId))
        return { ...pl, songIds: [...pl.songIds, ...add] }
      })
      saveUserPlaylists(kv, next)
      return next
    })
  }, [])
  const removeSongFromPlaylist = useCallback((id: string, songId: string) => {
    setUserPlaylists(prev => {
      const next = prev.map(pl => (pl.id === id ? { ...pl, songIds: pl.songIds.filter(sid => sid !== songId) } : pl))
      saveUserPlaylists(kv, next)
      return next
    })
  }, [])
  const moveSongInPlaylist = useCallback((id: string, songId: string, dir: -1 | 1) => {
    setUserPlaylists(prev => {
      const next = prev.map(pl => {
        if (pl.id !== id) return pl
        const idx = pl.songIds.indexOf(songId)
        const target = idx + dir
        if (idx < 0 || target < 0 || target >= pl.songIds.length) return pl
        const songIds = [...pl.songIds]
        ;[songIds[idx], songIds[target]] = [songIds[target], songIds[idx]]
        return { ...pl, songIds }
      })
      saveUserPlaylists(kv, next)
      return next
    })
  }, [])

  /* ── 音乐随笔（本机 draft + 配置下发的只读 published） ── */
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(kv))
  const saveNote = useCallback((note: Note) => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === note.id)
      const next = idx >= 0 ? prev.map(n => (n.id === note.id ? note : n)) : [note, ...prev]
      saveNotes(kv, next)
      return next
    })
  }, [])
  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      saveNotes(kv, next)
      return next
    })
  }, [])
  const importNotes = useCallback((imported: Note[]) => {
    // 合并在 updater 外完成（保持 updater 纯函数，避免 StrictMode 下计数翻倍）
    const { list, added } = mergeNotes(loadNotes(kv), imported)
    saveNotes(kv, list)
    setNotes(list)
    return added
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      configError,
      storageAvailable: kv.available,
      snapshot,
      favorites,
      toggleFavorite,
      history,
      clearHistoryList,
      preferences,
      setPreference,
      applyPreferences,
      previewPreferences,
      resetPreferences,
      importPreferences,
      bgImageUrl,
      setCustomBackground,
      removeCustomBackground,
      userPlaylists,
      createUserPlaylist: createUserPlaylistAction,
      updatePlaylist,
      deletePlaylist,
      addSongsToPlaylist,
      removeSongFromPlaylist,
      moveSongInPlaylist,
      notes,
      publicNotes: data?.notes ?? [],
      saveNote,
      deleteNote,
      importNotes,
      lyricsState,
    }),
    [data, configError, favorites, toggleFavorite, history, clearHistoryList, preferences, setPreference, applyPreferences, previewPreferences, resetPreferences, importPreferences, bgImageUrl, setCustomBackground, removeCustomBackground, userPlaylists, createUserPlaylistAction, updatePlaylist, deletePlaylist, addSongsToPlaylist, removeSongFromPlaylist, moveSongInPlaylist, notes, saveNote, deleteNote, importNotes, lyricsState, snapshot],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
