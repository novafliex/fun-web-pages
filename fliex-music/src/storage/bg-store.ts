/* Fliex Music — 自定义背景图仓库（IndexedDB）
   背景图片体积超出 localStorage 适配范围，存 IndexedDB（仅本机）。
   任何失败都安全降级为"无自定义背景"，绝不影响播放。 */

const DB_NAME = 'fliex-music'
const STORE = 'backgrounds'
const KEY = 'custom'
const MAX_BYTES = 12 * 1024 * 1024

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function saveBackgroundImage(blob: Blob): Promise<boolean> {
  if (blob.size > MAX_BYTES) throw new Error('图片超过 12 MB，请压缩后再上传')
  const db = await openDb()
  if (!db) throw new Error('浏览器不支持本地数据库，背景图无法保存')
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, KEY)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

export async function loadBackgroundImage(): Promise<Blob | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(KEY)
      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function clearBackgroundImage(): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
  } catch {
    /* 忽略 */
  }
}
