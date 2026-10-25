/* Fliex Music — Discover：作品展示与交流入口（宽幅右侧浮层）
   PERSONAL SPACES 只展示配置里的作品（当前两个：本站 + 博客）：
   - linkType=internal：点击关闭面板返回 Listen（音乐不中断）
   - linkType=external：新标签页打开外部站点
   另有 Guestbook（@giscus/react + GitHub Discussions）与 Share。 */

import Giscus from '@giscus/react'
import { useState } from 'react'
import { resolveAsset } from '../../data/loadConfig'
import { useApp } from '../../app/PlayerProvider'
import { PanelHeader } from '../settings/controls'

type Tab = 'spaces' | 'guestbook' | 'share'

/* 无真实截图时的简洁视觉占位（保留 spaces.json image 字段随时替换） */
function SpaceMark({ variant }: { variant: 'orb' | 'doc' }) {
  if (variant === 'doc') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="13" y="9" width="22" height="30" rx="2" fill="none" stroke="rgba(230,233,237,.4)" strokeWidth="1" />
        <path d="M18 16h12M18 21h12M18 26h8" stroke="rgba(230,233,237,.28)" strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="30" cy="33" r="1.4" fill="rgba(240,243,247,.7)" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="26" r="12" fill="none" stroke="rgba(230,233,237,.42)" strokeWidth="1" />
      <ellipse cx="24" cy="26" rx="12" ry="4.4" fill="none" stroke="rgba(230,233,237,.24)" strokeWidth="0.8" />
      <ellipse cx="24" cy="26" rx="4.4" ry="12" fill="none" stroke="rgba(230,233,237,.24)" strokeWidth="0.8" />
      <ellipse cx="24" cy="22" rx="21" ry="6" fill="none" stroke="rgba(230,233,237,.18)" strokeWidth="0.8" />
      <circle cx="43" cy="18.5" r="1.5" fill="rgba(240,243,247,.75)" />
    </svg>
  )
}

export function DiscoverPanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { data } = useApp()
  const [tab, setTab] = useState<Tab>('spaces')
  const giscus = data?.site.giscus ?? null

  const copy = async (text: string, note: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(note)
    } catch {
      setStatus('复制失败：浏览器限制了剪贴板访问。')
    }
    setTimeout(() => setStatus(''), 2600)
  }
  const [status, setStatus] = useState('')

  const readmeUrl = data?.site.links.github ? `${data.site.links.github.replace(/\/$/, '')}/blob/main/fliex-music/README.md` : null
  const spaces = data?.spaces ?? []

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} className={`side-tabbtn${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}>
      {label}
    </button>
  )

  return (
    <section className="side-panel" role="dialog" aria-modal="false" aria-label="Discover 作品展示" tabIndex={-1}>
      <PanelHeader kicker="FLIEX MUSIC / 002" title="Discover." sub="Somewhere, someone is listening." onClose={onClose} />

      <div className="side-tabs" role="tablist" aria-label="Discover 分组">
        {tabBtn('spaces', 'Music Spaces')}
        {tabBtn('guestbook', 'Guestbook')}
        {tabBtn('share', 'Share')}
      </div>

      <div className="side-body">
        {tab === 'spaces' && (
          <>
            <p className="side-section">PERSONAL SPACES / 001—{String(Math.max(spaces.length, 1)).padStart(3, '0')}</p>
            {spaces.length === 0 ? (
              <p className="side-empty">还没有收录作品。站点作者可在 public/config/spaces.json 中添加。</p>
            ) : (
              <ul className="works">
                {spaces.map(space => {
                  const internal = space.linkType === 'internal'
                  const cover = (
                    <span className="work-cover" aria-hidden="true">
                      {space.image
                        ? <img src={resolveAsset(space.image)} alt="" loading="lazy" />
                        : <SpaceMark variant={internal ? 'orb' : 'doc'} />}
                    </span>
                  )
                  const info = (
                    <span className="work-info">
                      <span className="work-line">
                        <span className="work-name">{space.name}</span>
                        {space.category && <i className="work-category">{space.category}</i>}
                      </span>
                      <span className="work-desc">{space.description}</span>
                      <span className="work-visit">{internal ? '进入 Listen →' : '访问 ↗'}</span>
                    </span>
                  )
                  return (
                    <li key={space.id} className="work">
                      {internal ? (
                        <button className="work-card" onClick={onClose} title="回到 Listen 主界面">
                          {cover}
                          {info}
                        </button>
                      ) : (
                        <a className="work-card" href={space.url} target="_blank" rel="noreferrer noopener" title={space.url}>
                          {cover}
                          {info}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="side-note">新作品会随配置更新出现在这里，不展示无法访问的占位项目。</p>
          </>
        )}

        {tab === 'guestbook' && (
          <>
            <p className="side-kicker gb-kicker">GUESTBOOK</p>
            <h3 className="gb-title">Leave a signal.</h3>
            <p className="gb-sub">如果你曾在这里停留，可以留下几句话。</p>
            {!giscus ? (
              <div className="gb-state">
                <p className="gb-state-line">留言暂未开放。</p>
                <p className="gb-state-sub">站长开启后，这里会变成一面留言墙。</p>
                <button className="cz-mini" onClick={() => setTab('spaces')}>← 回到作品</button>
              </div>
            ) : (
              <div className="giscus-box gb-live">
                <Giscus
                  repo={giscus.repo as `${string}/${string}`}
                  repoId={giscus.repoId}
                  category={giscus.category}
                  categoryId={giscus.categoryId}
                  mapping="specific"
                  term={giscus.term ?? 'Fliex Music Guestbook'}
                  strict={giscus.strict === '0' ? '0' : '1'}
                  reactionsEnabled="1"
                  emitMetadata="0"
                  inputPosition={giscus.inputPosition ?? 'bottom'}
                  theme="noborder_dark"
                  lang="zh-CN"

                />
              </div>
            )}
          </>
        )}

        {tab === 'share' && (
          <>
            <p className="side-section">SHARE</p>
            <p className="side-lead">把这个世界分享给别人。</p>
            <div className="share-actions">
              <button className="cz-mini" onClick={() => copy(window.location.href.split('#')[0], '站点链接已复制。')}>
                复制站点链接
              </button>
              {data?.site.links.github && (
                <button className="cz-mini" onClick={() => copy(data.site.links.github!, '仓库地址已复制。')}>
                  复制仓库地址
                </button>
              )}
              {data?.site.links.submit && (
                <a className="side-cta" href={data.site.links.submit} target="_blank" rel="noreferrer noopener">
                  提交作品 ↗
                </a>
              )}
              {readmeUrl && (
                <a className="cz-mini" href={readmeUrl} target="_blank" rel="noreferrer noopener">
                  阅读使用说明 ↗
                </a>
              )}
            </div>
            {status && <p className="cz-status" role="status">{status}</p>}
            <p className="side-note">外链均以新标签页打开；不自动抓取第三方页面内容。</p>
          </>
        )}
      </div>
    </section>
  )
}
