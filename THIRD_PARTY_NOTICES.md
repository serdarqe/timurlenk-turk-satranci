# Third Party Notices

Bu dosya Timurlenk Turk Satranci icinde kullanilan onemli ucuncu taraf bilesenleri ve lisans notlarini ozetler.

## Fairy-Stockfish / WASM-NNUE

- Paket: `fairy-stockfish-nnue.wasm`
- Lisans: GPL-3.0
- Kaynak: https://github.com/fairy-stockfish/fairy-stockfish.wasm
- Ilgili upstream proje: https://github.com/fairy-stockfish/Fairy-Stockfish
- Projede kullanim: deneysel Fairy-Stockfish POC, debug/shadow motor, hibrit motor aday katmani ve WebView smoke test assetleri.

Bu bilesenin lisansi GPL-3.0 oldugu icin proje, Fairy motoru ile birlikte yayinlandiginda GPL uyumlu acik kaynak yayin yolunu izler. Tam GPL lisans metni proje kokundeki `LICENSE` dosyasinda ve Fairy asset klasorlerindeki `Copying.txt` dosyalarinda bulunur.

Ilgili dosyalar:

- `fairy-poc/vendor/fairy-stockfish-nnue.wasm/`
- `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/`
- `public/fairy/`
- `public/fairy-singlethread/`

## Firebase ve Capacitor paketleri

Proje Android paketleme, Firebase Analytics/Auth/Firestore ve AdMob entegrasyonlari icin npm paketleri kullanir. Paket listesi ve surumleri `package.json` ve `package-lock.json` icinde tutulur.

## Gizli dosyalar dahil degildir

Acil kaynak yayininda su dosyalar GitHub'a konulmamalidir:

- `.env`
- `secrets/`
- Firebase service account JSON dosyalari
- Keystore/imzalama anahtarlari
- Uretilmis APK/AAB dosyalari
- `dist/`, `android/app/build/`, `node_modules/`

