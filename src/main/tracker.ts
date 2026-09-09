import { screen } from 'electron'

/**
 * カーソル位置の取得とグローバルクリックの検知。
 *
 * 位置の取得元は 2 つある。
 *  1. screen.getCursorScreenPoint() のポーリング (既定)
 *     DIP 座標がそのまま得られるので、HiDPI / 複数ディスプレイでもズレない。
 *  2. ネイティブフック (uiohook-napi) の mousemove
 *     WSLg など、1 が更新されない環境向けのフォールバック。
 *     物理ピクセルで届くので DIP に直してから使う。
 *
 * 2 は「ポーリングがずっと同じ値のままなのにフックだけ動いている」ことを
 * 確認できたときだけ有効にする。通常環境では 1 だけが使われる。
 */

/** 約 125Hz。描画側で補間するので、これ以上速くしても見た目は変わらない。 */
const POLL_INTERVAL_MS = 8
/** ポーリングが固まっていると判断するまでの時間 */
const STALE_POLL_MS = 500
/** 同時に必要なフックの移動イベント数 (単なる静止と区別するため) */
const STALE_HOOK_MOVES = 5

type UiohookModule = typeof import('uiohook-napi')

let uiohook: UiohookModule | null = null
let hookStarted = false

let pollTimer: ReturnType<typeof setInterval> | null = null
let lastX = Number.NaN
let lastY = Number.NaN
let lastPollChangeAt = 0

let useHookPosition = false
let hookMovesSincePollChange = 0

let onMove: (x: number, y: number) => void = () => {}
let onClick: () => void = () => {}

export function setTrackerHandlers(move: (x: number, y: number) => void, click: () => void): void {
  onMove = move
  onClick = click
}

/** フックの物理ピクセル座標を Electron の DIP 座標へ変換する */
function toDipPoint(x: number, y: number): { x: number; y: number } {
  if (process.platform === 'win32') {
    return screen.screenToDipPoint({ x, y })
  }
  if (process.platform === 'linux') {
    // Chromium の X11 バックエンドはスケールが 1 つだけ
    const scale = screen.getPrimaryDisplay().scaleFactor || 1
    return scale === 1 ? { x, y } : { x: Math.round(x / scale), y: Math.round(y / scale) }
  }
  // macOS のフック座標はすでにポイント単位
  return { x, y }
}

function handleHookMove(x: number, y: number): void {
  if (!useHookPosition) {
    hookMovesSincePollChange += 1
    const pollLooksFrozen =
      lastPollChangeAt > 0 &&
      Date.now() - lastPollChangeAt > STALE_POLL_MS &&
      hookMovesSincePollChange >= STALE_HOOK_MOVES
    if (!pollLooksFrozen) return
    useHookPosition = true
    console.info('[tracker] カーソル位置の取得をネイティブフックに切り替えました')
  }
  const point = toDipPoint(x, y)
  onMove(point.x, point.y)
}

/** ネイティブフックを読み込む。失敗しても例外は投げず false を返す。 */
export async function initHook(): Promise<boolean> {
  try {
    uiohook = await import('uiohook-napi')
    uiohook.uIOhook.on('mousedown', () => onClick())
    uiohook.uIOhook.on('mousemove', (event) => handleHookMove(event.x, event.y))
    return true
  } catch (error) {
    console.warn('[tracker] グローバルフックを利用できません:', error)
    uiohook = null
    return false
  }
}

/**
 * フックスレッドの起動。start / stop を繰り返すと不安定な環境があるため、
 * 一度起動したらアプリ終了まで動かしたままにし、配信側で ON/OFF を判断する。
 */
export function startHook(): void {
  if (!uiohook || hookStarted) return
  try {
    uiohook.uIOhook.start()
    hookStarted = true
  } catch (error) {
    console.error('[tracker] フックの開始に失敗しました', error)
  }
}

export function stopHook(): void {
  if (!uiohook || !hookStarted) return
  try {
    uiohook.uIOhook.stop()
  } catch (error) {
    console.error('[tracker] フックの停止に失敗しました', error)
  }
  hookStarted = false
}

export function startTracking(): void {
  if (pollTimer) return
  lastX = Number.NaN
  lastY = Number.NaN
  pollTimer = setInterval(() => {
    const point = screen.getCursorScreenPoint()
    // 動いていないときは IPC を流さない
    if (point.x === lastX && point.y === lastY) return
    lastX = point.x
    lastY = point.y
    lastPollChangeAt = Date.now()
    hookMovesSincePollChange = 0
    useHookPosition = false
    onMove(point.x, point.y)
  }, POLL_INTERVAL_MS)
}

export function stopTracking(): void {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}
