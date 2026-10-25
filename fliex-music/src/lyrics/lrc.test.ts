import { describe, expect, it } from 'vitest'
import { activeLineIndex, parseLrc } from './lrc'

describe('parseLrc', () => {
  it('解析基本时间戳并按时间排序', () => {
    const { synced, lines } = parseLrc('[00:10.50]第一句\n[00:05.00]零句\n[01:02.03]末句')
    expect(synced).toBe(true)
    expect(lines.map(l => l.text)).toEqual(['零句', '第一句', '末句'])
    expect(lines[0].time).toBeCloseTo(5)
    expect(lines[2].time).toBeCloseTo(62.03)
  })

  it('一行多时间戳展开为多行', () => {
    const { lines } = parseLrc('[00:12.00][01:30.00]副歌')
    expect(lines).toHaveLength(2)
    expect(lines.every(l => l.text === '副歌')).toBe(true)
  })

  it('忽略元数据标签与空行', () => {
    const { lines } = parseLrc('[ti:歌曲名]\n[ar:歌手]\n\n[00:01.00]词')
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('词')
  })

  it('非法时间戳行被跳过，不影响其他行', () => {
    const { synced, lines } = parseLrc('[00:xx]坏的\n[99:99.99]超界\n[00:03.00]好的')
    expect(synced).toBe(true)
    expect(lines.map(l => l.text)).toEqual(['好的'])
  })

  it('没有任何有效时间戳时按非同步歌词处理', () => {
    const { synced, lines } = parseLrc('没有时间戳的歌词\n第二行')
    expect(synced).toBe(false)
    expect(lines.map(l => l.text)).toEqual(['没有时间戳的歌词', '第二行'])
  })

  it('空文本与纯标签返回空行集合', () => {
    expect(parseLrc('').lines).toHaveLength(0)
    expect(parseLrc('[offset:500]').lines).toHaveLength(0)
  })
})

describe('activeLineIndex', () => {
  const lines = parseLrc('[00:05.00]a\n[00:10.00]b\n[00:20.00]c').lines
  it('开始前返回 -1', () => {
    expect(activeLineIndex(lines, 2)).toBe(-1)
  })
  it('定位到当前行', () => {
    expect(activeLineIndex(lines, 5)).toBe(0)
    expect(activeLineIndex(lines, 15)).toBe(1)
    expect(activeLineIndex(lines, 100)).toBe(2)
  })
})
