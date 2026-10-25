/* Fliex Music — 侧面板公共设置控件
   PanelHeader / SettingSection / SettingSlider / SettingToggle / SettingSegment
   供 Discover 与 Customize 共用，保证一致的排版与触控区域。 */

import type { ReactNode } from 'react'

export function PanelHeader({ kicker, title, sub, onClose }: {
  kicker: string
  title: string
  sub: string
  onClose: () => void
}): React.JSX.Element {
  return (
    <header className="side-head">
      <div>
        <p className="side-kicker">{kicker}</p>
        <h2 className="side-title">{title}</h2>
        <p className="side-sub">{sub}</p>
      </div>
      <button className="icon-btn" onClick={onClose} aria-label={`${title === 'Discover.' ? '关闭 Discover' : '关闭 Customize'}，回到播放列表`}>✕</button>
    </header>
  )
}

export function SettingSection({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="setting-section">
      <h3 className="side-section">{title}</h3>
      {children}
    </section>
  )
}

export function SettingSlider({ label, value, min, max, step, format, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <div className="cz-row cz-row-slider">
      <span className="cz-label">
        {label}
        <small>{format(value)}</small>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  )
}

export function SettingToggle({ label, note, checked, onChange }: {
  label: string
  note: string
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <div className="cz-row">
      <span className="cz-label">
        {label}
        <small>{note}</small>
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={`${label}${checked ? '（开）' : '（关）'}`}
        className={`cz-switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  )
}

export function SettingSegment<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}): React.JSX.Element {
  return (
    <div className="cz-row">
      <span className="cz-label">{label}</span>
      <div className="cz-segment" role="radiogroup" aria-label={label}>
        {options.map(option => (
          <button
            key={option.value}
            role="radio"
            aria-checked={option.value === value}
            className={`cz-seg${option.value === value ? ' is-on' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
