# Fairy Faz 12 Debug/Deney Modu Entegrasyonu

## Karar

Faz 12 tamamlandi. Fairy-Stockfish tek-thread POC ana AI olarak devreye alinmadi; sadece pasif shadow/debug motoru olarak baglandi.

## Ne Eklendi?

- `src/fairy/FairyFen.js`
  - Mevcut JS Timur `GameState` pozisyonunu Fairy `timur_poc` FEN formatina cevirir.
  - Off-board/citadel gibi POC'un temsil edemedigi durumlarda guvenli hata uretir.

- `src/fairy/FairyDebugEngine.js`
  - Varsayilan kapali pasif Fairy shadow motoru.
  - `?fairyDebug=1` veya `localStorage.setItem('timur_fairy_debug', '1')` ile acilir.
  - `?fairyDepth=1..8` ile debug arama derinligi ayarlanabilir.
  - Fairy bestmove uretir, JS Timur legal hamle kapisindan gecirir, ama oyunda hamleyi uygulamaz.

- `src/ai/AIEngine.js`
  - JS AI hamlesi yine asil hamledir.
  - Fairy sadece ayni pozisyon icin aday hamle uretir.
  - Fairy sonucu en fazla kisa timeout ile beklenir ve metadata olarak hamle kaydina eklenir.

- `src/analysis/AnalysisSerialization.js`
  - Hamle kaydina `fairyDebug` alani eklendi.

- `src/storage/GameRecordBuilder.js`
  - Firestore/local game record icine kompakt Fairy shadow verisi eklendi.
  - Top-level `debug.fairyShadow` ozet sayaclari eklendi.

- `src/storage/MatchHistoryStore.js`
  - Mac gecmisi icinde Fairy debug ozeti ve hamle bazli debug verisi korunur.

- `index.html`
  - Debug WASM calistirma icin CSP'ye `wasm-unsafe-eval` ve `worker-src 'self' blob:` eklendi.

## Kayit Alanlari

Hamle bazinda:

- `fairyBestMove`
- `fairyAccepted`
- `fairyRejectedReason`
- `fallbackUsed`
- `fairyThinkMs`
- `jsAiMove`
- `fairySelectedMove`
- `fairyMatchesJsMove`
- `shadowOnly`
- `appliedToGame`

Oyun kaydi bazinda:

- `debug.fairyShadow.sampleCount`
- `debug.fairyShadow.acceptedCount`
- `debug.fairyShadow.rejectedCount`
- `debug.fairyShadow.matchCount`
- `debug.fairyShadow.timeoutCount`
- `debug.fairyShadow.errorCount`

## Nasil Acilir?

Tarayici URL:

```text
?fairyDebug=1&fairyDepth=4
```

Console:

```js
localStorage.setItem('timur_fairy_debug', '1')
localStorage.setItem('timur_fairy_debug', '0')
window.timurFairyDebug.status()
window.timurFairyDebug.enable()
window.timurFairyDebug.disable()
```

## Guvenlik

- Fairy hamlesi oyuna uygulanmaz.
- JS motor kural hakemi ve asil hamle kaynagi olarak kalir.
- Fairy hamlesi illegal ise sebebiyle reddedilir.
- Timeout veya hata olursa oyun akisi bozulmaz.

## Dogrulama

```powershell
npm run fairy:poc:debug:test
npm run fairy:poc:readiness
npm run build
```

Ek smoke:

- `http://127.0.0.1:4180/?fairyDebug=1&fairyDepth=1` ile oyun acildi.
- Hizli Baslat yapildi.
- Oyuncu hamlesinden sonra JS AI hamle yapti.
- Console'da Fairy tek-thread motoru yuklendi.
- Yeni hata yok; sadece mevcut `favicon.ico` 404 goruldu.

## Kalanlar

- Android WebView icinde debug mod ile uzun mac smoke testi.
- Firestore'a yuklenen gercek bir debug kaydinin panelden kontrolu.
- Faz 13: Timur ozel kurallari icin daha derin Fairy/JS kural uyumu testleri.
