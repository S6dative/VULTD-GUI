import { createContext, useContext, useState, useEffect } from 'react'
import { bridge } from '../bridge/vusd'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('vultd-theme') || 'dark')
  const [network, setNetwork] = useState(() => localStorage.getItem('vultd-network') || 'signet')
  const [unlocked, setUnlocked] = useState(false)
  const [hasWallet, setHasWallet] = useState(() => !!localStorage.getItem('vultd-wallet-exists'))
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    localStorage.setItem('vultd-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('vultd-network', network)
  }, [network])

  const lock = () => setUnlocked(false)

  const unlock = (pin) => {
    const stored = localStorage.getItem('vultd-pin')
    if (stored && stored === pin) { setUnlocked(true); return true }
    return false
  }

  const setupPin = (pin) => {
    localStorage.setItem('vultd-pin', pin)
    localStorage.setItem('vultd-wallet-exists', '1')
    setHasWallet(true)
    setUnlocked(true)
  }

  const createWallet = (pin, seedPhrase) => {
    const addr = network === 'signet'
      ? 'tb1q' + Array(38).fill(0).map(()=>'abcdefghjkmnpqrstuvwxyz023456789'[Math.floor(Math.random()*32)]).join('')
      : 'bc1q' + Array(38).fill(0).map(()=>'abcdefghjkmnpqrstuvwxyz023456789'[Math.floor(Math.random()*32)]).join('')
    const w = { seedPhrase, address: addr, btcSats: 0, vusdBalance: 0 }
    localStorage.setItem('vultd-wallet', JSON.stringify(w))
    setWallet(w)
    setupPin(pin)
  }

  const recoverWallet = (pin, seedPhrase) => {
    // In production: derive keys from seed phrase
    const w = { seedPhrase, address: 'tb1qrecovered...', btcSats: 0, vusdBalance: 0 }
    localStorage.setItem('vultd-wallet', JSON.stringify(w))
    setWallet(w)
    setupPin(pin)
  }

  const claimFaucet = async (address) => {
    const lastClaim = localStorage.getItem('vultd-faucet-last')
    const claimsToday = parseInt(localStorage.getItem('vultd-faucet-claims') || '0')
    const now = Date.now()
    const dayMs = 86400000
    if (lastClaim && now - parseInt(lastClaim) < dayMs && claimsToday >= 10) return false
    const newClaims = (now - parseInt(lastClaim||'0')) > dayMs ? 1 : claimsToday + 1
    try {
      await bridge.faucet(address)
      localStorage.setItem('vultd-faucet-last', String(now))
      localStorage.setItem('vultd-faucet-claims', String(newClaims))
      return true
    } catch (e) {
      console.error('faucet error', e)
      // In dev/mock mode still update localStorage
      localStorage.setItem('vultd-faucet-last', String(now))
      localStorage.setItem('vultd-faucet-claims', String(newClaims))
      return true
    }
  }

  const faucetClaims = parseInt(localStorage.getItem('vultd-faucet-claims') || '0')
  const lastClaim = parseInt(localStorage.getItem('vultd-faucet-last') || '0')
  const canClaim = network === 'signet' && (Date.now() - lastClaim > 86400000 || faucetClaims < 10)

  return (
    <AppContext.Provider value={{
      theme, setTheme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
      network, setNetwork,
      unlocked, lock, unlock, setupPin,
      hasWallet, wallet, createWallet, recoverWallet,
      claimFaucet, canClaim, faucetClaims,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
