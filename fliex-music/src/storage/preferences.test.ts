import { describe, expect, it } from 'vitest'
import { validatePreferences } from './preferences'
import { DEFAULT_PREFERENCES } from '../types'

describe('validatePreferences', () => {
  it('空输入返回完整默认值', () => {
    expect(validatePreferences({})).toEqual(DEFAULT_PREFERENCES)
  })
  it('数值越界被夹紧', () => {
    const p = validatePreferences({ bgDim: 200, planetScale: 5, lyricWindow: 99, bgBlur: -3 })
    expect(p.bgDim).toBe(85)
    expect(p.planetScale).toBe(1.3)
    expect(p.lyricWindow).toBe(9)
    expect(p.bgBlur).toBe(0)
  })
  it('非法枚举回退默认', () => {
    const p = validatePreferences({ bgSource: 'video', lyricPreset: 'karaoke', playerPosition: 'top' })
    expect(p.bgSource).toBe('original')
    expect(p.lyricPreset).toBe('classic')
    expect(p.playerPosition).toBe('right')
  })
  it('合法配置完整保留', () => {
    const p = validatePreferences({
      bgSource: 'image', bgDim: 30, bgBlur: 4, bgFocusX: 20, bgFocusY: 80, bgScale: 1.4,
      planetScale: 1.2, planetBrightness: 1.4, planetSpeed: 2, planetDensity: 'high',
      planetOffsetX: -8, planetOffsetY: 6, lyricWindow: 7, lyricPreset: 'minimal', lyricAlign: 'center',
      playerMode: 'compact', playerPosition: 'left', playerOpacity: 0.5, playerScale: 0.9,
      planetVisible: false, orbitVisible: false, audioStrength: 1.4, parallax: false,
      motionQuality: 'low', grainOpacity: 20, lyricTop: 30, lyricWidth: 70,
      lyricActiveBrightness: 0.8, lyricInactiveAlpha: 0.2, lyricAutoScroll: false,
      consoleWidth: 480, terminalVisible: false, navVisible: false,
    })
    expect(p.bgSource).toBe('image')
    expect(p.planetSpeed).toBe(2)
    expect(p.lyricPreset).toBe('minimal')
    expect(p.playerPosition).toBe('left')
    expect(p.planetVisible).toBe(false)
    expect(p.audioStrength).toBe(1.4)
    expect(p.motionQuality).toBe('low')
    expect(p.consoleWidth).toBe(480)
  })
  it('非对象输入安全回退', () => {
    expect(validatePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(validatePreferences([1, 2])).toEqual(DEFAULT_PREFERENCES)
    expect(validatePreferences('x')).toEqual(DEFAULT_PREFERENCES)
  })
})
