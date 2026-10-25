/* Fliex Music — 个性化偏好（访客本地数据）
   全部字段逐项校验；损坏 / 缺失项回退默认值。
   validatePreferences 同时服务于读取校验与配置导入校验。 */

import { DEFAULT_PREFERENCES, type Preferences } from '../types'
import type { KV } from './storage'

const KEY = 'preferences'

const DENSITIES = ['low', 'mid', 'high'] as const
const SIZES = ['s', 'm', 'l'] as const
const PRESETS = ['focus', 'classic', 'minimal'] as const
const ALIGNS = ['left', 'center'] as const
const BG_SOURCES = ['original', 'image', 'none'] as const
const BG_FITS = ['cover', 'contain'] as const
const TINTS = ['none', 'cold'] as const
const PLAYER_MODES = ['float', 'compact'] as const
const PLAYER_POSITIONS = ['right', 'center', 'left'] as const
const QUALITIES = ['high', 'low'] as const

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
const num = (v: unknown, fallback: number, min: number, max: number): number =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v as number)) : fallback
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

export function validatePreferences(input: unknown): Preferences {
  const s = (input && typeof input === 'object' && !Array.isArray(input) ? input : {}) as Record<string, unknown>
  return {
    bgSource: pick(s.bgSource, BG_SOURCES, DEFAULT_PREFERENCES.bgSource),
    bgFit: pick(s.bgFit, BG_FITS, DEFAULT_PREFERENCES.bgFit),
    bgScale: num(s.bgScale, DEFAULT_PREFERENCES.bgScale, 1, 2),
    bgFocusX: num(s.bgFocusX, DEFAULT_PREFERENCES.bgFocusX, 0, 100),
    bgFocusY: num(s.bgFocusY, DEFAULT_PREFERENCES.bgFocusY, 0, 100),
    bgBlur: num(s.bgBlur, DEFAULT_PREFERENCES.bgBlur, 0, 20),
    bgDim: num(s.bgDim, DEFAULT_PREFERENCES.bgDim, 0, 85),
    bgTint: pick(s.bgTint, TINTS, DEFAULT_PREFERENCES.bgTint),
    bgTexture: bool(s.bgTexture, DEFAULT_PREFERENCES.bgTexture),
    grainOpacity: num(s.grainOpacity, DEFAULT_PREFERENCES.grainOpacity, 0, 100),
    orbitVisible: bool(s.orbitVisible, DEFAULT_PREFERENCES.orbitVisible),
    planetVisible: bool(s.planetVisible, DEFAULT_PREFERENCES.planetVisible),
    planetScale: num(s.planetScale, DEFAULT_PREFERENCES.planetScale, 0.7, 1.3),
    planetBrightness: num(s.planetBrightness, DEFAULT_PREFERENCES.planetBrightness, 0.5, 1.5),
    planetSpeed: num(s.planetSpeed, DEFAULT_PREFERENCES.planetSpeed, 0.3, 3),
    planetDensity: pick(s.planetDensity, DENSITIES, DEFAULT_PREFERENCES.planetDensity),
    planetOffsetX: num(s.planetOffsetX, DEFAULT_PREFERENCES.planetOffsetX, -12, 12),
    planetOffsetY: num(s.planetOffsetY, DEFAULT_PREFERENCES.planetOffsetY, -12, 12),
    audioStrength: num(s.audioStrength, DEFAULT_PREFERENCES.audioStrength, 0, 1.5),
    planetMotion: bool(s.planetMotion, DEFAULT_PREFERENCES.planetMotion),
    audioReactive: bool(s.audioReactive, DEFAULT_PREFERENCES.audioReactive),
    parallax: bool(s.parallax, DEFAULT_PREFERENCES.parallax),
    motionQuality: pick(s.motionQuality, QUALITIES, DEFAULT_PREFERENCES.motionQuality),
    flowVisible: bool(s.flowVisible, DEFAULT_PREFERENCES.flowVisible),
    flowIntensity: num(s.flowIntensity, DEFAULT_PREFERENCES.flowIntensity, 0, 1.5),
    lyricSize: pick(s.lyricSize, SIZES, DEFAULT_PREFERENCES.lyricSize),
    lyricLineHeight: num(s.lyricLineHeight, DEFAULT_PREFERENCES.lyricLineHeight, 1.5, 2.2),
    lyricAlign: pick(s.lyricAlign, ALIGNS, DEFAULT_PREFERENCES.lyricAlign),
    lyricWindow: Math.round(num(s.lyricWindow, DEFAULT_PREFERENCES.lyricWindow, 1, 9)),
    lyricPreset: pick(s.lyricPreset, PRESETS, DEFAULT_PREFERENCES.lyricPreset),
    lyricTop: num(s.lyricTop, DEFAULT_PREFERENCES.lyricTop, 8, 45),
    lyricWidth: num(s.lyricWidth, DEFAULT_PREFERENCES.lyricWidth, 30, 80),
    lyricActiveBrightness: num(s.lyricActiveBrightness, DEFAULT_PREFERENCES.lyricActiveBrightness, 0.7, 1),
    lyricInactiveAlpha: num(s.lyricInactiveAlpha, DEFAULT_PREFERENCES.lyricInactiveAlpha, 0.08, 0.6),
    lyricAutoScroll: bool(s.lyricAutoScroll, DEFAULT_PREFERENCES.lyricAutoScroll),
    playerMode: pick(s.playerMode, PLAYER_MODES, DEFAULT_PREFERENCES.playerMode),
    playerPosition: pick(s.playerPosition, PLAYER_POSITIONS, DEFAULT_PREFERENCES.playerPosition),
    playerOpacity: num(s.playerOpacity, DEFAULT_PREFERENCES.playerOpacity, 0.4, 1),
    playerScale: num(s.playerScale, DEFAULT_PREFERENCES.playerScale, 0.85, 1.15),
    consoleWidth: Math.round(num(s.consoleWidth, DEFAULT_PREFERENCES.consoleWidth, 360, 480)),
    terminalVisible: bool(s.terminalVisible, DEFAULT_PREFERENCES.terminalVisible),
    navVisible: bool(s.navVisible, DEFAULT_PREFERENCES.navVisible),
    starDensity: pick(s.starDensity, DENSITIES, DEFAULT_PREFERENCES.starDensity),
    highContrast: bool(s.highContrast, DEFAULT_PREFERENCES.highContrast),
    reduceMotion: bool(s.reduceMotion, DEFAULT_PREFERENCES.reduceMotion),
  }
}

export function loadPreferences(kv: KV): Preferences {
  return validatePreferences(kv.get<unknown>(KEY, {}))
}

export function savePreferences(kv: KV, prefs: Preferences): void {
  kv.set(KEY, prefs)
}
