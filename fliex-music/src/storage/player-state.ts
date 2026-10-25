/* Fliex Music — 播放器状态持久化（当前歌曲 / 进度 / 模式 / 音量）
   恢复进度 ≠ 自动发声：刷新后回到原位置但保持暂停，遵守浏览器自动播放策略 */

import type { PlaybackMode } from '../types'
import type { KV } from './storage'

const KEY = 'player'

export interface PlayerState {
  songId: string | null
  time: number
  mode: PlaybackMode
  volume: number
  muted: boolean
  /** 临时队列（歌单 / 下一首播放）的歌曲 id，恢复播放状态时用 */
  queueSongIds?: string[]
}

const MODES: PlaybackMode[] = ['list', 'single', 'shuffle']

export function loadPlayerState(kv: KV): PlayerState {
  const v = kv.get<unknown>(KEY, {}, x => x !== null && typeof x === 'object' && !Array.isArray(x))
  const s = { ...(v as Record<string, unknown>) }
  return {
    songId: typeof s.songId === 'string' ? s.songId : null,
    time: Number.isFinite(s.time as number) && (s.time as number) >= 0 ? (s.time as number) : 0,
    mode: MODES.includes(s.mode as PlaybackMode) ? (s.mode as PlaybackMode) : 'list',
    volume: Number.isFinite(s.volume as number) ? Math.min(1, Math.max(0, s.volume as number)) : 0.7,
    muted: typeof s.muted === 'boolean' ? s.muted : false,
    queueSongIds: Array.isArray(s.queueSongIds) && s.queueSongIds.every(id => typeof id === 'string')
      ? (s.queueSongIds as string[]).slice(0, 1000)
      : undefined,
  }
}

export function savePlayerState(kv: KV, state: PlayerState): void {
  kv.set(KEY, state)
}
