/* Fliex Music — 静态配置加载与校验
   - public/config/*.json 驱动歌曲 / 歌单 / 友链 / 站点文案
   - 资源路径一律相对于部署 base（import.meta.env.BASE_URL）解析，
     兼容 GitHub Pages 子目录；禁止配置里写站点根路径
   - 校验失败抛出带可读信息的 ConfigError；开发模式附带资源路径提示 */

import type { LibraryData, MusicSpace, Playlist, SiteConfig, Song } from '../types'
import { validateNotes } from '../storage/notes'

export class ConfigError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(path && import.meta.env?.DEV ? `${message}（${path}）` : message)
    this.name = 'ConfigError'
  }
}

const DEFAULT_SITE: SiteConfig = {
  brand: { name: 'Fliex', sub: 'MUSIC', mottoZh: '记录一些真正值得留下来的东西。', mottoEn: 'A PERSONAL MUSIC SPACE.' },
  links: {},
  giscus: null,
}

/** 将配置中的相对路径解析为部署可用的 URL */
export function resolveAsset(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '')
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-cache' })
  } catch {
    throw new ConfigError('网络请求失败，无法读取配置', url)
  }
  if (!response.ok) throw new ConfigError(`配置加载失败（HTTP ${response.status}）`, url)
  try {
    return await response.json()
  } catch {
    throw new ConfigError('配置不是有效的 JSON 文件', url)
  }
}

function expectArray(value: unknown, file: string): unknown[] {
  if (!Array.isArray(value)) throw new ConfigError(`${file} 的内容应为一个数组`, `config/${file}`)
  return value
}

export function validateSongs(raw: unknown): Song[] {
  const songs = expectArray(raw, 'songs.json').map((item, i) => {
    const s = item as Record<string, unknown>
    if (!s || typeof s !== 'object') throw new ConfigError(`songs.json 第 ${i + 1} 项不是对象`)
    for (const field of ['id', 'title', 'artist', 'audio'] as const) {
      if (typeof s[field] !== 'string' || !(s[field] as string).trim()) {
        throw new ConfigError(`songs.json 第 ${i + 1} 项缺少必填字段 ${field}`)
      }
    }
    if (!/^[\w./-]+$/.test(String(s.audio))) throw new ConfigError(`songs.json 第 ${i + 1} 项 audio 路径格式不合法：${String(s.audio)}`)
    return {
      id: String(s.id),
      title: String(s.title),
      artist: String(s.artist),
      audio: String(s.audio),
      cover: typeof s.cover === 'string' ? s.cover : undefined,
      lyrics: typeof s.lyrics === 'string' ? s.lyrics : undefined,
      album: typeof s.album === 'string' ? s.album : undefined,
      duration: Number.isFinite(s.duration as number) && (s.duration as number) > 0 ? (s.duration as number) : undefined,
    } satisfies Song
  })
  const ids = new Set(songs.map(song => song.id))
  if (ids.size !== songs.length) throw new ConfigError('songs.json 存在重复的歌曲 id')
  return songs
}

export function validatePlaylists(raw: unknown, songs: Song[]): Playlist[] {
  const ids = new Set(songs.map(song => song.id))
  const playlists = expectArray(raw, 'playlists.json').map((item, i) => {
    const p = item as Record<string, unknown>
    if (!p || typeof p !== 'object') throw new ConfigError(`playlists.json 第 ${i + 1} 项不是对象`)
    if (typeof p.id !== 'string' || !p.id.trim() || typeof p.name !== 'string' || !p.name.trim()) {
      throw new ConfigError(`playlists.json 第 ${i + 1} 项缺少 id 或 name`)
    }
    if (!Array.isArray(p.songIds) || p.songIds.some(id => typeof id !== 'string')) {
      throw new ConfigError(`playlists.json 第 ${i + 1} 项 songIds 应为字符串数组`)
    }
    const missing = (p.songIds as string[]).filter(id => !ids.has(id))
    if (missing.length) throw new ConfigError(`歌单「${String(p.name)}」引用了不存在的歌曲：${missing.join(', ')}`)
    return {
      id: String(p.id),
      name: String(p.name),
      description: typeof p.description === 'string' ? p.description : undefined,
      cover: typeof p.cover === 'string' ? p.cover : undefined,
      songIds: p.songIds as string[],
    } satisfies Playlist
  })
  const ids2 = new Set(playlists.map(p => p.id))
  if (ids2.size !== playlists.length) throw new ConfigError('playlists.json 存在重复的歌单 id')
  return playlists
}

export function validateSpaces(raw: unknown): MusicSpace[] {
  return expectArray(raw, 'spaces.json')
    .map((item, i) => {
      const s = item as Record<string, unknown>
      if (!s || typeof s !== 'object') throw new ConfigError(`spaces.json 第 ${i + 1} 项不是对象`)
      if (typeof s.name !== 'string' || !s.name.trim() || typeof s.description !== 'string') {
        throw new ConfigError(`spaces.json 第 ${i + 1} 项缺少 name 或 description`)
      }
      const linkType = s.linkType === 'internal' ? 'internal' : 'external'
      const url = String(s.url ?? '')
      // internal 作品在站内切换，不需要外链；external 必须是可访问的 http(s) 地址
      if (linkType === 'external' && !/^https?:\/\//i.test(url)) {
        throw new ConfigError(`spaces.json 第 ${i + 1} 项 url 必须是 http(s) 地址：${url || '(空)'}`)
      }
      return {
        id: typeof s.id === 'string' && s.id ? s.id : `space-${i + 1}`,
        name: String(s.name),
        description: String(s.description),
        url: url || undefined,
        linkType,
        category: typeof s.category === 'string' && s.category ? s.category : undefined,
        image: typeof s.image === 'string' && s.image ? s.image : undefined,
        tags: Array.isArray(s.tags) ? (s.tags as unknown[]).filter(t => typeof t === 'string') as string[] : undefined,
        badge: typeof s.badge === 'string' && s.badge ? s.badge : undefined,
        owner: s.owner === true,
      } satisfies MusicSpace
    })
    .filter(Boolean)
}

export function validateSite(raw: unknown): SiteConfig {
  if (raw === null || raw === undefined) return DEFAULT_SITE
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ConfigError('site.json 结构不正确')
  const s = raw as Record<string, unknown>
  const brand = (s.brand ?? {}) as Record<string, unknown>
  const links = (s.links ?? {}) as Record<string, unknown>
  const giscus = s.giscus && typeof s.giscus === 'object' ? (s.giscus as Record<string, unknown>) : null
  const validGiscus =
    giscus && typeof giscus.repo === 'string' && typeof giscus.repoId === 'string' &&
    typeof giscus.category === 'string' && typeof giscus.categoryId === 'string'
  return {
    brand: {
      name: typeof brand.name === 'string' && brand.name ? brand.name : DEFAULT_SITE.brand.name,
      sub: typeof brand.sub === 'string' && brand.sub ? brand.sub : DEFAULT_SITE.brand.sub,
      mottoZh: typeof brand.mottoZh === 'string' ? brand.mottoZh : DEFAULT_SITE.brand.mottoZh,
      mottoEn: typeof brand.mottoEn === 'string' ? brand.mottoEn : DEFAULT_SITE.brand.mottoEn,
    },
    links: {
      github: typeof links.github === 'string' && /^https?:\/\//i.test(links.github) ? links.github : undefined,
      contact: typeof links.contact === 'string' && /^(https?:|mailto:)/i.test(links.contact) ? links.contact : undefined,
      submit: typeof links.submit === 'string' && /^https?:\/\//i.test(links.submit) ? links.submit : undefined,
    },
    giscus: validGiscus
      ? {
          repo: String(giscus!.repo),
          repoId: String(giscus!.repoId),
          category: String(giscus!.category),
          categoryId: String(giscus!.categoryId),
          term: typeof giscus!.term === 'string' ? giscus!.term : undefined,
          strict: typeof giscus!.strict === 'string' ? giscus!.strict : undefined,
          inputPosition: giscus!.inputPosition === 'top' ? 'top' : 'bottom',
        }
      : null,
  }
}

export async function loadConfig(): Promise<LibraryData> {
  const base = import.meta.env.BASE_URL || '/'
  const [songsRaw, playlistsRaw, spacesRaw, siteRaw, notesRaw] = await Promise.all([
    fetchJson(`${base}config/songs.json`),
    fetchJson(`${base}config/playlists.json`).catch(() => []),
    fetchJson(`${base}config/spaces.json`).catch(() => []),
    fetchJson(`${base}config/site.json`).catch(() => null),
    // 公开随笔：可选文件，缺失/失败都回退为空
    fetchJson(`${base}config/notes.json`).catch(() => []),
  ])
  const songs = validateSongs(songsRaw)
  const playlists = validatePlaylists(playlistsRaw, songs)
  const spaces = validateSpaces(spacesRaw)
  const site = validateSite(siteRaw)
  const notes = validateNotes(notesRaw, 'published')
  return { songs, playlists, spaces, site, notes }
}
