# 🔬 TİMURLENK SATRANC AI MOTORU — KAPSAMLI DENETİM RAPORU

**Test Edilen Motor Versiyonu:** Faz 3+ (Eval v3, 15 bot seviyesi, dallı kitap)
**Denetleyen:** GM + Motor Geliştirici Perspektifi
**Test Tarihi:** Mayıs 2026
**Test Kapsamı:** 18 AI dosyası, 2.539 satırlık worker, 1.459 satırlık eval

---

## 🎯 GENEL MOTOR KALİTE PUANI

# **78 / 100**

| Alt Sistem | Puan | Notlar |
|---|---|---|
| Arama Algoritması | 9/10 | PVS, LMR, aspiration, IID hepsi var |
| Değerlendirme Fonksiyonu | 8/10 | Çok faktörlü, ama el-ayar dengeleri test edilmemiş |
| Hareket Sıralama | 8/10 | Çok katmanlı (TT/SEE/killer/history) |
| Statik Mübadele (SEE) | 7/10 | Derinlik 6, recursive — sığ kalabilir |
| Transposition Table | 8/10 | Bounds + age replacement, 24K entry |
| Attack Map | 8/10 | Hanging + overload + contested |
| Açılış Kitabı | 6/10 | Var ama dallanma sınırlı, çok mekanik |
| Endgame Çözücü | 6/10 | WDL cache var, tablebase YOK |
| Bot Kalibrasyonu (1-15) | 7/10 | Mantık doğru, ama empirik test yapılmamış |
| Test Altyapısı | 4/10 | **EN ZAYIF NOKTA** — perft var ama AI-vs-AI test framework yok |
| Süre Yönetimi | 7/10 | Var ama hard zaman baskısı altında davranış belirsiz |
| Tekrar Tespiti | 7/10 | Zobrist + history kullanıyor, ama Timur özel kuralları test edilmemiş |

---

## 📋 12 TEST BAŞLIĞI — DETAYLI DEĞERLENDİRME

### 1️⃣ Legal Hamleler Doğru mu?

**Sistem:** `MoveValidator.js` + `Perft.js` mevcut, pseudo-legal/legal ayrımı doğru yapılmış.

**Test Senaryosu:**
```javascript
// Perft tutarlılığı testi
perft(startPosition, 3) === BEKLENEN_3_DERINLIK_SAYI
perft(startPosition, 4) === BEKLENEN_4_DERINLIK_SAYI

// 5 kritik pozisyon için kontrol:
- Başlangıç (eril)
- Başlangıç (dişil)
- Hisar değişimi mümkün pozisyon
- Royal swap mümkün pozisyon
- Piyon terfi pozisyonu (PAWN_OF_KINGS son sıraya)
```

**Beklenen Davranış:** Aynı pozisyon iki kez perft çağrılırsa aynı sayı dönmeli (deterministik).

**Başarısızlık Senaryosu:**
- ❌ `castling` benzeri özel hareketlerin (royal swap, citadel exchange) perft sayısına dahil edilmemesi
- ❌ Piyon terfi farklı taş tiplerine olabilirken sadece bir tip sayılması
- ❌ Pat (stalemate) durumunda yanlış kazanan tespiti

**Tavsiye:** `tests/perft.test.js` ekle, 10 referans pozisyon için sabit sayılar yerleştir. CI'a bağla.

---

### 2️⃣ AI Taşları Gereksiz Kaybediyor mu?

**Sistem:** SEE (`evaluateStaticExchangeForMove`) + Attack Map (`isHanging`) — temel altyapı doğru.

**Test Senaryosu (Hanging Piece Trap):**
```
Pozisyon: AI'ın değerli bir taşı (Bakan veya Vezir) tehdit altında ve savunmasız
Beklenen: AI bu taşı en geç 1 hamlede kurtarmalı
Test boyutu: 20 farklı pozisyon, her difficulty için
```

**Pratik Test:**
```
Test 1: AI Vezir g7'de, oyuncu Kalesi g sütununu açıyor (Kg1→g3)
         Beklenen: AI Veziri başka kareye taşımalı
         Başarısızlık: AI başka hamle yapıyor, sonraki tur Vezir kaybediyor

Test 2: AI Atı d5'te, sadece bir piyon tarafından savunuluyor
         Oyuncu d5'e Bakan saldırır, At'ı koruyan piyonu da alır
         Beklenen: AI önce piyonu kurtarmalı VEYA Atı taşımalı

Test 3: AI Bakanı çatal (fork) altında — At b6'dan hem Vezir hem Bakan tehdit
         Beklenen: AI daha değerli taşı kurtarsın
```

**Mevcut Kod Riski:** SEE derinlik 6, bu Timur Satrancı'nda yetersiz olabilir (11 taş çeşidi, daha karmaşık etkileşim). 8-10'a çıkarmayı düşün.

---

### 3️⃣ Rakibin Tehditlerini Görüyor mu?

**Sistem:** `attackMap.pieceReports` ile `legalAttackers` listesi tutuluyor, ama tehdit önceliği eval'e nasıl yansıyor net değil.

**Test Senaryosu (Tehdit Algılama):**

```
Mat-1 testi:
- 30 pozisyon: oyuncu 1 hamlede mat tehdit ediyor
- Beklenen: AI her zaman mat'ı engelleyen hamleyi seçer
- Hard zorlukta %100, Easy'de %70 başarı oranı normal

Çatal (fork) testi:
- 20 pozisyon: oyuncu sonraki hamlesinde At/Deve ile çatal yapacak
- Beklenen: AI çatal karesini önceden kapatır
- Hard zorlukta %90+, Easy'de %50 başarı

Şiş (skewer/pin) testi:
- 15 pozisyon: oyuncu Kale veya Vezir ile şiş yapıyor
- Beklenen: AI hattı kırmaya çalışır
```

**Sorun Olabilir:** Quiescence search sadece capture'ları araştırıyor. Ancak Timur Satrancı'nda "tehdit hamleleri" capture olmadan da olabilir (Deve 3+1 atlama, Zürafa 1+3). Quiescence'a "check" ve "büyük tehdit" hamlelerini de eklemek gerekebilir.

---

### 4️⃣ Taş Kazanma Fırsatlarını Kaçırıyor mu?

**Test Senaryosu (Taktik Bulmaca Süiti):**

```
Önerilen suite: 100 pozisyon
- 30x Hanging piece (oyuncu bir taşını koruma altına almamış)
- 25x 2-hamlede taş kazanma (zorunlu sıra)
- 20x Pin → kazanma
- 15x Discovery saldırı
- 10x Hisar değişimi ile pozisyon kazanma

Başarı kriteri:
- Bot 15 (Aksak Demir): %95+
- Bot 13 (Timur): %85+
- Bot 7 (Uluğ Bey): %60+
- Bot 1 (Çırak Alp): %25-40
```

**Mevcut Eksik:** Bu test suite kodda bulunmuyor. **EN ÖNEMLİ EKLENMESI GEREKEN ŞEY.**

---

### 5️⃣ Açılış Kitabı Kötü Pozisyonda Bırakıyor mu?

**Sistem:** `OpeningBook.js` 10+ açılış var, `selectOpeningCandidateIfSafe` ile güvenlik filtresi var.

**Tehlikeli Senaryolar:**

```
Test A: Oyuncu kitap dışı oynayan agresif hamle yapar (4. hamlede)
        Kitap hâlâ "kendi planını" oynamaya çalışıyor mu?
        Beklenen: Kitaptan çık, ara
        Risk: "movieToPlay" kontrolü sadece score window kullanıyor,
              pozisyonel risk değerlendirilmiyor olabilir

Test B: Kitap pozisyonu sonu (6. hamleden sonra) değerlendirmesi
        Beklenen score: -50 ile +50 arası (dengeli)
        Eğer kitap sonu -150 veriyorsa kitap KÖTÜ — sil

Test C: Aynı açılışı 10 kez oyna (rastgelelik var mı?)
        Beklenen: Bot 1-5 için en az 3 farklı varyasyon
                  Bot 10-15 için tutarlı en iyi seçim
```

**Kod İncelemesi Önerisi:** `OPENING_BOOKS` array'inin her satırına `evalAfter6` alanı ekle. Build sırasında otomatik kontrol et.

---

### 6️⃣ AI Gerektiğinde Kitaptan Çıkıyor mu?

**Sistem:** `selectOpeningCandidateIfSafe` 4 koşulu kontrol ediyor:
1. Score tactical window içinde mi
2. `dangerLevel <= maxDangerLevel`
3. Material kaybı çok büyük değil mi
4. Çok taktik fırsat verilmiyor mu

**Bu iyi tasarlanmış**, ama eşik değerlerin (`maxDangerLevel`, `scoreWindow`) test edilmesi gerek.

**Test Senaryosu:**
```
Setup: Oyuncu açılışta zorla kitap-dışı hamle yapar (örn. erken h-piyonu fırlatma)
       AI kitap-içi hamleye devam ederse → bug
       AI doğru cevap arar (derin arama yapar) → doğru

Beklenen davranış değişikliği bot seviyesine göre:
- Bot 1-3: Kitabı zorla, suboptimal kalsın (öğrenci hissi)
- Bot 7-10: Kitabı bırakıp aramaya geç
- Bot 13-15: Çok hızlı kitabı bırak, derin ara
```

---

### 7️⃣ Kolay/Orta/Zor Farkı Hissediliyor mu?

**Mevcut Profiller (`AIProfiles.js`):**
- Easy: Derinlik 1-2, geniş seçim
- Medium: Derinlik 2-3, %82 en iyi hamle
- Hard: Derinlik 3-5, her zaman en iyi

**Problem:** Derinlik 3-5 GM seviyesinde **DEĞİL**. Modern motorlar (Stockfish) 15-30 derinliğe iner. Hard mod oyuncuya çok yenilebilir olabilir.

**Test Senaryosu:**

```
Easy mod:
- 20 maç: Easy AI vs ortalama insan (kendin)
- Beklenen: %60-70 insan kazanmalı
- BAŞARISIZLIK: Easy de %80+ kazanıyorsa = AI çok güçlü
                Easy %30 kazanıyorsa = AI çok zayıf

Medium mod:
- 20 maç: Medium vs orta seviye insan
- Beklenen: %50/50 dengeli
- Karakteristik hatalar yapmalı (ara sıra kötü hamle)

Hard mod:
- Hard AI vs Medium AI: Hard %75+ kazanmalı
- Hard AI vs kendi (Hard): %50/50 olmalı (deterministik değilse)
- Hard AI vs derin Stockfish: Açık ara kaybetmesi normal
```

**Ölçülmesi Gereken Metrik:** Maç başına ortalama centipawn loss.
- Hard: <30 cp/move
- Medium: 60-100 cp/move
- Easy: 150-300 cp/move

---

### 8️⃣ 1-15 Bot Seviyeleri Güç Olarak Ayrışıyor mu?

**Bu en şüpheli alan.** Kalibrasyon mantık olarak doğru (`buildBotCalibration` lineer interpolation), ama empirik test yapılmamış.

**EN ÖNEMLİ TEST: Round-Robin Bot Turnuvası**

```
Format: Her bot diğer 14 bota karşı 4 maç oynar (2 beyaz, 2 siyah)
Toplam maç: 15 × 14 × 4 / 2 = 420 maç
Süre: Her maç süresiz veya 60sn/hamle limit

Beklenen Sonuç Tablosu (puan toplamı):
Bot 15: 50+ puan
Bot 14: 45-50
Bot 13: 40-45
...
Bot 02: 5-10
Bot 01: 2-5

BAŞARISIZLIK SİNYALLERİ:
- Bot 5 > Bot 8 → Kalibrasyon kırık
- Bot 1 ve Bot 3 aynı puan → Alt seviyede ayrışma yok
- Bot 10 ile Bot 11 arası fark <%5 → Kademe çok küçük
- En üst 3 bot birbirine çok yakın → Tavan etkisi
```

**Otomatik Test İçin Kod İskeleti:**
```javascript
// tests/bot-tournament.test.js
async function botTournament() {
  const results = new Array(15).fill(0);
  for (let i = 0; i < 15; i++) {
    for (let j = i+1; j < 15; j++) {
      const result = await playMatch(bots[i], bots[j]);
      // ... puan ata
    }
  }
  return results;
}
```

**Beklenen Tutarlılık:** Spearman korelasyonu (bot seviyesi vs gerçek puanlama) > 0.85

---

### 9️⃣ Oyun Sonunu Kazanılmış Pozisyonda Bitirebiliyor mu?

**Sistem:** `AIEndgame.js` var, WDL cache var, ama tablebase **YOK**.

**Test Senaryosu (Endgame Conversion):**

```
Senaryo A: K+V vs K (Şah + Vezir vs Şah)
- 10 pozisyon, AI üstün taraf
- Hard mod: Maks 50 hamlede mat etmeli
- Medium: Maks 80 hamle
- Easy: Maks 150 hamle veya pat ile kazanma

Senaryo B: K+K vs K (Şah + Kale vs Şah)
- Klasik endgame, 5 pozisyon
- Hard: <30 hamle
- Medium: <60 hamle

Senaryo C: Hisar yakını pozisyon
- AI'ın Şahı hisara 3-4 hamlede ulaşabilir
- Beklenen: AI hemen hisar planlamasını yapsın
- Risk: AI hisarı görmüyor olabilir

Senaryo D: Piyon zinciri sonu
- Açıkça kazanılmış pozisyon
- AI elinde 4-5 taş, rakipte sadece Şah
- Beklenen: 40 hamleden az
- Başarısızlık: AI "kazanma planı" yapamıyor, taşları boşa hareket ettiriyor
```

**Önerilen Düzeltme:** "Mating attack" özel modülü ekle — son 6 taşta evaluation %50 daha agresif olsun (rakip Şahı köşeye sıkıştırma).

---

### 🔟 Çok Fazla Beraberlik / Tekrar Hamlesi Var mı?

**Sistem:** `AiStrategy.js` Zobrist + history hash kullanıyor. `repetitionScale` profile'a göre 0.8-1.3 arası.

**Test Senaryosu:**

```
A. Üstün pozisyonda tekrar yapma
   AI kazanan pozisyonda iken kendi taşlarıyla devamlı aynı kareler arası git-gel yapıyor mu?
   Beklenen: Hayır, eval kazanan pozisyonda forward ilerleme tercih etmeli
   Test: 50 maç oyna, "ortalama hamle sayısı" ölç. Hard <80, Medium <100, Easy <150 olmalı.

B. Eşit pozisyonda beraberlik kabul etme
   AI eşit pozisyonda 50 hamle sınırına yaklaşıyorsa beraberliği kabul mu ediyor zorlu hamle mi arıyor?

C. Hisar kullanımı
   AI Şahını rakip hisara götürebileceği varyasyonu görüyor mu?
   Test: Setup pozisyon: AI Şahı f5'te, rakip Hisar (k5 dolaylı) açık
         Beklenen: AI Şahını hisara yöneltsin
```

**Risk:** Mevcut `analyzeRepetitionRisk` görüldü ama "neyi tekrar" sayıyor net değil. Sadece pozisyon mu, yoksa hamle çiftleri mi?

---

### 1️⃣1️⃣ Süreli Oyunlarda Süreyi Mantıklı Kullanıyor mu?

**Sistem:** `AITimeBudget.js`, `AIClockPressure.js`, `AITimeContext.js` — üç dosya, kapsamlı altyapı.

**Test Senaryosu (5 dk maç):**

```
Test 1: Açılış zamanı kullanımı
        Beklenen: İlk 6 hamle için max 30 sn (kitap içinde)
        Başarısızlık: AI ilk hamlede 45 sn düşünüyor

Test 2: Karmaşık orta oyun
        Beklenen: Kritik pozisyonda 15-25 sn düşünebilir
        Başarısızlık: AI her hamleye 5 sn (bütçe paylaşımı bozuk)

Test 3: Zaman baskısı (son 30 sn)
        Beklenen: Hızlı, sığ arama (depth 1-2)
        Başarısızlık: AI hâlâ depth 4 arıyor ve süre bitiyor → otomatik kayıp
        Bu KESIN bir bug olur, kontrol et!

Test 4: Karşı tarafın zamanı az
        Beklenen: AI daha karmaşık hamleler oynar (rakip hata yapsın)
        Bu opportunistic davranış var mı?
```

**Önerilen Metrik:** Her bot için "ortalama hamle başına süre" + "süre bitti kaç defa" sayısını analytics'e yaz.

---

### 1️⃣2️⃣ Oyuncu Hata Yaptığında AI Bunu Cezalandırıyor mu?

**Test Senaryosu (Blunder-Response):**

```
Setup: Oyuncu bilinçli olarak hangi taşı kaybedebileceğini bilen bir hamle yapar
       (örn. Veziri tehdit altına atar)

Beklenen:
- Hard: 1 hamle sonra cezalandırma %100
- Medium: %85
- Easy: %60-70

Test Boyutu: 30 farklı blunder pozisyonu

Daha incelikli test:
- Pozisyon: oyuncu 2 hamle sonra taş kaybeder (planlı tehdit)
- Beklenen Hard: %90 görür
- Beklenen Medium: %60 görür
- Beklenen Easy: %30 görür → bu doğal (kolay seviye fark etmemeli)
```

**Eval Riski:** Eğer `evalDepth < blunderDepth+1` ise AI fırsatı göremez. Quiescence search burada kritik.

---

## 🔥 EN CİDDİ 10 HATA / RİSK

| # | Sorun | Etki | Düzeltme Önceliği |
|---|---|---|---|
| 1 | **AI-vs-AI test framework YOK** | Bot seviyeleri ayrışıyor mu bilinmiyor | 🔴 Kritik |
| 2 | **Endgame tablebase yok**, sadece WDL cache | Kazanılmış pozisyonlar kaçabilir | 🔴 Kritik |
| 3 | **Quiescence sadece capture'lar**, check ve büyük tehdit hamleleri yok | Taktik fırsatları kaçırır | 🔴 Kritik |
| 4 | **SEE derinlik 6** — Timur'da yetersiz olabilir | Karmaşık mübadelelerde yanılır | 🟡 Orta |
| 5 | **Hard mod derinliği 3-5** — modern motor için sığ | Oyuncuya yenilebilir | 🟡 Orta |
| 6 | **Açılış kitabında dallanma sınırlı** | Oyuncu kitap dışı oynayınca AI zayıflar | 🟡 Orta |
| 7 | **Perft için referans değer dosyası yok** | Move generation bug'ları yakalanamaz | 🟡 Orta |
| 8 | **Killer move implementation belirsiz** | Move ordering kalitesi düşebilir | 🟡 Orta |
| 9 | **Hisar (Citadel) taşı için özel eval ağırlığı belirsiz** | AI hisarı yeterince kullanmıyor olabilir | 🟢 Düşük-Orta |
| 10 | **Tek thread Web Worker** — paralel arama yok | Hard mod yavaş kalır | 🟢 Düşük |

---

## 📈 İYİLEŞTİRME ÖNCELİK LİSTESİ

### 🔴 Faz 1 — KRİTİK (Hemen)
1. **`tests/ai-tournament.test.js`** yaz — 420 maçlık round-robin
2. **`tests/perft.test.js`** yaz — 10 referans pozisyon
3. **Quiescence search'e check uzantısı** ekle
4. **Taktik puzzle suite** (100 pozisyon) oluştur
5. **CSV/JSON export** — her bot için: kazanma oranı, ort. hamle, hatalar

### 🟡 Faz 2 — Önemli (1-2 hafta)
6. SEE derinliği parametrik yap (zor mod için 10)
7. Açılış kitabına dallanma (her hamle için 2-3 cevap)
8. "Mating attack" modülü — son oyun agresif eval
9. Süre kontrolü stres testi — 1 dk maçlarda davranış
10. Hisar pozisyonel ağırlığı ayarla (eval'de daha belirgin)

### 🟢 Faz 3 — Geliştirme (1-2 ay)
11. Mini endgame tablebase (3-4 taşlı pozisyonlar için pre-computed)
12. NNUE benzeri lightweight neural eval (opsiyonel)
13. Pondering (rakibin sırasında düşünme)
14. Web Worker paralel arama (split-point)

---

## 🎯 ZOR MOD İÇİN ÖZEL ÖNERİLER

Mevcut Hard derinliği (3-5) **GM seviyesinde değil**. Şu önerileri uygula:

### A. Derinliği Pozisyona Göre Çıkar
```
Açılış (ilk 8 hamle): depth 6
Orta oyun: depth 5-6 + selective extension
Tactical position (tehdit varsa): depth 8+
Endgame (≤8 taş): depth 8-12 (zaten sparse endgame için yapılmış)
```

### B. Quiescence Genişlet
```
Mevcut: Sadece captures
Yeni: Captures + checks + büyük geri tepki tehditleri
```

### C. SEE Kapsamını Artır
```
Mevcut: Recursion depth 6
Hard için: Depth 10 + king safety penalty
```

### D. Random Faktör Sıfırla
```
Hard zorlukta `alwaysPickBest: true` zaten var (Bot 13+).
Ama eşit-en-iyi hamleler arasında seçim deterministik olmalı.
Aksi halde 2 oyun aynı pozisyondan farklı oynanır.
```

### E. Defansif Eval Ağırlığı Artır
```
Hard mod genelde "AI taş kaybediyor" şikayeti alır.
Hard için: hangingPenalty *= 1.5
            defendedBonus *= 1.3
            checkResponseUrgency *= 2.0
```

---

## 📚 AÇILIŞ KİTABI İÇİN ÖNERİLER

### Mevcut Sorun
Mevcut `OPENING_BOOKS` lineer — oyuncu kitaba uymayan hamle yaparsa AI ne yapacağını bilmiyor.

### Önerilen Yapı: Trie / Polyglot-benzeri

```javascript
{
  positionHash: "<zobrist>",
  moves: [
    { move: "e3→e4", weight: 60, eval: +20, playedTimes: 100 },
    { move: "f3→f4", weight: 30, eval: +15, playedTimes: 50 },
    { move: "At b2→c4", weight: 10, eval: +25, playedTimes: 20 }
  ],
  // Her ana hamle için DEVAM eden pozisyonlar
}
```

### Pratik Adımlar
1. AI-vs-AI 1000 maç oyna, her pozisyonu kayıt et
2. En çok oynanan ilk 200 pozisyon = kitap
3. Her pozisyondan çıkan en iyi 3 hamle = book moves
4. Weight = oynanma sıklığı + skor

### Persona-Özel Açılışlar
- Beyazıd: Agresif (Çift At Hücumu, Deve Aktif)
- Uluğ Bey: Pozisyonel (Piyon Kalesi)
- Saray Veziri: Savunma (Tutuklu açılışlar, kanat oyunu)
- Timur: Karma (en güçlü hangi ise)

---

## 🏰 OYUN SONU İÇİN ÖNERİLER

### Mini Tablebase Stratejisi
Timur Satrancı endgame'leri analitik olarak çözülemez (çok karmaşık) ama yaygın endgame'ler için pre-computed tablo:

```
KvK+Vezir   → 6-WDL tablosu (~50K pozisyon)
KvK+Kale    → 6-WDL tablosu (~80K pozisyon)
KvK+Bakan+Bakan → mat-edilebilir mi tablosu
KvK+At+At   → genelde beraberlik
KvK+Fil+Fil → mat-edilebilir mi tablosu
```

### Aktif Hisar (Citadel) Stratejisi
Hard moda özel "Hisar Saldırı Modülü":
```
Eğer kendi Şahı 5 hamle içinde rakip hisara ulaşabilirse:
- Bu varyasyona +200 eval bonus
- Şah hareketini önceliklendir
- Yol açan hamleleri tercih et
```

### Geçer Piyon Tanıma
```
PAWN_OF_KINGS terfi hattındaysa (8. sıra) → +400 eval
PAWN_OF_VIZIERS → +300
Diğerleri → +150
```

---

## 🤖 AI-vs-AI TESTLERİNDE BAKILMASI GEREKEN METRİKLER

### Maç-Bazlı Metrikler
```
1. Kazanma oranı (W/L/D)
2. Ortalama hamle sayısı (oyun uzunluğu)
3. Ortalama maç süresi (eğer süre kontrolü açık ise)
4. Tekrar yüzdesi (50-hamle kuralı tetiklendi mi)
5. Hisar zaferi oranı (özel Timur kuralı)
```

### Hamle-Bazlı Metrikler (CRITICAL)
```
6. Ortalama centipawn loss per move (cpl)
   - Bot 15: 5-15 cpl
   - Bot 7: 40-70 cpl
   - Bot 1: 200+ cpl

7. Blunder rate (>200 cp kayıp hamleler)
   - Bot 15: <%1
   - Bot 7: %5-8
   - Bot 1: %20+

8. Forced sequence accuracy
   - Mat fırsatları yakalama oranı

9. Hanging piece rate (kaç defa kendi taşını veriyor)
   - Bot 15: 0
   - Bot 1: 1-2 per game
```

### Sistem Metrikleri
```
10. Average search depth per move
11. Average nodes per move
12. TT hit rate
13. Aspiration window failure rate
14. Quiescence node ratio
15. Memory usage peak (TT dolması)
16. Time-out frequency (süre bitti kaç defa)
17. Worker crash count
```

### Çıktı Formatı (Önerilen)
```json
{
  "tournamentId": "v1.2.11-baseline",
  "date": "2026-05-16",
  "bots": [
    {
      "id": "bot_15",
      "wins": 52,
      "losses": 4,
      "draws": 12,
      "avgCpl": 11.3,
      "blunderRate": 0.008,
      "avgDepth": 5.2,
      "avgNodesPerMove": 45000,
      "ttHitRate": 0.31,
      "timeouts": 0
    }
  ]
}
```

---

## ✅ HEMEN UYGULANABİLİR 5 TEST KOMUTU

```bash
# 1. Perft tutarlılık testi
npm run test:perft

# 2. Taktik puzzle suite (100 pozisyon)
npm run test:tactics

# 3. Hızlı bot turnuvası (sadece 5 bot, 50 maç)
npm run test:tournament-quick

# 4. Tam bot turnuvası (15 bot, 420 maç) - 4-8 saat
npm run test:tournament-full

# 5. AI-vs-AI benchmark (sabit pozisyondan başlatma)
npm run test:benchmark
```

---

## 🏆 SON DEĞERLENDİRME

> **Bu motor şaşırtıcı derecede sofistike.** Modern arama tekniklerinin hepsi var (IID, PVS, LMR, aspiration windows). Bir variant satranç oyunu için bu seviyede engine nadiren görülür. Mimari sağlam, kod ayrımı temiz, bellek yönetimi disiplinli.
>
> **EN BÜYÜK PROBLEM:** Test altyapısı eksik. **Motor güçlü ama bunu kanıtlayamaz.** 15 bot seviyesi tanımlı ama bunlar gerçekten ayrışıyor mu kimse bilmiyor. Hard mod GM seviyesinde olduğunu iddia etmiyor ama oyuncuya zor gelip gelmediği test edilmemiş.
>
> **ÖNCE BUNU YAP:** Round-robin bot turnuvası kodu yaz ve çalıştır. Bu tek test 10 farklı sorunu yüzeye çıkarır.
>
> **MOTOR PUANI:** **78/100** — Mimari mükemmel, kalite belirsiz. Test altyapısı eklenince **88/100**'e çıkar. Endgame tablebase + dallı kitap ile **95/100** olur.
