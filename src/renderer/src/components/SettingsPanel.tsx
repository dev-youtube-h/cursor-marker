const SIZE_MIN = 12
const SIZE_MAX = 200

/** main 側の DEFAULT_SETTINGS と揃えておく */
const DEFAULTS = { size: 48, color: '#ffd93d', clickFlash: true }

const PRESET_COLORS = ['#ffd93d', '#ff6b6b', '#4ade80', '#38bdf8', '#a78bfa', '#fb923c', '#ffffff']

type Props = {
  settings: MarkerSettings
  clickFlashSupported: boolean
  onChange: (patch: Partial<MarkerSettings>) => void
}

function SettingsPanel({ settings, clickFlashSupported, onChange }: Props): React.JSX.Element {
  const { size, color, clickFlash } = settings
  // プレビュー枠に収まるように縮めて表示する
  const previewSize = Math.min(size, 84)

  return (
    <div className="panel">
      <div className="preview">
        <div
          className="preview__marker"
          style={{
            width: previewSize,
            height: previewSize,
            boxSizing: 'border-box',
            border: `${Math.max(2, previewSize * 0.055)}px solid color-mix(in srgb, ${color} 80%, transparent)`,
            background: `radial-gradient(circle, color-mix(in srgb, ${color} 40%, transparent) 0%, color-mix(in srgb, ${color} 16%, transparent) 62%, transparent 73%)`,
            boxShadow: `0 0 ${previewSize * 0.3}px color-mix(in srgb, ${color} 45%, transparent)`
          }}
        />
        <span className="preview__cursor">↖</span>
      </div>

      <div className="field">
        <div className="field__head">
          <span className="field__label">マーカーのサイズ</span>
          <span className="field__value">{size} px</span>
        </div>
        <input
          type="range"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={1}
          value={size}
          onChange={(e) => onChange({ size: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <div className="field__head">
          <span className="field__label">マーカーの色</span>
          <span className="field__value">{color.toUpperCase()}</span>
        </div>
        <div className="swatches">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              title={preset}
              className={`swatch ${color.toLowerCase() === preset ? 'is-active' : ''}`}
              style={{ background: preset }}
              onClick={() => onChange({ color: preset })}
            />
          ))}
          <input
            type="color"
            className="swatch--custom"
            value={color}
            title="自由に選ぶ"
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <div className="switchrow">
          <span className="field__label">クリック時に光る</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={clickFlash && clickFlashSupported}
              disabled={!clickFlashSupported}
              onChange={(e) => onChange({ clickFlash: e.target.checked })}
            />
            <span className="switch__track" />
            <span className="switch__knob" />
          </label>
        </div>
        {!clickFlashSupported && (
          <p className="field__note">
            この環境ではグローバルなクリック検知を利用できないため、光る演出は無効です。
          </p>
        )}
      </div>

      <div className="panel__footer">
        <button type="button" className="linkbtn" onClick={() => onChange(DEFAULTS)}>
          既定値に戻す
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
