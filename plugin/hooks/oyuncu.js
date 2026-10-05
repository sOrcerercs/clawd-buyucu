// Clawd Büyücü — oyuncu kontrolü: 1–5 tuşları ve iksir etkileri. Saf; $ kullanmaz.

import { yerde, mermiAt, parcaSac, YER } from './fizik.js'
import { CLAWD_GEN, asaUcuX } from './lab.js'
import { KONTROL_METNI, DOLAP_BOS, DUSUNUYOR } from './olay.js'

export const KONTROL_KARE = 55 // ~5 sn
export const ETKI_KARE = 60
const ADIM_KARE = 6
const ETKILER = ['hiz', 'ziplama', 'parlama']
const KILITLI = new Set(['fitil', 'creeper', 'dolap', 'bitti'])
const LAB_ISI = new Set(['oku', 'web', 'insa', 'git'])

export function oyuncuOlayi(s, komut) {
  if (KILITLI.has(s.mod)) return s
  const t = {
    ...s, oyuncu: KONTROL_KARE, hedef: null, dusunAt: null, balon: KONTROL_METNI, balonKare: s.kare,
    ...(LAB_ISI.has(s.mod) ? { mod: 'dusun', modKare: 0 } : {}),
  }
  if (komut === 'zipla') return yerde(t) ? { ...t, vy: t.etki?.tur === 'ziplama' ? 4.5 : 3 } : t
  if (komut === 'sol' || komut === 'sag') return { ...t, yon: komut === 'sol' ? -1 : 1, yuruKalan: ADIM_KARE }
  if (komut === 'buyu') {
    if (t.atesBekleme > 0) return t
    return { ...t, atesBekleme: 4, mermiler: mermiAt(t.mermiler, asaUcuX(t), YER - 6, t.yon, 'clawd') }
  }
  if (komut === 'iksir') return iksirIc(t)
  return t
}

function iksirIc(s) {
  const sise = s.dolap.at(-1)
  if (!sise) return { ...s, balon: DOLAP_BOS }
  const tur = ETKILER[s.iksirSayisi % ETKILER.length]
  return {
    ...s,
    dolap: s.dolap.slice(0, -1),
    iksirSayisi: Math.max(0, s.iksirSayisi - 1),
    etki: { tur, kalan: ETKI_KARE, renk: sise.renk },
    parca: parcaSac(s.parca, s.kare, s.x + 3, YER - 6, () => sise.renk, 10, 0.9),
  }
}

export function oyuncuAdim(s) {
  const oyuncu = Math.max(0, s.oyuncu - 1)
  let t = { ...s, oyuncu }
  if (s.yuruKalan > 0) {
    const hiz = s.etki?.tur === 'hiz' ? 2 : 1
    const x = Math.max(0, Math.min(s.genislik - CLAWD_GEN, s.x + s.yon * hiz))
    t = { ...t, x, yuruKalan: s.yuruKalan - 1 }
  }
  if (s.etki?.tur === 'parlama' && s.kare % 3 === 0) {
    t = { ...t, parca: parcaSac(t.parca, s.kare, t.x + 3, YER - 8, () => s.etki.renk, 2, 0.5) }
  }
  if (oyuncu === 0) t = { ...t, balon: DUSUNUYOR, balonKare: s.kare }
  return t
}
