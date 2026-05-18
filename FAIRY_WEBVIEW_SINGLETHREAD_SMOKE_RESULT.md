# Fairy WebView Tek-Thread Smoke Sonucu

Olusturma zamani: 2026-05-18T19:10:00+03:00

## Karar

- Faz 10 durumu: KISMEN TAMAMLANDI
- Ana sonuc: Tek-thread Fairy-Stockfish artifact yerel Chromium smoke testinde basariyla calisti.
- Android sonucu: Guncel debug APK emulatore kuruldu ve ana oyun WebView'i crash olmadan acildi.
- Eksik kapı: Android icinde smoke sayfasini dogrudan acip `GECTI` sonucunu UI otomasyonuyla okuma henuz tamamlanmadi.

## Yapilan Teknik Duzeltme

Tek-thread WASM ilk denemede basliyordu ama `uciok` uretmiyordu. Loglarda motorun `std::thread` acmaya calisirken abort oldugu goruldu.

`NO_THREADS` derlemesi icin Fairy-Stockfish kaynaklarinda `Thread` davranisi duzeltildi:

- `Thread` constructor artik `NO_THREADS` modunda `std::thread` baslatmiyor.
- `Thread` destructor artik `NO_THREADS` modunda join yapmiyor.
- `wait_for_search_finished()` tek-thread modda no-op oldu.
- `ThreadPool::set()` tek-thread modda thread sayisini 1 ile sinirliyor.
- `ThreadPool::start_thinking()` tek-thread modda aramayi senkron `main()->search()` ile calistiriyor.

Degisen kaynak:

```text
../Satranc Motoru/fairy-stockfish.wasm-nnue/src/thread.cpp
```

## Dogrulama

Calisan komutlar:

```powershell
npm run fairy:poc:singlethread:build
npm run fairy:poc:webview:prepare
npm run fairy:poc:singlethread:check
npm run fairy:poc:webview:check
npm run build
npx cap sync android
gradlew :app:installDebug
```

Yerel smoke URL:

```text
http://127.0.0.1:4176/fairy-smoke.html?engine=singlethread&v=threadfix1
```

Yerel smoke sonucu:

```text
GECTI (singlethread): bestmove d3d4
uciok
readyok
UCI_Variant value timur_poc
bestmove d3d4
```

Android log kontrolu:

- `com.timurlenk.turkchess` emulatorde acildi.
- WebView surumu: `146.0.7680.177`.
- `SharedArrayBuffer is not defined` hatasi gorulmedi.
- `FATAL EXCEPTION`, Stockfish/WASM RuntimeError veya crash logu gorulmedi.

## Sinirlar

- Bu henuz Fairy motorunun ana AI'a baglandigi anlamina gelmez.
- Tek-thread motor WebView uyumlulugu icin daha guvenli ama pthread build kadar hizli olmayabilir.
- Android icinde dogrudan smoke sayfasini otomatik acmak icin sonraki adimda debug-only route veya gizli test girisi eklenebilir.
- GPL-3.0 lisans karari verilmeden Fairy production motor olarak yayinlanmamalidir.

## Sonraki Net Adim

Faz 11: performans ve sure butcesi olcumu.

Olculmesi gerekenler:

- `go depth 1`, `depth 2`, `depth 3`, `depth 4` sureleri.
- 5 dk, 15 dk, 30 dk modlari icin guvenli maksimum derinlik.
- Android WebView bellek davranisi.
- Uzun sureli aramada app donma/crash riski.
