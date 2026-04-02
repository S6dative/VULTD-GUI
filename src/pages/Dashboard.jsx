import { useState } from 'react'
import { ArrowUpRight, ArrowDownLeft, Coins, CreditCard, Lock, Unlock, Bitcoin, DollarSign, TrendingUp, RefreshCw, Wallet } from 'lucide-react'
import { BTC_PRICE, MOCK_VAULTS, MOCK_TXS, formatUsd, formatSats, satsToUsd, timeAgo, truncateVaultId } from '../data'

const C = ({children,style={}}) => <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20,...style}}>{children}</div>

const TX_ICONS = { send:ArrowUpRight, receive:ArrowDownLeft, mint:Coins, repay:CreditCard, open_vault:Lock, close_vault:Unlock }
const TX_LABELS = { send:'Sent VUSD', receive:'Received VUSD', mint:'Minted VUSD', repay:'Repaid Debt', open_vault:'Opened Vault', close_vault:'Closed Vault' }
const TX_COLORS = { send:'#ef4444', receive:'#22c55e', mint:'#22c55e', repay:'#f59e0b', open_vault:'#fafafa', close_vault:'#737373' }

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false)
  const openVaults = MOCK_VAULTS.filter(v=>v.state==='Open')
  const totalLocked = openVaults.reduce((s,v)=>s+v.collateralSats,0)
  const totalDebt   = openVaults.reduce((s,v)=>s+v.debt,0)
  const avgHealth   = openVaults.length ? Math.round(openVaults.reduce((s,v)=>s+v.health,0)/openVaults.length) : 0
  const vusdBal = 3250.50
  const btcSats = 25000000
  const btcUsd = satsToUsd(btcSats, BTC_PRICE)

  const refresh = () => { setRefreshing(true); setTimeout(()=>setRefreshing(false),800) }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Dashboard</h1>
          <p style={{color:'#737373',fontSize:14}}>Manage your Bitcoin-backed stablecoin</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{background:'#292929',color:'#f59e0b',fontSize:11,padding:'4px 10px',borderRadius:4,border:'1px solid #363636',fontFamily:'Space Mono'}}>Signet</span>
          <span style={{background:'#292929',color:'#ef4444',fontSize:11,padding:'4px 10px',borderRadius:4,border:'1px solid #363636',fontFamily:'Space Mono'}}>TEST</span>
          <button onClick={refresh} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:6,background:'#1a1a1a',border:'1px solid #262626',color:'#a3a3a3',cursor:'pointer',fontSize:13}}>
            <RefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':undefined}}/>{refreshing?'Refreshing...':'Refresh price'}
          </button>
        </div>
      </div>

      {/* Price ticker */}
      <C style={{padding:'12px 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(247,147,26,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bitcoin size={18} style={{color:'#f7931a'}}/>
            </div>
            <div>
              <div style={{fontSize:13,color:'#737373'}}>Bitcoin (BTC)</div>
              <div style={{fontFamily:'Space Mono',fontSize:20,fontWeight:700}}>{formatUsd(BTC_PRICE)}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(34,197,94,0.1)',padding:'4px 10px',borderRadius:6}}>
            <TrendingUp size={14} style={{color:'#22c55e'}}/>
            <span style={{color:'#22c55e',fontSize:13,fontWeight:600}}>+2.4%</span>
          </div>
        </div>
      </C>

      {/* Faucet */}
      <C>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:600,marginBottom:4}}>sBTC Faucet</div>
            <div style={{color:'#737373',fontSize:13}}>10,000 sats per claim · <span style={{fontFamily:'Space Mono'}}>Claims today: 0/10 remaining</span></div>
          </div>
          <button style={{padding:'8px 16px',borderRadius:8,background:'#f7931a',color:'#111',fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>Claim sBTC</button>
        </div>
      </C>

      {/* Balance + Vault grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Balance */}
        <C>
          <div style={{color:'#737373',fontSize:13,marginBottom:8}}>Total Balance</div>
          <div style={{fontFamily:'Space Mono',fontSize:28,fontWeight:700,marginBottom:16}}>No balance yet</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {/* BTC row */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',borderRadius:8,background:'#222'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(247,147,26,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Bitcoin size={16} style={{color:'#f7931a'}}/>
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:500}}>sBTC</span>
                    <span style={{fontSize:10,fontFamily:'Space Mono',background:'rgba(245,158,11,0.1)',color:'#f59e0b',padding:'2px 6px',borderRadius:3}}>SIGNET</span>
                  </div>
                  <div style={{color:'#737373',fontSize:12,fontFamily:'Space Mono'}}>{formatSats(btcSats)}</div>
                </div>
              </div>
              <div style={{fontFamily:'Space Mono',fontWeight:500}}>{formatUsd(btcUsd)}</div>
            </div>
            {/* VUSD row */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',borderRadius:8,background:'#222'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(250,250,250,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <DollarSign size={16} style={{color:'#fafafa'}}/>
                </div>
                <div>
                  <div style={{fontWeight:500}}>VUSD</div>
                  <div style={{color:'#737373',fontSize:12}}>Stablecoin</div>
                </div>
              </div>
              <div style={{fontFamily:'Space Mono',fontWeight:500}}>{formatUsd(vusdBal)}</div>
            </div>
          </div>
        </C>

        {/* Vault summary */}
        <C>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <span style={{color:'#737373',fontSize:13}}>Vault Summary</span>
            <div style={{display:'flex',gap:6}}>
              <span style={{fontSize:10,fontFamily:'Space Mono',background:'rgba(245,158,11,0.1)',color:'#f59e0b',padding:'2px 6px',borderRadius:3}}>sBTC</span>
              <span style={{fontSize:11,background:'#262626',color:'#a3a3a3',padding:'2px 8px',borderRadius:4,fontFamily:'Space Mono'}}>{openVaults.length} Open</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div>
              <div style={{color:'#737373',fontSize:12,marginBottom:4}}>sBTC Locked</div>
              <div style={{fontFamily:'Space Mono',fontWeight:600,fontSize:14}}>{formatSats(totalLocked)}</div>
              <div style={{color:'#737373',fontSize:12}}>{formatUsd(satsToUsd(totalLocked,BTC_PRICE))}</div>
            </div>
            <div>
              <div style={{color:'#737373',fontSize:12,marginBottom:4}}>Total Debt</div>
              <div style={{fontFamily:'Space Mono',fontWeight:600,fontSize:14}}>{formatUsd(totalDebt)}</div>
              <div style={{color:'#737373',fontSize:12}}>VUSD owed</div>
            </div>
          </div>
          <div style={{borderTop:'1px solid #262626',paddingTop:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{color:'#737373',fontSize:12}}>Average Health Ratio</span>
              <span style={{fontFamily:'Space Mono',fontWeight:700,fontSize:16,color:avgHealth>=200?'#22c55e':avgHealth>=150?'#f59e0b':'#ef4444'}}>{avgHealth}%</span>
            </div>
            <div style={{height:6,borderRadius:3,background:'#262626',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:3,width:Math.min(100,(avgHealth/300)*100)+'%',background:avgHealth>=200?'#22c55e':avgHealth>=150?'#f59e0b':'#ef4444',transition:'width 0.3s'}}/>
            </div>
          </div>
        </C>
      </div>

      {/* Activity */}
      <C>
        <div style={{color:'#737373',fontSize:13,marginBottom:16}}>Recent Activity</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {MOCK_TXS.map(tx => {
            const Icon = TX_ICONS[tx.type]
            const isOut = tx.type==='send'||tx.type==='repay'
            return (
              <div key={tx.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',borderRadius:8,background:'#222'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Icon size={16} style={{color:TX_COLORS[tx.type]}}/>
                  </div>
                  <div>
                    <div style={{fontWeight:500,fontSize:14}}>{TX_LABELS[tx.type]}</div>
                    <div style={{fontFamily:'Space Mono',fontSize:11,color:'#737373'}}>{tx.addr}</div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'Space Mono',fontWeight:600,color:isOut?'#ef4444':'#22c55e'}}>
                    {isOut?'-':'+'}{tx.currency==='VUSD'?formatUsd(tx.amount):formatSats(tx.amount)}
                  </div>
                  <div style={{fontSize:11,color:'#737373'}}>{timeAgo(tx.ms)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </C>
    </div>
  )
}
