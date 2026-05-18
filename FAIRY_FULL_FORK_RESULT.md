# Fairy Full Fork Result

Karar: Tam Fairy tabanli fork yolu uygulanmaya baslandi.

## Ne degisti?

- `fairyFork` modu eklendi ve varsayilan acik yapildi.
- AI hamlesinde Fairy-Stockfish/WASM tek-thread motoru birincil aday uretir.
- JS Timur motoru artik tamamen atilmadi; kural hakemi, guvenli fallback ve Timur'a ozel wrapper katmani olarak kalir.
- Fairy hamlesi JS legal hamle listesinde dogrulanir.
- Fairy hamlesi legal ise uygulanir.
- Fairy hamlesi illegal, unsupported veya Timur'a ozel wrapper isteyen bir hamleyse JS AI hamlesiyle devam edilir.

## Neden JS fallback kaldi?

Timur satrancinda hisar, sah degisimi, pawn-of-pawns, adventitious king ve bazi zurafa/haberci uyarlamalari Fairy variant dosyasiyla birebir native temsil edilemiyor. Bu yuzden tam guvenli fork icin JS katmani kural hakemi olarak kalmalidir.

## Kontroller

```powershell
npm run fairy:poc:fork:test
npm run fairy:poc:readiness
npm run build
```

## Kullanici/gelistirici acma kapama

- Fairy fork acik: `?fairyFork=1`
- Fairy fork kapali: `?fairyFork=0`
- Console acma: `window.timurFairyDebug.enableFork()`
- Console kapama: `window.timurFairyDebug.disableFork()`
- Durum: `window.timurFairyDebug.status()`

## Kalan buyuk is

Bu faz oyunda Fairy-first fork modunu kurar. C++ Fairy-Stockfish kaynak kodunda Timur varyantini native hale getiren ilk kaynak/WASM gecisi Faz 17 ile tamamlandi; detaylar `FAIRY_NATIVE_FORK_RESULT.md` icindedir. Android uzun WebView stres testi tamamlanmadan release production onayi verilmemelidir.
