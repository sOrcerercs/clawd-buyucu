import { expect, test } from 'claude-code/testing'
import { oyuncuOlayi, oyuncuAdim, KONTROL_KARE, ETKI_KARE } from '../hooks/oyuncu.js'

const durum = (ek = {}) => ({
  kare: 10, mod: 'dusun', modKare: 0, genislik: 160, x: 70, zy: 0, vy: 0, yon: 1, hedef: null,
  dusunAt: null, balon: '', balonKare: 0, oyuncu: 0, yuruKalan: 0, atesBekleme: 0,
  mermiler: [], parca: [], dolap: [], iksirSayisi: 0, etki: null, ...ek,
})
const ilerle = (s: any, n: number) => { for (let i = 0; i < n; i++) s = oyuncuAdim(s); return s }

test('zıpla kontrolü oyuncuya verir', async () => {
  const s = oyuncuOlayi(durum(), 'zipla')
  expect(s.vy).toBe(3)
  expect(s.oyuncu).toBe(KONTROL_KARE)
  expect(s.balon).toBe('Kontrol sende!')
  expect(oyuncuOlayi(durum({ zy: 2, vy: 1 }), 'zipla').vy).toBe(1)
})

test('yön tuşu altı kare yürütür, hız iksiriyle iki kat', async () => {
  expect(ilerle(oyuncuOlayi(durum(), 'sag'), 6).x).toBe(76)
  expect(ilerle(oyuncuOlayi(durum(), 'sol'), 6).x).toBe(64)
  const hizli = oyuncuOlayi(durum({ etki: { tur: 'hiz', kalan: 30, renk: 1 } }), 'sag')
  expect(ilerle(hizli, 6).x).toBe(82)
  expect(ilerle(oyuncuOlayi(durum({ x: 2 }), 'sol'), 6).x).toBe(0)
})

test('büyü baktığı yöne mermi atar, beklemedeyken atmaz', async () => {
  const s = oyuncuOlayi(durum(), 'buyu')
  expect(s.mermiler.length).toBe(1)
  expect(s.mermiler[0].vx > 0).toBe(true)
  expect(oyuncuOlayi(durum({ atesBekleme: 2 }), 'buyu').mermiler.length).toBe(0)
})

test('iksir dolaptan bir şişe harcar ve etki verir', async () => {
  const s = oyuncuOlayi(durum({ dolap: [{ renk: 0x4f8fe8, parlak: 0 }], iksirSayisi: 3 }), 'iksir')
  expect(s.dolap).toEqual([])
  expect(s.iksirSayisi).toBe(2)
  expect(s.etki).toEqual({ tur: 'hiz', kalan: ETKI_KARE, renk: 0x4f8fe8 })
  expect(oyuncuOlayi(durum(), 'iksir').balon).toBe('Dolap boş!')
})

test('kontrol bitince balon düşünüyor olur', async () => {
  const s = ilerle(oyuncuOlayi(durum(), 'zipla'), KONTROL_KARE)
  expect(s.oyuncu).toBe(0)
  expect(s.balon).toBe('düşünüyor…')
})

test('kilitli modlarda tuşlar yok sayılır, lab modundan çıkılır', async () => {
  for (const mod of ['fitil', 'creeper', 'dolap', 'bitti']) {
    const s = durum({ mod })
    expect(oyuncuOlayi(s, 'zipla')).toBe(s)
  }
  expect(oyuncuOlayi(durum({ mod: 'oku' }), 'sag').mod).toBe('dusun')
})
