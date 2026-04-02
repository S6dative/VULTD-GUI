import { useEffect, useState } from 'react'
import { TrendingUp, Shield, Zap, RefreshCw } from 'lucide-react'
import { vusd } from '../bridge/vusd'
const Card = ({children}) => <div className="rounded-xl p-5" style={{background:'#111113',border:'1px solid #1e1e22'}}>{children}</div>
export default function Dashboard() {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); vusd.balance().then(d => { setBalance(d); setLoading(false) }) }
  useEffect(() => { load() }, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700}}>Dashboard</h1>
          <p style={{color:'#6b7280',fontSize:13,marginTop:4}}>Bitcoin-backed private stablecoin</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:'#1a1a1e',color:'#9ca3af',fontSize:12,border:'1px solid #1e1e22'}}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {label:'VUSD Balance',value:loading?'...':'$'+Number(balance?.balance??0).toFixed(2),icon:Zap,color:'#f5a623'},
          {label:'BTC Price',value:loading?'...':'$'+Number(balance?.btc_price??0).toLocaleString(),icon:TrendingUp,color:'#22c55e'},
          {label:'Outputs',value:loading?'...':String(balance?.outputs??0),icon:Shield,color:'#818cf8'},
        ].map(({label,value,icon:Icon,color}) => (
          <Card key={label}>
            <div className="flex items-center justify-between mb-3">
              <span style={{fontSize:12,color:'#6b7280'}}>{label}</span>
              <Icon size={14} style={{color}}/>
            </div>
            <div style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700}}>{value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex items-start gap-3">
          <Shield size={16} style={{color:'#f5a623',marginTop:2}}/>
          <div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Privacy Active</div>
            <div style={{fontSize:12,color:'#6b7280',lineHeight:1.6}}>Ring signatures, stealth addresses, and bulletproofs protect every transfer.</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
