/* Fliex Music — 应用外壳：一个舞台，三种侧面板
   Listen（播放列表 + 档案）/ Discover / Customize 共享同一深空舞台，
   切换面板不中断播放；沉浸模式隐藏导航与面板，只留音乐与歌词。 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { engine } from '../audio/AudioEngine'
import { PlayerProvider, useApp } from './PlayerProvider'
import { BrandNav } from '../components/BrandNav/BrandNav'
import { LyricStage } from '../components/LyricStage/LyricStage'
import { FloatingPlayer } from '../components/FloatingPlayer/FloatingPlayer'
import { MusicPanel } from '../components/MusicPanel/MusicPanel'
import { ArchiveEntry, ArchiveList } from '../components/ListeningArchive/ListeningArchive'
import { DiscoverPanel } from '../components/DiscoverPanel/DiscoverPanel'
import { CustomizePanel } from '../components/CustomizePanel/CustomizePanel'
import { Backdrop } from '../visual/Backdrop'

export type Panel = 'music' | 'discover' | 'customize'
type WorkspaceMode = 'music' | 'archive'

interface UIState {
  panel: Panel
  openPanel: (panel: Panel) => void
  immersive: boolean
  toggleImmersive: () => void
}

const UIContext = createContext<UIState>({ panel: 'music', openPanel: () => {}, immersive: false, toggleImmersive: () => {} })
const useUI = (): UIState => useContext(UIContext)

function Stage(): React.JSX.Element {
  const { configError, data } = useApp()
  const { openPanel } = useUI()

  return (
    <main className="stage">
      {configError ? (
        <div className="stage-error" role="alert">
          <p>{configError}</p>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      ) : !data ? (
        <p className="stage-loading" aria-live="polite">正在建立连接…</p>
      ) : (
        <LyricStage />
      )}
      <button className="workspace-toggle" onClick={() => openPanel('music')} aria-label="打开播放列表">☰ 播放列表</button>
      <FloatingPlayer onOpenPanel={() => openPanel('music')} />
    </main>
  )
}

function Workspace({ mode, setMode }: { mode: WorkspaceMode; setMode: (m: WorkspaceMode) => void }): React.JSX.Element {
  return (
    <>
      <div className="workspace-pane" hidden={mode !== 'music'}>
        <MusicPanel />
        <ArchiveEntry onOpen={() => setMode('archive')} />
      </div>
      <div className="workspace-pane" hidden={mode !== 'archive'}>
        <ArchiveList onBack={() => setMode('music')} />
      </div>
    </>
  )
}

function SidePanel({ drawerOpen, onClose }: { drawerOpen: boolean; onClose: () => void }): React.JSX.Element {
  const { panel, openPanel } = useUI()
  const [archiveMode, setArchiveMode] = useState<WorkspaceMode>('music')
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (panel !== 'music') setArchiveMode('music')
  }, [panel])

  // 面板切换时聚焦容器，保证键盘用户进入面板上下文
  useEffect(() => {
    if (panel !== 'music') panelRef.current?.focus({ preventScroll: true })
  }, [panel])

  return (
    <aside className={`workspace${drawerOpen ? ' is-open' : ''}`} id="workspace" ref={panelRef} tabIndex={-1} aria-label={panel === 'music' ? '音乐工作区' : panel === 'discover' ? 'Discover 音乐空间' : 'Customize 自定义'}>
      <button className="workspace-close" onClick={onClose} aria-label="收起面板">✕</button>
      {panel === 'music' && <Workspace mode={archiveMode} setMode={setArchiveMode} />}
      {panel === 'discover' && <DiscoverPanel onClose={() => openPanel('music')} />}
      {panel === 'customize' && <CustomizePanel onClose={() => openPanel('music')} />}
    </aside>
  )
}

function Shell(): React.JSX.Element {
  const [panel, setPanel] = useState<Panel>('music')
  const [immersive, setImmersive] = useState(false)
  // 手机布局下的工作区抽屉开关；桌面布局始终显示工作区，忽略此状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { preferences } = useApp()
  const navVisible = preferences.navVisible && !immersive

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (e.key === 'Escape') {
        setImmersive(false)
        setDrawerOpen(false)
        if (panel !== 'music') setPanel('music')
        return
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || el?.isContentEditable) return
      if (e.code === 'Space') {
        e.preventDefault()
        engine.toggle()
      } else if (e.key === 'ArrowRight') engine.next()
      else if (e.key === 'ArrowLeft') engine.previous()
      else if (e.key.toLowerCase() === 'f') setImmersive(v => !v)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel])

  const openPanel = useCallback((next: Panel) => {
    setPanel(next)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    const onImmersive = () => setImmersive(v => !v)
    document.addEventListener('fliex:immersive', onImmersive)
    return () => document.removeEventListener('fliex:immersive', onImmersive)
  }, [])

  return (
    <UIContext.Provider value={{ panel, openPanel, immersive, toggleImmersive: () => setImmersive(v => !v) }}>
      <Backdrop />
      <div className={`app${immersive ? ' is-immersive' : ''}${navVisible ? '' : ' nav-hidden'}`} data-panel={panel}>
        {navVisible && <BrandNav panel={panel} onNavigate={openPanel} />}
        <Stage />
        {!immersive && (
          <>
            <div className={`workspace-scrim${drawerOpen ? ' is-open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
            <SidePanel drawerOpen={drawerOpen} onClose={closeDrawer} />
          </>
        )}
        {immersive && (
          <button className="immersive-exit" onClick={() => setImmersive(false)} aria-label="退出沉浸模式">
            ⤢ 退出沉浸 · Esc
          </button>
        )}
      </div>
    </UIContext.Provider>
  )
}

export function App(): React.JSX.Element {
  return (
    <PlayerProvider>
      <Shell />
    </PlayerProvider>
  )
}
