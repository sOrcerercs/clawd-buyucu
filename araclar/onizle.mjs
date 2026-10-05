// Claude'suz önizleme: bir durumu senaryodan üretip terminale truecolor ANSI olarak çizer.
// Kullanım: node araclar/onizle.mjs <durum> [sutun]
// Durumlar: dusun oku insa web fitil patlama ajan creeper bitti oyna

import { yeniSahne, olayUygula, adim } from '../plugin/hooks/sahne.js'
import { sahneHucreleri, VARSAYILAN } from '../plugin/hooks/cizim.js'

const DOLAP = [0xf2c12e, 0x4f8fe8, 0x5cc85c, 0xf08a24, 0xa05ce0, 0xf06ab0, 0xf2c12e].map((renk, i) => ({ renk, parlak: i % 4 }))
const eylem = (tur, metin, uzanti) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur, uzanti) => ({ tip: 'eylemBitti', tur, uzanti })

const SENARYO = {
  dusun: [[], 120],
  oku: [[eylem('oku', "README.md'yi okuyor")], 20],
  insa: [[eylem('insa', "sahne.js'yi karıştırıyor", 'js')], 30],
  web: [[eylem('web', 'kürede: github.com')], 20],
  fitil: [[eylem('tnt', 'npm test patlatıyor')], 8],
  patlama: [[eylem('tnt', 'npm test patlatıyor')], 12, [bitti('tnt')], 2],
  ajan: [[eylem('ajan', 'çırak: testleri yaz'), eylem('ajan', 'çırak: belge')], 40],
  creeper: [[{ tip: 'hata', tur: 'diger' }], 20],
  bitti: [[eylem('insa', 'x', 'md'), bitti('insa', 'md')], 30, [{ tip: 'bitti' }], 9],
  oyna: [[{ tip: 'oyuncu', komut: 'buyu' }], 3],
}

const [durum = 'dusun', sutunHam = '120'] = process.argv.slice(2)
const senaryo = SENARYO[durum]
if (!senaryo) {
  console.error(`Bilinmeyen durum: ${durum}. Seçenekler: ${Object.keys(SENARYO).join(' ')}`)
  process.exit(1)
}
const sutun = Math.max(20, Math.min(512, Number(sutunHam) || 120))
const satir = 10
const [olaylar, kare, sonra = [], sonraKare = 0] = senaryo

let s = olayUygula(yeniSahne(sutun), { tip: 'dolapYukle', sayi: DOLAP.length, siseler: DOLAP })
for (const o of olaylar) s = olayUygula(s, o)
for (let i = 0; i < kare; i++) s = adim(s)
for (const o of sonra) s = olayUygula(s, o)
for (let i = 0; i < sonraKare; i++) s = adim(s)

const renk = (r, katman) => (r === VARSAYILAN ? `\x1b[${katman === 'on' ? 39 : 49}m` : `\x1b[${katman === 'on' ? 38 : 48};2;${(r >> 16) & 255};${(r >> 8) & 255};${r & 255}m`)
const h = sahneHucreleri(s, sutun, satir)
let cikti = ''
for (let r = 0; r < satir; r++) {
  for (let c = 0; c < sutun; c++) {
    const i = (r * sutun + c) * 3
    cikti += renk(h[i + 1], 'on') + renk(h[i + 2], 'arka') + String.fromCodePoint(h[i])
  }
  cikti += '\x1b[0m\n'
}
process.stdout.write(cikti)
