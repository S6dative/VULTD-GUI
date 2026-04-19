// Utility functions only — no pre-filled mock data

export function truncateVaultId(id) {
  const s = String(id || '')
  const prefix = s.startsWith('vault-qu:') ? 'vault-qu:' : s.startsWith('vault-q:') ? 'vault-q:' : 'vault:'
  const hex = s.slice(prefix.length)
  return hex.length <= 16 ? s : prefix + hex.slice(0, 8) + '…' + hex.slice(-8)
}
export function formatUsd(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0)
}
export function formatSats(n) {
  const v = n || 0
  return v >= 100_000_000 ? (v / 100_000_000).toFixed(8) + ' BTC' : v.toLocaleString() + ' sats'
}
export function satsToUsd(sats, price) { return ((sats || 0) / 100_000_000) * (price || 0) }
export function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + ' min ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
export function healthColor(h) {
  return h >= 200 ? 'var(--success)' : h >= 150 ? 'var(--warning)' : 'var(--danger)'
}
export function isQuantumVault(id) {
  return String(id || '').startsWith('vault-q:') || String(id || '').startsWith('vault-qu:')
}
