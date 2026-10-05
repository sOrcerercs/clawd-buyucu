import { expect, test } from 'claude-code/testing'
import { yeniSahne, olayUygula, adim, FITIL_EN_AZ, CREEPER_SURE } from '../hooks/sahne.js'

const ilerle = (s: any, n: number) => { for (let i = 0; i < n; i++) s = adim(s); return s }
const eylem = (tur: string, metin = 'iş', uzanti?: string) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur: string, uzanti?: string) => ({ tip: 'eylemBitti', tur, uzanti })

test('Bash fitili yakar, en az on kare sonra patlar', async () => {
  let s = olayUygula(yeniSahne(160), eylem('tnt', 'npm test patlatıyor'))
  expect(s.mod).toBe('fitil')
  expect(s.tnt.x >= 61).toBe(true)
  s = olayUygula(s, bitti('tnt'))
  expect(s.tnt.patlaAt).toBe(FITIL_EN_AZ)
  s = ilerle(s, FITIL_EN_AZ - 1)
  expect(s.tnt).not.toBe(null)
  s = adim(s)
  expect(s.tnt).toBe(null)
  expect(s.patlama).not.toBe(null)
  expect(s.mod).toBe('dusun')
})

test('uzun Bash boyunca fitil yanmaya devam eder', async () => {
  const s = ilerle(olayUygula(yeniSahne(160), eylem('tnt')), 200)
  expect(s.mod).toBe('fitil')
  expect(s.tnt).not.toBe(null)
})

test('patlama yakındaki canavarı öldürür ve süs bloğunu kırar', async () => {
  let s = olayUygula(yeniSahne(200), eylem('tnt'))
  const tx = s.tnt.x
  s = { ...s, canavarlar: [{ tur: 'zombi', x: tx, zy: 0, vy: 0, can: 3, kare: 0, vurulma: 0 }], bloklar: [{ x: tx + 3, tip: 'tas', yok: 0 }] }
  s = olayUygula(ilerle(s, FITIL_EN_AZ), bitti('tnt'))
  expect(s.canavarlar).toEqual([])
  expect(s.bloklar[0].yok > s.kare).toBe(true)
  expect(s.esyalar.some((e: any) => e.tur === 'et')).toBe(true)
})

test('fitil yanarken hata gelirse TNT hemen patlar, creeper gelir', async () => {
  const s = olayUygula(olayUygula(yeniSahne(160), eylem('tnt')), { tip: 'hata', tur: 'tnt' })
  expect(s.tnt).toBe(null)
  expect(s.patlama).not.toBe(null)
  expect(s.mod).toBe('creeper')
  expect(s.balon).toBe('Eyvah, büyü tutmadı!')
})

test('creeper patlar, şapka uçar, sonra bekleyen olaylar işlenir', async () => {
  let s = olayUygula(yeniSahne(160), { tip: 'hata', tur: 'diger' })
  s = olayUygula(s, eylem('oku', "README.md'yi okuyor"))
  expect(s.kuyruk.length).toBe(1)
  expect(s.balon).toBe('Eyvah, büyü tutmadı!')
  s = ilerle(s, 19)
  expect(s.creeper.patladi).toBe(true)
  expect(s.sapka).not.toBe(null)
  s = ilerle(s, CREEPER_SURE - 19)
  expect(s.creeper).toBe(null)
  expect(s.sapka).toBe(null)
  expect(s.kuyruk).toEqual([])
  expect(s.balon).toBe("README.md'yi okuyor")
  expect(['oku', 'git'].includes(s.mod)).toBe(true)
})

test('sağ kenardaysa creeper soldan gelir', async () => {
  const s = olayUygula({ ...yeniSahne(160), x: 145 }, { tip: 'hata', tur: 'diger' })
  expect(s.creeper.x < s.x).toBe(true)
  expect(s.yon).toBe(-1)
})

test('her ajan bir çırak; ajan bitince çırak portala döner', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('ajan', 'çırak: a')), eylem('ajan', 'çırak: b'))
  expect(s.ciraklar.length).toBe(2)
  s = ilerle(s, 10)
  expect(s.ciraklar.every((c: any) => c.durum === 'aktif')).toBe(true)
  s = olayUygula(s, bitti('ajan'))
  expect(s.ciraklar.filter((c: any) => c.durum === 'cikis').length).toBe(1)
  s = ilerle(s, 60)
  expect(s.ciraklar.length).toBe(1)
})

test('hata veren ajan da çırağını geri gönderir', async () => {
  const s = olayUygula(olayUygula(yeniSahne(160), eylem('ajan')), { tip: 'hata', tur: 'ajan' })
  expect(s.ciraklar[0].durum).toBe('cikis')
})

test('paralel araçlar takılmaz', async () => {
  let s = yeniSahne(160)
  s = olayUygula(s, eylem('oku'))
  s = olayUygula(s, eylem('tnt'))
  s = olayUygula(s, eylem('oku'))
  s = olayUygula(s, bitti('oku'))
  s = olayUygula(s, bitti('oku'))
  s = olayUygula(s, bitti('tnt'))
  s = ilerle(s, 60)
  expect(s.tnt).toBe(null)
  expect(s.mod).toBe('dusun')
})

test('Claude bir iş başlatınca oyuncu kontrolü biter', async () => {
  let s = olayUygula(yeniSahne(160), { tip: 'oyuncu', komut: 'sag' })
  expect(s.oyuncu > 0).toBe(true)
  s = olayUygula(s, eylem('oku'))
  expect(s.oyuncu).toBe(0)
})
