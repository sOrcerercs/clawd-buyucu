import { expect, test } from 'claude-code/testing'
import { alan, araziUret, bitkiYenile, bloklarYenile, BITKI_ARALIK, BLOK_GEN } from '../hooks/arazi.js'

test('alan labın bittiği yerden başlar', async () => {
  expect(alan(120)).toEqual({ bas: 60, son: 112 })
  expect(alan(80)).toEqual({ bas: 20, son: 72 })
  expect(alan(20)).toEqual({ bas: 20, son: 20 })
})

test('arazi aynı tohumla aynı, farklı tohumla farklı', async () => {
  expect(araziUret(160, 7)).toEqual(araziUret(160, 7))
  expect(JSON.stringify(araziUret(160, 7)) === JSON.stringify(araziUret(160, 8))).toBe(false)
})

test('bloklar ve bitkiler arazinin içinde', async () => {
  for (const genislik of [20, 80, 120, 300]) {
    const { bas, son } = alan(genislik)
    const { bloklar, esyalar } = araziUret(genislik, 3)
    for (const b of bloklar) expect(b.x >= bas && b.x + BLOK_GEN <= son).toBe(true)
    for (const e of esyalar) expect(e.x >= bas && e.x < son).toBe(true)
  }
  expect(araziUret(300, 3).esyalar.length > 0).toBe(true)
})

test('bitki yalnız aralık karesinde ve sınırın altındayken eklenir', async () => {
  expect(bitkiYenile([], 300, BITKI_ARALIK + 1, 7)).toEqual([])
  const eklendi = bitkiYenile([], 300, BITKI_ARALIK, 7)
  expect(eklendi.length).toBe(1)
  const { bas, son } = alan(300)
  expect(eklendi[0].x >= bas && eklendi[0].x < son).toBe(true)
  const dolu = Array.from({ length: 20 }, (_, i) => ({ x: 100 + i, tur: 'mantar' }))
  expect(bitkiYenile(dolu, 300, BITKI_ARALIK, 7)).toBe(dolu)
})

test('kırık blok zamanı gelince geri gelir', async () => {
  const bloklar = [{ x: 70, tip: 'tas', yok: 50 }, { x: 90, tip: 'kutuk', yok: 0 }]
  expect(bloklarYenile(bloklar, 49)).toBe(bloklar)
  expect(bloklarYenile(bloklar, 50)).toEqual([{ x: 70, tip: 'tas', yok: 0 }, { x: 90, tip: 'kutuk', yok: 0 }])
})
