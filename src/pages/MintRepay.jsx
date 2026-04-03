import { useState, useEffect } from 'react'
import { bridge } from '../bridge/vusd'
import { Coins, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react'
import { BTC_PRICE, formatUsd, satsToUsd, truncateVaultId, healthColor } from '../data'

export default function MintRepay() {
  const [vaultId, setVaultId] = useState('')
  const [tab, setTab] = useState('mint')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const [openVaults, setOpenVaults] = useState([])

  useEffect(() => {
    bridge.readVaults().then(data => {
      const entries = Array.isArray(data) ? data : Object.entries(data || {})
      const normalized = entries.map(([id, v]) => ({
        id: v.vault_id || id,
        state: v.state || 'Unknown',
        collateralSats: v.locked_btc || 0,
        debt: v.debt_vusd || 0,
        health: v.locked_btc && v.debt_vusd > 0
          ? Math.round((v.locked_btc / 100000000 * 85000) / v.debt_vusd * 100)
          : 999,
      }))
      setOpenVaults(normalized.filter(v => v.state === 'Open'))
    }).catch(() => {})
  }, [])
  const vault = openVaults.find(v=>v.id===vaultId)
  const collUsd = vault ? satsToUsd(vault.collateralSats, BTC_PRICE) : 0
  const maxMint = vault ? Math.max(0, Math.floor(collUsd/1.5 - vault.debt)) : 0

  const handle = async () => {
    if (!vault||!amount) return
    setLoading(true); setMsg(null)
    try {
      if (tab === 'mint') await bridge.mint(vault.id, parseFloat(amount))
      else await bridge.repay(vault.id, parseFloat(amount))
      setMsg({ ok: true, text: tab==='mint' ? 'Minted '+formatUsd(parseFloat(amount))+' VUSD' : 'Repaid '+formatUsd(parseFloat(amount))+' VUSD' })
      setAmount('')
    } catch (e) {
      setMsg({ ok: false, text: (e.message || 'Transaction failed') })
    }
    setLoading(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24,maxWidth:640}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Mint / Repay</h1>
        <p style={{color:'#737373',fontSize:14}}>sBTC · Mint VUSD against your sBTC collateral or repay your debt</p>
      </div>

      {/* Vault selector */}
      <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20}}>
        <label style={{fontSize:12,color:'#737373',display:'block',marginBottom:8}}>Select Vault</label>
        <select value={vaultId} onChange={e=>setVaultId(e.target.value)}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,background:'#111',border:'1px solid #262626',color:vaultId?'#fafafa':'#737373',outline:'none',cursor:'pointer'}}>
          <option value="">Choose a vault...</option>
          {openVaults.map(v=>(
            <option key={v.id} value={v.id}>{truncateVaultId(v.id)} — {formatUsd(v.debt)} debt</option>
          ))}
        </select>
      </div>

      {vault && (
        <>
          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[
              {label:'Collateral',value:formatUsd(collUsd),icon:TrendingUp,color:'#fafafa'},
              {label:'Current Debt',value:formatUsd(vault.debt),icon:CreditCard,color:'#fafafa'},
              {label:'Health Ratio',value:vault.health+'%',icon:vault.health<150?AlertTriangle:TrendingUp,color:healthColor(vault.health)},
            ].map(s=>(
              <div key={s.label} style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:16}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:12,color:'#737373'}}>{s.label}</span>
                  <s.icon size={14} style={{color:s.color}}/>
                </div>
                <div style={{fontFamily:'Space Mono',fontWeight:700,fontSize:16,color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Health bar */}
          <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:'#737373'}}>Collateralization Ratio</span>
              <span style={{fontFamily:'Space Mono',fontSize:12,color:healthColor(vault.health)}}>{vault.health}%</span>
            </div>
            <div style={{height:6,borderRadius:3,background:'#262626',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:3,width:Math.min(100,(vault.health/300)*100)+'%',background:healthColor(vault.health),transition:'width 0.3s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              <span style={{fontSize:11,color:'#ef4444'}}>Liquidation 110%</span>
              <span style={{fontSize:11,color:'#f59e0b'}}>Warning 150%</span>
              <span style={{fontSize:11,color:'#22c55e'}}>Safe 200%+</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'inline-flex',background:'#1a1a1a',border:'1px solid #262626',borderRadius:8,padding:4}}>
            {['mint','repay'].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:'6px 20px',borderRadius:6,border:'none',cursor:'pointer',fontSize:14,fontWeight:tab===t?500:400,
                  background:tab===t?'#262626':'transparent',color:tab===t?'#fafafa':'#737373',textTransform:'capitalize'}}>
                {t==='mint'?<span style={{display:'flex',alignItems:'center',gap:6}}><Coins size={14}/> Mint</span>
                           :<span style={{display:'flex',alignItems:'center',gap:6}}><CreditCard size={14}/> Repay</span>}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20}}>
            <label style={{fontSize:12,color:'#737373',display:'block',marginBottom:8}}>
              {tab==='mint'?'Amount to Mint (VUSD)':'Amount to Repay (VUSD)'}
            </label>
            <div style={{position:'relative',marginBottom:8}}>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number"
                placeholder={tab==='mint'?`Max: ${formatUsd(maxMint)}`:`Max: ${formatUsd(vault.debt)}`}
                style={{width:'100%',padding:'10px 12px',borderRadius:8,background:'#111',border:'1px solid #262626',color:'#fafafa',outline:'none',fontFamily:'Space Mono',fontSize:14}}/>
            </div>
            {tab==='mint' && (
              <div style={{fontSize:12,color:'#737373',marginBottom:16}}>
                Max mintable: <span style={{fontFamily:'Space Mono',color:'#a3a3a3'}}>{formatUsd(maxMint)}</span> VUSD at 150% CR
              </div>
            )}
            {msg && (
              <div style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:msg.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:msg.ok?'#22c55e':'#ef4444',fontSize:13}}>
                {msg.text}
              </div>
            )}
            <button onClick={handle} disabled={loading||!amount}
              style={{width:'100%',padding:'10px',borderRadius:8,fontWeight:600,fontSize:14,border:'none',cursor:loading||!amount?'not-allowed':'pointer',
                background:loading||!amount?'#262626':'#fafafa',color:loading||!amount?'#737373':'#111',textTransform:'capitalize'}}>
              {loading?'Processing...':(tab==='mint'?'Mint VUSD':'Repay VUSD')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
