import { useState } from 'react'
const Field = ({label,value,onChange,placeholder,mono=false}) => (
  <div className="mb-4">
    <label style={{fontSize:12,color:'#6b7280',display:'block',marginBottom:6}}>{label}</label>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{background:'#0d0d0f',border:'1px solid #1e1e22',color:'#e5e7eb',fontFamily:mono?'Space Mono':'inherit',fontSize:mono?11:13}}/>
  </div>
)
export default function Settings() {
  const [lndUrl,setLndUrl] = useState('https://localhost:8080')
  const [relayUrl,setRelayUrl] = useState('http://127.0.0.1:8088')
  return (
    <div>
      <h1 style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700,marginBottom:8}}>Settings</h1>
      <p style={{color:'#6b7280',fontSize:13,marginBottom:32}}>Node and wallet configuration</p>
      <div className="max-w-lg rounded-xl p-5" style={{background:'#111113',border:'1px solid #1e1e22'}}>
        <h2 style={{fontSize:13,fontWeight:600,marginBottom:16}}>Node Configuration</h2>
        <Field label="LND REST URL" value={lndUrl} onChange={setLndUrl} placeholder="https://localhost:8080" mono/>
        <Field label="Relay URL" value={relayUrl} onChange={setRelayUrl} placeholder="http://127.0.0.1:8088" mono/>
        <button className="w-full py-2.5 rounded-lg font-medium text-sm mt-2" style={{background:'#f5a623',color:'#0a0a0b'}}>Save</button>
      </div>
    </div>
  )
}
