import { useState } from 'react'
import { Plus, Lock, Unlock, MoreHorizontal, ExternalLink } from 'lucide-react'
import { MOCK_VAULTS, BTC_PRICE, formatUsd, formatSats, satsToUsd, truncateVaultId, healthColor } from '../data'

export default function Vaults() {
  const [filter, setFilter] = useState('Open')
  const [showModal, setShowModal] = useState(false)
  const [sats, setSats] = useState('')
  const [vaults, setVaults] = useState(MOCK_VAULTS)

  const tabs = ['Open','Repaid','Closed']
  const counts = tabs.reduce((a,t)=>({...a,[t]:vaults.filter(v=>v.state===t).length}),{})
  const filtered = vaults.filter(v=>v.state===filter)

  const openVault = () => {
    if (!sats) return
    const newVault = {
      id: 'vault:'+Array(64).fill(0).map(()=>Math.floor(Math.random()*16).toString(16)).join(''),
      state:'Open', collateralSats:parseInt(sats),
      debt:0, health:999
    }
    setVaults([...vaults, newVault])
    setShowModal(false); setSats('')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Vault Manager</h1>
          <p style={{color:'#737373',fontSize:14}}>Manage your Bitcoin collateral vaults</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:8,background:'#fafafa',color:'#111',fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>
          <Plus size={16}/> Open Vault
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}} onClick={()=>setShowModal(false)}>
          <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:16,padding:24,width:400}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Space Mono',fontSize:16,fontWeight:700,marginBottom:4}}>Open New Vault</h2>
            <p style={{fontSize:13,color:'#737373',marginBottom:20}}>Lock sBTC as collateral to mint VUSD stablecoin.</p>
            <label style={{fontSize:12,color:'#737373',display:'block',marginBottom:6}}>Collateral Amount (sats)</label>
            <input value={sats} onChange={e=>setSats(e.target.value)} type="number" placeholder="10000000"
              style={{width:'100%',padding:'10px 12px',borderRadius:8,background:'#111',border:'1px solid #262626',color:'#fafafa',marginBottom:6,outline:'none'}}/>
            <div style={{fontSize:12,color:'#737373',marginBottom:20}}>
              {sats ? `≈ ${formatUsd(satsToUsd(parseInt(sats)||0,BTC_PRICE))} · Min collateral ratio: 150%` : 'Min collateral ratio: 150%'}
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:'10px',borderRadius:8,background:'#222',color:'#a3a3a3',border:'1px solid #262626',cursor:'pointer',fontSize:14}}>Cancel</button>
              <button onClick={openVault} style={{flex:1,padding:'10px',borderRadius:8,background:'#fafafa',color:'#111',fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>Open Vault</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'inline-flex',background:'#1a1a1a',border:'1px solid #262626',borderRadius:8,padding:4}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setFilter(t)}
            style={{padding:'6px 16px',borderRadius:6,border:'none',cursor:'pointer',fontSize:14,fontWeight:filter===t?500:400,
              background:filter===t?'#262626':'transparent',color:filter===t?'#fafafa':'#737373'}}>
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {/* Vault cards */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {filtered.length===0?(
          <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:48,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#737373'}}>
            <Lock size={40} style={{marginBottom:12,opacity:0.3}}/>
            <p style={{fontSize:14}}>No {filter.toLowerCase()} vaults</p>
          </div>
        ):filtered.map(v=>{
          const collUsd = satsToUsd(v.collateralSats, BTC_PRICE)
          return (
            <div key={v.id} style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20,cursor:'pointer',transition:'border-color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#404040'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='#262626'}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:8,background:'rgba(250,250,250,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {v.state==='Closed'?<Unlock size={18} style={{color:'#737373'}}/>:<Lock size={18} style={{color:'#fafafa'}}/>}
                  </div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontFamily:'Space Mono',fontSize:13,fontWeight:600}}>{truncateVaultId(v.id)}</span>
                      <span style={{fontSize:10,padding:'2px 8px',borderRadius:4,fontFamily:'Space Mono',
                        background:v.state==='Open'?'rgba(34,197,94,0.1)':v.state==='Repaid'?'rgba(245,158,11,0.1)':'rgba(115,115,115,0.1)',
                        color:v.state==='Open'?'#22c55e':v.state==='Repaid'?'#f59e0b':'#737373',
                        border:`1px solid ${v.state==='Open'?'rgba(34,197,94,0.2)':v.state==='Repaid'?'rgba(245,158,11,0.2)':'rgba(115,115,115,0.2)'}`}}>
                        {v.state}
                      </span>
                      <span style={{fontSize:10,fontFamily:'Space Mono',background:'rgba(245,158,11,0.1)',color:'#f59e0b',padding:'2px 6px',borderRadius:3}}>sBTC</span>
                    </div>
                    <div style={{fontSize:12,color:'#737373',fontFamily:'Space Mono'}}>{formatSats(v.collateralSats)} collateral</div>
                  </div>
                </div>
                <button style={{background:'transparent',border:'none',color:'#737373',cursor:'pointer',padding:4}}>
                  <MoreHorizontal size={16}/>
                </button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
                <div>
                  <div style={{fontSize:11,color:'#737373',marginBottom:4}}>Collateral</div>
                  <div style={{fontFamily:'Space Mono',fontWeight:600}}>{formatUsd(collUsd)}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:'#737373',marginBottom:4}}>Debt</div>
                  <div style={{fontFamily:'Space Mono',fontWeight:600}}>{formatUsd(v.debt)}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:'#737373',marginBottom:4}}>Health</div>
                  <div style={{fontFamily:'Space Mono',fontWeight:700,color:healthColor(v.health)}}>{v.health===999?'---':v.health+'%'}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
