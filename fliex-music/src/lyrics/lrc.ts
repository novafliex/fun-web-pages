/* Fliex Music — LRC 歌词解析
   规则：
   - 支持 [mm:ss] / [mm:ss.xx] / [mm:ss.xxx]，一行多时间戳展开为多行
   - 元数据标签（[ti:] [ar:] [al:] [by:] [offset:]）被忽略
   - 非法行直接跳过，不影响其余歌词
   - 全文没有任何有效时间戳时按“非同步歌词”处理（保留顺序、不高亮） */

export interface LyricLine {
  time: number
  text: string
}

export interface Lyrics {
  synced: boolean
  lines: LyricLine[]
}

const STAMP = /\[(\d{1,3}):([0-5]?\d(?:\.\d{1,3})?)\]/g
const META = /^\[(?:ti|ar|al|by|offset):/i

export function parseLrc(text: string): Lyrics {
  const stamped: LyricLine[] = []
  const plain: string[] = []
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (META.test(line)) continue
    STAMP.lastIndex = 0
    const stamps: number[] = []
    let match: RegExpExecArray | null
    while ((match = STAMP.exec(line))) {
      const time = Number(match[1]) * 60 + Number(match[2])
      if (Number.isFinite(time) && time >= 0) stamps.push(time)
    }
    const words = line.replace(/\[[^\]]*\]/g, '').trim()
    if (stamps.length) {
      for (const time of stamps) stamped.push({ time, text: words })
    } else if (words) {
      plain.push(words)
    }
  }
  if (stamped.length) {
    stamped.sort((a, b) => a.time - b.time)
    return { synced: true, lines: stamped }
  }
  return { synced: false, lines: plain.map((text, i) => ({ time: i, text })) }
}

/** 同步歌词中定位当前行：最后一个 time <= t 的行；未开始返回 -1 */
export function activeLineIndex(lines: LyricLine[], currentTime: number): number {
  let active = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime + 0.02) active = i
    else break
  }
  return active
}
