type Props = {
  enabled: boolean
  panelOpen: boolean
  onToggleEnabled: () => void
  onTogglePanel: () => void
}

function ControlBar({
  enabled,
  panelOpen,
  onToggleEnabled,
  onTogglePanel
}: Props): React.JSX.Element {
  return (
    <div className={`bar ${panelOpen ? 'bar--split' : ''}`}>
      <button
        type="button"
        className={`power ${enabled ? 'is-on' : ''}`}
        onClick={onToggleEnabled}
        title="マーカーの表示を切り替え"
      >
        <span className="power__dot" />
        {enabled ? 'ON' : 'OFF'}
      </button>

      <span className="bar__title">カーソルマーカー</span>

      <button
        type="button"
        className={`iconbtn ${panelOpen ? 'is-active' : ''}`}
        onClick={onTogglePanel}
        title="設定"
      >
        ⚙
      </button>
      <button
        type="button"
        className="iconbtn"
        onClick={() => window.api.marker.minimize()}
        title="最小化"
      >
        ―
      </button>
      <button
        type="button"
        className="iconbtn iconbtn--close"
        onClick={() => window.api.marker.close()}
        title="終了"
      >
        ✕
      </button>
    </div>
  )
}

export default ControlBar
