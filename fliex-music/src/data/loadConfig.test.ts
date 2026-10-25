import { describe, expect, it } from 'vitest'
import { resolveAsset, validatePlaylists, validateSite, validateSongs, validateSpaces } from './loadConfig'

describe('resolveAsset', () => {
  it('相对路径拼接到 base 之后', () => {
    expect(resolveAsset('music/a.mp3')).toMatch(/\/music\/a\.mp3$/)
  })
  it('带前导斜杠不会产生双斜杠', () => {
    expect(resolveAsset('/music/a.mp3')).not.toContain('//music')
  })
  it('http(s) 绝对地址原样返回', () => {
    expect(resolveAsset('https://example.com/a.mp3')).toBe('https://example.com/a.mp3')
  })
})

describe('validateSongs', () => {
  const valid = [{ id: 'a', title: 'A', artist: 'X', audio: 'music/a.mp3' }]
  it('接受合法配置并补全可选字段', () => {
    const songs = validateSongs(valid)
    expect(songs).toHaveLength(1)
    expect(songs[0].cover).toBeUndefined()
  })
  it('缺少必填字段时抛出可读错误', () => {
    expect(() => validateSongs([{ id: 'a', title: 'A', audio: 'x.mp3' }])).toThrow(/artist/)
  })
  it('重复 id 抛错', () => {
    expect(() => validateSongs([...valid, ...valid])).toThrow(/重复/)
  })
  it('路径不合法抛错', () => {
    expect(() => validateSongs([{ id: 'a', title: 'A', artist: 'X', audio: '../秘密.mp3' }])).toThrow(/audio/)
  })
})

describe('validatePlaylists', () => {
  const songs = validateSongs([{ id: 'a', title: 'A', artist: 'X', audio: 'music/a.mp3' }])
  it('引用不存在的歌曲时抛错', () => {
    expect(() => validatePlaylists([{ id: 'p', name: 'P', songIds: ['ghost'] }], songs)).toThrow(/ghost/)
  })
  it('合法歌单通过', () => {
    const playlists = validatePlaylists([{ id: 'p', name: 'P', songIds: ['a'] }], songs)
    expect(playlists[0].songIds).toEqual(['a'])
  })
})

describe('validateSpaces', () => {
  it('只接受 http(s) 外链', () => {
    expect(() => validateSpaces([{ name: 'n', description: 'd', url: 'javascript:alert(1)' }])).toThrow(/http/)
    expect(() => validateSpaces([{ name: 'n', description: 'd', url: '' }])).toThrow(/url/)
  })
  it('合法友链通过并自动补 id', () => {
    const spaces = validateSpaces([{ name: 'n', description: 'd', url: 'https://a.b/' }])
    expect(spaces[0].id).toBe('space-1')
  })
})

describe('validateSite', () => {
  it('空配置回退到默认品牌', () => {
    const site = validateSite(null)
    expect(site.brand.name).toBe('Fliex')
    expect(site.giscus).toBeNull()
  })
  it('非法 giscus 配置视为未启用', () => {
    const site = validateSite({ giscus: { repo: 'x' } })
    expect(site.giscus).toBeNull()
  })
})
