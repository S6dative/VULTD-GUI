import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { bridge } from '../bridge/vusd'
import { Shield, Copy, Check, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react'
import { formatUsd, formatSats, timeAgo } from '../data'

export default function Transfer() {
  const { wallet, network } = useApp()
  const vusdBalance = wallet?.vusdBalance || 0
  const [tab, setTab] = useState('send')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)
  const [copied, setCopied] = useState(false)

  const sendValue = parseFloat(amount)||0
  const [vusdAddr, setVusdAddr] = useState(wallet?.vusdAddress || '')
  const [genning, setGenning] = useState(false)

  const generateAddress = async () => {
    setGenning(true)
    try {
      const res = await bridge.generateAddress()
      const addr = res?.address || res?.output || ''
      setVusdAddr(addr)
      // persist to wallet
      const w = JSON.parse(localStorage.getItem('vultd-wallet') || '{}')
      w.vusdAddress = addr
      localStorage.setItem('vultd-wallet', JSON.stringify(w))
    } catch (e) { console.error('generate-address', e) }
    setGenning(false)
  }

  const isValid = sendValue>0 && sendValue<=vusdBalance && to.startsWith('vusd:')

  const handleSend = async () => {
    if (!isValid) return
    setSending(true); setStatus(null)
    try {
      await bridge.send(to, sendValue)
      setStatus({ ok: true, msg: 'VUSD sent successfully over Lightning!' })
      setTo(''); setAmount('')
    } catch (e) {
      setStatus({ ok: false, msg: 'Send failed: ' + (e.message || 'unknown error') })
    }
    setSending(false)
  }

  const copy = () => {
    navigator.clipboard?.writeText(vusdAddr || '')
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  const txHistory = []  // populated from vusd CLI in production

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24,maxWidth:640}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:700,marginBottom:4}}>Send / Receive</h1>
        <p style={{color:'#737373',fontSize:14}}>Transfer VUSD privately via Lightning Network</p>
      </div>

      {/* Balance */}
      <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,color:'#737373',marginBottom:4}}>VUSD Balance</div>
            <div style={{fontFamily:'Space Mono',fontSize:24,fontWeight:700}}>{formatUsd(vusdBalance)}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#22c55e',background:'rgba(34,197,94,0.1)',padding:'6px 12px',borderRadius:6}}>
            <Shield size={14}/> Privacy-enhanced transfers
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'inline-flex',background:'#1a1a1a',border:'1px solid #262626',borderRadius:8,padding:4}}>
        {['send','receive'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'6px 20px',borderRadius:6,border:'none',cursor:'pointer',fontSize:14,fontWeight:tab===t?500:400,
              background:tab===t?'#262626':'transparent',color:tab===t?'#fafafa':'#737373',textTransform:'capitalize'}}>
            {t==='send'?<span style={{display:'flex',alignItems:'center',gap:6}}><ArrowUpRight size={14}/> Send</span>
                       :<span style={{display:'flex',alignItems:'center',gap:6}}><ArrowDownLeft size={14}/> Receive</span>}
          </button>
        ))}
      </div>

      {tab==='send' ? (
        <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20}}>
          {/* Privacy badge */}
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:8,background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.15)',marginBottom:20}}>
            <Shield size={14} style={{color:'#22c55e'}}/>
            <span style={{fontSize:12,color:'#22c55e'}}>Your transfer uses ring signatures and stealth addresses. Sender, recipient, and amount are hidden from observers.</span>
          </div>

          <label style={{fontSize:12,color:'#737373',display:'block',marginBottom:6}}>Recipient Address</label>
          <input value={to} onChange={e=>setTo(e.target.value)}
            placeholder="Enter a VUSD stealth address starting with vusd:"
            style={{width:'100%',padding:'10px 12px',borderRadius:8,background:'#111',border:'1px solid #262626',color:'#fafafa',outline:'none',fontFamily:'Space Mono',fontSize:11,marginBottom:16}}/>

          <label style={{fontSize:12,color:'#737373',display:'block',marginBottom:6}}>Amount (USD)</label>
          <div style={{position:'relative',marginBottom:6}}>
            <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="0.00"
              style={{width:'100%',padding:'10px 12px',borderRadius:8,background:'#111',border:'1px solid #262626',color:'#fafafa',outline:'none',fontSize:14}}/>
            <button onClick={()=>setAmount(String(vusdBalance))}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'#262626',border:'none',color:'#a3a3a3',fontSize:11,padding:'2px 8px',borderRadius:4,cursor:'pointer'}}>
              Max
            </button>
          </div>
          <div style={{fontSize:12,color:'#737373',marginBottom:20}}>Available: {formatUsd(vusdBalance)}</div>

          {status && (
            <div style={{marginBottom:16,padding:'10px 14px',borderRadius:8,background:status.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:status.ok?'#22c55e':'#ef4444',fontSize:13}}>
              {status.msg}
            </div>
          )}

          <button onClick={handleSend} disabled={sending||!isValid}
            style={{width:'100%',padding:'12px',borderRadius:8,fontWeight:600,fontSize:14,border:'none',
              cursor:sending||!isValid?'not-allowed':'pointer',
              background:sending||!isValid?'#262626':'#fafafa',
              color:sending||!isValid?'#737373':'#111',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {sending?<><RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/> Sending...</>
                    :<><ArrowUpRight size={14}/> Send {sendValue>0?formatUsd(sendValue):''} VUSD</>}
          </button>
        </div>
      ) : (
        <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20}}>
          <div style={{fontSize:13,color:'#737373',marginBottom:16}}>
            Share your VUSD stealth address to receive private transfers via Lightning.
          </div>
          <div style={{background:'#111',border:'1px solid #262626',borderRadius:8,padding:16,marginBottom:16}}>
            <div style={{fontSize:11,color:'#737373',marginBottom:8,fontFamily:'Space Mono'}}>YOUR VUSD ADDRESS</div>
            <div style={{fontFamily:'Space Mono',fontSize:10,color:'#fafafa',wordBreak:'break-all',lineHeight:1.8}}>{vusdAddr || 'No address yet — click Generate below'}</div>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={generateAddress} disabled={genning} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',borderRadius:8,background:'var(--card2)',color:'var(--fg-dim)',fontWeight:600,border:'1px solid var(--border)',cursor:genning?'not-allowed':'pointer',fontSize:14}}>
              {genning ? 'Generating...' : 'Generate New'}
            </button>
            <button onClick={copy}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',borderRadius:8,background:'#fafafa',color:'#111',fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>
              {copied?<><Check size={14}/> Copied!</>:<><Copy size={14}/> Copy Address</>}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div style={{background:'#1a1a1a',border:'1px solid #262626',borderRadius:12,padding:20}}>
        <div style={{fontSize:13,color:'#737373',marginBottom:16}}>Transfer History</div>
        {txHistory.length === 0 ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 0',color:'#737373',textAlign:'center'}}>
            <div style={{fontSize:13,marginBottom:4}}>No transfers yet</div>
            <div style={{fontSize:12}}>Your Lightning VUSD transfers will appear here</div>
          </div>
        ) : txHistory.map(tx=>(
          <div key={tx.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',borderRadius:8,background:'#222',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {tx.type==='receive'?<ArrowDownLeft size={16} style={{color:'#22c55e'}}/>:<ArrowUpRight size={16} style={{color:'#ef4444'}}/>}
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:14,textTransform:'capitalize'}}>{tx.type==='receive'?'Received':'Sent'}</div>
                <div style={{fontFamily:'Space Mono',fontSize:11,color:'#737373'}}>{tx.addr}</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:'Space Mono',fontWeight:600,color:tx.type==='receive'?'#22c55e':'#ef4444'}}>
                {tx.type==='receive'?'+':'-'}{formatUsd(tx.amount)}
              </div>
              <div style={{fontSize:11,color:'#737373'}}>{timeAgo(tx.ms)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
