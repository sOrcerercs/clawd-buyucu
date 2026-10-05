// Clawd Büyücü — sahne durumunu Raster hücrelerine çevirir. Saf; $ kullanmaz.
// Hücre iki dikey pikseldir: ▀ karakterinin ön rengi üst, arka rengi alt pikseli boyar.

import { RENK, SPRITE, beyazPalet } from './sprite.js'
import { DUNYA_YUK, YER, zar } from './fizik.js'
import { CLAWD_GEN, labYerlesimi, gorunenSiseler, sisePikseli, asaUcuX, dolabaEkle } from './lab.js'
import { alan } from './arazi.js'

export const VARSAYILAN = 0x01000000
const UST_YARIM = 0x2580
const ALT_YARIM = 0x2584
const BOSLUK = 0x20
const GORUNEN_CIRAK = 4
const SAHNE_ALTI = 16 // çimenin altı (yeraltı) bant kısalınca ilk kırpılan yer
const YENI_SISE_KARE = 33 // yeni konan şişe ~3 sn yanıp söner
export const BALON_SATIR = 8 // bundan kısa bantta balon sahnenin dışında yazılır

// Bant kısaysa önce yeraltı, sonra gökyüzü kırpılır; dönen değer görünen ilk dünya satırı
export function gorunurPencere(yuk) {
  return Math.max(0, Math.min(DUNYA_YUK, Math.max(SAHNE_ALTI, yuk)) - yuk)
}

// y değerleri dünya koordinatında; ust görünen ilk satır
function tuval(gen, yuk) {
  return { gen, yuk, ust: gorunurPencere(yuk), p: new Int32Array(gen * yuk).fill(-1) }
}

function nokta(t, x, y, renk) {
  const px = Math.round(x)
  const py = Math.round(y) - t.ust
  if (px < 0 || py < 0 || px >= t.gen || py >= t.yuk) return
  t.p[py * t.gen + px] = renk
}

function dikdortgen(t, x, y, gen, yuk, renk) {
  for (let j = 0; j < yuk; j++) for (let i = 0; i < gen; i++) nokta(t, x + i, y + j, renk)
}

function cizgi(t, x0, y0, x1, y1, renk) {
  const adim = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= adim; i++) nokta(t, x0 + ((x1 - x0) * i) / adim, y0 + ((y1 - y0) * i) / adim, renk)
}

function spriteCiz(t, sp, x, y, aynala = false, ozel = {}, donustur = null) {
  for (let j = 0; j < sp.yuk; j++) {
    const satir = sp.satirlar[j]
    for (let i = 0; i < sp.gen; i++) {
      const harf = satir[aynala ? sp.gen - 1 - i : i]
      if (harf === '.') continue
      const renk = ozel[harf] ?? sp.palet[harf]
      if (renk !== undefined) nokta(t, x + i, y + j, donustur ? donustur(renk) : renk)
    }
  }
}

// Sprite'ın boş komşu piksellerine ince bir hale çizer
function haleCiz(t, sp, x, y, renk) {
  const dolu = (i, j) => i >= 0 && j >= 0 && i < sp.gen && j < sp.yuk && sp.satirlar[j][i] !== '.'
  for (let j = -1; j <= sp.yuk; j++) {
    for (let i = -1; i <= sp.gen; i++) {
      if (dolu(i, j)) continue
      if (dolu(i - 1, j) || dolu(i + 1, j) || dolu(i, j - 1) || dolu(i, j + 1)) nokta(t, x + i, y + j, renk)
    }
  }
}

function karistir(renk, hedef, oran) {
  const kanal = (k) => Math.round(((renk >> k) & 255) * (1 - oran) + ((hedef >> k) & 255) * oran)
  return (kanal(16) << 16) | (kanal(8) << 8) | kanal(0)
}

export function acikla(renk, oran) {
  const ac = (kanal) => Math.round(kanal + (255 - kanal) * oran)
  return (ac((renk >> 16) & 255) << 16) | (ac((renk >> 8) & 255) << 8) | ac(renk & 255)
}

// ---- Arka plan ----
function zeminCiz(t, lab) {
  for (let x = 0; x < t.gen; x++) {
    const labda = x < lab.son
    if (labda) for (let y = 0; y < YER; y++) nokta(t, x, y, y % 4 === 3 ? RENK.duvarCizgi : RENK.duvar)
    for (let y = YER; y < DUNYA_YUK; y++) {
      const d = y - YER
      let renk
      if (labda) renk = (x + ((d >> 1) & 1) * 2) % 4 === 0 ? RENK.tuglaKoyu : RENK.tugla
      else if (d < 2) renk = zar(x, d + 1) < 0.3 ? RENK.cimKoyu : RENK.cim
      else if (d < 4) renk = zar(x, d + 7) < 0.3 ? RENK.toprakKoyu : RENK.toprak
      else {
        const z = zar(x, d + 13)
        renk = z < 0.04 ? RENK.siyah : z < 0.06 ? RENK.kure : z < 0.3 ? RENK.tasKoyu : RENK.tas
      }
      nokta(t, x, y, renk)
    }
  }
}

// ---- Lab ----
// Kullanılan eşya; dar bantta okuma ve web dolabın önünde yapılır
function aktifEsya(s, lab) {
  if (s.mod === 'oku') return lab.kursuX === null ? 'dolap' : 'kursu'
  if (s.mod === 'web') return lab.kureX === null ? 'dolap' : 'kure'
  if (s.mod === 'insa') return 'kazan'
  if (s.mod === 'dolap' || s.mod === 'bitti') return 'dolap'
  return null
}

function dolapCiz(t, s, lab, sonuk, hale) {
  const x0 = lab.dolapX
  const gen = lab.dolapGen
  const ahsap = (renk) => (sonuk ? karistir(renk, RENK.duvar, 0.45) : renk)
  if (hale) {
    for (let x = x0 - 1; x <= x0 + gen; x++) nokta(t, x, 2, RENK.hale)
    for (let y = 2; y <= 13; y++) {
      nokta(t, x0 - 1, y, RENK.hale)
      nokta(t, x0 + gen, y, RENK.hale)
    }
  }
  dikdortgen(t, x0, 3, gen, 11, RENK.duvarKoyu)
  for (const y of [3, 8, 13]) dikdortgen(t, x0, y, gen, 1, ahsap(RENK.tahta))
  dikdortgen(t, x0, 3, 1, 11, ahsap(RENK.tahtaKoyu))
  dikdortgen(t, x0 + gen - 1, 3, 1, 11, ahsap(RENK.tahtaKoyu))
  const siseler = gorunenSiseler(s.dolap)
  const yeniBas = siseler.length - Math.min(s.buTur, siseler.length)
  const yeniSayisi = siseler.length - yeniBas
  const yeniden = s.kare - s.sonSiseKare
  siseler.forEach((sise, i) => {
    const { x, y } = sisePikseli(lab, i)
    const son = i === siseler.length - 1
    // Bitti'de bu turun şişeleri sırayla parlar; yeni konan şişe ~3 sn yanıp söner
    const parliyor = s.mod === 'bitti' && i >= yeniBas && Math.floor(s.modKare / 3) % Math.max(1, yeniSayisi) === i - yeniBas
    const yanip = son && yeniden >= 0 && yeniden < YENI_SISE_KARE && yeniden % 4 < 2
    spriteCiz(t, SPRITE.sise, x, y, false, { L: parliyor || yanip ? RENK.beyaz : acikla(sise.renk, sise.parlak * 0.12) })
    if (sise.parlak >= 3 && (Math.floor(s.kare / 4) + i) % 4 === 0) nokta(t, x + 2, y + 1, RENK.beyaz)
    if (son) nokta(t, x + 1, y - 1, RENK.yildiz) // son eklenen şişenin yıldızı
  })
}

function labCiz(t, s, lab) {
  const aktif = aktifEsya(s, lab)
  const hale = s.kare % 6 < 3
  const sonukMu = (ad) => aktif !== null && aktif !== ad
  const sonuk = (renk) => karistir(renk, RENK.duvar, 0.45)
  const esya = (ad, sp, x, y, ozel) => {
    if (aktif === ad && hale) haleCiz(t, sp, x, y, RENK.hale)
    spriteCiz(t, sp, x, y, false, ozel, sonukMu(ad) ? sonuk : null)
  }
  dolapCiz(t, s, lab, sonukMu('dolap'), aktif === 'dolap' && hale)
  if (lab.kursuX !== null) esya('kursu', s.mod === 'oku' && s.kare % 12 < 6 ? SPRITE.kursu2 : SPRITE.kursu, lab.kursuX, YER - 7, {})
  if (lab.kureX !== null) {
    const ic = s.mod === 'web' ? [RENK.beyaz, RENK.kureIc, RENK.portalAcik][Math.floor(s.kare / 3) % 3] : RENK.kureIc
    esya('kure', SPRITE.kure, lab.kureX, YER - 7, { C: ic })
  }
  esya('kazan', SPRITE.kazan, lab.kazanX, YER - 6, { L: s.kazanRengi ?? RENK.iksir, F: s.kare % 4 < 2 ? RENK.alev : RENK.kivilcim })
}

// ---- Varlıklar ----
function canavarCiz(t, c) {
  const sp = SPRITE[c.tur]
  spriteCiz(t, sp, c.x, YER - sp.yuk - Math.round(c.zy), true, c.vurulma > 0 ? beyazPalet(sp) : {})
}

function cirakCiz(t, c) {
  if (c.durum === 'giris' && c.kare < 3) return
  const ust = YER - 4
  const ayna = c.yon < 0
  spriteCiz(t, SPRITE.cirak, c.x, ust, ayna)
  spriteCiz(t, Math.floor(c.x / 2) % 2 ? SPRITE.cirakAyakB : SPRITE.cirakAyakA, c.x, ust + 3, ayna)
  spriteCiz(t, SPRITE.cirakSapka, c.x, ust - 3, ayna, { R: c.renk })
  const asaX = ayna ? c.x - 1 : c.x + 5
  cizgi(t, asaX, ust - 1, asaX, ust + 3, RENK.asa)
  nokta(t, asaX, ust - 2, c.renk)
}

function clawdCiz(t, s) {
  if (s.isinlanma % 2 === 1) return // ışınlanırken yanıp söner
  const x = s.x
  const ust = YER - 6 - Math.round(s.zy)
  const ayna = s.yon < 0
  if (s.etki && s.kare % 4 < 2) {
    for (const [dx, dy] of [[-1, -1], [CLAWD_GEN, -1], [-1, 5], [CLAWD_GEN, 5]]) nokta(t, x + dx, ust + dy, s.etki.renk)
  }
  spriteCiz(t, SPRITE.clawd, x, ust, ayna)
  spriteCiz(t, Math.floor(x / 2) % 2 ? SPRITE.ayakB : SPRITE.ayakA, x, ust + 5, ayna)
  if (!s.sapka) spriteCiz(t, SPRITE.sapka, x - 1, ust - 4, ayna)
  if (s.tasinan) return siseTasi(t, s, x, ust, ayna)
  const asaX = asaUcuX(s)
  if (s.mod === 'insa') {
    const uc = asaX + s.yon * (3 + (Math.floor(s.kare / 3) % 4)) // kazanı karıştırır
    cizgi(t, asaX, ust + 3, uc, ust + 1, RENK.asa)
    nokta(t, uc, ust, RENK.portalAcik)
  } else {
    const kalkik = s.mod === 'bitti' || s.atesBekleme > 5
    const tepe = ust - (kalkik ? 3 : 1)
    cizgi(t, asaX, tepe + 1, asaX, ust + 5 - (kalkik ? 2 : 0), RENK.asa)
    nokta(t, asaX, tepe, s.kare % 16 < 8 ? RENK.portalAcik : RENK.kure)
  }
  if (s.mod === 'fitil' && s.modKare >= 4) {
    const kx = s.yon > 0 ? x + CLAWD_GEN + 1 : x - 2
    for (let y = ust - 1; y <= ust + 5; y++) nokta(t, kx, y, (y + s.kare) % 2 ? RENK.portalAcik : RENK.kure)
  }
}

// Clawd şişeyi önünde taşır (asası yok); dolapta elinden rafındaki yerine uçar
function siseTasi(t, s, x, ust, ayna) {
  const el = { x: ayna ? x - 1 : x + 5, y: ust + 1 }
  let konum = el
  if (s.mod === 'dolap' && s.modKare >= 1) {
    const lab = labYerlesimi(s.genislik)
    const yer = sisePikseli(lab, gorunenSiseler(dolabaEkle(s.dolap, s.tasinan)).length - 1)
    const oran = Math.min(1, s.modKare / 4)
    konum = { x: el.x + (yer.x - el.x) * oran, y: el.y + (yer.y - el.y) * oran }
  }
  spriteCiz(t, SPRITE.sise, konum.x, konum.y, false, { L: s.tasinan.renk })
}

function patlamaCiz(t, p) {
  const r = 2 + p.kare * 1.5
  for (let a = 0; a < 24; a++) {
    const aci = (a / 24) * Math.PI * 2
    nokta(t, p.x + Math.cos(aci) * r, p.y + Math.sin(aci) * r * 0.7, a % 2 ? RENK.alev : RENK.kivilcim)
    if (r > 3) nokta(t, p.x + Math.cos(aci) * (r - 1.5), p.y + Math.sin(aci) * (r - 1.5) * 0.7, RENK.beyaz)
  }
}

// ---- Hücreler ----
function pikselden(t) {
  const satir = t.yuk / 2
  const hucreler = new Uint32Array(t.gen * satir * 3)
  for (let r = 0; r < satir; r++) {
    for (let c = 0; c < t.gen; c++) {
      const ust = t.p[r * 2 * t.gen + c]
      const alt = t.p[(r * 2 + 1) * t.gen + c]
      const i = (r * t.gen + c) * 3
      if (ust < 0 && alt < 0) hucreler.set([BOSLUK, VARSAYILAN, VARSAYILAN], i)
      else if (ust < 0) hucreler.set([ALT_YARIM, alt, VARSAYILAN], i)
      else hucreler.set([UST_YARIM, ust, alt < 0 ? VARSAYILAN : alt], i)
    }
  }
  return hucreler
}

function balonYaz(hucreler, balon, merkez, sutun) {
  const harfler = Array.from(` ${balon} `).slice(0, sutun)
  const bas = Math.max(0, Math.min(sutun - harfler.length, merkez - Math.floor(harfler.length / 2)))
  harfler.forEach((harf, i) => hucreler.set([harf.codePointAt(0), RENK.balonYazi, RENK.balon], (bas + i) * 3))
}

export function sahneHucreleri(s, sutun, satir) {
  const t = tuval(sutun, satir * 2)
  const lab = labYerlesimi(s.genislik)
  zeminCiz(t, lab)
  for (const b of s.bloklar) if (!b.yok) spriteCiz(t, SPRITE[b.tip], b.x, YER - 4)
  labCiz(t, s, lab)
  if (s.ciraklar.some((c) => c.durum !== 'aktif')) spriteCiz(t, SPRITE.portal, alan(s.genislik).bas + 3, YER - 7, s.kare % 4 < 2)
  for (const e of s.esyalar) spriteCiz(t, SPRITE[e.tur], e.x, YER - SPRITE[e.tur].yuk)
  if (s.tnt) spriteCiz(t, SPRITE.tnt, s.tnt.x, YER - 4, false, s.tnt.kare % 6 < 3 ? beyazPalet(SPRITE.tnt) : {})
  for (const c of s.canavarlar) canavarCiz(t, c)
  if (s.creeper && !s.creeper.patladi) {
    spriteCiz(t, SPRITE.creeper, s.creeper.x, YER - 8, false, s.creeper.beyaz ? beyazPalet(SPRITE.creeper) : {})
  }
  for (const c of s.ciraklar.slice(0, GORUNEN_CIRAK)) cirakCiz(t, c)
  clawdCiz(t, s)
  if (s.sapka) spriteCiz(t, SPRITE.sapka, s.sapka.x - 1, YER - 4 - Math.round(s.sapka.zy))
  for (const m of s.mermiler) {
    nokta(t, m.x, m.y, RENK.portalAcik)
    nokta(t, m.x - Math.sign(m.vx), m.y, RENK.portal)
  }
  if (s.patlama) patlamaCiz(t, s.patlama)
  for (const p of s.parca) nokta(t, p.x, p.y, p.renk)
  const merkez = Math.round(s.x + CLAWD_GEN / 2)
  const balonVar = satir >= BALON_SATIR
  if (balonVar && merkez >= 0 && merkez < sutun) t.p[2 * sutun + merkez] = RENK.balon // balon kuyruğu
  const hucreler = pikselden(t)
  if (balonVar) balonYaz(hucreler, s.balon, merkez, sutun)
  return hucreler
}

export function base64(hucreler) {
  const baytlar = new Uint8Array(hucreler.buffer, hucreler.byteOffset, hucreler.byteLength)
  if (typeof baytlar.toBase64 === 'function') return baytlar.toBase64()
  let ikili = ''
  for (let i = 0; i < baytlar.length; i += 0x8000) ikili += String.fromCharCode(...baytlar.subarray(i, i + 0x8000))
  return btoa(ikili)
}
