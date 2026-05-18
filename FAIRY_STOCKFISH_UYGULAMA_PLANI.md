# Fairy-Stockfish Uygulama Plani

Tarih: 2026-05-19

Bu plan, ilk entegrasyon degerlendirmesi ile guncel native Fairy fork durumunu birlestirir. Amac, Timur Satranci motorunu guvenli sekilde Fairy-first seviyeden daha tam, daha hizli ve daha dogru bir Timur motoruna tasimaktir.

## Guncel Durum

Tamamlananlar:

- Fairy-Stockfish/WASM entegrasyonu kuruldu.
- Uc modlu mimari olusturuldu: shadow, hybrid, fork.
- Oyun tarafinda Fairy fork varsayilan olarak acildi.
- Fairy hamleleri JS legal hamle listesiyle dogrulaniyor.
- JS motoru kural hakemi ve guvenli fallback olarak korunuyor.
- Native Fairy kaynak koduna `timur` varyanti eklendi.
- Oyun artik runtime `timur_poc` dosyasina bagli kalmadan built-in `timur` varyantini kullanabiliyor.
- Android emulatorde build, kurulum, acilis ve kisa AI hamle smoke testi basarili.

Hala kalan ana riskler:

- Single-thread WASM boyut ve performans riski tasiyor.
- Zurafa hareketi native tarafta henuz tam degil.
- Hisar, sah degisimi, pawn-of-pawns ve ek sah gibi ozel Timur kurallari tamamen native degil.
- Timur'a ozel NNUE/eval yok.
- JS fallback henuz kaldirilamaz.
- Uzun Android/WebView stres testi tamamlanmadi.

## Faz 1 - Guvenli Rollout ve Mod Politikasi

Hedef:

Fairy motoru kullanilirken kullaniciya hatali hamle veya uzun bekleme yasatmamak.

Yapilacaklar:

- `fork`, `hybrid`, `shadow` modlarinin gercek oyundaki davranisi tekrar test edilecek.
- Release icin varsayilan mod karari netlestirilecek.
- Fairy hata verirse JS fallback nedenleri loglanacak.
- Fallback oranlari mac sonu verisine yazilacak.

Kabul kriteri:

- Fairy legal hamle urettiginde oyun direkt onu kullanir.
- Illegal/unsupported hamlede oyun takilmaz, JS fallback calisir.
- Kullanici "dusunuyor" ekraninda kalmaz.

Test:

```powershell
npm run fairy:poc:fork:test
npm run fairy:poc:readiness
npm run build
```

## Faz 2 - Bot ve Zorluk Kalibrasyonu

Hedef:

Mevcut kolay/orta/zor modlari ve 15 bot sistemi Fairy motor gucuyle uyumlu hale gelsin.

Yapilacaklar:

- Bot seviyeleri Fairy UCI parametrelerine baglanacak.
- `Skill Level`, `UCI_LimitStrength`, `UCI_Elo`, depth ve think time ayarlari botlara dagitilacak.
- Kolay mod hata yapabilir ama sacma tas kaybetmez hale getirilecek.
- Orta mod daha dengeli, zor mod daha kazanc odakli olacak.
- Karakterler risk, saldiri, savunma ve sure kullanimi agirliklariyla Fairy kararina etki edecek.

Kabul kriteri:

- Bot 15, Bot 7 ve Bot 1 arasinda net guc farki olusur.
- Zor mod gereksiz tas kaybini belirgin azaltir.
- Kolay mod yenilebilir kalir.

Test:

```powershell
npm run test -- tests/fairy-hybrid-policy.test.js
cd "..\Al vs Al ( Otomasyon)" && npm run rr:smoke
```

## Faz 3 - Zurafa Native Hareketi

Hedef:

Zurafa Fairy tarafinda placeholder olmaktan cikarilip gercek Timur hareketine yakin hale getirilsin.

Yapilacaklar:

- Mevcut JS zurafa hareket kurali kaynak alinacak.
- Fairy Betza ile yaklasik tanim denenebilir.
- Betza yetmezse C++ tarafinda custom movement wrapper planlanacak.
- Fairy hamlesi ile JS legal hamle listesi karsilastirilacak.

Kabul kriteri:

- Zurafa hareketlerinde Fairy surekli JS fallback'e dusmez.
- Zurafa legal olmayan kareye gitmez.
- Zurafa tas ustunden/ara kare uzerinden hatali gecmez.

Test:

```powershell
npm run fairy:native:source:check
npm run fairy:native:bestmove
npm run fairy:poc:adapter:test
```

## Faz 4 - Timur Ozel Kurallari Native/Wrapper Katmani

Hedef:

Fairy motor Timur Satranci'nin kritik ozel kurallarini daha iyi anlasin.

Yapilacaklar:

- Hisar kareleri ve hisar beraberligi kural katmanina alinacak.
- Sah-hisar veya royal swap benzeri ozel durumlar icin wrapper tasarlanacak.
- Pawn-of-pawns terfi zinciri netlestirilecek.
- Adventitious king / ek sah davranisi dokumante edilip uygulanacak.
- Pat sonucu Timur kuralina gore ele alinacak.

Kabul kriteri:

- Ozel kural gereken pozisyonlarda oyun sonucu yanlis hesaplanmaz.
- Fairy bilmedigi durumda JS hakem sonucu kesinlestirir.
- Oyun sonu paneli dogru kazanan/beraberlik bilgisini gosterir.

Test:

```powershell
npm run test -- tests/fairy-special-rules.test.js
npm run test -- tests/endgame-suite.test.mjs
```

## Faz 5 - Performans ve WASM Boyutu

Hedef:

Android/WebView icinde motor daha hizli acilsin, APK boyutu ve bellek riski azalsin.

Yapilacaklar:

- Single-thread WASM boyutu olculecek.
- Strip/optimize build denenip karsilastirilacak.
- Lazy-load: motor sadece AI maci baslayinca yuklenecek.
- Pthread/SharedArrayBuffer yolu Android WebView icin arastirilacak.
- Kullanici arayuzu WASM yuklenirken donmayacak sekilde loading state eklenecek.

Kabul kriteri:

- Oyun ana menusu WASM yuzunden gec acilmaz.
- AI macina giriste motor yukleme durumu temiz gosterilir.
- Android emulatorde WebView crash olmaz.

Test:

```powershell
npm run fairy:poc:webview:check
npm run build
npx cap sync android
```

## Faz 6 - Uzun Android/WebView Stres Testi

Hedef:

Native Fairy motor sadece kisa smoke degil, uzun oyun akisinda da stabil olsun.

Yapilacaklar:

- 15-20 dakikalik emulatore kurulu oyun testi yapilacak.
- Kolay, orta, zor ve bot maclari denenerek AI cevap sureleri izlenecek.
- Logcat crash, wasm, memory, TypeError, ReferenceError acisindan taranacak.
- Oyun durdur/devam et, hamle gecmisi, mac sonucu ve analiz paneli kontrol edilecek.

Kabul kriteri:

- AI "dusunuyor" ekraninda kalmaz.
- Uygulama arka planda crash vermez.
- En az bir mac akisi oyun sonuna veya uzun orta oyuna kadar gider.

Test:

```powershell
npm run build
npx cap sync android
cd android && .\gradlew.bat "-Dorg.gradle.java.home=C:\Program Files\Android\Android Studio\jbr" ":app:installDebug"
```

## Faz 7 - Oyun Sonu ve Mat Agi Gucu

Hedef:

Fairy motorun avantajli pozisyonlari beraberlige suruklemesi azaltilsin.

Yapilacaklar:

- Az tasli pozisyonlar icin daha derin arama politikasi uygulanacak.
- K+Kale, K+Vezir, terfi sonrasi Vezir gibi oyun sonlari ayrica test edilecek.
- Max move draw yerine pozisyon degerlendirmesi rapora yazilacak.
- 3-kat tekrar ve 50-hamle yardimcilari otomasyonda kontrol edilecek.

Kabul kriteri:

- Bariz kazanc pozisyonlari daha sik kazancla biter.
- Gereksiz sonsuz tekrarlar azalir.
- Mac gecmisi oyun sonu analizinde kazanan tarafi kotu oynadi gibi gosteren eski analiz hatasi donmez.

Test:

```powershell
npm run test -- tests/endgame-suite.test.mjs
cd "..\Al vs Al ( Otomasyon)" && npm run rr:smoke
```

## Faz 8 - Acilis Kitabi ve Fairy Uyumlu Acilis Secimi

Hedef:

AI kitap hamlesine koru korune bagli kalmasin, rakibin hamlesini okuyup guvenli acilis oynasin.

Yapilacaklar:

- Acilis kitabi Fairy legal hamle kontrolunden gecirilecek.
- Kitap hamlesi materyal kaybettiriyorsa motor kitaptan cikacak.
- Karakterlere farkli acilis tercihleri verilecek.
- Bot seviyelerine acilis cesitliligi dagitilacak.

Kabul kriteri:

- Ilk 10-20 hamlede anlamsiz tas kaybi azalir.
- Zor mod firsat varken kitaba bagli kalmaz.
- Kolay ve orta mod yine insani yenilebilirlik seviyesini korur.

Test:

```powershell
npm run test -- tests/opening-risk-suite.test.mjs
cd "..\Al vs Al ( Otomasyon)" && npm run run -- --fast --max-moves 120
```

## Faz 9 - Veri ve Analitik

Hedef:

Fairy motorun gercek oyun performansi olculebilir olsun.

Yapilacaklar:

- Her mac kaydina motor tipi yazilacak: `js`, `fairy`, `fairy_fallback`.
- Fairy bestmove, secilen hamle, fallback nedeni ve dusunme suresi kaydedilecek.
- Mac gecmisinde oyun sonu analizine Fairy uyumlu ozet eklenecek.
- Firestore permission/rules sorunu ayrica kontrol edilecek.

Kabul kriteri:

- Hangi hamleyi Fairy'nin, hangi hamleyi JS fallback'in oynadigi gorulebilir.
- Firestore oyun kaydi beklenen koleksiyona gider.
- Offline/permission sorunu olursa oyun akisi bozulmaz.

Test:

```powershell
npm run build
npm run export:games
```

## Faz 10 - Lisans ve Acik Kaynak Hazirligi

Hedef:

GPL tabanli Fairy-Stockfish kullaniminda lisans uyumu saglansin.

Yapilacaklar:

- Fairy fork kaynak kodu GitHub'da paylasilacak.
- Uygulama icinde lisans bildirimi eklenecek.
- Kaynak kod linki gizlilik/yardim/credits alaninda gorunur olacak.
- Kullanilan Fairy-Stockfish surumu ve degisiklikler dokumante edilecek.

Kabul kriteri:

- GPL kaynak erisimi kullaniciya sunulur.
- Play Store aciklamasi ve uygulama ici bilgi uyumlu olur.
- `release:gpl:check` gecmeden release alinmaz.

Test:

```powershell
npm run release:gpl:check
```

## Oncelik Sirasi

1. Faz 6 - uzun Android/WebView stres testi.
2. Faz 3 - Zurafa native hareketi.
3. Faz 2 - Bot/zorluk kalibrasyonu.
4. Faz 4 - Timur ozel kurallari.
5. Faz 5 - WASM boyut ve performans.
6. Faz 7 - oyun sonu guclendirme.
7. Faz 8 - acilis kitabi guvenligi.
8. Faz 9 - veri ve analitik.
9. Faz 10 - GPL/release uyumu.

## Kisa Sonuc

Mevcut motor artik sadece JS tabanli degil; Fairy-first ve native `timur` varyantina gecis basladi. Fakat gercek, tam guclu Timur Satranci motoru icin Zurafa, hisar, royal kurallar, oyun sonu, bot kalibrasyonu ve Android uzun stabilite testleri tamamlanmali.
