// Clawd Büyücü — canavarlar: doğma, yürüme, vurulma ve düşürdükleri malzeme. Saf; $ kullanmaz.

import { zar, yerCekimi } from './fizik.js'
import { alan } from './arazi.js'

export const CANAVAR = {
  zombi: { can: 3, hiz: 0.3, gen: 5, dusurur: 'et' },
  iskelet: { can: 2, hiz: 0.35, gen: 5, dusurur: 'kemik' },
  orumcek: { can: 2, hiz: 0.5, gen: 8, dusurur: 'goz' },
  slime: { can: 1, hiz: 0.4, gen: 5, dusurur: 'slimeTopu' },
}
const TURLER = Object.keys(CANAVAR)
export const DOGUM_ARALIK = 70
export const EN_COK_CANAVAR = 2
export const YAKIN = 7
const SLIME_ZIPLAMA = 14

function merkez(c) {
  return c.x + CANAVAR[c.tur].gen / 2
}

export function canavarDogur(canavarlar, genislik, kare, tohum) {
  if (kare % DOGUM_ARALIK !== 0 || canavarlar.length >= EN_COK_CANAVAR) return null
  const { bas, son } = alan(genislik)
  if (son - bas < 30) return null
  const tur = TURLER[Math.floor(zar(kare, tohum + 11) * TURLER.length)]
  return { tur, x: genislik - 1, zy: 0, vy: 0, can: CANAVAR[tur].can, kare: 0, vurulma: 0 }
}

export function canavarAdim(c, hedefX, durgun) {
  const kare = c.kare + 1
  const vurulma = Math.max(0, c.vurulma - 1)
  if (durgun) return { ...c, kare, vurulma }
  const fark = hedefX - merkez(c)
  if (Math.abs(fark) <= YAKIN) return { ...c, kare, vurulma }
  const hiz = CANAVAR[c.tur].hiz
  if (c.tur !== 'slime') return { ...c, kare, vurulma, x: c.x + Math.sign(fark) * hiz }
  // Slime yerdeyken bekler, belli aralıkla zıplar; yalnız havadayken ilerler
  const havada = c.zy > 0 || c.vy > 0
  const vy = !havada && kare % SLIME_ZIPLAMA === 0 ? 2 : c.vy
  const sonraki = yerCekimi({ ...c, vy })
  const ilerler = havada || vy > 0
  return { ...sonraki, kare, vurulma, x: ilerler ? c.x + Math.sign(fark) * hiz * 2 : c.x }
}

export function vurusKontrol(canavarlar, mermiler) {
  let guncel = canavarlar
  const kalanMermi = []
  for (const m of mermiler) {
    const i = guncel.findIndex((c) => m.x >= c.x - 1 && m.x <= c.x + CANAVAR[c.tur].gen)
    if (i === -1) {
      kalanMermi.push(m)
      continue
    }
    guncel = guncel.map((c, j) => (j === i ? { ...c, can: c.can - 1, vurulma: 3 } : c))
  }
  return {
    canavarlar: guncel.filter((c) => c.can > 0),
    mermiler: kalanMermi,
    olenler: guncel.filter((c) => c.can <= 0),
  }
}

export function dusur(olenler) {
  return olenler.map((c) => ({ x: Math.round(merkez(c)) - 1, tur: CANAVAR[c.tur].dusurur }))
}

export function enYakin(canavarlar, x) {
  let sonuc = null
  for (const c of canavarlar) {
    const fark = merkez(c) - x
    if (!sonuc || Math.abs(fark) < sonuc.mesafe) sonuc = { canavar: c, fark, mesafe: Math.abs(fark) }
  }
  return sonuc
}

// Eşyalar 2 piksel genişliğinde; Clawd'un [x, x+gen-1] aralığına değen toplanır
export function topla(esyalar, x, gen) {
  const kalan = []
  let toplanan = 0
  for (const e of esyalar) {
    if (e.x + 1 >= x && e.x <= x + gen - 1) toplanan += 1
    else kalan.push(e)
  }
  return { esyalar: kalan, toplanan }
}
