/* Fliex Music — 左上终端状态区
   只显示真实状态（引擎状态 / 曲目序号 / 信号），3-4 行、位置固定。 */

import { useApp } from '../../app/PlayerProvider'

export function TerminalStatus(): React.JSX.Element | null {
  const { snapshot, data } = useApp()
  if (!data) return null
  const total = snapshot.songs.length
  const engineState =
    snapshot.status === 'error' ? 'error'
    : snapshot.status === 'loading' ? 'loading'
    : snapshot.status === 'playing' ? 'playing'
    : snapshot.status === 'ready' ? 'paused'
    : total ? 'ready' : 'standby'
  const signal = snapshot.status === 'error' ? 'error' : snapshot.status === 'playing' ? 'connected' : total ? 'standby' : 'no-signal'
  const track = total ? `${String(snapshot.index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}` : '-- / --'

  return (
    <div className="terminal" aria-hidden="true">
      <p>&gt; system.init()</p>
      <p>&gt; audio.engine : {engineState}</p>
      <p>&gt; track : {track}</p>
      <p>&gt; signal : {signal}</p>
    </div>
  )
}
