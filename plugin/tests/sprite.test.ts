import { expect, test } from 'claude-code/testing'
import { RENK, SPRITE, OZEL_HARFLER, beyazPalet } from '../hooks/sprite.js'

test('her renk 24 bit tamsayı', async () => {
  for (const [ad, renk] of Object.entries(RENK)) {
    expect([ad, Number.isInteger(renk) && renk >= 0 && renk <= 0xffffff]).toEqual([ad, true])
  }
})

test('her sprite dikdörtgen ve her harfin rengi tanımlı', async () => {
  for (const [ad, sp] of Object.entries(SPRITE) as [string, any][]) {
    expect([ad, sp.yuk]).toEqual([ad, sp.satirlar.length])
    for (const satir of sp.satirlar) {
      expect([ad, satir.length]).toEqual([ad, sp.gen])
      for (const harf of satir) {
        const tanimli = harf === '.' || OZEL_HARFLER.has(harf) || sp.palet[harf] !== undefined
        expect([ad, harf, tanimli]).toEqual([ad, harf, true])
      }
    }
  }
})

test('sahnenin istediği sprite adları var', async () => {
  const adlar = ['clawd', 'ayakA', 'ayakB', 'sapka', 'cirak', 'cirakAyakA', 'cirakAyakB', 'cirakSapka', 'kazan', 'kursu', 'kursu2',
    'kure', 'sise', 'tnt', 'creeper', 'zombi', 'iskelet', 'orumcek', 'slime', 'mantar', 'cicek', 'et', 'kemik', 'goz',
    'slimeTopu', 'tas', 'kutuk', 'yaprak', 'portal']
  for (const ad of adlar) expect([ad, SPRITE[ad] !== undefined]).toEqual([ad, true])
  expect(SPRITE.clawd.gen).toBe(7)
})

test('beyazPalet tüm palet harflerini beyaz yapar', async () => {
  expect(beyazPalet(SPRITE.tnt)).toEqual({ R: RENK.beyaz, r: RENK.beyaz, B: RENK.beyaz })
})

test('lab eşyaları tanınır boyutta', async () => {
  expect([SPRITE.kursu.gen, SPRITE.kursu.yuk]).toEqual([7, 8])
  expect([SPRITE.kursu2.gen, SPRITE.kursu2.yuk]).toEqual([7, 8])
  expect([SPRITE.kure.gen, SPRITE.kure.yuk]).toEqual([6, 8])
  expect([SPRITE.kazan.gen, SPRITE.kazan.yuk]).toEqual([11, 6])
  expect([SPRITE.sise.gen, SPRITE.sise.yuk]).toEqual([3, 4])
  expect(SPRITE.kazan.satirlar.join('').includes('F')).toBe(true)
  expect(OZEL_HARFLER.has('F')).toBe(true)
})

test('Clawd\'un gözleri tek bir terminal satırına sığar (satır arası boşluk gözü bölmesin)', async () => {
  // Gövde YER - 6'dan başlar (çift satır); 2 piksellik göz çift + tek satır çiftinde durmalı
  const gozSatirlari = SPRITE.clawd.satirlar.map((s: string, i: number) => (s.includes('K') ? i : -1)).filter((i: number) => i >= 0)
  expect(gozSatirlari.length).toBe(2)
  expect((14 - 6 + gozSatirlari[0]) % 2).toBe(0)
  expect(gozSatirlari[1]).toBe(gozSatirlari[0] + 1)
})

test('zemine oturan lab eşyaları çift satırdan başlar', async () => {
  // Zemin y = 14; yüksekliği çift olan eşyanın tepesi çift satıra düşer
  for (const ad of ['kursu', 'kursu2', 'kure', 'kazan']) expect([ad, SPRITE[ad].yuk % 2]).toEqual([ad, 0])
})
