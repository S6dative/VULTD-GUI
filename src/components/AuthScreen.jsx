import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { Shield, RefreshCw, AlertCircle, ChevronLeft, Copy, Check, Eye, EyeOff } from 'lucide-react'

// ── Real BIP39 wordlist (first 256 words — enough for demo; full list loaded async) ──
// We use a simplified approach: generate entropy, hash to words
// For production: import full 2048-word BIP39 list

const BIP39 = ["abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse","access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act","action","actor","actress","actual","adapt","add","addict","address","adjust","admit","adult","advance","advice","aerobic","afford","afraid","again","age","agent","agree","ahead","aim","air","airport","aisle","alarm","album","alcohol","alert","alien","all","alley","allow","almost","alone","alpha","already","also","alter","always","amateur","amazing","among","amount","amused","analyst","anchor","ancient","anger","angle","angry","animal","ankle","announce","annual","another","answer","antenna","antique","anxiety","apart","appear","apple","approve","april","arch","arctic","area","arena","argue","arm","armed","armor","army","around","arrange","arrest","arrive","arrow","art","artefact","artist","artwork","ask","aspect","assault","asset","assist","assume","asthma","athlete","atom","attack","attend","attitude","attract","auction","audit","august","aunt","author","auto","autumn","average","avocado","avoid","awake","aware","away","awesome","awful","awkward","axis","baby","balance","bamboo","banana","banner","bar","barely","bargain","barrel","base","basic","basket","battle","beach","beauty","because","become","beef","before","begin","behave","behind","believe","below","belt","bench","benefit","best","betray","better","between","beyond","bicycle","bid","bike","bind","biology","bird","birth","bitter","black","blade","blame","blanket","blast","bleak","bless","blind","blood","blossom","blouse","blue","blur","blush","board","boat","body","boil","bomb","bone","book","boost","border","boring","borrow","boss","bottom","bounce","box","boy","bracket","brain","brand","brave","breeze","brick","bridge","brief","bright","bring","brisk","broccoli","broken","bronze","broom","brother","brown","brush","bubble","buddy","budget","buffalo","build","bulb","bulk","bullet","bundle","bunker","burden","burger","burst","bus","business","busy","butter","buyer","buzz","cabbage","cabin","cable","cactus","cage","cake","call","calm","camera","camp","can","canal","cancel","candy","cannon","canvas","canyon","capable","capital","captain","car","carbon","card","cargo","carpet","carry","cart","case","cash","casino","castle","casual","cat","catalog","catch","category","cattle","caught","cause","caution","cave","census","chair","chaos","chapter","charge","chase","chat","cheap","check","cheese","chef","cherry","chest","chicken","chief","child","chimney","choice","choose","chronic","chuckle","chunk","cigar","cinnamon","circle","citizen","city","civil","claim","clap","clarify","claw","clay","clean","clerk","clever","click","client","cliff","climb","clinic","clip","clock","clog","close","cloth","cloud","clown","club","clump","cluster","clutch","coach","coast","coconut","code","coffee","coil","coin","collect","color","column","combine","come","comfort","comic","common","company","concert","conduct","confirm","congress","connect","consider","control","convince","cook","cool","copper","copy","coral","core","corn","correct","cost","cotton","couch","country","couple","course","cousin","cover","coyote","crack","cradle","craft","cram","crane","crash","crater","crawl","crazy","cream","credit","creek","crew","cricket","crime","crisp","critic","cross","crouch","crowd","crucial","cruel","cruise","crumble","crunch","crush","cry","crystal","cube","culture","cup","cupboard","curious","current","curtain","curve","cushion","custom","cute","cycle"]

function genSeed(count = 12) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push(BIP39[Math.floor(Math.random() * BIP39.length)])
  }
  return arr
}

// Simple deterministic BTC address from seed (for UI display — real derivation via vusd CLI in production)
function seedToAddress(seedWords, network = 'signet') {
  const prefix = network === 'mainnet' ? 'bc1q' : 'tb1q'
  let hash = 0
  for (const c of seedWords.join(' ')) {
    hash = ((hash << 5) - hash) + c.charCodeAt(0)
    hash |= 0
  }
  const chars = 'abcdefghjkmnpqrstuvwxyz0234567890'
  let addr = prefix
  const seed = Math.abs(hash)
  for (let i = 0; i < 38; i++) {
    addr += chars[(seed * (i + 7) * 2654435761) % chars.length]
  }
  return addr
}

// ── PIN dots ──────────────────────────────────────────────────────────────────
function PinDots({ pin, length = 6, error }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '28px 0' }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{
          width: 12, height: 12, borderRadius: '50%',
          background: i < pin.length
            ? (error ? 'var(--danger)' : 'var(--fg)')
            : 'var(--border2)',
          transition: 'background 0.12s, transform 0.12s',
          transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
        }} />
      ))}
    </div>
  )
}

// ── Numpad ────────────────────────────────────────────────────────────────────
function Numpad({ onPress }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','<']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 240, margin: '0 auto' }}>
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <button key={k + i}
          onClick={() => onPress(k === '<' ? 'BACK' : k)}
          style={{
            height: 52, borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card2)',
            color: 'var(--fg)',
            fontSize: k === '<' ? 16 : 20,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: k === '<' ? 'Geist, sans-serif' : 'Geist Mono, monospace',
            transition: 'background 0.08s',
            letterSpacing: 0,
          }}
          onMouseDown={e => e.currentTarget.style.background = 'var(--card3)'}
          onMouseUp={e => e.currentTarget.style.background = 'var(--card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--card2)'}>
          {k}
        </button>
      ))}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({ children, wide = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: wide ? 520 : 400,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: wide ? '36px 40px' : '40px 36px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.4)',
        animation: 'fadein 0.2s ease',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ large = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: large ? 44 : 32 }}>
      <div style={{
        fontFamily: 'Geist, sans-serif',
        fontWeight: 700,
        fontSize: large ? 44 : 24,
        color: 'var(--fg)',
        letterSpacing: large ? '-2px' : '-1px',
        marginBottom: 8,
      }}>
        <img src='icon.png' alt='VULTD' style={{ width: large ? 120 : 80, height: 'auto' }} />
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--muted-fg)',
        letterSpacing: '0.04em',
        fontFamily: 'Geist, sans-serif',
        fontWeight: 400,
      }}>
        {large ? 'Bitcoin-backed private stablecoin' : 'Enter PIN to continue'}
      </div>
      {large && (
        <div style={{ width: 32, height: 1, background: 'var(--border2)', marginTop: 20 }} />
      )}
    </div>
  )
}

// ── UnlockScreen ──────────────────────────────────────────────────────────────
export function UnlockScreen() {
  const { unlock } = useApp()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const shakeRef = useRef(null)

  const handleKey = useCallback((k) => {
    if (error) { setError(false); setPin(''); return }
    if (k === 'BACK') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      setTimeout(() => {
        const ok = unlock(next)
        if (!ok) {
          setError(true)
          setAttempts(a => a + 1)
          if (shakeRef.current) {
            shakeRef.current.style.animation = 'none'
            void shakeRef.current.offsetWidth
            shakeRef.current.style.animation = 'shake 0.35s ease'
          }
          setTimeout(() => { setPin(''); setError(false) }, 1200)
        }
      }, 60)
    }
  }, [pin, error, unlock])

  useEffect(() => {
    const h = (e) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('BACK')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleKey])

  return (
    <Shell>
      <style>{'@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}'}</style>
      <Logo />
      <div style={{ textAlign: 'center' }}>
        {error && (
          <div style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <AlertCircle size={13} />
            Incorrect PIN{attempts >= 3 ? ' · ' + attempts + ' attempts' : ''}
          </div>
        )}
      </div>
      <div ref={shakeRef}>
        <PinDots pin={pin} error={error} />
      </div>
      <Numpad onPress={handleKey} />
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted-fg)' }}>
        Forgot PIN? <button onClick={() => { localStorage.clear(); window.location.reload() }} style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Reset wallet</button>
      </div>
    </Shell>
  )
}

// ── Word grid ─────────────────────────────────────────────────────────────────
function WordGrid({ words }) {
  const cols = words.length === 24 ? 4 : 3
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(\${cols}, 1fr)`, gap: 6, margin: '16px 0' }}>
      {words.map((w, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '7px 10px',
        }}>
          <span style={{ fontSize: 10, color: 'var(--muted-fg)', fontFamily: 'Geist Mono, monospace', minWidth: 18 }}>{i + 1}</span>
          <span style={{ fontSize: 13, fontFamily: 'Geist Mono, monospace', color: 'var(--fg)', fontWeight: 500 }}>{w}</span>
        </div>
      ))}
    </div>
  )
}

// ── SetupScreen ───────────────────────────────────────────────────────────────
export function SetupScreen() {
  const { createWallet, recoverWallet, network } = useApp()
  const [mode, setMode] = useState(null)       // null | 'new' | 'recover'
  const [step, setStep] = useState(1)           // 1=seed, 2=pin
  const [wordCount, setWordCount] = useState(12)
  const [seed, setSeed] = useState([])
  const [rec, setRec] = useState('')
  const [pin, setPin] = useState('')
  const [conf, setConf] = useState('')
  const [pStep, setPStep] = useState('set')    // 'set' | 'confirm'
  const [pErr, setPErr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const startNew = () => { setSeed(genSeed(wordCount)); setMode('new'); setStep(1); setConfirmed(false) }
  const startRec = () => { setMode('recover'); setStep(1) }
  const canRec = () => { const w = rec.trim().split(/\s+/); return w.length === 12 || w.length === 24 }

  const handlePin = (k) => {
    const isSetting = pStep === 'set'
    const cur = isSetting ? pin : conf
    const set = isSetting ? setPin : setConf
    if (k === 'BACK') { set(p => p.slice(0, -1)); return }
    if (cur.length >= 6) return
    const next = cur + k; set(next)
    if (next.length === 6) {
      if (isSetting) setTimeout(() => setPStep('confirm'), 120)
      else setTimeout(() => {
        if (next !== pin) { setPErr(true); setTimeout(() => { setConf(''); setPErr(false) }, 900) }
        else finish(pin)
      }, 60)
    }
  }

  const finish = async (finalPin) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const words = mode === 'new' ? seed : rec.trim().split(/\s+/)
    const addr = seedToAddress(words, network)
    if (mode === 'new') createWallet(finalPin, words.join(' '), addr)
    else recoverWallet(finalPin, words.join(' '), addr)
  }

  const copy = () => {
    navigator.clipboard?.writeText(seed.join(' '))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Landing ────────────────────────────────────────────────────────────────
  if (!mode) return (
    <Shell>
      <Logo large />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={startNew} className="btn btn-primary btn-lg" style={{ width: '100%', borderRadius: 10 }}>
          Create New Wallet
        </button>
        <button onClick={startRec} className="btn btn-secondary btn-lg" style={{ width: '100%', borderRadius: 10 }}>
          Restore from Seed Phrase
        </button>
      </div>
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--muted-fg)' }}>
        <Shield size={11} style={{ flexShrink: 0 }} />
        Non-custodial · Your keys never leave this device
      </div>
    </Shell>
  )

  // ── New wallet: show seed ──────────────────────────────────────────────────
  if (mode === 'new' && step === 1) return (
    <Shell wide>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setMode(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ChevronLeft size={18} /></button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Recovery Phrase</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Step 1 of 2 · Back up before continuing</div>
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--warning)', lineHeight: 1.6 }}>
        Write these words down in order. Anyone with this phrase can access your wallet.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[12, 24].map(n => (
          <button key={n} onClick={() => { setWordCount(n); setSeed(genSeed(n)); setConfirmed(false) }}
            className={n === wordCount ? 'btn btn-secondary' : 'btn btn-ghost btn-sm'}
            style={{ fontSize: 12 }}>
            {n} words
          </button>
        ))}
        <button onClick={() => { setSeed(genSeed(wordCount)); setConfirmed(false) }} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} /> Regenerate
        </button>
      </div>

      <WordGrid words={seed} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={copy} className="btn btn-secondary" style={{ flex: 1 }}>
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy phrase</>}
        </button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card2)', cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
          style={{ width: 15, height: 15, accentColor: 'var(--fg)', cursor: 'pointer' }} />
        I have written down my recovery phrase and stored it safely
      </label>

      <button onClick={() => setStep(2)} disabled={!confirmed}
        className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12, borderRadius: 10 }}>
        Continue →
      </button>
    </Shell>
  )

  // ── Recover: enter seed ───────────────────────────────────────────────────
  if (mode === 'recover' && step === 1) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setMode(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ChevronLeft size={18} /></button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Restore Wallet</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Enter your 12 or 24-word seed phrase</div>
        </div>
      </div>
      <textarea value={rec} onChange={e => setRec(e.target.value)}
        placeholder="word1 word2 word3 ..."
        rows={5}
        style={{
          width: '100%', padding: '12px', borderRadius: 8,
          background: 'var(--bg)', border: '1px solid var(--border)',
          color: 'var(--fg)', resize: 'none', outline: 'none',
          fontFamily: 'Geist Mono, monospace', fontSize: 13, lineHeight: 1.8,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--muted)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <div style={{ fontSize: 12, color: canRec() ? 'var(--success)' : 'var(--muted-fg)', margin: '8px 0 16px', fontFamily: 'Geist Mono, monospace' }}>
        {rec.trim() ? rec.trim().split(/\s+/).length : 0} / 12 or 24 words
      </div>
      <button onClick={() => setStep(2)} disabled={!canRec()}
        className="btn btn-primary btn-lg" style={{ width: '100%', borderRadius: 10 }}>
        Continue →
      </button>
    </Shell>
  )

  // ── PIN setup ─────────────────────────────────────────────────────────────
  if (step === 2) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => { setStep(1); setPin(''); setConf(''); setPStep('set') }}
          className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ChevronLeft size={18} /></button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
            {pStep === 'set' ? 'Set PIN' : 'Confirm PIN'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
            {mode === 'new' ? 'Step 2 of 2' : 'Final step'} · 6-digit PIN
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-fg)', minHeight: 20 }}>
        {pErr
          ? <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><AlertCircle size={13} /> PINs don't match</span>
          : pStep === 'set' ? 'Choose a PIN to protect your wallet' : 'Re-enter to confirm'}
      </div>
      <PinDots pin={pStep === 'set' ? pin : conf} error={pErr} />
      {loading
        ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px', color: 'var(--muted-fg)', fontSize: 13 }}>
            <RefreshCw size={14} className="spin" /> Setting up wallet...
          </div>
        : <Numpad onPress={handlePin} />}
    </Shell>
  )

  return null
}
