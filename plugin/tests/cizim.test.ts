import { expect, test } from 'claude-code/testing'
import { sahneHucreleri, base64, acikla, gorunurPencere, BALON_SATIR } from '../hooks/cizim.js'
import { RENK } from '../hooks/sprite.js'
import { labYerlesimi, sisePikseli } from '../hooks/lab.js'
import { YER } from '../hooks/fizik.js'
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

// Dünya koordinatındaki (x, y) pikselinin rengi; bant dışında kalıyorsa null
function piksel(h: Uint32Array, sutun: number, satir: number, x: number, y: number) {
  const cy = y - gorunurPencere(satir * 2)
  if (cy < 0 || cy >= satir * 2) return null
  const i = ((cy >> 1) * sutun + x) * 3
  const ust = cy % 2 === 0
  if (h[i] === 0x2580) return ust ? h[i + 1] : h[i + 2]
  if (h[i] === 0x2584) return ust ? h[i + 2] : h[i + 1]
  return h[i + 2]
}

test('kırpma önce yeraltından başlar', async () => {
  expect(gorunurPencere(20)).toBe(0)
  expect(gorunurPencere(16)).toBe(0)
  expect(gorunurPencere(12)).toBe(4)
})

test('6 satırlık bantta şapka görünür, balon sahneyi örtmez', async () => {
  const s = yeniSahne(120)
  const h = sahneHucreleri(s, 120, 6)
  expect(piksel(h, 120, 6, s.x + 3, YER - 10)).toBe(RENK.mor)
  const ust = Array.from({ length: 120 }, (_, c) => h[c * 3])
  expect(ust.every((k) => [0x20, 0x2580, 0x2584].includes(k))).toBe(true)
  expect(BALON_SATIR).toBe(8)
  expect(satirMetni(sahneHucreleri(s, 120, 8), 120, 0).includes('düşünüyor…')).toBe(true)
})

test('kullanılan eşya parlar, diğerleri sönükleşir', async () => {
  const lab = labYerlesimi(120)
  const oku = { ...olayUygula(yeniSahne(120), { tip: 'eylem', tur: 'oku', metin: 'x' }), kare: 0 }
  const h = sahneHucreleri(oku, 120, 10)
  expect(piksel(h, 120, 10, lab.kursuX + 1, YER - 8)).toBe(RENK.hale)
  expect(piksel(h, 120, 10, lab.kazanX, YER - 6) === RENK.kazanAgiz).toBe(false)
  const bos = sahneHucreleri({ ...yeniSahne(120), kare: 0 }, 120, 10)
  expect(piksel(bos, 120, 10, lab.kazanX, YER - 6)).toBe(RENK.kazanAgiz)
  expect(piksel(bos, 120, 10, lab.kursuX + 1, YER - 8) === RENK.hale).toBe(false)
})

test('kazanın altında ateş yanar', async () => {
  const lab = labYerlesimi(120)
  const renk = piksel(sahneHucreleri(yeniSahne(120), 120, 10), 120, 10, lab.kazanX + 4, YER - 1)
  expect([RENK.alev, RENK.kivilcim].includes(renk)).toBe(true)
})

test('taşınan şişe Clawd\'un önünde çizilir', async () => {
  const s = { ...yeniSahne(160), tasinan: { renk: 0x4f8fe8, parlak: 0 }, yon: 1 }
  expect(piksel(sahneHucreleri(s, 160, 10), 160, 10, s.x + 6, YER - 4)).toBe(0x4f8fe8)
})

test('yeni konan şişe yanıp söner, sonra yıldızla işaretli kalır', async () => {
  const lab = labYerlesimi(120)
  const { x, y } = sisePikseli(lab, 0)
  const s = { ...yeniSahne(120), dolap: [{ renk: 0x4f8fe8, parlak: 0 }], sonSiseKare: 100, kare: 100 }
  expect(piksel(sahneHucreleri(s, 120, 10), 120, 10, x + 1, y + 3)).toBe(RENK.beyaz)
  const sonra = sahneHucreleri({ ...s, kare: 200 }, 120, 10)
  expect(piksel(sonra, 120, 10, x + 1, y + 3)).toBe(0x4f8fe8)
  expect(piksel(sonra, 120, 10, x + 1, y - 1)).toBe(RENK.yildiz)
})
