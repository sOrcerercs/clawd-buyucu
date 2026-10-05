# Clawd Büyücü — tasarım

Tarih: 2026-10-05 · Durum: onay bekliyor

## Amaç

Claude Code çalışırken istem satırının üstündeki bantta piksel bir Minecraft sahnesi gösteren bir
**Claude Code mod'u**. Clawd'un elinde büyücü asası var: düşünürken dışarıda canavarlara büyü atıp
malzeme toplar, okurken büyü kitabını çevirir, düzenlerken kazanda iksir karıştırır ve her iksiri
arkasındaki dolaba koyar. Dolap oturumlar boyunca dolar.

Esin kaynağı: [selmakcby/clawd-madenci](https://github.com/selmakcby/clawd-madenci). Lisansı
("Tüm hakları saklıdır", yazılı izinsiz kopyalama/değiştirme yok) nedeniyle **kod, sprite ve metin
kopyalanmaz**; proje sıfırdan, resmi mod dokümanına göre yazılır. Madenci yalnızca "bu mümkün"
referansıdır.

## Kapsam ve kısıtlar

- Claude Code v2.1.287+ (mod desteği). Plugin olarak kurulur; `/buyucu` aç/kapat.
- Terminalde `Raster` ile piksel çizim (~11 fps, bant 10 satır = 20 piksel). Desktop'ta tek satır metin.
- LLM çağırmaz, ağ kullanmaz. Arazi tohumlu ve deterministik.
- `$` (mods API) yalnızca `register.js`'de; diğer modüller saf fonksiyon.
- Kod ve tanımlayıcılar Türkçe (madenci geleneği gibi), balon metinleri Türkçe ve ekleri doğru.
- Raster/blit, hook adları ve test aracı ayrıntıları uygulamada `plugin-authoring` skill'i ve
  code.claude.com/docs/en/plugins/mods referansından doğrulanır; bu belgedeki olay adları
  ("PreToolUse" vb.) mantıksal adlardır.

## Dünya ve mekân

Minecraft estetiği: çimen/toprak/taş arazi, iksir standı, kazan, zombi, iskelet, örümcek, slime, creeper.

Tek şerit. Bandın **sol ucunda sabit lab** (59 piksel ≈ 15 blok; Raster'da 1 sütun = 1 piksel): soldan sağa
dolap, büyü kitabı kürsüsü, kristal küre, kazan. Lab'ın sağında açık arazi.

**Lab'a dönüş kuralı:** lab'da geçen bir durum (okuma, inşa, web) geldiğinde Clawd dışarıdaysa:
lab'a ≤ 8 blok uzaktaysa yürür, daha uzaktaysa mor parçacıklarla lab'a ışınlanır.

## Durumlar

| Durum | Tetikleyen | Sahnede | Balon |
|---|---|---|---|
| düşünüyor | araç yok | Arazide sağa yürür. Zombi/iskelet/örümcek/slime çıkar; Clawd baktığı yöne büyü mermisi atar, vurulan canavar malzeme düşürür (kemik, örümcek gözü, slime topu). Yerden mantar/çiçek toplar. | `düşünüyor…` |
| okuma | Read, Grep, Glob, LS, NotebookRead | Kürsüdeki büyü kitabında sayfa çevirir; sayfadan harf/parıltı yükselir. | `README.md'yi okuyor` |
| inşa | Edit, Write, MultiEdit, NotebookEdit | Kazanı asayla karıştırır. Araç bitince bir şişe doldurur, dönüp dolaba koyar. | `register.js'yi karıştırıyor` |
| web | WebFetch, WebSearch | Kristal küreye bakar, kürede bulutlar döner. | `kürede: github.com` / `kürede arıyor: <sorgu>` |
| tnt-fitil | Bash başladı | Önüne TNT koyar, asadan kıvılcımla tutuşturur. TNT beyaz yanıp söner; Clawd geri çekilip kalkan büyüsü açar. Komut sürdükçe fitil sürer. | `npm test patlatıyor` |
| tnt-patlama | Bash bitti | Halka patlama, çevredeki bloklar kırılır, enkaz saçılır. | — |
| alt ajan | Agent/Task başladı | Portaldan farklı renk şapkalı çırak büyücü çıkar; Clawd'un yaptığı işe katılır (dışarıda büyü atar, lab'da karıştırır), işleri hızlandırır. Ajan başına bir çırak; ajan bitince portala döner. | `çırak: <açıklama>` |
| creeper | araç hata döndü | Creeper tıslayarak yaklaşır; Clawd büyü atar, asa "fıs" eder (gri duman). Creeper patlar, Clawd geri savrulur, şapkası uçar ve geri düşer. | `Eyvah, büyü tutmadı!` |
| bitti | tur tamamlandı | Dolabın önüne gelir, asayı kaldırır; uçtan havai fişek. Bu turda eklenen şişeler sırayla parlar. 2 sn sonra bant kapanır. | `Bitti! 7 iksir hazır` |
| oyna | 1–5 tuşları (istem boşken) | ~5 sn oyuncu kontrolü: `1 zıpla · 2 ← · 3 → · 4 büyü · 5 iksir`. Büyü canavar öldürür, blok kırar. İksir dolaptan bir şişe harcar ve kısa etki verir (hız / yüksek zıplama / parlama). | `Kontrol sende!` |
| diğer araç | MCP vb. | Düşünüyor gibi davranır, balon değişir. | `<araç> ile uğraşıyor` |

Diğer kurallar:

- Balon en az ~2 sn görünür (hızlı araçlar milisaniyede biter), sonra düşünüyor'a döner.
- Fitil sırasında hata gelirse TNT hemen patlar, ardından creeper sahnesi.
- Creeper sırasında gelen araç olayı balonu değiştirmez, creeper bitince işlenir.
- Bitti modunda yalnızca yeni tur olayı (bant açılışı) kabul edilir.

## İksirler ve malzemeler

- **Şişe rengi** dosya uzantısından: örn. `.js/.ts` sarı, `.md` mavi, `.py` yeşil, `.json` turuncu,
  `.css/.html` pembe, diğerleri mor. Tam tablo `lab.js`'de.
- **Malzeme:** düşünürken toplanan her malzeme bir sonraki şişenin parlaklığını artırır (sayaç sıfırlanır);
  yeterince malzemeyle dolan şişe parıldar.
- **Dolap:** sabit raf kapasitesi; dolunca en eski raf kayar, sayaç artmaya devam eder.
- **Kalıcılık:** `$.store`'da toplam iksir sayısı ve son 24 şişenin rengi saklanır; dolap oturumlar
  arasında dolmaya devam eder. Oyuncunun 5 tuşuyla içtiği şişe hem dolaptan hem sayaçtan düşer.
- **Spinner eki:** `· ⚗ 7 iksir · ✦ 12` (iksir sayısı · bu oturumda toplanan malzeme). İkisi de
  sıfırsa ek yok.

## Mimari

```
clawd-buyucu/
├── .claude-plugin/marketplace.json
├── plugin/
│   ├── .claude-plugin/plugin.json
│   ├── hooks/
│   │   ├── hooks.json        modules: ["./register.js"]
│   │   ├── register.js       $ kullanan tek dosya: olaylar, saat, çizim, /buyucu, store
│   │   ├── olay.js           araç çağrısı → { tur, metin }; Türkçe ekler
│   │   ├── sahne.js          durum makinesi: olayUygula(durum, olay), adim(durum)
│   │   ├── lab.js            lab yerleşimi, dolap rafları, şişe rengi
│   │   ├── arazi.js          tohumlu arazi, canavar/malzeme yerleştirme
│   │   ├── canavar.js        zombi, iskelet, örümcek, slime, creeper davranışı
│   │   ├── fizik.js          yerçekimi, mermi, parçacık
│   │   ├── sprite.js         piksel dizileri (Clawd+asa+şapka, çırak, kazan, dolap, TNT, canavarlar…)
│   │   ├── cizim.js          durum + boyut → Raster hücreleri
│   │   └── oyuncu.js         1–5 tuşları, iksir etkileri
│   └── tests/clawd-buyucu.test.ts
└── araclar/onizle.mjs        Claude'suz önizleme: belirli bir durumu terminale çizer
```

Her modül tek iş yapar; `sahne.js` diğer saf modülleri çağırır, `cizim.js` yalnızca durumu okur.

### Veri akışı

Olay → `olay.js` çeviri → `sahne.olayUygula` → yeni durum. Ayrıca `$.clock.every(90ms)`:
`sahne.adim` → `cizim` → `$.ui.blit`.

| Claude Code olayı | Sahne olayı |
|---|---|
| tur başladı (ana ajan) | bant açılır, `basla` |
| araç başlayacak (PreToolUse) | `eylem` (okuma / inşa / web / tnt / ajan / diğer) |
| araç bitti (PostToolUse) | `eylemBitti` → patlama, şişe dolaba, çırak gider |
| araç hata (PostToolUseFailure veya is_error) | `hata` → creeper |
| tur tamamlandı (ana ajan) | `bitti`, 2 sn sonra bant gizlenir |
| 1–5 düğmeleri | `oyuncu` |

Araç olayları, `tool.call` içinde beklemek yerine gözlemci hook'larla dinlenir; uzun bir Bash boyunca
saat ve düğmeler donmamalı (uygulamada doğru olay adı dokümandan seçilir). Alt ajanların kendi tur
olayları bandı açıp kapatmaz.

**Durum** içeriği: mod, modKare, kare, Clawd konumu/yönü/hızı, balon, dolap şişeleri, malzeme sayacı,
canavarlar, mermiler, parçacıklar, çıraklar, TNT, oyuncu kontrol süresi, değişen bloklar.

## Hata ve uç durumlar

- `blit` reddedilir/hata verirse `$.ui.invalidate('ui.render')`.
- Bant 90 sütundan darsa lab yalnız kazana iner; dolap, kürsü ve küre gizlenir, şişe doğrudan sayaca eklenir,
  sayaç spinner'da kalır.
- Desktop (Raster yok): `🧙 Clawd: <balon> · ⚗ <n>` tek satır.
- Üst üste turlar: kapanış zamanlayıcısı iptal edilir.
- Store okunamazsa dolap boş başlar, mod açık varsayılır.
- Balon metni Raster'a uygun tek genişlikli karakterlere temizlenir ve kısaltılır.

## Test

`claude plugin test` ile, oturumsuz:

- **olay.js:** araç → tur eşlemesi; Türkçe ekler (`README.md'yi`, `register.js'yi`, `main.py'yi`,
  `ölçek.ts'yi`, yönelme: `dolap.js'ye`); Bash komut adı çıkarma (`cd x && npm test` → `npm test`); uzun metin kısaltma.
- **sahne.js geçişleri:** her durumun girişi/çıkışı; Edit bitince dolaba tam bir şişe; ≤8 blokta yürüyüş,
  >8 blokta ışınlanma; fitil sırasında hata → patlama + creeper; iki ajan → iki çırak, biri bitince bir;
  bitti modunda araç olayının yok sayılması; malzeme → şişe parlaklığı.
- **Determinizm:** aynı tohum ve olay dizisi aynı durumu üretir.
- **Kalıcılık:** store'dan yüklenen dolap; 24 şişe sınırı; oyuncu iksiri sayacı düşürür.
- **register.js duman testi:** tur başla → Read → tur bitti; bant açılıp kapanır, spinner eki doğru.
- **Görsel:** `node araclar/onizle.mjs <durum>` ile her durumun önizlemesi elle kontrol edilir.

Ayrıca `claude plugin validate plugin --strict` temiz geçmeli.

## Kapsam dışı (şimdilik)

- GitHub'a yayın / marketplace yeri (sonra karar).
- Ses, ayarlanabilir tema, dolabı sıfırlama komutu.
- Madenci ile uyumluluk veya ortak kod.
