import { useState, useRef, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { Shield, RefreshCw, AlertCircle, ChevronLeft, Copy, Check } from 'lucide-react'

function PinDots({ pin, length = 6, error }) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '24px 0' }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? (error ? 'var(--danger)' : 'var(--btc)') : 'var(--border)', transition: 'background 0.15s' }} />
      ))}
    </div>
  )
}

function Numpad({ onPress }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','<']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 260, margin: '0 auto' }}>
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <button key={k+i} onClick={() => onPress(k === '<' ? 'BACK' : k)}
          style={{ height: 56, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--fg)', fontSize: 22, fontWeight: 500, cursor: 'pointer' }}
          onMouseDown={e => e.currentTarget.style.background = 'var(--muted)'}
          onMouseUp={e => e.currentTarget.style.background = 'var(--card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--card2)'}>{k}</button>
      ))}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 36px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>{children}</div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--btc)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 24, color: '#fff' }}>V</span>
      </div>
      <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 20, color: 'var(--fg)' }}>VULTD</div>
      <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 4 }}>Bitcoin-backed private stablecoin</div>
    </div>
  )
}

export function UnlockScreen() {
  const { unlock } = useApp()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const shakeRef = useRef(null)

  const handleKey = (k) => {
    if (error) { setError(false); setPin(''); return }
    if (k === 'BACK') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      setTimeout(() => {
        const ok = unlock(next)
        if (!ok) {
          setError(true); setAttempts(a => a + 1)
          if (shakeRef.current) { shakeRef.current.style.animation = 'none'; void shakeRef.current.offsetWidth; shakeRef.current.style.animation = 'shake 0.4s ease' }
          setTimeout(() => { setPin(''); setError(false) }, 1200)
        }
      }, 80)
    }
  }

  useEffect(() => {
    const h = (e) => { if (e.key >= '0' && e.key <= '9') handleKey(e.key); if (e.key === 'Backspace') handleKey('BACK') }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [pin, error])

  return (
    <Shell>
      <style>{'@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}'}</style>
      <Logo />
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Enter PIN</div>
        <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>
          {error ? <span style={{ color: 'var(--danger)' }}>Incorrect PIN{attempts >= 3 ? ' (' + attempts + ' attempts)' : ''}</span> : 'Enter your 6-digit PIN to unlock'}
        </div>
      </div>
      <div ref={shakeRef}><PinDots pin={pin} error={error} /></div>
      <Numpad onPress={handleKey} />
    </Shell>
  )
}

const WL = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','apart','appear','apple','approve','april','arch','arctic','area','arena','argue','arm','armed','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward','axis']
function genSeed(n) { return Array.from({length:n},()=>WL[Math.floor(Math.random()*WL.length)]) }

function WordGrid({ words }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '16px 0' }}>
      {words.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--muted-fg)', fontFamily: 'Space Mono', minWidth: 16 }}>{i+1}</span>
          <span style={{ fontSize: 13, fontFamily: 'Space Mono', color: 'var(--fg)' }}>{w}</span>
        </div>
      ))}
    </div>
  )
}

export function SetupScreen() {
  const { createWallet, recoverWallet } = useApp()
  const [mode, setMode] = useState(null)
  const [step, setStep] = useState(1)
  const [seed, setSeed] = useState([])
  const [rec, setRec] = useState('')
  const [pin, setPin] = useState('')
  const [conf, setConf] = useState('')
  const [pStep, setPStep] = useState('set')
  const [pErr, setPErr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const startNew = () => { setSeed(genSeed(12)); setMode('new'); setStep(1) }
  const startRec = () => { setMode('recover'); setStep(1) }

  const handlePin = (k) => {
    const isSetting = pStep === 'set'
    const cur = isSetting ? pin : conf
    const set = isSetting ? setPin : setConf
    if (k === 'BACK') { set(p => p.slice(0,-1)); return }
    if (cur.length >= 6) return
    const next = cur + k; set(next)
    if (next.length === 6) {
      if (isSetting) setTimeout(() => setPStep('confirm'), 100)
      else setTimeout(() => {
        if (next !== pin) { setPErr(true); setTimeout(() => { setConf(''); setPErr(false) }, 1000) }
        else finish(pin)
      }, 80)
    }
  }

  const finish = async (p) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    if (mode === 'new') createWallet(p, seed.join(' '))
    else recoverWallet(p, rec.trim().split(/\s+/).join(' '))
  }

  const copy = () => { navigator.clipboard?.writeText(seed.join(' ')); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  const canRec = () => { const w=rec.trim().split(/\s+/); return w.length===12||w.length===24 }

  if (!mode) return (
    <Shell>
      <Logo large />
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Welcome to VULTD</div>
        <div style={{ fontSize: 13, color: 'var(--muted-fg)', lineHeight: 1.6 }}>Bitcoin-backed private stablecoin on Lightning.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={startNew} style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--btc)', color: '#fff', fontWeight: 700, fontSize: 15 }}>Create New Wallet</button>
        <button onClick={startRec} style={{ padding: '14px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--card2)', color: 'var(--fg)', fontWeight: 600, fontSize: 15 }}>Restore from Seed Phrase</button>
      </div>
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--muted-fg)' }}>
        <Shield size={12} /> Non-custodial - Keys never leave your device
      </div>
    </Shell>
  )

  if (mode === 'new' && step === 1) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-fg)', padding: 0 }}><ChevronLeft size={20} /></button>
        <div><div style={{ fontWeight: 700, fontSize: 16 }}>Backup Seed Phrase</div><div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Step 1 of 2</div></div>
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.25)', marginBottom: 16, fontSize: 13, color: 'var(--warning)', lineHeight: 1.6 }}>Write these words down. They are the only way to recover your wallet.</div>
      <WordGrid words={seed} />
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={copy} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
        </button>
        <button onClick={() => setSeed(genSeed(12))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--fg-dim)', cursor: 'pointer' }}><RefreshCw size={14}/></button>
      </div>
      <button onClick={() => setStep(2)} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, background: 'var(--btc)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>I have saved my seed phrase</button>
    </Shell>
  )

  if (mode === 'recover' && step === 1) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-fg)', padding: 0 }}><ChevronLeft size={20} /></button>
        <div><div style={{ fontWeight: 700, fontSize: 16 }}>Restore Wallet</div><div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Enter your 12 or 24-word seed phrase</div></div>
      </div>
      <textarea value={rec} onChange={e=>setRec(e.target.value)} placeholder='Enter seed phrase words...' rows={5} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', resize: 'none', outline: 'none', fontFamily: 'Space Mono, monospace', fontSize: 13, lineHeight: 1.8 }} />
      <div style={{ fontSize: 12, color: 'var(--muted-fg)', margin: '8px 0 16px' }}>Words: {rec.trim() ? rec.trim().split(/\s+/).length : 0} / 12 or 24</div>
      <button onClick={() => setStep(2)} disabled={!canRec()} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: canRec() ? 'var(--btc)' : 'var(--border)', color: canRec() ? '#fff' : 'var(--muted-fg)', fontWeight: 700, fontSize: 15, cursor: canRec() ? 'pointer' : 'not-allowed' }}>Continue</button>
    </Shell>
  )

  if (step === 2) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => { setStep(1); setPin(''); setConf(''); setPStep('set') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-fg)', padding: 0 }}><ChevronLeft size={20} /></button>
        <div><div style={{ fontWeight: 700, fontSize: 16 }}>{pStep === 'set' ? 'Choose a PIN' : 'Confirm PIN'}</div><div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{mode === 'new' ? 'Step 2 of 2' : 'Final step'}</div></div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-fg)' }}>
        {pStep === 'set' ? 'Choose a 6-digit PIN' : pErr ? <span style={{ color: 'var(--danger)' }}>PINs do not match</span> : 'Re-enter to confirm'}
      </div>
      <PinDots pin={pStep === 'set' ? pin : conf} error={pErr} />
      {loading ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted-fg)' }}>Setting up wallet...</div> : <Numpad onPress={handlePin} />}
    </Shell>
  )

  return null
}