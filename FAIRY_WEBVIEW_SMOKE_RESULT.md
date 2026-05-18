# Fairy WebView Smoke Sonucu

Tarih: 2026-05-18

## Ne test edildi?

Faz 6 kapsaminda Fairy-Stockfish/WASM-NNUE motoru oyunun ana AI motoruna baglanmadan izole bir smoke test sayfasi hazirlandi:

- `public/fairy-smoke.html`
- `public/fairy/stockfish.js`
- `public/fairy/stockfish.wasm`
- `public/fairy/stockfish.worker.js`
- `public/fairy/timur-draft.variants.ini`

Sayfa su akisi dener:

1. `stockfish.js` yuklenir.
2. WASM ve worker dosyalari ayni origin uzerinden cagirilir.
3. `timur_poc` varyanti yuklenir.
4. `go depth 1` calistirilir.
5. `bestmove` donerse smoke test gecer.

## Otomatik kontroller

Gecti:

- `npm run fairy:poc:webview:prepare`
- `npm run fairy:poc:webview:check`
- `npm run fairy:poc:readiness`
- `npm run build`
- `npx cap sync android`
- Android debug kurulum

Android uygulama normal acildi; logcat tarafinda crash gorulmedi.

## Smoke sayfasi sonucu

Yerel smoke sayfasi arka planda tarayici ile acildi.

Sonuc:

- WebAssembly: OK
- Worker: OK
- Atomics: OK
- SharedArrayBuffer: YOK
- crossOriginIsolated: YOK

Hata:

```text
SharedArrayBuffer is not defined
```

## Yorum

Fairy-Stockfish'in mevcut hazir WASM paketi pthread kullaniyor. Bu nedenle tarayici/WebView ortaminda `SharedArrayBuffer` gerekir.

Bu bir oyun motoru hatasi degil; WebView guvenlik/izolasyon gereksinimi. Production entegrasyondan once su iki yoldan biri secilmeli:

1. Android WebView icin COOP/COEP benzeri izolasyonun gercekten saglanabildigi kanitlanmali.
2. Pthread kullanmayan, tek thread Fairy-Stockfish WASM build'i hazirlanmali.

## Karar

Fairy POC teknik olarak Node tarafinda calisiyor, legal hamle kapisi calisiyor ve public asset paketi hazir. Ancak WebView smoke sonucu nedeniyle Fairy motoru su anda ana AI olarak oyuna baglanmamalidir.

Mevcut JS Timur motoru kural hakemi ve ana AI olarak kalmali. Fairy icin siradaki en guvenli adim tek thread WASM build veya Android WebView izolasyon cozumu arastirmasidir.
