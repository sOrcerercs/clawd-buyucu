// Clawd Büyücü — renkler ve piksel sprite'ları. Saf veri; $ kullanmaz.
// Sprite satır dizisidir: '.' saydam, diğer harf paletteki renk. L, C, R, F renkleri çizimde verilir.

export const RENK = {
  turuncu: 0xd97757, turuncuKoyu: 0xa9553a, goz: 0x2a1a12,
  mor: 0x6b4fbb, morKoyu: 0x48338a, yildiz: 0xf5d76e,
  asa: 0x8a5a2b, portal: 0x9b4fe0, portalAcik: 0xd6a8ff,
  cim: 0x5fae3e, cimKoyu: 0x3f8a2a, toprak: 0x8b5a3c, toprakKoyu: 0x6b432b, tas: 0x7f7f86, tasKoyu: 0x5c5c63,
  duvar: 0x2e2219, duvarCizgi: 0x3a2b1f, duvarKoyu: 0x1f1610, tugla: 0x6d6d73, tuglaKoyu: 0x4e4e54,
  tahta: 0xa87b4f, tahtaKoyu: 0x6e4d2e,
  kazan: 0x3b3b44, kazanKoyu: 0x24242a, kazanAgiz: 0x6a6a76, iksir: 0xa05ce0,
  sayfa: 0xf0e6c8, sayfaKoyu: 0xb3a47a, kitap: 0x9b2d2d, kure: 0x9fd8f0, kureKenar: 0x6fb6dc, kureIc: 0xe8f6ff,
  altin: 0xd9a93a, altinKoyu: 0xa67c1f, hale: 0xf5d76e, buhar: 0xc8c8d0,
  tnt: 0xd03a2f, tntKoyu: 0x9e2a22, beyaz: 0xffffff, siyah: 0x161616,
  creeper: 0x4caf50, creeperKoyu: 0x2e7d32,
  zombi: 0x5d9b4a, gomlek: 0x2fa3b5, pantolon: 0x3a4aa0,
  kemik: 0xe0e0d8, kemikKoyu: 0xa8a89e, orumcek: 0x3a3030, kirmizi: 0xd02020,
  slime: 0x7fd36a, slimeKoyu: 0x4f9e3e, mantar: 0xc8302a, sap: 0xe8dcc0, cicek: 0xf2d43a, et: 0x9a5a3a, etKoyu: 0x6e3a24,
  alev: 0xff8a1f, kivilcim: 0xffd25e, duman: 0x9a9a9a, balon: 0xf2ecd9, balonYazi: 0x1e1e1e,
}

export const OZEL_HARFLER = new Set(['L', 'C', 'R', 'F'])

function P(satirlar, palet = {}) {
  return { gen: satirlar[0].length, yuk: satirlar.length, satirlar, palet }
}

const TURUNCU = { O: RENK.turuncu, o: RENK.turuncuKoyu, K: RENK.goz }
const KURSU = { P: RENK.sayfa, p: RENK.sayfaKoyu, k: RENK.kitap, W: RENK.tahta, w: RENK.tahtaKoyu }

export const SPRITE = {
  // Clawd sağa bakar; sola bakarken aynalanır. Gövde 5 satır + ayak 1 satır.
  clawd: P(['.OOOOO.', 'OOKOOKO', 'OOKOOKO', 'OOOOOOO', 'oOOOOOo'], TURUNCU),
  ayakA: P(['o.o.o.o'], TURUNCU),
  ayakB: P(['.o.o.o.'], TURUNCU),
  sapka: P(['....S....', '...SYS...', '..SSSSS..', 'sssssssss'], { S: RENK.mor, s: RENK.morKoyu, Y: RENK.yildiz }),
  cirak: P(['.OOO.', 'OKOKO', 'OOOOO'], TURUNCU),
  cirakAyakA: P(['o.o.o'], TURUNCU),
  cirakAyakB: P(['.o.o.'], TURUNCU),
  cirakSapka: P(['..R..', '.RRR.', 'RRRRR']),
  // Kazan: açık ağız, renkli sıvı (L), bacakların arasında titreyen ateş (F)
  kazan: P(['aaaaaaaaaaa', 'aLLLLLLLLLa', 'kKKKKKKKKKk', 'kKKKKKKKKKk', '.kKKKKKKKk.', '.k.FFFFF.k.'], { a: RENK.kazanAgiz, k: RENK.kazan, K: RENK.kazanKoyu }),
  // Kürsü: ahşap ayak üstünde açık kitap; beyaz sayfalarda yazı satırları, ortada kırmızı sırt
  kursu: P(['PpPkPpP', 'pPPkPPp', 'WWWWWWW', '.wWWWw.', '..wWw..', '..wWw..', '.WWWWW.'], KURSU),
  kursu2: P(['pPpkpPp', 'PpPkPpP', 'WWWWWWW', '.wWWWw.', '..wWw..', '..wWw..', '.WWWWW.'], KURSU),
  // Küre: altın ayak üstünde cam; içi (C) değişir, beyaz parlama noktası
  kure: P(['.cccc.', 'cChCCc', 'cCCCCc', '.cccc.', '..GG..', '.GggG.', 'GGGGGG'], { c: RENK.kureKenar, h: RENK.beyaz, G: RENK.altin, g: RENK.altinKoyu }),
  // Şişe: mantar, boyun, camda parıltı pikseli
  sise: P(['.q.', '.L.', 'HLL', 'LLL'], { q: RENK.tahta, H: RENK.beyaz }),
  tnt: P(['RrRr', 'BBBB', 'RrRr', 'rRrR'], { R: RENK.tnt, r: RENK.tntKoyu, B: RENK.beyaz }),
  creeper: P(['GgGGG', 'GKGKG', 'gGKGg', 'GKKKG', '.GgG.', '.gGG.', '.GGg.', 'Gg.gG'], { G: RENK.creeper, g: RENK.creeperKoyu, K: RENK.siyah }),
  zombi: P(['.ZZZ.', '.KZK.', '.ZZZ.', 'TTTTT', 'ZTTTZ', '.TTT.', '.PPP.', '.P.P.'], { Z: RENK.zombi, K: RENK.siyah, T: RENK.gomlek, P: RENK.pantolon }),
  iskelet: P(['.bbb.', '.KbK.', '.bbb.', '..B..', 'bBbBb', '..B..', '.b.b.', '.b.b.'], { b: RENK.kemik, B: RENK.kemikKoyu, K: RENK.siyah }),
  orumcek: P(['..KKKK..', 'KKKRKRKK', 'K.K..K.K'], { K: RENK.orumcek, R: RENK.kirmizi }),
  slime: P(['SSSSS', 'SKSKS', 'SSSSS', 'sSSSs'], { S: RENK.slime, s: RENK.slimeKoyu, K: RENK.slimeKoyu }),
  mantar: P(['MM', '.s'], { M: RENK.mantar, s: RENK.sap }),
  cicek: P(['Y.', 'g.'], { Y: RENK.cicek, g: RENK.cimKoyu }),
  et: P(['EE', 'Ee'], { E: RENK.et, e: RENK.etKoyu }),
  kemik: P(['b.', '.b'], { b: RENK.kemik }),
  goz: P(['RK'], { R: RENK.kirmizi, K: RENK.siyah }),
  slimeTopu: P(['SS'], { S: RENK.slime }),
  tas: P(['TtTT', 'TTtT', 'tTTt', 'TTTT'], { T: RENK.tas, t: RENK.tasKoyu }),
  kutuk: P(['wWWw', 'WwwW', 'WwwW', 'wWWw'], { W: RENK.tahta, w: RENK.tahtaKoyu }),
  yaprak: P(['.gG.', 'gGgG', 'GgGg', '.Gg.'], { G: RENK.cim, g: RENK.cimKoyu }),
  portal: P(['.PP.', 'PpPP', 'PPpP', 'PpPP', 'PPpP', 'PpPP', '.PP.'], { P: RENK.portal, p: RENK.portalAcik }),
}

export function beyazPalet(sp) {
  return Object.fromEntries(Object.keys(sp.palet).map((harf) => [harf, RENK.beyaz]))
}
