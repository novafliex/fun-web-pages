import { describe, expect, it } from 'vitest'
import { createUserPlaylist, validateUserPlaylists } from './user-playlists'

describe('validateUserPlaylists', () => {
  it('合法歌单完整保留', () => {
    const p = validateUserPlaylists([{ id: 'a', name: '深夜循环', description: 'd', songIds: ['s1', 's2'], createdAt: 1 }])
    expect(p).toHaveLength(1)
    expect(p[0].name).toBe('深夜循环')
    expect(p[0].songIds).toEqual(['s1', 's2'])
  })
  it('拒绝无效条目但保留有效条目', () => {
    const p = validateUserPlaylists([
      null,
      { id: '', name: 'x', songIds: [] },
      { id: 'b', name: '', songIds: [] },
      { id: 'c', name: 'ok', songIds: 'nope' },
      { id: 'd', name: 'keep', songIds: ['s1'] },
    ])
    expect(p.map(x => x.id)).toEqual(['d'])
  })
  it('去重 songIds 与重复 id', () => {
    const p = validateUserPlaylists([
      { id: 'a', name: 'A', songIds: ['s1', 's1', 's2'] },
      { id: 'a', name: 'A2', songIds: [] },
    ])
    expect(p).toHaveLength(1)
    expect(p[0].songIds).toEqual(['s1', 's2'])
  })
  it('非数组输入回退空', () => {
    expect(validateUserPlaylists(null)).toEqual([])
    expect(validateUserPlaylists('x')).toEqual([])
  })
  it('createUserPlaylist 生成唯一 id 并裁剪字段', () => {
    const a = createUserPlaylist('  深夜  ', undefined)
    const b = createUserPlaylist('  深夜  ')
    expect(a.name).toBe('深夜')
    expect(a.id).not.toBe(b.id)
    expect(a.songIds).toEqual([])
  })
})
