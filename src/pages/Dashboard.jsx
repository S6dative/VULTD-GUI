import { useState, useEffect } from 'react'
import { Bitcoin, DollarSign, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownLeft, Coins, CreditCard, Lock, Unlock, HelpCircle, Zap } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { bridge } from '../bridge/vusd'

const formatUsd = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
const formatSats = n => n>=100000000?(n/100000000).toFixed(8)+' BTC':n.toLocaleString()+' sats'
const timeAgo = ms => { const s=Math.floor((Date.now()-ms)/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return'about '+Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' }


const TX_ICONS = { send:ArrowUpRight, receive:ArrowDownLeft, mint:Coins, repay:CreditCard, open_vault:Lock, close_vault:Unlock }
const TX_LABELS = { send:'Sent VUSD', receive:'Received VUSD', mint:'Minted VUSD', repay:'Repaid Debt', open_vault:'Opened Vault', close_vault:'Closed Vault' }
const TX_COLORS = { send:'var(--danger)', receive:'var(--success)', mint:'var(--success)', repay:'var(--warning)', open_vault:'var(--fg)', close_vault:'var(--muted-fg)' }

function Tip({ text }) {
  return (
    <div className="tooltip-wrap" style={{ marginLeft: 6 }}>
      <HelpCircle size={13} style={{ color: 'var(--muted-fg)', cursor: 'help' }} />
      <div className="tooltip">{text}</div>
    </div>
  )
}

function StatCard({ label, value, sub, tip, icon: Icon, iconColor }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{label}</span>
          {tip && <Tip text={tip} />}
        </div>
        {Icon && <Icon size={16} style={{ color: iconColor || 'var(--muted-fg)' }} />}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { network, wallet, claimFaucet, canClaim, faucetClaims } = useApp()
  const isSignet = network === 'signet'
  const [btcPrice, setBtcPrice] = useState(null)
  const [priceChange, setPriceChange] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimMsg, setClaimMsg] = useState(null)

  const fetchPrice = async () => {
    setLoading(true)
    try {
      // Try multiple feeds
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      const data = await res.json()
      setBtcPrice(data.bitcoin.usd)
      setPriceChange(data.bitcoin.usd_24h_change?.toFixed(2))
    } catch {
      try {
        const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
        const data = await res.json()
        setBtcPrice(parseFloat(data.data.amount))
      } catch {
        setBtcPrice(85000) // fallback
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPrice()
    bridge.btcBalance().then(bal => {
      if (typeof bal === 'number') {
        const sats = Math.round(bal * 100000000)
        const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
        w.btcSats = sats
        localStorage.setItem('vultd-wallet', JSON.stringify(w))
      }
    }).catch(() => {})
  }, [])

  const btcSats = wallet?.btcSats || 0
  const vusdBalance = wallet?.vusdBalance || 0
  const btcUsd = btcPrice ? (btcSats / 100000000) * btcPrice : 0

  const handleClaim = async () => {
    setClaiming(true)
    try {
      let addr = wallet?.address
      if (!addr) {
        const res = await bridge.btcAddress()
        addr = res?.output || res
      }
      const ok = await claimFaucet(addr)
      setClaimMsg(ok ? { ok: true, text: '10,000 sats sent to your wallet!' } : { ok: false, text: 'Daily limit reached (10/10)' })
    } catch (e) {
      setClaimMsg({ ok: false, text: 'Faucet error: ' + (e.message || 'unknown') })
    }
    setClaiming(false)
    setTimeout(() => setClaimMsg(null), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted-fg)', fontSize: 14 }}>Manage your Bitcoin-backed stablecoin</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-warning">{isSignet ? 'Signet' : 'Mainnet'}</span>
          {isSignet && <span className="badge badge-danger">TEST</span>}
        </div>
      </div>

      {/* Live BTC Price */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(247,147,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bitcoin size={20} style={{ color: 'var(--btc)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center' }}>
                Bitcoin (BTC) · Live Oracle
                <Tip text="Real-time BTC price from CoinGecko oracle feed, used to calculate vault health ratios" />
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
                {loading ? '...' : formatUsd(btcPrice)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {priceChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: parseFloat(priceChange) >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                <TrendingUp size={14} style={{ color: parseFloat(priceChange) >= 0 ? 'var(--success)' : 'var(--danger)' }} />
                <span style={{ color: parseFloat(priceChange) >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
                  {parseFloat(priceChange) >= 0 ? '+' : ''}{priceChange}%
                </span>
              </div>
            )}
            <button onClick={fetchPrice} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Signet Faucet */}
      {isSignet && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, marginBottom: 4 }}>
                <Zap size={16} style={{ color: 'var(--btc)', marginRight: 6 }} />
                sBTC Faucet
                <Tip text="Claim free test Bitcoin (sBTC) on signet to practice opening vaults and minting VUSD. Max 10 claims per day, 10,000 sats each." />
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>
                10,000 sats per claim · <span className="mono">Claims today: {faucetClaims}/10</span>
              </div>
              {claimMsg && (
                <div style={{ marginTop: 6, fontSize: 13, color: claimMsg.ok ? 'var(--success)' : 'var(--danger)' }}>{claimMsg.text}</div>
              )}
            </div>
            <button onClick={handleClaim} disabled={!canClaim || claiming} className="btn btn-primary">
              {claiming ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
              {claiming ? 'Claiming...' : 'Claim sBTC'}
            </button>
          </div>
        </div>
      )}

      {/* Balance grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            Total Balance <Tip text="Combined value of your BTC and VUSD holdings in USD" />
          </div>
          {btcSats === 0 && vusdBalance === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', color: 'var(--muted-fg)' }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>No balance yet</div>
              <div style={{ fontSize: 12 }}>{isSignet ? 'Use the faucet to get test sBTC' : 'Deposit BTC to get started'}</div>
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
              {formatUsd(btcUsd + vusdBalance)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="card2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(247,147,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bitcoin size={16} style={{ color: 'var(--btc)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 500 }}>{isSignet ? 'sBTC' : 'BTC'}</span>
                    {isSignet && <span className="badge badge-warning" style={{ fontSize: 10 }}>SIGNET</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{formatSats(btcSats)}</div>
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 500 }}>{formatUsd(btcUsd)}</div>
            </div>
            <div className="card2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(250,250,250,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={16} style={{ color: 'var(--fg)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>VUSD</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Private stablecoin</div>
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 500 }}>{formatUsd(vusdBalance)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            Vault Summary <Tip text="Overview of your open BTC vaults. Vaults hold collateral and generate VUSD debt." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', color: 'var(--muted-fg)', textAlign: 'center' }}>
            <Lock size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div style={{ fontSize: 13, marginBottom: 4 }}>No open vaults</div>
            <div style={{ fontSize: 12 }}>Open a vault to start minting VUSD</div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
          Recent Activity <Tip text="Your latest wallet transactions including sends, receives, mints, and vault operations" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', color: 'var(--muted-fg)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>No activity yet</div>
          <div style={{ fontSize: 12 }}>Your transactions will appear here</div>
        </div>
      </div>
    </div>
  )
}
