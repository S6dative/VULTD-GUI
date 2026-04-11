import { Routes, Route, NavLink } from 'react-router-dom'
import { Component } from 'react'
import { useState } from 'react'
import { LayoutDashboard, Vault, ArrowUpDown, Send, Settings, ChevronLeft, ChevronRight, Sun, Moon, Lock } from 'lucide-react'
import { useApp } from './contexts/AppContext'
import { UnlockScreen, SetupScreen } from './components/AuthScreen'
import Dashboard from './pages/Dashboard'
import Vaults from './pages/Vaults'
import MintRepay from './pages/MintRepay'
import Transfer from './pages/Transfer'
import SettingsPage from './pages/Settings'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e) { console.error('Page crash:', e) }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: 'var(--danger)', fontSize: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Page error</div>
        <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: 'var(--muted-fg)' }}>{this.state.error.message}</div>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '6px 14px', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}>Retry</button>
      </div>
    )
    return this.props.children
  }
}

const nav = [
  { to:'/',         icon:LayoutDashboard, label:'Dashboard' },
  { to:'/vaults',   icon:Vault,           label:'Vaults' },
  { to:'/mint',     icon:ArrowUpDown,     label:'Mint / Repay' },
  { to:'/transfer', icon:Send,            label:'Send / Receive' },
  { to:'/settings', icon:Settings,        label:'Settings' },
]

function Sidebar({ collapsed, setCollapsed }) {
  const { theme, toggleTheme, network, setNetwork, lock } = useApp()

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      display: 'flex', flexDirection: 'column',
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--border)',
      transition: 'width 0.15s ease',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 20px',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <span style={{
          fontFamily: 'Geist, sans-serif',
          fontWeight: 700,
          fontSize: collapsed ? 14 : 17,
          color: 'var(--fg)',
          letterSpacing: '-0.03em',
          whiteSpace: 'nowrap',
        }}>
          {collapsed ? 'V' : 'VULTD'}
        </span>
      </div>

      {/* Network toggle */}
      {!collapsed && (
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Network</div>
          <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 6, padding: 2 }}>
            {['signet', 'mainnet'].map(n => (
              <button key={n} onClick={() => setNetwork(n)} style={{
                flex: 1, padding: '4px 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 11, fontFamily: 'Geist Mono, monospace', fontWeight: 600,
                background: network === n ? 'var(--card)' : 'transparent',
                color: network === n ? 'var(--fg)' : 'var(--muted-fg)',
                transition: 'all 0.12s',
                boxShadow: network === n ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}>
                {n === 'signet' ? 'SIGNET' : 'MAINNET'}
              </button>
            ))}
          </div>
          {network === 'mainnet' && (
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6, padding: '4px 8px', background: 'var(--danger-dim)', borderRadius: 4 }}>
              Real Bitcoin — use with care
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '9px 0' : '8px 10px',
                borderRadius: 7,
                background: isActive ? 'var(--card2)' : 'transparent',
                color: isActive ? 'var(--fg)' : 'var(--muted-fg)',
                cursor: 'pointer',
                transition: 'all 0.1s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                position: 'relative',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--fg)' }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-fg)' } }}
              >
                <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[
          { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', action: toggleTheme },
          { icon: Lock, label: 'Lock', action: lock },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '8px 10px',
            borderRadius: 7, background: 'transparent', border: 'none',
            color: 'var(--muted-fg)', cursor: 'pointer',
            width: '100%', justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.1s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--fg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-fg)' }}
          >
            <Icon size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
            {!collapsed && <span style={{ fontSize: 13, letterSpacing: '-0.01em' }}>{label}</span>}
          </button>
        ))}
      </div>

      {/* Network status dot */}
      {!collapsed && (
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: network === 'signet' ? 'var(--warning)' : 'var(--success)', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--muted-fg)' }}>
            {network} · {network === 'signet' ? 'sBTC' : 'BTC'}
          </span>
        </div>
      )}

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 32, borderTop: '1px solid var(--border)',
        background: 'transparent', border: 'none',
        color: 'var(--muted-fg)', cursor: 'pointer',
        transition: 'background 0.1s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}

export default function App() {
  const { unlocked, hasWallet } = useApp()
  const [collapsed, setCollapsed] = useState(false)

  if (!hasWallet) return <SetupScreen />
  if (!unlocked) return <UnlockScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <ErrorBoundary>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/vaults"   element={<Vaults />} />
          <Route path="/mint"     element={<MintRepay />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
