import electronLogo from '../assets/electron.svg'
import type { ViewId } from '../App'

type Props = {
  views: { id: ViewId; label: string; icon: string }[]
  current: ViewId
  collapsed: boolean
  onSelect: (id: ViewId) => void
}

function Sidebar({ views, current, collapsed, onSelect }: Props): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img className="sidebar__logo" src={electronLogo} alt="" />
        <span className="sidebar__name">Elec Tutorial</span>
      </div>

      <nav className="sidebar__nav">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`navitem ${current === v.id ? 'navitem--active' : ''}`}
            onClick={() => onSelect(v.id)}
            title={collapsed ? v.label : undefined}
          >
            <span className="navitem__icon">{v.icon}</span>
            <span className="navitem__label">{v.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="avatar">EV</div>
        <div className="sidebar__user">
          <div className="sidebar__user-name">ローカルユーザー</div>
          <div className="sidebar__user-role">開発モード</div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
