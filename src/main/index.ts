import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getSettings, saveSettings, updateSettings } from './settings'
import { createOverlay, pushClick, pushCursor, pushSettings, setOverlayVisible } from './overlay'
import {
  initHook,
  setTrackerHandlers,
  startHook,
  startTracking,
  stopHook,
  stopTracking
} from './tracker'

const CONTROL_WIDTH = 320
const BAR_HEIGHT = 54
const PANEL_HEIGHT = 378

// 追従が重くならないよう、レンダラのスロットリングを止めておく
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
}

let controlWindow: BrowserWindow | null = null
let clickFlashSupported = false

function createControlWindow(): void {
  controlWindow = new BrowserWindow({
    width: CONTROL_WIDTH,
    height: BAR_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  controlWindow.on('ready-to-show', () => {
    controlWindow?.show()
  })

  controlWindow.on('closed', () => {
    controlWindow = null
    app.quit()
  })

  // アプリ内にリンクは無いので、新規ウィンドウ要求はすべて拒否する
  controlWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    controlWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    controlWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** resizable:false のままだと setSize が効かない環境があるので一時的に解除する */
function setControlHeight(height: number): void {
  if (!controlWindow) return
  controlWindow.setResizable(true)
  controlWindow.setSize(CONTROL_WIDTH, height, false)
  controlWindow.setResizable(false)
}

/**
 * グローバル入力フックは「マーカー ON」かつ「クリック時に光る ON」のときだけ動かす。
 * OS 全体の入力を拾う仕組みなので、必要ないときは止めておく。
 */
function applyHookState(): void {
  const settings = getSettings()
  if (clickFlashSupported && settings.enabled && settings.clickFlash) {
    startHook()
  } else {
    stopHook()
  }
}

function applyEnabled(enabled: boolean): void {
  if (enabled) {
    startTracking()
    setOverlayVisible(true)
  } else {
    stopTracking()
    setOverlayVisible(false)
  }
  applyHookState()
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.cursormarker.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  clickFlashSupported = await initHook()

  setTrackerHandlers(
    (x, y) => pushCursor(x, y),
    () => {
      const settings = getSettings()
      if (settings.enabled && settings.clickFlash) pushClick()
    }
  )

  ipcMain.handle('marker:get-state', (): MarkerState => ({
    settings: getSettings(),
    clickFlashSupported
  }))

  ipcMain.handle(
    'marker:set-settings',
    (_event, patch: Partial<MarkerSettings>): MarkerSettings => {
      const before = getSettings().enabled
      const next = updateSettings(patch)
      pushSettings()
      if (next.enabled !== before) applyEnabled(next.enabled)
      else applyHookState()
      return next
    }
  )

  ipcMain.on('marker:panel', (_event, open: boolean) => {
    setControlHeight(open ? PANEL_HEIGHT : BAR_HEIGHT)
  })

  ipcMain.on('window:minimize', () => controlWindow?.minimize())
  ipcMain.on('window:close', () => controlWindow?.close())

  createOverlay()
  createControlWindow()
  applyEnabled(getSettings().enabled)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  stopTracking()
  stopHook()
  saveSettings()
})
