import { expect, test } from 'claude-code/testing'
import { yeniSahne, olayUygula, adim, BALON_EN_AZ } from '../hooks/sahne.js'

const ilerle = (s: any, n: number) => { for (let i = 0; i < n; i++) s = adim(s); return s }
const eylem = (tur: string, metin = 'iş', uzanti?: string) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur: string, uzanti?: string) => ({ tip: 'eylemBitti', tur, uzanti })
const zombi = (x: number) => ({ tur: 'zombi', x, zy: 0, vy: 0, can: 3, kare: 0, vurulma: 0 })

test('yeni sahne labın hemen dışında düşünerek başlar', async () => {
  const s = yeniSahne(160)
  expect(s.mod).toBe('dusun')
  expect(s.x).toBe(78)
  expect(s.balon).toBe('düşünüyor…')
})

test('düşünürken araziye yürür ve malzeme toplar', async () => {
  const s = ilerle(yeniSahne(160), 10)
  expect(s.x).toBe(88)
  expect(ilerle(yeniSahne(160), 60).malzeme > 0).toBe(true)
})

test('yakındaki canavara döner, büyü atar ve öldürür', async () => {
  let s = { ...yeniSahne(160), canavarlar: [zombi(103)] }
  s = adim(s)
  expect(s.mermiler.length).toBe(1)
  expect(s.x).toBe(78)
  s = ilerle(s, 40)
  expect(s.canavarlar.length).toBe(0)
})

test('uzaktaysa laba ışınlanır, yakınsa yürür', async () => {
  const uzak = olayUygula(yeniSahne(160), eylem('oku', "README.md'yi okuyor"))
  expect(uzak.mod).toBe('oku')
  expect(uzak.x).toBe(23)
  expect(uzak.isinlanma).toBe(6)
  expect(uzak.balon).toBe("README.md'yi okuyor")
  const yakin = olayUygula({ ...yeniSahne(160), x: 40 }, eylem('oku'))
  expect(yakin.mod).toBe('git')
  const vardi = ilerle(yakin, 18)
  expect(vardi.mod).toBe('oku')
  expect(vardi.x).toBe(23)
})

test('balon en az iki saniye kalır, sonra düşünmeye döner', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('oku')), bitti('oku'))
  s = ilerle(s, BALON_EN_AZ - 1)
  expect(s.mod).toBe('oku')
  s = ilerle(s, 2)
  expect(s.mod).toBe('dusun')
  expect(s.balon).toBe('düşünüyor…')
})

test('düzenleme bitince dolaba tam bir şişe konur', async () => {
  let s = olayUygula(yeniSahne(160), eylem('insa', "sahne.js'yi karıştırıyor", 'js'))
  expect(s.kazanRengi).toBe(0xf2c12e)
  s = olayUygula(s, bitti('insa', 'js'))
  expect(s.tasinan).toEqual({ renk: 0xf2c12e, parlak: 0 })
  s = ilerle(s, 10)
  expect(s.dolap).toEqual([{ renk: 0xf2c12e, parlak: 0 }])
  expect(s.iksirSayisi).toBe(1)
  expect(s.buTur).toBe(1)
  expect(s.tasinan).toBe(null)
  expect(s.mod).toBe('dusun')
})

test('toplanan malzeme şişeyi parlatır', async () => {
  let s = { ...yeniSahne(160), bekleyen: 2 }
  s = olayUygula(olayUygula(s, eylem('insa', 'x', 'md')), bitti('insa', 'md'))
  expect(s.tasinan).toEqual({ renk: 0x4f8fe8, parlak: 2 })
  expect(s.bekleyen).toBe(0)
})

test('şişe taşırken yeni iş gelirse şişe hemen dolaba konur', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('insa', 'x', 'js')), bitti('insa', 'js'))
  s = olayUygula(s, eylem('oku'))
  expect(s.tasinan).toBe(null)
  expect(s.dolap.length).toBe(1)
})

test('dar bantta da şişe dolaba konur', async () => {
  let s = olayUygula(olayUygula(yeniSahne(80), eylem('insa', 'x', 'py')), bitti('insa', 'py'))
  expect(s.tasinan).toEqual({ renk: 0x5cc85c, parlak: 0 })
  s = ilerle(s, 40)
  expect(s.dolap.length).toBe(1)
  expect(s.tasinan).toBe(null)
})

test('bitti dolabın önünde kutlar, yeni tur düşünmeye döndürür', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('insa', 'x', 'js')), bitti('insa', 'js'))
  s = olayUygula(s, { tip: 'bitti' })
  expect(s.mod).toBe('bitti')
  expect(s.x).toBe(23)
  expect(s.balon).toBe('Bitti! 1 iksir hazır')
  expect(olayUygula(s, eylem('oku'))).toBe(s)
  const yeni = olayUygula(s, { tip: 'basla' })
  expect(yeni.mod).toBe('dusun')
  expect(yeni.buTur).toBe(0)
})

test('dolapYukle kayıtlı dolabı getirir', async () => {
  const s = olayUygula(yeniSahne(160), { tip: 'dolapYukle', sayi: 9, siseler: [{ renk: 1, parlak: 0 }] })
  expect(s.iksirSayisi).toBe(9)
  expect(s.dolap.length).toBe(1)
})

test('boyut değişince durak yeniden hesaplanır', async () => {
  const s = olayUygula(olayUygula({ ...yeniSahne(160), x: 56 }, eylem('insa', 'x', 'js')), { tip: 'boyut', genislik: 80 })
  expect(s.genislik).toBe(80)
  expect(s.x).toBe(23)
  expect(olayUygula(s, { tip: 'boyut', genislik: 80 })).toBe(s)
})

test('aynı olaylar aynı sahneyi üretir, diziler sınırlı kalır', async () => {
  const oyna = () => {
    let s = yeniSahne(200)
    s = olayUygula(s, eylem('tnt', 'npm test patlatıyor'))
    s = ilerle(s, 15)
    s = olayUygula(s, bitti('tnt'))
    return ilerle(s, 3000)
  }
  const a = oyna()
  expect(JSON.stringify(a)).toBe(JSON.stringify(oyna()))
  expect(a.parca.length <= 120).toBe(true)
  expect(a.mermiler.length <= 12).toBe(true)
  expect(a.esyalar.length <= 30).toBe(true)
  expect(a.canavarlar.length <= 2).toBe(true)
})
