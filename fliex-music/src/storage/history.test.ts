import { describe, expect, it } from 'vitest'
import { ListenTracker, HISTORY_LIMIT, addHistory, clearHistory, isValidListen, listenThreshold, loadHistory } from './history'
import type { Song } from '../types'
import { createKV } from './storage'

const song = (duration?: number): Song => ({ id: 's1', title: 't', artist: 'a', audio: 'x.mp3', duration })

describe('listenThreshold', () => {
  it('长音轨阈值固定 30 秒', () => {
    expect(listenThreshold(300)).toBe(30)
  })
  it('短音轨取时长的 50%', () => {
    expect(listenThreshold(40)).toBe(20)
    expect(listenThreshold(10)).toBe(5)
  })
  it('无时长信息按 30 秒', () => {
    expect(listenThreshold(undefined)).toBe(30)
  })
  it('isValidListen 按阈值判断', () => {
    expect(isValidListen(29.9, 300)).toBe(false)
    expect(isValidListen(30, 300)).toBe(true)
    expect(isValidListen(20, 40)).toBe(true)
  })
})

describe('ListenTracker', () => {
  it('累计真实播放时间达到阈值后切歌产生记录', () => {
    let clock = 0
    const tracker = new ListenTracker(() => clock)
    tracker.switchSong(song(300))
    tracker.setCounting(true)
    for (clock = 5_000; clock < 35_000; clock += 5_000) tracker.heartbeat()
    // 循环结束时 clock === 35000，暂停边界补上最后 5 秒
    tracker.setCounting(false)
    const entry = tracker.switchSong(null)
    expect(entry).not.toBeNull()
    expect(entry!.songId).toBe('s1')
    expect(entry!.seconds).toBe(35)
  })

  it('快速跳过不产生记录', () => {
    let clock = 0
    const tracker = new ListenTracker(() => clock)
    tracker.switchSong(song(300))
    tracker.setCounting(true)
    clock = 4_000
    tracker.heartbeat()
    tracker.setCounting(false)
    const entry = tracker.switchSong(null)
    expect(entry).toBeNull()
  })

  it('暂停期间不计时，恢复后继续累计', () => {
    let clock = 0
    const tracker = new ListenTracker(() => clock)
    tracker.switchSong(song(300))
    tracker.setCounting(true)
    for (clock = 2_000; clock < 10_000; clock += 2_000) tracker.heartbeat()
    tracker.setCounting(false)
    clock = 1_000_000 // 暂停了很久
    tracker.setCounting(true)
    for (clock = 1_005_000; clock < 1_025_000; clock += 5_000) tracker.heartbeat()
    tracker.setCounting(false)
    const entry = tracker.switchSong(null)
    expect(entry).not.toBeNull()
    expect(entry!.seconds).toBe(35)
  })

  it('超过 5 秒的单次空隙被丢弃', () => {
    let clock = 0
    const tracker = new ListenTracker(() => clock)
    tracker.switchSong(song(300))
    tracker.setCounting(true)
    clock = 8_000
    // 没有任何 heartbeat/setCounting 边界，直接跳过一大段
    clock = 60_000
    tracker.setCounting(false)
    const entry = tracker.switchSong(null)
    expect(entry).toBeNull() // 60s 单次空隙整体丢弃
  })
})

describe('history storage', () => {
  const entry = { songId: 's1', title: 't', artist: 'a', at: 1, seconds: 30, duration: 300 }

  it('新增记录置顶并持久化', () => {
    const kv = createKV(new MapStorage())
    addHistory(kv, entry)
    const loaded = loadHistory(kv)
    expect(loaded).toHaveLength(1)
    addHistory(kv, { ...entry, songId: 's2' })
    expect(loadHistory(kv).map(e => e.songId)).toEqual(['s2', 's1'])
  })

  it('限制最大条数', () => {
    const kv = createKV(new MapStorage())
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      addHistory(kv, { ...entry, songId: `s${i}` })
    }
    expect(loadHistory(kv)).toHaveLength(HISTORY_LIMIT)
  })

  it('损坏数据安全回退为空数组', () => {
    const store = new MapStorage()
    store.map.set('fliex-music:v1:history', '{not json')
    const kv = createKV(store)
    expect(loadHistory(kv)).toEqual([])
  })

  it('清空历史', () => {
    const kv = createKV(new MapStorage())
    addHistory(kv, entry)
    clearHistory(kv)
    expect(loadHistory(kv)).toEqual([])
  })
})

/* 测试用简易 Storage */
class MapStorage implements Storage {
  readonly map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key() {
    return null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
}
