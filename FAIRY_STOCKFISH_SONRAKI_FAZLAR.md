# Fairy-Stockfish Sonraki Fazlar

Bu belge Fairy-Stockfish/WASM-NNUE tarafinda Faz 7'den sonra izlenecek kontrollu yolu anlatir.

Amac Fairy motorunu aceleyle ana AI yapmak degil; once Android WebView, lisans, performans ve Timur kurallari acisindan guvenli oldugunu kanitlamaktir.

## Mevcut Durum

- Faz 16 karariyla Fairy-first fork modu varsayilan acik hale geldi; JS Timur motoru kural hakemi ve fallback olarak kalir.
- Fairy-Stockfish POC teknik kapisi gecmistir.
- Android/WebView smoke denemesinde mevcut pthread WASM paketi `SharedArrayBuffer is not defined` hatasi vermistir.
- Faz 7 ile tek-thread build yolu hazirlanmistir.
- Tek-thread artifact uretilmistir ve tek-thread smoke yerel Chromium'da `bestmove` dondurmustur.
- Android debug APK guncel tek-thread asset'lerle emulatore kurulmustur.
- Faz 11 performans olcumu tamamlanmistir; tek-thread POC depth 1-8 arasi masaustu Node ve yerel Chromium smoke ile olculmustur.
- Faz 12 debug/deney modu tamamlanmistir; Fairy sadece pasif shadow metadata uretir, JS AI hamlesini degistirmez.
- Faz 13 kural uyumu derin testleri tamamlanmistir; Fairy adapter artik hisar/ozel hamleleri sessizce dusurmez, wrapper gereksinimi olarak raporlar.
- Faz 14 hibrit karar katmani tamamlanmistir; varsayilan kapali kalir, yalnizca `fairyHybrid` acikken JS legal/policy filtresinden gecen Fairy hamlesi uygulanabilir.
- Faz 15 ile GPL-3.0 yayin yolu kabul edildi; proje kaynak kodu GitHub'da acik kaynak olarak paylasilacak.
- Faz 16 ile tam Fairy tabanli fork yolu secildi; `fairyFork` varsayilan acik, Fairy hamlesi birincil aday, JS motor legal/policy fallback katmanidir.

## Faz 8: Tek-Thread Fairy WASM Artifact Uretimi

Hedef:

`SharedArrayBuffer` gerektirmeyen tek-thread `stockfish.js` ve `stockfish.wasm` ciktisi almak.

Durum:

- Faz 8 build otomasyonu eklendi.
- `npm run fairy:poc:singlethread:build` komutu eklendi.
- `FAIRY_SINGLE_THREAD_BUILD_RESULT.md` raporu uretiliyor.
- Emscripten/emsdk `tools/emsdk` altina kuruldu.
- GNU make winget ile kuruldu.
- Tek-thread `stockfish.js` ve `stockfish.wasm` artifact'i uretildi.
- Artifact `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina kopyalandi.
- `npm run fairy:poc:singlethread:check` sonucu: `Tek-thread artifact: OK`.

Yapilacaklar:

- Emscripten/emsdk kurulu mu kontrol edilecek.
- Fairy kaynak klasorunde `threads=no` build calistirilacak.
- Cikan artifact dosyalari ayrica saklanacak.
- Pthread build bozulmadan korunacak.

Beklenen komut:

```powershell
cd "../Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten"
npm run build -- threads=no
```

Basari olcutu:

- `stockfish.js` uretilir.
- `stockfish.wasm` uretilir.
- `stockfish.worker.js` zorunlu olmaz.
- `stockfish.js` icinde `SharedArrayBuffer` ve pthread izi bulunmaz.

Risk:

- Emscripten kurulu olmayabilir.
- Windows build zinciri eksik olabilir.
- Kaynak paket tek-thread buildde ek C++ uyarlamasi isteyebilir.

## Faz 9: Tek-Thread Artifact'i Projeye Alma

Hedef:

Tek-thread Fairy ciktisini mevcut pthread paketinden ayri tutmak.

Durum:

- Tamamlandi.
- Tek-thread artifact mevcut pthread paketinden ayri vendor klasorunde tutuluyor.
- `stockfish.worker.js` yok.
- `SharedArrayBuffer` izi yok.
- `USE_PTHREADS` ve `PROXY_TO_PTHREAD` izi yok.

Hedef klasor:

```text
fairy-poc/vendor/fairy-stockfish-singlethread.wasm/
```

Yapilacaklar:

- `stockfish.js` kopyalanacak.
- `stockfish.wasm` kopyalanacak.
- Gerekirse `uci.js` ve `package.json` bilgisi eklenecek.
- `npm run fairy:poc:singlethread:check` ile artifact kontrol edilecek.

Basari olcutu:

- Tek-thread artifact kontrolu `OK` verir.
- Pthread vendor paketi oldugu gibi kalir.

Risk:

- Cikan JS dosyasi hala thread/worker bekleyebilir.
- Artifact boyutu ve yukleme sekli WebView icin agir olabilir.

## Faz 10: Android WebView Tek-Thread Smoke Testi

Hedef:

Tek-thread Fairy artifact'in Android emulator/WebView icinde calistigini kanitlamak.

Durum:

- Kismen tamamlandi.
- `public/fairy-smoke.html` artik `?engine=singlethread` ile tek-thread artifact'i yukleyebiliyor.
- `public/fairy-singlethread/` asset paketi hazirlaniyor ve kontrol scriptinden geciyor.
- Yerel Chromium smoke sonucu gecti: `uciok`, `readyok`, `timur_poc`, `go depth 1`, `bestmove d3d4`.
- Android debug APK emulatore kuruldu ve ana oyun WebView'i crash olmadan acildi.
- Android logcat'te `SharedArrayBuffer`, WASM, Stockfish veya fatal crash hatasi gorulmedi.
- Android Chrome uzerinden ayrik smoke denemesi Google sign-in ekranina takildigi icin otomatik UI sonucuna baglanamadi.

Yapilacaklar:

- Android WebView icinde smoke sayfasini dogrudan acan debug-only giris/route eklenirse tam cihaz ici sonuc otomatik okunacak.
- Uzun sureli performans olcumu Faz 11'e birakildi.

Basari olcutu:

- Yerel Chromium: gecti.
- Android debug app acilis/log: gecti.
- Android ici ayrik smoke UI otomasyonu: manuel/eksik.

Risk:

- Android WebView dosya yukleme politikalari farkli davranabilir.
- WASM bellek kullanimi yuksek olabilir.
- Smoke gecer ama uzun oyun performansi yetersiz kalabilir.

## Faz 11: Performans ve Sure Butcesi Olcumu

Hedef:

Fairy motorunun mobilde 5 dk, 15 dk, 30 dk ve suresiz modlara uygun dusunme suresiyle calisip calismadigini olcmek.

Yapilacaklar:

- Tamamlandi.
- `scripts/measure-fairy-performance.mjs` eklendi.
- `npm run fairy:poc:perf` komutu eklendi.
- Depth 1-8 arasi tek-thread POC olcumu alindi.
- Rapor `FAIRY_PERFORMANCE_BUDGET_REPORT.md` olarak uretiliyor.
- Smoke sayfasi `?depth=` parametresiyle farkli arama derinliklerini test edebiliyor.

Basari olcutu:

- Yerel Node olcumu: depth 8 P95 29ms, mobil tahmini P95 87ms civarinda.
- Yerel Chromium smoke: `GECTI (singlethread, depth 8): bestmove d3d4`.
- 5 dk, 15 dk, 30 dk ve suresiz icin POC pozisyonunda depth 8 guvenli gorunuyor.
- Production karari icin Android WebView icinde uzun pozisyon/stres testi hala gerekli.

Risk:

- Tek-thread motor pthread kadar hizli olmayabilir.
- Timur tahtasi 10x11 oldugu icin arama maliyeti yukselebilir.
- Guncel POC build `nodes` alanini 0 raporluyor; sure butcesinde dis elapsed/P95 ve engine time birlikte izlenmeli.

## Faz 12: Debug/Deney Modu Entegrasyonu

Hedef:

Fairy motorunu ana AI yapmadan, sadece deneysel hamle onerisi olarak oyuna baglamak.

Durum:

- Tamamlandi.
- `src/fairy/FairyFen.js` ile JS Timur pozisyonu Fairy FEN formatina cevriliyor.
- `src/fairy/FairyDebugEngine.js` ile varsayilan kapali shadow motor eklendi.
- `AIEngine` artik debug modu aciksa Fairy aday hamlesini pasif olarak topluyor.
- `buildMoveRecord`, Firestore game record ve mac gecmisi Fairy debug metadata'sini koruyor.
- Debug modu `?fairyDebug=1&fairyDepth=4` veya `window.timurFairyDebug.enable()` ile aciliyor.
- Fairy hamlesi oyuna uygulanmiyor; `appliedToGame=false`, `shadowOnly=true`.

Akis:

1. Mevcut JS AI hamle uretir.
2. Fairy aday hamle uretir.
3. Adapter Fairy hamlesini JS legal hamle listesinde dogrular.
4. Legal degilse reddedilir.
5. Legal olsa bile debug modunda once kayit altina alinir.
6. Oyuncu deneyimi etkilenmez.

Kayit alanlari:

- `fairyBestMove`
- `fairyAccepted`
- `fairyRejectedReason`
- `fallbackUsed`
- `fairyThinkMs`
- `jsAiMove`

Dogrulama:

- `npm run fairy:poc:debug:test`
- `npm run fairy:poc:readiness`
- `npm run build`
- Yerel app smoke: `?fairyDebug=1&fairyDepth=1`, Hizli Baslat, oyuncu hamlesi, JS AI hamlesi ve Fairy tek-thread yuklemesi.

Basari olcutu:

- Fairy hatali hamle yaparsa oyun bozulmaz.
- JS motor her zaman kural hakemi olarak kalir.
- Firestore/local kayitlarda Fairy davranisi analiz edilebilir.

Risk:

- Iki motoru ayni anda calistirmak performansi etkileyebilir.
- Debug mod UI veya kayit sistemi gereksiz karmasiklasabilir.

## Faz 13: Kural Uyumu Derin Testleri

Hedef:

Fairy aday hamlelerinin Timur kurallariyla uzun vadede guvenli olup olmadigini olcmek.

Durum:

- Tamamlandi.
- `tests/fairy-special-rules.test.js` eklendi.
- `npm run fairy:poc:special-rules:test` komutu eklendi.
- Readiness kapisi Faz 13 testini calistiracak sekilde guncellendi.
- `FAIRY_SPECIAL_RULES_COMPATIBILITY_RESULT.md` raporu eklendi.
- `collectTimurLegalMoves()` artik Fairy UCI ile temsil edilemeyen hisar hamlelerini sessizce atmak yerine `unsupported` wrapper hamlesi olarak raporlar.
- `selectSafeTimurMoveFromFairyBestMove()` fallback secerken desteklenmeyen tahta-disi pseudo hamleleri oyun hamlesi olarak kullanmaz.

Test alanlari:

- Zürafa hareketi
- Haberci minimum mesafe
- Hisar beraberligi
- Sah degisimi
- Hisar degisimi
- Pawn-of-pawns dongusu
- Prens/adventitious king
- Mat, pat, royal capture sonuclari

Dogrulama:

```powershell
npm run fairy:poc:special-rules:test
npm run fairy:poc:readiness
npm run build
```

Basari olcutu:

- Fairy illegal hamleleri adapter tarafindan yakalanir.
- JS motor ile sonuc kurallari celismez.
- Ozel Timur kurallari oyun sonunu bozmaz.

Risk:

- Fairy native royal model Timur coklu kraliyet modelini tam temsil etmeyebilir.
- Bazi kurallar sadece JS wrapper ile guvenli kalabilir.

## Faz 14: Hibrit AI Karar Katmani

Hedef:

Fairy guvenli ve hizli ise, mevcut JS AI ile birlikte hibrit karar sistemi kurmak.

Durum:

- Tamamlandi.
- `src/fairy/FairyDebugEngine.js` icinde varsayilan kapali hibrit kapisi eklendi.
- `?fairyHybrid=1`, `localStorage.timur_fairy_hybrid=1` veya `window.timurFairyDebug.enableHybrid()` ile acilabilir.
- `?fairyHybrid=force` veya `window.timurFairyDebug.enableHybrid({ force: true })` tum profillerde test amacli zorlar.
- `AIEngine` artik Fairy sonucunu sadece hibrit kapisi acikken ve JS legal/policy filtresi uygunsa JS hamlesinin yerine uygulayabilir.
- Kolay/orta klasik modlarda Fairy kabul edilse bile varsayilan hibrit uygulama yapmaz; hard ve Bot 10+ profilleri uygundur.
- Firestore/mac kaydi icin `hybridEligible`, `hybridApplied`, `hybridRejectedReason` alanlari eklendi.
- `tests/fairy-hybrid-policy.test.js` ve `npm run fairy:poc:hybrid:test` eklendi.

Onerilen model:

- JS motor: kural hakemi ve fallback.
- Fairy motor: derin arama adayi.
- JS evaluation: Timur'a ozel oyun sonu, hisar, pawn-of-pawns ve karakter davranisi.
- Adapter: legal hamle kapisi.

Karar mantigi:

- Fairy hamlesi legal ve guvenliyse aday havuzuna girer.
- JS AI ciddi taktik veya Timur'a ozel risk gorurse Fairy hamlesini reddedebilir.
- Zorluk seviyesine gore Fairy etkisi degisir.
- Fairy ve JS ayni hamleyi onerirse override yapilmaz, sadece eslesme olarak kaydedilir.
- Fairy illegal/unsupported hamle onerirse oyun JS hamlesiyle devam eder.

Zorluk etkisi:

- Kolay: Varsayilan hibrit uygulama yok; sadece shadow/kayit.
- Orta: Varsayilan hibrit uygulama yok; `force` ile test edilebilir.
- Zor: Hibrit aciksa kabul edilen Fairy hamlesi uygulanabilir.
- Bot 10-15: Hibrit aciksa kabul edilen Fairy hamlesi uygulanabilir.

Dogrulama:

```powershell
npm run fairy:poc:hybrid:test
npm run fairy:poc:readiness
npm run build
```

Risk:

- Hibrit sistem fazla karmasiklasabilir.
- Fairy guclu olsa bile Timur'a ozel strateji icin JS policy gerekmeye devam eder.
- Android uzun stres karari bitmeden hibrit mod production default yapilmamali.

## Faz 15: Lisans ve Yayin Karari

Hedef:

Fairy-Stockfish GPL-3.0 oldugu icin yayin kararini netlestirmek.

Durum:

- Tamamlandi.
- GPL-3.0 yolu kabul edildi.
- Proje kokune `LICENSE` eklendi.
- Root `package.json` lisansi `GPL-3.0-only` olarak tutuluyor.
- `THIRD_PARTY_NOTICES.md`, `SOURCE_DISTRIBUTION.md`, `OPEN_SOURCE_RELEASE_GUIDE.md` ve `FAIRY_GPL_RELEASE_DECISION.md` eklendi.
- `npm run release:gpl:check` komutu lisans, kaynak dagitimi ve gizli dosya kontrollerini yapar.
- Fairy production default karari hala Faz 16'ya birakildi.

Basari olcutu:

- Lisans riski belirsiz kalmadi.
- Yayin stratejisi GitHub acik kaynak yolu olarak netlesti.
- Kullaniciya ve Store'a yanlis bilgi verilmemesi icin kaynak/lisans rehberi hazirlandi.

## Faz 16: Production Karari

Hedef:

Fairy motorunun oyuna hangi seviyede girecegine karar vermek.

Karar:

- Tam Fairy tabanli fork yolu secildi.
- Oyun tarafinda Fairy-first karar modu varsayilan acik yapildi.
- `?fairyFork=0` veya `window.timurFairyDebug.disableFork()` ile JS-only fallback moda donulebilir.
- `?fairyFork=1` veya `window.timurFairyDebug.enableFork()` ile Fairy-first mod tekrar acilir.
- Fairy illegal, unsupported veya Timur'a ozel wrapper isteyen hamle onerirse JS motor fallback olarak devreye girer.
- Zorluk ve bot seviyesi Fairy arama derinligini etkiler.

Uygulanan model:

- Fairy motoru: birincil arama motoru.
- JS motor: guvenli fallback, Timur kural hakemi ve kayit/analiz uyumluluk katmani.
- Adapter: Fairy UCI hamlesini JS legal hamle listesine eslestirir.
- Kayit: `fairyForkEnabled`, `fairyBestMove`, `fairyAccepted`, `fairyRejectedReason`, `hybridApplied` alanlari mac verisine gider.

Derinlik:

- Kolay: dusuk Fairy depth, daha hizli ve daha hata payli.
- Orta: dengeli Fairy depth.
- Zor: daha derin Fairy arama.
- Botlar: Bot 1-15 seviyesi arttikca Fairy depth artar.
- 5 dk surede depth azalir; 30 dk/suresiz modda depth artar.

Dogrulama:

```powershell
npm run fairy:poc:fork:test
npm run fairy:poc:readiness
npm run build
```

Sinir:

- Bu uygulama oyunda Fairy-first fork modunu kurar.
- C++ kaynak icinde Timur kurallarinin native uygulanmasi Faz 17 ile baslatildi.
- Android uzun WebView stres testi release oncesi manuel kapidir.

## Faz 17: Native Fairy-Stockfish Timur Varyanti

Hedef:

Fairy-Stockfish kaynak kodunda Timur Satranci'ni harici `.variants.ini` dosyasina bagli olmadan built-in varyant olarak baslatmak.

Durum:

- Tamamlandi.
- `Satranc Motoru/fairy-stockfish.wasm-nnue/src/variant.cpp` icine `timur_variant()` eklendi.
- `timur` ve geriye uyumluluk icin `timur_poc` varyant adlari native kaydedildi.
- 11x10 tahta, baslangic FEN'i, temel/ozel tas cekirdegi, zorunlu terfi, 3-kat tekrar ve 50 hamle yardimcilari kaynak koda girdi.
- Mevcut `tools/emsdk` ve Git Bash ile native WASM build alindi.
- Single-thread artifact uretildi ve `public/fairy-singlethread` altina hazirlandi.
- Oyun tarafinda `timur_poc` external load yerine built-in `timur` varyanti kullanilmaya baslandi.

Dogrulama:

```powershell
npm run fairy:native:source:check
npm run fairy:native:bestmove
npm run fairy:poc:singlethread:build
npm run fairy:poc:webview:check
npm run fairy:poc:readiness
npm run build
```

Build notu:

- Pthread WASM build `Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten/public` altina uretildi.
- Android/WebView icin single-thread WASM build `TimurChessWeb/public/fairy-singlethread` altina hazirlandi.
- `npm run fairy:native:bestmove` native `timur` varyanti ile bestmove urettigini dogruladi.

Sinir:

- Hisar, sah-hisar degisimi, pawn-of-pawns, ek sah royal mantigi ve zurafa hareketi sonraki C++ fazlarina kaldi.
- Android uzun WebView stres testi release oncesi manuel kapidir.

## Ozet Yol Haritasi

| Faz | Ad | Durum |
|---|---|---|
| 8 | Tek-thread WASM artifact uretimi | Tamamlandi |
| 9 | Artifact'i projeye alma | Tamamlandi |
| 10 | Android WebView smoke testi | Kismen tamamlandi |
| 11 | Performans ve sure olcumu | Tamamlandi |
| 12 | Debug/deney modu entegrasyonu | Tamamlandi |
| 13 | Kural uyumu derin testleri | Tamamlandi |
| 14 | Hibrit AI karar katmani | Tamamlandi |
| 15 | GPL lisans/yayin karari | Tamamlandi |
| 16 | Production karari | Tamamlandi: Fairy-first fork varsayilan acik |
| 17 | Native Fairy-Stockfish Timur varyanti | Tamamlandi: kaynak varyant, native WASM ve app built-in `timur` gecisi |
