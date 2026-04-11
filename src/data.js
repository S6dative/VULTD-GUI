export const BTC_PRICE = 85000
export const MOCK_VAULTS = [
  { id:'vault:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', state:'Open',   collateralSats:10000000, debt:4250, health:200 },
  { id:'vault:b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a', state:'Open',   collateralSats:7000000,  debt:2000, health:298 },
  { id:'vault:c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567abc', state:'Repaid', collateralSats:5000000,  debt:0,    health:999 },
]
export const MOCK_TXS = [
  { id:'t1', type:'receive',    amount:500,      currency:'VUSD', addr:'vusd:sp1q...x7k9',              ms:Date.now()-1800000 },
  { id:'t2', type:'mint',       amount:2000,     currency:'VUSD', addr:'vault:a1b2c3d4...ef123456',     ms:Date.now()-7200000 },
  { id:'t3', type:'send',       amount:150,      currency:'VUSD', addr:'vusd:sp1q...m3n4',              ms:Date.now()-18000000 },
  { id:'t4', type:'open_vault', amount:10000000, currency:'BTC',  addr:'vault:a1b2c3d4...ef123456',     ms:Date.now()-86400000 },
  { id:'t5', type:'repay',      amount:1000,     currency:'VUSD', addr:'vault:c3d4e5f6...567abc',       ms:Date.now()-172800000 },
]
export const MOCK_STEALTH = 'vusd:620feb5d76791136e6997cec721eecc56e8e4aa6f3ebaafef09d4dc5c2e7ce09:ba53841ee14514d22f60fe09838a174304b3375570f8802d7ef7402cac8cc312:033aa8a9:327343303290585089:http://127.0.0.1:8088'
export function truncateVaultId(id) { const h=id.replace('vault:',''); return h.length<=16?id:'vault:'+h.slice(0,8)+'...'+h.slice(-8) }
export function formatUsd(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n) }
export function formatSats(n) { return n>=100000000?(n/100000000).toFixed(8)+' BTC':n.toLocaleString()+' sats' }
export function satsToUsd(sats,price) { return (sats/100000000)*price }
export function timeAgo(ms) { const s=Math.floor((Date.now()-ms)/1000); if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+' minutes ago'; if(s<86400)return'about '+Math.floor(s/3600)+' hours ago'; return Math.floor(s/86400)+' days ago' }
export function healthColor(h) { return h>=200?'#22c55e':h>=150?'#f59e0b':'#ef4444' }
