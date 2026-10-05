// Clawd Büyücü — deterministik zar, yerçekimi, parçacıklar ve büyü mermileri. Saf; $ kullanmaz.
// Dünya 20 piksel yüksekliğinde; y aşağı doğru artar. zy ise yerden yükseklik (yukarı +).

export const DUNYA_YUK = 20
export const YER = 14
export const PARCA_SINIR = 120
export const MERMI_HIZ = 2.5
const YERCEKIMI = 0.5
const PARCA_YERCEKIMI = 0.25
const MERMI_SINIR = 12

export function zar(a, b) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be5ab, 0x85ebca77)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function yerCekimi(v) {
  if (v.zy <= 0 && v.vy <= 0) return v.zy === 0 && v.vy === 0 ? v : { ...v, zy: 0, vy: 0 }
  const vy = v.vy - YERCEKIMI
  const zy = Math.max(0, v.zy + vy)
  return { ...v, zy, vy: zy === 0 ? 0 : vy }
}

export function yerde(v) {
  return v.zy === 0
}

// Yukarı yarım daireye saçılan parçacıklar
export function parcaSac(parca, tohum, x, y, renkSec, adet, hiz) {
  const yeni = Array.from({ length: adet }, (_, i) => {
    const aci = Math.PI * (0.1 + 0.8 * zar(tohum, i * 3 + 1))
    const guc = hiz * (0.4 + 0.6 * zar(tohum, i * 3 + 2))
    return { x, y, vx: Math.cos(aci) * guc, vy: -Math.sin(aci) * guc, renk: renkSec(i), omur: 8 + Math.floor(zar(tohum, i * 3 + 3) * 10) }
  })
  return [...parca, ...yeni].slice(-PARCA_SINIR)
}

export function yukselen(parca, tohum, x, y, renk) {
  const yeni = { x, y, vx: (zar(tohum, 5) - 0.5) * 0.3, vy: -0.3, renk, omur: 10, hafif: true }
  return [...parca, yeni].slice(-PARCA_SINIR)
}

export function parcaAdim(parca) {
  const sonraki = []
  for (const p of parca) {
    if (p.omur <= 1) continue
    let vx = p.vx
    let vy = p.vy + (p.hafif ? 0 : PARCA_YERCEKIMI)
    let y = p.y + vy
    if (!p.hafif && y >= YER) {
      y = YER - 0.5
      vy = -vy * 0.3
      vx *= 0.6
    }
    sonraki.push({ ...p, x: p.x + vx, y, vx, vy, omur: p.omur - 1 })
  }
  return sonraki
}

export function mermiAt(mermiler, x, y, yon, sahip) {
  return [...mermiler, { x, y, vx: MERMI_HIZ * yon, sahip, omur: 40 }].slice(-MERMI_SINIR)
}

export function mermiAdim(mermiler, genislik) {
  return mermiler
    .filter((m) => m.omur > 1)
    .map((m) => ({ ...m, x: m.x + m.vx, omur: m.omur - 1 }))
    .filter((m) => m.x >= -2 && m.x <= genislik + 2)
}
