# Cloud Function Oyun Kaydi Ingest

Bu belge, oyun kayitlarini direct Firestore yerine `ingestGameRecord` Function endpoint'i uzerinden guvenli sekilde toplamak icin gereken adimlari ozetler.

## Endpoint

- Function adi: `ingestGameRecord`
- Bolge: `europe-west1`
- Yontem: `POST`

## Istek

Header ornekleri:

- `Content-Type: application/json`
- `X-App-Version: 1.2.10`
- `X-Build-Number: 22`
- `X-Platform: android`
- `X-Install-Token: anon_...`

Body:

- `schemaVersion`
- `gameId`
- `createdAt`
- `finishedAt`
- `app`
- `player`
- `game`
- `flags`
- `analysisSummary`
- `moves`

## Cevaplar

Basarili yeni kayit:

```json
{
  "ok": true,
  "status": "stored",
  "gameId": "g_abc123",
  "storedMoveCount": 87
}
```

Ayni oyun daha sonra analiz ozetiyle guncellendiyse:

```json
{
  "ok": true,
  "status": "updated",
  "gameId": "g_abc123",
  "storedMoveCount": 87
}
```

Ayni oyun tekrar geldiyse:

```json
{
  "ok": true,
  "status": "duplicate",
  "gameId": "g_abc123",
  "storedMoveCount": 87
}
```

Gecersiz payload:

```json
{
  "ok": false,
  "status": "rejected",
  "errorCode": "invalid_payload"
}
```

## Firestore Rules

Function kullaniyorsan Firestore direct write'i kapat:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if false;
      allow write: if false;
    }

    match /games/{gameId}/moves/{moveId} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

## Deploy sonrasi istemci ayari

`.env` icine endpoint ekle:

```env
VITE_FIREBASE_GAMES_ENDPOINT=https://europe-west1-your-project-id.cloudfunctions.net/ingestGameRecord
```
