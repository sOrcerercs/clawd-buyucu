// Clawd Büyücü — sahne simülasyonu. Saf: olayUygula(durum, olay) ve adim(durum) yeni durum döndürür; $ kullanmaz.

import { yerCekimi, parcaSac, yukselen, parcaAdim, mermiAt, mermiAdim, YER } from './fizik.js'
import { CLAWD_GEN, labYerlesimi, durak, asaUcuX, siseRengi, yeniSise, dolabaEkle } from './lab.js'
import { araziUret, alan, bitkiYenile, bloklarYenile, BLOK_GEN } from './arazi.js'
import { CANAVAR, canavarDogur, canavarAdim, vurusKontrol, dusur, enYakin, topla } from './canavar.js'
import { oyuncuOlayi, oyuncuAdim } from './oyuncu.js'
import { DUSUNUYOR, HATA_METNI, bittiMetni } from './olay.js'
import { RENK } from './sprite.js'

export const BALON_EN_AZ = 22 // balon en az ~2 sn kalsın: Read gibi araçlar milisaniyede biter
export const ISINLANMA_ESIK = 32 // 8 bloktan uzaksa laba ışınlanır
export const FITIL_EN_AZ = 10
export const CREEPER_SURE = 36
const ATES_ARALIK = 8
const CIRAK_ATES = 10
const MENZIL = 36
const KUYRUK_SINIR = 8
const ESYA_SINIR = 30
const PORTAL_PAY = 4
const PATLAMA_YARICAP = 14
const BLOK_YENILENME = 150
const MERMI_Y = YER - 6
const CIRAK_RENKLERI = [0x3fa34d, 0x3b6fd1, 0xc9473b, 0xd1a23b]
const HAVAI = [RENK.yildiz, RENK.portalAcik, RENK.kure, RENK.tnt, RENK.cim]
const BLOK_PARCA = { tas: [RENK.tas, RENK.tasKoyu], kutuk: [RENK.tahta, RENK.tahtaKoyu], yaprak: [RENK.cim, RENK.cimKoyu] }
const LAB_MODLARI = new Set(['oku', 'web', 'insa'])
const OYNANIR = new Set(['dusun', 'oku', 'web', 'insa', 'git'])
const KUYRUKLANAN = new Set(['eylem', 'eylemBitti', 'hata', 'iptal'])

export function yeniSahne(genislik = 120, tohum = 7) {
  const { bloklar, esyalar } = araziUret(genislik, tohum)
  return {
    kare: 0, mod: 'dusun', modKare: 0, genislik, tohum,
    x: labYerlesimi(genislik).son + 1, zy: 0, vy: 0, yon: 1,
    hedef: null, isinlanma: 0,
    balon: DUSUNUYOR, balonKare: 0, dusunAt: null,
    tasinan: null, dolap: [], iksirSayisi: 0, buTur: 0, sonSiseKare: -1000,
    malzeme: 0, bekleyen: 0, kazanRengi: null,
    canavarlar: [], mermiler: [], parca: [], esyalar, bloklar,
    ciraklar: [], sonrakiId: 1, atesBekleme: 0,
    tnt: null, patlama: null, creeper: null, sapka: null, kuyruk: [],
    oyuncu: 0, yuruKalan: 0, etki: null,
  }
}

// ---- Olaylar ----
export function olayUygula(s, olay) {
  if (olay.tip === 'basla') return basla(s)
  if (olay.tip === 'boyut') return boyutla(s, olay.genislik)
  if (olay.tip === 'dolapYukle') return { ...s, dolap: olay.siseler, iksirSayisi: olay.sayi }
  if (olay.tip === 'bitti') return bitir(s)
  if (s.mod === 'bitti') return s
  if (olay.tip === 'oyuncu') return oyuncuOlayi(s, olay.komut)
  if (s.creeper && KUYRUKLANAN.has(olay.tip)) return { ...s, kuyruk: [...s.kuyruk, olay].slice(-KUYRUK_SINIR) }
  if (olay.tip === 'eylem') return eylemBaslat(dolabaBirak(s), olay)
  if (olay.tip === 'eylemBitti') return eylemBitir(s, olay)
  if (olay.tip === 'hata') return hataBaslat(s, olay)
  if (olay.tip === 'iptal') return iptalEt(s, olay)
  return s
}

function basla(s) {
  if (s.mod !== 'bitti') return { ...s, buTur: 0 }
  return { ...s, buTur: 0, mod: 'dusun', modKare: 0, balon: DUSUNUYOR, balonKare: s.kare, dusunAt: null }
}

function eylemBaslat(s, { tur, metin, uzanti }) {
  const t = { ...s, balon: metin, balonKare: s.kare, dusunAt: null }
  if (tur === 'oku' || tur === 'web') return labaGit(t, tur)
  if (tur === 'insa') return labaGit({ ...t, kazanRengi: siseRengi(uzanti) }, 'insa')
  if (tur === 'tnt') return tntKur(t)
  if (tur === 'ajan') return cirakEkle(t)
  return t
}

function eylemBitir(s, { tur, uzanti }) {
  const t = { ...s, dusunAt: s.balonKare + BALON_EN_AZ }
  if (tur === 'insa') return siseDoldur(t, uzanti)
  if (tur === 'tnt') return tntBitti(t)
  if (tur === 'ajan') return cirakGonder(t)
  return t
}

// Reddedilen araç: ürün yok, ceza yok; TNT patlamadan söner, çırak geri döner
function iptalEt(s, { tur }) {
  const t = { ...s, dusunAt: s.balonKare + BALON_EN_AZ }
  if (tur === 'insa') return { ...t, kazanRengi: null }
  if (tur === 'ajan') return cirakGonder(t)
  if (tur !== 'tnt' || !t.tnt) return t
  const fitilde = t.mod === 'fitil'
  return {
    ...t, tnt: null, parca: parcaSac(t.parca, t.kare, t.tnt.x + 2, YER - 4, () => RENK.duman, 6, 0.5),
    mod: fitilde ? 'dusun' : t.mod, modKare: fitilde ? 0 : t.modKare,
  }
}

// ---- Lab ----
function labaGit(s, tur) {
  const d = durak(labYerlesimi(s.genislik), tur)
  const t = { ...s, oyuncu: 0, yuruKalan: 0, hedef: null }
  if (Math.abs(s.x - d.x) > ISINLANMA_ESIK) return isinla({ ...t, yon: d.yon }, d.x, tur)
  if (s.x === d.x) return { ...t, mod: tur, modKare: 0, yon: d.yon }
  return { ...t, mod: 'git', modKare: 0, hedef: { x: d.x, yon: d.yon, mod: tur } }
}

function isinla(s, x, mod) {
  const mor = (i) => (i % 2 ? RENK.portal : RENK.portalAcik)
  const cikis = parcaSac(s.parca, s.kare + 1, s.x + 3, YER - 4, mor, 8, 1.2)
  const varis = parcaSac(cikis, s.kare + 2, x + 3, YER - 4, mor, 8, 1.2)
  return { ...s, x, zy: 0, vy: 0, mod, modKare: 0, hedef: null, isinlanma: 6, parca: varis }
}

function dolabaBirak(s) {
  if (!s.tasinan) return s
  return { ...s, tasinan: null, dolap: dolabaEkle(s.dolap, s.tasinan), iksirSayisi: s.iksirSayisi + 1, buTur: s.buTur + 1, sonSiseKare: s.kare }
}

function siseDoldur(s, uzanti) {
  const t = { ...dolabaBirak(s), bekleyen: 0, kazanRengi: null }
  const sise = yeniSise(uzanti, s.bekleyen)
  const lab = labYerlesimi(s.genislik)
  const parca = parcaSac(t.parca, t.kare, lab.kazanX + 4, YER - 5, () => sise.renk, 5, 0.7)
  return labaGit({ ...t, tasinan: sise, parca }, 'dolap')
}

// ---- TNT ----
function tntKur(s) {
  if (s.tnt) return s
  const { bas, son } = alan(s.genislik)
  const istenen = s.yon > 0 ? s.x + CLAWD_GEN + 6 : s.x - 10
  const x = Math.max(bas + 1, Math.min(son - 4, istenen))
  return { ...s, mod: 'fitil', modKare: 0, oyuncu: 0, yuruKalan: 0, hedef: null, yon: x >= s.x ? 1 : -1, tnt: { x, kare: 0, patlaAt: null } }
}

function tntBitti(s) {
  if (!s.tnt) return s
  // Kısa komutta fitil en az FITIL_EN_AZ kare yanar; patlama TNT'nin kendi saatine bağlı, moda değil
  if (s.tnt.kare < FITIL_EN_AZ) return { ...s, tnt: { ...s.tnt, patlaAt: FITIL_EN_AZ } }
  return patlat(s)
}

function patlat(s) {
  const cx = s.tnt.x + 2
  const cy = YER - 2
  const sicak = [RENK.beyaz, RENK.kivilcim, RENK.alev, RENK.tnt, RENK.duman]
  let parca = parcaSac(s.parca, s.kare, cx, cy, (i) => sicak[i % sicak.length], 24, 1.8)
  const yakin = (merkez) => Math.abs(merkez - cx) <= PATLAMA_YARICAP
  const kirilan = s.bloklar.filter((b) => !b.yok && yakin(b.x + BLOK_GEN / 2))
  for (const b of kirilan) parca = parcaSac(parca, s.kare + b.x, b.x + 2, YER - 2, (i) => BLOK_PARCA[b.tip][i % 2], 5, 1.2)
  const olenler = s.canavarlar.filter((c) => yakin(c.x + CANAVAR[c.tur].gen / 2))
  const fitilde = s.mod === 'fitil'
  return {
    ...s, tnt: null, patlama: { x: cx, y: cy, kare: 0 }, parca,
    bloklar: s.bloklar.map((b) => (kirilan.includes(b) ? { ...b, yok: s.kare + BLOK_YENILENME } : b)),
    canavarlar: s.canavarlar.filter((c) => !olenler.includes(c)),
    esyalar: [...s.esyalar, ...dusur(olenler)].slice(-ESYA_SINIR),
    mod: fitilde ? 'dusun' : s.mod, modKare: fitilde ? 0 : s.modKare,
  }
}

// ---- Çıraklar ----
function portalX(s) {
  return alan(s.genislik).bas + PORTAL_PAY
}

function cirakEkle(s) {
  const renk = CIRAK_RENKLERI[(s.sonrakiId - 1) % CIRAK_RENKLERI.length]
  const cirak = { id: s.sonrakiId, x: portalX(s), renk, durum: 'giris', kare: 0, atesBekleme: 0, yon: 1 }
  return { ...s, ciraklar: [...s.ciraklar, cirak], sonrakiId: s.sonrakiId + 1 }
}

function cirakGonder(s) {
  const i = s.ciraklar.findIndex((c) => c.durum !== 'cikis')
  if (i === -1) return s
  return { ...s, ciraklar: s.ciraklar.map((c, j) => (j === i ? { ...c, durum: 'cikis', kare: 0 } : c)) }
}

// ---- Hata ve creeper ----
function hataBaslat(s, { tur }) {
  let t = dolabaBirak(s.tnt ? patlat(s) : s)
  if (tur === 'ajan') t = cirakGonder(t)
  const sag = t.x + CLAWD_GEN + 16
  const cx = sag <= t.genislik - 6 ? sag : Math.max(0, t.x - 21)
  return {
    ...t, mod: 'creeper', modKare: 0, hedef: null, oyuncu: 0, yuruKalan: 0, zy: 0, vy: 0, kazanRengi: null,
    yon: cx >= t.x ? 1 : -1, balon: HATA_METNI, balonKare: t.kare, dusunAt: null,
    creeper: { x: cx, beyaz: false, patladi: false },
  }
}

function kuyruguIsle(s) {
  return s.kuyruk.reduce((t, olay) => olayUygula(t, olay), { ...s, kuyruk: [] })
}

// ---- Bitti ----
function bitir(s) {
  const t = dolabaBirak(s.tnt ? patlat(s) : s)
  const d = durak(labYerlesimi(t.genislik), 'dolap')
  const yerde = t.x === d.x ? t : isinla(t, d.x, 'bitti')
  return {
    ...yerde, mod: 'bitti', modKare: 0, yon: 1, hedef: null, creeper: null, sapka: null, kuyruk: [],
    // Tur bitince ön plandaki ajanlar da bitmiştir; Post'u gelmeyen çırak kalmasın
    ciraklar: yerde.ciraklar.map((c) => (c.durum === 'cikis' ? c : { ...c, durum: 'cikis', kare: 0 })),
    oyuncu: 0, yuruKalan: 0, zy: 0, vy: 0, kazanRengi: null,
    balon: bittiMetni(yerde.buTur), balonKare: yerde.kare, dusunAt: null,
  }
}

// ---- Boyut ----
function boyutla(s, genislik) {
  if (!Number.isFinite(genislik) || genislik === s.genislik) return s
  const lab = labYerlesimi(genislik)
  const { bloklar, esyalar } = araziUret(genislik, s.tohum)
  const { bas, son } = alan(genislik)
  const enSag = Math.max(0, genislik - CLAWD_GEN - 1)
  const durakModu = LAB_MODLARI.has(s.mod) || s.mod === 'dolap' || s.mod === 'bitti'
  return {
    ...s, genislik, bloklar, esyalar,
    x: durakModu ? durak(lab, s.mod === 'bitti' ? 'dolap' : s.mod).x : Math.min(s.x, enSag),
    hedef: s.hedef && { ...durak(lab, s.hedef.mod), mod: s.hedef.mod },
    canavarlar: s.canavarlar.filter((c) => c.x >= bas && c.x <= genislik - 2),
    tnt: s.tnt && { ...s.tnt, x: Math.max(bas + 1, Math.min(son - 4, s.tnt.x)) },
    ciraklar: s.ciraklar.map((c) => ({ ...c, x: Math.min(c.x, enSag) })),
    creeper: s.creeper && { ...s.creeper, x: Math.min(s.creeper.x, genislik - 6) },
  }
}

// ---- Kare adımları ----
function dusunAdim(s) {
  const { bas, son } = alan(s.genislik)
  const enSag = Math.max(bas, son - CLAWD_GEN)
  const yeni = canavarDogur(s.canavarlar, s.genislik, s.kare, s.tohum)
  const t = yeni ? { ...s, canavarlar: [...s.canavarlar, yeni] } : s
  if (t.x < bas) return { ...t, yon: 1, x: t.x + 1 }
  const hedef = enYakin(t.canavarlar, t.x + CLAWD_GEN / 2)
  if (hedef && hedef.mesafe <= MENZIL) {
    const yon = hedef.fark >= 0 ? 1 : -1
    if (t.atesBekleme > 0) return { ...t, yon }
    return { ...t, yon, atesBekleme: ATES_ARALIK, mermiler: mermiAt(t.mermiler, asaUcuX({ ...t, yon }), MERMI_Y, yon, 'clawd') }
  }
  if (enSag <= bas) return t
  const yon = t.x >= enSag ? -1 : t.x <= bas ? 1 : t.yon
  return { ...t, yon, x: t.x + yon }
}

function gitAdim(s) {
  const h = s.hedef
  if (!h) return { ...s, mod: 'dusun', modKare: 0 }
  if (s.x === h.x) return { ...s, mod: h.mod, modKare: 0, yon: h.yon, hedef: null }
  const yon = Math.sign(h.x - s.x)
  return { ...s, yon, x: s.x + yon }
}

function okuAdim(s) {
  if (s.modKare % 4 !== 0) return s
  const lab = labYerlesimi(s.genislik)
  // Dar bantta kürsü yok: dolaptaki tariflere bakar
  const [x, y] = lab.kursuX === null ? [lab.dolapX + 10, YER - 9] : [lab.kursuX + 3, YER - 9]
  return { ...s, parca: yukselen(s.parca, s.kare, x, y, RENK.sayfa) }
}

function insaAdim(s) {
  const aralik = s.ciraklar.some((c) => c.durum === 'aktif') ? 3 : 5
  if (s.modKare % aralik !== 0) return s
  const lab = labYerlesimi(s.genislik)
  const renk = s.modKare % (aralik * 2) === 0 ? RENK.buhar : (s.kazanRengi ?? RENK.iksir)
  return { ...s, parca: yukselen(s.parca, s.kare, lab.kazanX + 3 + (s.kare % 5), YER - 6, renk) }
}

function dolapAdim(s) {
  if (s.modKare === 4 && s.tasinan) {
    const lab = labYerlesimi(s.genislik)
    const t = dolabaBirak(s)
    return { ...t, parca: parcaSac(t.parca, t.kare, lab.dolapX + 10, 7, () => RENK.yildiz, 6, 0.6) }
  }
  if (s.modKare >= 8) return { ...s, mod: 'dusun', modKare: 0 }
  return s
}

function fitilAdim(s) {
  if (!s.tnt) return { ...s, mod: 'dusun', modKare: 0 }
  if (s.modKare === 1) return { ...s, parca: parcaSac(s.parca, s.kare, asaUcuX(s), YER - 7, () => RENK.kivilcim, 4, 0.8) }
  if (s.modKare === 2) return { ...s, parca: parcaSac(s.parca, s.kare, s.tnt.x + 2, YER - 4, () => RENK.kivilcim, 6, 1) }
  const uzaklik = Math.abs(s.x + CLAWD_GEN / 2 - (s.tnt.x + 2))
  if (s.modKare <= 6 && uzaklik < 14) {
    const kac = s.tnt.x >= s.x ? -1 : 1
    return { ...s, x: Math.max(0, Math.min(s.genislik - CLAWD_GEN, s.x + kac)) }
  }
  return s
}

function creeperAdim(s) {
  const c = s.creeper
  if (!c) return { ...s, mod: 'dusun', modKare: 0 }
  const k = s.modKare
  if (k >= CREEPER_SURE) {
    return kuyruguIsle({ ...s, mod: 'dusun', modKare: 0, creeper: null, sapka: null, balon: DUSUNUYOR, balonKare: s.kare })
  }
  if (c.patladi) return s
  const yon = c.x >= s.x ? 1 : -1
  if (k < 12) {
    const yakin = Math.abs(c.x - s.x) <= CLAWD_GEN + 3
    return { ...s, yon, creeper: yakin ? c : { ...c, x: c.x - yon * 0.8 } }
  }
  // Asa "fıs" eder: büyü çıkmaz, gri duman
  if (k === 12) return { ...s, yon, parca: parcaSac(s.parca, s.kare, asaUcuX({ ...s, yon }), YER - 8, () => RENK.duman, 6, 0.5) }
  if (k < 18) return { ...s, yon, creeper: { ...c, beyaz: k % 2 === 0 } }
  const yesil = (i) => (i % 2 ? RENK.creeper : RENK.creeperKoyu)
  return {
    ...s, yon, vy: 2.5,
    x: Math.max(0, Math.min(s.genislik - CLAWD_GEN, s.x - yon * 6)),
    parca: parcaSac(s.parca, s.kare, c.x + 2, YER - 4, yesil, 16, 1.5),
    patlama: { x: c.x + 2, y: YER - 3, kare: 0 },
    creeper: { ...c, patladi: true, beyaz: false },
    sapka: { x: s.x, zy: 6, vx: -yon * 0.5, vy: 2.2 },
  }
}

function bittiAdim(s) {
  if (s.modKare % 3 !== 1 || s.modKare > 19) return s
  return { ...s, parca: parcaSac(s.parca, s.kare, asaUcuX(s), YER - 11, (i) => HAVAI[(i + s.modKare) % HAVAI.length], 7, 1.6) }
}

const MOD_ADIMI = {
  dusun: dusunAdim, git: gitAdim, oku: okuAdim, web: (s) => s, insa: insaAdim,
  dolap: dolapAdim, fitil: fitilAdim, creeper: creeperAdim, bitti: bittiAdim,
}

function canavarlarAdim(s) {
  const durgun = s.mod !== 'dusun' && s.oyuncu === 0
  const { bas } = alan(s.genislik)
  const merkez = s.x + CLAWD_GEN / 2
  const yurumus = s.canavarlar.map((c) => {
    const k = canavarAdim(c, merkez, durgun)
    return k.x < bas ? { ...k, x: bas } : k
  })
  const { canavarlar, mermiler, olenler } = vurusKontrol(yurumus, s.mermiler)
  if (olenler.length === 0) return { ...s, canavarlar, mermiler }
  const parca = olenler.reduce((p, c) => parcaSac(p, s.kare + Math.round(c.x), c.x + 2, YER - 3, () => RENK.duman, 6, 0.8), s.parca)
  return { ...s, canavarlar, mermiler, parca, esyalar: [...s.esyalar, ...dusur(olenler)].slice(-ESYA_SINIR) }
}

function cirakAdim(c, s, sira) {
  const kare = c.kare + 1
  if (c.durum === 'giris') return { ...c, kare, durum: kare >= 6 ? 'aktif' : 'giris' }
  if (c.durum === 'cikis') {
    const px = portalX(s)
    if (Math.abs(c.x - px) > 1) {
      const yon = Math.sign(px - c.x)
      return { ...c, kare: 0, yon, x: c.x + yon * 1.5 }
    }
    return kare >= 4 ? null : { ...c, kare }
  }
  const fark = s.x - s.yon * (8 + sira * 6) - c.x
  const x = Math.abs(fark) < 1 ? c.x : c.x + Math.sign(fark) * 1.2
  return { ...c, kare, yon: s.yon, x: Math.max(0, Math.min(s.genislik - 5, x)), atesBekleme: Math.max(0, c.atesBekleme - 1) }
}

function ciraklarAdim(s) {
  let mermiler = s.mermiler
  let sira = 0
  const ciraklar = []
  for (const c of s.ciraklar) {
    let k = cirakAdim(c, s, c.durum === 'aktif' ? sira++ : 0)
    if (!k) continue
    if (k.durum === 'aktif' && s.mod === 'dusun' && k.atesBekleme === 0) {
      const h = enYakin(s.canavarlar, k.x + 2)
      if (h && h.mesafe <= MENZIL) {
        const yon = h.fark >= 0 ? 1 : -1
        mermiler = mermiAt(mermiler, k.x + (yon > 0 ? 5 : -1), YER - 4, yon, 'cirak')
        k = { ...k, yon, atesBekleme: CIRAK_ATES }
      }
    }
    ciraklar.push(k)
  }
  return { ...s, ciraklar, mermiler }
}

// Şapka Clawd yere indikten sonra başına konar
function sapkaAdim(s) {
  if (!s.sapka) return s
  const h = s.sapka
  const vy = h.vy - 0.35
  const zy = h.zy + vy
  if (vy < 0 && s.zy === 0 && zy <= 6) return { ...s, sapka: null }
  return { ...s, sapka: { ...h, x: h.x + h.vx + (s.x - h.x) * 0.1, zy, vy } }
}

// Taşınan şişenin arkasından parıltı düşer
function siseParilti(s) {
  if (!s.tasinan || s.kare % 3 !== 0) return s
  const x = s.yon > 0 ? s.x + 6 : s.x
  return { ...s, parca: yukselen(s.parca, s.kare, x, YER - 6, RENK.yildiz) }
}

function esyaTopla(s) {
  if (s.zy > 0) return s
  const { esyalar, toplanan } = topla(s.esyalar, s.x, CLAWD_GEN)
  if (toplanan === 0) return s
  return {
    ...s, esyalar, malzeme: s.malzeme + toplanan, bekleyen: s.bekleyen + toplanan,
    parca: parcaSac(s.parca, s.kare, s.x + 3, YER - 3, () => RENK.yildiz, 4, 0.5),
  }
}

function balonZamani(s) {
  if (s.dusunAt === null || s.kare < s.dusunAt || s.oyuncu > 0 || s.tasinan) return s
  if (!OYNANIR.has(s.mod)) return s
  const geriDon = s.mod === 'dusun' ? {} : { mod: 'dusun', modKare: 0, hedef: null }
  return { ...s, ...geriDon, dusunAt: null, balon: DUSUNUYOR, balonKare: s.kare }
}

export function adim(s) {
  const kare = s.kare + 1
  const temel = {
    ...s, kare, modKare: s.modKare + 1,
    parca: parcaAdim(s.parca), mermiler: mermiAdim(s.mermiler, s.genislik),
    atesBekleme: Math.max(0, s.atesBekleme - 1), isinlanma: Math.max(0, s.isinlanma - 1),
    patlama: s.patlama && s.patlama.kare < 6 ? { ...s.patlama, kare: s.patlama.kare + 1 } : null,
    tnt: s.tnt && { ...s.tnt, kare: s.tnt.kare + 1 },
    etki: s.etki && s.etki.kalan > 1 ? { ...s.etki, kalan: s.etki.kalan - 1 } : null,
    esyalar: bitkiYenile(s.esyalar, s.genislik, kare, s.tohum).slice(-ESYA_SINIR),
    bloklar: bloklarYenile(s.bloklar, kare),
  }
  const hazir = temel.tnt && temel.tnt.patlaAt !== null && temel.tnt.kare >= temel.tnt.patlaAt ? patlat(temel) : temel
  const oynuyor = hazir.oyuncu > 0 && OYNANIR.has(hazir.mod)
  let t = oynuyor ? oyuncuAdim(hazir) : (MOD_ADIMI[hazir.mod] ?? dusunAdim)(hazir)
  t = ciraklarAdim(canavarlarAdim(t))
  t = siseParilti(sapkaAdim(yerCekimi(t)))
  if (t.mod === 'dusun') t = esyaTopla(t)
  return balonZamani(t)
}
