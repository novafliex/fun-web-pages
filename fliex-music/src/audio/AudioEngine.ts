/* Fliex Music — AudioEngine
   - 全局唯一 HTMLAudioElement，模块级单例，UI 切换/抽屉开合绝不销毁
   - 事实来源是音频元素的真实事件（timeupdate / loadedmetadata / ended / error）
   - 快照模式：状态变化时重建 snapshot 并通知订阅者（React 用 useSyncExternalStore）
   - Web Audio AnalyserNode 仅用于视觉，懒创建；创建失败或跨域受限时静默降级为 0 */

import type { PlaybackMode, Song } from '../types'

export interface ResolvedSong extends Song {
  audioUrl: string
  coverUrl?: string
  lyricsUrl?: string
}

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error'

export interface AudioSnapshot {
  status: EngineStatus
  songs: ResolvedSong[]
  /** 当前生效的是临时队列（歌单）而非完整曲库 */
  queueActive: boolean
  index: number
  song: ResolvedSong | null
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  mode: PlaybackMode
  error: string | null
}

type Listener = () => void

const MODES: PlaybackMode[] = ['list', 'single', 'shuffle']

class AudioEngine {
  private audio: HTMLAudioElement | null = null
  /* library = 站点配置的完整曲库；songs = 当前生效的播放队列（默认等于曲库）。
     播放私人歌单时 songs 被替换为歌单歌曲快照，歌单本身不受播放影响。 */
  private library: ResolvedSong[] = []
  private songs: ResolvedSong[] = []
  private queueActive = false
  private index = -1
  private loadedSongId: string | null = null
  private pendingSeek: number | null = null
  private wantsPlay = false
  private mode: PlaybackMode = 'list'
  private error: string | null = null
  private status: EngineStatus = 'idle'
  private listeners = new Set<Listener>()
  private snapshot: AudioSnapshot = this.build()

  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private analyserFailed = false
  private level = 0
  private levelBins = new Uint8Array(0)

  /* ── 订阅 ─────────────────────────────── */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  getSnapshot = (): AudioSnapshot => this.snapshot

  private emit(): void {
    this.snapshot = this.build()
    this.listeners.forEach(fn => fn())
  }

  private build(): AudioSnapshot {
    const audio = this.audio
    const song = this.songs[this.index] ?? null
    const duration = audio && Number.isFinite(audio.duration) ? audio.duration : (song?.duration ?? 0)
    return {
      status: this.status,
      songs: this.songs,
      queueActive: this.queueActive,
      index: this.index,
      song,
      currentTime: audio && this.index >= 0 ? audio.currentTime : 0,
      duration,
      volume: audio ? audio.volume : 0.7,
      muted: audio ? audio.muted : false,
      mode: this.mode,
      error: this.error,
    }
  }

  /* ── 初始化 ───────────────────────────── */
  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = 0.7
    audio.addEventListener('loadedmetadata', () => {
      if (this.pendingSeek !== null && Number.isFinite(audio.duration)) {
        try {
          audio.currentTime = Math.min(this.pendingSeek, Math.max(0, audio.duration - 0.5))
        } catch {
          /* 个别浏览器在 loadedmetadata 后仍需 canplay 才能定位，失败时忽略 */
        }
      }
      this.pendingSeek = null
      this.error = null
      if (audio.paused && this.status === 'loading') this.status = 'ready'
      this.emit()
    })
    audio.addEventListener('timeupdate', () => this.emit())
    audio.addEventListener('durationchange', () => this.emit())
    audio.addEventListener('play', () => {
      this.error = null
      this.status = 'playing'
      this.ensureAnalyser()
      this.emit()
    })
    audio.addEventListener('playing', () => {
      this.status = 'playing'
      this.emit()
    })
    audio.addEventListener('pause', () => {
      if (this.status !== 'error') this.status = this.index >= 0 ? 'ready' : 'idle'
      this.emit()
    })
    audio.addEventListener('ended', () => {
      this.wantsPlay = false
      this.status = 'ready'
      this.emit()
      this.advanceAfterEnd()
    })
    audio.addEventListener('error', () => {
      if (!this.audio || !this.audio.currentSrc) return
      this.status = 'error'
      this.error = '音源加载失败，可重试或跳到下一首'
      this.wantsPlay = false
      this.emit()
    })
    this.audio = audio
    return audio
  }

  setLibrary(songs: ResolvedSong[], restore?: { index: number; time: number; mode?: PlaybackMode; volume?: number; muted?: boolean; queueSongIds?: string[] }): void {
    const audio = this.ensureAudio()
    this.library = songs
    // 恢复上次会话的临时队列（歌单）；找不到的 id 丢弃
    if (restore?.queueSongIds?.length) {
      const queued = restore.queueSongIds
        .map(id => songs.find(song => song.id === id))
        .filter((song): song is ResolvedSong => Boolean(song))
      if (queued.length) {
        this.songs = queued
        this.queueActive = true
      } else {
        this.songs = songs
        this.queueActive = false
      }
    } else {
      this.songs = songs
      this.queueActive = false
    }
    if (restore?.mode && MODES.includes(restore.mode)) this.mode = restore.mode
    if (typeof restore?.volume === 'number') audio.volume = Math.min(1, Math.max(0, restore.volume))
    audio.muted = Boolean(restore?.muted)
    if (!this.songs.length) {
      audio.pause()
      audio.removeAttribute('src')
      this.index = -1
      this.status = 'idle'
      this.error = null
      this.emit()
      return
    }
    const index = restore && Number.isInteger(restore.index) && restore.index >= 0 && restore.index < this.songs.length ? restore.index : 0
    this.loadIndex(index, { autoplay: false, seek: restore?.time ?? 0 })
  }

  /* ── 队列控制（私人歌单 / 下一首播放） ── */

  /** 从完整曲库播放某首歌：退出临时队列 */
  playFromLibrary(id: string): void {
    const index = this.library.findIndex(song => song.id === id)
    if (index < 0) return
    this.songs = this.library
    this.queueActive = false
    this.loadIndex(index, { autoplay: true })
  }

  /** 以歌单为临时队列播放某首歌（不改写歌单本身） */
  playFromList(list: ResolvedSong[], id: string): void {
    const index = list.findIndex(song => song.id === id)
    if (index < 0) return
    this.songs = [...list]
    this.queueActive = true
    this.loadIndex(index, { autoplay: true })
  }

  /** 播放整个歌单（从第一首开始） */
  playList(list: ResolvedSong[]): void {
    if (!list.length) return
    this.songs = [...list]
    this.queueActive = true
    this.loadIndex(0, { autoplay: true })
  }

  /** 退出临时队列，回到完整曲库（保持当前歌曲，若它不在库中则回到库首） */
  exitQueue(): void {
    if (!this.queueActive) return
    const currentId = this.songs[this.index]?.id
    this.songs = this.library
    this.queueActive = false
    const index = this.library.findIndex(song => song.id === currentId)
    this.loadIndex(index >= 0 ? index : 0, { autoplay: this.wantsPlay })
  }

  /** 「下一首播放」：把歌曲插入当前队列的下一位置 */
  playNextUp(id: string): void {
    const song = this.library.find(item => item.id === id)
    if (!song) return
    let current = this.index
    const existing = this.songs.findIndex(item => item.id === id)
    if (existing >= 0) {
      if (existing === current + 1) return
      this.songs.splice(existing, 1)
      if (existing < current) current--
    }
    this.songs.splice(current + 1, 0, song)
    this.index = current
    this.queueActive = true
    this.emit()
  }

  /** 当前队列是否为临时队列 */
  get isQueueActive(): boolean {
    return this.queueActive
  }

  /** 完整曲库（不受队列影响） */
  get libraryList(): ResolvedSong[] {
    return this.library
  }

  private loadIndex(index: number, { autoplay, seek = 0 }: { autoplay: boolean; seek?: number }): void {
    const audio = this.ensureAudio()
    const song = this.songs[index]
    if (!song) return
    const sameSong = this.index === index && this.loadedSongId === song.id
    this.index = index
    this.error = null
    this.pendingSeek = seek > 0.5 ? seek : null
    if (!sameSong) {
      audio.preload = autoplay ? 'auto' : 'metadata'
      audio.src = song.audioUrl
      this.loadedSongId = song.id
    }
    if (seek > 0.5 && audio.readyState >= 1) {
      try {
        audio.currentTime = Number.isFinite(audio.duration) ? Math.min(seek, audio.duration - 0.5) : seek
        this.pendingSeek = null
      } catch {
        /* 留给 loadedmetadata */
      }
    }
    if (seek <= 0.5 && sameSong) {
      // 重新选择当前曲目：从头播放
      try {
        audio.currentTime = 0
      } catch {
        /* 忽略 */
      }
    }
    this.status = 'loading'
    this.wantsPlay = autoplay
    this.emit()
    if (autoplay) void this.play()
    else audio.load()
  }

  /* ── 播放控制 ─────────────────────────── */
  async play(): Promise<void> {
    const audio = this.ensureAudio()
    const song = this.songs[this.index]
    if (!song) return
    this.wantsPlay = true
    this.error = null
    try {
      await audio.play()
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'AbortError') return // 快速切歌导致的竞争中止，忽略
      if (name === 'NotAllowedError') {
        this.status = 'ready'
        this.error = '浏览器暂不允许自动播放，请再点一次播放'
        this.wantsPlay = false
      } else {
        this.status = 'error'
        this.error = '暂时无法播放，请重试'
        this.wantsPlay = false
      }
      this.emit()
    }
  }

  toggle(): void {
    const audio = this.ensureAudio()
    if (!this.songs.length) return
    if (this.index < 0) {
      this.loadIndex(0, { autoplay: true })
      return
    }
    if (audio.paused) void this.play()
    else {
      this.wantsPlay = false
      audio.pause()
    }
  }

  select(index: number): void {
    const n = this.songs.length
    if (!n) return
    this.loadIndex(((index % n) + n) % n, { autoplay: true })
  }

  next(): void {
    const n = this.songs.length
    if (!n) return
    if (this.mode === 'shuffle' && n > 1) {
      let candidate = this.index
      while (candidate === this.index) candidate = Math.floor(Math.random() * n)
      this.select(candidate)
    } else {
      this.select(this.index + 1)
    }
  }

  previous(): void {
    const audio = this.audio
    // 播放超过 3 秒时，上一首语义是回到本曲开头
    if (audio && this.index >= 0 && audio.currentTime > 3) {
      this.loadIndex(this.index, { autoplay: !audio.paused || this.wantsPlay, seek: 0 })
      return
    }
    this.select(this.index - 1)
  }

  private advanceAfterEnd(): void {
    if (this.mode === 'single') {
      this.loadIndex(this.index, { autoplay: true, seek: 0 })
      return
    }
    if (this.songs.length <= 1) return
    this.next()
  }

  seek(time: number): void {
    const audio = this.ensureAudio()
    if (!Number.isFinite(time)) return
    const duration = Number.isFinite(audio.duration) ? audio.duration : this.songs[this.index]?.duration ?? 0
    const target = Math.max(0, duration ? Math.min(time, duration - 0.2) : time)
    if (audio.readyState >= 1) {
      try {
        audio.currentTime = target
      } catch {
        this.pendingSeek = target
      }
    } else {
      this.pendingSeek = target
    }
    this.emit()
  }

  setVolume(value: number): void {
    const audio = this.ensureAudio()
    audio.volume = Math.min(1, Math.max(0, value))
    if (audio.volume > 0) audio.muted = false
    this.emit()
  }

  toggleMute(): void {
    const audio = this.ensureAudio()
    audio.muted = !audio.muted
    this.emit()
  }

  setMode(mode: PlaybackMode): void {
    if (!MODES.includes(mode)) return
    this.mode = mode
    this.emit()
  }

  /** 音源报错后的重试：重新载入当前曲目 */
  retry(): void {
    if (this.index < 0) return
    this.loadIndex(this.index, { autoplay: true, seek: this.snapshot.currentTime })
  }

  /** 供持久化使用：当前应保存的进度（临时队列一并保存以便刷新恢复） */
  get saveState(): { songId: string | null; time: number; mode: PlaybackMode; volume: number; muted: boolean; queueSongIds?: string[] } {
    const song = this.songs[this.index] ?? null
    return {
      songId: song?.id ?? null,
      time: this.audio && this.index >= 0 ? this.audio.currentTime : 0,
      mode: this.mode,
      volume: this.audio ? this.audio.volume : 0.7,
      muted: this.audio ? this.audio.muted : false,
      queueSongIds: this.queueActive ? this.songs.map(item => item.id) : undefined,
    }
  }

  /* ── 音频频率（仅视觉） ───────────────── */
  private ensureAnalyser(): void {
    if (this.analyser || this.analyserFailed || !this.audio) return
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) {
        this.analyserFailed = true
        return
      }
      this.ctx ??= new Ctor()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 128
      this.analyser.smoothingTimeConstant = 0.7
      this.source = this.ctx.createMediaElementSource(this.audio)
      this.source.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)
      this.levelBins = new Uint8Array(this.analyser.frequencyBinCount)
    } catch {
      // 跨域或浏览器限制：视觉降级为无响应，播放不受影响
      this.analyserFailed = true
    }
  }

  /** 平滑后的低频能量 0..1，供星球呼吸/辉光使用 */
  sampleLevel(): number {
    if (!this.analyser) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {})
      return this.level
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {})
    this.analyser.getByteFrequencyData(this.levelBins)
    let sum = 0
    const n = Math.min(16, this.levelBins.length)
    for (let i = 0; i < n; i++) sum += this.levelBins[i]
    const raw = n ? (sum / n / 255) * 1.6 : 0
    const target = Math.min(1, raw) * (this.status === 'playing' ? 1 : 0)
    this.level += (target - this.level) * 0.08
    return this.level
  }

  /* 三段频带（低/中/高），供生成式视觉分层响应；每段独立平滑 */
  private bands = { low: 0, mid: 0, high: 0 }
  sampleBands(): { low: number; mid: number; high: number } {
    if (!this.analyser) return this.bands
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {})
    if (this.status !== 'playing') {
      this.bands.low += (0 - this.bands.low) * 0.06
      this.bands.mid += (0 - this.bands.mid) * 0.06
      this.bands.high += (0 - this.bands.high) * 0.06
      return this.bands
    }
    this.analyser.getByteFrequencyData(this.levelBins)
    const avg = (from: number, to: number) => {
      let sum = 0
      const end = Math.min(to, this.levelBins.length)
      for (let i = from; i < end; i++) sum += this.levelBins[i]
      return end > from ? sum / (end - from) / 255 : 0
    }
    const target = {
      low: Math.min(1, avg(1, 6) * 1.5),
      mid: Math.min(1, avg(6, 28) * 1.7),
      high: Math.min(1, avg(28, 64) * 2.2),
    }
    this.bands.low += (target.low - this.bands.low) * 0.1
    this.bands.mid += (target.mid - this.bands.mid) * 0.09
    this.bands.high += (target.high - this.bands.high) * 0.12
    return this.bands
  }
}

export const engine = new AudioEngine()
