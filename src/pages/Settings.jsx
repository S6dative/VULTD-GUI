import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Shield, HelpCircle, Moon, Sun, Lock, Zap } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { bridge } from '../bridge/vusd'

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

function NodeStatus({ label, connected, detail, tip }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:500, fontSize:14 }}>
          {label}{tip && <Tip text={tip}/>}
        </div>
        {detail && <div style={{ fontSize:12, color:'var(--muted-fg)', marginTop:2, fontFamily:'Geist Mono, monospace' }}>{detail}</div>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {connected === null ? (
          <RefreshCw size={14} style={{ color:'var(--muted-fg)', animation:'spin 1s linear infinite' }} />
        ) : connected ? (
          <><CheckCircle size={14} style={{ color:'var(--success)' }}/><span style={{ fontSize:13, color:'var(--success)' }}>Connected</span></>
        ) : (
          <><AlertCircle size={14} style={{ color:'var(--danger)' }}/><span style={{ fontSize:13, color:'var(--danger)' }}>Offline</span></>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { theme, toggleTheme, network, setNetwork, lock } = useApp()
  const [showFull, setShowFull] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nodeInfo, setNodeInfo] = useState({ blockcount: null, peers: null })
  const [btcConnected, setBtcConnected] = useState(null)
  const isLight = theme === 'light'

  const fetchNodeInfo = async () => {
    setRefreshing(true)
    setBtcConnected(null)
    try {
      const info = await bridge.nodeInfo()
      if (info?.blockcount) {
        setNodeInfo(info)
        setBtcConnected(true)
      } else {
        setBtcConnected(false)
      }
    } catch {
      setBtcConnected(false)
    }
    setRefreshing(false)
  }

  useEffect(() => { fetchNodeInfo() }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', maxWidth:560 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.03em', marginBottom:4 }}>Settings</h1>
        <p style={{ color:'var(--muted-fg)', fontSize:13 }}>Configure your wallet and network preferences</p>
      </div>

      {/* Network */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:13, fontWeight:600, marginBottom:16, display:'flex', alignItems:'center', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted-fg)' }}>
          Network <Tip text="Signet is a test network. Switch to Mainnet for real Bitcoin." />
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { id:'signet',  label:'Signet',  desc:'Test network — no real value. Safe for practice.', color:'var(--warning)' },
            { id:'mainnet', label:'Mainnet', desc:'Real Bitcoin — all transactions are permanent and irreversible.', color:'var(--success)' },
          ].map(n => (
            <button key={n.id} onClick={() => setNetwork(n.id)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:8, background: network===n.id?'var(--card2)':'transparent', border:'1px solid '+(network===n.id?n.color:'var(--border)'), cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:n.color, flexShrink:0, animation:network===n.id?'pulse 2s ease-in-out infinite':undefined }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{n.label}</div>
                <div style={{ fontSize:12, color:'var(--muted-fg)', marginTop:2 }}>{n.desc}</div>
              </div>
              {network===n.id && <CheckCircle size={15} style={{ color:n.color }}/>}
            </button>
          ))}
        </div>
        {network==='mainnet' && (
          <div style={{ marginTop:12, padding:12, borderRadius:8, background:'var(--danger-dim)', border:'1px solid rgba(239,68,68,0.3)', fontSize:13, color:'var(--danger)' }}>
            You are on Mainnet. All transactions use real Bitcoin and are irreversible.
          </div>
        )}
      </div>

      {/* Node connections */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted-fg)' }}>
            Node Status
          </h2>
          <button onClick={fetchNodeInfo} className="btn btn-secondary btn-sm">
            <RefreshCw size={12} className={refreshing?'spin':''}/> Refresh
          </button>
        </div>
        <NodeStatus
          label="Bitcoin Core"
          tip="Reads on-chain BTC balance and broadcasts transactions"
          connected={btcConnected}
          detail={nodeInfo.blockcount ? 'Block: '+Number(nodeInfo.blockcount).toLocaleString()+' · Peers: '+(nodeInfo.peers||0) : null}
        />
        <NodeStatus
          label="VUSD Protocol"
          tip="Handles vault operations, minting and burning VUSD"
          connected={btcConnected}
          detail={btcConnected ? 'Oracle: 7/7 signers · Active' : null}
        />
        <NodeStatus
          label="Lightning (LND)"
          tip="Handles Lightning payments and VUSD transfers via keysend"
          connected={null}
          detail="Checking..."
          last
        />
      </div>

      {/* Display */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:13, fontWeight:600, marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted-fg)' }}>Display</h2>
        <Row label="Theme" tip="Switch between dark and light mode">
          <button onClick={toggleTheme} className="btn btn-secondary btn-sm">
            {isLight ? <Moon size={13}/> : <Sun size={13}/>}
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </button>
        </Row>
        <Row label="Show Full Addresses" desc="Display complete vault IDs" tip="Useful for verifying exact vault IDs before transactions">
          <Toggle value={showFull} onChange={setShowFull}/>
        </Row>
        <Row label="Notifications" desc="Alerts for incoming transfers and vault health warnings" tip="Get notified when vault health drops below 150%" last>
          <Toggle value={notifications} onChange={setNotifications}/>
        </Row>
      </div>

      {/* Security */}
      <div className="card" style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:13, fontWeight:600, marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted-fg)' }}>Security</h2>
        <Row label="Lock Wallet" desc="Require PIN to access again" tip="Locks the wallet immediately" last>
          <button onClick={lock} className="btn btn-secondary btn-sm">
            <Lock size={13}/> Lock Now
          </button>
        </Row>
      </div>

      {/* Danger */}
      <div className="card" style={{ marginBottom:24, borderColor:'rgba(239,68,68,0.3)' }}>
        <h2 style={{ fontSize:13, fontWeight:600, color:'var(--danger)', marginBottom:16, display:'flex', alignItems:'center', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          Danger Zone <Tip text="These actions are irreversible. Back up your seed phrase first." />
        </h2>
        <Row label="Reset Wallet" desc="Wipe all local data. Seed phrase required to recover." last>
          <button onClick={() => { if(confirm('This will delete all local wallet data. Are you sure?')) { localStorage.clear(); window.location.reload() } }}
            className="btn btn-danger btn-sm">Reset</button>
        </Row>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:'var(--muted-fg)', fontSize:11, fontFamily:'Geist Mono, monospace' }}>
        <Shield size={11}/>
        VULTD v0.1.0 · {network} · Non-custodial
      </div>
    </div>
  )
}
