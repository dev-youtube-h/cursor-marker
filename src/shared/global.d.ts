import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  /** マーカーの見た目と挙動。main / preload / renderer で共有する。 */
  interface MarkerSettings {
    /** マーカー表示の ON / OFF */
    enabled: boolean
    /** マーカーの直径 (CSS px) */
    size: number
    /** マーカーの色 (#rrggbb) */
    color: string
    /** クリック時に光らせるか */
    clickFlash: boolean
  }

  interface MarkerState {
    settings: MarkerSettings
    /** グローバルマウスフックが使える環境か (使えない場合は光る演出が無効) */
    clickFlashSupported: boolean
  }

  interface MarkerApi {
    getState: () => Promise<MarkerState>
    setSettings: (patch: Partial<MarkerSettings>) => Promise<MarkerSettings>
    /** オーバーレイ用: 設定変更の購読。戻り値を呼ぶと解除。 */
    onSettings: (cb: (settings: MarkerSettings) => void) => () => void
    /** オーバーレイ用: カーソル座標 (オーバーレイ内のローカル座標) */
    onCursor: (cb: (x: number, y: number) => void) => () => void
    /** オーバーレイ用: グローバルクリック */
    onClick: (cb: () => void) => () => void
    /** オーバーレイ用: カーソルが別のディスプレイへ移った (マーカーを消す) */
    onLeave: (cb: () => void) => () => void
    /** 設定パネルの中身の高さに合わせてウィンドウ高さを変える (0 でバーのみ) */
    setPanelHeight: (height: number) => void
    minimize: () => void
    close: () => void
  }

  interface Window {
    electron: ElectronAPI
    api: { marker: MarkerApi }
  }
}
