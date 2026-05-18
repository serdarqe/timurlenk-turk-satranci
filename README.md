# Timurlenk Turk Satranci

Timurlenk Turk Satranci, Timur satrancinin kurallarini, ogrenme bolumlerini, mac gecmisini, bot rakiplerini ve gelistirilen AI motorunu iceren Android/Web tabanli bir oyun projesidir.

## Motor durumu

Ana oyun motoru Faz 16 sonrasi Fairy-first fork moduna gecmistir. Fairy-Stockfish/WASM-NNUE birincil AI adayi uretir; projeye ozel JavaScript Timur motoru ise kural hakemi, fallback ve Timur'a ozel wrapper katmani olarak korunur.

Gelistirici kontrolu:

- Fairy fork acik: `?fairyFork=1`
- Fairy fork kapali / JS-only fallback: `?fairyFork=0`
- Console: `window.timurFairyDebug.status()`

## Lisans

Bu kaynak kod `GPL-3.0-only` lisansi ile yayinlanir. Tam lisans metni `LICENSE` dosyasindadir.

Fairy-Stockfish bileseni GPL-3.0 lisanslidir. Ayrintilar icin:

- `THIRD_PARTY_NOTICES.md`
- `SOURCE_DISTRIBUTION.md`
- `OPEN_SOURCE_RELEASE_GUIDE.md`

## Gelistirme

```powershell
npm install
npm run build
```

Android senkronizasyonu:

```powershell
npx cap sync android
```

GPL yayin kontrolu:

```powershell
npm run release:gpl:check
```

## Gizli dosyalar

`.env`, `secrets/`, Firebase admin JSON dosyalari, keystore dosyalari ve uretilmis APK/AAB paketleri GitHub'a yuklenmemelidir.
