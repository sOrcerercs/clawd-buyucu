import { expect, test } from 'claude-code/testing'
import { CANAVAR, DOGUM_ARALIK, YAKIN, canavarDogur, canavarAdim, vurusKontrol, dusur, enYakin, topla } from '../hooks/canavar.js'

const zombi = (x: number, ek = {}) => ({ tur: 'zombi', x, zy: 0, vy: 0, can: 3, kare: 0, vurulma: 0, ...ek })

test('canavar aralık karesinde, sağ kenarda doğar', async () => {
  expect(canavarDogur([], 160, DOGUM_ARALIK + 1, 7)).toBe(null)
  const c = canavarDogur([], 160, DOGUM_ARALIK, 7)
  expect(c.x).toBe(159)
  expect(Object.keys(CANAVAR).includes(c.tur)).toBe(true)
  expect(c.can).toBe(CANAVAR[c.tur].can)
  expect(canavarDogur([zombi(100), zombi(120)], 160, DOGUM_ARALIK, 7)).toBe(null)
  expect(canavarDogur([], 120, DOGUM_ARALIK, 7)).not.toBe(null)
  expect(canavarDogur([], 80, DOGUM_ARALIK, 7)).toBe(null)
})

test('canavar hedefe yürür, yakına gelince durur, durgunken kımıldamaz', async () => {
  const yurudu = canavarAdim(zombi(100), 60, false)
  expect(yurudu.x).toBe(100 - CANAVAR.zombi.hiz)
  const yakin = zombi(60 + YAKIN - 2.5)
  expect(canavarAdim(yakin, 60, false).x).toBe(yakin.x)
  expect(canavarAdim(zombi(100), 60, true).x).toBe(100)
  expect(canavarAdim(zombi(100, { vurulma: 2 }), 60, true).vurulma).toBe(1)
})

test('slime zıplayarak ilerler', async () => {
  let s = { tur: 'slime', x: 100, zy: 0, vy: 0, can: 1, kare: 13, vurulma: 0 }
  s = canavarAdim(s, 60, false)
  expect(s.zy > 0).toBe(true)
  expect(s.x < 100).toBe(true)
})

test('mermi canavarı vurur, canı bitince ölür', async () => {
  const mermi = { x: 101, y: 8, vx: 2.5, sahip: 'clawd', omur: 30 }
  const ilk = vurusKontrol([zombi(100, { can: 2 })], [mermi])
  expect(ilk.mermiler).toEqual([])
  expect(ilk.canavarlar[0].can).toBe(1)
  expect(ilk.canavarlar[0].vurulma).toBe(3)
  const ikinci = vurusKontrol(ilk.canavarlar, [mermi])
  expect(ikinci.canavarlar).toEqual([])
  expect(ikinci.olenler.length).toBe(1)
  const iska = vurusKontrol([zombi(100)], [{ ...mermi, x: 50 }])
  expect(iska.mermiler.length).toBe(1)
})

test('ölen canavar malzeme düşürür, Clawd üstünden geçince toplar', async () => {
  expect(dusur([zombi(100)])).toEqual([{ x: 102, tur: 'et' }])
  const esyalar = [{ x: 70, tur: 'kemik' }, { x: 90, tur: 'mantar' }]
  expect(topla(esyalar, 66, 7)).toEqual({ esyalar: [{ x: 90, tur: 'mantar' }], toplanan: 1 })
  expect(topla(esyalar, 20, 7).toplanan).toBe(0)
})

test('enYakin en yakın canavarı ve yönünü verir', async () => {
  expect(enYakin([], 50)).toBe(null)
  const sonuc = enYakin([zombi(100), zombi(40)], 50)
  expect(sonuc.canavar.x).toBe(40)
  expect(sonuc.fark).toBe(-7.5)
  expect(sonuc.mesafe).toBe(7.5)
})
