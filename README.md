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
