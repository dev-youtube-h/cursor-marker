import { BrowserWindow, Display, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getSettings } from './settings'

/**
 * 透明・クリックスルーのオーバーレイウィンドウ。
 *
 * 全ディスプレイを 1 枚の巨大なウィンドウで覆うと、Windows では
 * プライマリディスプレイの作業領域までサイズが切り詰められてしまう
 * (3 画面 7040x1440 に対して 2560x1392 になった)。
 * そのため **ディスプレイごとに 1 枚** 作り、カーソルがいる画面にだけ座標を送る。
 * ディスプレイごとの DPI もこの方が正しく扱える。
 *
 * ウィンドウ自体は動かさず、中のマーカーを transform で動かす (この方が圧倒的に滑らか)。
 */

type Overlay = {
  win: BrowserWindow
  displayId: number
  origin: { x: number; y: number }
  ready: boolean
}

let overlays: Overlay[] = []
/** いまカーソルがいるディスプレイ */
let activeDisplayId: number | null = null
let visible = false
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function createOverlayFor(display: Display): Overlay {
  const { x, y, width, height } = display.bounds

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    acceptFirstMouse: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // 非フォーカス時でも requestAnimationFrame を止めない
      backgroundThrottling: false
    }
  })

  // マウスイベントを一切拾わない = 下のウィンドウを普通に操作できる
  win.setIgnoreMouseEvents(true)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // 作業領域に切り詰められることがあるので、生成後にもう一度だけ指定する
  win.setBounds({ x, y, width, height })

  const overlay: Overlay = { win, displayId: display.id, origin: { x, y }, ready: false }

  win.webContents.on('did-finish-load', () => {
    overlay.ready = true
    win.webContents.send('marker:settings', getSettings())
    // マウスを動かさなくてもマーカーが出るように、現在位置を一度送る
    pushCurrentCursor()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  return overlay
}

function destroyOverlays(): void {
  for (const overlay of overlays) {
    if (!overlay.win.isDestroyed()) overlay.win.destroy()
  }
  overlays = []
  activeDisplayId = null
}

export function createOverlays(): void {
  destroyOverlays()
  overlays = screen.getAllDisplays().map(createOverlayFor)
  if (visible) setOverlayVisible(true)

  if (refreshTimer === null) {
    const refresh = (): void => {
      // display-metrics-changed は連続して飛んでくるのでまとめる
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        createOverlays()
      }, 300)
    }
    screen.on('display-added', refresh)
    screen.on('display-removed', refresh)
    screen.on('display-metrics-changed', refresh)
  }
}

export function setOverlayVisible(next: boolean): void {
  visible = next
  for (const overlay of overlays) {
    if (next) {
      // showInactive: フォーカスを奪わずに表示する
      overlay.win.showInactive()
      overlay.win.setAlwaysOnTop(true, 'screen-saver')
    } else {
      overlay.win.hide()
    }
  }
  if (next) pushCurrentCursor()
  else activeDisplayId = null
}

export function pushCursor(x: number, y: number): void {
  if (!visible || overlays.length === 0) return

  const display = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) })

  if (activeDisplayId !== null && activeDisplayId !== display.id) {
    // 画面をまたいだので、前の画面のマーカーは消す
    const previous = overlays.find((o) => o.displayId === activeDisplayId)
    if (previous?.ready) previous.win.webContents.send('marker:leave')
  }
  activeDisplayId = display.id

  const current = overlays.find((o) => o.displayId === display.id)
  if (current?.ready) {
    current.win.webContents.send('marker:cursor', x - current.origin.x, y - current.origin.y)
  }
}

/** いまのカーソル位置を一度だけ送る (起動直後・表示直後用) */
export function pushCurrentCursor(): void {
  const point = screen.getCursorScreenPoint()
  pushCursor(point.x, point.y)
}

export function pushClick(): void {
  if (!visible || activeDisplayId === null) return
  const current = overlays.find((o) => o.displayId === activeDisplayId)
  if (current?.ready) current.win.webContents.send('marker:click')
}

export function pushSettings(): void {
  for (const overlay of overlays) {
    if (overlay.ready) overlay.win.webContents.send('marker:settings', getSettings())
  }
}
