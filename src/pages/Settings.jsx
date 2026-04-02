import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Shield } from 'lucide-react'

const Section = ({title,children}) => (
  <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20,marginBottom:16}}>
    <h2 style={{fontSize:14,fontWeight:600,marginBottom:16}}>{title}</h2>
    {children}
  </div>
)

const Row = ({label,desc,children,last=false}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:last?'none':'1px solid #262626'}}>
    <div>
      <div style={{fontSize:14,fontWeight:500}}>{label}</div>
      {desc && <div style={{fontSize:12,color:'#737373',marginTop:2}}>{desc}</div>}
    </div>
    {children}
  </div>
)

const StatusDot = ({ok,label,sub}) => (
  <div style={{textAlign:'right'}}>
    {sub && <div style={{fontSize:12,color:'#737373',marginBottom:4}}>{sub}</div>}
    <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
      {ok?<CheckCircle size={14} style={{color:'#22c55e'}}/>:<AlertCircle size={14} style={{color:'#ef4444'}}/>}
      <span style={{fontSize:13,color:ok?'#22c55e':'#ef4444'}}>{label}</span>
    </div>
  </div>
)

const Toggle = ({value,onChange}) => (
  <button onClick={()=>onChange(!value)}
    style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',background:value?'#fafafa':'#262626',transition:'background 0.2s'}}>
    <span style={{position:'absolute',top:2,width:20,height:20,borderRadius:'50%',background:value?'#111':'#737373',left:value?22:2,transition:'left 0.2s'}}/>
  </button>
)

export default function Settings() {
  const [showFull, setShowFull] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = () => { setRefreshing(true); setTimeout(()=>setRefreshing(false),1000) }

  return (
    <div style={{display:'flex',flexDirection:'column',maxWidth:560}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Settings</h1>
        <p style={{color:'#737373',fontSize:14}}>Configure your wallet and network preferences</p>
      </div>

      <Section title="Network">
        <p style={{fontSize:13,color:'#737373',marginBottom:12}}>Select the Bitcoin network for your wallet</p>
        <div style={{background:'#111',border:'1px solid #262626',borderRadius:8,padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontWeight:600,marginBottom:4}}>sBTC · Signet Test Bitcoin</div>
              <div style={{fontSize:12,color:'#737373'}}>You are using sBTC for testing. This has no real value.</div>
            </div>
            <span style={{fontSize:11,background:'rgba(245,158,11,0.1)',color:'#f59e0b',padding:'4px 10px',borderRadius:4,border:'1px solid rgba(245,158,11,0.2)',fontFamily:'Space Mono'}}>Test</span>
          </div>
        </div>
      </Section>

      <Section title="Node Connections">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <p style={{fontSize:13,color:'#737373'}}>Status of your Bitcoin and Lightning nodes</p>
          <button onClick={refresh} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:6,background:'#222',border:'1px solid #262626',color:'#a3a3a3',cursor:'pointer',fontSize:12}}>
            <RefreshCw size={12} style={{animation:refreshing?'spin 1s linear infinite':undefined}}/> Refresh
          </button>
        </div>
        <Row label="Bitcoin Core (Signet)" desc={null}>
          <StatusDot ok label="Connected" sub="Block Height: 298,274"/>
        </Row>
        <Row label="LND · Lightning Network Daemon" last>
          <StatusDot ok label="Connected" sub="Sync Progress 100%"/>
        </Row>
      </Section>

      <Section title="Display">
        <Row label="Show Full Addresses" desc="Display complete vault IDs and addresses instead of truncated versions" last>
          <Toggle value={showFull} onChange={setShowFull}/>
        </Row>
      </Section>

      <div style={{background:'#1a1a1a',border:'1px solid rgba(239,68,68,0.3)',borderRadius:12,padding:20,marginBottom:24}}>
        <h2 style={{fontSize:14,fontWeight:600,color:'#ef4444',marginBottom:16}}>Danger Zone</h2>
        <Row label="Reset Local Data" desc="Clear cached data and re-sync from the blockchain" last>
          <button style={{padding:'8px 16px',borderRadius:8,background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.3)',cursor:'pointer',fontSize:13,fontWeight:500}}>
            Reset
          </button>
        </Row>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'#404040',fontSize:12,fontFamily:'Space Mono'}}>
        <Shield size={12}/>
        VUSD Protocol Wallet v0.1.0 · Network: signet · CLI: vusd v0.1.0
      </div>
    </div>
  )
}
