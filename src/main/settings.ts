import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

export const SIZE_MIN = 12
export const SIZE_MAX = 200

export const DEFAULT_SETTINGS: MarkerSettings = {
  enabled: true,
  size: 48,
  color: '#ffd93d',
  clickFlash: true
}

let current: MarkerSettings | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

function filePath(): string {
  return join(app.getPath('userData'), 'marker-settings.json')
}

/** 壊れた/古い設定ファイルでも必ず妥当な設定を返す。 */
function sanitize(raw: unknown): MarkerSettings {
  const src = (raw ?? {}) as Partial<MarkerSettings>
  const size = Number(src.size)

  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_SETTINGS.enabled,
    size: Number.isFinite(size)
      ? Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(size)))
      : DEFAULT_SETTINGS.size,
    color:
      typeof src.color === 'string' && /^#[0-9a-f]{6}$/i.test(src.color)
        ? src.color.toLowerCase()
        : DEFAULT_SETTINGS.color,
    clickFlash: typeof src.clickFlash === 'boolean' ? src.clickFlash : DEFAULT_SETTINGS.clickFlash
  }
}

export function getSettings(): MarkerSettings {
  if (!current) {
    try {
      current = sanitize(JSON.parse(readFileSync(filePath(), 'utf-8')))
    } catch {
      current = { ...DEFAULT_SETTINGS }
    }
  }
  return current
}

export function updateSettings(patch: Partial<MarkerSettings>): MarkerSettings {
  current = sanitize({ ...getSettings(), ...patch })
  // スライダー操作中に毎回書き込まないようまとめて保存する
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(saveSettings, 300)
  return current
}

export function saveSettings(): void {
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
  if (!current) return
  try {
    const path = filePath()
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(current, null, 2), 'utf-8')
  } catch (error) {
    console.error('[settings] 保存に失敗しました', error)
  }
}
