import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ControlBar from './components/ControlBar'
import SettingsPanel from './components/SettingsPanel'

/** .panel の上下パディング (app.css と合わせる) */
const PANEL_PADDING = 28

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<MarkerSettings | null>(null)
  const [clickFlashSupported, setClickFlashSupported] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)
  // 設定を読み込むまでパネルの中身は描画されないので、読み込み完了も依存に含める
  const hasSettings = settings !== null

  useEffect(() => {
    window.api.marker.getState().then((state) => {
      setSettings(state.settings)
      setClickFlashSupported(state.clickFlashSupported)
    })
  }, [])

  // ウィンドウ高さは中身の実測値に合わせる。
  // フォントが環境によって変わってもスクロールバーが出ない。
  useLayoutEffect(() => {
    if (!panelOpen) {
      window.api.marker.setPanelHeight(0)
      return
    }
    const inner = innerRef.current
    if (!inner) return

    const report = (): void => {
      window.api.marker.setPanelHeight(
        Math.ceil(inner.getBoundingClientRect().height) + PANEL_PADDING
      )
    }
    report()

    const observer = new ResizeObserver(report)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [panelOpen, hasSettings, clickFlashSupported])

  // 楽観的に反映してからメインへ送る (スライダー操作が引っかからないように)
  const change = (patch: Partial<MarkerSettings>): void => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
    void window.api.marker.setSettings(patch)
  }

  return (
    <div className="shell">
      <ControlBar
        enabled={settings?.enabled ?? false}
        panelOpen={panelOpen}
        onToggleEnabled={() => settings && change({ enabled: !settings.enabled })}
        onTogglePanel={() => setPanelOpen((open) => !open)}
      />
      {panelOpen && settings && (
        <div className="panel">
          <div className="panel__inner" ref={innerRef}>
            <SettingsPanel
              settings={settings}
              clickFlashSupported={clickFlashSupported}
              onChange={change}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
