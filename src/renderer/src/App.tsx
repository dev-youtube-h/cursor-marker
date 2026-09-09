import { useEffect, useState } from 'react'
import ControlBar from './components/ControlBar'
import SettingsPanel from './components/SettingsPanel'

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<MarkerSettings | null>(null)
  const [clickFlashSupported, setClickFlashSupported] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    window.api.marker.getState().then((state) => {
      setSettings(state.settings)
      setClickFlashSupported(state.clickFlashSupported)
    })
  }, [])

  // 楽観的に反映してからメインへ送る (スライダー操作が引っかからないように)
  const change = (patch: Partial<MarkerSettings>): void => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
    void window.api.marker.setSettings(patch)
  }

  const togglePanel = (): void => {
    const open = !panelOpen
    setPanelOpen(open)
    // ウィンドウの高さもメイン側で合わせる
    window.api.marker.setPanelOpen(open)
  }

  return (
    <div className="shell">
      <ControlBar
        enabled={settings?.enabled ?? false}
        panelOpen={panelOpen}
        onToggleEnabled={() => settings && change({ enabled: !settings.enabled })}
        onTogglePanel={togglePanel}
      />
      {panelOpen && settings && (
        <SettingsPanel
          settings={settings}
          clickFlashSupported={clickFlashSupported}
          onChange={change}
        />
      )}
    </div>
  )
}

export default App
