// Clawd Büyücü — lab yerleşimi, dolap rafları ve şişe renkleri. Saf; $ kullanmaz.
// Raster'da 1 sütun = 1 piksel; tüm x değerleri piksel.

import { RENK } from './sprite.js'

export const CLAWD_GEN = 7
export const DAR_ESIK = 110

// Soldan sağa: dolap | Clawd'un okuma durağı | kürsü | web durağı | küre | inşa durağı | kazan.
// Clawd eşyanın solunda durur; asasının ucu eşyaya bir piksel kala biter, eşyayı örtmez.
const GENIS = { dolapX: 1, dolapGen: 21, okuX: 23, kursuX: 32, webX: 40, kureX: 49, insaX: 56, kazanX: 65, son: 77 }
// Dar bantta dolap ve kazan kalır; okuma ve web dolabın önünde yapılır
const DAR = { dolapX: 1, dolapGen: 21, okuX: 23, kursuX: null, webX: 23, kureX: null, insaX: 23, kazanX: 32, son: 45 }

export function labYerlesimi(genislik) {
  return genislik < DAR_ESIK ? DAR : GENIS
}

export function durak(lab, tur) {
  if (tur === 'oku') return { x: lab.okuX, yon: lab.kursuX === null ? -1 : 1 }
  if (tur === 'web') return { x: lab.webX, yon: lab.kureX === null ? -1 : 1 }
  if (tur === 'insa') return { x: lab.insaX, yon: 1 }
  if (tur === 'dolap') return { x: lab.okuX, yon: -1 }
  return { x: lab.son + 1, yon: 1 }
}

export function asaUcuX(v) {
  return v.yon > 0 ? v.x + CLAWD_GEN : v.x - 1
}

// ---- Şişeler ----
const SISE_RENGI = {
  js: 0xf2c12e, mjs: 0xf2c12e, cjs: 0xf2c12e, jsx: 0xf2c12e, ts: 0xf2c12e, tsx: 0xf2c12e,
  md: 0x4f8fe8, mdx: 0x4f8fe8, py: 0x5cc85c, json: 0xf08a24, css: 0xf06ab0, html: 0xf06ab0,
}
export const VARSAYILAN_SISE = RENK.iksir
export const PARLAK_EN_COK = 3

export function siseRengi(uz) {
  return SISE_RENGI[String(uz ?? '').toLowerCase()] ?? VARSAYILAN_SISE
}

export function yeniSise(uz, malzeme) {
  return { renk: siseRengi(uz), parlak: Math.max(0, Math.min(PARLAK_EN_COK, malzeme | 0)) }
}

// ---- Dolap ----
export const DOLAP_SAKLA = 24
export const RAF_SAYISI = 2
export const RAF_KAPASITE = 5

export function dolabaEkle(dolap, sise) {
  return [...dolap, sise].slice(-DOLAP_SAKLA)
}

// Raflar dolunca en eski raf bütünüyle kayar
export function gorunenSiseler(dolap) {
  const kapasite = RAF_SAYISI * RAF_KAPASITE
  if (dolap.length <= kapasite) return dolap
  const atla = Math.ceil((dolap.length - kapasite) / RAF_KAPASITE) * RAF_KAPASITE
  return dolap.slice(atla)
}

// Dolaptaki i. şişenin sol üst pikseli; şişe 3×4, aralarında 1 piksel; raf tahtaları y = 3, 8, 13
export function sisePikseli(lab, i) {
  const raf = Math.floor(i / RAF_KAPASITE)
  const sira = i % RAF_KAPASITE
  return { x: lab.dolapX + 1 + sira * 4, y: 4 + raf * 5 }
}

function gecerliSise(s) {
  return !!s && Number.isInteger(s.renk) && s.renk >= 0 && s.renk <= 0xffffff
    && Number.isInteger(s.parlak) && s.parlak >= 0 && s.parlak <= PARLAK_EN_COK
}

export function dolapOku(ham) {
  const siseler = Array.isArray(ham?.siseler) ? ham.siseler.filter(gecerliSise).slice(-DOLAP_SAKLA) : []
  const sayi = Number.isInteger(ham?.sayi) && ham.sayi >= siseler.length ? ham.sayi : siseler.length
  return { sayi, siseler }
}

export function dolapKaydi(sayi, siseler) {
  return { sayi, siseler: siseler.slice(-DOLAP_SAKLA) }
}
