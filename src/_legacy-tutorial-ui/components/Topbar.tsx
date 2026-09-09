type Props = {
  title: string
  subtitle: string
  onToggleSidebar: () => void
}

function Topbar({ title, subtitle, onToggleSidebar }: Props): React.JSX.Element {
  return (
    <header className="topbar">
      <button
        type="button"
        className="iconbtn"
        onClick={onToggleSidebar}
        aria-label="サイドバー切替"
      >
        ☰
      </button>
      <div className="topbar__titles">
        <h1 className="topbar__title">{title}</h1>
        <p className="topbar__subtitle">{subtitle}</p>
      </div>
      <div className="topbar__actions">
        <input className="search" type="search" placeholder="検索…" />
        <a
          className="btn btn--ghost"
          href="https://electron-vite.org/"
          target="_blank"
          rel="noreferrer"
        >
          ドキュメント
        </a>
      </div>
    </header>
  )
}

export default Topbar
