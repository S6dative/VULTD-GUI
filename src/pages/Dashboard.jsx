import { useState, useEffect } from 'react'
import { Bitcoin, DollarSign, TrendingUp, RefreshCw, Lock, HelpCircle, Copy, Check, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { bridge } from '../bridge/vusd'
import { useNavigate } from 'react-router-dom'

const fmt  = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
const sats = n => n >= 100000000 ? (n/100000000).toFixed(8)+' BTC' : n.toLocaleString()+' sats'
const ago  = ms => { const s=Math.floor((Date.now()-ms)/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return'about '+Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' }

function Tip({ text }) {
  return (
    <div className="tooltip-wrap" style={{ marginLeft: 5 }}>
      <HelpCircle size={12} style={{ color: 'var(--muted-fg)', cursor: 'help' }} />
      <div className="tooltip">{text}</div>
    </div>
  )
}

function CopyButton({ text, size = 13 }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="btn btn-ghost btn-sm" style={{ padding: '3px 6px' }}>
      {copied ? <Check size={size} style={{ color: 'var(--success)' }} /> : <Copy size={size} />}
    </button>
  )
}

export default function Dashboard() {
  const { network, wallet, claimFaucet, canClaim, faucetClaims } = useApp()
  const navigate = useNavigate()
  const isSignet = network === 'signet'
  const [btcPrice, setBtcPrice] = useState(null)
  const [priceChange, setPriceChange] = useState(null)
  const [priceLoading, setPriceLoading] = useState(true)
  const [btcSats, setBtcSats] = useState(wallet?.btcSats || 0)

  const [vaults, setVaults] = useState([])
  const [txHistory, setTxHistory] = useState([])

  const fetchPrice = async () => {
    setPriceLoading(true)
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      const data = await res.json()
      setBtcPrice(data.bitcoin.usd)
      setPriceChange(data.bitcoin.usd_24h_change?.toFixed(2))
    } catch {
      try {
        const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
        const data = await res.json()
        setBtcPrice(parseFloat(data.data.amount))
      } catch { setBtcPrice(85000) }
    }
    setPriceLoading(false)
  }

  useEffect(() => {
    fetchPrice()
    // Real BTC balance from node
    bridge.btcBalance().then(bal => {
      if (typeof bal === 'number') setBtcSats(Math.round(bal * 100000000))
      else if (bal?.output) setBtcSats(Math.round(parseFloat(bal.output) * 100000000))
    }).catch(() => {})
    // Real VUSD balance from wallet.json directly
    bridge.readWallet().then(data => {
      if (data?.balance != null) {
        const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
        w.vusdBalance = data.balance
        localStorage.setItem('vultd-wallet', JSON.stringify(w))
        refreshWallet()
      }
      if (data?.history) setTxHistory(data.history)
    }).catch(() => {})
    // Real vaults
    bridge.readVaults().then(data => {
      const entries = Array.isArray(data) ? data : Object.entries(data || {})
      const normalized = entries.map(([id, v]) => ({
        id: v.vault_id || id,
        state: v.state || 'Unknown',
        collateralSats: v.locked_btc || 0,
        debt: v.debt_vusd || 0,
      }))
      setVaults(normalized)
    }).catch(() => {})
  }, [])

  const vusdBalance = wallet?.vusdBalance || 0
  const btcUsd = btcPrice ? (btcSats / 100000000) * btcPrice : 0
  const openVaults = vaults.filter(v => v.state === 'Open')
  const totalLocked = openVaults.reduce((a, v) => a + v.collateralSats, 0)
  const totalDebt = openVaults.reduce((a, v) => a + v.debt, 0)
  const btcAddr = wallet?.address || ''



  const up = priceChange && parseFloat(priceChange) >= 0

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
          {isSignet && <span className="badge badge-danger">TEST</span>}
        </div>
      </div>

      {/* BTC Price */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--btc-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(247,147,26,0.2)' }}>
            <Bitcoin size={18} style={{ color: 'var(--btc)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', marginBottom: 2 }}>
              Bitcoin · Live Price <Tip text="Real-time BTC/USD price used for vault health calculations" />
            </div>
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {priceLoading ? <span className="skeleton" style={{ width: 120, height: 22, display: 'inline-block' }} /> : fmt(btcPrice)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {priceChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: up ? 'var(--success-dim)' : 'var(--danger-dim)' }}>
              <TrendingUp size={12} style={{ color: up ? 'var(--success)' : 'var(--danger)', transform: up ? 'none' : 'scaleY(-1)' }} />
              <span style={{ color: up ? 'var(--success)' : 'var(--danger)', fontSize: 12, fontWeight: 600, fontFamily: 'Geist Mono, monospace' }}>
                {up ? '+' : ''}{priceChange}%
              </span>
            </div>
          )}
          <button onClick={fetchPrice} className="btn btn-secondary btn-sm">
            <RefreshCw size={12} className={priceLoading ? 'spin' : ''} />
            {priceLoading ? 'Updating' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* BTC Wallet Address */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Bitcoin Address
          </div>
          <span className={'badge ' + (isSignet ? 'badge-warning' : 'badge-btc')}>{isSignet ? 'SIGNET' : 'MAINNET'}</span>
        </div>
        {btcAddr ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg)', border: '1px solid var(--border)',
              fontFamily: 'Geist Mono, monospace', fontSize: 12,
              color: 'var(--fg)', wordBreak: 'break-all', lineHeight: 1.6,
            }}>
              {btcAddr}
            </div>
            <CopyButton text={btcAddr} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--muted-fg)' }}>No address generated yet</span>
            <button onClick={() => navigate('/transfer')} className="btn btn-secondary btn-sm">
              Generate <ChevronRight size={12} />
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
              <div style={{ fontSize: 12 }}>{isSignet ? 'Use the faucet above to get test sBTC' : 'Deposit BTC to your address above'}</div>
            </div>
          ) : (
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 14 }}>
              {fmt(btcUsd + vusdBalance)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: Bitcoin, color: 'var(--btc)', bg: 'var(--btc-dim)', label: isSignet ? 'sBTC' : 'BTC', sub: sats(btcSats), value: fmt(btcUsd), badge: isSignet ? 'SIGNET' : null, badgeClass: 'badge-warning' },
              { icon: DollarSign, color: 'var(--fg-dim)', bg: 'var(--card3)', label: 'VUSD', sub: 'Private stablecoin', value: fmt(vusdBalance), badge: null },
            ].map(({ icon: Icon, color, bg, label, sub, value, badge, badgeClass }) => (
              <div key={label} className="card2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <button onClick={() => navigate('/vaults')} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                Open a vault
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Open vaults</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>{openVaults.length}</span>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>BTC locked</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 500 }}>{sats(totalLocked)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Total debt</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 500 }}>{fmt(totalDebt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
        ) : txHistory.map((tx, i) => (
          <div key={i} className='card2' style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: i < txHistory.length-1 ? 6 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background: tx.spent ? 'var(--danger-dim)' : 'var(--success-dim)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {tx.spent ? <ArrowUpRight size={14} style={{color:'var(--danger)'}} /> : <ArrowDownLeft size={14} style={{color:'var(--success)'}} />}
              </div>
              <div>
                <div style={{ fontWeight:500, fontSize:13 }}>{tx.spent ? 'Sent VUSD' : 'Received VUSD'}</div>
                <div style={{ fontSize:11, color:'var(--muted-fg)' }}>{new Date(tx.received_at*1000).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ fontFamily:'Geist Mono, monospace', fontWeight:600, fontSize:13, color: tx.spent ? 'var(--danger)' : 'var(--success)' }}>
              {tx.spent ? '-' : '+'}{fmt(tx.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
