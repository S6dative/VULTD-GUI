import { useState } from 'react'
import { Plus, Activity } from 'lucide-react'

const Card = ({children}) => (
  <div className="rounded-xl p-5" style={{background:'#111113',border:'1px solid #1e1e22'}}>{children}</div>
)

export default function Vaults() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700}}>Vaults</h1>
          <p style={{color:'#6b7280',fontSize:13,marginTop:4}}>BTC-collateralized VUSD positions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{background:'#f5a623',color:'#0a0a0b'}}>
          <Plus size={14} /> Open Vault
        </button>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-12" style={{color:'#6b7280'}}>
          <Activity size={32} style={{marginBottom:12,opacity:0.4}} />
          <p style={{fontSize:13}}>No active vaults</p>
          <p style={{fontSize:12,marginTop:4,opacity:0.7}}>Open a vault to mint VUSD against BTC collateral</p>
        </div>
      </Card>
    </div>
  )
}
