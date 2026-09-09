import type { ViewId } from '../App'

type Props = {
  onNavigate: (id: ViewId) => void
}

const stats = [
  { label: 'ウィンドウ', value: '1', hint: 'BrowserWindow' },
  { label: 'レンダラー', value: 'React 19', hint: 'TypeScript' },
  { label: 'バンドラー', value: 'Vite', hint: 'electron-vite' },
  { label: 'ステータス', value: '正常', hint: 'すべて稼働中' }
]

const activity = [
  { time: '今', text: 'レンダラープロセスを起動しました' },
  { time: '1分前', text: 'プリロードスクリプトを読み込みました' },
  { time: '1分前', text: 'メインプロセスが ready になりました' }
]

function Dashboard({ onNavigate }: Props): React.JSX.Element {
  return (
    <>
      <section className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <div className="stat__label">{s.label}</div>
            <div className="stat__value">{s.value}</div>
            <div className="stat__hint">{s.hint}</div>
          </div>
        ))}
      </section>

      <section className="grid">
        <div className="card">
          <div className="card__head">
            <h2 className="card__title">はじめに</h2>
          </div>
          <p className="muted">
            これは Electron + React + TypeScript のテンプレートを、一般的なウェブアプリの
            レイアウト（サイドバー・ヘッダー・コンテンツ）に置き換えたものです。
            左のメニューから各画面に切り替えられます。
          </p>
          <div className="card__actions">
            <button type="button" className="btn" onClick={() => onNavigate('ipc')}>
              IPC を試す
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('about')}>
              バージョン情報
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <h2 className="card__title">アクティビティ</h2>
            <span className="badge">ライブ</span>
          </div>
          <ul className="timeline">
            {activity.map((a) => (
              <li key={a.text} className="timeline__item">
                <span className="timeline__dot" />
                <span className="timeline__text">{a.text}</span>
                <span className="timeline__time">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export default Dashboard
