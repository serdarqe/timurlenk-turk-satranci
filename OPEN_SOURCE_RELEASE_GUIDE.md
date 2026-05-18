# Open Source Release Guide

Bu rehber Timurlenk Turk Satranci motorunu GitHub'da GPL uyumlu sekilde yayinlamak icin kisa kontrol listesidir.

## 1. Temiz kaynak kontrolu

```powershell
npm run release:gpl:check
```

Bu komut lisans dosyalarini, Fairy GPL bildirimlerini, `.gitignore` kurallarini ve git'e yanlislikla eklenmis gizli dosyalari kontrol eder.

Genel release kapisi:

```powershell
npm run release:check
```

Bu komut GPL kontrolunu ve production web build'ini birlikte calistirir.

## 2. GitHub'a koyma

Onerilen repo adi:

```text
timurlenk-turk-satranci
```

Ilk yayin icin:

```powershell
git init
git add .
git status
git commit -m "Initial GPL source release"
git branch -M main
git remote add origin https://github.com/<kullanici>/timurlenk-turk-satranci.git
git push -u origin main
```

`git status` adiminda `.env`, `secrets/`, APK/AAB ve build ciktisi gorunuyorsa commit yapma.

## 3. Play Store surumu ile eslestirme

Her Play Store/AAB surumu icin kaynak kodu tag'le:

```powershell
git tag v1.2.14-v26
git push origin v1.2.14-v26
```

Surum notunda kaynak kod adresini belirt:

```text
Kaynak kod ve lisans bilgileri: https://github.com/<kullanici>/timurlenk-turk-satranci
```

## 4. Fairy-Stockfish notu

Fairy-Stockfish motoru GPL-3.0 lisanslidir. Proje bu yolda yayinlandiginda kaynak kod acik tutulur. Fairy motorunun lisans metni `LICENSE`, `THIRD_PARTY_NOTICES.md`, `public/fairy/Copying.txt` ve `public/fairy-singlethread/Copying.txt` icinde korunur.

## 5. Uygulama ici bildirim

Ana menude `Acik Kaynak ve Lisanslar` ekrani bulunur. Bu ekran:

- Fairy-Stockfish GPL-3.0 attribution bilgisini gosterir.
- Fairy-Stockfish upstream kaynak koduna link verir.
- Timurlenk Turk Satranci kaynak kodunun GPL uyumlu yayinlanacagini kullaniciya bildirir.

Release oncesi bu ekranin gorunur oldugunu ve `npm run release:gpl:check` komutunun gectigini dogrula.

## 6. Pratik kural

GitHub'a sadece kaynak ve gerekli assetleri koy. Uretilmis paketleri, Firebase admin dosyalarini ve imzalama anahtarlarini asla koyma.
