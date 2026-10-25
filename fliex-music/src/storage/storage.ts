/* Fliex Music — 本地存储封装
   - 所有键带版本前缀 fliex-music:v1:
   - 读取经结构校验，损坏时安全回退默认值
   - localStorage 被禁用/抛错时降级为本次会话的内存副本（available=false） */

const PREFIX = 'fliex-music:v1:'

export interface KV {
  get<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T
  set(key: string, value: unknown): void
  /** 持久化是否可用；false 表示已降级为内存副本（仅本次会话有效） */
  readonly available: boolean
}

export function createKV(store?: Storage | null): KV {
  let backend: Storage
  let available: boolean
  if (store != null) {
    backend = store
    available = isUsable(store)
  } else {
    const local = safeLocal()
    if (local) {
      backend = local
      available = true
    } else {
      backend = createMemoryStorage()
      available = false
    }
  }
  const kv: KV = {
    get<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean) {
      try {
        const raw = backend.getItem(PREFIX + key)
        if (raw === null) return fallback
        const parsed = JSON.parse(raw) as unknown
        if (isValid && !isValid(parsed)) return fallback
        return parsed as T
      } catch {
        return fallback
      }
    },
    set(key, value) {
      try {
        backend.setItem(PREFIX + key, JSON.stringify(value))
      } catch {
        /* 配额满 / 隐私模式：静默失败，播放功能不受影响 */
      }
    },
    available,
  }
  return kv
}

function safeLocal(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__fliex_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

function isUsable(store: Storage): boolean {
  try {
    const probe = '__fliex_probe__'
    store.setItem(probe, '1')
    store.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function createMemoryStorage(): Storage {
  const memory = new Map<string, string>()
  return {
    length: 0,
    clear: () => memory.clear(),
    getItem: key => memory.get(key) ?? null,
    key: () => null,
    removeItem: key => void memory.delete(key),
    setItem: (key, value) => void memory.set(key, String(value)),
  } as Storage
}
