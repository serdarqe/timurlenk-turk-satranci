# Fairy-Stockfish Revize Uygulama Planı

**Tarih:** 2026-05-19
**Versiyon:** 2.0 (mevcut planın değerlendirme sonrası güncellemesi)
**Hedef:** Timur Satrancı motorunu "POC seviyesinde Fairy entegrasyonu"ndan "üretim seviyesinde, lisans uyumlu, ölçülebilir, chess.com-yaklaşan" bir motora taşımak.

---

## 0. Yönetici Özeti

### Mevcut Durum (Plan Yapıldığı An)
- Fairy-Stockfish/WASM entegrasyonu kuruldu
- 3-mod mimari (shadow/hybrid/fork) çalışıyor
- Native Fairy fork'a `timur` varyantı eklendi
- Android emulator smoke test geçti
- Mevcut motor puanı: **65/100** (sadece-JS 38'den +27 sıçrama)

### Hedef Durum
- GPL lisans uyumu tam
- Tüm Timur kuralları motorda doğru
- 15 bot kalibre, gerçek Elo farkı ölçülmüş
- WASM yükleme <3sn, NPS >1M
- Motor puanı **85-90/100** (chess.com seviyesine yakın)

### Strateji
Önceki plan iyi yapılandırılmış ama **3 hata**:
1. GPL lisans en sona atılmış → **legal risk, en başa alınmalı**
2. Stres test çok erken → veri kirli olur, **temel fix'lerden sonra**
3. NNUE planda yok → **uzun vadeli faz olarak eklenmeli**

Bu revize plan bu 3 hatayı düzeltir ve **ölçülebilir kabul kriterleri** ekler.

---

## 1. ÖNCELİK SIRASI (Yeni)

```
🔴 ACİL (Bu Hafta)
   #1  Faz 10 — GPL Lisans Uyumu        [1-2 gün, legal blocker]
   #2  Faz 3  — Zürafa Native Hareketi  [3-5 gün, görünür motor bug'ı]

🟡 ÖNEMLİ (2-4 Hafta)
   #3  Faz 4  — Timur Özel Kuralları    [1-2 hafta]
   #4  Faz 2  — Bot Kalibrasyonu         [3-5 gün]
   #5  Faz 6  — Uzun Stres Test         [3-5 gün, *fix'lerden sonra*]

🟢 STABİLİZASYON (1-2 Ay)
   #6  Faz 7  — Oyun Sonu Güçlendirme   [1-2 hafta]
   #7  Faz 5  — WASM Performans         [1 hafta]
   #8  Faz 8  — Açılış Kitabı           [1 hafta]

📊 SÜREKLİ / UZUN VADE
   #9  Faz 9  — Veri ve Analitik
   #10 Faz 11 — NNUE R&D (YENİ EKLENMİŞ)
   #0  Faz 0  — Mühendislik Standartları (cross-cutting, sürekli)
```

---

## FAZ 0 — Mühendislik Standartları (Cross-Cutting)

> Önceki planda "Faz 1 - Güvenli Rollout" olarak vardı. Bu aslında her faz boyunca uygulanan **prensip**. Ayrı faz değil, **standart**.

### Prensipler

1. **Fail-Safe Davranış**
   - Fairy hata verirse JS fallback devreye girer
   - Kullanıcı "düşünüyor" ekranında **asla 5sn'den fazla** kalmaz
   - Fallback nedenleri standart format ile loglanır: `{ reason, position, mode, ts }`

2. **Test Pre-condition'ları Sabit**
   - Her testte aynı seed, aynı bot config, aynı timeout
   - Reproducibility şart

3. **Log Standardı**
   ```json
   {
     "engine": "fairy" | "js" | "fairy_fallback",
     "fallbackReason": "illegal_move" | "timeout" | "unsupported",
     "thinkMs": 450,
     "depth": 12,
     "ts": "2026-05-19T19:00:00Z"
   }
   ```

4. **Mod Geçiş Kuralı**
   - shadow → hybrid: en az 50 maç sorunsuz çalışmalı
   - hybrid → fork: en az 200 maç + kalite raporu pozitif

5. **Release-Gate Komutu**
   ```powershell
   npm run release:check  # tüm fazların gate test'lerini çalıştırır
   ```

### Sürekli Test
Her commit'te (CI):
```powershell
npm test                        # tüm unit testler
npm run fairy:poc:readiness     # Fairy production-readiness
npm run release:gpl:check       # lisans uyumu
```

---

## FAZ 10 — GPL Lisans Uyumu **[ÖNCELIK #1]**

### Neden #1?
GPL-3.0 kapsamındaki Fairy-Stockfish'i kullanıyoruz. **Lisans uyumu olmadan yapılan release legal risk taşır.** Stockfish takımı takip ediyor; uyumsuzlukta DMCA takedown, Play Store şikayeti gelebilir.

### Hedef
Release alabilir konuma gel.

### Yapılacaklar

#### A. Kaynak Kodu Paylaşımı (1 gün)
- [ ] Fairy fork'unu GitHub'da `public` repo olarak yayımla
- [ ] TimurChessWeb'i GitHub'da GPL-3.0 lisansıyla aç
- [ ] Her iki repo'da `LICENSE` dosyası (GPL-3.0 tam metni)
- [ ] Her iki repo'da `README.md` (attribution + build talimatı)

#### B. Uygulama İçi Bildirim (3-4 saat)
- [ ] Ayarlar → "Hakkında / Lisanslar" sayfası ekle
- [ ] "Powered by Fairy-Stockfish (GPL-3.0)" bildirimi
- [ ] Fairy GitHub linki tıklanabilir
- [ ] Kullanılan Fairy sürümü + commit hash
- [ ] Yapılan değişikliklerin özeti (modifikasyon listesi)

#### C. Otomatik Release Gate (2-3 saat)
- [ ] `scripts/release-gpl-check.mjs` oluştur
- [ ] Kontrol etmeli:
  - `LICENSE` dosyası var mı
  - `README.md`'de attribution var mı
  - About sayfasında link kontrolü
  - Fairy commit hash kayıtlı mı
- [ ] `npm run release:gpl:check` script ekle
- [ ] CI pipeline'a bağla

#### D. Play Store Açıklaması Güncelle (1 saat)
- [ ] Uygulama açıklamasına: "Open source under GPL-3.0"
- [ ] Kaynak kod linki: GitHub repo URL
- [ ] Üçüncü taraf lisanslar bölümü

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef | Doğrulama |
|---|---|---|
| GitHub repo public | Açık | URL erişilebilir |
| LICENSE dosyası | Var | `npm run release:gpl:check` |
| About sayfası attribution | Var + tıklanabilir | Manuel UI test |
| Fairy commit hash kayıtlı | Var | Dosya kontrolü |
| Release script | Geçiyor | CI yeşil |

### Test
```powershell
npm run release:gpl:check
# Beklenen: exit code 0, "all gpl requirements met"
```

### Risk
- **YÜKSEK**: GPL uyumsuz release → store takedown
- **Orta**: Kapalı kaynak iddia edilirse yasal süreç

### Tahmini Süre
1-2 gün (sadece kod paylaşımı + UI değişikliği, motor kodu değişmez)

---

## FAZ 3 — Zürafa Native Hareketi **[ÖNCELIK #2]**

### Hedef
Zürafa'nın Fairy motorunda "immobile" (`z`) placeholder olmaktan çıkarılıp **gerçek Timur hareketine yakın** hale getirilmesi.

### Mevcut Durum
- `timur` varyantında `giraffe = z` (hareket etmiyor)
- Tüm Zürafa pozisyonları JS fallback'e düşüyor
- Maçların **belirsiz yüzdesinde** motor yarım çalışıyor

### Zürafa'nın Gerçek Hareketi
- Önce 1 kare çapraz boş olmalı
- Sonra aynı yönde en az 3 kare düz/yan ilerler
- Yol kapalıysa gidemez
- (Bileşik / iki aşamalı hareket — Fairy doğrudan desteklemez)

### Yapılacaklar

#### Yaklaşım A: Betza Yaklaşımı (önce dene, 1 gün)
- [ ] `B3 + W1` denemesi (1 düz + 3 çapraz)
- [ ] Veya `aF + aR3` (önce 1 çapraz, sonra 3 düz)
- [ ] Fairy'nin Betza parser'ı kabul ediyor mu doğrula
- [ ] JS legal hamleyle karşılaştır (>%95 eşleşme hedef)

#### Yaklaşım B: C++ Wrapper (Plan A çalışmazsa, 3-5 gün)
- [ ] Fairy fork'a custom move type ekle
- [ ] `position.cpp`'de Giraffe için özel `attacks_from()` 
- [ ] Movegen entegre et
- [ ] Native build tekrar derle

#### Doğrulama
- [ ] `fairy-special-rules.test.js`'e Zürafa testleri ekle
- [ ] 20 farklı Zürafa pozisyonu test
- [ ] Reconciliation sayacı: `giraffe_fallback_count` → 0'a yakın

### Ölçülebilir Kabul Kriterleri
| Kriter | Mevcut | Hedef |
|---|---:|---:|
| Zürafa fallback oranı | %100 | <%5 |
| JS-Fairy hamle eşleşmesi | %0 | >%95 |
| Zürafa-içeren maçlarda crash | ? | 0 |
| Yeni test sayısı | 0 | ≥20 |

### Test
```powershell
npm run fairy:native:source:check
npm run fairy:native:bestmove
npm run test -- tests/fairy-special-rules.test.js
npm run fairy:poc:adapter:test
```

### Risk
- **Orta**: Betza yaklaşımı motor hareketini birebir yansıtmazsa, AI Zürafa'yı garip oynar
- **Düşük**: C++ wrapper'da build sorunu (zaman alır ama çözülür)

### Tahmini Süre
3-5 gün (Betza başarılıysa 1 gün, C++ gerekirse 5 gün)

---

## FAZ 4 — Timur Özel Kuralları **[ÖNCELIK #3]**

### Hedef
Fairy motor Timur Satrancı'nın **kritik özel kurallarını** doğru anlasın. Mevcut "JS hakem her şeyi denetler" yaklaşımı çalışıyor ama motor seviyesinde bilmek **gerçek kalite** demektir.

### Kapsam
5 özel kural:

#### A. Hisar (Citadel) Sistemi
- Hisar kareleri (sağ üst köşede)
- Şah hisara girerse oyun değişir
- Hisar değişimi (sürekli yer değiştirme)
- Hisar beraberliği özel durumu

#### B. Royal Swap (Şah ↔ Şehzade Değişimi)
- Belirli koşullarda Şah ve Şehzade yer değiştirir
- Motor bunu özel hamle olarak görmeli

#### C. Pawn-of-Pawns Terfi Zinciri
- Piyon türleri arası terfi
- Karmaşık promotion logic

#### D. Adventitious King (Eğreti Şah)
- Multi-royal hierarchy
- Birden fazla royal taşın koordinasyonu

#### E. Stalemate = Win (Pat = Zafer)
- Timur kuralı: pat yapan kazanır (chess standardı tersi)
- Fairy default'ta draw'a ayarlı → değiştirilmeli

### Yapılacaklar

#### Hangi Kural C++, Hangisi JS Wrapper?
| Kural | Çözüm | Tahmini Efor |
|---|---|---|
| Hisar pozisyon değerleme | C++ (variant.ini bonuses) | 2 gün |
| Royal Swap | C++ wrapper (movegen) | 3 gün |
| Pawn-of-pawns | C++ veya JS hibrit | 2 gün |
| Adventitious King | C++ multi-royal | 3 gün |
| Stalemate = Win | C++ UCI option | 1 gün |

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef |
|---|---|
| Hisar pozisyonu doğru değerlendirme | %100 doğrulama |
| Royal Swap pozisyonunda fallback oranı | <%5 |
| Pawn terfi pozisyonunda doğru bilgisi | >%95 eşleşme |
| Pat pozisyonu doğru sonuç | %100 |
| `endgame-suite.test.mjs` başarı | %50 → >%75 |

### Test
```powershell
npm run test -- tests/fairy-special-rules.test.js
npm run test -- tests/endgame-suite.test.mjs
```

### Risk
- **Yüksek**: C++ kaynak değişiklikleri Fairy upstream merge'ünü zorlaştırır
- **Orta**: Bazı kuralları variant.ini ile tam çözmek mümkün olmayabilir

### Tahmini Süre
1-2 hafta (her kural ayrı ele alınırsa)

---

## FAZ 2 — Bot ve Zorluk Kalibrasyonu **[ÖNCELIK #4]**

### Hedef
15 bot ve kolay/orta/zor modları Fairy motor gücüyle uyumlu, **ölçülebilir Elo farkı olan** sistemler haline gelsin.

### Yapılacaklar

#### A. UCI Parametre Map'leme (1 gün)
```javascript
// AIBots.js güncelleme
const BOT_TO_FAIRY_PARAMS = {
  bot_01_cirak_alp:     { skillLevel: 0,  uciElo: 1320, depth: 3 },
  bot_02_kale_nobetcisi:{ skillLevel: 2,  uciElo: 1450, depth: 4 },
  bot_03_toy_akinci:    { skillLevel: 4,  uciElo: 1580, depth: 4 },
  bot_04_otag_muhafizi: { skillLevel: 6,  uciElo: 1700, depth: 5 },
  bot_05_bozkir:        { skillLevel: 8,  uciElo: 1820, depth: 6 },
  bot_06_genc_emir:     { skillLevel: 10, uciElo: 1940, depth: 7 },
  bot_07_ulug_bey:      { skillLevel: 12, uciElo: 2060, depth: 8 },
  bot_08_saray_veziri:  { skillLevel: 13, uciElo: 2180, depth: 9 },
  bot_09_beyazid:       { skillLevel: 14, uciElo: 2300, depth: 10 },
  bot_10_demir_pence:   { skillLevel: 15, uciElo: 2420, depth: 11 },
  bot_11_kusatma:       { skillLevel: 16, uciElo: 2540, depth: 12 },
  bot_12_hisar:         { skillLevel: 17, uciElo: 2660, depth: 13 },
  bot_13_timur:         { skillLevel: 18, uciElo: 2780, depth: 14 },
  bot_14_cihan_fatihi:  { skillLevel: 19, uciElo: 2900, depth: 16 },
  bot_15_aksak_demir:   { skillLevel: 20, uciElo: 3190, depth: 18 }
};
```

#### B. Karakter Persona Ağırlıkları (2 gün)
| Persona | Saldırı | Savunma | Risk | Sure |
|---|---:|---:|---:|---:|
| Timur | 1.2 | 1.0 | 1.1 | 1.0 |
| Beyazıd | 1.4 | 0.8 | 1.3 | 0.9 |
| Uluğ Bey | 0.9 | 1.2 | 0.7 | 1.2 |
| Saray Veziri | 0.8 | 1.4 | 0.6 | 1.1 |

Fairy UCI options ile bağlanacak (`Contempt`, `Aggression` benzeri parametreler).

#### C. Doğrulama Turnuvası (1 gün)
- `npm run rr:smoke` **yetersiz** (3 bot, 6 maç)
- `npm run rr:full` **zorunlu** (15 bot × 14 rakip × 2 = 210 maç)

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef |
|---|---|
| Bot 15 vs Bot 1 win rate | Bot 15 >%80 |
| Bot 10 vs Bot 5 win rate | Bot 10 >%65 |
| Spearman korelasyonu (level vs gerçek skor) | >0.85 |
| Anomali (sıralama bozukluğu) | 0 |
| Bot başına average CPL (centipawn loss) | Linear artan |

### Test
```powershell
npm run test -- tests/fairy-hybrid-policy.test.js
cd "..\Al vs Al ( Otomasyon)" && npm run rr:full
```

### Risk
- **Orta**: Skill Level 0-20 aralığı Timur'da farklı çalışabilir
- **Düşük**: UCI_LimitStrength variant'larda her zaman desteklenmez

### Tahmini Süre
3-5 gün

---

## FAZ 6 — Uzun Android/WebView Stres Testi **[ÖNCELIK #5]**

### Hedef
Native Fairy motor uzun oyun akışında stabil olsun. **Önceki fix'lerden sonra** anlamlı veri verir.

### Yapılacaklar

#### A. Test Senaryoları (Önceden Yapılmalı)
- 1 saatlik kesintisiz oturum (önceki plandaki 15-20 dk **yetersiz**)
- 10 ardışık maç (her bot seviyesinden)
- Easy/Medium/Hard mod paralel testler
- Süreli ve süresiz modlar
- Oyun durdur/devam et döngüsü

#### B. İzlenecek Metrikler
- AI cevap süreleri (avg, p95, p99)
- WASM bellek kullanımı (initial vs steady-state)
- WebView crash sayısı
- Logcat tarama: `crash`, `wasm`, `memory`, `TypeError`, `ReferenceError`, `out of memory`
- ANR (Application Not Responding) sayısı
- Fallback oranı (Fairy → JS)

#### C. Otomatik Stres Script (1 gün)
- `scripts/android-stress-test.mjs`
- adb komutları ile 1 saatlik otomatik oturum
- Logcat dump + analiz

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef |
|---|---|
| 1 saatlik oturum crash | 0 |
| ANR sayısı | 0 |
| Bellek artışı (1 saat) | <%30 |
| AI ortalama cevap süresi | <2sn (Hard mod), <500ms (Easy) |
| AI p99 cevap süresi | <5sn |
| Fallback oranı | <%10 |

### Test
```powershell
npm run build
npx cap sync android
cd android && .\gradlew.bat installDebug
# Sonra:
npm run stress:android       # YENİ — 1 saatlik otomatik oturum
```

### Risk
- **Orta**: Düşük segment Android cihazda WASM memory limit
- **Düşük**: Capacitor WebView GC davranışı

### Tahmini Süre
3-5 gün (script yazımı + test koşusu + analiz)

---

## FAZ 7 — Oyun Sonu ve Mat Ağı Gücü **[ÖNCELIK #6]**

### Hedef
Fairy motorun **avantajlı pozisyonları beraberliğe sürüklemesi** azaltılsın. Hedef: max_moves_draw oranı %72 → <%20.

### Yapılacaklar

#### A. Az Taşlı Pozisyon Derinleştirme (2 gün)
- ≤6 taşlı pozisyonlarda `go depth 20+`
- ≤4 taşlı pozisyonlarda `go depth 25+`
- Fairy'nin endgame heuristic'leri tetiklenecek

#### B. Endgame Suite Testi (1 gün)
Mevcut `endgame-suite.test.mjs`'i Fairy ile çalıştır:
- K+Kale vs K
- K+Vezir vs K
- K+Bakan vs K
- Terfi sonrası
- 4-5 taş üstünlüğü

#### C. Otomatik Draw Detection (2 gün)
- 50-hamle alımsız → otomatik draw çağrısı
- Threefold repetition fix (önceki rapor bug raporu — düzeltilmeli)
- max_moves_draw yerine eval-based sonuç (skor ≥500 → eval-win)

### Ölçülebilir Kabul Kriterleri
| Kriter | Mevcut | Hedef |
|---|---:|---:|
| K+R vs K conversion | %0 | >%80 |
| K+V vs K conversion | %0 | >%80 |
| Endgame suite | %50 | >%80 |
| Round-robin draw oranı | %95 | <%40 |
| Max-moves-draw oranı | %72 | <%20 |
| Threefold doğru tetikleme | Bug | %100 |

### Test
```powershell
npm run test -- tests/endgame-suite.test.mjs
cd "..\Al vs Al ( Otomasyon)" && npm run rr:full
```

### Risk
- **Düşük**: Endgame derinliği aramaya zaman alır (kullanıcı bekler)

### Tahmini Süre
1-2 hafta

---

## FAZ 5 — Performans ve WASM Boyutu **[ÖNCELIK #7]**

### Hedef
Android/WebView'da motor hızlı açılsın, APK boyutu kabul edilebilir, bellek riski azalsın.

### Yapılacaklar

#### A. Mevcut Durumu Ölç (1 gün)
- WASM dosya boyutu (singlethread = 48 MB?)
- Cold start süresi (app launch → AI hazır)
- WebView memory baseline
- NPS canlı ölçüm

#### B. WASM Optimizasyon (2 gün)
- `wasm-strip` ile debug sembolleri çıkar
- `wasm-opt -O3` Binaryen optimizasyon
- Optionally `brotli` compression
- Hedef: 48 MB → <20 MB

#### C. Lazy Loading (2 gün)
- Splash screen'de WASM yüklenmiyor
- AI maç başlatıldığında yükleme başlar
- Yükleme sırasında progress göstergesi
- Yüklenirken UI freeze yok

#### D. pthread/SAB Araştırma (3 gün)
- Capacitor 6+ COEP/COOP header desteği
- Android WebView SharedArrayBuffer destek matrisi
- Eğer pthread çalışabiliyorsa: 48 MB → 1.6 MB + 2-4x hız

### Ölçülebilir Kabul Kriterleri
| Kriter | Mevcut | Hedef |
|---|---:|---:|
| WASM dosya boyutu | 48 MB | <20 MB |
| APK toplam boyut | ~68 MB | <40 MB |
| Cold start (orta cihaz) | ? | <3 sn |
| AI ilk hamle hazırlık süresi | ? | <2 sn |
| NPS | ~500K | >800K |
| Depth @ 1 sn | ~12 | ≥14 |
| Memory peak (1 saat oturum) | ? | <200 MB |

### Test
```powershell
npm run fairy:poc:webview:check
npm run build
npx cap sync android
# Performans ölçümü:
npm run benchmark:wasm
```

### Risk
- **Orta**: wasm-opt agresif optimizasyon ile motor hata verebilir (test gerekli)
- **Düşük**: Lazy loading kullanıcı deneyimini bozarsa rollback

### Tahmini Süre
1 hafta

---

## FAZ 8 — Açılış Kitabı ve Fairy Uyumlu Açılış Seçimi **[ÖNCELIK #8]**

### Hedef
AI kitap hamlesine **körü körüne bağlı kalmasın**, rakibin hamlesini okuyup güvenli açılış oynasın.

### Yapılacaklar

#### A. Mevcut Kitabı Fairy'ye Validate (1 gün)
- 10 açılış varyasyonunu Fairy ile çalıştır
- Her hamle Fairy'nin legal listesinde mi?
- Pozisyonel skor değerlendirmesi

#### B. Kitap Çıkış Mantığı (2 gün)
- Kitap hamlesi materyal kaybettiriyorsa → motor kitaptan çık
- SEE (Static Exchange Evaluation) ile risk değerlendir
- Threshold: kitap hamlesi -50 cp altındaysa **arama yap**

#### C. Karakter-Özel Açılış (2 gün)
- Beyazıd: agresif açılışlar
- Uluğ Bey: pozisyonel açılışlar
- Saray Veziri: savunmacı açılışlar
- Bot seviyesine göre çeşitlilik

#### D. Açılış Kitabı Büyütme (3 gün)
- AI vs AI 1000 maçtan açılış istatistiği topla
- En çok oynanan ilk 100 pozisyon → kitap
- Fairy ile validate edilmiş

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef |
|---|---|
| Kitap pozisyonu sonu eval skoru | -50 ile +50 arası |
| İlk 15 hamlede tas kaybı | <%5 maçlarda |
| Karakter persona açılış çeşitliliği | En az 3 farklı varyasyon |
| Yeni kitap pozisyon sayısı | 10 → 100+ |
| `opening-risk-suite.test.mjs` başarı | >%90 |

### Test
```powershell
npm run test -- tests/opening-risk-suite.test.mjs
cd "..\Al vs Al ( Otomasyon)" && npm run run -- --fast --max-moves 120
```

### Risk
- **Düşük**: Otomatik kitap büyütme yanlış istatistik üretebilir

### Tahmini Süre
1 hafta

---

## FAZ 9 — Veri ve Analitik **[SÜREKLİ]**

### Hedef
Fairy motorun **gerçek oyun performansı ölçülebilir** olsun.

### Yapılacaklar

#### A. Maç Kaydı Enrichment (1 gün)
Her maçta kaydet:
```json
{
  "matchId": "...",
  "engineUsed": "fairy" | "js" | "mixed",
  "moveBreakdown": [
    { "moveIndex": 1, "engine": "fairy", "thinkMs": 450, "depth": 12, "fallbackReason": null },
    { "moveIndex": 2, "engine": "fairy_fallback", "thinkMs": 80, "depth": 1, "fallbackReason": "giraffe_unsupported" },
    ...
  ],
  "fallbackCount": 5,
  "fallbackRate": 0.08
}
```

#### B. Dashboard / Görselleştirme (3 gün)
- Maç geçmişinde "engine kullanımı" badge'i
- Analytics paneli: fallback oranı trendi
- Bot başına ortalama think süresi
- Firestore'da agrega query'leri

#### C. Firestore Permission Fix (1 gün)
- Mevcut Firestore rules'ları gözden geçir
- Anonim kullanıcı maç upload'u
- Offline tolerance (gönderemezse local'de tutsun)

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef |
|---|---|
| Her maçta engine breakdown var | %100 |
| Firestore upload başarı | >%95 |
| Offline'da maç kaybı | 0 |
| Analytics dashboard güncel | Var |

### Test
```powershell
npm run build
npm run export:games
```

### Tahmini Süre
1 hafta (sürekli iyileştirme)

---

## FAZ 11 — Variant NNUE Eğitimi R&D **[YENİ — UZUN VADE]**

### Hedef
Tamerlane chess'e özel NNUE (Neural Network Updateable Evaluation) eğitilmesi için altyapı hazırlığı. Bu **uzun vadeli R&D** — Faz 1-10 tamamlanmadan başlamamalı.

### Neden Önemli?
- Stockfish'in gücünün **%40-50'si NNUE'den** gelir
- Klasik chess NNUE Tamerlane'de **işe yaramaz** (farklı taşlar, farklı board)
- Tamerlane için **özel eğitilmiş NNUE** = +300-500 Elo

### Yapılacaklar

#### A. Veri Toplama Altyapısı (1 ay)
- Mevcut Firestore maç verisi → training set'e dönüştür
- AI vs AI self-play pipeline
- Hedef: 100K-1M maç pozisyonu
- Her pozisyon için Stockfish-Fairy değerlendirmesi

#### B. NNUE Architecture Araştırma (1 ay)
- Fairy-Stockfish'in NNUE altyapısını incele
- HalfKAv2 vs HalfKP architecture
- Tamerlane için uygun feature set tasarımı (10x11 board, 17 piece types)

#### C. Eğitim Pipeline (2-3 ay)
- nnue-pytorch fork
- Tamerlane veri formatına uyarlama
- GPU training (Colab veya kiralanan instance)
- Training/validation split

#### D. Entegrasyon (1 ay)
- Eğitilmiş `.nnue` dosyasını WASM build'e dahil et
- Fairy `setoption Use NNUE value true`
- Performans karşılaştırması: HCE vs NNUE

### Ölçülebilir Kabul Kriterleri
| Kriter | Hedef |
|---|---|
| Training set boyutu | >100K pozisyon |
| NNUE dosya boyutu | <20 MB |
| Elo artışı (NNUE vs HCE) | >+200 |
| Bot turnuvası kanıt | NNUE >75% kazanma |

### Risk
- **YÜKSEK**: NNUE training karmaşık ve uzun (3-6 ay)
- **YÜKSEK**: Tamerlane için yeterli veri toplamak güç
- **Orta**: Sonuç beklentinin altında olabilir

### Tahmini Süre
4-6 ay (paralel diğer fazlarla)

---

## METRİK TABLOSU (Global Hedefler)

Tüm fazlar tamamlandığında ulaşılması beklenen değerler:

| Metrik | Faz 0 (Şimdi) | Faz 4 sonrası | Faz 11 sonrası |
|---|---:|---:|---:|
| Tahmini Elo (Hard) | 1900-2400 | 2400-2700 | 2800-3200 |
| Search depth (1sn) | ~10 | ~14 | ~18 |
| NPS | ~500K | ~1M | ~3M |
| Tactical başarı | ~%88 | >%95 | >%99 |
| Endgame conversion | ~%75 | >%85 | >%95 |
| Beraberlik oranı | ~%60 | <%40 | <%25 |
| Fairy fallback oranı | ~%15-20 | <%5 | <%2 |
| WASM dosya boyutu | 48 MB | <20 MB | <25 MB (NNUE dahil) |
| Cold start süresi | ? | <3 sn | <3 sn |
| Crash @ 1 saat | ? | 0 | 0 |
| **Motor puanı (100 üzerinden)** | **65** | **80** | **90** |

---

## TAHMİNİ TOPLAM EFOR

| Faz | Süre | Bağımlılık |
|---|---|---|
| Faz 10 (GPL) | 1-2 gün | Yok |
| Faz 3 (Zürafa) | 3-5 gün | Faz 10 sonrası başla |
| Faz 4 (Özel kurallar) | 1-2 hafta | Faz 3 sonrası |
| Faz 2 (Bot kalibrasyon) | 3-5 gün | Faz 4 sonrası |
| Faz 6 (Stres test) | 3-5 gün | Yukarıdakilerden sonra |
| Faz 7 (Oyun sonu) | 1-2 hafta | Faz 4 ile paralel olabilir |
| Faz 5 (WASM perf) | 1 hafta | Bağımsız |
| Faz 8 (Açılış kitabı) | 1 hafta | Faz 4 sonrası |
| Faz 9 (Analitik) | 1 hafta + sürekli | Bağımsız |
| Faz 11 (NNUE) | 4-6 ay | Tüm diğerleri sonrası |

**Toplam aktif geliştirme:** ~2-3 ay (Faz 11 hariç)
**Tam motor olgunluğu:** ~6-8 ay (Faz 11 dahil)

---

## RİSK MATRİSİ

| Risk | Olasılık | Etki | Azaltım |
|---|---|---|---|
| GPL takedown | Düşük (Faz 10 sonrası) | YÜKSEK | Faz 10 #1 öncelik |
| Zürafa C++ wrapper başarısız | Orta | Orta | Plan A (Betza) önce dene |
| pthread/SAB çalışmaz | Orta | Orta | Singlethread devam ederken WASM strip |
| NNUE eğitimi başarısız | YÜKSEK | Orta | Opsiyonel R&D, ana plan etkilenmez |
| Bot kalibrasyon yanlış | Düşük | Düşük | Round-robin doğrulaması |
| Android crash | Düşük | YÜKSEK | Faz 6 stres test öncelik |

---

## RELEASE STRATEJİSİ

### Aşama 1: GPL-Compliant Hotfix Release (Hafta 1)
- Faz 10 tamam
- Mevcut motor durumu korunur
- Play Store güncelleme: "Open source under GPL-3.0"

### Aşama 2: Zürafa Düzeltme Release (Hafta 2-3)
- Faz 3 tamam
- Motor kalitesi belirgin iyileşir
- Sürüm: v1.3.0

### Aşama 3: Tam Kural Desteği Release (Ay 1-2)
- Faz 4 + Faz 2 tamam
- Bot seviyeleri gerçek farkla
- Sürüm: v1.4.0

### Aşama 4: Production-Quality Release (Ay 2-3)
- Faz 5, 6, 7, 8, 9 tamam
- Performans optimize, stres-test geçti
- Sürüm: v2.0.0 — "Stockfish Engine"

### Aşama 5: NNUE Release (Ay 6+)
- Faz 11 tamam
- chess.com seviyesine en yakın
- Sürüm: v3.0.0 — "Neural Network Edition"

---

## KISA SONUÇ

Önceki plan iyiydi. Bu revize plan:
1. **GPL lisansını #1'e aldı** (legal risk)
2. **Stres testini geriye çekti** (fix'lerden sonra)
3. **NNUE'yi ekledi** (uzun vade)
4. **Ölçülebilir metrikler getirdi** (subjektif kriterler yerine)
5. **Faz 1'i Faz 0'a dönüştürdü** (cross-cutting standart)
6. **Release stratejisi ekledi** (5 aşamalı)

**Sonraki adım:** Faz 10'u bugün başlat. 1-2 gün içinde GPL uyumlu hâle gel, sonra Faz 3'e (Zürafa) geç.

---

## KAYNAK BAĞLANTILARI

- Fairy-Stockfish: https://github.com/ianfab/Fairy-Stockfish
- Stockfish ana: https://github.com/official-stockfish/Stockfish
- NNUE-pytorch: https://github.com/official-stockfish/nnue-pytorch
- GPL-3.0 tam metni: https://www.gnu.org/licenses/gpl-3.0.html
- Lichess Stockfish.wasm: https://github.com/lichess-org/stockfish.wasm

---

**Plan Sahibi:** Geliştirici (sen)
**Plan İnceleyen:** AI mühendisi yorumu
**Sürüm:** 2.0
**Sonraki Revizyon:** Faz 4 tamamlandığında
