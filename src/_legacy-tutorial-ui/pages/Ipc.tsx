import { useState } from 'react'

function Ipc(): React.JSX.Element {
  const [log, setLog] = useState<string[]>([])

  const sendPing = (): void => {
    window.electron.ipcRenderer.send('ping')
    const time = new Date().toLocaleTimeString()
    setLog((prev) => [`[${time}] renderer → main : ping`, ...prev])
  }

  return (
    <section className="grid grid--single">
      <div className="card">
        <div className="card__head">
          <h2 className="card__title">メッセージ送信</h2>
          <span className="badge">ipcRenderer</span>
        </div>
        <p className="muted">
          ボタンを押すとメインプロセスへ <code>ping</code> を送信します。
          メインプロセス側のターミナルに <code>pong</code> が出力されます。
        </p>
        <div className="card__actions">
          <button type="button" className="btn" onClick={sendPing}>
            ping を送信
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setLog([])}
            disabled={log.length === 0}
          >
            ログを消去
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">ログ</h2>
          <span className="badge">{log.length} 件</span>
        </div>
        {log.length === 0 ? (
          <p className="muted">まだ送信されていません。</p>
        ) : (
          <pre className="console">{log.join('\n')}</pre>
        )}
      </div>
    </section>
  )
}

export default Ipc
