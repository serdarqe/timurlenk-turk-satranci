# Fairy-Stockfish Faz 13 Kural Uyumu Raporu

## Karar

Faz 13 tamamlandi. Fairy-Stockfish halen production AI degil; ancak debug/shadow entegrasyonu artik Timur'a ozel kritik kurallari bozmayacak sekilde test kapisina sahip.

## Yapilanlar

- `src/fairy/FairyTimurAdapter.js` guncellendi.
- Fairy UCI ile temsil edilemeyen tahta disi hisar hamleleri artik sessizce atilmiyor.
- Bu hamleler `unsupported: true` ve okunabilir pseudo id ile raporlaniyor.
- `reconcileFairyMovesWithTimurRules()` bu desteklenmeyen hamleleri `citadel_requires_wrapper` gibi acik sebeplerle listeliyor.
- `selectSafeTimurMoveFromFairyBestMove()` fallback secerken desteklenmeyen pseudo hamleyi oyun hamlesi olarak kullanmiyor.
- `tests/fairy-special-rules.test.js` eklendi.
- `npm run fairy:poc:special-rules:test` komutu eklendi.
- Production readiness kontrolu Faz 13 testini de calistiracak sekilde guncellendi.

## Test Kapsami

- Zürafa hareket farki: `giraffe_requires_wrapper`
- Haberci/Picket minimum mesafe kuralı: `picket_minimum_distance_rule`
- Fairy promotion suffix korumasi: `promotion_suffix_requires_wrapper`
- Sah degisimi: `royal_swap_requires_wrapper`
- Hisar degisimi: `citadel_exchange_requires_wrapper`
- Tahta disi hisar girisi: `citadel_requires_wrapper`
- Desteklenmeyen pseudo hamlelerin fallback olarak secilmemesi
- Hisar beraberligi JS sonuc kurali
- Pawn-of-pawns dongusu ve adventitious king terfisi
- Prince/adventitious king Fairy FEN temsili
- Royal capture JS oyun sonu mantigi

## Dogrulama

```text
npm run fairy:poc:special-rules:test

tests 11
pass 11
fail 0
```

## Teknik Not

Fairy motoru standart UCI koordinatlariyla sadece 10x11 tahta ici kareleri temsil edebilir. Timur Satranci'ndaki hisarlar ise `(0, -1)` ve `(9, 11)` gibi tahta disi ozel alanlardir. Bu nedenle hisar hamleleri Fairy tarafinda dogrudan oynatilamaz; JS motor bu kurallar icin hakem ve wrapper olarak kalmalidir.

## Kalan Risk

- Fairy native royal modeli Timur'un coklu kraliyet modelini birebir temsil etmiyor.
- Hisar, sah degisimi ve pawn-of-pawns gibi kurallar production hamlesi uygulanmadan once JS wrapper'dan gecmeye devam etmeli.
- Android WebView uzun stres testi ve GPL-3.0 yayin karari tamamlanmadan Fairy ana AI yapilmamali.

## Sonraki Guvenli Faz

Faz 14 hibrit AI karar katmani olabilir. Bu fazda Fairy hamlesi sadece aday olarak alinmali; nihai karar yine JS Timur motorunun legalite, risk ve tarihsel kural filtresinden gecmelidir.
