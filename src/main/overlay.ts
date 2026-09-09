import { BrowserWindow, Rectangle, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getSettings } from './settings'

/**
 * 全ディスプレイを覆う透明・クリックスルーのオーバーレイウィンドウ。
 * ウィンドウ自体は動かさず、中のマーカーを transform で動かす (この方が圧倒的に滑らか)。
 */

let overlay: BrowserWindow | null = null
let origin = { x: 0, y: 0 }
let ready = false

/** 全ディスプレイを内包する矩形 (DIP) */
function desktopBounds(): Rectangle {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const display of screen.getAllDisplays()) {
    const b = display.bounds
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }

  if (!Number.isFinite(minX)) {
    const primary = screen.getPrimaryDisplay().bounds
    return { ...primary }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function createOverlay(): BrowserWindow {
  const bounds = desktopBounds()
  origin = { x: bounds.x, y: bounds.y }

  overlay = new BrowserWindow({
    ...bounds,
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
  overlay.setIgnoreMouseEvents(true)
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  overlay.webContents.on('did-finish-load', () => {
    ready = true
    pushSettings()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlay.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    overlay.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  const refresh = (): void => refreshBounds()
  screen.on('display-added', refresh)
  screen.on('display-removed', refresh)
  screen.on('display-metrics-changed', refresh)

  overlay.on('closed', () => {
    overlay = null
    ready = false
    screen.off('display-added', refresh)
    screen.off('display-removed', refresh)
    screen.off('display-metrics-changed', refresh)
  })

  return overlay
}

/** ディスプレイ構成が変わったら覆う範囲を作り直す */
export function refreshBounds(): void {
  if (!overlay) return
  const bounds = desktopBounds()
  origin = { x: bounds.x, y: bounds.y }
  overlay.setBounds(bounds)
}

export function setOverlayVisible(visible: boolean): void {
  if (!overlay) return
  if (visible) {
    // showInactive: フォーカスを奪わずに表示する
    overlay.showInactive()
    overlay.setAlwaysOnTop(true, 'screen-saver')
  } else {
    overlay.hide()
  }
}

export function pushCursor(x: number, y: number): void {
  if (!overlay || !ready) return
  overlay.webContents.send('marker:cursor', x - origin.x, y - origin.y)
}

export function pushClick(): void {
  if (!overlay || !ready) return
  overlay.webContents.send('marker:click')
}

export function pushSettings(): void {
  if (!overlay || !ready) return
  overlay.webContents.send('marker:settings', getSettings())
}
