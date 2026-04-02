import { useState } from 'react'
import { Shield, Copy, ArrowRight } from 'lucide-react'
import { vusd } from '../bridge/vusd'
const Card = ({children}) => <div className="rounded-xl p-5" style={{background:'#111113',border:'1px solid #1e1e22'}}>{children}</div>
export default function Transfer() {
  const [tab,setTab] = useState('send')
  const [to,setTo] = useState('')
  const [amount,setAmount] = useState('')
  const [status,setStatus] = useState(null)
  const [addr,setAddr] = useState(null)
  const [sending,setSending] = useState(false)
  const handleSend = async () => {
    if (!to||!amount) return
    setSending(true); setStatus(null)
    try { await vusd.send(to,parseFloat(amount)); setStatus({ok:true,msg:'Sent!'}); setTo(''); setAmount('') }
    catch(e) { setStatus({ok:false,msg:String(e)}) }
    setSending(false)
  }
  return (
    <div>
      <div className="mb-8">
        <h1 style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700}}>Send / Receive</h1>
        <p style={{color:'#6b7280',fontSize:13,marginTop:4}}>Privacy-enhanced Lightning transfers</p>
      </div>
      <div className="flex gap-2 mb-6">
        {['send','receive'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
            style={{background:tab===t?'#f5a623':'#1a1a1e',color:tab===t?'#0a0a0b':'#9ca3af',border:'1px solid',borderColor:tab===t?'#f5a623':'#1e1e22'}}>
            {t}
          </button>
        ))}
      </div>
      {tab==='send'?(
        <div className="max-w-lg"><Card>
          <div className="flex items-center gap-2 mb-4"><Shield size={14} style={{color:'#f5a623'}}/><span style={{fontSize:12,color:'#6b7280'}}>Ring signatures active</span></div>
          <label style={{fontSize:12,color:'#6b7280',display:'block',marginBottom:6}}>Recipient Address</label>
          <input value={to} onChange={e=>setTo(e.target.value)} placeholder="vusd:spend:view:node:chan:relay" className="w-full px-3 py-2.5 rounded-lg outline-none mb-4" style={{background:'#0d0d0f',border:'1px solid #1e1e22',color:'#e5e7eb',fontFamily:'Space Mono',fontSize:10}}/>
          <label style={{fontSize:12,color:'#6b7280',display:'block',marginBottom:6}}>Amount USD</label>
          <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0.00" className="w-full px-3 py-2.5 rounded-lg outline-none text-sm mb-4" style={{background:'#0d0d0f',border:'1px solid #1e1e22',color:'#e5e7eb'}}/>
          {status&&<div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{background:status.ok?'#14532d':'#450a0a',color:status.ok?'#22c55e':'#ef4444'}}>{status.msg}</div>}
          <button onClick={handleSend} disabled={sending||!to||!amount} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm" style={{background:(!to||!amount||sending)?'#1a1a1e':'#f5a623',color:(!to||!amount||sending)?'#6b7280':'#0a0a0b'}}>
            <ArrowRight size={14}/> {sending?'Sending...':'Send VUSD'}
          </button>
        </Card></div>
      ):(
        <div className="max-w-lg"><Card>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>Share your address to receive private transfers.</p>
          {addr?(<div>
            <div className="p-3 rounded-lg mb-4" style={{background:'#0d0d0f',border:'1px solid #1e1e22'}}><p style={{fontFamily:'Space Mono',fontSize:10,color:'#e5e7eb',wordBreak:'break-all',lineHeight:1.8}}>{addr}</p></div>
            <button onClick={()=>navigator.clipboard?.writeText(addr)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{background:'#1a1a1e',color:'#9ca3af',border:'1px solid #1e1e22'}}><Copy size={13}/> Copy</button>
          </div>):(
            <button onClick={()=>vusd.generateAddress().then(r=>setAddr(r?.address||'vusd:...'))} className="w-full py-2.5 rounded-lg font-medium text-sm" style={{background:'#f5a623',color:'#0a0a0b'}}>Generate My Address</button>
          )}
        </Card></div>
      )}
    </div>
  )
}
