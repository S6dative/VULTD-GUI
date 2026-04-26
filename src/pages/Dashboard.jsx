import { useState, useEffect } from 'react'
import { Bitcoin, DollarSign, RefreshCw, Lock, HelpCircle, Copy, Check, ChevronRight, ArrowDownLeft, AlertTriangle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { bridge, vusd } from '../bridge/vusd'
import { useNavigate } from 'react-router-dom'

const fmt  = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
const sats = n => n >= 100000000 ? (n/100000000).toFixed(8)+' BTC' : n.toLocaleString()+' sats'
const _ago  = ms => { const s=Math.floor((Date.now()-ms)/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return'about '+Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' }

function Tip({ text }) {
  return (
    <div className="tooltip-wrap" style={{ marginLeft: 5 }}>
      <HelpCircle size={12} style={{ color: 'var(--muted-fg)', cursor: 'help' }} />
      <div className="tooltip">{text}</div>
    </div>
  )
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
  document.body.appendChild(el)
  el.focus(); el.select(); el.setSelectionRange(0, 99999)
  try { document.execCommand('copy') } finally { document.body.removeChild(el) }
}

function CopyButton({ text, size = 13 }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    copyToClipboard(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="btn btn-ghost btn-sm" style={{ padding: '3px 6px' }}>
      {copied ? <Check size={size} style={{ color: 'var(--success)' }} /> : <Copy size={size} />}
    </button>
  )
}

export default function Dashboard() {
  const { network, wallet, setBtcPrice: setCtxBtcPrice, btcSats: ctxBtcSats, setBtcSats: setCtxBtcSats, vusdBalance: ctxVusdBal, setVusdBalance: setCtxVusdBal } = useApp()
  const navigate  = useNavigate()
  const isSignet  = network === 'signet'

  const [btcPrice,    setBtcPrice]    = useState(null)
  const [priceLoading,setPriceLoading]= useState(true)
  const [btcSats,     setBtcSats]     = useState(ctxBtcSats || wallet?.btcSats || 0)
  const [vusdBal,     setVusdBal]     = useState(ctxVusdBal || 0)
  const [generating,  setGenerating]  = useState(false)
  const [vaults,      setVaults]      = useState([])
  const [txHistory,   setTxHistory]   = useState([])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res  = await bridge.btcAddress()
      const addr = typeof res === 'string' ? res.trim() : (res?.output || '').trim()
      if (addr) {
        const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
        w.address = addr
        localStorage.setItem('vultd-wallet', JSON.stringify(w))
      }
    } catch(e) { console.error('generate:', e) }
    setGenerating(false)
  }

  // Fetch BTC price — prefer CLI oracle, fall back to Coinbase (CORS-permissive endpoint)
  const fetchBtcPrice = async (fromCli = false) => {
    if (fromCli) return  // already fetched via vusd.balance() in fetchAll
    setPriceLoading(true)
    try {
      const res   = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
      const data  = await res.json()
      const price = parseFloat(data.data.amount)
      if (!isNaN(price)) {
        setBtcPrice(price)
        setCtxBtcPrice(price)
      }
    } catch { /* ignore — CLI price is used if available */ }
    setPriceLoading(false)
  }

  const fetchAll = (net) => {
    if ((net || network) === 'mainnet') {
      setBtcSats(0)
      setVusdBal(0)
      setVaults([])
      setTxHistory([])
      setPriceLoading(false)
      fetchBtcPrice(false)
      return
    }

    // Single call to vusd.balance() gives us VUSD balance + BTC price (oracle) + BTC sats
    vusd.balance().then(data => {
      // BTC sats
      if (data.btcSats >= 0) {
        setBtcSats(data.btcSats)
        setCtxBtcSats(data.btcSats)
        const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
        w.btcSats = data.btcSats
        localStorage.setItem('vultd-wallet', JSON.stringify(w))
      }
      // VUSD balance
      if (typeof data.vusdBalance === 'number') {
        setVusdBal(data.vusdBalance)
        setCtxVusdBal(data.vusdBalance)
        const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
        w.vusdBalance = data.vusdBalance
        localStorage.setItem('vultd-wallet', JSON.stringify(w))
      }
      // BTC price from CLI oracle — preferred over Coinbase API
      if (data.btcPrice && data.btcPrice > 0) {
        setBtcPrice(data.btcPrice)
        setCtxBtcPrice(data.btcPrice)
        setPriceLoading(false)
      } else {
        // CLI price unavailable (not connected) — fall back to Coinbase
        fetchBtcPrice(false)
      }
    }).catch(() => fetchBtcPrice(false))

    // Vault list
    vusd.listVaults().then(normalized => {
      if (!Array.isArray(normalized) || normalized.length === 0) return
      setVaults(normalized)
      // Build activity feed from vault events
      const activity = []
      normalized.forEach(v => {
        if (v.openedAt)  activity.push({ type: 'vault_open', ts: v.openedAt,  sats: v.collateralSats, vault: v.id })
        if (v.debt > 0)  activity.push({ type: 'mint',       ts: v.lastUpdated || v.openedAt + 60, amount: v.debt, vault: v.id })
      })
      activity.sort((a, b) => b.ts - a.ts)
      if (activity.length > 0) setTxHistory(activity)
    }).catch(() => {})

    // On-chain transfer history
    bridge.listTransactions().then(txs => {
      if (Array.isArray(txs) && txs.length > 0) {
        // Merge with vault activity — bitcoin txs shown separately
        setTxHistory(prev => {
          const btcTxs = txs.map(tx => ({ ...tx, type: tx.category === 'send' ? 'btc_send' : 'btc_recv' }))
          return [...prev.filter(t => t.type !== 'btc_send' && t.type !== 'btc_recv'), ...btcTxs]
            .sort((a, b) => (b.ts || b.time || 0) - (a.ts || a.time || 0))
            .slice(0, 20)
        })
      }
    }).catch(() => {})
  }

  useEffect(() => {
    fetchAll(network)
    const interval = setInterval(() => fetchAll(network), 60000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network])

  const vusdBalance   = vusdBal || wallet?.vusdBalance || 0
  const btcUsd        = btcPrice ? (btcSats / 100000000) * btcPrice : 0
  const isOpenState   = s => s === 'Open' || s === 'Active' || s === 'open' || s === 'active'
  const openVaults    = vaults.filter(v => isOpenState(v.state))
  const vaultBackedUp = localStorage.getItem('vultd-vault-backed-up') === 'true'
  const totalLocked   = openVaults.reduce((a, v) => a + (v.collateralSats || 0), 0)
  const totalDebt     = openVaults.reduce((a, v) => a + (v.debt || 0), 0)
  const btcAddr       = wallet?.address || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Bitcoin-backed private stablecoin</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="badge badge-warning">{isSignet ? 'Signet' : 'Mainnet'}</span>
        </div>
      </div>

      {/* BTC Price — sourced from CLI oracle */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--btc-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(247,147,26,0.2)' }}>
            <Bitcoin size={18} style={{ color: 'var(--btc)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', marginBottom: 2 }}>
              Bitcoin · Oracle Price <Tip text="BTC/USD price from the VUSD on-chain oracle (7 signers)" />
            </div>
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {priceLoading
                ? <span className="skeleton" style={{ width: 120, height: 22, display: 'inline-block' }} />
                : btcPrice ? fmt(btcPrice) : '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => fetchAll(network)} className="btn btn-secondary btn-sm" disabled={priceLoading}>
            <RefreshCw size={12} className={priceLoading ? 'spin' : ''} />
            {priceLoading ? 'Updating' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* BTC Wallet Address */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isSignet ? 'Your Signet Address (sBTC)' : 'Your Bitcoin Address'}
          </div>
          <span className={'badge ' + (isSignet ? 'badge-warning' : 'badge-btc')}>{isSignet ? 'SIGNET' : 'MAINNET'}</span>
        </div>
        {btcAddr ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'Geist Mono, monospace', fontSize: 12, color: 'var(--fg)', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {btcAddr}
            </div>
            <CopyButton text={btcAddr} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{network === 'mainnet' ? 'Connect mainnet Bitcoin node to generate address' : 'No address generated yet'}</span>
            <button onClick={handleGenerate} disabled={generating} className="btn btn-secondary btn-sm">
              {generating ? 'Generating...' : 'Generate'} <ChevronRight size={12} />
            </button>
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 8 }}>
          Send {isSignet ? 'signet BTC (sBTC)' : 'Bitcoin'} to this address to fund your wallet and open vaults
        </div>
      </div>

      {/* Balance grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* BTC + VUSD */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Total Balance
          </div>
          {btcSats === 0 && vusdBalance === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted-fg)' }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>No balance yet</div>
              <div style={{ fontSize: 12 }}>{isSignet ? 'Connect signet node to load balance' : 'Deposit BTC to your address above'}</div>
            </div>
          ) : (
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 14 }}>
              {fmt(btcUsd + vusdBalance)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: Bitcoin, color: 'var(--btc)', bg: 'var(--btc-dim)', label: isSignet ? 'sBTC' : 'BTC', sub: sats(btcSats), value: fmt(btcUsd), badge: isSignet ? 'SIGNET' : null, badgeClass: 'badge-warning', asset: 'btc' },
              { icon: DollarSign, color: 'var(--fg-dim)', bg: 'var(--card3)', label: 'VUSD', sub: 'Private stablecoin', value: fmt(vusdBalance), badge: null, asset: 'vusd' },
            ].map(({ icon: Icon, color, bg, label, sub, value, badge, badgeClass, asset }) => (
              <div key={label} onClick={() => navigate('/transfer?asset=' + asset)} className="card2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 13 }}>
                      {label}
                      {badge && <span className={'badge ' + badgeClass} style={{ fontSize: 9 }}>{badge}</span>}
                    </div>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--muted-fg)' }}>{sub}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: 13 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Vault summary */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vault Summary</div>
            <button onClick={() => navigate('/vaults')} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
              View all <ChevronRight size={11} />
            </button>
          </div>
          {openVaults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted-fg)' }}>
              <Lock size={28} style={{ marginBottom: 8, opacity: 0.25 }} />
              <div style={{ fontSize: 13, marginBottom: 4 }}>No open vaults</div>
              {vusdBalance > 0 && (
                <div style={{ fontSize: 12, marginBottom: 8, lineHeight: 1.5, padding: '0 8px' }}>
                  You have {fmt(vusdBalance)} VUSD from a previous vault.<br/>Open a new vault to mint more.
                </div>
              )}
              <button onClick={() => navigate('/vaults')} className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>
                Open a vault
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Open vaults</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>{network === 'mainnet' ? 0 : openVaults.length}</span>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>BTC locked</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 500 }}>{sats(totalLocked)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Total debt</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 500 }}>{network === 'mainnet' ? fmt(0) : fmt(totalDebt)}</span>
              </div>
              {openVaults.filter(v => {
                const cr = v.collateralSats && v.debt > 0 && btcPrice
                  ? Math.round((v.collateralSats / 1e8 * btcPrice) / v.debt * 100)
                  : null
                return cr && cr < 150
              }).map(v => {
                const cr = Math.round((v.collateralSats / 1e8 * btcPrice) / v.debt * 100)
                return (
                  <div key={v.id} style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, padding:'8px 10px', borderRadius:6, background:'var(--danger-dim)', border:'1px solid var(--danger)' }}>
                    <AlertTriangle size={13} style={{color:'var(--danger)', flexShrink:0}} />
                    <span style={{ fontSize:12, color:'var(--danger)' }}>Vault CR at {cr}% — add collateral or repay</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vault backup reminder */}
      {openVaults.length > 0 && !vaultBackedUp && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 14px', borderRadius:10, background:'var(--warning-dim)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <AlertTriangle size={14} style={{ color:'var(--warning)', flexShrink:0 }} />
            <span style={{ color:'var(--warning)' }}>Back up your vault recovery key — needed to recover your vault if this device is lost.</span>
          </div>
          <button onClick={() => navigate('/vaults')} className="btn btn-secondary btn-sm" style={{ whiteSpace:'nowrap', fontSize:11, borderColor:'rgba(245,158,11,0.4)', color:'var(--warning)' }}>
            Vaults → Export
          </button>
        </div>
      )}

      {/* Activity */}
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Recent Activity
        </div>
        {txHistory.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 0', color:'var(--muted-fg)', textAlign:'center' }}>
            <div style={{ fontSize:13, marginBottom:4 }}>No activity yet</div>
            <div style={{ fontSize:12 }}>Transactions will appear here</div>
          </div>
        ) : txHistory.slice(0, 12).map((tx, i) => {
          const isOpen    = tx.type === 'vault_open'
          const isMint    = tx.type === 'mint'
          const isBtcSend = tx.type === 'btc_send'
          const isBtcRecv = tx.type === 'btc_recv'
          const label = isOpen    ? 'Vault Opened'
                      : isMint    ? 'VUSD Minted'
                      : isBtcSend ? 'Sent sBTC'
                      : isBtcRecv ? 'Received sBTC'
                      : tx.spent  ? 'Sent VUSD'
                      : 'Received VUSD'
          const color = isOpen ? 'var(--btc)' : isBtcSend ? 'var(--danger)' : 'var(--success)'
          const bg    = isOpen ? 'var(--warning-dim)' : isBtcSend ? 'var(--danger-dim)' : 'var(--success-dim)'
          const value = isOpen    ? (tx.sats||0).toLocaleString()+' sats locked'
                      : isMint    ? '+'+fmt(tx.amount||0)+' VUSD'
                      : isBtcSend ? '-'+Math.abs(tx.amount||0).toFixed(8)+' BTC'
                      : isBtcRecv ? '+'+Math.abs(tx.amount||0).toFixed(8)+' BTC'
                      : (tx.spent ? '-' : '+')+fmt(tx.amount||0)+' VUSD'
          const ts = tx.ts || tx.time || tx.received_at
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom: i < Math.min(txHistory.length,12)-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {isOpen ? <Lock size={14} style={{color:'var(--btc)'}} /> : <ArrowDownLeft size={14} style={{color}} />}
                </div>
                <div>
                  <div style={{ fontWeight:500, fontSize:13 }}>{label}</div>
                  <div style={{ fontSize:11, color:'var(--muted-fg)' }}>{ts ? new Date(ts*1000).toLocaleDateString() : ''}</div>
                </div>
              </div>
              <div style={{ fontFamily:'Geist Mono, monospace', fontWeight:600, fontSize:13, color }}>{value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
