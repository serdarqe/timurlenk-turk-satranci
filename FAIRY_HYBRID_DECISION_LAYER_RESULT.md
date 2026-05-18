# Fairy-Stockfish Faz 14 Hibrit Karar Katmani Raporu

## Karar

Faz 14 tamamlandi. Fairy-Stockfish artik sadece pasif debug verisi ureten bir motor degil; istenirse hibrit aday motor olarak da denenebilir. Buna ragmen varsayilan oyun davranisi degismedi: oyun acildiginda ana AI hala JS Timur motorudur.

## Neden Varsayilan Kapali?

Fairy paketi GPL-3.0 lisanslidir ve Android/WebView uzun stres testi henuz production karari icin yeterli degildir. Bu yuzden hibrit katman sadece gelistirme/deney kapisi olarak eklendi.

## Acma Yollari

```text
?fairyHybrid=1
?fairyHybrid=force
window.timurFairyDebug.enableHybrid()
window.timurFairyDebug.enableHybrid({ force: true })
window.timurFairyDebug.disableHybrid()
```

## Karar Akisi

1. JS Timur AI normal hamlesini uretir.
2. Fairy tek-thread motoru ayni pozisyon icin aday hamle uretir.
3. Fairy hamlesi `selectSafeTimurMoveFromFairyBestMove()` kapisindan gecer.
4. Hamle JS Timur legal listesinde yoksa reddedilir.
5. Hisar, sah degisimi, pawn-of-pawns gibi wrapper gerektiren hamlelerde JS motor hakem kalir.
6. Hibrit mod kapaliysa Fairy sonucu sadece kaydedilir.
7. Hibrit mod aciksa ve profil uygunsa Fairy hamlesi JS hamlesinin yerine uygulanabilir.

## Profil Kurali

- Kolay: Varsayilan hibrit uygulama yok; sadece shadow kayit.
- Orta: Varsayilan hibrit uygulama yok; sadece `force` ile test.
- Zor: Hibrit aciksa uygulanabilir.
- Bot 10-15: Hibrit aciksa uygulanabilir.
- `force`: Tum profillerde test amacli uygular.

## Kayit Alanlari

Hamle kayitlarindaki `fairyDebug` alanina su bilgiler eklendi:

- `mode`: `shadow` veya `hybrid`
- `shadowOnly`
- `appliedToGame`
- `hybridEligible`
- `hybridApplied`
- `hybridRejectedReason`

Firestore/mac ozeti icin `debug.fairyShadow.hybridAppliedCount` da eklendi.

## Test Sonucu

```text
npm run fairy:poc:hybrid:test

tests 6
pass 6
fail 0
```

Testler sunlari garanti eder:

- Hibrit kapaliysa Fairy asla oyuna uygulanmaz.
- Hard profilde kabul edilen Fairy hamlesi uygulanabilir.
- Easy profilde kabul edilen Fairy hamlesi kaydedilir ama uygulanmaz.
- `forceHybrid` tum profillerde test amacli uygulayabilir.
- Illegal Fairy hamlesi hibrit acikken bile uygulanmaz.
- Fairy ve JS ayni hamleyi onerirse override yapilmaz, sadece eslesme kaydedilir.

## Ek Dogrulama

```text
node --test tests/fairy-debug-engine.test.js tests/fairy-hybrid-policy.test.js tests/fairy-special-rules.test.js
tests 20
pass 20

npm run fairy:poc:readiness
POC teknik kapisi: GECTI
Production entegrasyonu: HAZIR DEGIL

npm run build
basarili
```

Tarayici smoke:

- URL: `http://127.0.0.1:4180/?fairyDebug=1&fairyHybrid=1&fairyDepth=1`
- Hızlı Başlat calisti.
- Oyuncu hamlesinden sonra AI hamle akisi tamamlandi.
- `window.timurFairyDebug.status()` sonucu: debug acik, hybrid acik, depth 1.
- Konsolda yeni oyun kirici hata gorulmedi; sadece mevcut `favicon.ico` 404 kaydi var.

## Kalan Risk

- Bu katman Fairy motorunu production default yapmaz.
- Android WebView uzun oyun/stres testi hala gerekli.
- GPL-3.0 lisans karari verilmeden Play Store production AI olarak devreye alinmamali.
- Gercek guc artisi ancak Faz 15/16 kararlarindan sonra uzun AI-vs-AI ve oyuncu oyun kayitlariyla olculmeli.
