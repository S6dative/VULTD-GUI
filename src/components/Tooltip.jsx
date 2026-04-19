import { HelpCircle } from 'lucide-react'

export default function Tooltip({ text, size = 12, style = {} }) {
  return (
    <div className="tooltip-wrap" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5, ...style }}>
      <HelpCircle size={size} style={{ color: 'var(--muted-fg)', cursor: 'help', flexShrink: 0 }} />
      <div className="tooltip">{text}</div>
    </div>
  )
}
