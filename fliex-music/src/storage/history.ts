/* Fliex Music — 有效听歌历史
   业务规则（V1.0 说明书 4.6）：
   - 同一播放会话中，歌曲有效收听累计达到 min(30 秒, 音轨长度的 50%) 才算一次有效收听
   - 只累计真实流逝的播放时间：进度拖动不折算、长空隙丢弃、页面隐藏不计时
   - 记录仅保存在访问者浏览器，限制条数（默认 200 条），支持清空 */

import type { HistoryEntry, Song } from '../types'
import type { KV } from './storage'

export type { HistoryEntry }

const KEY = 'history'
export const HISTORY_LIMIT = 200

/** 有效收听阈值：min(30s, duration 的 50%)；无时长信息时按 30s */
export function listenThreshold(duration: number | undefined): number {
  const d = Number.isFinite(duration) && (duration as number) > 0 ? (duration as number) : 60
  return Math.min(30, d * 0.5)
}

export function isValidListen(accumulatedSeconds: number, duration: number | undefined): boolean {
  return accumulatedSeconds >= listenThreshold(duration)
}

/**
 * 会话级收听计时器：随播放/暂停累计真实时间，切歌或结束时结算。
 * 通过 now() 注入时钟便于测试；单次空隙超过 5s 视为异常直接丢弃（不计入）。
 */
export class ListenTracker {
  private song: Song | null = null
  private accumulated = 0
  private lastTick = 0
  private active = false

  constructor(private now: () => number = () => performance.now()) {}

  /** 指示当前歌曲是否处于“应计时”状态（由调用方综合 playing/可见性判断后告知） */
  setCounting(counting: boolean, at = this.now()): void {
    if (counting === this.active) return
    if (counting) {
      this.active = true
      this.lastTick = at
    } else {
      this.absorb(at)
      this.active = false
    }
  }

  /** 周期性收边，避免长时间不结算导致的单次大空隙 */
  heartbeat(at = this.now()): void {
    if (this.active) this.absorb(at)
  }

  private absorb(at: number): void {
    const gap = at - this.lastTick
    this.lastTick = at
    if (gap >= 0 && gap <= 5000) this.accumulated += gap / 1000
  }

  /** 结算当前歌曲并切换；若达到有效收听阈值返回一条历史记录 */
  switchSong(next: Song | null, at = this.now()): HistoryEntry | null {
    const entry = this.settle(at)
    this.song = next
    this.accumulated = 0
    this.active = false
    this.lastTick = at
    return entry
  }

  /** 仅结算（例如曲目自然播完） */
  settle(at = this.now()): HistoryEntry | null {
    if (this.active) this.absorb(at)
    const song = this.song
    if (!song || !isValidListen(this.accumulated, song.duration)) return null
    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      cover: song.cover,
      at: Date.now(),
      seconds: Math.round(this.accumulated),
      duration: Number.isFinite(song.duration) ? (song.duration as number) : 0,
    }
  }
}

export function loadHistory(kv: KV): HistoryEntry[] {
  const value = kv.get<unknown>(KEY, [], v =>
    Array.isArray(v) &&
    v.length <= HISTORY_LIMIT + 50 &&
    v.every(isHistoryEntry),
  )
  return (value as HistoryEntry[]).slice(0, HISTORY_LIMIT)
}

export function addHistory(kv: KV, entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory(kv)].slice(0, HISTORY_LIMIT)
  kv.set(KEY, next)
  return next
}

export function clearHistory(kv: KV): void {
  kv.set(KEY, [])
}

function isHistoryEntry(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return (
    typeof e.songId === 'string' && e.songId.length <= 256 &&
    typeof e.title === 'string' && e.title.length <= 512 &&
    typeof e.artist === 'string' && e.artist.length <= 512 &&
    (e.cover === undefined || typeof e.cover === 'string') &&
    typeof e.at === 'number' && Number.isFinite(e.at) && e.at >= 0 &&
    typeof e.seconds === 'number' && Number.isFinite(e.seconds) && e.seconds >= 0 && e.seconds < 86400 &&
    typeof e.duration === 'number' && Number.isFinite(e.duration) && e.duration >= 0 && e.duration < 86400
  )
}
