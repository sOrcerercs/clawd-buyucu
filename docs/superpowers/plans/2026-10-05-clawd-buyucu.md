# Clawd Büyücü Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Code çalışırken istemin üstündeki bantta, asalı büyücü Clawd'un iksir karıştırdığı, dolaba dizdiği ve canavarlara büyü attığı piksel bir Minecraft sahnesi gösteren mod.

**Architecture:** `plugin/hooks/register.js` mods API'sini (`$`) kullanan tek dosyadır: olayları dinler, saati çalıştırır, `Raster` çizer, `$.store`'a yazar. Geri kalan her modül saf fonksiyondur: `sahne.js` durum makinesi (`olayUygula`, `adim`), `cizim.js` durumu Raster hücrelerine çevirir; `olay`, `lab`, `fizik`, `arazi`, `canavar`, `oyuncu`, `sprite` yardımcı birimlerdir. Testler `claude plugin test` ile oturumsuz koşar.

**Tech Stack:** Claude Code mods (v2.1.287+, yerelde 2.1.289), ES modülleri (düz JavaScript), test kiti `claude-code/testing` (`.test.ts`), Node 24 (yalnız `araclar/onizle.mjs` için).

**Spec:** `docs/superpowers/specs/2026-10-05-clawd-buyucu-design.md`

## Global Constraints

- Claude Code v2.1.287 veya üstü; plugin adı `clawd-buyucu` (`claude-` ile başlayamaz), komut `/buyucu`.
- `$` yalnız `plugin/hooks/register.js`'de. Her `$` çağrısı tam yazılır (`$.store.get(...)`); `$` değişkene atanmaz, yalnız aynı dosyadaki üst düzey fonksiyonlara geçirilir.
- Modüller yalnız göreli yolla birbirini içe aktarır; dinamik `import()` yok; her dosya ES modülü.
- Terminalde `Raster` (en çok 512 sütun), bant yüksekliği 10 satır (en az 6) = 20 piksel; Desktop'ta tek satır `Text`.
- ~11 fps (`KARE_MS = 90`); tur bitince bant 2000 ms sonra kapanır.
- LLM çağrısı yok, ağ yok; arazi tohumlu ve deterministik.
- Kod tanımlayıcıları ve balon metinleri Türkçe; balon metni tek genişlikli karakterler, en çok 40 karakter.
- clawd-madenci'den kod, sprite veya metin kopyalanmaz (lisansı izin vermiyor).
- `$.store`: anahtar `acik` (boolean) ve `dolap` (`{ sayi, siseler }`, en çok 24 şişe).
- Spinner eki: `· ⚗ <n> iksir · ✦ <m>`; ikisi de 0 ise ek yok.
- Commit mesajları şu satırla biter: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`

## Review Focus

- **Paralel araç çağrıları** (ör. iki Read ile bir Bash aynı anda; Pre'ler önce, Post'lar sonra gelir): sahne `fitil` ya da `git` modunda takılı kalmamalı, TNT kendi Post'unda patlamalı. → Görev 9'da `paralel araçlar takılmaz` testi.
- **Alt ajan olayları** (`turn.complete` içinde `agentId` dolu): bant kapanmamalı, `bitti` sahnesi oynamamalı. → Görev 11'de `alt ajanın turu bandı kapatmaz` testi.
- **Terminal genişliğinin 90 sütun eşiğini aşması** (çalışırken pencere küçültülür ya da büyütülür): Clawd yeni yerleşimdeki durağına geçmeli, çizim hata vermemeli. → Görev 9'da `boyut değişince durak yeniden hesaplanır`, Görev 10'da `20×6 bant çizilir` testleri.
- **Bozuk ya da eksik araç girdisi** (`command` sayı, `file_path` yok, emoji içeren açıklama, uzun MCP adı): balon en çok 40 tek genişlikli karakter olmalı, hata atılmamalı. → Görev 2'de `bozuk girdi güvenle karşılanır` testi.
- **Bozuk ya da okunamayan store** (`dolap` dizi değil, `sayi` metin, renk aralık dışı, `store.get` reddediyor): dolap boş başlamalı, mod açık olmalı, `/buyucu` kayıtlı olmalı. → Görev 4'te `dolapOku bozuk veriyi ayıklar`, Görev 11'de `store okunamazsa varsayılanlarla açılır` testleri.

---

### Task 1: Plugin iskeleti ve `/buyucu` komutu

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.claude-plugin/marketplace.json`
- Create: `plugin/.claude-plugin/plugin.json`
- Create: `plugin/hooks/hooks.json`
- Create: `plugin/hooks/register.js`
- Test: `plugin/tests/register.test.ts`

**Interfaces:**
- Consumes: —
- Produces: yüklenebilir mod; `/buyucu` aç/kapat; store anahtarı `acik`. Görev 11 `register.js`'i bütünüyle yeniden yazar ama bu testi korur.

- [ ] **Step 1: Manifest ve yapı dosyalarını yaz**

`package.json`:
```json
{ "type": "module", "private": true }
```

`.gitignore`:
```
node_modules/
.DS_Store
plugin/.claude-plugin/types/
plugin/tsconfig.json
```

`.claude-plugin/marketplace.json`:
```json
{
  "name": "clawd-buyucu",
  "owner": { "name": "Kağan Öztürk" },
  "metadata": { "description": "Clawd Büyücü: Claude Code için piksel büyücü modu" },
  "plugins": [
    {
      "name": "clawd-buyucu",
      "source": "./plugin",
      "description": "Claude çalışırken istemin üstünde piksel Minecraft sahnesi: büyücü Clawd iksir karıştırır, dolaba dizer, canavarlara büyü atar"
    }
  ]
}
```

`plugin/.claude-plugin/plugin.json`:
```json
{
  "name": "clawd-buyucu",
  "version": "0.1.0",
  "description": "Claude çalışırken istemin üstünde piksel Minecraft sahnesi: büyücü Clawd iksir karıştırır, dolaba dizer, canavarlara büyü atar",
  "author": { "name": "Kağan Öztürk" }
}
```

`plugin/hooks/hooks.json`:
```json
{
  "description": "Clawd Büyücü hooks modülü",
  "modules": ["./register.js"]
}
```

- [ ] **Step 2: Başarısız testi yaz**

`plugin/tests/register.test.ts`:
```ts
import { expect, test } from 'claude-code/testing'

test('/buyucu modu kapatıp açar ve tercihi saklar', async ($, on) => {
  const depo = new Map<string, unknown>()
  on('store.get', ($: any, e: any) => ({ value: depo.get(e.key) }))
  on('store.set', ($: any, e: any) => {
    depo.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const kapali = await $.command.run({ command: 'buyucu', args: '' })
  expect(kapali.text).toBe('Clawd Büyücü kapalı.')
  expect(depo.get('acik')).toBe(false)

  const acik = await $.command.run({ command: 'buyucu', args: '' })
  expect(acik.text).toBe('Clawd Büyücü açık: Claude çalışırken kazanı karıştırır.')
  expect(depo.get('acik')).toBe(true)
})
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `register.js` yok (modül yüklenemedi).

- [ ] **Step 4: En küçük `register.js`'i yaz**

`plugin/hooks/register.js`:
```js
// Clawd Büyücü — Claude çalışırken istemin üstündeki bantta büyücü Clawd sahnesi.
// $ kullanan tek dosya; diğer modüller saftır.

const ACIK_ANAHTARI = 'acik'

let acik = true

export function register(on) {
  on('session.start', async ($, e, next) => {
    acik = (await $.store.get(ACIK_ANAHTARI)) !== false
    await $.command.register({ name: 'buyucu', description: 'Clawd Büyücü bandını aç/kapat', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'buyucu' }, async ($) => {
    acik = !acik
    await $.store.set(ACIK_ANAHTARI, acik)
    return { text: acik ? 'Clawd Büyücü açık: Claude çalışırken kazanı karıştırır.' : 'Clawd Büyücü kapalı.' }
  })
}
```

- [ ] **Step 5: Testi ve doğrulamayı çalıştır**

Run: `claude plugin test plugin && claude plugin validate plugin --strict`
Expected: `1 pass`, `0 fail`; validate çıktısında `hooks: session.start, command.run{command=buyucu}` ve `✔ Validation passed`.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .claude-plugin plugin
git commit -m "feat: plugin iskeleti ve /buyucu komutu

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `olay.js` — araç çağrısından eylem ve Türkçe balon

**Files:**
- Create: `plugin/hooks/olay.js`
- Test: `plugin/tests/olay.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `DUSUNUYOR`, `HATA_METNI`, `KONTROL_METNI`, `DOLAP_BOS`: string sabitleri
  - `bittiMetni(buTur: number): string`
  - `temizle(ham: unknown): string`, `kisalt(metin: string, uzunluk: number): string`
  - `dosyaAdi(yol: unknown): string`, `uzanti(yol: unknown): string` (küçük harf, noktasız; yoksa `''`)
  - `ekle(ad: string, hal: 'belirtme' | 'yonelme'): string`
  - `komutAdi(komut: unknown): string`
  - `aracBilgisi(e): { ad: string, girdi: object }` — hem `tool.call` zarfını (`e.tool` + alanlar) hem settings hook zarfını (`e.tool_name` + `e.tool_input`) kabul eder
  - `eylemOku(e): { tur: 'oku'|'insa'|'web'|'tnt'|'ajan'|'diger', metin: string, uzanti?: string }`
  - `hataMi(e): boolean` — `e.tool_response.is_error === true` ya da `isError === true`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/olay.test.ts`:
```ts
import { expect, test } from 'claude-code/testing'
import { temizle, kisalt, dosyaAdi, uzanti, ekle, komutAdi, eylemOku, hataMi, bittiMetni } from '../hooks/olay.js'

test('temizle boşlukları sadeleştirir ve çok genişlikli karakteri ? yapar', async () => {
  expect(temizle('  a\t b\n c ')).toBe('a b c')
  expect(temizle('😀x')).toBe('?x')
  expect(temizle('ğüşıöç İ')).toBe('ğüşıöç İ')
  expect(temizle(undefined)).toBe('')
})

test('kisalt uzun metni üç noktayla keser', async () => {
  expect(kisalt('kısa', 10)).toBe('kısa')
  expect(kisalt('abcdefghij', 5)).toBe('abcd…')
})

test('dosyaAdi ve uzanti yolun son parçasını alır', async () => {
  expect(dosyaAdi('/a/b/README.md')).toBe('README.md')
  expect(dosyaAdi('C:\\x\\y.ts')).toBe('y.ts')
  expect(dosyaAdi(undefined)).toBe('dosya')
  expect(uzanti('/a/b/Sahne.JS')).toBe('js')
  expect(uzanti('/a/.env')).toBe('')
  expect(uzanti(undefined)).toBe('')
})

test('ekle Türkçe belirtme ve yönelme eklerini okunuşa göre seçer', async () => {
  expect(ekle('README.md', 'belirtme')).toBe("README.md'yi")
  expect(ekle('register.js', 'belirtme')).toBe("register.js'yi")
  expect(ekle('main.py', 'belirtme')).toBe("main.py'yi")
  expect(ekle('ölçek.ts', 'belirtme')).toBe("ölçek.ts'yi")
  expect(ekle('app.tsx', 'belirtme')).toBe("app.tsx'i")
  expect(ekle('data.json', 'belirtme')).toBe("data.json'u")
  expect(ekle('config.yaml', 'belirtme')).toBe("config.yaml'ı")
  expect(ekle('Makefile', 'belirtme')).toBe("Makefile'yi")
  expect(ekle('v2', 'belirtme')).toBe("v2'yi")
  expect(ekle('.env', 'belirtme')).toBe(".env'i")
  expect(ekle('klasör', 'belirtme')).toBe("klasör'ü")
  expect(ekle('dolap.js', 'yonelme')).toBe("dolap.js'ye")
  expect(ekle('data.json', 'yonelme')).toBe("data.json'a")
})

test('komutAdi asıl komutu ve alt komutunu bulur', async () => {
  expect(komutAdi('cd x && npm test')).toBe('npm test')
  expect(komutAdi('FOO=1 node a.js')).toBe('node')
  expect(komutAdi('/usr/bin/git status --short')).toBe('git status')
  expect(komutAdi('ls -la')).toBe('ls')
  expect(komutAdi('')).toBe('komut')
})

test('eylemOku iki zarf biçimini de tanır', async () => {
  expect(eylemOku({ tool: 'Read', file_path: '/w/README.md' })).toEqual({ tur: 'oku', metin: "README.md'yi okuyor" })
  expect(eylemOku({ tool_name: 'Read', tool_input: { file_path: '/w/README.md' } })).toEqual({ tur: 'oku', metin: "README.md'yi okuyor" })
  expect(eylemOku({ tool_name: 'Grep', tool_input: { pattern: 'TODO' } })).toEqual({ tur: 'oku', metin: '"TODO" arıyor' })
  expect(eylemOku({ tool_name: 'Edit', tool_input: { file_path: '/w/sahne.js' } })).toEqual({ tur: 'insa', metin: "sahne.js'yi karıştırıyor", uzanti: 'js' })
  expect(eylemOku({ tool_name: 'Bash', tool_input: { command: 'npm test' } })).toEqual({ tur: 'tnt', metin: 'npm test patlatıyor' })
  expect(eylemOku({ tool_name: 'Agent', tool_input: { description: 'testleri yaz' } })).toEqual({ tur: 'ajan', metin: 'çırak: testleri yaz' })
  expect(eylemOku({ tool_name: 'WebFetch', tool_input: { url: 'https://www.github.com/x' } })).toEqual({ tur: 'web', metin: 'kürede: github.com' })
  expect(eylemOku({ tool_name: 'WebSearch', tool_input: { query: 'iksir' } })).toEqual({ tur: 'web', metin: 'kürede arıyor: iksir' })
  expect(eylemOku({ tool_name: 'mcp__github__get_pr' }).tur).toBe('diger')
})

test('bozuk girdi güvenle karşılanır', async () => {
  const tek = /^[\x20-\x7e\u00a0-\u024f\u2026]*$/u
  const ornekler = [
    eylemOku({ tool_name: 'Bash', tool_input: { command: 123 } }),
    eylemOku({ tool_name: 'Read', tool_input: {} }),
    eylemOku({ tool_name: 'Agent', tool_input: { description: '🧪'.repeat(80) } }),
    eylemOku({ tool_name: 'mcp__' + 'x'.repeat(200) }),
    eylemOku({}),
    eylemOku(undefined),
  ]
  for (const e of ornekler) {
    expect(Array.from(e.metin).length <= 40).toBe(true)
    expect(tek.test(e.metin)).toBe(true)
  }
})

test('hataMi iki hata alanını da tanır, bittiMetni sayıyı yazar', async () => {
  expect(hataMi({ tool_response: { is_error: true } })).toBe(true)
  expect(hataMi({ tool_response: { isError: true } })).toBe(true)
  expect(hataMi({ tool_response: 'tamam' })).toBe(false)
  expect(hataMi({})).toBe(false)
  expect(bittiMetni(3)).toBe('Bitti! 3 iksir hazır')
  expect(bittiMetni(0)).toBe('Bitti!')
})
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/olay.js` bulunamadı.

- [ ] **Step 3: `olay.js`'i yaz**

`plugin/hooks/olay.js`:
```js
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
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS (register 1 + olay 8).

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/olay.js plugin/tests/olay.test.ts
git commit -m "feat: araç çağrısından eylem ve Türkçe balon metni

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `sprite.js` — renkler ve piksel sprite'ları

**Files:**
- Create: `plugin/hooks/sprite.js`
- Test: `plugin/tests/sprite.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `RENK`: `{ [ad]: number }` 24 bit RGB renkler (aşağıdaki tüm adlar sonraki görevlerde kullanılır)
  - `SPRITE`: `{ [ad]: { gen, yuk, satirlar: string[], palet: { [harf]: number } } }`; `'.'` saydam
  - `OZEL_HARFLER`: `Set(['L', 'C', 'R'])` — renkleri çizim anında verilen harfler (sıvı, küre içi, çırak rengi)
  - `beyazPalet(sp): { [harf]: number }` — sprite'ın tüm palet harflerini beyaza çevirir (vurulma/yanıp sönme)

- [ ] **Step 1: Başarısız testi yaz**

`plugin/tests/sprite.test.ts`:
```ts
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
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/sprite.js` bulunamadı.

- [ ] **Step 3: `sprite.js`'i yaz**

`plugin/hooks/sprite.js`:
```js
// Clawd Büyücü — renkler ve piksel sprite'ları. Saf veri; $ kullanmaz.
// Sprite satır dizisidir: '.' saydam, diğer harf paletteki renk. L, C, R renkleri çizimde verilir.

export const RENK = {
  turuncu: 0xd97757, turuncuKoyu: 0xa9553a, goz: 0x2a1a12,
  mor: 0x6b4fbb, morKoyu: 0x48338a, yildiz: 0xf5d76e,
  asa: 0x8a5a2b, portal: 0x9b4fe0, portalAcik: 0xd6a8ff,
  cim: 0x5fae3e, cimKoyu: 0x3f8a2a, toprak: 0x8b5a3c, toprakKoyu: 0x6b432b, tas: 0x7f7f86, tasKoyu: 0x5c5c63,
  duvar: 0x2e2219, duvarCizgi: 0x3a2b1f, duvarKoyu: 0x1f1610, tugla: 0x6d6d73, tuglaKoyu: 0x4e4e54,
  tahta: 0xa87b4f, tahtaKoyu: 0x6e4d2e,
  kazan: 0x3b3b44, kazanKoyu: 0x24242a, iksir: 0xa05ce0,
  sayfa: 0xf0e6c8, sayfaKoyu: 0xc9bb93, kure: 0x9fd8f0, kureIc: 0xe8f6ff,
  tnt: 0xd03a2f, tntKoyu: 0x9e2a22, beyaz: 0xffffff, siyah: 0x161616,
  creeper: 0x4caf50, creeperKoyu: 0x2e7d32,
  zombi: 0x5d9b4a, gomlek: 0x2fa3b5, pantolon: 0x3a4aa0,
  kemik: 0xe0e0d8, kemikKoyu: 0xa8a89e, orumcek: 0x3a3030, kirmizi: 0xd02020,
  slime: 0x7fd36a, slimeKoyu: 0x4f9e3e, mantar: 0xc8302a, sap: 0xe8dcc0, cicek: 0xf2d43a, et: 0x9a5a3a, etKoyu: 0x6e3a24,
  alev: 0xff8a1f, kivilcim: 0xffd25e, duman: 0x9a9a9a, balon: 0xf2ecd9, balonYazi: 0x1e1e1e,
}

export const OZEL_HARFLER = new Set(['L', 'C', 'R'])

function P(satirlar, palet = {}) {
  return { gen: satirlar[0].length, yuk: satirlar.length, satirlar, palet }
}

const TURUNCU = { O: RENK.turuncu, o: RENK.turuncuKoyu, K: RENK.goz }
const KURSU = { P: RENK.sayfa, p: RENK.sayfaKoyu, w: RENK.tahtaKoyu }

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
  kazan: P(['kkkkkkkkk', 'kLLLLLLLk', 'kKKKKKKKk', '.kKKKKKk.', '..k...k..'], { k: RENK.kazan, K: RENK.kazanKoyu }),
  kursu: P(['PpPpP', 'wwwww', '..w..', '..w..', '..w..', '.www.'], KURSU),
  kursu2: P(['pPpPp', 'wwwww', '..w..', '..w..', '..w..', '.www.'], KURSU),
  kure: P(['.cc.', 'cCCc', '.cc.', '.ww.', 'wwww'], { c: RENK.kure, w: RENK.tahtaKoyu }),
  sise: P(['.q.', 'LLL', 'LLL'], { q: RENK.tahta }),
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
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/sprite.js plugin/tests/sprite.test.ts
git commit -m "feat: renkler ve piksel sprite'ları

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `lab.js` — lab yerleşimi, dolap ve şişe renkleri

**Files:**
- Create: `plugin/hooks/lab.js`
- Test: `plugin/tests/lab.test.ts`

**Interfaces:**
- Consumes: `RENK` (`sprite.js`)
- Produces:
  - `CLAWD_GEN = 7`, `DAR_ESIK = 90`
  - `labYerlesimi(genislik): { dolapX: number|null, dolapGen, okuX, kursuX: number|null, webX, kureX: number|null, insaX, kazanX, son }` — `genislik < 90` ise dar yerleşim (yalnız kazan)
  - `durak(lab, tur: 'oku'|'web'|'insa'|'dolap'): { x, yon: 1|-1 }`
  - `asaUcuX(v: { x, yon }): number` — asanın ucunun x'i
  - `VARSAYILAN_SISE`, `PARLAK_EN_COK = 3`, `siseRengi(uzanti): number`, `yeniSise(uzanti, malzeme): { renk, parlak }`
  - `DOLAP_SAKLA = 24`, `RAF_SAYISI = 3`, `RAF_KAPASITE = 4`
  - `dolabaEkle(dolap, sise): Sise[]`, `gorunenSiseler(dolap): Sise[]`, `sisePikseli(lab, i): { x, y }`
  - `dolapOku(ham): { sayi, siseler }`, `dolapKaydi(sayi, siseler): { sayi, siseler }`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/lab.test.ts`:
```ts
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
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/lab.js` bulunamadı.

- [ ] **Step 3: `lab.js`'i yaz**

`plugin/hooks/lab.js`:
```js
// Clawd Büyücü — lab yerleşimi, dolap rafları ve şişe renkleri. Saf; $ kullanmaz.
// Raster'da 1 sütun = 1 piksel; tüm x değerleri piksel.

import { RENK } from './sprite.js'

export const CLAWD_GEN = 7
export const DAR_ESIK = 90

// Soldan sağa: dolap | Clawd'un okuma durağı | kürsü | web durağı | küre | inşa durağı | kazan
const GENIS = { dolapX: 1, dolapGen: 14, okuX: 16, kursuX: 23, webX: 29, kureX: 36, insaX: 41, kazanX: 48, son: 59 }
// Dar bantta yalnız kazan kalır; her iş kazanın başında yapılır
const DAR = { dolapX: null, dolapGen: 0, okuX: 1, kursuX: null, webX: 1, kureX: null, insaX: 1, kazanX: 8, son: 19 }

export function labYerlesimi(genislik) {
  return genislik < DAR_ESIK ? DAR : GENIS
}

export function durak(lab, tur) {
  if (tur === 'oku') return { x: lab.okuX, yon: 1 }
  if (tur === 'web') return { x: lab.webX, yon: 1 }
  if (tur === 'insa') return { x: lab.insaX, yon: 1 }
  if (tur === 'dolap') return { x: lab.okuX, yon: -1 }
  return { x: lab.son + 1, yon: 1 }
}

export function asaUcuX(v) {
  return v.yon > 0 ? v.x + CLAWD_GEN : v.x - 1
}

// ---- Şişeler ----
const SISE_RENGI = {
  js: 0xf2c12e, mjs: 0xf2c12e, cjs: 0xf2c12e, jsx: 0xf2c12e, ts: 0xf2c12e, tsx: 0xf2c12e,
  md: 0x4f8fe8, mdx: 0x4f8fe8, py: 0x5cc85c, json: 0xf08a24, css: 0xf06ab0, html: 0xf06ab0,
}
export const VARSAYILAN_SISE = RENK.iksir
export const PARLAK_EN_COK = 3

export function siseRengi(uz) {
  return SISE_RENGI[String(uz ?? '').toLowerCase()] ?? VARSAYILAN_SISE
}

export function yeniSise(uz, malzeme) {
  return { renk: siseRengi(uz), parlak: Math.max(0, Math.min(PARLAK_EN_COK, malzeme | 0)) }
}

// ---- Dolap ----
export const DOLAP_SAKLA = 24
export const RAF_SAYISI = 3
export const RAF_KAPASITE = 4

export function dolabaEkle(dolap, sise) {
  return [...dolap, sise].slice(-DOLAP_SAKLA)
}

// Raflar dolunca en eski raf bütünüyle kayar
export function gorunenSiseler(dolap) {
  const kapasite = RAF_SAYISI * RAF_KAPASITE
  if (dolap.length <= kapasite) return dolap
  const atla = Math.ceil((dolap.length - kapasite) / RAF_KAPASITE) * RAF_KAPASITE
  return dolap.slice(atla)
}

// Dolaptaki i. şişenin sol üst pikseli; şişe 3×3, raf tahtaları y = 1, 5, 9, 13
export function sisePikseli(lab, i) {
  const raf = Math.floor(i / RAF_KAPASITE)
  const sira = i % RAF_KAPASITE
  return { x: lab.dolapX + 1 + sira * 3, y: 2 + raf * 4 }
}

function gecerliSise(s) {
  return !!s && Number.isInteger(s.renk) && s.renk >= 0 && s.renk <= 0xffffff
    && Number.isInteger(s.parlak) && s.parlak >= 0 && s.parlak <= PARLAK_EN_COK
}

export function dolapOku(ham) {
  const siseler = Array.isArray(ham?.siseler) ? ham.siseler.filter(gecerliSise).slice(-DOLAP_SAKLA) : []
  const sayi = Number.isInteger(ham?.sayi) && ham.sayi >= siseler.length ? ham.sayi : siseler.length
  return { sayi, siseler }
}

export function dolapKaydi(sayi, siseler) {
  return { sayi, siseler: siseler.slice(-DOLAP_SAKLA) }
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS. (`dolapOku` örneğinde `sayi: 1` iki geçerli şişeden az olduğu için 2'ye düzeltilir.)

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/lab.js plugin/tests/lab.test.ts
git commit -m "feat: lab yerleşimi, dolap rafları ve şişe renkleri

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `fizik.js` — zar, yerçekimi, parçacık, mermi

**Files:**
- Create: `plugin/hooks/fizik.js`
- Test: `plugin/tests/fizik.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `DUNYA_YUK = 20`, `YER = 14` (çimenin ilk satırı; varlıkların ayağı `YER - 1`), `PARCA_SINIR = 120`, `MERMI_HIZ = 2.5`
  - `zar(a: number, b: number): number` — [0, 1), deterministik
  - `yerCekimi(v: { zy, vy }): typeof v`, `yerde(v): boolean`
  - `parcaSac(parca, tohum, x, y, renkSec: (i) => number, adet, hiz): Parca[]`
  - `yukselen(parca, tohum, x, y, renk): Parca[]` — yerçekimsiz, yukarı süzülen tek parçacık
  - `parcaAdim(parca): Parca[]`
  - `mermiAt(mermiler, x, y, yon, sahip): Mermi[]`, `mermiAdim(mermiler, genislik): Mermi[]`
  - Parça: `{ x, y, vx, vy, renk, omur, hafif? }`; Mermi: `{ x, y, vx, sahip, omur }`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/fizik.test.ts`:
```ts
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
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/fizik.js` bulunamadı.

- [ ] **Step 3: `fizik.js`'i yaz**

`plugin/hooks/fizik.js`:
```js
// Clawd Büyücü — deterministik zar, yerçekimi, parçacıklar ve büyü mermileri. Saf; $ kullanmaz.
// Dünya 20 piksel yüksekliğinde; y aşağı doğru artar. zy ise yerden yükseklik (yukarı +).

export const DUNYA_YUK = 20
export const YER = 14
export const PARCA_SINIR = 120
export const MERMI_HIZ = 2.5
const YERCEKIMI = 0.5
const PARCA_YERCEKIMI = 0.25
const MERMI_SINIR = 12

export function zar(a, b) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be5ab, 0x85ebca77)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function yerCekimi(v) {
  if (v.zy <= 0 && v.vy <= 0) return v.zy === 0 && v.vy === 0 ? v : { ...v, zy: 0, vy: 0 }
  const vy = v.vy - YERCEKIMI
  const zy = Math.max(0, v.zy + vy)
  return { ...v, zy, vy: zy === 0 ? 0 : vy }
}

export function yerde(v) {
  return v.zy === 0
}

// Yukarı yarım daireye saçılan parçacıklar
export function parcaSac(parca, tohum, x, y, renkSec, adet, hiz) {
  const yeni = Array.from({ length: adet }, (_, i) => {
    const aci = Math.PI * (0.1 + 0.8 * zar(tohum, i * 3 + 1))
    const guc = hiz * (0.4 + 0.6 * zar(tohum, i * 3 + 2))
    return { x, y, vx: Math.cos(aci) * guc, vy: -Math.sin(aci) * guc, renk: renkSec(i), omur: 8 + Math.floor(zar(tohum, i * 3 + 3) * 10) }
  })
  return [...parca, ...yeni].slice(-PARCA_SINIR)
}

export function yukselen(parca, tohum, x, y, renk) {
  const yeni = { x, y, vx: (zar(tohum, 5) - 0.5) * 0.3, vy: -0.3, renk, omur: 10, hafif: true }
  return [...parca, yeni].slice(-PARCA_SINIR)
}

export function parcaAdim(parca) {
  const sonraki = []
  for (const p of parca) {
    if (p.omur <= 1) continue
    let vx = p.vx
    let vy = p.vy + (p.hafif ? 0 : PARCA_YERCEKIMI)
    let y = p.y + vy
    if (!p.hafif && y >= YER) {
      y = YER - 0.5
      vy = -vy * 0.3
      vx *= 0.6
    }
    sonraki.push({ ...p, x: p.x + vx, y, vx, vy, omur: p.omur - 1 })
  }
  return sonraki
}

export function mermiAt(mermiler, x, y, yon, sahip) {
  return [...mermiler, { x, y, vx: MERMI_HIZ * yon, sahip, omur: 40 }].slice(-MERMI_SINIR)
}

export function mermiAdim(mermiler, genislik) {
  return mermiler
    .filter((m) => m.omur > 1)
    .map((m) => ({ ...m, x: m.x + m.vx, omur: m.omur - 1 }))
    .filter((m) => m.x >= -2 && m.x <= genislik + 2)
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/fizik.js plugin/tests/fizik.test.ts
git commit -m "feat: zar, yerçekimi, parçacık ve büyü mermisi

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `arazi.js` — tohumlu arazi, süs blokları ve bitkiler

**Files:**
- Create: `plugin/hooks/arazi.js`
- Test: `plugin/tests/arazi.test.ts`

**Interfaces:**
- Consumes: `zar` (`fizik.js`), `labYerlesimi` (`lab.js`)
- Produces:
  - `BLOK_GEN = 4`, `BITKI_ARALIK = 160`, `BITKILER = ['mantar', 'cicek']`
  - `alan(genislik): { bas, son }` — Clawd'un dolaştığı arazi aralığı (`bas = lab.son + 1`)
  - `araziUret(genislik, tohum): { bloklar: { x, tip: 'tas'|'kutuk'|'yaprak', yok: number }[], esyalar: { x, tur }[] }` — bloklar süstür, çarpışmaz; `yok > 0` ise o kareye kadar kırık
  - `bitkiYenile(esyalar, genislik, kare, tohum): Esya[]`
  - `bloklarYenile(bloklar, kare): Blok[]`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/arazi.test.ts`:
```ts
import { expect, test } from 'claude-code/testing'
import { alan, araziUret, bitkiYenile, bloklarYenile, BITKI_ARALIK, BLOK_GEN } from '../hooks/arazi.js'

test('alan labın bittiği yerden başlar', async () => {
  expect(alan(120)).toEqual({ bas: 60, son: 112 })
  expect(alan(80)).toEqual({ bas: 20, son: 72 })
  expect(alan(20)).toEqual({ bas: 20, son: 20 })
})

test('arazi aynı tohumla aynı, farklı tohumla farklı', async () => {
  expect(araziUret(160, 7)).toEqual(araziUret(160, 7))
  expect(JSON.stringify(araziUret(160, 7)) === JSON.stringify(araziUret(160, 8))).toBe(false)
})

test('bloklar ve bitkiler arazinin içinde', async () => {
  for (const genislik of [20, 80, 120, 300]) {
    const { bas, son } = alan(genislik)
    const { bloklar, esyalar } = araziUret(genislik, 3)
    for (const b of bloklar) expect(b.x >= bas && b.x + BLOK_GEN <= son).toBe(true)
    for (const e of esyalar) expect(e.x >= bas && e.x < son).toBe(true)
  }
  expect(araziUret(300, 3).esyalar.length > 0).toBe(true)
})

test('bitki yalnız aralık karesinde ve sınırın altındayken eklenir', async () => {
  expect(bitkiYenile([], 300, BITKI_ARALIK + 1, 7)).toEqual([])
  const eklendi = bitkiYenile([], 300, BITKI_ARALIK, 7)
  expect(eklendi.length).toBe(1)
  const { bas, son } = alan(300)
  expect(eklendi[0].x >= bas && eklendi[0].x < son).toBe(true)
  const dolu = Array.from({ length: 20 }, (_, i) => ({ x: 100 + i, tur: 'mantar' }))
  expect(bitkiYenile(dolu, 300, BITKI_ARALIK, 7)).toBe(dolu)
})

test('kırık blok zamanı gelince geri gelir', async () => {
  const bloklar = [{ x: 70, tip: 'tas', yok: 50 }, { x: 90, tip: 'kutuk', yok: 0 }]
  expect(bloklarYenile(bloklar, 49)).toBe(bloklar)
  expect(bloklarYenile(bloklar, 50)).toEqual([{ x: 70, tip: 'tas', yok: 0 }, { x: 90, tip: 'kutuk', yok: 0 }])
})
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/arazi.js` bulunamadı.

- [ ] **Step 3: `arazi.js`'i yaz**

`plugin/hooks/arazi.js`:
```js
// Clawd Büyücü — tohumlu arazi: süs blokları ve toplanacak bitkiler. Saf; $ kullanmaz.

import { zar } from './fizik.js'
import { labYerlesimi } from './lab.js'

export const BLOK_GEN = 4
export const BITKI_ARALIK = 160
export const BITKILER = ['mantar', 'cicek']
const BLOK_TIPLERI = ['tas', 'kutuk', 'yaprak']

export function alan(genislik) {
  const lab = labYerlesimi(genislik)
  return { bas: lab.son + 1, son: Math.max(lab.son + 1, genislik - 8) }
}

function sec(liste, z) {
  return liste[Math.floor(z * liste.length)]
}

export function araziUret(genislik, tohum) {
  const { bas, son } = alan(genislik)
  const bloklar = []
  for (let x = bas, i = 0; ; i++) {
    x += 10 + Math.floor(zar(tohum, 100 + i) * 18)
    if (x + BLOK_GEN > son) break
    bloklar.push({ x, tip: sec(BLOK_TIPLERI, zar(tohum, 200 + i)), yok: 0 })
  }
  const esyalar = []
  for (let x = bas + 3, i = 0; ; i++) {
    x += 14 + Math.floor(zar(tohum, 300 + i) * 20)
    if (x >= son) break
    esyalar.push({ x, tur: sec(BITKILER, zar(tohum, 400 + i)) })
  }
  return { bloklar, esyalar }
}

export function bitkiYenile(esyalar, genislik, kare, tohum) {
  if (kare % BITKI_ARALIK !== 0) return esyalar
  const { bas, son } = alan(genislik)
  if (son - bas < 10) return esyalar
  const bitkiSayisi = esyalar.filter((e) => BITKILER.includes(e.tur)).length
  if (bitkiSayisi >= Math.max(1, Math.floor((son - bas) / 30))) return esyalar
  const x = bas + 2 + Math.floor(zar(tohum + kare, 7) * (son - bas - 4))
  return [...esyalar, { x, tur: sec(BITKILER, zar(kare, tohum)) }]
}

export function bloklarYenile(bloklar, kare) {
  if (!bloklar.some((b) => b.yok && b.yok <= kare)) return bloklar
  return bloklar.map((b) => (b.yok && b.yok <= kare ? { ...b, yok: 0 } : b))
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/arazi.js plugin/tests/arazi.test.ts
git commit -m "feat: tohumlu arazi, süs blokları ve bitkiler

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `canavar.js` — doğma, yürüme, vurulma, malzeme

**Files:**
- Create: `plugin/hooks/canavar.js`
- Test: `plugin/tests/canavar.test.ts`

**Interfaces:**
- Consumes: `zar`, `yerCekimi` (`fizik.js`), `alan` (`arazi.js`)
- Produces:
  - `CANAVAR: { [tur]: { can, hiz, gen, dusurur } }` — türler `zombi`, `iskelet`, `orumcek`, `slime`
  - `DOGUM_ARALIK = 70`, `EN_COK_CANAVAR = 2`, `YAKIN = 7`
  - Canavar: `{ tur, x, zy, vy, can, kare, vurulma }`
  - `canavarDogur(canavarlar, genislik, kare, tohum): Canavar | null`
  - `canavarAdim(c, hedefX, durgun: boolean): Canavar`
  - `vurusKontrol(canavarlar, mermiler): { canavarlar, mermiler, olenler }`
  - `dusur(olenler): { x, tur }[]`
  - `enYakin(canavarlar, x): { canavar, fark, mesafe } | null` — `fark = canavar merkezi - x`
  - `topla(esyalar, x, gen): { esyalar, toplanan: number }`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/canavar.test.ts`:
```ts
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
  expect(canavarDogur([], 80, DOGUM_ARALIK, 7)).not.toBe(null)
  expect(canavarDogur([], 40, DOGUM_ARALIK, 7)).toBe(null)
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
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/canavar.js` bulunamadı.

- [ ] **Step 3: `canavar.js`'i yaz**

`plugin/hooks/canavar.js`:
```js
// Clawd Büyücü — canavarlar: doğma, yürüme, vurulma ve düşürdükleri malzeme. Saf; $ kullanmaz.

import { zar, yerCekimi } from './fizik.js'
import { alan } from './arazi.js'

export const CANAVAR = {
  zombi: { can: 3, hiz: 0.3, gen: 5, dusurur: 'et' },
  iskelet: { can: 2, hiz: 0.35, gen: 5, dusurur: 'kemik' },
  orumcek: { can: 2, hiz: 0.5, gen: 8, dusurur: 'goz' },
  slime: { can: 1, hiz: 0.4, gen: 5, dusurur: 'slimeTopu' },
}
const TURLER = Object.keys(CANAVAR)
export const DOGUM_ARALIK = 70
export const EN_COK_CANAVAR = 2
export const YAKIN = 7
const SLIME_ZIPLAMA = 14

function merkez(c) {
  return c.x + CANAVAR[c.tur].gen / 2
}

export function canavarDogur(canavarlar, genislik, kare, tohum) {
  if (kare % DOGUM_ARALIK !== 0 || canavarlar.length >= EN_COK_CANAVAR) return null
  const { bas, son } = alan(genislik)
  if (son - bas < 30) return null
  const tur = TURLER[Math.floor(zar(kare, tohum + 11) * TURLER.length)]
  return { tur, x: genislik - 1, zy: 0, vy: 0, can: CANAVAR[tur].can, kare: 0, vurulma: 0 }
}

export function canavarAdim(c, hedefX, durgun) {
  const kare = c.kare + 1
  const vurulma = Math.max(0, c.vurulma - 1)
  if (durgun) return { ...c, kare, vurulma }
  const fark = hedefX - merkez(c)
  if (Math.abs(fark) <= YAKIN) return { ...c, kare, vurulma }
  const hiz = CANAVAR[c.tur].hiz
  if (c.tur !== 'slime') return { ...c, kare, vurulma, x: c.x + Math.sign(fark) * hiz }
  // Slime yerdeyken bekler, belli aralıkla zıplar; yalnız havadayken ilerler
  const havada = c.zy > 0 || c.vy > 0
  const vy = !havada && kare % SLIME_ZIPLAMA === 0 ? 2 : c.vy
  const sonraki = yerCekimi({ ...c, vy })
  const ilerler = havada || vy > 0
  return { ...sonraki, kare, vurulma, x: ilerler ? c.x + Math.sign(fark) * hiz * 2 : c.x }
}

export function vurusKontrol(canavarlar, mermiler) {
  let guncel = canavarlar
  const kalanMermi = []
  for (const m of mermiler) {
    const i = guncel.findIndex((c) => m.x >= c.x - 1 && m.x <= c.x + CANAVAR[c.tur].gen)
    if (i === -1) {
      kalanMermi.push(m)
      continue
    }
    guncel = guncel.map((c, j) => (j === i ? { ...c, can: c.can - 1, vurulma: 3 } : c))
  }
  return {
    canavarlar: guncel.filter((c) => c.can > 0),
    mermiler: kalanMermi,
    olenler: guncel.filter((c) => c.can <= 0),
  }
}

export function dusur(olenler) {
  return olenler.map((c) => ({ x: Math.round(merkez(c)) - 1, tur: CANAVAR[c.tur].dusurur }))
}

export function enYakin(canavarlar, x) {
  let sonuc = null
  for (const c of canavarlar) {
    const fark = merkez(c) - x
    if (!sonuc || Math.abs(fark) < sonuc.mesafe) sonuc = { canavar: c, fark, mesafe: Math.abs(fark) }
  }
  return sonuc
}

// Eşyalar 2 piksel genişliğinde; Clawd'un [x, x+gen-1] aralığına değen toplanır
export function topla(esyalar, x, gen) {
  const kalan = []
  let toplanan = 0
  for (const e of esyalar) {
    if (e.x + 1 >= x && e.x <= x + gen - 1) toplanan += 1
    else kalan.push(e)
  }
  return { esyalar: kalan, toplanan }
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/canavar.js plugin/tests/canavar.test.ts
git commit -m "feat: canavarlar, vurulma ve düşen malzeme

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `oyuncu.js` — 1–5 tuşları ve iksir etkileri

**Files:**
- Create: `plugin/hooks/oyuncu.js`
- Test: `plugin/tests/oyuncu.test.ts`

**Interfaces:**
- Consumes: `yerde`, `mermiAt`, `parcaSac`, `YER` (`fizik.js`); `CLAWD_GEN`, `asaUcuX` (`lab.js`); `KONTROL_METNI`, `DOLAP_BOS`, `DUSUNUYOR` (`olay.js`)
- Produces:
  - `KONTROL_KARE = 55`, `ETKI_KARE = 60`
  - `oyuncuOlayi(s, komut: 'zipla'|'sol'|'sag'|'buyu'|'iksir'): Sahne` — `fitil`, `creeper`, `dolap`, `bitti` modlarında durumu değiştirmez
  - `oyuncuAdim(s): Sahne` — oyuncu kontrolündeki bir kare
  - Kullandığı sahne alanları: `kare, mod, modKare, genislik, x, zy, vy, yon, hedef, dusunAt, balon, balonKare, oyuncu, yuruKalan, atesBekleme, mermiler, parca, dolap, iksirSayisi, etki`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/oyuncu.test.ts`:
```ts
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
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/oyuncu.js` bulunamadı.

- [ ] **Step 3: `oyuncu.js`'i yaz**

`plugin/hooks/oyuncu.js`:
```js
// Clawd Büyücü — oyuncu kontrolü: 1–5 tuşları ve iksir etkileri. Saf; $ kullanmaz.

import { yerde, mermiAt, parcaSac, YER } from './fizik.js'
import { CLAWD_GEN, asaUcuX } from './lab.js'
import { KONTROL_METNI, DOLAP_BOS, DUSUNUYOR } from './olay.js'

export const KONTROL_KARE = 55 // ~5 sn
export const ETKI_KARE = 60
const ADIM_KARE = 6
const ETKILER = ['hiz', 'ziplama', 'parlama']
const KILITLI = new Set(['fitil', 'creeper', 'dolap', 'bitti'])
const LAB_ISI = new Set(['oku', 'web', 'insa', 'git'])

export function oyuncuOlayi(s, komut) {
  if (KILITLI.has(s.mod)) return s
  const t = {
    ...s, oyuncu: KONTROL_KARE, hedef: null, dusunAt: null, balon: KONTROL_METNI, balonKare: s.kare,
    ...(LAB_ISI.has(s.mod) ? { mod: 'dusun', modKare: 0 } : {}),
  }
  if (komut === 'zipla') return yerde(t) ? { ...t, vy: t.etki?.tur === 'ziplama' ? 4.5 : 3 } : t
  if (komut === 'sol' || komut === 'sag') return { ...t, yon: komut === 'sol' ? -1 : 1, yuruKalan: ADIM_KARE }
  if (komut === 'buyu') {
    if (t.atesBekleme > 0) return t
    return { ...t, atesBekleme: 4, mermiler: mermiAt(t.mermiler, asaUcuX(t), YER - 6, t.yon, 'clawd') }
  }
  if (komut === 'iksir') return iksirIc(t)
  return t
}

function iksirIc(s) {
  const sise = s.dolap.at(-1)
  if (!sise) return { ...s, balon: DOLAP_BOS }
  const tur = ETKILER[s.iksirSayisi % ETKILER.length]
  return {
    ...s,
    dolap: s.dolap.slice(0, -1),
    iksirSayisi: Math.max(0, s.iksirSayisi - 1),
    etki: { tur, kalan: ETKI_KARE, renk: sise.renk },
    parca: parcaSac(s.parca, s.kare, s.x + 3, YER - 6, () => sise.renk, 10, 0.9),
  }
}

export function oyuncuAdim(s) {
  const oyuncu = Math.max(0, s.oyuncu - 1)
  let t = { ...s, oyuncu }
  if (s.yuruKalan > 0) {
    const hiz = s.etki?.tur === 'hiz' ? 2 : 1
    const x = Math.max(0, Math.min(s.genislik - CLAWD_GEN, s.x + s.yon * hiz))
    t = { ...t, x, yuruKalan: s.yuruKalan - 1 }
  }
  if (s.etki?.tur === 'parlama' && s.kare % 3 === 0) {
    t = { ...t, parca: parcaSac(t.parca, s.kare, t.x + 3, YER - 8, () => s.etki.renk, 2, 0.5) }
  }
  if (oyuncu === 0) t = { ...t, balon: DUSUNUYOR, balonKare: s.kare }
  return t
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS. (Etki `ETKILER[iksirSayisi % 3]` ile seçilir: 3 şişede `hiz`.)

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/oyuncu.js plugin/tests/oyuncu.test.ts
git commit -m "feat: oyuncu kontrolü ve iksir etkileri

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `sahne.js` — durum makinesi

**Files:**
- Create: `plugin/hooks/sahne.js`
- Test: `plugin/tests/sahne.test.ts`
- Test: `plugin/tests/sahne-olaylar.test.ts`

**Interfaces:**
- Consumes: Görev 2–8'deki tüm üretilenler (adlarıyla, aşağıdaki kodda görüldüğü gibi)
- Produces:
  - `BALON_EN_AZ = 22`, `ISINLANMA_ESIK = 32`, `FITIL_EN_AZ = 10`, `CREEPER_SURE = 36`
  - `yeniSahne(genislik = 120, tohum = 7): Sahne`
  - `olayUygula(s, olay): Sahne` — olaylar:
    - `{ tip: 'basla' }`, `{ tip: 'bitti' }`, `{ tip: 'boyut', genislik }`, `{ tip: 'dolapYukle', sayi, siseler }`
    - `{ tip: 'eylem', tur, metin, uzanti? }`, `{ tip: 'eylemBitti', tur, uzanti? }`, `{ tip: 'hata', tur }`
    - `{ tip: 'oyuncu', komut }`
  - `adim(s): Sahne`
  - Sahne alanları (Görev 10 ve 11 okur): `kare, mod ('dusun'|'git'|'oku'|'web'|'insa'|'dolap'|'fitil'|'creeper'|'bitti'), modKare, genislik, tohum, x, zy, vy, yon, hedef, isinlanma, balon, balonKare, dusunAt, tasinan, dolap, iksirSayisi, buTur, malzeme, bekleyen, kazanRengi, canavarlar, mermiler, parca, esyalar, bloklar, ciraklar ({ id, x, renk, durum: 'giris'|'aktif'|'cikis', kare, atesBekleme, yon }), sonrakiId, atesBekleme, tnt ({ x, kare, patlaAt }), patlama ({ x, y, kare }), creeper ({ x, beyaz, patladi }), sapka ({ x, zy, vx, vy }), kuyruk, oyuncu, yuruKalan, etki`

- [ ] **Step 1: Temel davranış testlerini yaz**

`plugin/tests/sahne.test.ts`:
```ts
import { expect, test } from 'claude-code/testing'
import { yeniSahne, olayUygula, adim, BALON_EN_AZ } from '../hooks/sahne.js'

const ilerle = (s: any, n: number) => { for (let i = 0; i < n; i++) s = adim(s); return s }
const eylem = (tur: string, metin = 'iş', uzanti?: string) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur: string, uzanti?: string) => ({ tip: 'eylemBitti', tur, uzanti })
const zombi = (x: number) => ({ tur: 'zombi', x, zy: 0, vy: 0, can: 3, kare: 0, vurulma: 0 })

test('yeni sahne labın hemen dışında düşünerek başlar', async () => {
  const s = yeniSahne(160)
  expect(s.mod).toBe('dusun')
  expect(s.x).toBe(60)
  expect(s.balon).toBe('düşünüyor…')
})

test('düşünürken araziye yürür ve malzeme toplar', async () => {
  const s = ilerle(yeniSahne(160), 10)
  expect(s.x).toBe(70)
  expect(ilerle(yeniSahne(160), 60).malzeme > 0).toBe(true)
})

test('yakındaki canavara döner, büyü atar ve öldürür', async () => {
  let s = { ...yeniSahne(160), canavarlar: [zombi(85)] }
  s = adim(s)
  expect(s.mermiler.length).toBe(1)
  expect(s.x).toBe(60)
  s = ilerle(s, 40)
  expect(s.canavarlar.length).toBe(0)
})

test('uzaktaysa laba ışınlanır, yakınsa yürür', async () => {
  const uzak = olayUygula(yeniSahne(160), eylem('oku', "README.md'yi okuyor"))
  expect(uzak.mod).toBe('oku')
  expect(uzak.x).toBe(16)
  expect(uzak.isinlanma).toBe(6)
  expect(uzak.balon).toBe("README.md'yi okuyor")
  const yakin = olayUygula({ ...yeniSahne(160), x: 40 }, eylem('oku'))
  expect(yakin.mod).toBe('git')
  const vardi = ilerle(yakin, 25)
  expect(vardi.mod).toBe('oku')
  expect(vardi.x).toBe(16)
})

test('balon en az iki saniye kalır, sonra düşünmeye döner', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('oku')), bitti('oku'))
  s = ilerle(s, BALON_EN_AZ - 1)
  expect(s.mod).toBe('oku')
  s = ilerle(s, 2)
  expect(s.mod).toBe('dusun')
  expect(s.balon).toBe('düşünüyor…')
})

test('düzenleme bitince dolaba tam bir şişe konur', async () => {
  let s = olayUygula(yeniSahne(160), eylem('insa', "sahne.js'yi karıştırıyor", 'js'))
  expect(s.kazanRengi).toBe(0xf2c12e)
  s = olayUygula(s, bitti('insa', 'js'))
  expect(s.tasinan).toEqual({ renk: 0xf2c12e, parlak: 0 })
  s = ilerle(s, 10)
  expect(s.dolap).toEqual([{ renk: 0xf2c12e, parlak: 0 }])
  expect(s.iksirSayisi).toBe(1)
  expect(s.buTur).toBe(1)
  expect(s.tasinan).toBe(null)
  expect(s.mod).toBe('dusun')
})

test('toplanan malzeme şişeyi parlatır', async () => {
  let s = { ...yeniSahne(160), bekleyen: 2 }
  s = olayUygula(olayUygula(s, eylem('insa', 'x', 'md')), bitti('insa', 'md'))
  expect(s.tasinan).toEqual({ renk: 0x4f8fe8, parlak: 2 })
  expect(s.bekleyen).toBe(0)
})

test('şişe taşırken yeni iş gelirse şişe hemen dolaba konur', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('insa', 'x', 'js')), bitti('insa', 'js'))
  s = olayUygula(s, eylem('oku'))
  expect(s.tasinan).toBe(null)
  expect(s.dolap.length).toBe(1)
})

test('dar bantta şişe yürümeden sayaca eklenir', async () => {
  const s = olayUygula(olayUygula(yeniSahne(80), eylem('insa', 'x', 'py')), bitti('insa', 'py'))
  expect(s.dolap.length).toBe(1)
  expect(s.tasinan).toBe(null)
})

test('bitti dolabın önünde kutlar, yeni tur düşünmeye döndürür', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('insa', 'x', 'js')), bitti('insa', 'js'))
  s = olayUygula(s, { tip: 'bitti' })
  expect(s.mod).toBe('bitti')
  expect(s.x).toBe(16)
  expect(s.balon).toBe('Bitti! 1 iksir hazır')
  expect(olayUygula(s, eylem('oku'))).toBe(s)
  const yeni = olayUygula(s, { tip: 'basla' })
  expect(yeni.mod).toBe('dusun')
  expect(yeni.buTur).toBe(0)
})

test('dolapYukle kayıtlı dolabı getirir', async () => {
  const s = olayUygula(yeniSahne(160), { tip: 'dolapYukle', sayi: 9, siseler: [{ renk: 1, parlak: 0 }] })
  expect(s.iksirSayisi).toBe(9)
  expect(s.dolap.length).toBe(1)
})

test('boyut değişince durak yeniden hesaplanır', async () => {
  const s = olayUygula(olayUygula(yeniSahne(160), eylem('oku')), { tip: 'boyut', genislik: 80 })
  expect(s.genislik).toBe(80)
  expect(s.x).toBe(1)
  expect(olayUygula(s, { tip: 'boyut', genislik: 80 })).toBe(s)
})

test('aynı olaylar aynı sahneyi üretir, diziler sınırlı kalır', async () => {
  const oyna = () => {
    let s = yeniSahne(200)
    s = olayUygula(s, eylem('tnt', 'npm test patlatıyor'))
    s = ilerle(s, 15)
    s = olayUygula(s, bitti('tnt'))
    return ilerle(s, 3000)
  }
  const a = oyna()
  expect(JSON.stringify(a)).toBe(JSON.stringify(oyna()))
  expect(a.parca.length <= 120).toBe(true)
  expect(a.mermiler.length <= 12).toBe(true)
  expect(a.esyalar.length <= 30).toBe(true)
  expect(a.canavarlar.length <= 2).toBe(true)
})
```

- [ ] **Step 2: TNT, creeper, çırak ve kuyruk testlerini yaz**

`plugin/tests/sahne-olaylar.test.ts`:
```ts
import { expect, test } from 'claude-code/testing'
import { yeniSahne, olayUygula, adim, FITIL_EN_AZ, CREEPER_SURE } from '../hooks/sahne.js'

const ilerle = (s: any, n: number) => { for (let i = 0; i < n; i++) s = adim(s); return s }
const eylem = (tur: string, metin = 'iş', uzanti?: string) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur: string, uzanti?: string) => ({ tip: 'eylemBitti', tur, uzanti })

test('Bash fitili yakar, en az on kare sonra patlar', async () => {
  let s = olayUygula(yeniSahne(160), eylem('tnt', 'npm test patlatıyor'))
  expect(s.mod).toBe('fitil')
  expect(s.tnt.x >= 61).toBe(true)
  s = olayUygula(s, bitti('tnt'))
  expect(s.tnt.patlaAt).toBe(FITIL_EN_AZ)
  s = ilerle(s, FITIL_EN_AZ - 1)
  expect(s.tnt).not.toBe(null)
  s = adim(s)
  expect(s.tnt).toBe(null)
  expect(s.patlama).not.toBe(null)
  expect(s.mod).toBe('dusun')
})

test('uzun Bash boyunca fitil yanmaya devam eder', async () => {
  const s = ilerle(olayUygula(yeniSahne(160), eylem('tnt')), 200)
  expect(s.mod).toBe('fitil')
  expect(s.tnt).not.toBe(null)
})

test('patlama yakındaki canavarı öldürür ve süs bloğunu kırar', async () => {
  let s = olayUygula(yeniSahne(200), eylem('tnt'))
  const tx = s.tnt.x
  s = { ...s, canavarlar: [{ tur: 'zombi', x: tx, zy: 0, vy: 0, can: 3, kare: 0, vurulma: 0 }], bloklar: [{ x: tx + 3, tip: 'tas', yok: 0 }] }
  s = olayUygula(ilerle(s, FITIL_EN_AZ), bitti('tnt'))
  expect(s.canavarlar).toEqual([])
  expect(s.bloklar[0].yok > s.kare).toBe(true)
  expect(s.esyalar.some((e: any) => e.tur === 'et')).toBe(true)
})

test('fitil yanarken hata gelirse TNT hemen patlar, creeper gelir', async () => {
  const s = olayUygula(olayUygula(yeniSahne(160), eylem('tnt')), { tip: 'hata', tur: 'tnt' })
  expect(s.tnt).toBe(null)
  expect(s.patlama).not.toBe(null)
  expect(s.mod).toBe('creeper')
  expect(s.balon).toBe('Eyvah, büyü tutmadı!')
})

test('creeper patlar, şapka uçar, sonra bekleyen olaylar işlenir', async () => {
  let s = olayUygula(yeniSahne(160), { tip: 'hata', tur: 'diger' })
  s = olayUygula(s, eylem('oku', "README.md'yi okuyor"))
  expect(s.kuyruk.length).toBe(1)
  expect(s.balon).toBe('Eyvah, büyü tutmadı!')
  s = ilerle(s, 19)
  expect(s.creeper.patladi).toBe(true)
  expect(s.sapka).not.toBe(null)
  s = ilerle(s, CREEPER_SURE - 19)
  expect(s.creeper).toBe(null)
  expect(s.sapka).toBe(null)
  expect(s.kuyruk).toEqual([])
  expect(s.balon).toBe("README.md'yi okuyor")
  expect(['oku', 'git'].includes(s.mod)).toBe(true)
})

test('sağ kenardaysa creeper soldan gelir', async () => {
  const s = olayUygula({ ...yeniSahne(160), x: 145 }, { tip: 'hata', tur: 'diger' })
  expect(s.creeper.x < s.x).toBe(true)
  expect(s.yon).toBe(-1)
})

test('her ajan bir çırak; ajan bitince çırak portala döner', async () => {
  let s = olayUygula(olayUygula(yeniSahne(160), eylem('ajan', 'çırak: a')), eylem('ajan', 'çırak: b'))
  expect(s.ciraklar.length).toBe(2)
  s = ilerle(s, 10)
  expect(s.ciraklar.every((c: any) => c.durum === 'aktif')).toBe(true)
  s = olayUygula(s, bitti('ajan'))
  expect(s.ciraklar.filter((c: any) => c.durum === 'cikis').length).toBe(1)
  s = ilerle(s, 60)
  expect(s.ciraklar.length).toBe(1)
})

test('hata veren ajan da çırağını geri gönderir', async () => {
  const s = olayUygula(olayUygula(yeniSahne(160), eylem('ajan')), { tip: 'hata', tur: 'ajan' })
  expect(s.ciraklar[0].durum).toBe('cikis')
})

test('paralel araçlar takılmaz', async () => {
  let s = yeniSahne(160)
  s = olayUygula(s, eylem('oku'))
  s = olayUygula(s, eylem('tnt'))
  s = olayUygula(s, eylem('oku'))
  s = olayUygula(s, bitti('oku'))
  s = olayUygula(s, bitti('oku'))
  s = olayUygula(s, bitti('tnt'))
  s = ilerle(s, 60)
  expect(s.tnt).toBe(null)
  expect(s.mod).toBe('dusun')
})

test('Claude bir iş başlatınca oyuncu kontrolü biter', async () => {
  let s = olayUygula(yeniSahne(160), { tip: 'oyuncu', komut: 'sag' })
  expect(s.oyuncu > 0).toBe(true)
  s = olayUygula(s, eylem('oku'))
  expect(s.oyuncu).toBe(0)
})
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/sahne.js` bulunamadı.

- [ ] **Step 4: `sahne.js`'i yaz**

`plugin/hooks/sahne.js`:
```js
// Clawd Büyücü — sahne simülasyonu. Saf: olayUygula(durum, olay) ve adim(durum) yeni durum döndürür; $ kullanmaz.

import { yerCekimi, parcaSac, yukselen, parcaAdim, mermiAt, mermiAdim, YER } from './fizik.js'
import { CLAWD_GEN, labYerlesimi, durak, asaUcuX, siseRengi, yeniSise, dolabaEkle } from './lab.js'
import { araziUret, alan, bitkiYenile, bloklarYenile, BLOK_GEN } from './arazi.js'
import { CANAVAR, canavarDogur, canavarAdim, vurusKontrol, dusur, enYakin, topla } from './canavar.js'
import { oyuncuOlayi, oyuncuAdim } from './oyuncu.js'
import { DUSUNUYOR, HATA_METNI, bittiMetni } from './olay.js'
import { RENK } from './sprite.js'

export const BALON_EN_AZ = 22 // balon en az ~2 sn kalsın: Read gibi araçlar milisaniyede biter
export const ISINLANMA_ESIK = 32 // 8 bloktan uzaksa laba ışınlanır
export const FITIL_EN_AZ = 10
export const CREEPER_SURE = 36
const ATES_ARALIK = 8
const CIRAK_ATES = 10
const MENZIL = 36
const KUYRUK_SINIR = 8
const ESYA_SINIR = 30
const PORTAL_PAY = 4
const PATLAMA_YARICAP = 14
const BLOK_YENILENME = 150
const MERMI_Y = YER - 6
const CIRAK_RENKLERI = [0x3fa34d, 0x3b6fd1, 0xc9473b, 0xd1a23b]
const HAVAI = [RENK.yildiz, RENK.portalAcik, RENK.kure, RENK.tnt, RENK.cim]
const BLOK_PARCA = { tas: [RENK.tas, RENK.tasKoyu], kutuk: [RENK.tahta, RENK.tahtaKoyu], yaprak: [RENK.cim, RENK.cimKoyu] }
const LAB_MODLARI = new Set(['oku', 'web', 'insa'])
const OYNANIR = new Set(['dusun', 'oku', 'web', 'insa', 'git'])
const KUYRUKLANAN = new Set(['eylem', 'eylemBitti', 'hata'])

export function yeniSahne(genislik = 120, tohum = 7) {
  const { bloklar, esyalar } = araziUret(genislik, tohum)
  return {
    kare: 0, mod: 'dusun', modKare: 0, genislik, tohum,
    x: labYerlesimi(genislik).son + 1, zy: 0, vy: 0, yon: 1,
    hedef: null, isinlanma: 0,
    balon: DUSUNUYOR, balonKare: 0, dusunAt: null,
    tasinan: null, dolap: [], iksirSayisi: 0, buTur: 0,
    malzeme: 0, bekleyen: 0, kazanRengi: null,
    canavarlar: [], mermiler: [], parca: [], esyalar, bloklar,
    ciraklar: [], sonrakiId: 1, atesBekleme: 0,
    tnt: null, patlama: null, creeper: null, sapka: null, kuyruk: [],
    oyuncu: 0, yuruKalan: 0, etki: null,
  }
}

// ---- Olaylar ----
export function olayUygula(s, olay) {
  if (olay.tip === 'basla') return basla(s)
  if (olay.tip === 'boyut') return boyutla(s, olay.genislik)
  if (olay.tip === 'dolapYukle') return { ...s, dolap: olay.siseler, iksirSayisi: olay.sayi }
  if (olay.tip === 'bitti') return bitir(s)
  if (s.mod === 'bitti') return s
  if (olay.tip === 'oyuncu') return oyuncuOlayi(s, olay.komut)
  if (s.creeper && KUYRUKLANAN.has(olay.tip)) return { ...s, kuyruk: [...s.kuyruk, olay].slice(-KUYRUK_SINIR) }
  if (olay.tip === 'eylem') return eylemBaslat(dolabaBirak(s), olay)
  if (olay.tip === 'eylemBitti') return eylemBitir(s, olay)
  if (olay.tip === 'hata') return hataBaslat(s, olay)
  return s
}

function basla(s) {
  if (s.mod !== 'bitti') return { ...s, buTur: 0 }
  return { ...s, buTur: 0, mod: 'dusun', modKare: 0, balon: DUSUNUYOR, balonKare: s.kare, dusunAt: null }
}

function eylemBaslat(s, { tur, metin, uzanti }) {
  const t = { ...s, balon: metin, balonKare: s.kare, dusunAt: null }
  if (tur === 'oku' || tur === 'web') return labaGit(t, tur)
  if (tur === 'insa') return labaGit({ ...t, kazanRengi: siseRengi(uzanti) }, 'insa')
  if (tur === 'tnt') return tntKur(t)
  if (tur === 'ajan') return cirakEkle(t)
  return t
}

function eylemBitir(s, { tur, uzanti }) {
  const t = { ...s, dusunAt: s.balonKare + BALON_EN_AZ }
  if (tur === 'insa') return siseDoldur(t, uzanti)
  if (tur === 'tnt') return tntBitti(t)
  if (tur === 'ajan') return cirakGonder(t)
  return t
}

// ---- Lab ----
function labaGit(s, tur) {
  const d = durak(labYerlesimi(s.genislik), tur)
  const t = { ...s, oyuncu: 0, yuruKalan: 0, hedef: null }
  if (Math.abs(s.x - d.x) > ISINLANMA_ESIK) return isinla({ ...t, yon: d.yon }, d.x, tur)
  if (s.x === d.x) return { ...t, mod: tur, modKare: 0, yon: d.yon }
  return { ...t, mod: 'git', modKare: 0, hedef: { x: d.x, yon: d.yon, mod: tur } }
}

function isinla(s, x, mod) {
  const mor = (i) => (i % 2 ? RENK.portal : RENK.portalAcik)
  const cikis = parcaSac(s.parca, s.kare + 1, s.x + 3, YER - 4, mor, 8, 1.2)
  const varis = parcaSac(cikis, s.kare + 2, x + 3, YER - 4, mor, 8, 1.2)
  return { ...s, x, zy: 0, vy: 0, mod, modKare: 0, hedef: null, isinlanma: 6, parca: varis }
}

function dolabaBirak(s) {
  if (!s.tasinan) return s
  return { ...s, tasinan: null, dolap: dolabaEkle(s.dolap, s.tasinan), iksirSayisi: s.iksirSayisi + 1, buTur: s.buTur + 1 }
}

function siseDoldur(s, uzanti) {
  const t = { ...dolabaBirak(s), bekleyen: 0, kazanRengi: null }
  const sise = yeniSise(uzanti, s.bekleyen)
  const lab = labYerlesimi(s.genislik)
  if (lab.dolapX === null) return dolabaBirak({ ...t, tasinan: sise })
  const parca = parcaSac(t.parca, t.kare, lab.kazanX + 4, YER - 5, () => sise.renk, 5, 0.7)
  return labaGit({ ...t, tasinan: sise, parca }, 'dolap')
}

// ---- TNT ----
function tntKur(s) {
  if (s.tnt) return s
  const { bas, son } = alan(s.genislik)
  const istenen = s.yon > 0 ? s.x + CLAWD_GEN + 6 : s.x - 10
  const x = Math.max(bas + 1, Math.min(son - 4, istenen))
  return { ...s, mod: 'fitil', modKare: 0, oyuncu: 0, yuruKalan: 0, hedef: null, yon: x >= s.x ? 1 : -1, tnt: { x, kare: 0, patlaAt: null } }
}

function tntBitti(s) {
  if (!s.tnt) return s
  if (s.mod === 'fitil' && s.modKare < FITIL_EN_AZ) return { ...s, tnt: { ...s.tnt, patlaAt: FITIL_EN_AZ } }
  return patlat(s)
}

function patlat(s) {
  const cx = s.tnt.x + 2
  const cy = YER - 2
  const sicak = [RENK.beyaz, RENK.kivilcim, RENK.alev, RENK.tnt, RENK.duman]
  let parca = parcaSac(s.parca, s.kare, cx, cy, (i) => sicak[i % sicak.length], 24, 1.8)
  const yakin = (merkez) => Math.abs(merkez - cx) <= PATLAMA_YARICAP
  const kirilan = s.bloklar.filter((b) => !b.yok && yakin(b.x + BLOK_GEN / 2))
  for (const b of kirilan) parca = parcaSac(parca, s.kare + b.x, b.x + 2, YER - 2, (i) => BLOK_PARCA[b.tip][i % 2], 5, 1.2)
  const olenler = s.canavarlar.filter((c) => yakin(c.x + CANAVAR[c.tur].gen / 2))
  const fitilde = s.mod === 'fitil'
  return {
    ...s, tnt: null, patlama: { x: cx, y: cy, kare: 0 }, parca,
    bloklar: s.bloklar.map((b) => (kirilan.includes(b) ? { ...b, yok: s.kare + BLOK_YENILENME } : b)),
    canavarlar: s.canavarlar.filter((c) => !olenler.includes(c)),
    esyalar: [...s.esyalar, ...dusur(olenler)].slice(-ESYA_SINIR),
    mod: fitilde ? 'dusun' : s.mod, modKare: fitilde ? 0 : s.modKare,
  }
}

// ---- Çıraklar ----
function portalX(s) {
  return alan(s.genislik).bas + PORTAL_PAY
}

function cirakEkle(s) {
  const renk = CIRAK_RENKLERI[(s.sonrakiId - 1) % CIRAK_RENKLERI.length]
  const cirak = { id: s.sonrakiId, x: portalX(s), renk, durum: 'giris', kare: 0, atesBekleme: 0, yon: 1 }
  return { ...s, ciraklar: [...s.ciraklar, cirak], sonrakiId: s.sonrakiId + 1 }
}

function cirakGonder(s) {
  const i = s.ciraklar.findIndex((c) => c.durum !== 'cikis')
  if (i === -1) return s
  return { ...s, ciraklar: s.ciraklar.map((c, j) => (j === i ? { ...c, durum: 'cikis', kare: 0 } : c)) }
}

// ---- Hata ve creeper ----
function hataBaslat(s, { tur }) {
  let t = dolabaBirak(s.tnt ? patlat(s) : s)
  if (tur === 'ajan') t = cirakGonder(t)
  const sag = t.x + CLAWD_GEN + 16
  const cx = sag <= t.genislik - 6 ? sag : Math.max(0, t.x - 21)
  return {
    ...t, mod: 'creeper', modKare: 0, hedef: null, oyuncu: 0, yuruKalan: 0, zy: 0, vy: 0, kazanRengi: null,
    yon: cx >= t.x ? 1 : -1, balon: HATA_METNI, balonKare: t.kare, dusunAt: null,
    creeper: { x: cx, beyaz: false, patladi: false },
  }
}

function kuyruguIsle(s) {
  return s.kuyruk.reduce((t, olay) => olayUygula(t, olay), { ...s, kuyruk: [] })
}

// ---- Bitti ----
function bitir(s) {
  const t = dolabaBirak(s.tnt ? patlat(s) : s)
  const d = durak(labYerlesimi(t.genislik), 'dolap')
  const yerde = t.x === d.x ? t : isinla(t, d.x, 'bitti')
  return {
    ...yerde, mod: 'bitti', modKare: 0, yon: 1, hedef: null, creeper: null, sapka: null, kuyruk: [],
    oyuncu: 0, yuruKalan: 0, zy: 0, vy: 0, kazanRengi: null,
    balon: bittiMetni(yerde.buTur), balonKare: yerde.kare, dusunAt: null,
  }
}

// ---- Boyut ----
function boyutla(s, genislik) {
  if (!Number.isFinite(genislik) || genislik === s.genislik) return s
  const lab = labYerlesimi(genislik)
  const { bloklar, esyalar } = araziUret(genislik, s.tohum)
  const { bas, son } = alan(genislik)
  const enSag = Math.max(0, genislik - CLAWD_GEN - 1)
  const durakModu = LAB_MODLARI.has(s.mod) || s.mod === 'dolap' || s.mod === 'bitti'
  return {
    ...s, genislik, bloklar, esyalar,
    x: durakModu ? durak(lab, s.mod === 'bitti' ? 'dolap' : s.mod).x : Math.min(s.x, enSag),
    hedef: s.hedef && { ...durak(lab, s.hedef.mod), mod: s.hedef.mod },
    canavarlar: s.canavarlar.filter((c) => c.x >= bas && c.x <= genislik - 2),
    tnt: s.tnt && { ...s.tnt, x: Math.max(bas + 1, Math.min(son - 4, s.tnt.x)) },
    ciraklar: s.ciraklar.map((c) => ({ ...c, x: Math.min(c.x, enSag) })),
    creeper: s.creeper && { ...s.creeper, x: Math.min(s.creeper.x, genislik - 6) },
  }
}

// ---- Kare adımları ----
function dusunAdim(s) {
  const { bas, son } = alan(s.genislik)
  const enSag = Math.max(bas, son - CLAWD_GEN)
  const yeni = canavarDogur(s.canavarlar, s.genislik, s.kare, s.tohum)
  const t = yeni ? { ...s, canavarlar: [...s.canavarlar, yeni] } : s
  if (t.x < bas) return { ...t, yon: 1, x: t.x + 1 }
  const hedef = enYakin(t.canavarlar, t.x + CLAWD_GEN / 2)
  if (hedef && hedef.mesafe <= MENZIL) {
    const yon = hedef.fark >= 0 ? 1 : -1
    if (t.atesBekleme > 0) return { ...t, yon }
    return { ...t, yon, atesBekleme: ATES_ARALIK, mermiler: mermiAt(t.mermiler, asaUcuX({ ...t, yon }), MERMI_Y, yon, 'clawd') }
  }
  if (enSag <= bas) return t
  const yon = t.x >= enSag ? -1 : t.x <= bas ? 1 : t.yon
  return { ...t, yon, x: t.x + yon }
}

function gitAdim(s) {
  const h = s.hedef
  if (!h) return { ...s, mod: 'dusun', modKare: 0 }
  if (s.x === h.x) return { ...s, mod: h.mod, modKare: 0, yon: h.yon, hedef: null }
  const yon = Math.sign(h.x - s.x)
  return { ...s, yon, x: s.x + yon }
}

function okuAdim(s) {
  if (s.modKare % 4 !== 0) return s
  const lab = labYerlesimi(s.genislik)
  const x = lab.kursuX === null ? lab.kazanX + 4 : lab.kursuX + 2
  return { ...s, parca: yukselen(s.parca, s.kare, x, YER - 7, RENK.sayfa) }
}

function insaAdim(s) {
  const aralik = s.ciraklar.some((c) => c.durum === 'aktif') ? 3 : 5
  if (s.modKare % aralik !== 0) return s
  const lab = labYerlesimi(s.genislik)
  return { ...s, parca: yukselen(s.parca, s.kare, lab.kazanX + 2 + (s.kare % 5), YER - 5, s.kazanRengi ?? RENK.iksir) }
}

function dolapAdim(s) {
  if (s.modKare === 4 && s.tasinan) {
    const lab = labYerlesimi(s.genislik)
    const t = dolabaBirak(s)
    const x = lab.dolapX === null ? s.x + 3 : lab.dolapX + 7
    return { ...t, parca: parcaSac(t.parca, t.kare, x, 7, () => RENK.yildiz, 6, 0.6) }
  }
  if (s.modKare >= 8) return { ...s, mod: 'dusun', modKare: 0 }
  return s
}

function fitilAdim(s) {
  if (!s.tnt) return { ...s, mod: 'dusun', modKare: 0 }
  if (s.tnt.patlaAt !== null && s.modKare >= s.tnt.patlaAt) return patlat(s)
  if (s.modKare === 1) return { ...s, parca: parcaSac(s.parca, s.kare, asaUcuX(s), YER - 7, () => RENK.kivilcim, 4, 0.8) }
  if (s.modKare === 2) return { ...s, parca: parcaSac(s.parca, s.kare, s.tnt.x + 2, YER - 4, () => RENK.kivilcim, 6, 1) }
  const uzaklik = Math.abs(s.x + CLAWD_GEN / 2 - (s.tnt.x + 2))
  if (s.modKare <= 6 && uzaklik < 14) {
    const kac = s.tnt.x >= s.x ? -1 : 1
    return { ...s, x: Math.max(0, Math.min(s.genislik - CLAWD_GEN, s.x + kac)) }
  }
  return s
}

function creeperAdim(s) {
  const c = s.creeper
  if (!c) return { ...s, mod: 'dusun', modKare: 0 }
  const k = s.modKare
  if (k >= CREEPER_SURE) {
    return kuyruguIsle({ ...s, mod: 'dusun', modKare: 0, creeper: null, sapka: null, balon: DUSUNUYOR, balonKare: s.kare })
  }
  if (c.patladi) return s
  const yon = c.x >= s.x ? 1 : -1
  if (k < 12) {
    const yakin = Math.abs(c.x - s.x) <= CLAWD_GEN + 3
    return { ...s, yon, creeper: yakin ? c : { ...c, x: c.x - yon * 0.8 } }
  }
  // Asa "fıs" eder: büyü çıkmaz, gri duman
  if (k === 12) return { ...s, yon, parca: parcaSac(s.parca, s.kare, asaUcuX({ ...s, yon }), YER - 8, () => RENK.duman, 6, 0.5) }
  if (k < 18) return { ...s, yon, creeper: { ...c, beyaz: k % 2 === 0 } }
  const yesil = (i) => (i % 2 ? RENK.creeper : RENK.creeperKoyu)
  return {
    ...s, yon, vy: 2.5,
    x: Math.max(0, Math.min(s.genislik - CLAWD_GEN, s.x - yon * 6)),
    parca: parcaSac(s.parca, s.kare, c.x + 2, YER - 4, yesil, 16, 1.5),
    patlama: { x: c.x + 2, y: YER - 3, kare: 0 },
    creeper: { ...c, patladi: true, beyaz: false },
    sapka: { x: s.x, zy: 6, vx: -yon * 0.5, vy: 2.2 },
  }
}

function bittiAdim(s) {
  if (s.modKare % 3 !== 1 || s.modKare > 19) return s
  return { ...s, parca: parcaSac(s.parca, s.kare, asaUcuX(s), YER - 11, (i) => HAVAI[(i + s.modKare) % HAVAI.length], 7, 1.6) }
}

const MOD_ADIMI = {
  dusun: dusunAdim, git: gitAdim, oku: okuAdim, web: (s) => s, insa: insaAdim,
  dolap: dolapAdim, fitil: fitilAdim, creeper: creeperAdim, bitti: bittiAdim,
}

function canavarlarAdim(s) {
  const durgun = s.mod !== 'dusun' && s.oyuncu === 0
  const { bas } = alan(s.genislik)
  const merkez = s.x + CLAWD_GEN / 2
  const yurumus = s.canavarlar.map((c) => {
    const k = canavarAdim(c, merkez, durgun)
    return k.x < bas ? { ...k, x: bas } : k
  })
  const { canavarlar, mermiler, olenler } = vurusKontrol(yurumus, s.mermiler)
  if (olenler.length === 0) return { ...s, canavarlar, mermiler }
  const parca = olenler.reduce((p, c) => parcaSac(p, s.kare + Math.round(c.x), c.x + 2, YER - 3, () => RENK.duman, 6, 0.8), s.parca)
  return { ...s, canavarlar, mermiler, parca, esyalar: [...s.esyalar, ...dusur(olenler)].slice(-ESYA_SINIR) }
}

function cirakAdim(c, s, sira) {
  const kare = c.kare + 1
  if (c.durum === 'giris') return { ...c, kare, durum: kare >= 6 ? 'aktif' : 'giris' }
  if (c.durum === 'cikis') {
    const px = portalX(s)
    if (Math.abs(c.x - px) > 1) {
      const yon = Math.sign(px - c.x)
      return { ...c, kare: 0, yon, x: c.x + yon * 1.5 }
    }
    return kare >= 4 ? null : { ...c, kare }
  }
  const fark = s.x - s.yon * (8 + sira * 6) - c.x
  const x = Math.abs(fark) < 1 ? c.x : c.x + Math.sign(fark) * 1.2
  return { ...c, kare, yon: s.yon, x: Math.max(0, Math.min(s.genislik - 5, x)), atesBekleme: Math.max(0, c.atesBekleme - 1) }
}

function ciraklarAdim(s) {
  let mermiler = s.mermiler
  let sira = 0
  const ciraklar = []
  for (const c of s.ciraklar) {
    let k = cirakAdim(c, s, c.durum === 'aktif' ? sira++ : 0)
    if (!k) continue
    if (k.durum === 'aktif' && s.mod === 'dusun' && k.atesBekleme === 0) {
      const h = enYakin(s.canavarlar, k.x + 2)
      if (h && h.mesafe <= MENZIL) {
        const yon = h.fark >= 0 ? 1 : -1
        mermiler = mermiAt(mermiler, k.x + (yon > 0 ? 5 : -1), YER - 4, yon, 'cirak')
        k = { ...k, yon, atesBekleme: CIRAK_ATES }
      }
    }
    ciraklar.push(k)
  }
  return { ...s, ciraklar, mermiler }
}

// Şapka Clawd yere indikten sonra başına konar
function sapkaAdim(s) {
  if (!s.sapka) return s
  const h = s.sapka
  const vy = h.vy - 0.35
  const zy = h.zy + vy
  if (vy < 0 && s.zy === 0 && zy <= 6) return { ...s, sapka: null }
  return { ...s, sapka: { ...h, x: h.x + h.vx + (s.x - h.x) * 0.1, zy, vy } }
}

function esyaTopla(s) {
  if (s.zy > 0) return s
  const { esyalar, toplanan } = topla(s.esyalar, s.x, CLAWD_GEN)
  if (toplanan === 0) return s
  return {
    ...s, esyalar, malzeme: s.malzeme + toplanan, bekleyen: s.bekleyen + toplanan,
    parca: parcaSac(s.parca, s.kare, s.x + 3, YER - 3, () => RENK.yildiz, 4, 0.5),
  }
}

function balonZamani(s) {
  if (s.dusunAt === null || s.kare < s.dusunAt || s.oyuncu > 0 || s.tasinan) return s
  if (!OYNANIR.has(s.mod)) return s
  const geriDon = s.mod === 'dusun' ? {} : { mod: 'dusun', modKare: 0, hedef: null }
  return { ...s, ...geriDon, dusunAt: null, balon: DUSUNUYOR, balonKare: s.kare }
}

export function adim(s) {
  const kare = s.kare + 1
  const temel = {
    ...s, kare, modKare: s.modKare + 1,
    parca: parcaAdim(s.parca), mermiler: mermiAdim(s.mermiler, s.genislik),
    atesBekleme: Math.max(0, s.atesBekleme - 1), isinlanma: Math.max(0, s.isinlanma - 1),
    patlama: s.patlama && s.patlama.kare < 6 ? { ...s.patlama, kare: s.patlama.kare + 1 } : null,
    tnt: s.tnt && { ...s.tnt, kare: s.tnt.kare + 1 },
    etki: s.etki && s.etki.kalan > 1 ? { ...s.etki, kalan: s.etki.kalan - 1 } : null,
    esyalar: bitkiYenile(s.esyalar, s.genislik, kare, s.tohum).slice(-ESYA_SINIR),
    bloklar: bloklarYenile(s.bloklar, kare),
  }
  const oynuyor = temel.oyuncu > 0 && OYNANIR.has(temel.mod)
  let t = oynuyor ? oyuncuAdim(temel) : (MOD_ADIMI[temel.mod] ?? dusunAdim)(temel)
  t = ciraklarAdim(canavarlarAdim(t))
  t = sapkaAdim(yerCekimi(t))
  if (t.mod === 'dusun') t = esyaTopla(t)
  return balonZamani(t)
}
```

- [ ] **Step 5: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS. Bir test kalırsa davranışı spec'le karşılaştır; kodu spec'e uydur, testi gevşetme. Şu iki test sayılara duyarlı: "düşünürken araziye yürür ve malzeme toplar" (ilk bitkinin yeri tohum 7'ye bağlı) ve "yakındaki canavara döner…". Bunlardan biri tohum yüzünden kalırsa yalnız o testte `yeniSahne(160, 7)` tohumunu, testin anlattığı durumu oluşturan bir tohumla değiştir ve nedenini testin üstüne yorum olarak yaz.

- [ ] **Step 6: Commit**

```bash
git add plugin/hooks/sahne.js plugin/tests/sahne.test.ts plugin/tests/sahne-olaylar.test.ts
git commit -m "feat: sahne durum makinesi — lab, iksir, TNT, creeper, çırak

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `cizim.js` — sahneden Raster hücreleri

**Files:**
- Create: `plugin/hooks/cizim.js`
- Test: `plugin/tests/cizim.test.ts`

**Interfaces:**
- Consumes: `RENK`, `SPRITE`, `beyazPalet` (`sprite.js`); `DUNYA_YUK`, `YER`, `zar` (`fizik.js`); `CLAWD_GEN`, `labYerlesimi`, `gorunenSiseler`, `sisePikseli`, `asaUcuX` (`lab.js`); `alan` (`arazi.js`); sahne alanları (Görev 9)
- Produces:
  - `VARSAYILAN = 0x01000000` (terminalin varsayılan rengi)
  - `acikla(renk, oran): number`
  - `sahneHucreleri(s, sutun, satir): Uint32Array` — uzunluk `sutun * satir * 3`; hücre başına `[kod noktası, ön renk, arka renk]`; satır 0'da balon metni
  - `base64(hucreler: Uint32Array): string`

- [ ] **Step 1: Başarısız testleri yaz**

`plugin/tests/cizim.test.ts`:
```ts
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
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: FAIL — `../hooks/cizim.js` bulunamadı.

- [ ] **Step 3: `cizim.js`'i yaz**

`plugin/hooks/cizim.js`:
```js
// Clawd Büyücü — sahne durumunu Raster hücrelerine çevirir. Saf; $ kullanmaz.
// Hücre iki dikey pikseldir: ▀ karakterinin ön rengi üst, arka rengi alt pikseli boyar.

import { RENK, SPRITE, beyazPalet } from './sprite.js'
import { DUNYA_YUK, YER, zar } from './fizik.js'
import { CLAWD_GEN, labYerlesimi, gorunenSiseler, sisePikseli, asaUcuX } from './lab.js'
import { alan } from './arazi.js'

export const VARSAYILAN = 0x01000000
const UST_YARIM = 0x2580
const ALT_YARIM = 0x2584
const BOSLUK = 0x20
const GORUNEN_CIRAK = 4

// Bant 20 pikselden kısaysa dünyanın üstü kırpılır (ust); y değerleri dünya koordinatında
function tuval(gen, yuk) {
  return { gen, yuk, ust: Math.max(0, DUNYA_YUK - yuk), p: new Int32Array(gen * yuk).fill(-1) }
}

function nokta(t, x, y, renk) {
  const px = Math.round(x)
  const py = Math.round(y) - t.ust
  if (px < 0 || py < 0 || px >= t.gen || py >= t.yuk) return
  t.p[py * t.gen + px] = renk
}

function dikdortgen(t, x, y, gen, yuk, renk) {
  for (let j = 0; j < yuk; j++) for (let i = 0; i < gen; i++) nokta(t, x + i, y + j, renk)
}

function cizgi(t, x0, y0, x1, y1, renk) {
  const adim = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= adim; i++) nokta(t, x0 + ((x1 - x0) * i) / adim, y0 + ((y1 - y0) * i) / adim, renk)
}

function spriteCiz(t, sp, x, y, aynala = false, ozel = {}) {
  for (let j = 0; j < sp.yuk; j++) {
    const satir = sp.satirlar[j]
    for (let i = 0; i < sp.gen; i++) {
      const harf = satir[aynala ? sp.gen - 1 - i : i]
      if (harf === '.') continue
      const renk = ozel[harf] ?? sp.palet[harf]
      if (renk !== undefined) nokta(t, x + i, y + j, renk)
    }
  }
}

export function acikla(renk, oran) {
  const ac = (kanal) => Math.round(kanal + (255 - kanal) * oran)
  return (ac((renk >> 16) & 255) << 16) | (ac((renk >> 8) & 255) << 8) | ac(renk & 255)
}

// ---- Arka plan ----
function zeminCiz(t, lab) {
  for (let x = 0; x < t.gen; x++) {
    const labda = x < lab.son
    if (labda) for (let y = 0; y < YER; y++) nokta(t, x, y, y % 4 === 3 ? RENK.duvarCizgi : RENK.duvar)
    for (let y = YER; y < DUNYA_YUK; y++) {
      const d = y - YER
      let renk
      if (labda) renk = (x + ((d >> 1) & 1) * 2) % 4 === 0 ? RENK.tuglaKoyu : RENK.tugla
      else if (d < 2) renk = zar(x, d + 1) < 0.3 ? RENK.cimKoyu : RENK.cim
      else if (d < 4) renk = zar(x, d + 7) < 0.3 ? RENK.toprakKoyu : RENK.toprak
      else {
        const z = zar(x, d + 13)
        renk = z < 0.04 ? RENK.siyah : z < 0.06 ? RENK.kure : z < 0.3 ? RENK.tasKoyu : RENK.tas
      }
      nokta(t, x, y, renk)
    }
  }
}

// ---- Lab ----
function dolapCiz(t, s, lab) {
  const x0 = lab.dolapX
  dikdortgen(t, x0, 1, lab.dolapGen, 13, RENK.duvarKoyu)
  for (const y of [1, 5, 9, 13]) dikdortgen(t, x0, y, lab.dolapGen, 1, RENK.tahta)
  dikdortgen(t, x0, 1, 1, 13, RENK.tahtaKoyu)
  dikdortgen(t, x0 + lab.dolapGen - 1, 1, 1, 13, RENK.tahtaKoyu)
  const siseler = gorunenSiseler(s.dolap)
  const yeniBas = siseler.length - Math.min(s.buTur, siseler.length)
  const yeniSayisi = siseler.length - yeniBas
  siseler.forEach((sise, i) => {
    const { x, y } = sisePikseli(lab, i)
    // Bitti'de bu turda eklenen şişeler sırayla parlar
    const parliyor = s.mod === 'bitti' && i >= yeniBas && Math.floor(s.modKare / 3) % Math.max(1, yeniSayisi) === i - yeniBas
    spriteCiz(t, SPRITE.sise, x, y, false, { L: parliyor ? RENK.beyaz : acikla(sise.renk, sise.parlak * 0.12) })
    if (sise.parlak >= 3 && (Math.floor(s.kare / 4) + i) % 4 === 0) nokta(t, x + 2, y, RENK.beyaz)
  })
}

function labCiz(t, s, lab) {
  if (lab.dolapX !== null) dolapCiz(t, s, lab)
  if (lab.kursuX !== null) spriteCiz(t, s.mod === 'oku' && s.kare % 12 < 6 ? SPRITE.kursu2 : SPRITE.kursu, lab.kursuX, YER - 6)
  if (lab.kureX !== null) {
    const ic = s.mod === 'web' ? [RENK.beyaz, RENK.kureIc, RENK.portalAcik][Math.floor(s.kare / 3) % 3] : RENK.kureIc
    spriteCiz(t, SPRITE.kure, lab.kureX, YER - 5, false, { C: ic })
  }
  spriteCiz(t, SPRITE.kazan, lab.kazanX, YER - 5, false, { L: s.kazanRengi ?? RENK.iksir })
}

// ---- Varlıklar ----
function canavarCiz(t, c) {
  const sp = SPRITE[c.tur]
  spriteCiz(t, sp, c.x, YER - sp.yuk - Math.round(c.zy), true, c.vurulma > 0 ? beyazPalet(sp) : {})
}

function cirakCiz(t, c) {
  if (c.durum === 'giris' && c.kare < 3) return
  const ust = YER - 4
  const ayna = c.yon < 0
  spriteCiz(t, SPRITE.cirak, c.x, ust, ayna)
  spriteCiz(t, Math.floor(c.x / 2) % 2 ? SPRITE.cirakAyakB : SPRITE.cirakAyakA, c.x, ust + 3, ayna)
  spriteCiz(t, SPRITE.cirakSapka, c.x, ust - 3, ayna, { R: c.renk })
  const asaX = ayna ? c.x - 1 : c.x + 5
  cizgi(t, asaX, ust - 1, asaX, ust + 3, RENK.asa)
  nokta(t, asaX, ust - 2, c.renk)
}

function clawdCiz(t, s) {
  if (s.isinlanma % 2 === 1) return // ışınlanırken yanıp söner
  const x = s.x
  const ust = YER - 6 - Math.round(s.zy)
  const ayna = s.yon < 0
  if (s.etki && s.kare % 4 < 2) {
    for (const [dx, dy] of [[-1, -1], [CLAWD_GEN, -1], [-1, 5], [CLAWD_GEN, 5]]) nokta(t, x + dx, ust + dy, s.etki.renk)
  }
  spriteCiz(t, SPRITE.clawd, x, ust, ayna)
  spriteCiz(t, Math.floor(x / 2) % 2 ? SPRITE.ayakB : SPRITE.ayakA, x, ust + 5, ayna)
  if (!s.sapka) spriteCiz(t, SPRITE.sapka, x - 1, ust - 4, ayna)
  const asaX = asaUcuX(s)
  if (s.mod === 'insa') {
    const uc = asaX + s.yon * (3 + (Math.floor(s.kare / 3) % 4)) // kazanı karıştırır
    cizgi(t, asaX, ust + 3, uc, ust + 1, RENK.asa)
    nokta(t, uc, ust, RENK.portalAcik)
  } else {
    const kalkik = s.mod === 'bitti' || s.atesBekleme > 5
    const tepe = ust - (kalkik ? 3 : 1)
    cizgi(t, asaX, tepe + 1, asaX, ust + 5 - (kalkik ? 2 : 0), RENK.asa)
    nokta(t, asaX, tepe, s.kare % 16 < 8 ? RENK.portalAcik : RENK.kure)
  }
  if (s.tasinan) spriteCiz(t, SPRITE.sise, ayna ? x - 3 : x + 4, ust + 2, false, { L: s.tasinan.renk })
  if (s.mod === 'fitil' && s.modKare >= 4) {
    const kx = s.yon > 0 ? x + CLAWD_GEN + 1 : x - 2
    for (let y = ust - 1; y <= ust + 5; y++) nokta(t, kx, y, (y + s.kare) % 2 ? RENK.portalAcik : RENK.kure)
  }
}

function patlamaCiz(t, p) {
  const r = 2 + p.kare * 1.5
  for (let a = 0; a < 24; a++) {
    const aci = (a / 24) * Math.PI * 2
    nokta(t, p.x + Math.cos(aci) * r, p.y + Math.sin(aci) * r * 0.7, a % 2 ? RENK.alev : RENK.kivilcim)
    if (r > 3) nokta(t, p.x + Math.cos(aci) * (r - 1.5), p.y + Math.sin(aci) * (r - 1.5) * 0.7, RENK.beyaz)
  }
}

// ---- Hücreler ----
function pikselden(t) {
  const satir = t.yuk / 2
  const hucreler = new Uint32Array(t.gen * satir * 3)
  for (let r = 0; r < satir; r++) {
    for (let c = 0; c < t.gen; c++) {
      const ust = t.p[r * 2 * t.gen + c]
      const alt = t.p[(r * 2 + 1) * t.gen + c]
      const i = (r * t.gen + c) * 3
      if (ust < 0 && alt < 0) hucreler.set([BOSLUK, VARSAYILAN, VARSAYILAN], i)
      else if (ust < 0) hucreler.set([ALT_YARIM, alt, VARSAYILAN], i)
      else hucreler.set([UST_YARIM, ust, alt < 0 ? VARSAYILAN : alt], i)
    }
  }
  return hucreler
}

function balonYaz(hucreler, balon, merkez, sutun) {
  const harfler = Array.from(` ${balon} `).slice(0, sutun)
  const bas = Math.max(0, Math.min(sutun - harfler.length, merkez - Math.floor(harfler.length / 2)))
  harfler.forEach((harf, i) => hucreler.set([harf.codePointAt(0), RENK.balonYazi, RENK.balon], (bas + i) * 3))
}

export function sahneHucreleri(s, sutun, satir) {
  const t = tuval(sutun, satir * 2)
  const lab = labYerlesimi(s.genislik)
  zeminCiz(t, lab)
  for (const b of s.bloklar) if (!b.yok) spriteCiz(t, SPRITE[b.tip], b.x, YER - 4)
  labCiz(t, s, lab)
  if (s.ciraklar.some((c) => c.durum !== 'aktif')) spriteCiz(t, SPRITE.portal, alan(s.genislik).bas + 3, YER - 7, s.kare % 4 < 2)
  for (const e of s.esyalar) spriteCiz(t, SPRITE[e.tur], e.x, YER - SPRITE[e.tur].yuk)
  if (s.tnt) spriteCiz(t, SPRITE.tnt, s.tnt.x, YER - 4, false, s.tnt.kare % 6 < 3 ? beyazPalet(SPRITE.tnt) : {})
  for (const c of s.canavarlar) canavarCiz(t, c)
  if (s.creeper && !s.creeper.patladi) {
    spriteCiz(t, SPRITE.creeper, s.creeper.x, YER - 8, false, s.creeper.beyaz ? beyazPalet(SPRITE.creeper) : {})
  }
  for (const c of s.ciraklar.slice(0, GORUNEN_CIRAK)) cirakCiz(t, c)
  clawdCiz(t, s)
  if (s.sapka) spriteCiz(t, SPRITE.sapka, s.sapka.x - 1, YER - 4 - Math.round(s.sapka.zy))
  for (const m of s.mermiler) {
    nokta(t, m.x, m.y, RENK.portalAcik)
    nokta(t, m.x - Math.sign(m.vx), m.y, RENK.portal)
  }
  if (s.patlama) patlamaCiz(t, s.patlama)
  for (const p of s.parca) nokta(t, p.x, p.y, p.renk)
  const merkez = Math.round(s.x + CLAWD_GEN / 2)
  if (t.yuk > 2 && merkez >= 0 && merkez < sutun) t.p[2 * sutun + merkez] = RENK.balon // balon kuyruğu
  const hucreler = pikselden(t)
  balonYaz(hucreler, s.balon, merkez, sutun)
  return hucreler
}

export function base64(hucreler) {
  const baytlar = new Uint8Array(hucreler.buffer, hucreler.byteOffset, hucreler.byteLength)
  if (typeof baytlar.toBase64 === 'function') return baytlar.toBase64()
  let ikili = ''
  for (let i = 0; i < baytlar.length; i += 0x8000) ikili += String.fromCharCode(...baytlar.subarray(i, i + 0x8000))
  return btoa(ikili)
}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `claude plugin test plugin`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/cizim.js plugin/tests/cizim.test.ts
git commit -m "feat: sahneyi Raster hücrelerine çizen modül

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: `register.js` — olaylar, bant, saat, spinner, kalıcılık

**Files:**
- Modify: `plugin/hooks/register.js` (bütünüyle yeniden yazılır)
- Modify: `plugin/tests/register.test.ts` (yeni testler eklenir; Görev 1 testi kalır)

**Interfaces:**
- Consumes: `yeniSahne`, `adim`, `olayUygula` (`sahne.js`); `sahneHucreleri`, `base64` (`cizim.js`); `eylemOku`, `hataMi` (`olay.js`); `dolapOku`, `dolapKaydi` (`lab.js`)
- Produces: çalışan mod. Hook'lar: `session.start`, `command.run{command=buyucu}`, `turn.start`, `turn.complete`, `classic.PreToolUse`, `classic.PostToolUse`, `classic.PostToolUseFailure`, `ui.render{component=AbovePrompt}`, `ui.render{component=Spinner}`. Raster anahtarı `sahne`, düğme anahtarları `oyna-zipla|sol|sag|buyu|iksir`.

- [ ] **Step 1: Başarısız testleri ekle**

`plugin/tests/register.test.ts` dosyasının sonuna ekle (ilk test olduğu gibi kalır; `mock` içe aktarımını ilk satıra ekle: `import { expect, mock, test } from 'claude-code/testing'`):
```ts
const BANT = {
  plugin: 'clawd-buyucu', component: 'AbovePrompt', requestId: 'above-prompt',
  viewport: { columns: 120, rows: 40 },
  props: { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 120, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const
const SPINNER = {
  plugin: 'clawd-buyucu', component: 'Spinner', requestId: 'main',
  viewport: { columns: 120, rows: 40 },
  props: { word: 'Thinking', message: '', suffix: '', mode: 'normal' },
} as const
const TUR = { turnId: 't1', answer: '', durationMs: 1, isAborted: false, usage: null }

// Her testin ilk $ çağrısından önce kurulur
function hazirla(on: any, secenek: { depo?: Map<string, unknown>, render?: (e: any) => void, storeBozuk?: boolean } = {}) {
  const depo = secenek.depo ?? new Map<string, unknown>()
  const kayitlar: any[] = []
  const blitler: any[] = []
  if (secenek.storeBozuk) on('store.get', () => ({ deny: 'store okunamadı' }))
  else on('store.get', ($: any, e: any) => ({ value: depo.get(e.key) }))
  on('store.set', ($: any, e: any) => {
    depo.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', ($: any, e: any) => {
    kayitlar.push(e)
    return { value: undefined }
  })
  on('ui.blit', ($: any, e: any) => {
    blitler.push(e)
    return { value: undefined }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('classic.PreToolUse', () => ({}))
  on('classic.PostToolUse', () => ({}))
  on('classic.PostToolUseFailure', () => ({}))
  on('ui.render', ($: any, e: any) => {
    secenek.render?.(e)
    return { type: 'Text', props: {}, children: ['Claude Code çizdi'] }
  })
  return { depo, kayitlar, blitler, saat: mock.clock(on) }
}

async function oturumAc($: any) {
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
}

test('tur başlayınca bant açılır, Raster ve düğmeler çizilir, kareler blit edilir', async ($, on) => {
  const { blitler, saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  const raster = await ui.find({ key: 'sahne' })
  expect(raster.props.columns).toBe(120)
  expect(raster.props.rows).toBe(10)
  expect(await ui.find({ key: 'oyna-zipla' })).toBeDefined()
  expect(await ui.find({ key: 'oyna-iksir' })).toBeDefined()
  await $.classic.PreToolUse({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: '/w/README.md' } })
  await saat.advance(90 * 3)
  expect(blitler.length >= 2).toBe(true)
  expect(blitler[0].key).toBe('sahne')
  expect(blitler[0].columns).toBe(120)
  await ui.unmount()
})

test('tur bitince bant iki saniye sonra kapanır', async ($, on) => {
  const { saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  await $.turn.complete(TUR)
  let ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeDefined()
  await ui.unmount()
  await saat.advance(2100)
  ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Claude Code çizdi' })).toBeDefined()
  await ui.unmount()
})

test('alt ajanın turu bandı kapatmaz', async ($, on) => {
  const { saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  await $.turn.complete({ ...TUR, agentId: 'alt-1' })
  await saat.advance(3000)
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeDefined()
  await ui.unmount()
})

test('düzenleme bitince iksir store\'a yazılır, spinner sayacı gösterir', async ($, on) => {
  let sonSpinner: any = null
  const { depo, saat } = hazirla(on, { render: (e) => { if (e.component === 'Spinner') sonSpinner = e } })
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const girdi = { file_path: '/w/sahne.js' }
  await $.classic.PreToolUse({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: girdi })
  await $.classic.PostToolUse({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: girdi, tool_response: { success: true } })
  await saat.advance(90 * 12)
  await saat.advance(90)
  expect(depo.get('dolap')).toEqual({ sayi: 1, siseler: [{ renk: 0xf2c12e, parlak: 0 }] })
  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  expect(sonSpinner.props.suffix.includes('⚗ 1 iksir')).toBe(true)
  await ui.unmount()
})

test('kayıtlı dolap oturum açılışında yüklenir', async ($, on) => {
  let sonSpinner: any = null
  const depo = new Map<string, unknown>([['dolap', { sayi: 5, siseler: [{ renk: 0x4f8fe8, parlak: 1 }] }]])
  hazirla(on, { depo, render: (e) => { if (e.component === 'Spinner') sonSpinner = e } })
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  expect(sonSpinner.props.suffix).toBe(' · ⚗ 5 iksir · ✦ 0')
  await ui.unmount()
})

test('Desktop\'ta tek satır metin çizilir', async ($, on) => {
  hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Clawd: düşünüyor… · ⚗ 0/ })).toBeDefined()
  await ui.unmount()
})

test('kapalıyken tur başlasa da bant açılmaz', async ($, on) => {
  hazirla(on, { depo: new Map([['acik', false]]) })
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
  await ui.unmount()
})

test('store okunamazsa varsayılanlarla açılır', async ($, on) => {
  const { kayitlar } = hazirla(on, { storeBozuk: true })
  await oturumAc($)
  expect(kayitlar.map((k) => k.name)).toEqual(['buyucu'])
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeDefined()
  await ui.unmount()
})

test('oyna düğmesi Clawd\'u oyuncuya verir', async ($, on) => {
  hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const terminal = await $.ui.mount({ ...BANT, surface: 'terminal' })
  await terminal.press({ key: 'oyna-buyu' })
  await terminal.unmount()
  const desktop = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /Kontrol sende!/ })).toBeDefined()
  await desktop.unmount()
})
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `claude plugin test plugin`
Expected: yeni register testleri FAIL (bant çizilmiyor, `sahne` anahtarı yok).

- [ ] **Step 3: `register.js`'i yeniden yaz**

`plugin/hooks/register.js`:
```js
// Clawd Büyücü — Claude çalışırken istemin üstündeki bantta büyücü Clawd sahnesi.
// $ kullanan tek dosya; sahne, çizim, olay ve lab modülleri saftır.

import { yeniSahne, adim, olayUygula } from './sahne.js'
import { sahneHucreleri, base64 } from './cizim.js'
import { eylemOku, hataMi } from './olay.js'
import { dolapOku, dolapKaydi } from './lab.js'

const KARE_MS = 90 // ~11 fps
const SATIR = 10 // 10 satır = 20 piksel
const EN_AZ_SATIR = 6
const KAPANIS_MS = 2000
const ANAHTAR = 'sahne'
const ACIK_ANAHTARI = 'acik'
const DOLAP_ANAHTARI = 'dolap'

const DUGMELER = [
  { hotkey: '1', label: 'zıpla', komut: 'zipla' },
  { hotkey: '2', label: '←', komut: 'sol' },
  { hotkey: '3', label: '→', komut: 'sag' },
  { hotkey: '4', label: 'büyü', komut: 'buyu' },
  { hotkey: '5', label: 'iksir', komut: 'iksir' },
]

let acik = true
let gorunur = false
let sahne = yeniSahne()
let bant = null // { requestId, sutun, satir }
let saat = null
let kapanis = null
let ciziliyor = false
let kaydediliyor = false
let kayitliSayi = 0
let kayitliUzunluk = 0
let sonEk = ''

function olayEkle(olay) {
  sahne = olayUygula(sahne, olay)
}

function sayacEki() {
  return sahne.iksirSayisi || sahne.malzeme ? ` · ⚗ ${sahne.iksirSayisi} iksir · ✦ ${sahne.malzeme}` : ''
}

function ozet() {
  return `🧙 Clawd: ${sahne.balon} · ⚗ ${sahne.iksirSayisi}`
}

// Son yazan kazanır: aynı anda iki oturum iksir eklerse biri kaybolabilir
async function dolabiKaydet($) {
  if (kaydediliyor || (sahne.iksirSayisi === kayitliSayi && sahne.dolap.length === kayitliUzunluk)) return
  kaydediliyor = true
  const sayi = sahne.iksirSayisi
  const siseler = sahne.dolap
  try {
    await $.store.set(DOLAP_ANAHTARI, dolapKaydi(sayi, siseler))
    kayitliSayi = sayi
    kayitliUzunluk = siseler.length
  } catch {
    // bir sonraki karede yeniden denenir
  } finally {
    kaydediliyor = false
  }
}

async function kareCiz($) {
  sahne = adim(sahne)
  dolabiKaydet($)
  const ek = sayacEki()
  if (ek !== sonEk) {
    sonEk = ek
    $.ui.invalidate('ui.render')
  }
  if (!bant || ciziliyor) return
  ciziliyor = true
  try {
    const cells = base64(sahneHucreleri(sahne, bant.sutun, bant.satir))
    const r = await $.ui.blit({ requestId: bant.requestId, key: ANAHTAR, columns: bant.sutun, rows: bant.satir, cells })
    if (r?.deny) $.ui.invalidate('ui.render')
  } catch {
    $.ui.invalidate('ui.render')
  } finally {
    ciziliyor = false
  }
}

function baslat($) {
  kapanis?.cancel()
  kapanis = null
  gorunur = true
  olayEkle({ tip: 'basla' })
  if (!saat) saat = $.clock.every(KARE_MS, () => kareCiz($))
  $.ui.invalidate('ui.render')
}

function gizle($) {
  saat?.cancel()
  kapanis?.cancel()
  saat = null
  kapanis = null
  gorunur = false
  bant = null
  $.ui.invalidate('ui.render')
}

function aracBitti(e, hata) {
  const { tur, uzanti } = eylemOku(e)
  olayEkle(hata ? { tip: 'hata', tur } : { tip: 'eylemBitti', tur, uzanti })
}

function bantCiz($, e) {
  const { Box, Text, Raster, Button } = $.ui.resolve(e)
  if (e.surface !== 'terminal') return Text({ wrap: 'truncate', children: [ozet()] })
  const sutun = Math.max(20, Math.min(512, e.props.bodyColumns || 80))
  const satir = Math.max(EN_AZ_SATIR, Math.min(SATIR, (e.props.maxRows || SATIR + 1) - 1))
  bant = { requestId: e.requestId, sutun, satir }
  olayEkle({ tip: 'boyut', genislik: sutun })
  const cells = base64(sahneHucreleri(sahne, sutun, satir))
  const dugmeler = DUGMELER.map((d) => Button({
    key: `oyna-${d.komut}`, hotkey: d.hotkey, label: d.label, plain: true, dimColor: true,
    onPress: () => olayEkle({ tip: 'oyuncu', komut: d.komut }),
  }))
  // Raster bandın doğrudan çocuğu: blit onu anahtarıyla bulur
  return Box({
    flexDirection: 'column',
    children: [Raster({ key: ANAHTAR, columns: sutun, rows: satir, cells }), Box({ flexDirection: 'row', columnGap: 2, children: dugmeler })],
  })
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    let kayitliAcik
    let kayitliDolap
    try {
      kayitliAcik = await $.store.get(ACIK_ANAHTARI)
      kayitliDolap = await $.store.get(DOLAP_ANAHTARI)
    } catch {
      // store okunamazsa mod açık, dolap boş başlar
    }
    acik = kayitliAcik !== false
    const dolap = dolapOku(kayitliDolap)
    olayEkle({ tip: 'dolapYukle', sayi: dolap.sayi, siseler: dolap.siseler })
    kayitliSayi = dolap.sayi
    kayitliUzunluk = dolap.siseler.length
    await $.command.register({ name: 'buyucu', description: 'Clawd Büyücü bandını aç/kapat', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'buyucu' }, async ($) => {
    acik = !acik
    await $.store.set(ACIK_ANAHTARI, acik)
    if (!acik) gizle($)
    return { text: acik ? 'Clawd Büyücü açık: Claude çalışırken kazanı karıştırır.' : 'Clawd Büyücü kapalı.' }
  })

  on('turn.start', async ($, e, next) => {
    if (acik && !e.agentId) baslat($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId || !gorunur) return next(e)
    olayEkle({ tip: 'bitti' })
    kapanis?.cancel()
    kapanis = $.clock.after(KAPANIS_MS, () => gizle($))
    return next(e)
  })

  // tool.call yerine settings hook kopyaları: tool.call içinde next'i beklemek uzun bir Bash boyunca
  // saati ve düğmeleri durdurur
  on('classic.PreToolUse', async ($, e, next) => {
    if (gorunur) olayEkle({ tip: 'eylem', ...eylemOku(e) })
    return next(e)
  })

  on('classic.PostToolUse', async ($, e, next) => {
    if (gorunur) aracBitti(e, hataMi(e))
    return next(e)
  })

  on('classic.PostToolUseFailure', async ($, e, next) => {
    if (gorunur) aracBitti(e, true)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!acik || !gorunur) return next(e)
    return bantCiz($, e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const ek = sayacEki()
    if (!gorunur || !ek) return next(e)
    return next({ ...e, props: { ...e.props, suffix: `${e.props.suffix || ''}${ek}` } })
  })
}
```

- [ ] **Step 4: Testleri ve doğrulamayı çalıştır**

Run: `claude plugin test plugin && claude plugin validate plugin --strict`
Expected: tüm testler PASS; validate `hooks:` satırında dokuz hook'u, `calls:` satırında `$.store.get`, `$.store.set (via dolabiKaydet)`, `$.command.register`, `$.ui.invalidate`, `$.ui.blit (via kareCiz)`, `$.ui.resolve (via bantCiz)`, `$.clock.every`, `$.clock.after` listeler ve `✔ Validation passed` der.

`turn.start` stub'ı ya da `$.turn.start` testte farklı bir alan istiyorsa (`the engine reported:` bloğu), stub'ı test kitinin istediği biçime göre düzelt; hook kodunu değiştirme. Validate `$.ui.resolve`'u `via bantCiz` olarak listelemezse ya da `$`'ın fonksiyona geçirilmesini reddederse, bandı çizen kodu doğrudan `ui.render` hook'unun içine taşı.

- [ ] **Step 5: Commit**

```bash
git add plugin/hooks/register.js plugin/tests/register.test.ts
git commit -m "feat: bant, saat, araç olayları, spinner ve dolap kalıcılığı

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Önizleme aracı, README ve gerçek oturumda kontrol

**Files:**
- Create: `araclar/onizle.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: `yeniSahne`, `olayUygula`, `adim` (`sahne.js`); `sahneHucreleri`, `VARSAYILAN` (`cizim.js`)
- Produces: `node araclar/onizle.mjs <durum> [sutun]` truecolor ANSI çıktı; kurulum belgesi

- [ ] **Step 1: Önizleme aracını yaz**

`araclar/onizle.mjs`:
```js
// Claude'suz önizleme: bir durumu senaryodan üretip terminale truecolor ANSI olarak çizer.
// Kullanım: node araclar/onizle.mjs <durum> [sutun]
// Durumlar: dusun oku insa web fitil patlama ajan creeper bitti oyna

import { yeniSahne, olayUygula, adim } from '../plugin/hooks/sahne.js'
import { sahneHucreleri, VARSAYILAN } from '../plugin/hooks/cizim.js'

const DOLAP = [0xf2c12e, 0x4f8fe8, 0x5cc85c, 0xf08a24, 0xa05ce0, 0xf06ab0, 0xf2c12e].map((renk, i) => ({ renk, parlak: i % 4 }))
const eylem = (tur, metin, uzanti) => ({ tip: 'eylem', tur, metin, uzanti })
const bitti = (tur, uzanti) => ({ tip: 'eylemBitti', tur, uzanti })

const SENARYO = {
  dusun: [[], 120],
  oku: [[eylem('oku', "README.md'yi okuyor")], 20],
  insa: [[eylem('insa', "sahne.js'yi karıştırıyor", 'js')], 30],
  web: [[eylem('web', 'kürede: github.com')], 20],
  fitil: [[eylem('tnt', 'npm test patlatıyor')], 8],
  patlama: [[eylem('tnt', 'npm test patlatıyor')], 12, [bitti('tnt')], 2],
  ajan: [[eylem('ajan', 'çırak: testleri yaz'), eylem('ajan', 'çırak: belge')], 40],
  creeper: [[{ tip: 'hata', tur: 'diger' }], 20],
  bitti: [[eylem('insa', 'x', 'md'), bitti('insa', 'md')], 30, [{ tip: 'bitti' }], 9],
  oyna: [[{ tip: 'oyuncu', komut: 'buyu' }], 3],
}

const [durum = 'dusun', sutunHam = '120'] = process.argv.slice(2)
const senaryo = SENARYO[durum]
if (!senaryo) {
  console.error(`Bilinmeyen durum: ${durum}. Seçenekler: ${Object.keys(SENARYO).join(' ')}`)
  process.exit(1)
}
const sutun = Math.max(20, Math.min(512, Number(sutunHam) || 120))
const satir = 10
const [olaylar, kare, sonra = [], sonraKare = 0] = senaryo

let s = olayUygula(yeniSahne(sutun), { tip: 'dolapYukle', sayi: DOLAP.length, siseler: DOLAP })
for (const o of olaylar) s = olayUygula(s, o)
for (let i = 0; i < kare; i++) s = adim(s)
for (const o of sonra) s = olayUygula(s, o)
for (let i = 0; i < sonraKare; i++) s = adim(s)

const renk = (r, katman) => (r === VARSAYILAN ? `\x1b[${katman === 'on' ? 39 : 49}m` : `\x1b[${katman === 'on' ? 38 : 48};2;${(r >> 16) & 255};${(r >> 8) & 255};${r & 255}m`)
const h = sahneHucreleri(s, sutun, satir)
let cikti = ''
for (let r = 0; r < satir; r++) {
  for (let c = 0; c < sutun; c++) {
    const i = (r * sutun + c) * 3
    cikti += renk(h[i + 1], 'on') + renk(h[i + 2], 'arka') + String.fromCodePoint(h[i])
  }
  cikti += '\x1b[0m\n'
}
process.stdout.write(cikti)
```

- [ ] **Step 2: Her durumu önizle ve gözle kontrol et**

Run: `for d in dusun oku insa web fitil patlama ajan creeper bitti oyna; do echo "== $d"; node araclar/onizle.mjs $d 120; done; node araclar/onizle.mjs insa 80`
Expected: her durumda çimen, toprak ve taş zemin; solda lab (koyu duvar, raflarında şişeler dolu dolap, kürsü, küre, kazan); şapkalı ve asalı turuncu Clawd; üst satırda balon. Durumlara göre ayrıca:
- `fitil`: TNT ve kalkan
- `patlama`: halka
- `ajan`: renkli şapkalı çıraklar ve mor portal
- `creeper`: yeşil creeper
- `bitti`: kalkık asa ve havai fişek
- `insa 80`: yalnız kazan

Bir durum gözle bozuk görünürse (sprite kayması, yanlış katman sırası) `cizim.js`'i düzelt ve `claude plugin test plugin` ile testleri yeniden çalıştır.

- [ ] **Step 3: README'yi yaz**

`README.md`:
````markdown
# Clawd Büyücü

Claude çalışırken istem satırının hemen üstünde küçük bir piksel Minecraft sahnesi açılır.
Clawd'un elinde büyücü asası var. Düşünürken dışarıda canavarlara büyü atıp malzeme toplar.
Okurken büyü kitabını çevirir. Düzenlerken kazanda iksir karıştırır ve her iksiri dolaba koyar.

| Claude ne yapıyor | Sahnede |
|---|---|
| Düşünüyor | Araziye yürür, zombi/iskelet/örümcek/slime'a büyü atar, kemik, mantar ve çiçek toplar |
| Read / Grep / Glob | Kürsüdeki büyü kitabını çevirir — `README.md'yi okuyor` |
| Edit / Write | Kazanı karıştırır, dosya türünün renginde bir şişe doldurup dolaba koyar |
| WebFetch / WebSearch | Kristal küreye bakar — `kürede: github.com` |
| Bash | Asadan kıvılcımla TNT'yi tutuşturur, kalkan açar, komut bitince patlar |
| Agent | Portaldan çırak büyücü çıkar, işe katılır; ajan bitince geri döner |
| Araç hata verdi | Creeper gelir, büyü tutukluk yapar, şapka uçar |
| Tur bitti | Dolabın önünde asa havai fişeği; bu turun şişeleri parlar |

Uzaktaysa (8 bloktan fazla) Clawd laba ışınlanır. Toplanan malzeme bir sonraki iksiri parlatır.
Dolap oturumlar arasında saklanır. Spinner'ın yanında sayaç görünür: `· ⚗ 7 iksir · ✦ 12`.

## Oyna

Bandın altında `1: zıpla  2: ←  3: →  4: büyü  5: iksir` şeridi var. İstem boşken bir rakama bas;
Clawd ~5 sn senin kontrolünde kalır. `5` dolaptan bir iksir içer ve kısa süreli etki verir:
hız, yüksek zıplama ya da parlama.

LLM çağırmaz, ağ kullanmaz; arazi tohumlu ve deterministiktir.

## Kurulum

Claude Code **2.1.287** ya da üstü gerekir (`claude update`).

```
/plugin marketplace add ~/clawd-buyucu
/plugin install clawd-buyucu@clawd-buyucu
```

`/buyucu` modu açıp kapatır (tercih saklanır, varsayılan açık). Terminalde `Raster` ile çizilir;
Desktop'ta tek satır metin gösterir. Bant 90 sütundan darsa lab yalnız kazana iner.

## Geliştirme

```bash
claude plugin test plugin                    # testler
claude plugin validate plugin --strict       # doğrulama
node araclar/onizle.mjs bitti 120            # Claude'suz önizleme
claude --plugin-dir ./plugin                 # bu oturumda yükle, kaydedince yenilenir
```

Claude Code 2.1.289 ile test edildi.
[clawd-madenci](https://github.com/selmakcby/clawd-madenci)'den esinlenildi; kod paylaşılmaz.
````

- [ ] **Step 4: Tüm testleri ve doğrulamayı çalıştır**

Run: `claude plugin test plugin && claude plugin validate plugin --strict`
Expected: `0 fail`; `✔ Validation passed`.

- [ ] **Step 5: Commit**

```bash
git add araclar/onizle.mjs README.md
git commit -m "feat: Claude'suz önizleme aracı ve README

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Gerçek oturumda kontrol (kullanıcıyla)**

Kullanıcıdan ayrı bir terminalde şunu çalıştırmasını iste: `claude --plugin-dir ~/clawd-buyucu/plugin`. Ardından şu istemi göndermesini iste: `README.md'yi oku, sonra README'nin sonuna bir satır ekle ve npm --version çalıştır`.
Expected:
- Bant açılır ve Clawd kürsüde okur.
- Kazanı karıştırır, bir şişeyi dolaba koyar.
- TNT patlatır.
- Tur bitince havai fişek patlar ve bant 2 sn sonra kapanır.
- Spinner'da `⚗ 1 iksir` görünür.
- `/buyucu` bandı kapatır.

Kullanıcının gördüğünü (ya da ekran görüntüsünü) beklemeden "çalışıyor" deme.
