/* Fliex Music — 全局类型定义 */

export interface Song {
  id: string
  title: string
  artist: string
  audio: string
  cover?: string
  lyrics?: string
  album?: string
  duration?: number
}

export interface Playlist {
  id: string
  name: string
  description?: string
  cover?: string
  songIds: string[]
}

export type SpaceLinkType = 'internal' | 'external'

export interface MusicSpace {
  id: string
  name: string
  description: string
  /** external 作品的访问地址；internal 作品留空（站内切换） */
  url?: string
  /** internal：点击关闭面板回到 Listen；external：新标签页打开 */
  linkType: SpaceLinkType
  /** 类型标签，如 Personal Music Space */
  category?: string
  /** 真实预览图（相对部署 base 或绝对地址）；没有时使用视觉占位 */
  image?: string
  tags?: string[]
  /** 徽标文案 */
  badge?: string
  /** 站点主人自己的作品（与社区投稿分组展示） */
  owner?: boolean
}

export interface GiscusConfig {
  repo: string
  repoId: string
  category: string
  categoryId: string
  /** specific 映射时指向固定 Discussion 标题，保证全站共用一个留言帖 */
  term?: string
  strict?: string
  inputPosition?: 'top' | 'bottom'
}

export interface SiteConfig {
  brand: { name: string; sub: string; mottoZh: string; mottoEn: string }
  links: { github?: string; contact?: string; submit?: string }
  giscus?: GiscusConfig | null
}

export interface LibraryData {
  songs: Song[]
  playlists: Playlist[]
  spaces: MusicSpace[]
  site: SiteConfig
  /** 站点主人发布的公开随笔（只读）；config/notes.json 不存在时为空 */
  notes: Note[]
}

export type PlaybackMode = 'list' | 'single' | 'shuffle'
export type StarDensity = 'low' | 'mid' | 'high'
export type LyricSize = 's' | 'm' | 'l'
export type PlanetDensity = 'low' | 'mid' | 'high'
export type LyricPreset = 'focus' | 'classic' | 'minimal'
export type LyricAlign = 'left' | 'center'
export type BgSource = 'original' | 'image' | 'none'
export type BgFit = 'cover' | 'contain'
export type BgTint = 'none' | 'cold'
export type PlayerMode = 'float' | 'compact'
export type PlayerPosition = 'right' | 'center' | 'left'
export type MotionQuality = 'high' | 'low'

export interface Preferences {
  /* 背景 */
  bgSource: BgSource
  bgFit: BgFit
  bgScale: number        // 1..2
  bgFocusX: number       // 0..100
  bgFocusY: number       // 0..100
  bgBlur: number         // 0..20
  bgDim: number          // 0..85（黑色遮罩强度 %）
  bgTint: BgTint
  bgTexture: boolean     // 背景动态粒子（星点层）
  grainOpacity: number   // 0..100 颗粒透明度
  orbitVisible: boolean  // 星轨显示
  /* 星球 */
  planetVisible: boolean    // 显示/隐藏星球
  planetScale: number       // 0.7..1.3
  planetBrightness: number  // 0.5..1.5（线条亮度）
  planetSpeed: number       // 0.3..3
  planetDensity: PlanetDensity
  planetOffsetX: number     // -12..12 (% 视口)
  planetOffsetY: number     // -12..12
  audioStrength: number     // 0..1.5 音乐响应强度
  planetMotion: boolean
  audioReactive: boolean
  parallax: boolean         // 鼠标视差
  motionQuality: MotionQuality
  flowVisible: boolean      // 信号流场显示
  flowIntensity: number     // 0..1.5 流场强度
  /* 歌词 */
  lyricSize: LyricSize
  lyricLineHeight: number   // 1.5..2.2
  lyricAlign: LyricAlign
  lyricWindow: number       // 1..9 行
  lyricPreset: LyricPreset
  lyricTop: number          // 8..45 (% 舞台高度)
  lyricWidth: number        // 30..80 (% 舞台宽度)
  lyricActiveBrightness: number   // 0.7..1 当前句亮度
  lyricInactiveAlpha: number      // 0.08..0.6 非当前句透明度
  lyricAutoScroll: boolean
  /* 播放器与界面 */
  playerMode: PlayerMode
  playerPosition: PlayerPosition
  playerOpacity: number     // 0.4..1
  playerScale: number       // 0.85..1.15
  consoleWidth: number      // 360..480 设置控制台宽度
  terminalVisible: boolean  // 左上终端状态
  navVisible: boolean       // 左侧品牌导航
  /* 通用 */
  starDensity: StarDensity
  highContrast: boolean
  reduceMotion: boolean
}

export interface HistoryEntry {
  songId: string
  title: string
  artist: string
  cover?: string
  /** 有效收听发生（结束）的时刻，ms 时间戳 */
  at: number
  /** 本次有效收听累计的真实秒数 */
  seconds: number
  /** 音轨时长（秒），元数据或音频实测 */
  duration: number
}

/** 访客在本机创建的私人歌单（songIds 引用曲库 id，有序） */
export interface UserPlaylist {
  id: string
  name: string
  description?: string
  songIds: string[]
  createdAt: number
}

/** 音乐随笔：私人音乐日记。本地随笔（draft/done）可编辑，配置下发的公开随笔只读（published） */
export interface Note {
  id: string
  title: string
  content: string
  /** 可选关联的曲库歌曲 id */
  songId?: string
  createdAt: number
  updatedAt: number
  status: 'draft' | 'done' | 'published'
}

export const DEFAULT_PREFERENCES: Preferences = {
  bgSource: 'original',
  bgFit: 'cover',
  bgScale: 1,
  bgFocusX: 50,
  bgFocusY: 50,
  bgBlur: 0,
  bgDim: 0,
  bgTint: 'none',
  bgTexture: true,
  grainOpacity: 5,
  orbitVisible: true,
  planetVisible: true,
  planetScale: 1,
  planetBrightness: 1,
  planetSpeed: 1,
  planetDensity: 'mid',
  planetOffsetX: 0,
  planetOffsetY: 0,
  audioStrength: 1,
  planetMotion: true,
  audioReactive: true,
  parallax: true,
  motionQuality: 'high',
  flowVisible: true,
  flowIntensity: 0.8,
  lyricSize: 'm',
  lyricLineHeight: 1.7,
  lyricAlign: 'left',
  lyricWindow: 5,
  lyricPreset: 'classic',
  lyricTop: 17,
  lyricWidth: 46,
  lyricActiveBrightness: 1,
  lyricInactiveAlpha: 0.46,
  lyricAutoScroll: true,
  playerMode: 'float',
  playerPosition: 'right',
  playerOpacity: 0.72,
  playerScale: 1,
  consoleWidth: 408,
  terminalVisible: true,
  navVisible: true,
  starDensity: 'mid',
  highContrast: false,
  reduceMotion: false,
}
