import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

function subscribe<T extends unknown[]>(channel: string, cb: (...args: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]): void => cb(...(args as T))
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.off(channel, handler)
  }
}

const marker: MarkerApi = {
  getState: () => ipcRenderer.invoke('marker:get-state'),
  setSettings: (patch) => ipcRenderer.invoke('marker:set-settings', patch),
  onSettings: (cb) => subscribe<[MarkerSettings]>('marker:settings', cb),
  onCursor: (cb) => subscribe<[number, number]>('marker:cursor', cb),
  onClick: (cb) => subscribe<[]>('marker:click', cb),
  onLeave: (cb) => subscribe<[]>('marker:leave', cb),
  setPanelOpen: (open) => ipcRenderer.send('marker:panel', open),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close')
}

// Custom APIs for renderer
const api = { marker }

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
