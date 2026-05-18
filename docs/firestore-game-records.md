# Firestore Oyun Kaydi Kurulumu

Bu belge, Timurlenk Turk Satranci uygulamasinda tamamlanan oyunlarin Firestore'a anonim olarak kaydedilmesi icin gereken Firebase Console adimlarini aciklar.

## 1. Firebase Console'da yapilacaklar

### 1.1 Web app ekle

Mevcut Firebase projesinde:

1. `Project settings` ekranina gir.
2. `Your apps` bolumunde `</>` simgeli `Web app` ekle.
3. Bir ad ver:
   - `TimurChessWeb`
4. Kayit tamamlaninca verilen web config degerlerini kopyala.

Bu degerler:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

### 1.2 Firestore Database ac

1. `Build > Firestore Database`
2. `Create database`
3. Baslangic modu olarak gecici sure icin `Production mode`
4. Sana yakin bir bolge sec

Oneri:
- Avrupa kullanacaksan `europe-west`

## 2. Projede yapilacaklar

Proje kokunde `.env` dosyasi olustur ve `.env.example` dosyasindaki alanlari doldur:

```env
VITE_FIREBASE_GAMES_ENABLED=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_GAMES_ENDPOINT=
VITE_APP_VERSION=1.2.10
VITE_APP_BUILD_NUMBER=22
```

Not:
- `VITE_FIREBASE_GAMES_ENABLED=true` olmazsa oyun kaydi yukleme kapali kalir.
- `VITE_FIREBASE_GAMES_ENDPOINT` bos ise istemci mevcut direct Firestore fallback'ini kullanir.
- `VITE_FIREBASE_GAMES_ENDPOINT` doluysa istemci direct Firestore yerine Cloud Function ingest endpoint'ine yazar.
- Degisiklikten sonra `npm run build` ve `npx cap sync android` calistir.

## 3. Firestore koleksiyon yapisi

Uygulama su yapiyi kullanir:

- `games/{gameId}`
- `games/{gameId}/moves/{moveIndex}`

### 3.1 `games/{gameId}` belge alani

- `schemaVersion`
- `gameId`
- `createdAt`
- `finishedAt`
- `uploadedAt`
- `app`
- `player`
- `game`
- `flags`
- `analysisSummary`

### 3.2 `games/{gameId}/moves/{moveIndex}` belge alani

- `index`
- `moveNumber`
- `color`
- `pieceTypeBefore`
- `pieceTypeAfter`
- `pawnType`
- `fromRow`
- `fromCol`
- `toRow`
- `toCol`
- `fromLabel`
- `toLabel`
- `notation`
- `capturedPieceType`
- `specialMoveType`
- `specialTags`
- `isCheck`
- `resultType`
- `beforeHash`
- `afterHash`

## 4. Nihai Firestore Rules

Spark planda calisan nihai yapi:

- `Anonymous Auth` acik
- istemci anonim oturum aciyor
- `games` ve `moves` yazmalari sadece oturum sahibi `authUid` ile eslesirse kabul ediliyor
- `read` kapali
- `delete` kapali

Kurallar artik proje kokundeki [firestore.rules](C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk%20T%C3%BCrk%20Satranc%C4%B1/TimurChessWeb/firestore.rules) dosyasinda tutuluyor.

Bu yapida:

- `games/{gameId}` olusturma ve guncelleme:
  - `request.auth != null` olmali
  - `player.authUid == request.auth.uid` olmali
  - belge beklenen alanlarin disina cikmamali
- `games/{gameId}/moves/{moveId}` yazma:
  - parent game belgesi mevcut olmali
  - parent game'in `player.authUid` degeri `request.auth.uid` ile eslesmeli
  - move dokumani beklenen alanlarin disina cikmamali

Console'a yapistirmak yerine bu dosyayi deploy etmek daha temizdir.

## 5. Bu proje su an nasil calisiyor?

Su an oyunda iki farkli upload yolu var:

- `VITE_FIREBASE_GAMES_ENDPOINT` doluysa:
  - istemci `CloudGameRepository` ile Function endpoint'ine `POST` atar
- endpoint bossa:
  - istemci `FirestoreGameRepository` ile direct Firestore fallback'ine yazar

Dosyalar:

- `src/storage/FirebaseGamesConfig.js`
- `src/storage/FirestoreGameRepository.js`
- `src/storage/CloudGameRepository.js`
- `src/storage/GameUploadQueue.js`
- `src/storage/GameUploadService.js`
- `src/storage/GameRecordBuilder.js`
- `functions/src/index.js`
- `functions/src/gameRecordValidator.js`

Function endpoint kullaniliyorsa daha sonra direct Firestore fallback kapatilabilir.
Ama Spark planda bugun icin calisan, yeterince guvenli cozum:

- `Anonymous Auth`
- `authUid` esitligi
- kapali `read`
- kapali `delete`
- alan dogrulamasi yapan `firestore.rules`

## 6. Firebase Console'da gerekli nihai ayarlar

### 6.1 Authentication

`Authentication > Sign-in method`

- `Anonymous` = `Enabled`

### 6.2 Firestore Rules

Console'da `Firestore > Rules` ekranina su dosyanin icerigini koy:

- [firestore.rules](C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk%20T%C3%BCrk%20Satranc%C4%B1/TimurChessWeb/firestore.rules)

### 6.3 Web API key

Kullanilan web anahtari:

- `Browser key` yerine test icin olusturulan yeni web key

Bu key icin:

- `Application restrictions` = `None`
- `API restrictions` = `Identity Toolkit API` + `Token Service API`

Bu ayar, anonim auth'un Capacitor `localhost` ortaminda calismasi icin gerekli oldu.

## 7. Firestore rules deploy adimi

CLI ile deploy etmek istersen:

```powershell
firebase deploy --only firestore:rules
```

Bu komut Spark planda da calisir.

`firebase.json` dosyasi artik bu rules dosyasina baglidir:

- [firebase.json](C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk%20T%C3%BCrk%20Satranc%C4%B1/TimurChessWeb/firebase.json)

## 8. Cloud Function deploy adimlari

1. Proje kokunde Firebase CLI ile `functions` kurulumunu kullan:
   - `functions/package.json`
   - `functions/src/index.js`
2. `functions` klasorunde bagimliliklari kur:
   - `npm install`
3. Firebase CLI ile giris yap:
   - `firebase login`
4. Dogru projeyi sec:
   - `firebase use timur-satranc`
5. Function'i deploy et:
   - `firebase deploy --only functions`
6. Deploy sonrasi endpoint URL'sini al:
   - `https://europe-west1-<project-id>.cloudfunctions.net/ingestGameRecord`
7. Bu URL'yi `.env` icindeki `VITE_FIREBASE_GAMES_ENDPOINT` alanina yaz.
8. Sonra:
   - `npm run build`
   - `npx cap copy android`
9. Function ile test ettikten sonra Firestore Rules'u kapali guvenli kurala cevir.

## 9. Onerilen sonraki adim

Uzun vadeli dogru cozum:

1. `Firebase App Check` ac
2. `Cloud Functions` kur
3. Oyun kayitlarini Firestore'a dogrudan degil, function uzerinden yaz
4. Function tarafinda:
   - payload schema dogrulama
   - rate limit
   - duplicate `gameId` kontrolu
   - yasak alan filtreleme

## 10. Su an uygulama neleri kaydediyor?

Tamamlanan oyunlar icin:

- oyun modu
- zorluk
- formasyon
- kazanan
- sonuc tipi
- toplam hamle
- sure
- ozel olay etiketleri
- hamle listesi
- pozisyon hash'leri
- analiz ozeti varsa accuracy ve swing bilgileri

Anonim kalan alan:

- `installToken`

Kaydedilmeyen alanlar:

- e-posta
- IP
- oda kodu
- ham stack trace
- peer id
