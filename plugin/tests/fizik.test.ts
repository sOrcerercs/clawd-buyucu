import { expect, test } from 'claude-code/testing'
import { zar, yerCekimi, yerde, parcaSac, yukselen, parcaAdim, mermiAt, mermiAdim, PARCA_SINIR, YER } from '../hooks/fizik.js'

test('zar deterministik ve [0,1) aralığında', async () => {
  expect(zar(5, 9)).toBe(zar(5, 9))
  expect(zar(5, 9) === zar(5, 10)).toBe(false)
  for (let i = 0; i < 500; i++) {
    const z = zar(i, i * 7)
    expect(z >= 0 && z < 1).toBe(true)
  }
})

test('zıplayan varlık yere geri iner', async () => {
  let v = { zy: 0, vy: 3 }
  v = yerCekimi(v)
  expect(v.zy > 0).toBe(true)
  for (let i = 0; i < 30; i++) v = yerCekimi(v)
  expect(v).toEqual({ zy: 0, vy: 0 })
  expect(yerde(v)).toBe(true)
  const durgun = { zy: 0, vy: 0 }
  expect(yerCekimi(durgun)).toBe(durgun)
})

test('parçacıklar ömrünü doldurur ve sayıları sınırlıdır', async () => {
  let p = parcaSac([], 1, 10, 10, () => 0xffffff, 5, 1)
  expect(p.length).toBe(5)
  for (let i = 0; i < 30; i++) p = parcaAdim(p)
  expect(p.length).toBe(0)
  const cok = parcaSac([], 2, 0, 0, () => 1, PARCA_SINIR + 50, 1)
  expect(cok.length).toBe(PARCA_SINIR)
})

test('parçacık zemine çarpınca sekip zeminin üstünde kalır', async () => {
  const p = parcaAdim([{ x: 0, y: YER - 0.5, vx: 0, vy: 2, renk: 1, omur: 5 }])
  expect(p[0].y < YER).toBe(true)
  expect(p[0].vy <= 0).toBe(true)
})

test('yükselen parçacık yerçekimsiz yukarı gider', async () => {
  let p = yukselen([], 3, 5, 10, 0xabcdef)
  const ilkY = p[0].y
  p = parcaAdim(parcaAdim(p))
  expect(p[0].y < ilkY).toBe(true)
  expect(p[0].hafif).toBe(true)
})

test('mermi ilerler, alan dışına çıkınca silinir', async () => {
  let m = mermiAt([], 10, 8, 1, 'clawd')
  m = mermiAdim(m, 100)
  expect(m[0].x).toBe(12.5)
  for (let i = 0; i < 50; i++) m = mermiAdim(m, 100)
  expect(m.length).toBe(0)
  const sol = mermiAdim(mermiAt([], 1, 8, -1, 'clawd'), 100)
  expect(sol[0].x).toBe(-1.5)
  expect(mermiAdim(sol, 100).length).toBe(0)
})
