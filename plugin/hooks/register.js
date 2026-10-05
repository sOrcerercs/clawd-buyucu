// Clawd Büyücü — Claude çalışırken istemin üstündeki bantta büyücü Clawd sahnesi.
// $ kullanan tek dosya; sahne, çizim, olay ve lab modülleri saftır.

import { yeniSahne, adim, olayUygula } from './sahne.js'
import { sahneHucreleri, base64, BALON_SATIR } from './cizim.js'
import { eylemOku } from './olay.js'
import { dolapOku, dolapKaydi } from './lab.js'

const KARE_MS = 90 // ~11 fps
const SATIR = 10 // 10 satır = 20 piksel
const EN_AZ_SATIR = 5 // bundan kısa bantta sahne yerine tek satır metin
const KAPANIS_MS = 2000
const ANAHTAR = 'sahne'
const ACIK_ANAHTARI = 'acik'
const DOLAP_ANAHTARI = 'dolap'

const DUGMELER = [
  { hotkey: '1', label: 'zıpla', komut: 'zipla' },
  { hotkey: '2', label: '←', komut: 'sol' },
  { hotkey: '3', label: '→', komut: 'sag' },
  { hotkey: '4', label: 'büyü', komut: 'buyu' },
  { hotkey: '5', label: 'iksir', komut: 'iksir' },
]

let acik = true
let gorunur = false
let sahne = yeniSahne()
let bant = null // { requestId, sutun, satir }
let saat = null
let kapanis = null
let ciziliyor = false
let kaydediliyor = false
let kayitliSayi = 0
let kayitliUzunluk = 0
let sonEk = ''
let sonBalon = ''

function olayEkle(olay) {
  sahne = olayUygula(sahne, olay)
}

function sayacEki() {
  return sahne.iksirSayisi || sahne.malzeme ? ` · ⚗ ${sahne.iksirSayisi} iksir · ✦ ${sahne.malzeme}` : ''
}

function ozet() {
  return `🧙 Clawd: ${sahne.balon} · ⚗ ${sahne.iksirSayisi}`
}

// Son yazan kazanır: aynı anda iki oturum iksir eklerse biri kaybolabilir
async function dolabiKaydet($) {
  if (kaydediliyor || (sahne.iksirSayisi === kayitliSayi && sahne.dolap.length === kayitliUzunluk)) return
  kaydediliyor = true
  const sayi = sahne.iksirSayisi
  const siseler = sahne.dolap
  try {
    await $.store.set(DOLAP_ANAHTARI, dolapKaydi(sayi, siseler))
    kayitliSayi = sayi
    kayitliUzunluk = siseler.length
  } catch {
    // bir sonraki karede yeniden denenir
  } finally {
    kaydediliyor = false
  }
}

async function kareCiz($) {
  sahne = adim(sahne)
  dolabiKaydet($)
  const ek = sayacEki()
  // Kısa bantta balon düğme satırında yazı olarak durur; değişince bant yeniden çizilir
  const balonDegisti = bant && bant.satir < BALON_SATIR && sahne.balon !== sonBalon
  if (ek !== sonEk || balonDegisti) {
    sonEk = ek
    sonBalon = sahne.balon
    $.ui.invalidate('ui.render')
  }
  if (!bant || ciziliyor) return
  ciziliyor = true
  try {
    const cells = base64(sahneHucreleri(sahne, bant.sutun, bant.satir))
    const r = await $.ui.blit({ requestId: bant.requestId, key: ANAHTAR, columns: bant.sutun, rows: bant.satir, cells })
    if (r?.deny) $.ui.invalidate('ui.render')
  } catch {
    $.ui.invalidate('ui.render')
  } finally {
    ciziliyor = false
  }
}

function baslat($) {
  kapanis?.cancel()
  kapanis = null
  gorunur = true
  olayEkle({ tip: 'basla' })
  if (!saat) saat = $.clock.every(KARE_MS, () => kareCiz($))
  $.ui.invalidate('ui.render')
}

function gizle($) {
  saat?.cancel()
  kapanis?.cancel()
  saat = null
  kapanis = null
  gorunur = false
  bant = null
  $.ui.invalidate('ui.render')
}

function aracBitti(e, sonuc) {
  const { tur, uzanti } = eylemOku(e)
  if (sonuc?.deny) olayEkle({ tip: 'iptal', tur })
  else if (sonuc?.isError) olayEkle({ tip: 'hata', tur })
  else olayEkle({ tip: 'eylemBitti', tur, uzanti })
}

function bantCiz($, e) {
  const { Box, Text, Raster, Button } = $.ui.resolve(e)
  if (e.surface !== 'terminal') return Text({ wrap: 'truncate', children: [ozet()] })
  const sutun = Math.max(20, Math.min(512, e.props.bodyColumns || 80))
  // Bir satır düğmelere kalır; Raster bandın sınırını aşmaz
  const satir = Math.min(SATIR, (e.props.maxRows || SATIR + 1) - 1)
  if (satir < EN_AZ_SATIR) {
    bant = null
    return Text({ wrap: 'truncate', children: [ozet()] })
  }
  bant = { requestId: e.requestId, sutun, satir }
  olayEkle({ tip: 'boyut', genislik: sutun })
  const cells = base64(sahneHucreleri(sahne, sutun, satir))
  const dugmeler = DUGMELER.map((d) => Button({
    key: `oyna-${d.komut}`, hotkey: d.hotkey, label: d.label, plain: true, dimColor: true,
    onPress: () => olayEkle({ tip: 'oyuncu', komut: d.komut }),
  }))
  // Raster bandın doğrudan çocuğu: blit onu anahtarıyla bulur
  return Box({
    flexDirection: 'column',
    children: [
      Raster({ key: ANAHTAR, columns: sutun, rows: satir, cells }),
      Box({ flexDirection: 'row', columnGap: 2, children: satir < BALON_SATIR ? [...dugmeler, Text({ wrap: 'truncate', children: [`· ${sahne.balon}`] })] : dugmeler }),
    ],
  })
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    let kayitliAcik
    let kayitliDolap
    try {
      kayitliAcik = await $.store.get(ACIK_ANAHTARI)
      kayitliDolap = await $.store.get(DOLAP_ANAHTARI)
    } catch {
      // store okunamazsa mod açık, dolap boş başlar
    }
    acik = kayitliAcik !== false
    const dolap = dolapOku(kayitliDolap)
    olayEkle({ tip: 'dolapYukle', sayi: dolap.sayi, siseler: dolap.siseler })
    kayitliSayi = dolap.sayi
    kayitliUzunluk = dolap.siseler.length
    await $.command.register({ name: 'buyucu', description: 'Clawd Büyücü bandını aç/kapat', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'buyucu' }, async ($) => {
    acik = !acik
    await $.store.set(ACIK_ANAHTARI, acik)
    if (!acik) gizle($)
    return { text: acik ? 'Clawd Büyücü açık: Claude çalışırken kazanı karıştırır.' : 'Clawd Büyücü kapalı.' }
  })

  on('turn.start', async ($, e, next) => {
    if (acik && !e.agentId) baslat($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId || !gorunur) return next(e)
    olayEkle({ tip: 'bitti' })
    kapanis?.cancel()
    kapanis = $.clock.after(KAPANIS_MS, () => gizle($))
    return next(e)
  })

  // Araç başlangıcı ve sonu tek gözlemcide: next'i beklemek saati durdurmaz ve hook süresine sayılmaz.
  // Reddedilen çağrı { deny } (iptal), başarısız çağrı isError (creeper) ile döner.
  on('tool.call', async ($, e, next) => {
    if (gorunur) olayEkle({ tip: 'eylem', ...eylemOku(e) })
    const sonuc = await next(e)
    if (gorunur) aracBitti(e, sonuc)
    return sonuc
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!acik || !gorunur) return next(e)
    return bantCiz($, e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const ek = sayacEki()
    if (!gorunur || !ek) return next(e)
    return next({ ...e, props: { ...e.props, suffix: `${e.props.suffix || ''}${ek}` } })
  })
}
