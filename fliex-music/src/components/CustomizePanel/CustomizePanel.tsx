/* Fliex Music — Customize 个性化工作台
   五个分类：Background / Orb / Lyrics / Layout / Motion。
   左侧舞台即实时预览；参数存本机，支持配置导出/导入（JSON）与恢复默认。 */

import { useRef, useState } from 'react'
import { useApp } from '../../app/PlayerProvider'
import { DEFAULT_PREFERENCES, type Preferences } from '../../types'
import { PanelHeader, SettingSection, SettingSegment, SettingSlider, SettingToggle } from '../settings/controls'

type Tab = 'background' | 'orb' | 'lyrics' | 'layout' | 'motion'

/* 预设主题：覆盖与背景/氛围相关的一组参数 */
const PRESETS: Array<{ id: string; name: string; patch: Partial<Preferences>; needsImage?: boolean }> = [
  { id: 'original', name: 'Original Space · 原始深空', patch: { bgSource: 'original', bgTint: 'none', bgDim: 0, bgBlur: 0, bgTexture: true, grainOpacity: 5, starDensity: 'mid' } },
  { id: 'cold', name: 'Cold Nebula · 冷灰蓝', patch: { bgSource: 'original', bgTint: 'cold', bgDim: 18, bgBlur: 1.5, bgTexture: true, grainOpacity: 8, starDensity: 'mid' } },
  { id: 'black', name: 'Pure Black · 极简纯黑', patch: { bgSource: 'none', bgTint: 'none', bgDim: 0, bgTexture: false, grainOpacity: 3, starDensity: 'low' } },
  { id: 'image', name: 'Custom Image · 自定义图片', patch: { bgSource: 'image' }, needsImage: true },
]

const presetActive = (p: Preferences): string => {
  if (p.bgSource === 'image') return 'image'
  if (p.bgSource === 'none') return 'black'
  if (p.bgTint === 'cold' || p.bgDim > 0 || p.bgBlur > 0) return 'cold'
  return 'original'
}

/* 歌词预设 = 一组歌词参数 */
const LYRIC_PRESETS: Array<{ id: 'focus' | 'classic' | 'minimal'; name: string; patch: Partial<Preferences> }> = [
  { id: 'focus', name: 'Focus', patch: { lyricPreset: 'focus', lyricInactiveAlpha: 0.14, lyricWindow: 5 } },
  { id: 'classic', name: 'Classic', patch: { lyricPreset: 'classic', lyricInactiveAlpha: 0.38, lyricWindow: 5 } },
  { id: 'minimal', name: 'Minimal', patch: { lyricPreset: 'minimal', lyricInactiveAlpha: 0.08, lyricWindow: 1 } },
]

export function CustomizePanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { preferences: p, setPreference, applyPreferences, previewPreferences, resetPreferences, importPreferences, bgImageUrl, setCustomBackground, removeCustomBackground, storageAvailable } = useApp()
  const [tab, setTab] = useState<Tab>('background')
  const [status, setStatus] = useState('')
  const [resetArmed, setResetArmed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  /* Before / After：按住时临时显示原始深空主题，松开恢复当前修改（不写入存储） */
  const startCompare = () => previewPreferences(DEFAULT_PREFERENCES)
  const endCompare = () => previewPreferences(null)

  const flash = (text: string) => {
    setStatus(text)
    setTimeout(() => setStatus(''), 2800)
  }

  const onResetClick = () => {
    if (!resetArmed) {
      setResetArmed(true)
      clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setResetArmed(false), 2600)
      return
    }
    clearTimeout(resetTimer.current)
    setResetArmed(false)
    resetPreferences()
    flash('已恢复原始深空主题。')
  }

  const onSave = () => {
    applyPreferences({}) // 空补丁 = 校验并写入当前状态
    flash('当前设置已保存到本机。')
  }

  const onUpload = async (file: File | undefined) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setStatus('仅支持 JPG / PNG / WebP 图片。')
      return
    }
    try {
      await setCustomBackground(file)
      applyPreferences({ bgSource: 'image', bgDim: Math.max(p.bgDim, 30), bgTexture: true })
      setStatus('背景已上传并保存到本机（不会上传到任何服务器）。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '上传失败')
    }
  }

  const onRemove = async () => {
    await removeCustomBackground()
    applyPreferences({ bgSource: 'original' })
    setStatus('已移除自定义背景。')
  }

  const onExport = () => {
    const blob = new Blob([JSON.stringify({ format: 'fliex-custom', version: 1, preferences: p }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fliex-music-config.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('配置已导出（不含背景图片数据）。')
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > 1024 * 1024) throw new Error('配置文件过大')
      const raw = JSON.parse(await file.text())
      const r = raw as { format?: string; version?: number; preferences?: unknown }
      if (!r || typeof r !== 'object' || r.format !== 'fliex-custom') throw new Error('不是有效的 Fliex Music 配置文件')
      if (typeof r.version === 'number' && r.version > 1) throw new Error('配置版本过新，请更新 Fliex Music 后再导入')
      importPreferences(r.preferences)
      setStatus('配置已导入（未知字段已忽略，非法参数已修正）。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败')
    }
  }

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} className={`side-tabbtn${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}>
      {label}
    </button>
  )

  return (
    <section className="side-panel" role="dialog" aria-modal="false" aria-label="Customize 个性化工作台" tabIndex={-1}>
      <PanelHeader kicker="PERSONALIZE / YOUR SPACE" title="Customize." sub="改动会立即反映在舞台上，并保存在本机。" onClose={onClose} />

      <div className="side-tabs" role="tablist" aria-label="自定义分组">
        {tabBtn('background', 'Background')}
        {tabBtn('orb', 'Orb')}
        {tabBtn('lyrics', 'Lyrics')}
        {tabBtn('layout', 'Layout')}
        {tabBtn('motion', 'Motion')}
      </div>

      <div className="side-body">
        {tab === 'background' && (
          <>
            <SettingSection title="背景预设">
              <div className="cz-presets">
                {PRESETS.map(preset => {
                  const disabled = Boolean(preset.needsImage && !bgImageUrl)
                  return (
                    <button
                      key={preset.id}
                      className={`cz-preset${presetActive(p) === preset.id ? ' is-on' : ''}`}
                      disabled={disabled}
                      onClick={() => applyPreferences(preset.patch)}
                    >
                      <i className={`cz-swatch sw-${preset.id}${preset.id === 'image' && bgImageUrl ? ' has-img' : ''}`} aria-hidden="true">
                        {preset.id === 'image' && bgImageUrl && <img src={bgImageUrl} alt="" />}
                      </i>
                      {preset.name}
                    </button>
                  )
                })}
              </div>
            </SettingSection>

            <SettingSection title="自定义背景">
              <div className="cz-row">
                <span className="cz-label">背景图片<small>JPG · PNG · WebP · ≤12 MB，仅存本机</small></span>
                <span className="cz-actions-inline">
                  <button className="cz-mini" onClick={() => fileRef.current?.click()}>{bgImageUrl ? '更换图片' : '上传图片'}</button>
                  {bgImageUrl && <button className="cz-mini" onClick={onRemove}>移除</button>}
                </span>
              </div>
              {bgImageUrl ? (
                <div className="cz-bg-current">
                  <img className="cz-bg-thumb" src={bgImageUrl} alt="当前自定义背景缩略图" />
                  <span className="cz-bg-state">已启用 · 保存于本机</span>
                </div>
              ) : (
                <p className="cz-thumb-note">上传后自动加一层暗色遮罩，保护歌词可读性。</p>
              )}
              <SettingSlider label="背景暗度" value={p.bgDim} min={0} max={85} step={1} format={v => `${v}%`} onChange={v => setPreference('bgDim', v)} />
              <SettingSlider label="背景模糊" value={p.bgBlur} min={0} max={20} step={0.5} format={v => `${v}px`} onChange={v => setPreference('bgBlur', v)} />
              <SettingSlider label="背景缩放" value={p.bgScale} min={1} max={2} step={0.05} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('bgScale', v)} />
              <SettingSlider label="焦点横向" value={p.bgFocusX} min={0} max={100} step={1} format={v => `${v}%`} onChange={v => setPreference('bgFocusX', v)} />
              <SettingSlider label="焦点纵向" value={p.bgFocusY} min={0} max={100} step={1} format={v => `${v}%`} onChange={v => setPreference('bgFocusY', v)} />
              <SettingSegment label="显示方式" value={p.bgFit} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} onChange={v => setPreference('bgFit', v)} />
              <SettingToggle label="纹理叠加" note="保留星点层（星球与星轨独立于此）" checked={p.bgTexture} onChange={v => setPreference('bgTexture', v)} />
            </SettingSection>

            <SettingSection title="氛围">
              <SettingSlider label="颗粒透明度" value={p.grainOpacity} min={0} max={100} step={1} format={v => `${v}%`} onChange={v => setPreference('grainOpacity', v)} />
              <SettingSegment label="星点密度" value={p.starDensity} options={[{ value: 'low', label: '稀疏' }, { value: 'mid', label: '标准' }, { value: 'high', label: '繁星' }]} onChange={v => setPreference('starDensity', v)} />
              <SettingToggle label="星轨显示" note="外围轨道与信号点" checked={p.orbitVisible} onChange={v => setPreference('orbitVisible', v)} />
            </SettingSection>
          </>
        )}

        {tab === 'orb' && (
          <>
            <SettingSection title="星球 · Original Orb">
              <SettingToggle label="显示星球" note="关闭后仅保留背景与星轨" checked={p.planetVisible} onChange={v => setPreference('planetVisible', v)} />
              <SettingSlider label="星球大小" value={p.planetScale} min={0.7} max={1.3} step={0.01} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('planetScale', v)} />
              <SettingSlider label="线条亮度" value={p.planetBrightness} min={0.5} max={1.5} step={0.05} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('planetBrightness', v)} />
              <SettingSegment label="节点密度" value={p.planetDensity} options={[{ value: 'low', label: '疏' }, { value: 'mid', label: '标准' }, { value: 'high', label: '密' }]} onChange={v => setPreference('planetDensity', v)} />
              <SettingSlider label="位置横向" value={p.planetOffsetX} min={-12} max={12} step={0.5} format={v => `${v > 0 ? '+' : ''}${v}%`} onChange={v => setPreference('planetOffsetX', v)} />
              <SettingSlider label="位置纵向" value={p.planetOffsetY} min={-12} max={12} step={0.5} format={v => `${v > 0 ? '+' : ''}${v}%`} onChange={v => setPreference('planetOffsetY', v)} />
              <div className="cz-row">
                <span className="cz-label">位置重置<small>回到左下角默认方位</small></span>
                <button className="cz-mini" onClick={() => applyPreferences({ planetOffsetX: 0, planetOffsetY: 0 })}>恢复默认位置</button>
              </div>
              <SettingSlider label="音乐响应强度" value={p.audioStrength} min={0} max={1.5} step={0.05} format={v => `${v.toFixed(2)}×`} onChange={v => setPreference('audioStrength', v)} />
            </SettingSection>
          </>
        )}

        {tab === 'lyrics' && (
          <>
            <SettingSection title="歌词预设">
              <div className="cz-presets cz-presets-row">
                {LYRIC_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`cz-preset${p.lyricPreset === preset.id ? ' is-on' : ''}`}
                    onClick={() => applyPreferences(preset.patch)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </SettingSection>
            <SettingSection title="排版">
              <SettingSlider label="显示行数" value={p.lyricWindow} min={1} max={9} step={1} format={v => `${v} 行`} onChange={v => setPreference('lyricWindow', v)} />
              <SettingSegment label="字号" value={p.lyricSize} options={[{ value: 's', label: '小' }, { value: 'm', label: '标准' }, { value: 'l', label: '大' }]} onChange={v => setPreference('lyricSize', v)} />
              <SettingSlider label="行间距" value={p.lyricLineHeight} min={1.5} max={2.2} step={0.05} format={v => v.toFixed(2)} onChange={v => setPreference('lyricLineHeight', v)} />
              <SettingSegment label="对齐" value={p.lyricAlign} options={[{ value: 'left', label: '居左' }, { value: 'center', label: '居中' }]} onChange={v => setPreference('lyricAlign', v)} />
            </SettingSection>
            <SettingSection title="明暗与位置">
              <SettingSlider label="当前句亮度" value={p.lyricActiveBrightness} min={0.7} max={1} step={0.02} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('lyricActiveBrightness', v)} />
              <SettingSlider label="其他句透明度" value={p.lyricInactiveAlpha} min={0.08} max={0.6} step={0.02} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('lyricInactiveAlpha', v)} />
              <SettingSlider label="区域位置" value={p.lyricTop} min={8} max={45} step={1} format={v => `距顶 ${v}%`} onChange={v => setPreference('lyricTop', v)} />
              <SettingSlider label="区域宽度" value={p.lyricWidth} min={30} max={80} step={1} format={v => `${v}%`} onChange={v => setPreference('lyricWidth', v)} />
              <SettingToggle label="自动滚动" note="关闭后可手动滚动，用「返回正在播放」同步" checked={p.lyricAutoScroll} onChange={v => setPreference('lyricAutoScroll', v)} />
            </SettingSection>
          </>
        )}

        {tab === 'layout' && (
          <>
            <SettingSection title="悬浮播放器">
              <SettingSegment label="面板模式" value={p.playerMode} options={[{ value: 'float', label: '悬浮' }, { value: 'compact', label: '紧凑' }]} onChange={v => setPreference('playerMode', v)} />
              <SettingSegment label="位置" value={p.playerPosition} options={[{ value: 'right', label: '右下' }, { value: 'center', label: '居中' }, { value: 'left', label: '左下' }]} onChange={v => setPreference('playerPosition', v)} />
              <SettingSlider label="面板透明度" value={p.playerOpacity} min={0.4} max={1} step={0.02} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('playerOpacity', v)} />
              <SettingSlider label="面板宽度" value={p.playerScale} min={0.85} max={1.15} step={0.01} format={v => `${Math.round(v * 100)}%`} onChange={v => setPreference('playerScale', v)} />
            </SettingSection>
            <SettingSection title="界面元素">
              <SettingSlider label="控制台宽度" value={p.consoleWidth} min={360} max={480} step={4} format={v => `${v}px`} onChange={v => setPreference('consoleWidth', v)} />
              <SettingToggle label="终端状态文字" note="左上角 system.init 状态" checked={p.terminalVisible} onChange={v => setPreference('terminalVisible', v)} />
              <SettingToggle label="品牌导航" note="隐藏后按 F 或 Esc 仍可操作" checked={p.navVisible} onChange={v => setPreference('navVisible', v)} />
            </SettingSection>
          </>
        )}

        {tab === 'motion' && (
          <>
            <SettingSection title="动效">
              <SettingToggle label="背景动态粒子" note="闪烁星点层" checked={p.bgTexture} onChange={v => setPreference('bgTexture', v)} />
              <SettingToggle label="星球旋转" note="关闭后保持静态画面" checked={p.planetMotion} onChange={v => setPreference('planetMotion', v)} />
              <SettingSlider label="旋转速度" value={p.planetSpeed} min={0.3} max={3} step={0.05} format={v => `${v.toFixed(2)}×`} onChange={v => setPreference('planetSpeed', v)} />
              <SettingToggle label="鼠标视差" note="星球随指针轻微漂移" checked={p.parallax} onChange={v => setPreference('parallax', v)} />
              <SettingToggle label="音频响应" note="星球随声音呼吸" checked={p.audioReactive} onChange={v => setPreference('audioReactive', v)} />
              <SettingToggle label="信号流场" note="装置周边的流动线条" checked={p.flowVisible} onChange={v => setPreference('flowVisible', v)} />
              <SettingSlider label="流场强度" value={p.flowIntensity} min={0} max={1.5} step={0.05} format={v => `${v.toFixed(2)}×`} onChange={v => setPreference('flowIntensity', v)} />
              <SettingSegment label="动效质量" value={p.motionQuality} options={[{ value: 'high', label: '高' }, { value: 'low', label: '低（省电）' }]} onChange={v => setPreference('motionQuality', v)} />
              <SettingToggle label="低动态模式" note="遵循系统 prefers-reduced-motion" checked={p.reduceMotion} onChange={v => setPreference('reduceMotion', v)} />
              <SettingToggle label="文字对比度" note="提高次要文字对比度" checked={p.highContrast} onChange={v => setPreference('highContrast', v)} />
            </SettingSection>
            <SettingSection title="配置">
              <div className="cz-row">
                <span className="cz-label">Before / After<small>按住暂时查看原始深空主题，松开恢复你的修改</small></span>
                <button
                  className="cz-mini cz-compare"
                  onPointerDown={startCompare}
                  onPointerUp={endCompare}
                  onPointerLeave={endCompare}
                  onPointerCancel={endCompare}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startCompare() } }}
                  onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') endCompare() }}
                  onBlur={endCompare}
                >
                  按住对比原始
                </button>
              </div>
            </SettingSection>
          </>
        )}
      </div>

      <footer className="side-foot">
        {status && <p className="cz-status" role="status">{status}</p>}
        <div className="side-foot-actions">
          <button
            className={`cz-mini cz-mini-reset${resetArmed ? ' is-armed' : ''}`}
            onClick={onResetClick}
          >
            {resetArmed ? '确认恢复？' : 'Reset'}
          </button>
          <button className="cz-mini" onClick={onSave}>Save</button>
          <button className="cz-mini" onClick={onExport}>Export</button>
          <button className="cz-mini" onClick={() => importRef.current?.click()}>Import</button>
          {!storageAvailable && <span className="cz-note">本地存储不可用，仅本次会话有效。</span>}
        </div>
      </footer>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={e => { void onUpload(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => { void onImport(e.target.files?.[0]); e.target.value = '' }} />
    </section>
  )
}
