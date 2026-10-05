// Clawd Büyücü — tohumlu arazi: süs blokları ve toplanacak bitkiler. Saf; $ kullanmaz.

import { zar } from './fizik.js'
import { labYerlesimi } from './lab.js'

export const BLOK_GEN = 4
export const BITKI_ARALIK = 160
export const BITKILER = ['mantar', 'cicek']
const BLOK_TIPLERI = ['tas', 'kutuk', 'yaprak']

export function alan(genislik) {
  const lab = labYerlesimi(genislik)
  return { bas: lab.son + 1, son: Math.max(lab.son + 1, genislik - 8) }
}

function sec(liste, z) {
  return liste[Math.floor(z * liste.length)]
}

export function araziUret(genislik, tohum) {
  const { bas, son } = alan(genislik)
  const bloklar = []
  for (let x = bas, i = 0; ; i++) {
    x += 10 + Math.floor(zar(tohum, 100 + i) * 18)
    if (x + BLOK_GEN > son) break
    bloklar.push({ x, tip: sec(BLOK_TIPLERI, zar(tohum, 200 + i)), yok: 0 })
  }
  const esyalar = []
  for (let x = bas + 3, i = 0; ; i++) {
    x += 14 + Math.floor(zar(tohum, 300 + i) * 20)
    if (x >= son) break
    esyalar.push({ x, tur: sec(BITKILER, zar(tohum, 400 + i)) })
  }
  return { bloklar, esyalar }
}

export function bitkiYenile(esyalar, genislik, kare, tohum) {
  if (kare % BITKI_ARALIK !== 0) return esyalar
  const { bas, son } = alan(genislik)
  if (son - bas < 10) return esyalar
  const bitkiSayisi = esyalar.filter((e) => BITKILER.includes(e.tur)).length
  if (bitkiSayisi >= Math.max(1, Math.floor((son - bas) / 30))) return esyalar
  const x = bas + 2 + Math.floor(zar(tohum + kare, 7) * (son - bas - 4))
  return [...esyalar, { x, tur: sec(BITKILER, zar(kare, tohum)) }]
}

export function bloklarYenile(bloklar, kare) {
  if (!bloklar.some((b) => b.yok && b.yok <= kare)) return bloklar
  return bloklar.map((b) => (b.yok && b.yok <= kare ? { ...b, yok: 0 } : b))
}
