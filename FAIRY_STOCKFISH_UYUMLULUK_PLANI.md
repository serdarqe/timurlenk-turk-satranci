# Fairy-Stockfish Timur Uyumluluk Plani

Bu planin amaci Fairy-Stockfish/WASM-NNUE motorunu oyuna aceleyle baglamak degil; once mevcut JS Timur motoruyla guvenli bir uyumluluk katmani kurup farklari olculebilir hale getirmektir.

## Ana Karar

Kisa vadede `wrapper/adaptor` yolu kullanilacak. C++ fork sadece plain Fairy config ve JS wrapper ile cozulmeyen kurallar icin dusunulecek.

Sebep:

- Mevcut oyun motoru zaten Timur kurallarini dogru uyguluyor.
- Fairy motoru guclu arama/evaluation tarafi icin degerli.
- Timur'a ozel hisar, sah degisimi ve zürafa gibi kurallar Fairy config ile tam temsil edilemiyor.
- Direkt C++ fork daha pahali, daha riskli ve GPL/build surecini agirlastirir.

## Kural Karar Tablosu

| Alan | Durum | Kisa Vadeli Cozum | Uzun Vadeli Cozum |
|---|---|---|---|
| 10x11 ana tahta | Fairy kabul ediyor | `timur-draft.variants.ini` | Ayni |
| Piyon, at, kale, sah | Eslesiyor | Fairy config | Ayni |
| Vezir/General/Fil/Dabbaba/Deve | Buyuk oranda eslesiyor | Fairy config + perft testleri | Ayni |
| Haberci/Picket | Fairy ilk capraz kareyi de uretiyor | JS wrapper reddeder | Betza cozulurse config, degilse C++ |
| Zürafa | Plain Betza birebir degil | JS wrapper ekler/korur | C++ legal move generator |
| Hisar kareleri | Tahta disi koordinat | JS wrapper | C++ board genisletme veya wrapper |
| Sah degisimi | Fairy native degil | JS wrapper | C++ ozel hamle |
| Hisar degisimi | Fairy native degil | JS wrapper | C++ ozel hamle |
| Pawn-of-pawns dongusu | Fairy native degil | JS post-move wrapper | C++ state machine |
| Prince/adventitious king | Royal hierarchy farkli | JS sonuc/guvenlik wrapper | C++ royal model |
| 3-kat tekrar | Fairy destekler | Fairy + JS kontrol | Ayni |
| 50-hamle kuralı | Fairy destekler | Fairy + JS kontrol | Ayni |

## Uygulama Fazlari

### Faz 1: Adapter Katmani

Tamamlandi.

- `src/fairy/FairyTimurAdapter.js` eklendi.
- JS motor legal hamleleri Fairy UCI koordinatina cevriliyor.
- Fairy hamleleri JS kurallariyla karsilastiriliyor.
- Fairy'nin fazla verdigi hamleler sebep etiketiyle reddediliyor.
- Fairy'nin uretemedigi ama JS motorun bildigi hamleler `wrapper gerekli` olarak raporlanıyor.

### Faz 2: POC Karsilastirma Scripti

Tamamlandi.

- `scripts/compare-fairy-timur-moves.mjs` adapter katmanini kullanacak sekilde guncellendi.
- Cikti artik sadece fark gostermiyor, farkin beklenen POC siniri mi gercek uyumsuzluk mu oldugunu da gosteriyor.

Guncel baslangic sonucu:

- JS legal hamle: 31
- Fairy POC legal hamle: 31
- Ortak hamle: 29
- Beklenmeyen fark: yok
- Beklenen farklar: zürafa ve Haberci/Picket minimum mesafe kuralı

### Faz 3: Pozisyon Testleri

Tamamlandi.

Her tas icin izole pozisyonlar kurulacak:

- Piyon ileri/capraz alma
- At
- Kale
- Vezir
- General
- Fil
- Dabbaba
- Deve
- Haberci
- Zürafa
- Prince/adventitious king

Hedef: temel taslarda tam eslesme, ozel taslarda bilincli wrapper farki.

Uygulama:

- `scripts/compare-fairy-piece-positions.mjs` eklendi.
- `npm run fairy:poc:pieces` komutu eklendi.
- `timur-draft.variants.ini` genisletildi:
  - Deniz canavari: `s:W`
  - Aslan: `l:H`
  - Boga: `b:Z`
  - Acici/Revealer: `h:G`
  - Prens: `q:K`
  - Tavsiye/adventitious king: `a:K`

Sonuc:

- Toplam pozisyon: 17
- Beklenmeyen farkli pozisyon: 0
- Birebir eslesen ana taslar: piyon, sah, vezir, deniz canavari, general, at, fil, deve, dabbaba, aslan, boga, acici, kale, prens, tavsiye/adventitious king.
- Beklenen wrapper farklari:
  - Haberci/Picket: Fairy ilk capraz kareyi de uretiyor; JS kurali bunu reddediyor.
  - Zürafa: Plain `variants.ini` hareketi birebir uretemiyor; JS wrapper gerekli.

### Faz 4: Fairy Arama Sonucunu Guvenli Kullanma

Tamamlandi.

Fairy `bestmove` verdiginde oyun bunu direkt uygulamayacak.

Akis:

1. Fairy `bestmove` uretir.
2. Adapter hamleyi JS legal hamle listesinde arar.
3. Hamle JS motorunda legalse kullanilir.
4. Hamle JS tarafinda illegal ise reddedilir.
5. JS wrapper gereken zürafa/hisar gibi hamleler icin aday uretim JS tarafindan desteklenir.
6. Hamle bulunamazsa mevcut JS AI fallback kullanilir.

Uygulama:

- `selectSafeTimurMoveFromFairyBestMove()` eklendi.
- `normalizeFairyBestMove()` eklendi.
- `scripts/validate-fairy-bestmove.mjs` eklendi.
- `npm run fairy:poc:bestmove` komutu eklendi.
- `tests/fairy-bestmove-gate.test.js` ve `npm run fairy:poc:bestmove:test` eklendi.

Sonuc:

- Legal Fairy hamlesi kabul ediliyor.
- Illegal Fairy hamlesi JS kural sebebiyle reddediliyor.
- `bestmove 0000`, `(none)` veya bozuk UCI fallback ile kapaniyor.
- Gercek WASM testinde Fairy `bestmove d3d4` uretildi ve JS Timur motoru tarafindan legal oldugu icin kabul edildi.

Not: Bu faz henuz oyundaki ana AI secimini Fairy'ye devretmez. Sadece Fairy hamlesini guvenli sekilde kapidan gecirecek karar katmanini hazirlar.

### Faz 5: Uretime Alma Karari

Tamamlandi.

Fairy ancak su sartlar saglanirsa oyuna baglanacak:

- Android WebView'de WASM stabil calisiyor.
- Hamle dogrulama adapter ile guvenli.
- Ozel kurallar wrapper ile bozulmuyor.
- Performans 5/15/30 dk modlarinda kabul edilebilir.
- GPL-3.0 lisans yukumlulukleri net kabul edildi.

Uygulama:

- `scripts/check-fairy-production-readiness.mjs` eklendi.
- `npm run fairy:poc:readiness` komutu eklendi.
- `FAIRY_STOCKFISH_PRODUCTION_READINESS.md` otomatik raporu uretiliyor.

Son karar:

- POC teknik kapisi: GECTI
- Dogrudan production entegrasyonu: HAZIR DEGIL

Neden production hazir degil:

- Android WebView icinde WASM/worker stabilitesi production gate olarak henuz kosulmadi.
- 5/15/30 dk sure modlarinda performans ve bellek butcesi olculmedi.
- Fairy paketi GPL-3.0 lisansli; yayin karari manuel alinmali.
- Hisar, sah degisimi ve pawn-of-pawns gibi ozel Timur kurallari icin production wrapper testi henuz tamamlanmadi.

Bu karar bilincli bir guvenlik kapisidir: Fairy teknik olarak kontrollu entegrasyon deneyine hazir, fakat oyunun ana AI motoru olarak dogrudan devreye alinmayacak.

### Faz 6: Android/WebView Smoke Kapisi

Tamamlandi.

Bu faz Fairy motorunu oyundaki AI secimine baglamaz. Sadece Android WebView icinde WASM, worker ve `timur_poc` varyanti calisiyor mu diye izole bir test kanali kurar.

Uygulama:

- `scripts/prepare-fairy-webview-assets.mjs` eklendi.
- `scripts/check-fairy-webview-assets.mjs` eklendi.
- `public/fairy-smoke.html` eklendi.
- `public/fairy/` altina `stockfish.js`, `stockfish.wasm`, `stockfish.worker.js`, `uci.js`, `timur-draft.variants.ini` ve `manifest.json` hazirlaniyor.
- `npm run fairy:poc:webview:prepare` komutu eklendi.
- `npm run fairy:poc:webview:check` komutu eklendi.
- `npm run fairy:poc:readiness` artik WebView smoke asset kapisini da kontrol eder.

Smoke sayfasi su akisi dener:

1. WebView/Browser icinde `stockfish.js` yuklenir.
2. `stockfish.wasm` ve `stockfish.worker.js` ayni origin uzerinden cagirilir.
3. `timur-draft.variants.ini` sanal dosya sistemine yazilir.
4. `UCI_Variant value timur_poc` ayarlanir.
5. `position startpos` ve `go depth 1` calistirilir.
6. `bestmove` donerse test gecer.

Not: Bu sayfa production oyuncu akisi degildir. Android WebView gercek cihaz/emulator sonucunda `SharedArrayBuffer`, worker veya WASM thread kisitlari gorulebilir. Bu nedenle production entegrasyonu icin hala manuel WebView sonucu, sure performansi ve GPL-3.0 lisans karari gerekir.

Ilk smoke gozlemi:

- Dosyalar public ve Android asset paketine basariyla gecti.
- Uygulama emulatorde crash olmadan acildi.
- Yerel smoke sayfasinda WebAssembly/Worker/Atomics var, fakat `SharedArrayBuffer` yok.
- Hata: `SharedArrayBuffer is not defined`.
- Sonuc: Mevcut pthread tabanli Fairy WASM paketi production AI'a baglanmamalidir; tek thread WASM build veya Android WebView izolasyon cozumu gerekir.

### Faz 7: Tek Thread WASM Build Yolu

Tamamlandi.

Faz 6 smoke sonucunda mevcut pthread tabanli Fairy WASM paketinin WebView tarafinda `SharedArrayBuffer` istedigi goruldu. Bu nedenle Faz 7'de amac Fairy'yi oyuna baglamak degil, `SharedArrayBuffer` gerektirmeyen tek-thread build yolunu hazirlamakti.

Uygulama:

- `../Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten/Makefile` tek-thread opsiyonunu destekleyecek sekilde guncellendi.
- Varsayilan pthread build yolu korundu: `threads=yes`.
- Tek-thread build yolu eklendi: `threads=no`.
- Tek-thread build icin `-DNO_THREADS` ve `-s USE_PTHREADS=0` yolu eklendi.
- Worker dosyasi tek-thread buildde zorunlu olmaktan cikarildi.
- `emscripten_build_singlethread` hedefi eklendi.
- `scripts/check-fairy-singlethread-readiness.mjs` eklendi.
- `npm run fairy:poc:singlethread:check` komutu eklendi.
- `npm run fairy:poc:readiness` artik tek-thread build yolunu da kontrol eder.
- `FAIRY_SINGLE_THREAD_READINESS.md` otomatik raporu uretiliyor.

Durum:

- Tek-thread build yolu: hazir.
- Tek-thread artifact: hazir.
- Emscripten/emsdk ve GNU make kurulumu tamamlandi.
- `threads=no` build alindi ve `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina kopyalandi.
- Artifact hazirlandiktan sonra Android WebView smoke tekrar kosulmali.

Bu fazdan sonra bile Fairy production AI olarak devrede degildir. Mevcut JS Timur motoru ana motor olarak kalir; Fairy sadece kontrollu POC hattinda tutulur.

## Mevcut Sonuc

Fairy-Stockfish, Timur satranci icin guclu bir arama motoru adayi olabilir; fakat tek basina tam Timur motoru degildir. Bizim mevcut JS motor kural hakemi olarak kalmali, Fairy ise once analiz/arama adayi olarak kontrollu kullanilmalidir.
