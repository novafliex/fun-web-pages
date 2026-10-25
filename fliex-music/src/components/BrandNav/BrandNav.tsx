/* Fliex Music — 左侧品牌与导航
   品牌区（含终端状态块）/ Listen / Discover / Customize 三种面板模式 + 沉浸模式入口
   终端状态为文档流内的独立信息块，任何视口下都不与品牌文案重叠 */

import { useApp } from '../../app/PlayerProvider'
import type { Panel } from '../../app/App'
import { TerminalStatus } from '../TerminalStatus/TerminalStatus'

interface Props {
  panel: Panel
  onNavigate: (panel: Panel) => void
}

export function BrandNav({ panel, onNavigate }: Props): React.JSX.Element {
  const { data, preferences } = useApp()
  const brand = data?.site.brand
  const links = data?.site.links

  const item = (target: Panel, label: string, hint: string) => (
    <button
      className={`nav-item${panel === target ? ' is-active' : ''}`}
      onClick={() => onNavigate(target)}
      aria-current={panel === target ? 'page' : undefined}
    >
      <span>{label}</span>
      <small>{hint}</small>
    </button>
  )

  return (
    <aside className="brandnav">
      <div className="brand">
        <span className="brand-name">{brand?.name ?? 'Fliex'}</span>
        <span className="brand-sub">{brand?.sub ?? 'MUSIC'}</span>
      </div>
      <p className="brand-motto-zh">{brand?.mottoZh ?? '记录一些真正值得留下来的东西。'}</p>
      <p className="brand-motto-en">{brand?.mottoEn ?? 'A PERSONAL MUSIC SPACE.'}</p>

      {preferences.terminalVisible && (
        <div className="terminal-block">
          <TerminalStatus />
        </div>
      )}

      <nav className="brand-nav" aria-label="主导航">
        {item('music', 'LISTEN', '聆听')}
        {item('discover', 'DISCOVER', '发现')}
        {item('customize', 'CUSTOMIZE', '自定义')}
      </nav>

      <div className="brand-foot">
        {links?.github && (
          <a href={links.github} target="_blank" rel="noreferrer noopener" aria-label="GitHub 仓库" title="GitHub">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
          </a>
        )}
        {links?.contact && (
          <a href={links.contact} aria-label="联系站长" title="联系">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Zm2.2-.5 6.8 5 6.8-5H5.2Zm15.8 2.1-7.5 5.5a1 1 0 0 1-1.2 0L4.8 8.1V17.5c0 .3.2.5.5.5h13.2c.3 0 .5-.2.5-.5V8.1Z" />
            </svg>
          </a>
        )}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('fliex:immersive'))}
          aria-label="进入沉浸模式（F）"
          title="沉浸模式（F）"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
