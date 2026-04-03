import { Routes, Route, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Vault, ArrowUpDown, Send, Settings, ChevronLeft, ChevronRight, Sun, Moon, Lock, Zap } from 'lucide-react'
import { useApp } from './contexts/AppContext'
import { UnlockScreen, SetupScreen } from './components/AuthScreen'
import Dashboard from './pages/Dashboard'
import Vaults from './pages/Vaults'
import MintRepay from './pages/MintRepay'
import Transfer from './pages/Transfer'
import SettingsPage from './pages/Settings'

const nav = [
  { to:'/',         icon:LayoutDashboard, label:'Dashboard',    tip:'Overview of your wallet, balances and recent activity' },
  { to:'/vaults',   icon:Vault,           label:'Vaults',       tip:'Open BTC collateral vaults to mint VUSD stablecoin' },
  { to:'/mint',     icon:ArrowUpDown,     label:'Mint / Repay', tip:'Mint new VUSD against your vault or repay debt' },
  { to:'/transfer', icon:Send,            label:'Send / Receive',tip:'Send or receive VUSD privately over Lightning' },
  { to:'/settings', icon:Settings,        label:'Settings',     tip:'Configure nodes, network, and wallet preferences' },
]

function Sidebar({ collapsed, setCollapsed }) {
  const { theme, toggleTheme, network, setNetwork, lock } = useApp()
  const isLight = theme === 'light'

  return (
    <aside style={{ width: collapsed ? 64 : 240, display: 'flex', flexDirection: 'column', background: 'var(--sidebar)', borderRight: '1px solid var(--border)', transition: 'width 0.15s', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', padding: '0 16px', height: 64, borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
        <span style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: collapsed ? 13 : 18, color: 'var(--fg)', whiteSpace: 'nowrap', letterSpacing: collapsed ? 1 : 3 }}>{collapsed ? 'V' : 'VULTD'}</span>
      </div>

      {/* Network toggle */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginBottom: 6, fontFamily: 'Space Mono' }}>NETWORK</div>
          <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
            {['signet', 'mainnet'].map(n => (
              <button key={n} onClick={() => setNetwork(n)}
                style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Mono', fontWeight: 600, textTransform: 'uppercase', background: network === n ? 'var(--btc)' : 'transparent', color: network === n ? '#fff' : 'var(--muted-fg)', transition: 'all 0.15s' }}>
                {n === 'signet' ? 'SIG' : 'MAIN'}
              </button>
            ))}
          </div>
          {network === 'mainnet' && (
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
              ⚠️ Real Bitcoin — use with care
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ to, icon: Icon, label, tip }) => (
          <NavLink key={to} to={to} end={to === '/'} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: isActive ? 'var(--card2)' : 'transparent', color: isActive ? 'var(--fg)' : 'var(--muted-fg)', cursor: 'pointer', transition: 'all 0.1s', overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--card2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                <Icon size={18} style={{ flexShrink: 0, color: isActive ? 'var(--btc)' : 'var(--muted-fg)' }} />
                {!collapsed && <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{label}</span>}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--muted-fg)', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {isLight ? <Moon size={18} style={{ flexShrink: 0 }} /> : <Sun size={18} style={{ flexShrink: 0 }} />}
          {!collapsed && <span style={{ fontSize: 14 }}>{isLight ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
        <button onClick={lock}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--muted-fg)', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Lock size={18} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ fontSize: 14 }}>Lock Wallet</span>}
        </button>
      </div>

      {/* Network status */}
      {!collapsed && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: network === 'signet' ? 'var(--warning)' : 'var(--success)', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--muted-fg)', textTransform: 'uppercase' }}>{network}</span>
            <span style={{ color: 'var(--border)', fontSize: 11 }}>|</span>
            <span style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700, color: 'var(--btc)' }}>{network === 'signet' ? 'sBTC' : 'BTC'}</span>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, borderTop: '1px solid var(--border)', background: 'transparent', border: 'none', color: 'var(--muted-fg)', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/vaults"   element={<Vaults />} />
          <Route path="/mint"     element={<MintRepay />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
