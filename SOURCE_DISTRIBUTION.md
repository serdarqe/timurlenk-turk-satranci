# Source Distribution

Bu proje GitHub'da kaynak kodu acik sekilde yayinlanacak sekilde hazirlanir.

## Dahil edilmesi gereken kaynaklar

- `src/` oyun, arayuz ve AI kaynak kodlari
- `tests/` motor ve kural testleri
- `scripts/` build, analiz ve readiness scriptleri
- `android/` Capacitor Android proje dosyalari
- `public/` statik assetler ve Fairy WebView test assetleri
- `fairy-poc/` Fairy-Stockfish POC, variant dosyalari ve adapter kaynaklari
- `package.json` ve `package-lock.json`
- `LICENSE`
- `THIRD_PARTY_NOTICES.md`

## Dahil edilmemesi gerekenler

- `.env`
- `secrets/`
- Firebase service account JSON dosyalari
- Android keystore ve sifre dosyalari
- Uretilmis `.apk`, `.aab`, `.apks` dosyalari
- `dist/`, `node_modules/`, `android/app/build/`, `exports/`, `output/`

Bu dosyalar `.gitignore` ile korunur. Yine de GitHub'a ilk gonderimden once `npm run release:gpl:check` calistirilmalidir.

## Kaynaktan build

Genel gelistirme build'i:

```powershell
npm install
npm run build
npx cap sync android
```

Android release bundle build'i icin yerel Android Studio/JDK ve imzalama ayarlari gerekir:

```powershell
cd android
.\gradlew.bat :app:bundleRelease
```

## GPL notu

Fairy-Stockfish GPL-3.0 lisanslidir. Bu yuzden Fairy motoru ile birlikte yayinlanan surumlerde kaynak kodun da ayni yayinla birlikte erisilebilir olmasi gerekir. Play Store'a yuklenen binary ile uyumlu kaynak kod icin GitHub commit/tag kullanilmalidir.

Uygulama icinde ana menuden erisilen `Acik Kaynak ve Lisanslar` ekrani, Fairy-Stockfish attribution bilgisini ve kaynak kod yayin notunu kullaniciya gosterir. Bu ekran release oncesi korunmalidir.
