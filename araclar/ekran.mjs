// README görselleri: her durumu modun kendi çizim koduyla PNG'ye döker (balon metni hariç; metin README'de).
// Kullanım: node araclar/ekran.mjs [klasör]   → <klasör>/<durum>.png ve kapak.png

import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { sahneHucreleri, VARSAYILAN } from '../plugin/hooks/cizim.js'
import { RENK } from '../plugin/hooks/sprite.js'
import { SENARYO, durumUret } from './senaryo.mjs'

const ARKA = 0x1e1e24
const SUTUN = 160
const SATIR = 10
const OLCEK = 5

// Hücreleri piksellere aç: ▀ üstü ön renk, altı arka renk; balon rengi arka plana karışır
function pikseller(hucreler, sutun, satir) {
  const renk = (r) => (r === VARSAYILAN || r === RENK.balon ? ARKA : r)
  const satirlar = []
  for (let y = 0; y < satir * 2; y++) {
    const row = []
    for (let x = 0; x < sutun; x++) {
      const i = ((y >> 1) * sutun + x) * 3
      const [kod, on, arka] = [hucreler[i], renk(hucreler[i + 1]), renk(hucreler[i + 2])]
      if (kod === 0x2580) row.push(y % 2 ? arka : on)
      else if (kod === 0x2584) row.push(y % 2 ? on : arka)
      else row.push(arka)
    }
    satirlar.push(row)
  }
  return satirlar
}

function crc32(b) {
  let c = ~0
  for (const x of b) {
    c ^= x
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function png(satirlar, olcek) {
  const gen = satirlar[0].length * olcek
  const yuk = satirlar.length * olcek
  const ham = Buffer.alloc((gen * 3 + 1) * yuk)
  for (let y = 0; y < yuk; y++) {
    for (let x = 0; x < gen; x++) {
      const c = satirlar[Math.floor(y / olcek)][Math.floor(x / olcek)]
      const o = y * (gen * 3 + 1) + 1 + x * 3
      ham[o] = (c >> 16) & 255
      ham[o + 1] = (c >> 8) & 255
      ham[o + 2] = c & 255
    }
  }
  const parca = (tur, veri) => {
    const uzunluk = Buffer.alloc(4)
    uzunluk.writeUInt32BE(veri.length)
    const govde = Buffer.concat([Buffer.from(tur), veri])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(govde))
    return Buffer.concat([uzunluk, govde, crc])
  }
  const baslik = Buffer.alloc(13)
  baslik.writeUInt32BE(gen, 0)
  baslik.writeUInt32BE(yuk, 4)
  baslik[8] = 8
  baslik[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), parca('IHDR', baslik), parca('IDAT', deflateSync(ham)), parca('IEND', Buffer.alloc(0))])
}

const klasor = process.argv[2] || 'ekran'
mkdirSync(klasor, { recursive: true })
const hepsi = {}
for (const ad of Object.keys(SENARYO)) {
  hepsi[ad] = pikseller(sahneHucreleri(durumUret(ad, SUTUN), SUTUN, SATIR), SUTUN, SATIR)
  writeFileSync(`${klasor}/${ad}.png`, png(hepsi[ad], OLCEK))
}
// Kapak: üç durum alt alta
const ayrac = [Array(SUTUN).fill(ARKA), Array(SUTUN).fill(ARKA)]
writeFileSync(`${klasor}/kapak.png`, png([...hepsi.insa, ...ayrac, ...hepsi.dusun, ...ayrac, ...hepsi.bitti], OLCEK))
console.log(`${Object.keys(hepsi).length + 1} görsel yazıldı: ${klasor}/`)
