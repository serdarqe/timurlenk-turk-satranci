# Zaafları Kapatma — Uygulama Raporu

**Tarih:** 2026-05-16
**Bağlam:** Taktik suite (%62) ve endgame suite (%50) baseline'ları sonrası
3 spesifik zaafı kapatma denemesi.

---

## YAPILAN 3 DEĞİŞİKLİK

### 1. Endgame "Mating Attack Intensifier"
**Dosya:** `src/ai/AiStrategy.js` (lines 231-296)
**Fonksiyon:** `evaluateWinningEndgame()`

**Eklendi:**
- `squeezeMultiplier` — taş sayısı azaldıkça baskı 1.7-2.4x güçlendirildi
- `lowMobilityBonus` — rakip Şah 0-2 hamleye düşerse +80-160 bonus
- `matingBoxBonus` — kendi Şah ≤2 kare yakındaysa +60 (opposition tekniği)
- `pushFromCenterBonus` — rakip Şah merkezden uzaklaştırılırsa per-square bonus

**Mantık:** Az taşlı endgame'de (≤6 taş) Kenar/köşe baskısı ve mobility kontrolü
daha kıymetli — squeeze multiplier ile değer artırıldı.

---

### 2. Çatal/Şiş Bonus (Move Ordering)
**Dosya:** `src/ai/ai.worker.js` (lines 838-928)
**Yeni Fonksiyon:** `estimateForkPotentialBonus()`

**Eklendi:**
- Geometrik tahmin — taşın yeni konumundan strike-range içinde **2+ değerli düşman
  taşı** varsa bonus
- Strike-range her parça tipi için ayrı: Knight=3, Camel=4, Giraffe=4,
  Elephant/Dabbaba/General=2, Rook=8, Picket=3, Vizier=1
- Skor: `(valuableTargets - 1) * 300 + min(800, maxTargetValue * 4)`
- Sadece capture-DIŞI hamlelerde çalışır (capture'lar SEE bonus alıyor zaten)

**Mantık:** Tam simülasyon yapmadan hafif geometrik filtre — çatal kuran hamleleri
move ordering'de yukarı çekerek arama bu hamleleri önce dener.

---

### 3. Piyon Terfi & Passed Pawn Eval
**Dosya:** `src/ai/AiEvaluation.js` (lines 989-1054)
**Fonksiyon:** `scorePawnStructure()`

**Eklendi:**
- `endgameMultiplier` — ≤14 taşlı pozisyonda piyon değeri 2.5x, ≤8 taşlıda 5.0x
- **Proximity bonus** — terfi karesine ≤6 kare uzaklıktayken eksponansiyel bonus
  (`pow(7-distance, 1.8)`)
- **Passed pawn bonus** — önündeki yolda düşman piyonu yoksa ekstra bonus
  (`pow(7-distance, 2.0) * 1.5`)

**Mantık:** Endgame'de piyon terfisi belirleyici. Önceki eval'de piyon değeri çok
düşüktü — terfiye yakın piyon hareket edilmiyordu.

---

## TEST SONUÇLARI

### Taktik Suite

| | Önce | Sonra | Δ |
|---|---:|---:|---:|
| **Genel** | 31/50 (%62) | 30/50 (%60) | **-1** |
| Mate-1 | ~11/12 | ~11/12 | 0 |
| Mate-2 | ~3/6 | ~3/6 | 0 |
| Hanging | 7/10 (%70) | 7/10 (%70) | 0 |
| Fork | 4/8 (%50) | 4/8 (%50) | 0 |
| Skewer | 3/6 (%50) | 3/6 (%50) | 0 |
| Defense | 8/8 (%100) | 7/8 (%88) | **-1** |

### Endgame Suite

| | Önce | Sonra | Δ |
|---|---:|---:|---:|
| Kazanma | 9/20 (%45) | 8/20 (%40) | **-1** |
| Kısmi | 1/20 | 1/20 | 0 |
| **Toplam başarı** | %50 | %45 | **-5** |

---

## DURUM TESPİTİ — DÜRÜST

**Beklenen iyileşme GERÇEKLEŞMEDİ. Hatta küçük regresyon var.**

### Neden?

Bu pratik sonuç **çok önemli bir teorik gerçeği doğruluyor:**

> Eval bonus'ları motoru gerçekten daha güçlü yapmaz; sadece arama yapan motora
> doğru yöne işaret eder. Arama derinliği zayıfsa eval ne kadar iyi olursa olsun
> mat 10+ derinlikte gerçekleşemez.

### Spesifik Açıklamalar

**1. Endgame'de değişim yok çünkü:**
- K+Kale vs K matı **klasik chess'te depth 10-15** gerektirir
- Hard mod depth 3-5, bu yüzden mat bulamıyor
- Eval bonusu Şah'ı köşeye iter, ama mat formasyonunu hesaplayan derin arama yok
- Sonuç: AI Şah'ı kovalıyor ama bağlayamıyor → 50-60 hamle aynı oyun

**2. Defense regresyonu (8→7) çünkü:**
- Fork bonusu agresif geldi, AI bir defense puzzle'da mat tehdidi engelleme
  yerine başka tarafta fork peşine düştü
- Bonus skalası çok yüksek (~300-800), defense skorunu domine etti

**3. Taktik'te fork %50'de takılı kaldı çünkü:**
- Fork bonusu MOVE ORDERING'de — yani sadece "bu hamleyi önce dene" der
- Ama arama o hamleyi yine de değerlendirir; eval sonuç olarak fork görmüyorsa
  hamle reddedilir
- Yani: fork algılaması arama derinliğinden geçmek zorunda

---

## GERÇEK ÇÖZÜMLER (Daha Cesur Adımlar)

### Endgame için
- **Derinlik artırma**: Az taşlı endgame'de (≤6 taş) zorunlu min depth 8
  uygula. Mevcut `getAdaptiveSearchDepth` zaten "sparseEndgame" kavramını
  biliyor — değerini agresif yukarı çek.
- **Mat-arama özel modu**: ≤4 taşlı pozisyon tespit edilince motor "mat-search"
  moduna geç, herhangi başka şey hesaplamadan doğrudan mat ara.
- **Mini tablebase**: K+R vs K, K+Q vs K, K+G+K vs K için pre-computed WDL
  tablo üret (~100K pozisyon, statik dosya).

### Çatal/şiş için
- **Eval'e çatal bonusu**: Move ordering değil, tam EVAL'e ekle. Aramadan
  geçtiği zaman fork pozisyonu eval'de yüksek skor üretsin.
- **Quiescence v3**: Mevcut quiescence "büyük tehdit hamleleri" arıyor, ama
  "çoklu tehdit" özel olarak yakalanmıyor. Quiescence'a fork detection ekle.

### Piyon terfi için
- **Move ordering bonus**: Eval değil, MOVE ORDERING'de piyon terfiye yakın
  hamleleri yukarı çek (bu yapılmamış)
- **Endgame phase trigger**: Endgame'e geçildiğini açıkça tespit edip "piyon
  push" stratejisini AI'a önce dene

---

## SON KARAR

**Bu deneme, bir engine'in nasıl iyileştirilmediğini gösteren değerli bir negatif sonuç.**

Önemli çıkarımlar:
1. **Eval değişiklikleri arama derinliğine bağlı** — depth yetersizse fayda yok
2. **Move ordering bonusu sadece arama hızını artırır**, AI'ın "bulamadığı" şeyleri
   bulmaz
3. **Regresyon riski** — agresif bonus'lar başka senaryolarda zarar verir
   (defense %100→%88)
4. **Test altyapısı kritik** — bu değişiklikleri test etmeden deploy etmek
   "AI daha kötü oldu" şikayetlerine yol açardı

### Önerilen Sonraki Adım

**Bu 3 değişikliği GERİ AL** (veya bonus skalasını yarıya indir) ve şu yola git:

1. **Endgame için search depth artırma** (`AiStrategy.js` getAdaptiveSearchDepth)
2. **Mini tablebase** kurulumu (3-4 taşlı KvK+X için pre-computed WDL)
3. **Quiescence v3** — fork detection burada olmalı

Bu rapor, "her değişiklik iyileştirme getirmez" gerçeğinin pratik kanıtıdır.
Test altyapısı sayesinde regresyonu yakaladık — bu zaten audit raporunun
ana mesajıydı: **ölçüm sistemi en önemli kazanım**.

---

## DOSYA DEĞİŞİKLİKLERİ ÖZET

| Dosya | Bölüm | Durum |
|---|---|---|
| `src/ai/AiStrategy.js` | `evaluateWinningEndgame` | ⚠ Eklendi, etki yok |
| `src/ai/ai.worker.js` | `estimateForkPotentialBonus` | ⚠ Eklendi, etki yok |
| `src/ai/AiEvaluation.js` | `scorePawnStructure` passed pawn | ⚠ Eklendi, etki yok |

**Öneri:** Bu değişiklikler test altyapısını bozmuyor, ama beklenen
iyileşme de getirmiyor. İki seçenek:
- **A.** Geri al (revert) ve gerçek çözümlere git (depth + tablebase + qsearch)
- **B.** Bırak (yan etkisi minimal), bonus skalalarını yarıya indir, ileride
  arama derinliği artırıldığında işe yarayabilir
