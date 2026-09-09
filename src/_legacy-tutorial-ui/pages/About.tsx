import Versions from '../components/Versions'

function About(): React.JSX.Element {
  return (
    <section className="grid grid--single">
      <div className="card">
        <div className="card__head">
          <h2 className="card__title">実行環境</h2>
        </div>
        <Versions />
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">リンク</h2>
        </div>
        <div className="card__actions">
          <a
            className="btn btn--ghost"
            href="https://electron-vite.org/"
            target="_blank"
            rel="noreferrer"
          >
            electron-vite
          </a>
          <a
            className="btn btn--ghost"
            href="https://www.electronjs.org/"
            target="_blank"
            rel="noreferrer"
          >
            Electron
          </a>
          <a className="btn btn--ghost" href="https://react.dev/" target="_blank" rel="noreferrer">
            React
          </a>
        </div>
        <p className="muted">
          <code>F12</code> で開発者ツールを開けます。
        </p>
      </div>
    </section>
  )
}

export default About
