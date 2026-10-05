// Claude'suz önizleme: bir durumu senaryodan üretip terminale truecolor ANSI olarak çizer.
// Kullanım: node araclar/onizle.mjs <durum> [sutun]

import { sahneHucreleri, VARSAYILAN } from '../plugin/hooks/cizim.js'
import { SENARYO, durumUret } from './senaryo.mjs'

const [durum = 'dusun', sutunHam = '120'] = process.argv.slice(2)
if (!SENARYO[durum]) {
  console.error(`Bilinmeyen durum: ${durum}. Seçenekler: ${Object.keys(SENARYO).join(' ')}`)
  process.exit(1)
}
const sutun = Math.max(20, Math.min(512, Number(sutunHam) || 120))
const satir = 10
const h = sahneHucreleri(durumUret(durum, sutun), sutun, satir)

const renk = (r, katman) => (r === VARSAYILAN ? `\x1b[${katman === 'on' ? 39 : 49}m` : `\x1b[${katman === 'on' ? 38 : 48};2;${(r >> 16) & 255};${(r >> 8) & 255};${r & 255}m`)
let cikti = ''
for (let r = 0; r < satir; r++) {
  for (let c = 0; c < sutun; c++) {
    const i = (r * sutun + c) * 3
    cikti += renk(h[i + 1], 'on') + renk(h[i + 2], 'arka') + String.fromCodePoint(h[i])
  }
  cikti += '\x1b[0m\n'
}
process.stdout.write(cikti)
