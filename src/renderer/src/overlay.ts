import './assets/overlay.css'

/**
 * マーカー描画ループ。
 *
 * メインプロセスからのカーソル座標は 8ms 間隔で届くが、高負荷時は間隔が乱れる。
 * そのままの座標を描くとカクつくので、
 *   1. 直近 2 サンプルから速度を求めて、受信からの経過時間ぶんだけ位置を先読み
 *   2. 指数平滑でその目標へ寄せる (時定数が小さいのでほぼ遅延なし)
 * を requestAnimationFrame 側で行い、IPC のゆらぎを描画から切り離している。
 */

/** 先読みの上限 (ms)。大きすぎると急な反転で行き過ぎる。 */
const MAX_LEAD_MS = 20
/** 先読みの効き具合 */
const LEAD_GAIN = 0.6
/** 追従の時定数 (ms)。小さいほど食いつきが良い。 */
const FOLLOW_TAU_MS = 8
/** これ以上離れたらワープ扱い (ディスプレイ間移動など) */
const SNAP_DISTANCE = 320
/** クリック演出の長さ (ms) */
const FLASH_DURATION_MS = 420

const root = document.getElementById('marker') as HTMLElement
const ring = document.getElementById('ring') as HTMLElement
const glow = document.getElementById('glow') as HTMLElement

// 直近サンプル / その 1 つ前
let sampleX = 0
let sampleY = 0
let sampleT = 0
let prevX = 0
let prevY = 0
let prevT = 0

// 実際に描画している位置
let drawX = 0
let drawY = 0

let hasSample = false
let flashStart = -1
let flashActive = false
let lastFrame = performance.now()

let settings: MarkerSettings | null = null

function applySettings(next: MarkerSettings): void {
  settings = next
  root.style.setProperty('--size', `${next.size}px`)
  root.style.setProperty('--color', next.color)
}

window.api.marker.onSettings(applySettings)
window.api.marker.getState().then((state) => applySettings(state.settings))

window.api.marker.onCursor((x, y) => {
  prevX = sampleX
  prevY = sampleY
  prevT = sampleT
  sampleX = x
  sampleY = y
  sampleT = performance.now()

  if (!hasSample) {
    prevX = x
    prevY = y
    prevT = sampleT - 16
    drawX = x
    drawY = y
    hasSample = true
    root.classList.add('is-ready')
  }
})

window.api.marker.onLeave(() => {
  // カーソルが別のディスプレイへ移ったので、この画面のマーカーは消す
  hasSample = false
  flashActive = false
  root.classList.remove('is-ready')
})

window.api.marker.onClick(() => {
  if (!settings?.clickFlash) return
  flashStart = performance.now()
  flashActive = true
})

function renderFlash(now: number): void {
  const progress = (now - flashStart) / FLASH_DURATION_MS

  if (progress >= 1) {
    flashActive = false
    ring.style.opacity = '0'
    glow.style.opacity = '0'
    return
  }

  const eased = 1 - Math.pow(1 - progress, 3)
  const fade = 1 - progress

  ring.style.opacity = String(0.85 * fade)
  ring.style.transform = `translate(-50%, -50%) scale(${1 + 1.9 * eased})`
  glow.style.opacity = String(0.55 * fade * fade)
  glow.style.transform = `translate(-50%, -50%) scale(${0.55 + 0.55 * eased})`
}

function frame(now: number): void {
  requestAnimationFrame(frame)

  const dt = Math.min(now - lastFrame, 64)
  lastFrame = now

  if (hasSample) {
    // 直近 2 サンプルから速度 (px/ms) を求める
    const sampleDt = sampleT - prevT
    let vx = 0
    let vy = 0
    if (sampleDt > 0 && sampleDt < 80) {
      vx = (sampleX - prevX) / sampleDt
      vy = (sampleY - prevY) / sampleDt
    }

    // 受信から経過したぶんだけ先読みして、ポーリング遅延を打ち消す
    const lead = Math.min(Math.max(now - sampleT, 0), MAX_LEAD_MS) * LEAD_GAIN
    const goalX = sampleX + vx * lead
    const goalY = sampleY + vy * lead

    const dx = goalX - drawX
    const dy = goalY - drawY

    if (dx * dx + dy * dy > SNAP_DISTANCE * SNAP_DISTANCE) {
      drawX = goalX
      drawY = goalY
    } else {
      // フレーム間隔に依存しない指数平滑 (コマ落ちしても速度が変わらない)
      const alpha = 1 - Math.exp(-dt / FOLLOW_TAU_MS)
      drawX += dx * alpha
      drawY += dy * alpha
    }

    root.style.transform = `translate3d(${drawX.toFixed(2)}px, ${drawY.toFixed(2)}px, 0)`
  }

  if (flashActive) renderFlash(now)
}

requestAnimationFrame(frame)
