# Fairy-Stockfish/WASM Kontrollu Gecis POC

Bu POC mevcut Timur satranci motorunu degistirmez. Amac, Fairy-Stockfish/WASM-NNUE motorunun Timur satrancina ne kadar uyarlanabilecegini guvenli sekilde olcmektir.

## Mevcut Durum

- Kaynak klasor: `../Satranc Motoru/fairy-stockfish.wasm-nnue`
- Bu klasor gercek UCI motor katmanidir.
- Yerel klasorde henuz derlenmis `stockfish.js`, `stockfish.wasm`, `stockfish.worker.js` ciktisi yok.
- Hazir Timur/Tamerlane varyanti bulunmadi.
- `variants.ini` ile ozel varyant yuklenebilir, ancak bizim oyundaki bazi kurallar plain config ile birebir karsilanmaz.

## Neden Kontrollu Gidiyoruz?

Fairy-Stockfish cok guclu bir temel, fakat bizim oyun klasik satranc degil:

- 10x11 ana tahta ve iki tahta disi hisar var.
- Sah, prens ve adventitious king coklu kraliyet mantigi kullaniyor.
- Sahin bir kere tasla yer degistirmesi ve hisar degisimi var.
- Piyonlar farkli taslara terfi ediyor.
- Pawn-of-pawns uc asamali donguyle adventitious king olabiliyor.
- Zürafa hareketi plain Betza tanimi icin riskli bir ozel hareket.

Bu yuzden ilk hedef motoru oyuna baglamak degil, kurallarin ne kadar eslestigini olcmek.

## Faz 1: POC Alani

Eklenen dosyalar:

- `fairy-poc/timur-piece-map.json`
- `fairy-poc/timur-draft.variants.ini`
- `scripts/check-fairy-stockfish-poc.mjs`

Calistirma:

```bash
npm run fairy:poc:check
```

Bu komut sadece POC durumunu kontrol eder. Oyun motoruna entegrasyon yapmaz.

## Faz 2: WASM Ciktisini Hazirlama

Iki yol var:

1. Emscripten ile yerelde build almak.
2. Hazir npm paketinden `stockfish.js`, `stockfish.wasm`, `stockfish.worker.js` dosyalarini izole POC alanina almak.

Secilen yol: 2. yol kullanildi. `fairy-stockfish-nnue.wasm@1.1.11` paketi `fairy-poc/vendor/fairy-stockfish-nnue.wasm` altina izole edildi.

Bu fazda hedef sadece `chess` varyantinda `bestmove` alabilmek:

```text
uci
isready
setoption name UCI_Variant value chess
position startpos
go depth 1
bestmove ...
```

Durum:

- `npm run fairy:poc:smoke`
- Sonuc: `bestmove e2e3`

## Faz 3: Timur Varyant Yukleme

`timur-draft.variants.ini` Fairy motoruna yuklenir.

Kontrol edilecekler:

- Motor varyanti kabul ediyor mu?
- 10x11 tahta FEN kabul ediliyor mu?
- Temel taslar icin legal hamle uretebiliyor mu?
- Piyonlar cift adimsiz calisiyor mu?
- Stalemate sonucu bizim oyuna uygun mu?

Ilk durum:

- `npm run fairy:poc:timur`
- Sonuc: `bestmove d3d4`
- `npm run fairy:poc:perft`
- Chess referans perft 1: `Nodes searched: 20`
- Timur POC perft 1: 31 hamle (`npm run fairy:poc:compare` ile ayni baslangic pozisyonunda dogrulandi)

Bu, Fairy-Stockfish/WASM'in Timur taslak varyantini kabul edip baslangic pozisyonundan legal hamle uretebildigini gosterir. Bu henuz kural uyumu garantisi degildir; sadece POC kapisinin acildigini gosterir.

## Faz 4: JS Motor ile Karsilastirma

Ayni pozisyonlar hem mevcut JS motorunda hem Fairy POC'ta calistirilir.

Calistirma:

```bash
npm run fairy:poc:compare
npm run fairy:poc:dump
```

Ilk test seti:

- Sah tek kare hareket
- Vezir ortogonal tek kare
- General diagonal tek kare
- At
- Fil/elephant
- Dabbaba
- Deve/camel
- Kale
- Piyon ileri ve capraz alma

Basari olcutu:

- Temel taslarda %90+ legal hamle uyumu.
- Uyusmayan hareketler raporlanir.

Guncel ilk pozisyon sonucu:

- JS motor legal hamle: 31
- Fairy POC legal hamle: 31
- Ortak hamle: 29
- Beklenmeyen fark: yok
- Kalan beklenen farklar:
  - JS-only: `d2h1`, `h2d1` zürafa hamleleri. Zürafa "once bir kare capraz, sonra ayni yonde uzun duz" gittigi icin plain `variants.ini` Betza tanimiyla birebir ifade edilemiyor.
  - Fairy-only: `c2d1`, `i2h1` haberci/picket hamleleri. Fairy'deki gecici fil tanimi ilk capraz kareyi de veriyor; bizim oyunda Haberci en az 2 kare gitmek zorunda.

Bu tablo temel taslarin POC seviyesinde dogru eslestigini, ancak zürafa ve Haberci icin wrapper veya C++ fork gerekecegini gosterir.

## Faz 5: Ozel Kurallar

Plain config yetmezse iki cozum var:

- Wrapper: Hamleden once/sonra bizim JS kodu ozel kurallari uygular.
- C++ fork: Fairy-Stockfish icine Timur kurallari dogrudan eklenir.

Wrapper ile baslanacak kurallar:

- Hisar beraberligi
- Sah degisimi
- Hisar degisimi
- Pawn-of-pawns dongusu

C++ gerektirebilecekler:

- Zürafa hareketinin birebir legal move uretimi
- Coklu kraliyet/royal hierarchy
- Hisar karelerinin native board icinde temsil edilmesi

## Faz 6: Tas Pozisyon Testleri

Faz 3 uyumluluk plani kapsaminda `npm run fairy:poc:pieces` eklendi.

Sonuc:

- Toplam pozisyon: 17
- Beklenmeyen fark: 0
- Fairy ile birebir eslesenler:
  - Piyon
  - Sah
  - Vezir
  - Deniz canavari
  - General
  - At
  - Fil/Elephant
  - Deve/Camel
  - Dabbaba
  - Aslan
  - Boga
  - Acici/Revealer
  - Kale
  - Prens hareketi
  - Tavsiye/adventitious king hareketi
- Beklenen wrapper farklari:
  - Haberci/Picket minimum 2 kare kuralı
  - Zürafa ozel hareketi

Bu sonuc Fairy-Stockfish'in ana tas hareketleri icin guclu bir aday oldugunu, fakat Timur'a ozel iki hareket ailesinin JS wrapper veya C++ fork gerektirdigini gosterir.

## Faz 7: Bestmove Guvenlik Kapisi

`npm run fairy:poc:bestmove` komutu eklendi.

Akis:

- Fairy WASM `bestmove` uretir.
- Adapter hamleyi normalize eder.
- Hamle mevcut JS Timur legal hamle listesinde aranir.
- Legal ise `source: fairy` olarak kabul edilir.
- Illegal, bos veya bozuk hamleyse `source: fallback` kullanilir.

Test sonucu:

- `npm run fairy:poc:bestmove:test`: 4/4 test basarili.
- Mock illegal hamle `c2d1`: `picket_minimum_distance_rule` sebebiyle reddedildi.
- Gercek Fairy WASM: `bestmove d3d4` uretti ve kabul edildi.

Bu faz, Fairy'nin ileride arama motoru olarak kullanilmasi durumunda oyunun kural guvenligini JS Timur motorunun korumasini saglar.

## Karar Kriteri

Fairy motorunu oyuna alma karari su kosullarda verilmeli:

- WASM Android WebView'de stabil calisiyor.
- Timur temel tas hamleleri yuksek oranda eslesiyor.
- Ozel kurallar wrapper ile bozulmadan uygulanabiliyor.
- Performans mobilde kabul edilebilir.
- GPL-3.0 lisans yukumlulukleri kabul ediliyor.

## Faz 8: Production Readiness Kapisi

`npm run fairy:poc:readiness` komutu eklendi.

Bu komut sunlari kontrol eder:

- POC dosya yapisi ve WASM artifact'lari var mi?
- Adapter ve bestmove gate testleri geciyor mu?
- Baslangic legal hamle karsilastirmasinda beklenmeyen fark var mi?
- 17 izole tas pozisyonunda beklenmeyen fark var mi?
- Gercek Fairy WASM bestmove kapisi calisiyor mu?
- GPL-3.0 lisans karari manuel onay bekliyor mu?

Sonuc:

- POC teknik kapisi: GECTI
- Production entegrasyonu: HAZIR DEGIL
- Rapor: `FAIRY_STOCKFISH_PRODUCTION_READINESS.md`

Production icin bekleyenler:

- Android WebView smoke sonucunun gercek emulator/cihazda kaydi
- 5/15/30 dk performans olcumu
- GPL-3.0 yayin/lisans karari
- Hisar, sah degisimi ve pawn-of-pawns production wrapper testleri

## Faz 9: Android/WebView Smoke Sayfasi

`npm run fairy:poc:webview:prepare` komutu eklendi.

Bu komut Fairy WASM dosyalarini Vite/Capacitor tarafindan paketlenecek `public/fairy/` klasorune kopyalar:

- `stockfish.js`
- `stockfish.wasm`
- `stockfish.worker.js`
- `uci.js`
- `timur-draft.variants.ini`
- `manifest.json`

`public/fairy-smoke.html` eklendi. Sayfa izole olarak sunlari dener:

- Browser/WebView kabiliyetlerini listeler: WebAssembly, Worker, SharedArrayBuffer, Atomics.
- Fairy motoru baslatir.
- `timur_poc` varyantini yukler.
- `go depth 1` ile baslangic pozisyonundan `bestmove` ister.
- Sonucu `window.timurFairyWebViewSmoke` ve `body[data-smoke-result]` uzerinden okunabilir yapar.

`npm run fairy:poc:webview:check` komutu eklendi. Bu komut smoke sayfasi ve public asset paketinin build oncesi hazir oldugunu kontrol eder.

`npm run fairy:poc:webview:serve` komutu eklendi. Bu komut `dist/fairy-smoke.html` sayfasini COOP/COEP izolasyon basliklariyla acan kucuk bir yerel test sunucusu baslatir. Bu basliklar pthread/WASM motorun `SharedArrayBuffer` kullanabilmesi icin tarayici tarafinda genellikle zorunludur.

Onemli: Bu halen ana oyun AI entegrasyonu degildir. Android WebView icinde `SharedArrayBuffer` veya pthread/WASM kisitlari cikarsa bu test bunu gosterecek, mevcut JS motor etkilenmeyecek.

## Faz 10: Tek-Thread WASM Yolu

Faz 9 smoke denemesinde mevcut Fairy WASM paketinin pthread/worker yapisi nedeniyle `SharedArrayBuffer` istedigi goruldu. Android WebView icin bu riskli oldugundan tek-thread build yolu hazirlandi.

Eklenenler:

- Fairy kaynak Makefile dosyasina `threads=no` build secenegi eklendi.
- `emscripten_build_singlethread` hedefi eklendi.
- Tek-thread buildde `-DNO_THREADS` ve `-s USE_PTHREADS=0` kullanilacak.
- Worker artifact'i tek-thread build icin zorunlu degil.
- `scripts/check-fairy-singlethread-readiness.mjs` eklendi.
- `npm run fairy:poc:singlethread:check` komutu eklendi.
- `FAIRY_SINGLE_THREAD_READINESS.md` raporu uretiliyor.

Beklenen akıs:

```powershell
cd "../Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten"
npm run build -- threads=no
```

Build sonrasinda cikan `stockfish.js` ve `stockfish.wasm` dosyalari `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina alinacak. Sonra smoke test tek-thread artifact ile tekrar kosulacak.

Karar:

- Tek-thread build yolu hazir.
- Tek-thread artifact uretildi.
- Artifact `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina alindi.
- `npm run fairy:poc:singlethread:check` sonucu `Tek-thread artifact: OK`.
- Artifact + Android WebView smoke gecmeden Fairy ana AI motoruna baglanmayacak.

## Kisa Sonuc

Bu POC, mevcut motoru riske atmadan Fairy-Stockfish/WASM-NNUE tarafina gecisin gercekci olup olmadigini olcecek ilk kontrollu katmandir.
