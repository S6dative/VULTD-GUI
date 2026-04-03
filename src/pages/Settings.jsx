import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Shield, HelpCircle, Moon, Sun, Lock } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

function Tip({ text }) {
  return (
    <div className="tooltip-wrap" style={{ marginLeft: 6 }}>
      <HelpCircle size={13} style={{ color: 'var(--muted-fg)', cursor: 'help' }} />
      <div className="tooltip">{text}</div>
    </div>
  )
}

const Row = ({ label, desc, tip, children, last=false }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom: last?'none':'1px solid var(--border)' }}>
    <div>
      <div style={{ display:'flex', alignItems:'center', fontWeight:500, fontSize:14 }}>
        {label}{tip && <Tip text={tip}/>}
      </div>
      {desc && <div style={{ fontSize:12, color:'var(--muted-fg)', marginTop:2 }}>{desc}</div>}
    </div>
    {children}
  </div>
)

const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)}
    style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative', background: value?'var(--btc)':'var(--border)', transition:'background 0.2s', flexShrink:0 }}>
    <span style={{ position:'absolute', top:2, width:20, height:20, borderRadius:'50%', background:'white', left: value?22:2, transition:'left 0.2s' }}/>
  </button>
)

export default function Settings() {
  const { theme, toggleTheme, network, setNetwork, lock } = useApp()
  const [showFull, setShowFull] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const isLight = theme === 'light'

  const refresh = () => { setRefreshing(true); setTimeout(()=>setRefreshing(false),1200) }

  return (
    <div style={{ display:'flex', flexDirection:'column', maxWidth:560 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:4 }}>Settings</h1>
        <p style={{ color:'var(--muted-fg)', fontSize:14 }}>Configure your wallet and network preferences</p>
      </div>

      {/* Network */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16, display:'flex', alignItems:'center' }}>
          Network <Tip text="Signet is a test network with no real value. Use it to practice. Switch to Mainnet for real Bitcoin." />
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { id:'signet',  label:'Signet (Test)',   desc:'Safe for practice — test Bitcoin with no real value', color:'var(--warning)' },
            { id:'mainnet', label:'Mainnet (Real)',  desc:'Real Bitcoin — all transactions are permanent and irreversible', color:'var(--success)' },
          ].map(n => (
            <button key={n.id} onClick={()=>setNetwork(n.id)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:8, background: network===n.id?'var(--card2)':'transparent', border:`1px solid ${network===n.id?n.color:'var(--border)'}`, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:n.color, flexShrink:0, animation: network===n.id?'pulse 2s ease-in-out infinite':undefined }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{n.label}</div>
                <div style={{ fontSize:12, color:'var(--muted-fg)', marginTop:2 }}>{n.desc}</div>
              </div>
              {network===n.id && <CheckCircle size={16} style={{ color:n.color }}/>}
            </button>
          ))}
        </div>
        {network==='mainnet' && (
          <div style={{ marginTop:12, padding:12, borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize:13, color:'var(--danger)' }}>
            ⚠️ You are on Mainnet. All transactions use real Bitcoin and are irreversible.
          </div>
        )}
      </div>

      {/* Node connections */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:14, fontWeight:600, display:'flex', alignItems:'center' }}>
            Node Connections <Tip text="VULTD connects to Bitcoin Core and LND to read balances and send transactions." />
          </h2>
          <button onClick={refresh} className="btn btn-secondary" style={{ padding:'5px 10px', fontSize:12 }}>
            <RefreshCw size={12} className={refreshing?'spin':''}/> Refresh
          </button>
        </div>
        <Row label="Bitcoin Core" tip="Reads on-chain BTC balance and broadcasts transactions">
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, color:'var(--muted-fg)', marginBottom:4 }}>Block: 298,274</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle size={14} style={{ color:'var(--success)' }}/>
              <span style={{ fontSize:13, color:'var(--success)' }}>Connected</span>
            </div>
          </div>
        </Row>
        <Row label="LND" desc="Lightning Network Daemon" tip="Handles Lightning payments and VUSD transfers via keysend" last>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, color:'var(--muted-fg)', marginBottom:4 }}>Sync: 100%</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <CheckCircle size={14} style={{ color:'var(--success)' }}/>
              <span style={{ fontSize:13, color:'var(--success)' }}>Connected</span>
            </div>
          </div>
        </Row>
      </div>

      {/* Display */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Display</h2>
        <Row label="Theme" tip="Switch between dark and light mode">
          <button onClick={toggleTheme} className="btn btn-secondary" style={{ padding:'6px 12px' }}>
            {isLight ? <Moon size={14}/> : <Sun size={14}/>}
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </button>
        </Row>
        <Row label="Show Full Addresses" desc="Display complete vault IDs instead of truncated versions" tip="Useful for verifying exact vault IDs before transactions">
          <Toggle value={showFull} onChange={setShowFull}/>
        </Row>
        <Row label="Notifications" desc="Show alerts for incoming transfers and vault health warnings" last tip="Get notified when your vault health drops below 150% or you receive VUSD">
          <Toggle value={notifications} onChange={setNotifications}/>
        </Row>
      </div>

      {/* Security */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Security</h2>
        <Row label="Lock Wallet" desc="Require PIN to access again" tip="Locks the wallet immediately — you'll need your PIN to unlock" last>
          <button onClick={lock} className="btn btn-secondary" style={{ padding:'6px 12px' }}>
            <Lock size={14}/> Lock Now
          </button>
        </Row>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ marginBottom:24, border:'1px solid rgba(239,68,68,0.3)' }}>
        <h2 style={{ fontSize:14, fontWeight:600, color:'var(--danger)', marginBottom:16, display:'flex', alignItems:'center' }}>
          Danger Zone <Tip text="These actions are irreversible. Make sure you have your seed phrase backed up before resetting." />
        </h2>
        <Row label="Reset Wallet" desc="Wipe all local data. Your seed phrase is required to recover." last>
          <button onClick={() => { if(confirm('Are you sure? This will delete all local wallet data.')) { localStorage.clear(); window.location.reload() } }}
            className="btn btn-danger" style={{ padding:'6px 12px' }}>
            Reset
          </button>
        </Row>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:'var(--muted-fg)', fontSize:12, fontFamily:'Space Mono' }}>
        <Shield size={12}/>
        VULTD v0.1.0 · {network} · vusd v0.1.0
      </div>
    </div>
  )
}
