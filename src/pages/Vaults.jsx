import { useState, useEffect } from "react"
import { Plus, Lock, Unlock, ChevronRight, AlertTriangle, Info, Shield } from "lucide-react"
import { bridge } from "../bridge/vusd"
import { useApp } from "../contexts/AppContext"

const fmt  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n)
const sats = n => n >= 100000000 ? (n/100000000).toFixed(8)+" BTC" : n.toLocaleString()+" sats"
const truncate = id => { const h=id.replace("vault:",""); return "vault:"+h.slice(0,8)+"..."+h.slice(-8) }
const healthColor = h => h >= 200 ? "var(--success)" : h >= 150 ? "var(--warning)" : "var(--danger)"

const LTV_PRESETS = [
  { ltv:33, cr:200, label:"Conservative", sublabel:"200% CR", risk:"low", color:"var(--success)" },
  { ltv:44, cr:150, label:"Balanced",     sublabel:"150% CR", risk:"medium", color:"var(--warning)" },
  { ltv:55, cr:120, label:"Aggressive",   sublabel:"120% CR", risk:"high", color:"var(--btc)" },
  { ltv:66, cr:110, label:"Max",          sublabel:"110% CR", risk:"very high", color:"var(--danger)" },
]

function CreateVaultModal({ onClose, onCreated, btcPrice, walletSats }) {
  const [btcAmount, setBtcAmount] = useState("")
  const [ltv, setLtv] = useState(44)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState(null)

  const btcVal = parseFloat(btcAmount) || 0
  const collateralSats = Math.round(btcVal * 1e8)
  const collateralUsd = btcVal * (btcPrice || 85000)
  const vusdToMint = collateralUsd * (ltv / 100)
  const networkFee = 0.00015
  const systemFee = vusdToMint * 0.001
  const preset = LTV_PRESETS.find(p => p.ltv === ltv) || LTV_PRESETS[1]
  const cr = Math.round(100 / (ltv/100))
  const maxBtc = ((walletSats || 0) / 1e8 - networkFee).toFixed(8)
  const canOpen = btcVal > 0 && collateralSats <= (walletSats || 0)

  const handleOpen = async () => {
    setOpening(true); setError(null)
    try {
      await bridge.openVault(collateralSats)
      const data = await bridge.readVaults()
      onCreated(data)
      onClose()
    } catch(e) {
      setError(e.message || "Failed to open vault")
    }
    setOpening(false)
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:24 }}
      onClick={onClose}>
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", animation:"fadein 0.2s ease" }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding:"24px 28px 0", borderBottom:"1px solid var(--border)", paddingBottom:20, marginBottom:24 }}>
          <div style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.03em", marginBottom:4 }}>Create Vault</div>
          <div style={{ fontSize:13, color:"var(--muted-fg)" }}>Deposit BTC and lock it in a self-sovereign Taproot vault to mint VUSD at your chosen LTV.</div>
        </div>

        <div style={{ padding:"0 28px 28px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* BTC Collateral */}
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--muted-fg)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>BTC Collateral</div>
            <div style={{ fontSize:12, color:"var(--muted-fg)", marginBottom:10 }}>Enter the amount of BTC to deposit as collateral</div>
            <div style={{ position:"relative" }}>
              <input value={btcAmount} onChange={e => setBtcAmount(e.target.value)} type="number"
                placeholder="0.00000000" step="0.00001" min="0"
                className="input mono" style={{ paddingRight:60 }} />
              <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"var(--muted-fg)", fontFamily:"Geist Mono, monospace" }}>BTC</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              <span style={{ fontSize:11, color:"var(--muted-fg)" }}>
                {btcVal > 0 ? "≈ "+fmt(collateralUsd) : "Available: "+sats(walletSats||0)}
              </span>
              <button onClick={() => setBtcAmount(maxBtc)}
                style={{ fontSize:11, color:"var(--btc)", background:"none", border:"none", cursor:"pointer" }}>
                Max
              </button>
            </div>
          </div>

          {/* LTV Slider */}
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--muted-fg)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Loan-to-Value</div>
            <div style={{ fontSize:12, color:"var(--muted-fg)", marginBottom:12 }}>Drag the slider to set your LTV between 33% and 66%</div>
            
            {/* LTV display */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontFamily:"Geist Mono, monospace", fontSize:28, fontWeight:700, color:preset.color }}>{ltv}%</span>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>{preset.label}</div>
                <div style={{ fontSize:11, color:"var(--muted-fg)" }}>{preset.sublabel}</div>
              </div>
            </div>

            <input type="range" min="33" max="66" value={ltv} onChange={e => setLtv(parseInt(e.target.value))}
              style={{ width:"100%", accentColor:preset.color, cursor:"pointer" }} />

            {/* Presets */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginTop:10 }}>
              {LTV_PRESETS.map(p => (
                <button key={p.ltv} onClick={() => setLtv(p.ltv)} style={{
                  padding:"8px 4px", borderRadius:8, border:"1px solid",
                  borderColor: ltv===p.ltv ? p.color : "var(--border)",
                  background: ltv===p.ltv ? "var(--card2)" : "var(--bg)",
                  cursor:"pointer", textAlign:"center",
                }}>
                  <div style={{ fontSize:12, fontWeight:600, color:p.color }}>{p.ltv}%</div>
                  <div style={{ fontSize:10, color:"var(--muted-fg)" }}>{p.sublabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Vault Summary */}
          <div style={{ background:"var(--card2)", border:"1px solid var(--border)", borderRadius:10, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--muted-fg)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Vault Summary</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"BTC Collateral", value: btcVal > 0 ? btcAmount+" BTC" : "--" },
                { label:"LTV", value: ltv+"%" },
                { label:"Risk Level", value: preset.label, color: preset.color },
                { label:"VUSD to Mint", value: btcVal > 0 ? fmt(vusdToMint) : "--" },
                { label:"Network Fee", value: networkFee.toFixed(8)+" BTC" },
                { label:"System Fee", value: btcVal > 0 ? fmt(systemFee) : "--" },
                { label:"Initial Redemption Fee", value: "0.00%" },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"var(--muted-fg)" }}>{row.label}</span>
                  <span style={{ fontSize:13, fontFamily:"Geist Mono, monospace", fontWeight:500, color: row.color || "var(--fg)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info boxes */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px", borderRadius:8, background:"var(--card2)", border:"1px solid var(--border)", fontSize:12, color:"var(--muted-fg)" }}>
              <Info size={13} style={{ flexShrink:0, marginTop:1 }} />
              <span>LTV determines how much VUSD you can mint. Lower LTV = safer vault, lower liquidation risk.</span>
            </div>
            {parseFloat(ltv) >= 55 && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px", borderRadius:8, background:"var(--danger-dim)", border:"1px solid rgba(239,68,68,0.2)", fontSize:12, color:"var(--danger)" }}>
                <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }} />
                <span>High LTV increases liquidation risk. Your vault may be liquidated if BTC price drops significantly.</span>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--danger-dim)", color:"var(--danger)", fontSize:13, border:"1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
              {opening ? "Opening Vault..." : canOpen ? "Open Vault" : "Enter BTC amount"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Vaults() {
  const { wallet, network } = useApp()
  const [filter, setFilter] = useState("All")
  const [showModal, setShowModal] = useState(false)
  const [vaults, setVaults] = useState([])
  const [loadingVaults, setLoadingVaults] = useState(true)
  const [btcPrice] = useState(85000)
  const walletSats = wallet?.btcSats || 0

  useEffect(() => {
    bridge.readVaults().then(data => {
      const entries = Array.isArray(data) ? data : Object.entries(data || {})
      const normalized = entries.map(([id, v]) => ({
        id: v.vault_id || id,
        state: v.state || "Unknown",
        collateralSats: v.locked_btc || 0,
        debt: v.debt_vusd || 0,
        openedAt: v.open_timestamp || 0,
        health: v.locked_btc && v.debt_vusd > 0
          ? Math.round((v.locked_btc/1e8 * btcPrice) / v.debt_vusd * 100)
          : v.state === "Open" ? 999 : 0,
      }))
      setVaults(normalized)
    }).catch(() => {}).finally(() => setLoadingVaults(false))
  }, [])

  const tabs = ["All","Open","Repaid","Closed"]
  const filtered = filter === "All" ? vaults : vaults.filter(v => v.state === filter)
  const counts = tabs.reduce((a,t) => ({ ...a, [t]: t==="All" ? vaults.length : vaults.filter(v=>v.state===t).length }), {})

  const handleCreated = (data) => {
    const entries = Array.isArray(data) ? data : Object.entries(data || {})
    setVaults(entries.map(([id,v]) => ({
      id: v.vault_id||id, state: v.state||"Unknown",
      collateralSats: v.locked_btc||0, debt: v.debt_vusd||0, openedAt: v.open_timestamp||0,
      health: v.locked_btc && v.debt_vusd > 0 ? Math.round((v.locked_btc/1e8*btcPrice)/v.debt_vusd*100) : 999,
    })))
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:800 }}>
      {showModal && <CreateVaultModal onClose={() => setShowModal(false)} onCreated={handleCreated} btcPrice={btcPrice} walletSats={walletSats} />}

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.03em", marginBottom:4 }}>Vaults</h1>
          <p style={{ color:"var(--muted-fg)", fontSize:13 }}>Manage your Bitcoin collateral vaults</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={14} /> Open Vault
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"inline-flex", background:"var(--card2)", border:"1px solid var(--border)", borderRadius:8, padding:3 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer",
            fontSize:13, fontWeight: filter===t ? 500 : 400,
            background: filter===t ? "var(--card)" : "transparent",
            color: filter===t ? "var(--fg)" : "var(--muted-fg)",
            transition:"all 0.12s",
            boxShadow: filter===t ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
          }}>
            {t} {counts[t] > 0 && <span style={{ fontSize:10, marginLeft:4, opacity:0.7 }}>({counts[t]})</span>}
          </button>
        ))}
      </div>

      {/* Vault list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {loadingVaults ? (
          <div className="card" style={{ textAlign:"center", padding:40, color:"var(--muted-fg)" }}>Loading vaults...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:48, color:"var(--muted-fg)", textAlign:"center" }}>
            <Lock size={36} style={{ marginBottom:12, opacity:0.2 }} />
            <div style={{ fontSize:14, marginBottom:4 }}>No {filter === "All" ? "" : filter.toLowerCase()+" "}vaults yet</div>
            <div style={{ fontSize:12, marginBottom:16 }}>Open a vault to start minting VUSD</div>
            <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={13}/> Open Vault</button>
          </div>
        ) : filtered.map(v => {
          const collUsd = (v.collateralSats/1e8) * btcPrice
          const stateColor = v.state==="Open" ? "var(--success)" : v.state==="Repaid" ? "var(--warning)" : "var(--muted-fg)"
          const stateBg = v.state==="Open" ? "var(--success-dim)" : v.state==="Repaid" ? "var(--warning-dim)" : "var(--card3)"
          return (
            <div key={v.id} className="card card-hover" style={{ cursor:"default" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"var(--card2)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid var(--border)" }}>
                    {v.state==="Open" ? <Lock size={16} style={{color:"var(--fg)"}} /> : <Unlock size={16} style={{color:"var(--muted-fg)"}} />}
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontFamily:"Geist Mono, monospace", fontSize:12, fontWeight:600 }}>{truncate(v.id)}</span>
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:stateBg, color:stateColor, fontWeight:500 }}>{v.state}</span>
                    </div>
                    <div style={{ fontSize:11, color:"var(--muted-fg)", fontFamily:"Geist Mono, monospace" }}>{v.collateralSats.toLocaleString()} sats collateral</div>
                  </div>
                </div>
                {v.state==="Open" && v.health !== 999 && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10, color:"var(--muted-fg)", marginBottom:2 }}>Health</div>
                    <div style={{ fontFamily:"Geist Mono, monospace", fontWeight:700, fontSize:16, color:healthColor(v.health) }}>{v.health}%</div>
                  </div>
                )}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"Collateral", value:fmt(collUsd) },
                  { label:"Debt", value:fmt(v.debt) },
                  { label:"Health", value: v.health===999 ? "No debt" : v.health+"%", color:healthColor(v.health) },
                ].map(s => (
                  <div key={s.label} style={{ background:"var(--card2)", borderRadius:8, padding:"10px 12px" }}>
                    <div style={{ fontSize:11, color:"var(--muted-fg)", marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:"Geist Mono, monospace", fontWeight:600, fontSize:14, color:s.color||"var(--fg)" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
