import { useState, useEffect } from 'react'
import { Plus, Lock, Unlock, AlertTriangle, Info, ChevronDown, ChevronUp, Eye, EyeOff, Copy, Shield, Download } from 'lucide-react'
import { useState as uS } from 'react'
import { bridge } from '../bridge/vusd'
import { useApp } from '../contexts/AppContext'

const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
const fmtSats = n => n >= 100000000 ? (n/100000000).toFixed(8)+' BTC' : n.toLocaleString()+' sats'
const truncate = id => { const s=String(id||''); const h=s.replace('vault:',''); return 'vault:'+h.slice(0,8)+'...'+h.slice(-8) }
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

function AddCollateralPanel({ vaultId, isSignet, v, btcPrice }) {
  const [sats, setSats] = uS('')
  const [loading, setLoading] = uS(false)
  const [msg, setMsg] = uS(null)
  const [confirmed, setConfirmed] = uS(false)
  const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)

  const addSats = parseInt(sats) || 0
  const currentCollSats = v?.collateralSats || 0
  const newCollSats = currentCollSats + addSats
  const newCollUsd = (newCollSats / 1e8) * (btcPrice || 71000)
  const debt = v?.debt || 0
  const newCR = debt > 0 ? Math.round(newCollUsd / debt * 100) : null
  const newLiqPrice = debt > 0 ? Math.round((debt * 1.1) / (newCollSats / 1e8)) : null
  const networkFee = Math.round(addSats * 0.0001)

  const handle = async () => {
    if (!sats || isNaN(sats) || addSats <= 0) return
    if (!confirmed) { setConfirmed(true); return }
    setLoading(true); setMsg(null)
    try {
      const res = await bridge.addCollateral(vaultId, sats)
      const out = String(res?.output || res || '')
      // Check only the last line for errors (ignore oracle warnings)
      const lastLine = out.split('\n').filter(l => l.trim()).pop() || ''
      if (lastLine.toLowerCase().includes('error') || lastLine.toLowerCase().includes('failed')) throw new Error(lastLine)
      // Extract CR from output if available
      const crMatch = out.match(/New CR[:\s]+([\.\d]+)%/)
      const newCRFromOutput = crMatch ? parseFloat(crMatch[1]).toFixed(2) : null
      setMsg({ ok: true, text: '✅ Collateral added! New CR: ' + (newCRFromOutput || newCR) + '%' })
      setSats('')
      setConfirmed(false)
      // Re-fetch vault data to update collateral display
      bridge.readVaults().then(data => {
        if (!data) return
        const entries = Object.entries(data)
        const updated = entries.map(([id, v]) => ({
          id: String(id),
          state: v.state === 'Active' ? 'Open' : (v.state || 'Unknown'),
          collateralSats: v.locked_btc || 0,
          debt: typeof v.debt_vusd === 'number' && v.debt_vusd > 1e15 ? v.debt_vusd / 1e18 : (v.debt_vusd || 0),
          openedAt: v.open_timestamp || 0,
          lastUpdated: v.last_updated || 0,
          openFeeSats: v.open_fee_paid_sats || 0,
          ownerPubkey: v.owner_pubkey || '',
          ownerPubkeyFull: v.owner_pubkey_full || '',
          taprootTxid: v.taproot_txid || '',
          liq_price: v.liq_price || null,
          health_cr: v.health_cr || null,
        }))
        // Trigger parent re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('vaults-updated', { detail: updated }))
      }).catch(() => {})
      // Refresh vault list
      setTimeout(() => window.location.reload(), 1500)
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:500, marginBottom:6 }}>Add Collateral</div>
      <div style={{ display:'flex', gap:8, marginBottom: addSats > 0 ? 10 : 0 }}>
        <input value={sats} onChange={e => { setSats(e.target.value); setConfirmed(false) }} placeholder='Amount in sats' className='input mono' style={{ flex:1, fontSize:12 }} />
        <button onClick={handle} disabled={loading || !sats} className={confirmed ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize:12, whiteSpace:'nowrap' }}>
          {loading ? 'Adding...' : confirmed ? '✓ Confirm' : 'Preview'}
        </button>
      </div>
      {addSats > 0 && (
        <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 12px', fontSize:11, display:'flex', flexDirection:'column', gap:6, border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'var(--muted-fg)' }}>Adding</span>
            <span style={{ fontFamily:'Geist Mono, monospace' }}>{addSats.toLocaleString()} {isSignet?'sBTC':'BTC'} sats</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'var(--muted-fg)' }}>Total collateral after</span>
            <span style={{ fontFamily:'Geist Mono, monospace' }}>{newCollSats.toLocaleString()} sats ({fmt(newCollUsd)})</span>
          </div>
          {newCR && <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'var(--muted-fg)' }}>New collateral ratio</span>
            <span style={{ fontFamily:'Geist Mono, monospace', color: newCR >= 200 ? 'var(--success)' : newCR >= 150 ? 'var(--warning)' : 'var(--danger)' }}>{newCR}%</span>
          </div>}
          {newLiqPrice && <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'var(--muted-fg)' }}>New liquidation price</span>
            <span style={{ fontFamily:'Geist Mono, monospace', color:'var(--danger)' }}>${newLiqPrice.toLocaleString()}</span>
          </div>}
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'var(--muted-fg)' }}>Estimated network fee</span>
            <span style={{ fontFamily:'Geist Mono, monospace' }}>~{networkFee} sats</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:'var(--muted-fg)' }}>Protocol fee</span>
            <span style={{ fontFamily:'Geist Mono, monospace', color:'var(--success)' }}>None</span>
          </div>
          {confirmed && <div style={{ marginTop:4, padding:'6px 8px', background:'var(--warning-dim)', borderRadius:6, color:'var(--warning)', fontSize:11 }}>
            Click Confirm to add collateral to your vault.
          </div>}
        </div>
      )}
      {msg && <div style={{ fontSize:11, marginTop:6, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}
    </div>
  )
}

function CloseVaultPanel({ vaultId, debt }) {
  const [loading, setLoading] = uS(false)
  const [msg, setMsg] = uS(null)
  const [confirm, setConfirm] = uS(false)
  const handle = async () => {
    if (!confirm) { setConfirm(true); return }
    setLoading(true); setMsg(null)
    try {
      const res = await bridge.closeVault(vaultId)
      const out = res?.output || res || ''
      if (String(out).includes('Error') || String(out).includes('error')) throw new Error(out)
      setMsg({ ok: true, text: 'Vault closed!' })
      setConfirm(false)
    } catch(e) { setMsg({ ok: false, text: e.message }) }
    setLoading(false)
  }
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:500, marginBottom:6 }}>Close Vault</div>
      {debt > 0 && <div style={{ fontSize:11, color:'var(--warning)', marginBottom:6 }}>Repay ${debt.toFixed(2)} VUSD debt before closing.</div>}
      <button onClick={handle} disabled={loading || (debt > 0)} className='btn btn-danger' style={{ fontSize:12, width:'100%' }}>
        {loading ? 'Closing...' : confirm ? '⚠ Confirm Close Vault' : 'Close Vault'}
      </button>
      {msg && <div style={{ fontSize:11, marginTop:4, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</div>}
    </div>
  )
}

function VaultCard({ v, collUsd, health, stateColor, stateBg, isSignet, btcPrice }) {
  const [expanded, setExpanded] = uS(false)
  const [showPubkey, setShowPubkey] = uS(false)
  const [copied, setCopied] = uS(false)
  const [exportCopied, setExportCopied] = uS(false)
  const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)

  const exportRecovery = async () => {
    try {
      const rawBackup = await bridge.readVaultsRaw()
      const pkg = {
        vault_id: v.id,
        owner_pubkey: v.ownerPubkeyFull || v.ownerPubkey || '',
        owner_seed_hint: 'stored in ~/.vusd/keystore.json',
        vaults_backup: rawBackup,
        created_at: new Date().toISOString(),
        instructions: 'To recover: restore vaults.json to ~/.vusd/ and run: vusd health --vault ' + v.id,
      }
      await navigator.clipboard.writeText(JSON.stringify(pkg, null, 2))
      setExportCopied(true)
      localStorage.setItem('vultd-vault-backed-up', 'true')
      setTimeout(() => setExportCopied(false), 3000)
    } catch(e) { console.error('export recovery:', e) }
  }

  // Compute liq price from live btcPrice and current collateral/debt so it
  // updates dynamically even when vaults.json doesn't have the field.
  // Formula: price at which CR = 110% (1.1x debt / collateral BTC)
  const liqPrice = v.debt > 0 ? Math.round((v.debt * 1.1) / (v.collateralSats / 1e8)) : null

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className='card'>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--card2)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
            {v.state==='Open' || v.state==='Active' ? <Lock size={16} style={{color:'var(--fg)'}} /> : <Unlock size={16} style={{color:'var(--muted-fg)'}} />}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:'Geist Mono, monospace', fontSize:12, fontWeight:600 }}>{v.id.slice(0,14)}...{v.id.slice(-8)}</span>
              <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:stateBg, color:stateColor, fontWeight:500 }}>{v.state}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted-fg)', fontFamily:'Geist Mono, monospace' }}>{(v.collateralSats||0).toLocaleString()} sats</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {health && <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--muted-fg)', marginBottom:2 }}>Health</div>
            <div style={{ fontFamily:'Geist Mono, monospace', fontWeight:700, fontSize:18, color: health>=200?'var(--success)':health>=150?'var(--warning)':'var(--danger)' }}>{health}%</div>
          </div>}
          <button onClick={() => setExpanded(!expanded)} style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'var(--muted-fg)' }}>
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom: expanded?16:0 }}>
        {[
          { label: isSignet ? 'sBTC Collateral' : 'BTC Collateral', value: fmt(collUsd) },
          { label:'Debt', value: fmt(v.debt||0) },
          { label:'Health', value: health ? health+'%' : 'No debt', color: health ? (health>=200?'var(--success)':health>=150?'var(--warning)':'var(--danger)') : 'var(--muted-fg)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--card2)', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:11, color:'var(--muted-fg)', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontFamily:'Geist Mono, monospace', fontWeight:600, fontSize:14, color:s.color||'var(--fg)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'Full Vault ID', value: v.id, mono:true, copyable:true },
            { label:'Opened', value: v.openedAt ? new Date(v.openedAt*1000).toLocaleString() : '--' },
            { label:'Last Updated', value: v.lastUpdated ? new Date(v.lastUpdated*1000).toLocaleString() : '--' },
            { label:'Open Fee Paid', value: v.openFeeSats ? v.openFeeSats.toLocaleString()+' sats' : '--' },
            { label:'Liq. Price', value: liqPrice ? '$'+liqPrice.toLocaleString() : (v.liq_price ? '$'+v.liq_price.toLocaleString() : '--'), color:'var(--danger)' },
            { label:'Collateral Ratio', value: health ? health+'%' : (v.health_cr ? v.health_cr+'%' : '--'), color: health ? (health>=200?'var(--success)':health>=150?'var(--warning)':'var(--danger)') : undefined },
            { label:'Taproot TXID', value: v.taprootTxid || '--', mono:true },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
              <span style={{ color:'var(--muted-fg)', flexShrink:0 }}>{row.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontFamily: row.mono?'Geist Mono, monospace':'inherit', color: row.color||'var(--fg)', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>{row.value}</span>
                {row.copyable && <button onClick={() => copy(row.value)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted-fg)', padding:2 }}><Copy size={11}/></button>}
              </div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
            <span style={{ color:'var(--muted-fg)' }}>Owner Pubkey</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontFamily:'Geist Mono, monospace', fontSize:11, color:'var(--fg)' }}>
                {showPubkey ? (v.ownerPubkey||'--') : '••••••••••••••••...'}
              </span>
              <button onClick={() => setShowPubkey(!showPubkey)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted-fg)', padding:2 }}>
                {showPubkey ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
            </div>
          </div>

          {/* Vault Recovery Key */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <Shield size={12} style={{ color:'var(--warning)' }} />
              <span style={{ fontSize:12, fontWeight:600, color:'var(--warning)' }}>Vault Recovery Key</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted-fg)', marginBottom:10, lineHeight:1.5 }}>
              Export a recovery package containing your vault ID, owner pubkey, and vault backup. Store it securely — anyone with your owner seed and this file can access your vault.
            </div>
            <button onClick={exportRecovery}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:7, border:'1px solid var(--warning)', background:'var(--warning-dim)', color:'var(--warning)', fontSize:12, fontWeight:500, cursor:'pointer', width:'100%', justifyContent:'center' }}>
              <Download size={12} />
              {exportCopied ? 'Recovery package copied to clipboard!' : 'Export Recovery Package'}
            </button>
          </div>

          {/* Actions */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', flexDirection:'column', gap:8 }}>
            <AddCollateralPanel vaultId={v.id} isSignet={isSignet} v={v} btcPrice={btcPrice} />
            <CloseVaultPanel vaultId={v.id} debt={v.debt} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Vaults() {
  const { wallet, network, btcPrice: liveBtcPrice } = useApp()
  const isSignet = network === 'signet'
  const [tab, setTab] = useState('create')
  const [btcAmount, setBtcAmount] = useState('')
  const [ltv, setLtv] = useState(44)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [vaults, setVaults] = useState([])
  const [loadingVaults, setLoadingVaults] = useState(true)
  const [infoOpen, setInfoOpen] = useState(null)
  const btcPrice = liveBtcPrice || 85000
  const walletSats = wallet?.btcSats || 0

  const [realSats, setRealSats] = useState(walletSats)

  useEffect(() => {
    const handler = (e) => setVaults(e.detail)
    window.addEventListener('vaults-updated', handler)
    return () => window.removeEventListener('vaults-updated', handler)
  }, [])

  useEffect(() => {
    bridge.btcBalance().then(bal => {
      const balNum = typeof bal === 'number' ? bal : parseFloat(bal)
      if (!isNaN(balNum) && balNum >= 0) setRealSats(Math.round(balNum * 1e8))
    }).catch(() => {})
    bridge.readVaults().then(data => {
      if (!data) return
      const entries = Object.entries(data)
      setVaults(entries.map(([id, v]) => ({
        id: String(id || ''),
        state: v.state === 'Active' ? 'Open' : (v.state || 'Unknown'),
        collateralSats: v.locked_btc || 0,
        debt: typeof v.debt_vusd === 'number' && v.debt_vusd > 1e15 ? (v.debt_vusd / 1e18) : (v.debt_vusd || 0),
        openedAt: v.open_timestamp || 0,
        lastUpdated: v.last_updated || 0,
        openFeeSats: v.open_fee_paid_sats || 0,
        ownerPubkey: v.owner_pubkey || '',
        ownerPubkeyFull: v.owner_pubkey_full || '',
        taprootTxid: v.taproot_txid || '',
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
  const canOpen = btcVal > 0 && collateralSats <= realSats && collateralSats > 0
  const maxBtc = Math.max(0, realSats/1e8 - networkFee).toFixed(8)

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
          id: String(id || ''),
          state: v.state === 'Active' ? 'Open' : (v.state || 'Unknown'),
          collateralSats: v.locked_btc || 0,
          debt: typeof v.debt_vusd === 'number' && v.debt_vusd > 1e15 ? (v.debt_vusd / 1e18) : (v.debt_vusd || 0),
          openedAt: v.open_timestamp || 0,
          lastUpdated: v.last_updated || 0,
          openFeeSats: v.open_fee_paid_sats || 0,
          ownerPubkey: v.owner_pubkey || '',
          ownerPubkeyFull: v.owner_pubkey_full || '',
          taprootTxid: v.taproot_txid || '',
        })))
      }
    } catch(e) {
      setOpenError(e.message || 'Failed to open vault')
    }
    setOpening(false)
  }

  const INFO_ITEMS = [
    { key:'ltv', title:'LTV explained', body:'Loan-to-Value (LTV) is the ratio of your VUSD debt to your BTC/sBTC collateral. A lower LTV means you mint less VUSD relative to your collateral — safer but less capital efficient. A higher LTV lets you mint more but increases your liquidation risk if BTC price falls.' },
    { key:'cr', title:'Collateral ratio & health', body:'Your collateral ratio (CR) is the inverse of LTV — it shows how well-backed your debt is. The higher your CR, the further BTC would need to fall before your vault is at risk. Monitor your vault health regularly and top up collateral or repay debt if the price moves against you.' },
    { key:'liq', title:'Liquidation rules', body:'If your collateral ratio falls below the minimum threshold, your vault becomes eligible for liquidation by keeper bots. The keeper repays your debt and claims your BTC/sBTC collateral as reward. Choose an LTV that gives you a comfortable buffer above the liquidation threshold.' },
    { key:'liq2', title:'What happens if liquidated?', body:'When a vault is liquidated, the debt is cleared and the keeper claims the collateral. You keep any VUSD you already minted and spent, but lose your locked BTC/sBTC. The best protection is a conservative LTV and watching your liquidation price relative to the current BTC price.' },
    { key:'fee', title:'Redemption fee (52k blocks)', body:'VUSD holders can redeem their VUSD directly against vaults in the system, starting with the lowest collateral ratio vault. If your vault is redeemed against, your debt decreases and collateral is returned proportionally. A time-based fee discourages redemption against newly opened vaults.' },
    { key:'keeper', title:'Keeper bots', body:'Keepers are permissionless bots that scan vaults and liquidate any that fall below the minimum CR. Anyone can run a keeper using the vusd keeper run command. Keepers earn a bonus from the liquidated collateral as an incentive to keep the protocol solvent.' },
    { key:'dust', title:'Minimum vault size', body:'There is a minimum collateral requirement to open a vault, plus a small one-time open fee deducted from your collateral. Vaults below the minimum size cannot be opened or may be automatically closed if collateral falls too low.' },
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
              <div style={{ fontSize:13, color:'var(--muted-fg)', marginBottom:12 }}>{isSignet ? "Enter the amount of sBTC to deposit as collateral" : isSignet ? 'Enter the amount of sBTC to deposit as collateral' : 'Enter the amount of BTC to deposit as collateral'}</div>
              <div style={{ position:'relative' }}>
                <input value={btcAmount} onChange={e => setBtcAmount(e.target.value)} type='number'
                  placeholder='0.00000000' step='0.00001' min='0'
                  className='input mono' style={{ paddingRight:52 }} />
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--muted-fg)', fontFamily:'Geist Mono, monospace' }}>BTC</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                <span style={{ fontSize:11, color:'var(--muted-fg)' }}>
                  {btcVal > 0 ? '≈ '+fmt(collateralUsd) : 'Available: '+fmtSats(realSats)}
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
                  <div style={{ fontSize:11, color:'var(--muted-fg)' }}>{Math.round(100/(ltv/100))}% CR</div>
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
                    <div style={{ fontSize:10, color:'var(--muted-fg)' }}>{Math.round(100/(p.ltv/100))}% CR</div>
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
              <SummaryRow label={isSignet ? 'sBTC Collateral' : 'BTC Collateral'} value={btcVal > 0 ? btcAmount+' BTC' : '--'} />
              <SummaryRow label='LTV' value={ltv+'%'} />
              <SummaryRow label='Risk Level' value={preset.label} color={preset.color} />
              <SummaryRow label='VUSD to Mint' value={btcVal > 0 ? fmt(vusdToMint) : '--'} />
              <SummaryRow label='After Fees' value={btcVal > 0 ? (btcVal - networkFee).toFixed(8)+isSignet ? ' sBTC locked' : ' BTC locked' : '--'} />
              <SummaryRow label='Network Fee' value={networkFee.toFixed(8)+(isSignet ? " sBTC" : " BTC")} />
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
              {opening ? 'Opening Vault...' : canOpen ? 'Open Vault' : walletSats === 0 ? isSignet ? 'No sBTC balance' : 'No BTC balance' : 'Enter BTC amount'}
            </button>

            <div style={{ fontSize:11, color:'var(--muted-fg)', textAlign:'center', lineHeight:1.6 }}>
              Your BTC will be locked in a self-sovereign Taproot vault. You retain full control of your keys.
            </div>
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <div style={{ maxWidth:800, display:'flex', flexDirection:'column', gap:16 }}>
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
                const stateColor = v.state==='Open' || v.state==='Active' ? 'var(--success)' : v.state==='Repaid' ? 'var(--warning)' : 'var(--muted-fg)'
                const stateBg = v.state==='Open' || v.state==='Active' ? 'var(--success-dim)' : v.state==='Repaid' ? 'var(--warning-dim)' : 'var(--card3)'
                const health = v.collateralSats && v.debt > 0 ? Math.round((v.collateralSats/1e8*btcPrice)/v.debt*100) : null
                return (
                  <VaultCard key={v.id} v={v} collUsd={collUsd} health={health} stateColor={stateColor} stateBg={stateBg} isSignet={isSignet} btcPrice={btcPrice} />
                )
              })}
            </div>
          )}

          <div className='card'>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Recover a Vault</div>
            <div style={{ fontSize:12, color:'var(--muted-fg)', marginBottom:12 }}>
              Vault state is stored in <code style={{fontFamily:'Geist Mono,monospace',background:'var(--card2)',padding:'1px 4px',borderRadius:3}}>~/.vusd/vaults.json</code>. Back this up to restore on a new device. Your vault keys derive from your owner seed — keep it safe.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input placeholder='Paste vault ID to re-track (vault:...)' className='input mono' style={{ flex:1, fontSize:11 }} />
              <button className='btn btn-secondary' style={{ whiteSpace:'nowrap', fontSize:12 }}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
