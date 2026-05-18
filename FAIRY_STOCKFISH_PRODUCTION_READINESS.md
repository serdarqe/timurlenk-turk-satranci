# Fairy-Stockfish Production Readiness Raporu

Olusturma zamani: 2026-05-18T21:59:44.879Z

## Karar

- POC teknik kapisi: GECTI
- Dogrudan production entegrasyonu: HAZIR DEGIL

Kisa yorum: Fairy-Stockfish arama motoru olarak kontrollu entegrasyon deneyinden Fairy-first fork moduna tasindi. WebView smoke sayfasi, public asset paketi, tek-thread build yolu, performans olcumu, pasif debug/shadow entegrasyonu, GPL acik kaynak yayin karari, JS legal fallback kapili Fairy fork karari ve native Timur kaynak varyanti baslangici hazirlandi. Ancak Android cihaz/WebView uzun stres sonucu tamamlanmadan release production karari alinmamali.

## Otomatik Kontroller

| Kontrol | Durum | Not |
|---|---|---|
| POC dosya yapisi | OK | Gerekli POC dosyalari mevcut. |
| WASM artifact dosyalari | OK | stockfish.js=64273 byte, stockfish.wasm=1636483 byte, stockfish.worker.js=3321 byte |
| GPL lisans ve yayin karari | OK | Fairy GPL-3.0 ve proje GPL-3.0-only acik kaynak yayin dosyalari hazir. |
| Android uzun WebView stres karari | Manuel karar gerekli | Production default icin uzun cihaz/WebView smoke ve stres sonucu manuel olarak tamamlanmali. |
| Adapter ve bestmove gate unit testleri | OK | Komut basarili ve beklenen sinyal alindi. |
| Ozel Timur kurallari derin testleri | OK | Komut basarili ve beklenen sinyal alindi. |
| Hibrit Fairy karar katmani testleri | OK | Komut basarili ve beklenen sinyal alindi. |
| Baslangic legal hamle karsilastirmasi | OK | Komut basarili ve beklenen sinyal alindi. |
| Izole tas pozisyonlari karsilastirmasi | OK | Komut basarili ve beklenen sinyal alindi. |
| Gercek Fairy WASM bestmove gate | OK | Komut basarili ve beklenen sinyal alindi. |
| WebView public asset ve smoke sayfasi kontrolu | OK | Komut basarili ve beklenen sinyal alindi. |
| Tek thread WASM build yolu kontrolu | OK | Komut basarili ve beklenen sinyal alindi. |
| Native Fairy Timur kaynak kontrolu | OK | Komut basarili ve beklenen sinyal alindi. |
| Native Fairy Timur bestmove kontrolu | OK | Komut basarili ve beklenen sinyal alindi. |

## Manuel Karar Gerektirenler

| Alan | Durum | Neden |
|---|---|---|
| Android WebView WASM stabilitesi | Kismi | `public/fairy-smoke.html` hazir. Emulator/WebView icinde worker, wasm load ve uzun dusunme sonucu manuel smoke gate olarak dogrulanmali. |
| Tek-thread WASM artifact | Hazir | `SharedArrayBuffer` hatasina karsi tek-thread artifact `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altinda hazir. Android WebView smoke tekrar kosulmali. |
| Performans butcesi | Olculdu | `FAIRY_PERFORMANCE_BUDGET_REPORT.md` depth 1-8 tek-thread POC olcumlerini tutuyor; Android uzun stres testi yine de gerekli. |
| Lisans karari | Tamamlandi | Paket lisansi: GPL-3.0. Proje yayin yolu GPL acik kaynak olarak netlesti. |
| Ozel Timur kurallari | Test kapisi var | Zürafa, Haberci, hisar, sah degisimi, hisar degisimi, pawn-of-pawns, kraliyet hiyerarsisi ve royal capture icin adapter/JS uyum testi eklendi. |
| Fairy fork karar katmani | Varsayilan acik | Fairy hamlesi birincil adaydir; JS legal/policy filtresinden gecmezse JS fallback kullanilir. Android uzun stres karari tamamlanmadan release production onayi verilmemeli. |

## Bir Sonraki Guvenli Adim

1. Fairy fork modu varsayilan acik; release oncesi Android cihaz/WebView uzun stres testi kos.
2. Android emulator icinde `fairy-smoke.html` izole WebView testini kos ve sonucu kaydet.
3. Oyunda `?fairyFork=0` ile JS-only fallback, `?fairyFork=1` ile Fairy-first karsilastirmasi yap.
4. Firestore/mac kayitlarinda `fairyForkEnabled`, `hybridApplied`, `fairyRejectedReason` alanlarini ornek oyunlarda dogrula.
5. Sonraki guvenli adim Android WebView icinde uzun Fairy fork smoke ve Firestore kayit ornegi dogrulamasi.

## Komut Ozetleri

### Adapter ve bestmove gate unit testleri

```text
✔ fairy bestmove satirini normalize eder (0.6569ms)
✔ legal Fairy bestmove JS Timur hamlesi olarak kabul edilir (12.3324ms)
✔ illegal Fairy bestmove reddedilir ve fallback kullanilir (2.6496ms)
✔ gecersiz veya bos Fairy bestmove fallback ile kapanir (2.5707ms)
✔ Fairy FEN baslangic Timur POC dizilimini uretir (1.4947ms)
✔ Fairy shadow metadata legal bestmove ile JS AI hamlesini eslestirir (13.3212ms)
✔ Fairy shadow metadata illegal bestmove icin fallback bilgisi tutar (2.4946ms)
✔ fairy adapter koordinatlari Timur tahtasina gore cevirir (1.3728ms)
✔ fairy adapter baslangic POC farklarini beklenen wrapper sebeplerine ayirir (13.0337ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 142.1588
```

### Ozel Timur kurallari derin testleri

```text
Draw! White King entered Black's Citadel.
Pawn of Pawns reached stage 2! Repatriated to 7, 4.
Pawn promoted to adventitious_king!
✔ giraffe JS-only moves are marked as wrapper-required differences (11.3151ms)
✔ picket one-square diagonal bestmove is rejected by Timur gate (2.459ms)
✔ promotion suffix from Fairy is rejected until Timur promotion wrapper handles it (1.6148ms)
✔ royal swap stays visible as a wrapper-required special move (0.5818ms)
✔ citadel exchange stays visible as a wrapper-required special move (0.3013ms)
✔ offboard citadel entry is not silently dropped by the adapter (0.3321ms)
✔ unsupported pseudo moves are never selected as fallback moves (0.1282ms)
✔ citadel entry still resolves to a JS rule draw (0.4005ms)
✔ pawn-of-pawns cycle and adventitious king promotion remain JS-side effects (0.2687ms)
✔ prince and adventitious king are mapped in Fairy FEN only while on board (0.5372ms)
✔ royal capture remains authoritative JS game-over logic (0.1596ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 115.3502
```

### Hibrit Fairy karar katmani testleri

```text
✔ hybrid disabled keeps Fairy as shadow metadata only (13.0303ms)
✔ hard profile can apply an accepted Fairy move through hybrid gate (2.1983ms)
✔ easy profile records accepted Fairy move but does not apply it (1.1735ms)
✔ forceHybrid can apply accepted Fairy move outside hard profile (1.6694ms)
✔ illegal Fairy move cannot be applied even in hybrid mode (1.4337ms)
✔ matching Fairy and JS move is eligible but does not override (1.1552ms)
✔ fairy fork mode applies accepted Fairy move even on easy profile (1.1891ms)
✔ fairy fork mode falls back safely when Fairy move is rejected (1.0982ms)
✔ fairy fork search depth scales by difficulty and bot level (0.446ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 107.1892
```

### Baslangic legal hamle karsilastirmasi

```text
Fairy vs JS Timur legal hamle karsilastirmasi
Pozisyon: Eril dizilim, beyaz hamle sirasi
JS legal hamle: 31
Fairy POC perft hamle: 31
Ortak hamle: 29
Eslesme: fark var
POC beklenen fark disi: yok
JS motorunda olup Fairy wrapper isteyenler (2)
d2h1 [giraffe, giraffe_requires_wrapper], h2d1 [giraffe, giraffe_requires_wrapper]
Fairy motorunda olup JS kuraliyla reddedilenler (2)
c2d1 [picket_minimum_distance_rule], i2h1 [picket_minimum_distance_rule]
Beklenmeyen JS-only farklar (0)
-
Beklenmeyen Fairy-only farklar (0)
-
Not
- Kalan beklenen farklar: zurafa plain variants.ini ile birebir ifade edilemiyor; picket icin en az 2 kare sarti wrapper veya fork ister.
- Hisar, sah degisimi ve pawn-of-pawns gibi ozel kurallar bu baslangic perft karsilastirmasinda henuz hedeflenmedi.
```

### Izole tas pozisyonlari karsilastirmasi

```text
  Beklenmeyen fark: yok
[OK] revealer_center - Acici/Revealer 3-3 siçrama
  JS: 7, Fairy: 7, Ortak: 7
  Beklenmeyen fark: yok
[OK] rook_center - Kale
  JS: 22, Fairy: 22, Ortak: 22
  Beklenmeyen fark: yok
[OK] picket_center - Haberci/Picket minimum 2 capraz
  JS: 17, Fairy: 21, Ortak: 17
  Beklenmeyen fark: yok
  JS kuraliyla reddedilen Fairy hamleleri: f5e4(picket_minimum_distance_rule), f5e6(picket_minimum_distance_rule), f5g4(picket_minimum_distance_rule), f5g6(picket_minimum_distance_rule)
[OK] giraffe_center - Zurafa ozel hareket
  JS: 17, Fairy: 3, Ortak: 3
  Beklenmeyen fark: yok
  Wrapper gereken JS hamleleri: f5a4(giraffe_requires_wrapper), f5a6(giraffe_requires_wrapper), f5b4(giraffe_requires_wrapper), f5b6(giraffe_requires_wrapper), f5e1(giraffe_requires_wrapper), f5e10(giraffe_requires_wrapper), f5e9(giraffe_requires_wrapper), f5g1(giraffe_requires_wrapper), f5g10(giraffe_requires_wrapper), f5g9(giraffe_requires_wrapper), ... +4
[OK] prince_center - Prens hareketi
  JS: 8, Fairy: 8, Ortak: 8
  Beklenmeyen fark: yok
[OK] adventitious_king_center - Tavsiye/adventitious king hareketi
  JS: 8, Fairy: 8, Ortak: 8
  Beklenmeyen fark: yok
Ozet
- Toplam pozisyon: 17
- Beklenmeyen farkli pozisyon: 0
```

### Gercek Fairy WASM bestmove gate

```text
Fairy bestmove guvenlik kapisi
Pozisyon: Eril dizilim, beyaz hamle sirasi
Fairy raw bestmove: bestmove d3d4
Normalize hamle: d3d4
Karar: kabul
Kaynak: fairy
Sebep: fairy_bestmove_is_timur_legal
Secilen hamle: d3d4
```

### WebView public asset ve smoke sayfasi kontrolu

```text
Fairy WebView asset check
[OK] public/fairy/stockfish.js: 64273 bytes
[OK] public/fairy/stockfish.wasm: 1636483 bytes
[OK] public/fairy/stockfish.worker.js: 3321 bytes
[OK] public/fairy/uci.js: 1117 bytes
[OK] public/fairy/timur-draft.variants.ini: 2462 bytes
[OK] public/fairy/manifest.json: 831 bytes
[OK] public/fairy-singlethread/stockfish.js: 47313 bytes
[OK] public/fairy-singlethread/stockfish.wasm: 48263421 bytes
[OK] public/fairy-singlethread/uci.js: 1117 bytes
[OK] public/fairy-singlethread/timur-draft.variants.ini: 2462 bytes
[OK] public/fairy-singlethread/manifest.json: 775 bytes
[OK] public/fairy-smoke.html: 8703 bytes
[OK] Dynamic Stockfish script reference
[OK] Single-thread engine selector
[OK] Native Timur variant select
[OK] Bestmove gate signal
[OK] Worker CSP signal
```

### Tek thread WASM build yolu kontrolu

```text
Fairy single-thread readiness
Makefile single-thread target: OK
Tek-thread artifact: OK
Rapor: C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\FAIRY_SINGLE_THREAD_READINESS.md
[OK] Fairy kaynak Makefile: C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\emscripten\Makefile
[OK] Makefile threads option: threads degiskeni mevcut.
[OK] Makefile single-thread target: emscripten_build_singlethread hedefi mevcut.
[OK] NO_THREADS flag: Tek-thread build icin NO_THREADS flag mevcut.
[OK] PThread disable path: Tek-thread build icin USE_PTHREADS=0 yolu mevcut.
[OK] PThread normal path: Mevcut pthread build yolu korunuyor.
[OK] Worker conditional copy: Worker dosyasi tek-thread buildde zorunlu degil.
[WARN] Emscripten araci: em++ veya emcc bulunduysa yerelde build denenebilir.
```

### Native Fairy Timur kaynak kontrolu

```text
Fairy native Timur source check passed (18/18).
Source: C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\variant.cpp
```

### Native Fairy Timur bestmove kontrolu

```text
Fairy-Stockfish [commit: , upstream: , emscripten: 2.0.26] LB by Fabian Fichter
Fairy native Timur bestmove
Variant: timur
Bestmove: bestmove d3d4
Artifact: C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\fairy-poc\vendor\fairy-stockfish-singlethread.wasm
```

