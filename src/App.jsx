import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Vault, ArrowUpDown, Send, Settings, Shield, ChevronLeft, ChevronRight, Sun } from 'lucide-react'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Vaults from './pages/Vaults'
import MintRepay from './pages/MintRepay'
import Transfer from './pages/Transfer'
import SettingsPage from './pages/Settings'

const nav = [
  { to:'/',         icon:LayoutDashboard, label:'Dashboard' },
  { to:'/vaults',   icon:Vault,           label:'Vaults' },
  { to:'/mint',     icon:ArrowUpDown,     label:'Mint / Repay' },
  { to:'/transfer', icon:Send,            label:'Send / Receive' },
  { to:'/settings', icon:Settings,        label:'Settings' },
]

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#111111'}}>
      <aside style={{width:collapsed?64:256,display:'flex',flexDirection:'column',background:'#0d0d0d',borderRight:'1px solid #262626',transition:'width 0.15s',flexShrink:0}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'0 16px',height:64,borderBottom:'1px solid #262626',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8,background:'#fafafa',flexShrink:0}}>
            <Shield size={18} style={{color:'#111111'}}/>
          </div>
          {!collapsed && <span style={{fontFamily:'Space Mono',fontWeight:700,fontSize:18,color:'#fafafa',whiteSpace:'nowrap'}}>VUSD</span>}
        </div>
        {/* Nav */}
        <nav style={{flex:1,padding:'16px 8px',display:'flex',flexDirection:'column',gap:4}}>
          {nav.map(({to,icon:Icon,label}) => (
            <NavLink key={to} to={to} end={to==='/'} style={{textDecoration:'none'}}>
              {({isActive}) => (
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:6,background:isActive?'#262626':'transparent',color:isActive?'#fafafa':'#737373',cursor:'pointer',transition:'all 0.1s',overflow:'hidden',whiteSpace:'nowrap'}}>
                  <Icon size={20} style={{flexShrink:0,color:isActive?'#fafafa':'#737373'}}/>
                  {!collapsed && <span style={{fontSize:14,fontWeight:500}}>{label}</span>}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
        {/* Theme toggle placeholder */}
        <div style={{padding:'12px 8px',borderTop:'1px solid #262626'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:6,color:'#737373',cursor:'pointer',overflow:'hidden'}}>
            <Sun size={20} style={{flexShrink:0}}/>
            {!collapsed && <span style={{fontSize:14,fontWeight:500}}>Light Mode</span>}
          </div>
        </div>
        {/* Network */}
        {!collapsed && (
          <div style={{padding:'12px 16px',borderTop:'1px solid #262626'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b',animation:'pulse 2s ease-in-out infinite'}}/>
              <span style={{fontFamily:'Space Mono',fontSize:11,color:'#737373'}}>Signet</span>
              <span style={{color:'#404040',fontSize:11}}>|</span>
              <span style={{fontFamily:'Space Mono',fontSize:11,fontWeight:600,color:'#fafafa'}}>sBTC</span>
            </div>
          </div>
        )}
        {/* Collapse toggle */}
        <button onClick={()=>setCollapsed(!collapsed)} style={{display:'flex',alignItems:'center',justifyContent:'center',height:40,borderTop:'1px solid #262626',background:'transparent',border:'none',color:'#737373',cursor:'pointer'}}>
          {collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}
        </button>
      </aside>
      <main style={{flex:1,overflowY:'auto',padding:32}}>
        <Routes>
          <Route path="/"         element={<Dashboard/>}/>
          <Route path="/vaults"   element={<Vaults/>}/>
          <Route path="/mint"     element={<MintRepay/>}/>
          <Route path="/transfer" element={<Transfer/>}/>
          <Route path="/settings" element={<SettingsPage/>}/>
        </Routes>
      </main>
    </div>
  )
}
