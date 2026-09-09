import { useState } from 'react'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)

  const rows = [
    { name: 'Electron', value: versions.electron },
    { name: 'Chromium', value: versions.chrome },
    { name: 'Node.js', value: versions.node }
  ]

  return (
    <ul className="versions">
      {rows.map((r) => (
        <li key={r.name} className="versions__row">
          <span className="versions__name">{r.name}</span>
          <span className="versions__value">v{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

export default Versions
