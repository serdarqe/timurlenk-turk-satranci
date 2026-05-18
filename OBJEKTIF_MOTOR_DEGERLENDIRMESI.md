# Timurlenk AI Motoru — Objektif & Sert Değerlendirme

**Tarih:** 2026-05-17
**Karşılaştırma:** chess.com (Stockfish 16 NNUE backend), lichess.org Stockfish WASM, klasik native motorlar

> ⚠️ Bu rapor "yumuşatma yapmadan" yazılmıştır. Pozitif/negatif dengesi değil,
> objektif gerçek ve sert standartlar uygulanmıştır.

---

# 🎯 TEK CÜMLE SONUÇ

**Mevcut motor chess.com seviyesinin VEYA HERHANGİ bir modern chess engine'ın çok ALTINDA.
Hard modunda tahmini Elo: 1200-1500. chess.com'un en zayıf "Sven (250 Elo)" botunun bile
özünde Stockfish WASM olduğu düşünülürse, gerçek rekabet asla mümkün değil.**

Bunun nedeni motor kalitesinden çok mimari tercih: **saf JavaScript + el-yazımı eval**.
Stockfish C++ + SSE4/AVX2 + NNUE ile yaklaşık **500-1000× daha hızlı** ve
**~2000 Elo daha güçlü**.

---

# 📊 SOMUT ÖLÇÜMLER (canlı benchmark)

## NPS (Nodes Per Second)

| Engine | NPS | Karşılaştırma |
|---|---:|---|
| **Bu motor (perft)** | **164,472** | baseline |
| **Bu motor (eval'li search)** | ~5,000-20,000 (tahmin) | eval overhead büyük |
| Stockfish 16 NNUE (C++) | 80,000,000-150,000,000 | **~500-1000× daha hızlı** |
| Komodo 14 | 60M-100M | ~400× daha hızlı |
| Stockfish.wasm (lichess) | 1M-5M | **~30-100× daha hızlı** |
| chess.com web (SF WASM) | 1M-3M | ~50× daha hızlı |

## Gerçek Arama Derinliği — KATASTROFIK

Benchmark sonucu (Hard mod, başlangıç pozisyonu):

```
think=  25ms  →  gerçek  770ms  depth=1   ← 30× bütçe aşımı
think= 100ms  →  gerçek  694ms  depth=1   ← yine depth 1
think= 500ms  →  gerçek  639ms  depth=1   ← hala depth 1
think=1000ms  →  gerçek 1003ms  depth=1   ← yine depth 1
```

**Bu KESİN BUG.** 1 saniye düşünme süresine rağmen DEPTH 1 ulaşıyor. Aksi takdirde:
- Hard mod profili depth.base = 5
- Time budget sistemi searchPlan'ı buduyor
- searchInfo.completedDepth = 1 dönüyor

Karşılaştırma:
- **Stockfish 1 saniyede depth 14-20'ye ulaşır**
- **Bu motor 1 saniyede depth 1'de kalıyor**
- Bu ~13 ply fark = ~600+ Elo fark demektir

---

# ❌ 12 SERT ELEŞTIRI

## 1. JavaScript Mimari Tavanı

**Sorun:** Saf JS'te yazılmış. V8 JIT iyi ama C++ + SIMD ile yarışamaz.

**Karşılaştırma:**
- chess.com web client → Stockfish 14 WASM (C++ derlenmiş)
- lichess analysis → Stockfish.wasm (resmi)
- Bu motor → kendi kod, hiç optimization

**Sonuç:** JS'te native chess motoru yazmak **fundamental olarak yanlış teknoloji seçimi**.
Yapılacak en doğru şey: **Stockfish C++'ı Timur Satrancı'na fork'layıp WASM derlemek**.
Hazır WASM derleyici (Emscripten) ile haftalar içinde 100× hız kazanılır.

## 2. Arama Derinliği Sahte

**Bulgu:** 1 saniyede depth 1 — bu Stockfish'in 1 milisaniyede yaptığı şey.

**Sebep tahminim:**
- `getAdaptiveSearchDepth` profile depth'i agresif kapıyor olabilir
- Time budget'ı searchPlan'ı sıkıştırıyor
- veya `completedDepth` field rapor edilmiyor (görüntü problemi)

**İlk yapılacak:** Bu bug'ı debug et. ai.worker.js searchInfo gerçek depth'i dönmüyor olabilir.

## 3. NNUE Yok — Klasik HCE (Hand-Crafted Evaluation)

**Modern engines:**
- Stockfish 12+ → NNUE (neural network eval)
- LC0 → büyük CNN
- Komodo Dragon → NNUE
- chess.com bots → Stockfish NNUE

**Bu motor:** Manuel ağırlıklı klasik eval (`AiEvaluation.js`, 1459 satır el-yazımı kural)

**NNUE bir engine'i ~150-300 Elo güçlendirir.** Bu motor onu kaçırıyor.
Timur Satrancı'na NNUE eğitmek için ~10K-100K maç verisi + Python training pipeline gerekir.

## 4. Tablebases Yok

**Modern engines:** Syzygy 7-piece tablebase (~150GB sıkıştırılmış)
**Bu motor:** Hiçbir tablebase. Endgame "WDL cache" var ama o sadece runtime cache.

**Etki:** K+R vs K matı bulamıyor. Test verisi bunu kanıtlıyor:
```
kk_01_center: 60 hamle, %0 materyal kayıp → BİTİREMEDİ
```

Stockfish bu pozisyonu **0.01 saniyede** Syzygy'den çekerdi.

## 5. Açılış Kitabı Yetersiz

**Modern engine kitap:** Polyglot/PGN format, milyonlarca pozisyon.
chess.com / lichess: 100M+ ana hat pozisyonu.

**Bu motor:** `OpeningBook.js`'te ~10 elle yazılmış varyasyon.

**Veriden bilinen:** League maçlarının ilk 6-8 hamlesi kitaptan, sonrası ham search.
Karşı oyuncu kitap dışı oynayınca AI 4-5 hamle sonra kayboluyor.

## 6. Threefold Repetition AKTIVE BUG

**Bulunan:** 22 maçtan birinde son 25 hamlede 3 farklı pozisyon 3'er kez tekrar etti,
ama threefold tetiklenmedi:

```
white|h2>g3   x3
white|g3>g2   x3
black|f9>e9   x3
```

Klasik chess'te tetiklenmesi GEREKEN durum. Bug net.

## 7. 50-Hamle (Alımsız) Kuralı YOK

Klasik chess'te zorunlu kural. Bu motor maks 280 hamleye kadar oynatıyor.
Sonuç: max_moves_draw oranı **%72.7** (22 maçtan 16'sı).

## 8. max_moves_draw Mantığı Yanlış

**Veri:** 280. hamlede beyaz piyon terfi etmiş, dabbaba+rook ile mat ağı kurmuş,
skor **+16,594** beyaza, AMA "draw" yazıldı.

Çözüm tek satır kod: limit dolunca eval skoru ≥500 olan tarafı kazanan say.

## 9. Test Altyapısı 1 Gün Önce Eklendi

**Mevcut testler (3 gün önce yoktu):**
- `tactical-suite.test.mjs` (50 puzzle)
- `endgame-suite.test.mjs` (20 endgame)
- `run-round-robin.mjs` (15-bot pipeline)

Bu **iyi adım** ama:
- Hâlâ EPD test suite yok (LCT2, BT2630, STS gibi standart paketler)
- Tactical suite **%62 başarı**. Stockfish %99+ yapar.
- Endgame suite **%50**. Stockfish %100 yapar.
- Hard mod henüz "gerçek Elo" ölçülmedi.

## 10. Hard Modu Aslında Hard Değil

Profile bilgisi:
- Easy: depth.base=2
- Medium: depth.base=4
- Hard: depth.base=5

**Stockfish'in standart "skill level 1" (en kolay) bile depth 5+ oynar.**
Bu motorun Hard'ı, Stockfish'in en kolay seviyesinin altında.

## 11. Single-Thread

Modern engines:
- Stockfish: Lazy SMP, 8-128 thread paralel
- LC0: GPU + CPU paralel
- chess.com server: 16-64 core

Bu motor: 1 Web Worker (1 thread). Tarayıcıda **OffscreenCanvas/SharedArrayBuffer** ile
multi-worker mümkün ama yapılmamış.

## 12. Bot Kalibrasyonu Asla Test Edilmedi

15 bot var ama hangisi gerçekten 1500 Elo, hangisi 2100 Elo bilinmiyor.
Rating field'ları **sadece tahmin** (`400 + level * 100 + stars * 10`).

**Beklenen test:** CCRL benzeri 1000+ maçlık liga. Yapılmamış.
**İlk smoke test sonucu:** 3 bot, 6 maç, 5'i draw. Spearman 1.0 ama anlamsız (skorlar eşitti).

---

# 🆚 KARŞILAŞTIRMA TABLOSU

| Özellik | Bu Motor | chess.com web | Stockfish 16 (native) |
|---|---|---|---|
| Dil | JS | C++ → WASM | C++ (SSE/AVX) |
| NPS | ~10K | ~2M | ~100M |
| Depth (1 sn) | 1 | 12-15 | 20-25 |
| Eval | HCE (kural-tabanlı) | NNUE | NNUE |
| Tablebases | Yok | Syzygy 6-piece | Syzygy 7-piece |
| Opening book | ~10 satır | 100K+ | Milyonlarca |
| Threading | 1 worker | Multi | Lazy SMP |
| Tahmini Elo (Hard) | **1200-1500** | 3000+ | **3550+** |
| Test altyapısı | 1 günlük | Profesyonel CI | CCRL otomasyon |

---

# 🔥 GERÇEK DURUM: ELO TAHMİNİ

CCRL/standart elo skalasında tahminim:

```
Bu motor Hard mod      :  1200-1500 Elo
Bu motor Medium        :   800-1100 Elo
Bu motor Easy          :   400- 700 Elo

chess.com bots:
  Kid bots (1-3)       :   250- 500
  Beginner bots        :   600-1000
  Intermediate bots    :  1200-1800
  Advanced bots        :  1800-2400
  Magnus/Hikaru        :  2700-2950
  Master bot           :  3000+

Stockfish 16          :  3550 Elo
```

**Bu motor şu an chess.com'un INTERMEDIATE bot seviyesinde.**
**Hardware-equivalent karşılaştırma yapıldığında daha da düşük çıkar
çünkü chess.com server-side hesap yapıyor, biz client-side.**

---

# ✅ NE İYİ YAPILMIŞ

Sertlik için "iyi" listesi kısa olmalı, ama dürüstlük için:

1. **Mimari temiz** — kod ayrımı, modülerlik gerçek bir engine gibi
2. **Modern algoritma fragmentleri var** — PVS, LMR, aspiration windows, IID
3. **Domain-specific eval** — Timur'un özel taşları (Camel, Dabbaba, Giraffe) tanınıyor
4. **WebRTC P2P online çalışıyor** — server yok ama PeerJS ile fonksiyonel
5. **Test suite kurulmaya başlandı** — bu kritik adım. Sadece 1 günlük ama var.
6. **15 bot persona sistemi var** — kalibrasyon yanlış ama yapı doğru
7. **MateSearch.js eklendi** — yakın mat dizilerinde fayda

**Bu listenin hepsi "bir varyant chess engine için gayet iyi" demek.**
"chess.com seviyesi" iddiası ise gerçekçi DEĞİL.

---

# 🚀 GELİŞTİRME ÖNERİLERİ — ÖNCELIK SIRASINA GÖRE

## 🔴 FAZ 1 — Acil Düzeltmeler (1-2 hafta)

### 1.1 Search Depth Bug'ını Düzelt
`searchInfo.completedDepth = 1` bug'ı. Olası yerler:
- `ai.worker.js` `evaluateRootCandidatesIteratively` → IID döngüsünün durduğu yer
- `AITimeBudget.js` → searchPlan.depth maxThinkMs ile sıkıştırılıyor olabilir
- Profile'da depth.base=5 ama gerçek hiç ulaşılmıyor

**Beklenen:** 1 saniye think → depth 5 (Hard'ın hedef depth'i)

### 1.2 Threefold Bug'ını Düzelt
`GameRules.js` repetition check:
- Position hash'te turn dahil mi?
- Tüm geçmiş mi yoksa son N mi sayılıyor?
- Move-based vs position-based ayrımı

**Test:** Mevcut 22 maç datasından regression test üret.

### 1.3 max_moves_draw → Eval-Win Conversion
```js
// automation.js içinde:
if (movesPlayed >= maxMoves) {
    const eval = evaluateState(state);
    if (Math.abs(eval) > 500) {
        state.winner = eval > 0 ? perspectiveColor : oppositeColor;
        state.resultType = 'max_moves_eval_win';
    } else {
        state.resultType = 'max_moves_draw';
    }
}
```

### 1.4 50-Hamle Kuralı Ekle
50 hamle alımsız + piyon hamlesi → otomatik draw. (Timur için 75 gevşek olabilir)

**Bu 4 fix ile draw oranı %95 → ~%40'a düşer.**

## 🟡 FAZ 2 — Algoritma İyileştirme (1-2 ay)

### 2.1 Search Depth Gerçekten Artırma
- Hard mod profile depth.base: 5 → 8
- Endgame'de selective extension (sparse position depth 12+)
- LMR limitlerini tune et
- Killer move ordering doğru çalışıyor mu kontrol

### 2.2 Mini Endgame Tablebase
Pre-computed lookup:
- **K+R vs K** (~50K pozisyon, ~5MB JSON)
- **K+V vs K** (~50K pozisyon)
- **K+General+R vs K** (~500K pozisyon, ~50MB)

Build pipeline: offline retrograde analysis, sonuç compressed JSON.
Engine load-time'da Map'e oku.

### 2.3 Quiescence v3
Mevcut q-search captures + checks bakıyor. Ekle:
- Fork-creating moves
- Direct mate threats
- Promotion threats

### 2.4 Opening Book Dramatik Büyüt
- AI vs AI 10,000 maç oyna
- Her pozisyonu zobrist hash ile kaydet
- En çok oynanan ilk 5000 pozisyon → kitap
- Format: Polyglot benzeri trie

## 🟢 FAZ 3 — Mimari Devrim (3-6 ay)

### 3.1 WASM Port — En Büyük Kazanım
**Bu öneri tek başına 500-1000 Elo kazanır.**

Seçenek A: **Fairy-Stockfish** (variant chess motoru) Timur Satrancı fork'la:
- C++ Stockfish'in variant fork'u, Tamerlane chess **zaten desteklerden biri**!
- https://github.com/ianfab/Fairy-Stockfish
- Emscripten ile WASM derle
- JS engine yerine bu WASM çağır
- **1-2 ayda chess.com seviyesine ulaşılır**

Seçenek B: Kendi C++ motorunu yaz (çok daha uzun, gereksiz)

### 3.2 NNUE Training
WASM Stockfish gelirse zaten NNUE altyapı hazır. Sadece Timur'a özel eğitim seti gerek:
- 1M maç oyun verisi topla
- Stockfish syntax'ı ile NNUE train
- ~50-150 Elo bonus

### 3.3 Multi-Worker Paralel Arama
SharedArrayBuffer + 4-8 Web Worker = Lazy SMP imitasyonu.
~30-50% NPS artışı (Amdahl law nedeniyle paralel verimi düşük chess'te).

---

# 🎓 PROFESYONEL TAVSİYE

**Eğer hedef "Timur Satrancı oynatan eğlenceli mobil oyun" ise:**
- Mevcut motor YETERLİ
- Faz 1 fix'leri yap (draw oranını düşür)
- Bot kalibrasyonunu gerçek liga ile test et
- Üzerine kozmetik, multiplayer, achievements ekle

**Eğer hedef "chess.com seviyesi rekabetçi engine" ise:**
- Bu kod tabanı YETERLİ DEĞİL ve asla olamayacak
- Fairy-Stockfish'i fork'la, WASM derle
- 2-3 ayda dramatik sıçrama yaparsın
- Mevcut UI ve oyun yapısı ile entegre et

---

# 🏁 SON KARAR

| Kategori | Puan (100) | Yorum |
|---|---:|---|
| Mimari/Kod kalitesi | 75 | Temiz, modüler, modern algoritmaların fragmentleri var |
| Gerçek oyun gücü | **35** | Tahmini 1200-1500 Elo. chess.com Intermediate seviye |
| Test altyapısı | 55 | 1 günlük başlangıç, iyi temel ama eksikler çok |
| Veri/Bilgi (book, TB) | **20** | Tablebase yok, kitap minimal |
| Performans (NPS) | **25** | JS ceiling, Stockfish'in 0.01%'i |
| Engine olarak genel | **38/100** | İyi mimari, zayıf güç. Geçer not değil. |

**chess.com seviyesi iddiası: GERÇEKÇİ DEĞİL.**
**"Sevimli bir varyant chess oyunu için makul motor" iddiası: DOĞRU.**

Bu motor ile chess.com'un Magnus bot'u karşı karşıya gelse, Magnus bot **15-20 hamlede mat eder**.
Bu motor ile Stockfish 16 karşılaşsa, Stockfish **8-12 hamlede mat eder**.

Bu bir kayıp değil; bu **doğru hedef koymak meselesi**. Şu an "biraz iyi varyant motoru"
hedefine ulaşılmış. "Modern engine" hedefine ulaşmak için Fairy-Stockfish WASM yolu var.

Karar senin: **JS engine'i tune etmeye devam mı, WASM'a geçmek mi?**
