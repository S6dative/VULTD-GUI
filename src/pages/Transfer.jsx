import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { useLocation } from 'react-router-dom'
import { bridge } from '../bridge/vusd'
import { Shield, Copy, Check, ArrowUpRight, ArrowDownLeft, RefreshCw, Bitcoin, DollarSign, ChevronDown } from 'lucide-react'

const fmt  = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
const sats = n => n >= 100000000 ? (n/100000000).toFixed(8)+' BTC' : n.toLocaleString()+' sats'

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  return (
    <button onClick={copy} className="btn btn-secondary btn-sm">
      {copied ? <><Check size={12} style={{color:'var(--success)'}} /> Copied</> : <><Copy size={12}/> Copy</>}
    </button>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'inline-flex', background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:3 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'6px 16px', borderRadius:6, border:'none', cursor:'pointer',
          fontSize:13, fontWeight: active===t.id ? 500 : 400,
          background: active===t.id ? 'var(--card)' : 'transparent',
          color: active===t.id ? 'var(--fg)' : 'var(--muted-fg)',
          transition:'all 0.12s',
          boxShadow: active===t.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
          fontFamily:'Geist, sans-serif',
          letterSpacing:'-0.01em',
        }}>
          {t.icon && <t.icon size={13} />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

function AssetSelector({ value, onChange, btcSats, vusdBalance, btcPriceVal, network }) {
  const isSignet = network === 'signet'
  const btcUsd = btcPriceVal ? (btcSats/100000000)*btcPriceVal : 0
  const assets = [
    { id:'btc',  label: isSignet ? 'sBTC (Signet)' : 'Bitcoin', sub: btcSats > 0 ? sats(btcSats) : '0 sats', value: fmt(btcUsd), icon:Bitcoin, color:'var(--btc)', bg:'var(--btc-dim)' },
    { id:'vusd', label:'VUSD',    sub:'Private stablecoin',                       value: fmt(vusdBalance), icon:DollarSign, color:'var(--fg-dim)', bg:'var(--card3)' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <span className="label">Asset</span>
      <div style={{ display:'flex', gap:8 }}>
        {assets.map(a => (
          <button key={a.id} onClick={() => onChange(a.id)} style={{
            flex:1, display:'flex', alignItems:'center', gap:10,
            padding:'10px 12px', borderRadius:8, cursor:'pointer',
            border: value===a.id ? '1px solid var(--border2)' : '1px solid var(--border)',
            background: value===a.id ? 'var(--card2)' : 'var(--bg)',
            textAlign:'left', transition:'all 0.12s',
          }}>
            <div style={{ width:30, height:30, borderRadius:7, background:a.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <a.icon size={14} style={{color:a.color}} />
            </div>
            <div style={{flex:1}}>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)', letterSpacing:'-0.01em' }}>{a.label}</div>
              <div style={{ fontSize:11, color:'var(--muted-fg)', fontFamily:'Geist Mono, monospace' }}>{a.sub}</div>
            </div>
            <div style={{ fontSize:12, fontFamily:'Geist Mono, monospace', color:'var(--fg-dim)' }}>{a.value}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Send Panel ────────────────────────────────────────────────────────────────
function SendPanel({ wallet, network, btcPrice, defaultAsset }) {
  const isSignet = network === 'signet'
  const [asset, setAsset] = useState(defaultAsset || 'btc')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)
  const btcPriceVal = btcPrice || 85000

  const btcSats = wallet?.btcSats || 0
  const vusdBalance = wallet?.vusdBalance || 0
  const sendValue = parseFloat(amount) || 0
  const isBtc = asset === 'btc'

  const maxAmount = isBtc ? btcSats / 100000000 : vusdBalance
  const isValidAddr = isBtc
    ? (to.startsWith('tb1') || to.startsWith('bc1') || to.startsWith('1') || to.startsWith('3'))
    : to.startsWith('vusd:')
  const isValid = sendValue > 0 && sendValue <= maxAmount && isValidAddr

  const handleSend = async () => {
    if (!isValid) return
    setSending(true); setStatus(null)
    try {
      if (isBtc) {
        // bitcoin-cli sendtoaddress
        const btcAmt = sendValue.toFixed(8)
        await window.electron.bitcoinCli(['sendtoaddress', to, parseFloat(btcAmt)])
      } else {
        throw new Error('VUSD transfers require Lightning (LND). Connect your Lightning node in Settings to enable VUSD sends.')
      }
      setStatus({ ok:true, msg: isBtc ? `Sent ${sendValue} BTC to ${to.slice(0,16)}...` : 'VUSD sent over Lightning!' })
      setTo(''); setAmount('')
    } catch (e) {
      setStatus({ ok:false, msg:'Send failed: '+(e.message||'check node connection') })
    }
    setSending(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <AssetSelector value={asset} onChange={a => { setAsset(a); setTo(''); setAmount(''); setStatus(null) }}
        btcSats={btcSats} vusdBalance={vusdBalance} btcPriceVal={btcPriceVal} network={network} />

      {/* Privacy notice for VUSD */}
      {!isBtc && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, background:'var(--success-dim)', border:'1px solid rgba(34,197,94,0.15)' }}>
          <Shield size={13} style={{color:'var(--success)', flexShrink:0}} />
          <span style={{ fontSize:12, color:'var(--success)', lineHeight:1.5 }}>
            Ring signatures + stealth addresses. Sender, recipient and amount are hidden.
          </span>
        </div>
      )}

      <div>
        <span className="label">{isBtc ? isSignet ? 'sBTC Address (Signet)' : 'Bitcoin Address' : 'VUSD Stealth Address'}</span>
        <input value={to} onChange={e => setTo(e.target.value)}
          placeholder={isBtc ? (network==='signet' ? 'tb1q...' : 'bc1q...') : 'vusd:...'}
          className="input mono"
          style={{ fontSize:12 }}
        />
        {to && !isValidAddr && (
          <div style={{ fontSize:11, color:'var(--danger)', marginTop:4 }}>
            {isBtc ? 'Invalid Bitcoin address' : 'Must start with vusd:'}
          </div>
        )}
      </div>

      <div>
        <span className="label">{isBtc ? isSignet ? 'Amount (sBTC)' : 'Amount (BTC)' : 'Amount (USD)'}</span>
        <div style={{ position:'relative' }}>
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number"
            placeholder={isBtc ? '0.00000000' : '0.00'}
            className="input mono"
            step={isBtc ? '0.00000001' : '0.01'}
          />
          <button onClick={() => setAmount(String(maxAmount))}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'var(--card3)', border:'none', color:'var(--muted-fg)', fontSize:11, padding:'2px 8px', borderRadius:4, cursor:'pointer', fontFamily:'Geist, sans-serif' }}>
            Max
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--muted-fg)', marginTop:4, fontFamily:'Geist Mono, monospace' }}>
          Available: {isBtc ? sats(btcSats) : fmt(vusdBalance)}
        </div>
      </div>

      {status && (
        <div style={{ padding:'10px 14px', borderRadius:8, background: status.ok ? 'var(--success-dim)' : 'var(--danger-dim)', color: status.ok ? 'var(--success)' : 'var(--danger)', fontSize:13, border: `1px solid ${status.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {status.msg}
        </div>
      )}

      <button onClick={handleSend} disabled={sending || !isValid} className="btn btn-primary btn-lg" style={{ width:'100%', borderRadius:10 }}>
        {sending
          ? <><RefreshCw size={14} className="spin" /> Sending...</>
          : <><ArrowUpRight size={14} /> Send {sendValue > 0 ? (isBtc ? sendValue+' BTC' : fmt(sendValue)+' VUSD') : ''}</>}
      </button>
    </div>
  )
}

// ── Receive Panel ─────────────────────────────────────────────────────────────
function ReceivePanel({ wallet, defaultAsset, network }) {
  const isSignet = network === 'signet'
  const [asset, setAsset] = useState(defaultAsset || 'btc')
  const [vusdAddr, setVusdAddr] = useState(() => {
    const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
    return w.vusdAddress || wallet?.vusdAddress || ''
  })
  const [genning, setGenning] = useState(false)
  const btcAddr = wallet?.address || ''
  const isBtc = asset === 'btc'
  const displayAddr = isBtc ? btcAddr : vusdAddr

  const generateVusd = async () => {
    setGenning(true)
    try {
      const res = await bridge.generateAddress()
      const out = typeof res === 'string' ? res : (res?.output || res?.address || '')
      const addr = out.trim().split('\n').pop() || ''
      setVusdAddr(addr)
      const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
      w.vusdAddress = addr
      localStorage.setItem('vultd-wallet', JSON.stringify(w))
    } catch (e) { console.error('generate-address', e) }
    setGenning(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Asset toggle */}
      <div>
        <span className="label">Asset</span>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { id:'btc',  label: isSignet ? 'sBTC (Signet)' : 'Bitcoin',  icon:Bitcoin,     color:'var(--btc)',     bg:'var(--btc-dim)' },
            { id:'vusd', label:'VUSD',     icon:DollarSign,  color:'var(--fg-dim)',  bg:'var(--card3)' },
          ].map(a => (
            <button key={a.id} onClick={() => setAsset(a.id)} style={{
              flex:1, display:'flex', alignItems:'center', gap:8,
              padding:'10px 12px', borderRadius:8, cursor:'pointer',
              border: asset===a.id ? '1px solid var(--border2)' : '1px solid var(--border)',
              background: asset===a.id ? 'var(--card2)' : 'var(--bg)',
              transition:'all 0.12s',
            }}>
              <div style={{ width:26, height:26, borderRadius:6, background:a.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <a.icon size={13} style={{color:a.color}} />
              </div>
              <span style={{ fontSize:13, fontWeight:asset===a.id?500:400, color: asset===a.id ? 'var(--fg)' : 'var(--muted-fg)', letterSpacing:'-0.01em' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Address display */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span className="label" style={{ marginBottom:0 }}>
            {isBtc ? 'Your Bitcoin Address' : 'Your VUSD Stealth Address'}
          </span>
          {!isBtc && (
            <button onClick={generateVusd} disabled={genning} className="btn btn-ghost btn-sm">
              <RefreshCw size={11} className={genning ? 'spin' : ''} />
              {genning ? 'Generating...' : 'Generate new'}
            </button>
          )}
        </div>

        {displayAddr ? (
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px' }}>
            <div style={{ fontFamily:'Geist Mono, monospace', fontSize:12, color:'var(--fg)', wordBreak:'break-all', lineHeight:1.8, marginBottom:12 }}>
              {displayAddr}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <CopyBtn text={displayAddr} />
            </div>
          </div>
        ) : (
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'24px 16px', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--muted-fg)', marginBottom:12 }}>
              {isBtc ? 'No Bitcoin address generated yet' : 'No VUSD address yet'}
            </div>
            {!isBtc && (
              <button onClick={generateVusd} disabled={genning} className="btn btn-secondary">
                <RefreshCw size={13} className={genning ? 'spin' : ''} />
                {genning ? 'Generating...' : 'Generate VUSD Address'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--card2)', border:'1px solid var(--border)', fontSize:12, color:'var(--muted-fg)', lineHeight:1.6 }}>
        {isBtc
          ? 'Send Bitcoin to this address to fund your wallet. Funds appear after 1 confirmation on-chain.'
          : 'Share this stealth address to receive VUSD privately via Lightning. Each address is single-use for maximum privacy.'}
      </div>

      {/* VUSD privacy note */}
      {!isBtc && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, background:'var(--success-dim)', border:'1px solid rgba(34,197,94,0.15)' }}>
          <Shield size={13} style={{color:'var(--success)', flexShrink:0}} />
          <span style={{ fontSize:12, color:'var(--success)' }}>Stealth address hides your identity from the sender</span>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Transfer() {
  const { wallet, network, btcPrice } = useApp()
  const isSignet = network === 'signet'
  const location = useLocation()
  const defaultAsset = new URLSearchParams(location.search).get('asset') || 'btc'
  const [tab, setTab] = useState('send')

  const tabs = [
    { id:'send',    label:'Send',    icon:ArrowUpRight },
    { id:'receive', label:'Receive', icon:ArrowDownLeft },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:680 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.03em', marginBottom:4 }}>Send / Receive</h1>
        <p style={{ color:'var(--muted-fg)', fontSize:13 }}>Transfer Bitcoin and VUSD</p>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div className="card">
        {tab === 'send'
          ? <SendPanel wallet={wallet} network={network} btcPrice={btcPrice} defaultAsset={defaultAsset} />
          : <ReceivePanel wallet={wallet} defaultAsset={defaultAsset} network={network} />}
      </div>

      {/* Transfer history */}
      <div className="card">
        <div style={{ fontSize:11, fontWeight:600, color:'var(--muted-fg)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
          Transfer History
        </div>
          <TransferHistory />
      </div>
    </div>
  )
}
