// Clawd Büyücü — araç çağrısını sahne eylemine ve Türkçe balon metnine çevirir. Saf; $ kullanmaz.

const YAZMA = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const AJAN = new Set(['Agent', 'Task'])
const AD_EN_UZUN = 28
const BALON_EN_UZUN = 40

export const DUSUNUYOR = 'düşünüyor…'
export const HATA_METNI = 'Eyvah, büyü tutmadı!'
export const KONTROL_METNI = 'Kontrol sende!'
export const DOLAP_BOS = 'Dolap boş!'

export function bittiMetni(buTur) {
  return buTur > 0 ? `Bitti! ${buTur} iksir hazır` : 'Bitti!'
}

// Raster hücresi tek genişlikte karakter ister: Latin ve Türkçe harfler kalır, gerisi '?'
const TEK_GENISLIK = /^[\x20-\x7e\u00a0-\u024f\u2026]$/u

export function temizle(ham) {
  const duz = String(ham ?? '').replace(/\s+/g, ' ').trim()
  let sonuc = ''
  for (const harf of duz) sonuc += TEK_GENISLIK.test(harf) ? harf : '?'
  return sonuc
}

export function kisalt(metin, uzunluk) {
  const harfler = Array.from(metin)
  return harfler.length <= uzunluk ? metin : harfler.slice(0, uzunluk - 1).join('') + '…'
}

export function dosyaAdi(yol) {
  const parcalar = temizle(yol).split(/[\\/]/).filter(Boolean)
  return kisalt(parcalar.at(-1) || 'dosya', AD_EN_UZUN)
}

export function uzanti(yol) {
  const ad = String(yol ?? '').split(/[\\/]/).at(-1) || ''
  const nokta = ad.lastIndexOf('.')
  return nokta > 0 ? ad.slice(nokta + 1).toLowerCase() : ''
}

// ---- Türkçe ekler: ek, adın okunuşundaki son ünlüye uyar ----
const UNLULER = 'aeıioöuü'
const KALIN = 'aıou'
const YUVARLAK = 'oöuü'
// Rakamın okunuşu: [son ünlü, ünlüyle biter mi] — 2 "iki", 3 "üç"
const RAKAM = { 0: ['ı', false], 1: ['i', false], 2: ['i', true], 3: ['ü', false], 4: ['ö', false], 5: ['e', false], 6: ['ı', true], 7: ['i', true], 8: ['i', false], 9: ['u', false] }

function okunus(ad) {
  const kucuk = ad.toLocaleLowerCase('tr')
  const nokta = kucuk.lastIndexOf('.')
  const uzantili = nokta > 0 && nokta < kucuk.length - 1
  const parca = uzantili ? kucuk.slice(nokta + 1) : kucuk
  const harfler = Array.from(parca).filter((h) => /[a-zçğıöşü0-9]/.test(h))
  const son = harfler.at(-1)
  if (!son) return { unlu: 'e', unluyleBiter: true }
  if (son in RAKAM) return { unlu: RAKAM[son][0], unluyleBiter: RAKAM[son][1] }
  const unluler = harfler.filter((h) => UNLULER.includes(h))
  // Kısa uzantı ve ünlüsüz ad harf harf okunur: md "me-de", tsx "te-se-iks"
  const harfHarf = unluler.length === 0 || (uzantili && harfler.length <= 3)
  if (!harfHarf) return { unlu: unluler.at(-1), unluyleBiter: UNLULER.includes(son) }
  if (UNLULER.includes(son)) return { unlu: son, unluyleBiter: true }
  if (son === 'x') return { unlu: 'i', unluyleBiter: false }
  if (son === 'q') return { unlu: 'u', unluyleBiter: true }
  return { unlu: 'e', unluyleBiter: true }
}

export function ekle(ad, hal) {
  const { unlu, unluyleBiter } = okunus(ad)
  const kalin = KALIN.includes(unlu)
  const y = unluyleBiter ? 'y' : ''
  if (hal === 'yonelme') return `${ad}'${y}${kalin ? 'a' : 'e'}`
  const yuvarlak = YUVARLAK.includes(unlu)
  return `${ad}'${y}${kalin ? (yuvarlak ? 'u' : 'ı') : yuvarlak ? 'ü' : 'i'}`
}

export function komutAdi(komut) {
  const parcalar = temizle(komut).split(/&&|\|\||;|\|/).map((p) => p.trim()).filter(Boolean)
  const asil = parcalar.find((p) => !/^cd(\s|$)/.test(p)) ?? parcalar[0] ?? ''
  const [ilk, ikinci] = asil.split(' ').filter((k) => k && !/^[A-Za-z_]\w*=/.test(k))
  if (!ilk) return 'komut'
  const ad = ilk.split('/').at(-1) || ilk
  const altKomut = ikinci && /^[a-z][\w:-]{0,15}$/i.test(ikinci) ? ` ${ikinci}` : ''
  return kisalt(ad + altKomut, AD_EN_UZUN)
}

function hostAdi(url) {
  try {
    return temizle(new URL(String(url)).hostname.replace(/^www\./, ''))
  } catch {
    return ''
  }
}

// tool.call zarfı: e.tool + argümanlar; settings hook zarfı: e.tool_name + e.tool_input
export function aracBilgisi(e) {
  const ad = String(e?.tool ?? e?.tool_name ?? '')
  const girdi = e?.tool_input && typeof e.tool_input === 'object' ? e.tool_input : (e ?? {})
  return { ad, girdi }
}

export function eylemOku(e) {
  const { ad, girdi } = aracBilgisi(e)
  const belirt = (yol) => ekle(dosyaAdi(yol), 'belirtme')
  if (ad === 'Read' || ad === 'NotebookRead') return { tur: 'oku', metin: `${belirt(girdi.file_path || girdi.notebook_path)} okuyor` }
  if (ad === 'Grep' || ad === 'Glob') return { tur: 'oku', metin: kisalt(`"${temizle(girdi.pattern) || '?'}" arıyor`, BALON_EN_UZUN) }
  if (ad === 'LS') return { tur: 'oku', metin: `${belirt(girdi.path || 'klasör')} okuyor` }
  if (YAZMA.has(ad)) {
    const yol = girdi.file_path || girdi.notebook_path
    return { tur: 'insa', metin: `${belirt(yol)} karıştırıyor`, uzanti: uzanti(yol) }
  }
  if (ad === 'Bash') return { tur: 'tnt', metin: `${komutAdi(girdi.command)} patlatıyor` }
  if (AJAN.has(ad)) {
    const kim = temizle(girdi.description || girdi.subagent_type) || 'yardımcı'
    return { tur: 'ajan', metin: kisalt(`çırak: ${kim}`, BALON_EN_UZUN) }
  }
  if (ad === 'WebSearch') return { tur: 'web', metin: kisalt(`kürede arıyor: ${temizle(girdi.query)}`, BALON_EN_UZUN) }
  if (ad === 'WebFetch') {
    const host = hostAdi(girdi.url)
    return { tur: 'web', metin: host ? kisalt(`kürede: ${host}`, BALON_EN_UZUN) : 'küreye bakıyor' }
  }
  const kisa = temizle(ad.replace(/^mcp__/, '').replace(/__/g, ' '))
  return { tur: 'diger', metin: kisalt(`${kisa || 'araç'} ile uğraşıyor`, BALON_EN_UZUN) }
}

export function hataMi(e) {
  const yanit = e?.tool_response
  return !!yanit && typeof yanit === 'object' && (yanit.is_error === true || yanit.isError === true)
}
