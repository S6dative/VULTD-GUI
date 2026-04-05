import { useState, useEffect } from 'react'
import { Plus, Lock, Unlock, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { bridge } from '../bridge/vusd'
import { useApp } from '../contexts/AppContext'

const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
const fmtSats = n => n >= 100000000 ? (n/100000000).toFixed(8)+' BTC' : n.toLocaleString()+' sats'
const truncate = id => { const h=id.replace('vault:',''); return 'vault:'+h.slice(0,8)+'...'+h.slice(-8) }
const healthColor = h => h >= 200 ? 'var(--success)' : h >= 150 ? 'var(--warning)' : 'var(--danger)'

const PRESETS = [
  { ltv:33, label:'Conservative', sub:'200% CR', color:'var(--success)' },
  { ltv:44, label:'Balanced',     sub:'150% CR', color:'var(--warning)' },
  { ltv:55, label:'Aggressive',   sub:'120% CR', color:'var(--btc)'     },
  { ltv:66, label:'Max',          sub:'110% CR', color:'var(--danger)'  },
]

function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--muted-fg)' }}>{label}</span>
      <span style={{ fontSize:13, fontFamily:'Geist Mono, monospace', fontWeight:500, color:color||'var(--fg)' }}>{value}</span>
    </div>
  )
}

export default function Vaults() {
  const { wallet, network } = useApp()
  const [tab, setTab] = useState('create')
  const [btcAmount, setBtcAmount] = useState('')
  const [ltv, setLtv] = useState(44)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [vaults, setVaults] = useState([])
  const [loadingVaults, setLoadingVaults] = useState(true)
  const [infoOpen, setInfoOpen] = useState(null)
  const btcPrice = 85000
  const walletSats = wallet?.btcSats || 0

  useEffect(() => {
    bridge.readVaults().then(data => {
      if (!data) return
      const entries = Object.entries(data)
      setVaults(entries.map(([id, v]) => ({
        id: v.vault_id || id,
        state: v.state || 'Unknown',
        collateralSats: v.locked_btc || 0,
        debt: v.debt_vusd || 0,
        openedAt: v.open_timestamp || 0,
      })))
    }).catch(() => {}).finally(() => setLoadingVaults(false))
  }, [])

  const btcVal = parseFloat(btcAmount) || 0
  const collateralSats = Math.round(btcVal * 1e8)
  const collateralUsd = btcVal * btcPrice
  const vusdToMint = collateralUsd * (ltv / 100)
  const networkFee = 0.00015
  const systemFee = vusdToMint > 0 ? vusdToMint * 0.001 : 0
  const preset = PRESETS.find(p => p.ltv === ltv) || PRESETS[1]
  const canOpen = btcVal > 0 && collateralSats <= walletSats && collateralSats > 0
  const maxBtc = Math.max(0, walletSats/1e8 - networkFee).toFixed(8)

  const handleOpen = async () => {
    if (!canOpen) return
    setOpening(true)
    setOpenError(null)
    try {
      await bridge.openVault(collateralSats)
      setOpenSuccess(true)
      setBtcAmount('')
      const data = await bridge.readVaults()
      if (data) {
        const entries = Object.entries(data)
        setVaults(entries.map(([id, v]) => ({
          id: v.vault_id || id, state: v.state || 'Unknown',
          collateralSats: v.locked_btc || 0, debt: v.debt_vusd || 0, openedAt: v.open_timestamp || 0,
        })))
      }
    } catch(e) {
      setOpenError(e.message || 'Failed to open vault')
    }
    setOpening(false)
  }

  const INFO_ITEMS = [
    { key:'ltv', title:'LTV explained', body:'Loan-to-Value ratio determines how much VUSD you can mint relative to your BTC collateral. Lower LTV means safer vault and lower liquidation risk.' },
    { key:'fee', title:'52k-block redemption fee', body:'A redemption fee applies if your vault is redeemed within the first 52,000 blocks (~1 year). This fee starts at 0% and decreases over time.' },
    { key:'liq', title:'Liquidation rules', body:'If your collateral ratio drops below 110%, your vault becomes eligible for liquidation. Keepers can liquidate undercollateralized vaults to maintain system solvency.' },
    { key:'dust', title:'Dust thresholds', body:'Minimum vault size is 10,000 sats collateral. Vaults below the dust threshold cannot be opened or may be automatically closed.' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      <div>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.03em', marginBottom:4 }}>Vaults</h1>
        <p style={{ color:'var(--muted-fg)', fontSize:13 }}>Manage your Bitcoin collateral vaults</p>
      </div>

      <div style={{ display:'inline-flex', background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:3 }}>
        {[['create','Create Vault'],['manage','My Vaults']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'6px 18px', borderRadius:6, border:'none', cursor:'pointer',
            fontSize:13, fontWeight:tab===id?500:400,
            background:tab===id?'var(--card)':'transparent',
            color:tab===id?'var(--fg)':'var(--muted-fg)',
            transition:'all 0.12s',
            boxShadow:tab===id?'0 1px 3px rgba(0,0,0,0.2)':'none',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'create' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start', maxWidth:900 }}>

          {/* Left: inputs */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* BTC Collateral */}
            <div className='card'>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted-fg)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>BTC Collateral</div>
              <div style={{ fontSize:13, color:'var(--muted-fg)', marginBottom:12 }}>Enter the amount of BTC to deposit as collateral</div>
              <div style={{ position:'relative' }}>
                <input value={btcAmount} onChange={e => setBtcAmount(e.target.value)} type='number'
                  placeholder='0.00000000' step='0.00001' min='0'
                  className='input mono' style={{ paddingRight:52 }} />
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--muted-fg)', fontFamily:'Geist Mono, monospace' }}>BTC</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                <span style={{ fontSize:11, color:'var(--muted-fg)' }}>
                  {btcVal > 0 ? '≈ '+fmt(collateralUsd) : 'Available: '+fmtSats(walletSats)}
                </span>
                <button onClick={() => setBtcAmount(maxBtc)}
                  style={{ fontSize:11, color:'var(--btc)', background:'none', border:'none', cursor:'pointer', fontFamily:'Geist, sans-serif' }}>
                  Max
                </button>
              </div>
            </div>

            {/* LTV */}
            <div className='card'>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted-fg)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Loan-to-Value</div>
              <div style={{ fontSize:13, color:'var(--muted-fg)', marginBottom:16 }}>Drag the slider to set your LTV between 33% and 66%</div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ fontFamily:'Geist Mono, monospace', fontSize:32, fontWeight:700, color:preset.color }}>{ltv}%</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{preset.label}</div>
                  <div style={{ fontSize:11, color:'var(--muted-fg)' }}>{preset.sub}</div>
                </div>
              </div>
              <input type='range' min='33' max='66' value={ltv} onChange={e => setLtv(parseInt(e.target.value))}
                style={{ width:'100%', accentColor:preset.color, cursor:'pointer', marginBottom:12 }} />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {PRESETS.map(p => (
                  <button key={p.ltv} onClick={() => setLtv(p.ltv)} style={{
                    padding:'8px 4px', borderRadius:8, border:'1px solid',
                    borderColor:ltv===p.ltv?p.color:'var(--border)',
                    background:ltv===p.ltv?'var(--card2)':'var(--bg)',
                    cursor:'pointer', textAlign:'center', transition:'all 0.12s',
                  }}>
                    <div style={{ fontSize:12, fontWeight:600, color:p.color }}>{p.ltv}%</div>
                    <div style={{ fontSize:10, color:'var(--muted-fg)' }}>{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className='card'>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted-fg)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Information</div>
              {INFO_ITEMS.map(item => (
                <div key={item.key} style={{ borderBottom:'1px solid var(--border)', paddingBottom:8, marginBottom:8 }}>
                  <button onClick={() => setInfoOpen(infoOpen===item.key?null:item.key)}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', cursor:'pointer', padding:'4px 0', color:'var(--fg)' }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{item.title}</span>
                    {infoOpen===item.key ? <ChevronUp size={14} style={{color:'var(--muted-fg)'}} /> : <ChevronDown size={14} style={{color:'var(--muted-fg)'}} />}
                  </button>
                  {infoOpen===item.key && (
                    <div style={{ fontSize:12, color:'var(--muted-fg)', lineHeight:1.6, marginTop:8, paddingLeft:4 }}>{item.body}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: summary */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className='card'>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted-fg)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Vault Summary</div>
              <SummaryRow label='BTC Collateral' value={btcVal > 0 ? btcAmount+' BTC' : '--'} />
              <SummaryRow label='LTV' value={ltv+'%'} />
              <SummaryRow label='Risk Level' value={preset.label} color={preset.color} />
              <SummaryRow label='VUSD to Mint' value={btcVal > 0 ? fmt(vusdToMint) : '--'} />
              <SummaryRow label='Network Fee' value={networkFee.toFixed(8)+' BTC'} />
              <SummaryRow label='System Fee' value={btcVal > 0 ? fmt(systemFee) : '--'} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
                <span style={{ fontSize:13, color:'var(--muted-fg)' }}>Initial Redemption Fee</span>
                <span style={{ fontSize:13, fontFamily:'Geist Mono, monospace', fontWeight:500 }}>0.00%</span>
              </div>
            </div>

            {ltv >= 55 && (
              <div style={{ display:'flex', gap:8, padding:'10px 14px', borderRadius:10, background:'var(--danger-dim)', border:'1px solid rgba(239,68,68,0.2)', fontSize:12, color:'var(--danger)' }}>
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
                <span>High LTV increases liquidation risk. Your vault may be liquidated if BTC drops significantly.</span>
              </div>
            )}

            {openError && (
              <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--danger-dim)', color:'var(--danger)', fontSize:13, border:'1px solid rgba(239,68,68,0.2)' }}>
                {openError}
              </div>
            )}
            {openSuccess && (
              <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--success-dim)', color:'var(--success)', fontSize:13, border:'1px solid rgba(34,197,94,0.2)' }}>
                Vault opened successfully!
              </div>
            )}

            <button onClick={handleOpen} disabled={opening || !canOpen}
              className='btn btn-primary' style={{ width:'100%', padding:'13px', borderRadius:10, fontSize:15, fontWeight:600 }}>
              {opening ? 'Opening Vault...' : canOpen ? 'Open Vault' : walletSats === 0 ? 'No BTC balance' : 'Enter BTC amount'}
            </button>

            <div style={{ fontSize:11, color:'var(--muted-fg)', textAlign:'center', lineHeight:1.6 }}>
              Your BTC will be locked in a self-sovereign Taproot vault. You retain full control of your keys.
            </div>
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <div style={{ maxWidth:800 }}>
          {loadingVaults ? (
            <div className='card' style={{ textAlign:'center', padding:40, color:'var(--muted-fg)' }}>Loading vaults...</div>
          ) : vaults.length === 0 ? (
            <div className='card' style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:48, color:'var(--muted-fg)', textAlign:'center' }}>
              <Lock size={36} style={{ marginBottom:12, opacity:0.2 }} />
              <div style={{ fontSize:14, marginBottom:4 }}>No vaults yet</div>
              <div style={{ fontSize:12, marginBottom:16 }}>Create your first vault to start minting VUSD</div>
              <button onClick={() => setTab('create')} className='btn btn-primary'><Plus size={13}/> Create Vault</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {vaults.map(v => {
                const collUsd = (v.collateralSats/1e8)*btcPrice
                const stateColor = v.state==='Open'?'var(--success)':v.state==='Repaid'?'var(--warning)':'var(--muted-fg)'
                const stateBg = v.state==='Open'?'var(--success-dim)':v.state==='Repaid'?'var(--warning-dim)':'var(--card3)'
                const health = v.collateralSats && v.debt > 0 ? Math.round((v.collateralSats/1e8*btcPrice)/v.debt*100) : null
                return (
                  <div key={v.id} className='card'>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:'var(--card2)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
                          {v.state==='Open' ? <Lock size={16} style={{color:'var(--fg)'}} /> : <Unlock size={16} style={{color:'var(--muted-fg)'}} />}
                        </div>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <span style={{ fontFamily:'Geist Mono, monospace', fontSize:12, fontWeight:600 }}>{truncate(v.id)}</span>
                            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:stateBg, color:stateColor, fontWeight:500 }}>{v.state}</span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--muted-fg)', fontFamily:'Geist Mono, monospace' }}>{v.collateralSats.toLocaleString()} sats</div>
                        </div>
                      </div>
                      {health && <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:10, color:'var(--muted-fg)', marginBottom:2 }}>Health</div>
                        <div style={{ fontFamily:'Geist Mono, monospace', fontWeight:700, fontSize:18, color:healthColor(health) }}>{health}%</div>
                      </div>}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      {[
                        { label:'Collateral', value:fmt(collUsd) },
                        { label:'Debt', value:fmt(v.debt) },
                        { label:'Health', value:health?health+'%':'No debt', color:health?healthColor(health):'var(--muted-fg)' },
                      ].map(s => (
                        <div key={s.label} style={{ background:'var(--card2)', borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:11, color:'var(--muted-fg)', marginBottom:4 }}>{s.label}</div>
                          <div style={{ fontFamily:'Geist Mono, monospace', fontWeight:600, fontSize:14, color:s.color||'var(--fg)' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
