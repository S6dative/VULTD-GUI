import { Coins } from 'lucide-react'
export default function MintRepay() {
  return (
    <div>
      <h1 style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700,marginBottom:8}}>Mint / Repay</h1>
      <p style={{color:'#6b7280',fontSize:13,marginBottom:32}}>Manage your VUSD debt positions</p>
      <div className="rounded-xl p-12 flex flex-col items-center justify-center" style={{background:'#111113',border:'1px solid #1e1e22',color:'#6b7280'}}>
        <Coins size={32} style={{marginBottom:12,opacity:0.4}}/>
        <p style={{fontSize:13}}>Select a vault to mint or repay VUSD</p>
      </div>
    </div>
  )
}
