import { describe, expect, it } from 'vitest'
import { createKV } from './storage'

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

describe('createKV', () => {
  it('键带版本前缀读写', () => {
    const store = new MapStorage()
    const kv = createKV(store)
    kv.set('favorites', ['a'])
    expect(store.map.has('fliex-music:v1:favorites')).toBe(true)
    expect(kv.get('favorites', [])).toEqual(['a'])
  })
  it('读取损坏 JSON 回退默认值', () => {
    const store = new MapStorage()
    store.map.set('fliex-music:v1:x', '{oops')
    const kv = createKV(store)
    expect(kv.get('x', 42)).toBe(42)
  })
  it('校验函数拒绝错误结构', () => {
    const store = new MapStorage()
    store.map.set('fliex-music:v1:x', '"just a string"')
    const kv = createKV(store)
    expect(kv.get('x', [], v => Array.isArray(v))).toEqual([])
  })
  it('写入抛错（配额/隐私模式）不向外传播', () => {
    const store = new MapStorage()
    store.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    const kv = createKV(store)
    expect(() => kv.set('x', 1)).not.toThrow()
  })
})
