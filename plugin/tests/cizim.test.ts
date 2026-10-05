import { expect, test } from 'claude-code/testing'
import { sahneHucreleri, base64, acikla } from '../hooks/cizim.js'
import { yeniSahne, olayUygula, adim } from '../hooks/sahne.js'

const ilerle = (s: any, n: number) => { for (let i = 0; i < n; i++) s = adim(s); return s }
const satirMetni = (h: Uint32Array, sutun: number, satir: number) =>
  String.fromCodePoint(...Array.from({ length: sutun }, (_, c) => h[(satir * sutun + c) * 3]))

function senaryolar(genislik: number) {
  const s0 = yeniSahne(genislik)
  return {
    dusun: ilerle(s0, 90),
    oku: ilerle(olayUygula(s0, { tip: 'eylem', tur: 'oku', metin: "README.md'yi okuyor" }), 5),
    insa: ilerle(olayUygula(s0, { tip: 'eylem', tur: 'insa', metin: 'x', uzanti: 'js' }), 25),
    dolap: ilerle(olayUygula(olayUygula(s0, { tip: 'eylem', tur: 'insa', metin: 'x', uzanti: 'js' }), { tip: 'eylemBitti', tur: 'insa', uzanti: 'js' }), 2),
    fitil: ilerle(olayUygula(s0, { tip: 'eylem', tur: 'tnt', metin: 'npm test patlatıyor' }), 6),
    creeper: ilerle(olayUygula(s0, { tip: 'hata', tur: 'diger' }), 20),
    ajan: ilerle(olayUygula(s0, { tip: 'eylem', tur: 'ajan', metin: 'çırak: test' }), 3),
    bitti: ilerle(olayUygula({ ...s0, dolap: [{ renk: 0xf2c12e, parlak: 3 }], buTur: 1 }, { tip: 'bitti' }), 5),
    oyuncu: ilerle(olayUygula({ ...s0, dolap: [{ renk: 0xf2c12e, parlak: 3 }], iksirSayisi: 1 }, { tip: 'oyuncu', komut: 'iksir' }), 3),
  }
}

test('hücre sayısı sütun × satır × 3', async () => {
  expect(sahneHucreleri(yeniSahne(120), 120, 10).length).toBe(120 * 10 * 3)
})

test('balon metni üst satırda', async () => {
  const s = yeniSahne(120)
  expect(satirMetni(sahneHucreleri(s, 120, 10), 120, 0).includes(' düşünüyor… ')).toBe(true)
})

test('aynı durum aynı hücreleri üretir', async () => {
  const s = ilerle(yeniSahne(120), 50)
  expect(Array.from(sahneHucreleri(s, 120, 10))).toEqual(Array.from(sahneHucreleri(s, 120, 10)))
})

test('balon dışındaki her hücre boşluk ya da yarım blok', async () => {
  for (const [ad, s] of Object.entries(senaryolar(120))) {
    const h = sahneHucreleri(s, 120, 10)
    for (let satir = 1; satir < 10; satir++) {
      for (let c = 0; c < 120; c++) {
        const kod = h[(satir * 120 + c) * 3]
        expect([ad, [0x20, 0x2580, 0x2584].includes(kod)]).toEqual([ad, true])
      }
    }
  }
})

test('her durum geniş, dar ve en küçük bantta hatasız çizilir', async () => {
  for (const [sutun, satir] of [[160, 10], [80, 10], [20, 6]]) {
    for (const [ad, s] of Object.entries(senaryolar(sutun))) {
      expect([ad, sahneHucreleri(s, sutun, satir).length]).toEqual([ad, sutun * satir * 3])
    }
  }
})

test('20×6 bant çizilir ve uzun balon sığdırılır', async () => {
  const s = { ...yeniSahne(20), balon: 'x'.repeat(60) }
  expect(satirMetni(sahneHucreleri(s, 20, 6), 20, 0).length).toBe(20)
})

test('base64 hücre baytlarını taşır', async () => {
  const h = sahneHucreleri(yeniSahne(40), 40, 6)
  expect(atob(base64(h)).length).toBe(h.byteLength)
})

test('acikla rengi beyaza doğru açar', async () => {
  expect(acikla(0x000000, 0.5)).toBe(0x808080)
  expect(acikla(0x123456, 0)).toBe(0x123456)
})
