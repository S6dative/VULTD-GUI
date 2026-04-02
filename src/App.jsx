import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Vault, Coins, ArrowLeftRight, Settings, Zap } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Vaults from './pages/Vaults'
import MintRepay from './pages/MintRepay'
import Transfer from './pages/Transfer'
import SettingsPage from './pages/Settings'

const nav = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vaults',   icon: Vault,           label: 'Vaults' },
  { to: '/mint',     icon: Coins,           label: 'Mint / Repay' },
  { to: '/transfer', icon: ArrowLeftRight,  label: 'Send / Receive' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#0a0a0b'}}>
      <aside className="w-56 flex flex-col border-r" style={{borderColor:'#1e1e22',background:'#0d0d0f'}}>
        <div className="flex items-center gap-2 px-5 py-6 border-b" style={{borderColor:'#1e1e22'}}>
          <Zap size={18} style={{color:'#f5a623'}} />
          <span style={{fontFamily:'Space Mono',fontWeight:700,fontSize:15,letterSpacing:1}}>VUSD</span>
        </div>
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {nav.map(({to, icon: Icon, label}) => (
            <NavLink key={to} to={to} end={to==='/'}>
              {({isActive}) => (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer"
                  style={{background:isActive?'#1a1a1e':'transparent',color:isActive?'#f5a623':'#9ca3af'}}>
                  <Icon size={16} />
                  <span style={{fontSize:13,fontWeight:500}}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t" style={{borderColor:'#1e1e22'}}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{background:'#22c55e'}} />
            <span style={{fontSize:11,color:'#6b7280',fontFamily:'Space Mono'}}>SIGNET</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
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
