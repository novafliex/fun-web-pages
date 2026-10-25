/* Fliex Music — 私人歌单（访客本地数据）
   歌单是"歌曲 id 的有序集合"，与播放队列、收藏彼此独立：
   - 同一首歌可出现在多个歌单
   - 删除歌单 / 移除歌曲不影响曲库与收藏
   - 刷新后从 localStorage 恢复；封面图存 IndexedDB */

import type { UserPlaylist } from '../types'
import type { KV } from './storage'

const KEY = 'playlists'
export const PLAYLIST_LIMIT = 50
export const PLAYLIST_NAME_MAX = 60
export const PLAYLIST_DESC_MAX = 200

export function validateUserPlaylists(input: unknown): UserPlaylist[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const list: UserPlaylist[] = []
  for (const raw of input.slice(0, PLAYLIST_LIMIT)) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    if (typeof r.id !== 'string' || !r.id || seen.has(r.id)) continue
    if (typeof r.name !== 'string' || !r.name.trim()) continue
    if (!Array.isArray(r.songIds) || r.songIds.some(id => typeof id !== 'string')) continue
    seen.add(r.id)
    list.push({
      id: r.id,
      name: r.name.slice(0, PLAYLIST_NAME_MAX),
      description: typeof r.description === 'string' ? r.description.slice(0, PLAYLIST_DESC_MAX) : undefined,
      songIds: [...new Set(r.songIds as string[])].slice(0, 1000),
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    })
  }
  return list
}

export function loadUserPlaylists(kv: KV): UserPlaylist[] {
  return validateUserPlaylists(kv.get<unknown>(KEY, []))
}

export function saveUserPlaylists(kv: KV, playlists: UserPlaylist[]): void {
  kv.set(KEY, playlists)
}

export function createUserPlaylist(name: string, description?: string): UserPlaylist {
  return {
    id: `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, PLAYLIST_NAME_MAX),
    description: description?.trim().slice(0, PLAYLIST_DESC_MAX) || undefined,
    songIds: [],
    createdAt: Date.now(),
  }
}
