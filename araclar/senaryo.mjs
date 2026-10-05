// Önizleme ve ekran görüntüsü araçlarının ortak senaryoları: her durum için tekrarlanabilir bir sahne üretir.

import { yeniSahne, olayUygula, adim } from '../plugin/hooks/sahne.js'

const DOLAP = [0xf2c12e, 0x4f8fe8, 0x5cc85c, 0xf08a24, 0xa05ce0, 0xf06ab0, 0xf2c12e].map((renk, i) => ({ renk, parlak: i % 4 }))
const eylem = (tur, metin, uzanti) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur, uzanti) => ({ tip: 'eylemBitti', tur, uzanti })
const zombi = (x) => ({ tur: 'zombi', x, zy: 0, vy: 0, can: 3, kare: 0, vurulma: 0 })
const iskelet = (x) => ({ tur: 'iskelet', x, zy: 0, vy: 0, can: 2, kare: 0, vurulma: 0 })

// [olaylar, kare, sonraki olaylar, sonraki kare, başlangıç ayarı]
export const SENARYO = {
  dusun: [[], 5, [], 0, (s) => ({ ...s, x: 70, canavarlar: [zombi(100), iskelet(125)] })],
  oku: [[eylem('oku', "README.md'yi okuyor")], 20],
  insa: [[eylem('insa', "sahne.js'yi karıştırıyor", 'js')], 30],
  web: [[eylem('web', 'kürede: github.com')], 40],
  fitil: [[eylem('tnt', 'npm test patlatıyor')], 8],
  patlama: [[eylem('tnt', 'npm test patlatıyor')], 12, [bitti('tnt')], 2],
  ajan: [[eylem('ajan', 'çırak: testleri yaz'), eylem('ajan', 'çırak: belge')], 40],
  creeper: [[{ tip: 'hata', tur: 'diger' }], 20],
  bitti: [[eylem('insa', 'x', 'md'), bitti('insa', 'md')], 30, [{ tip: 'bitti' }], 9],
  oyna: [[{ tip: 'oyuncu', komut: 'buyu' }], 3, [], 0, (s) => ({ ...s, x: 70, canavarlar: [zombi(95)] })],
}

export function durumUret(ad, sutun) {
  const [olaylar, kare, sonra = [], sonraKare = 0, ayar = (s) => s] = SENARYO[ad]
  let s = ayar(olayUygula(yeniSahne(sutun), { tip: 'dolapYukle', sayi: DOLAP.length, siseler: DOLAP }))
  for (const o of olaylar) s = olayUygula(s, o)
  for (let i = 0; i < kare; i++) s = adim(s)
  for (const o of sonra) s = olayUygula(s, o)
  for (let i = 0; i < sonraKare; i++) s = adim(s)
  return s
}
