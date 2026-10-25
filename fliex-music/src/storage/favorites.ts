/* Fliex Music — 收藏（访客本地数据，不上传） */

import type { KV } from './storage'

const KEY = 'favorites'

export function loadFavorites(kv: KV): Set<string> {
  const value = kv.get<unknown>(KEY, [], v => Array.isArray(v) && v.every(item => typeof item === 'string'))
  return new Set(value as string[])
}

export function saveFavorites(kv: KV, favorites: Iterable<string>): void {
  kv.set(KEY, [...favorites])
}
