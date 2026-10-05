import { expect, test } from 'claude-code/testing'
import {
  CLAWD_GEN, labYerlesimi, durak, asaUcuX, siseRengi, yeniSise, VARSAYILAN_SISE,
  dolabaEkle, gorunenSiseler, sisePikseli, dolapOku, dolapKaydi,
} from '../hooks/lab.js'

const sise = (renk = 0xf2c12e) => ({ renk, parlak: 0 })
const siseler = (n: number) => Array.from({ length: n }, (_, i) => sise(i))

test('geniş bantta tam lab, 90 sütunun altında yalnız kazan', async () => {
  const genis = labYerlesimi(120)
  expect(genis.son).toBe(59)
  expect(genis.dolapX).toBe(1)
  const dar = labYerlesimi(89)
  expect(dar.dolapX).toBe(null)
  expect(dar.kursuX).toBe(null)
  expect(dar.kazanX).toBe(8)
  expect(labYerlesimi(90).dolapX).toBe(1)
})

test('durak her durumun yerini ve yönünü verir', async () => {
  const lab = labYerlesimi(120)
  expect(durak(lab, 'oku')).toEqual({ x: 16, yon: 1 })
  expect(durak(lab, 'insa')).toEqual({ x: 41, yon: 1 })
  expect(durak(lab, 'dolap')).toEqual({ x: 16, yon: -1 })
  expect(asaUcuX({ x: 10, yon: 1 })).toBe(10 + CLAWD_GEN)
  expect(asaUcuX({ x: 10, yon: -1 })).toBe(9)
})

test('şişe rengi uzantıdan, parlaklık malzemeden', async () => {
  expect(siseRengi('JS')).toBe(0xf2c12e)
  expect(siseRengi('md')).toBe(0x4f8fe8)
  expect(siseRengi('rs')).toBe(VARSAYILAN_SISE)
  expect(siseRengi(undefined)).toBe(VARSAYILAN_SISE)
  expect(yeniSise('py', 5)).toEqual({ renk: 0x5cc85c, parlak: 3 })
  expect(yeniSise('py', 1).parlak).toBe(1)
})

test('dolap 24 şişe saklar, raflar dolunca en eski raf kayar', async () => {
  expect(dolabaEkle(siseler(24), sise(99)).length).toBe(24)
  expect(dolabaEkle(siseler(24), sise(99)).at(-1)).toEqual(sise(99))
  expect(gorunenSiseler(siseler(12)).length).toBe(12)
  expect(gorunenSiseler(siseler(13)).length).toBe(9)
  expect(gorunenSiseler(siseler(16)).length).toBe(12)
  expect(gorunenSiseler(siseler(17)).length).toBe(9)
  expect(gorunenSiseler(siseler(13))[0]).toEqual(sise(4))
  const lab = labYerlesimi(120)
  expect(sisePikseli(lab, 0)).toEqual({ x: 2, y: 2 })
  expect(sisePikseli(lab, 5)).toEqual({ x: 5, y: 6 })
})

test('dolapOku bozuk veriyi ayıklar', async () => {
  expect(dolapOku(undefined)).toEqual({ sayi: 0, siseler: [] })
  expect(dolapOku('bozuk')).toEqual({ sayi: 0, siseler: [] })
  expect(dolapOku({ sayi: 'yedi', siseler: 'x' })).toEqual({ sayi: 0, siseler: [] })
  const ham = { sayi: 1, siseler: [sise(), { renk: 0x1000000, parlak: 0 }, { renk: 5, parlak: 9 }, null, sise(7)] }
  expect(dolapOku(ham)).toEqual({ sayi: 2, siseler: [sise(), sise(7)] })
  expect(dolapOku({ sayi: 40, siseler: siseler(30) }).siseler.length).toBe(24)
  expect(dolapKaydi(40, siseler(30))).toEqual({ sayi: 40, siseler: siseler(30).slice(-24) })
})
