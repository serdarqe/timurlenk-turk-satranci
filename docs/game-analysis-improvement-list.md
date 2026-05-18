# Oyun Analizi Sonrasi Gelistirme Listesi

Kaynak raporlar:

- `exports/game-analysis-report.md`
- `exports/game-analysis-report.json`

Incelenen 4 oyunun ortak sonucu:

- Hamle kayitlari temiz, replay tutarli
- Yasal disi hamle bulunmadi
- En zayif profil `easy`
- En buyuk gelistirme alani `tekrar azaltma` ve `kazanilmis son oyunu kapatma`

## P1 - Easy AI tekrar azaltma

Gozlem:

- `easy` seviyede iki oyunda da tekrar ve tempo kaybi goruldu
- AI bazen saldiri kuruyor ama pozisyonu ceviremeyince geri-ileri gidiyor

Hedef:

- Easy AI ciddi kalsin ama anlamsiz tekrar yapmasin

Yapilacaklar:

- `easy` profilinde geri alma tipi hamlelere ekstra ceza ekle
- Son 6-8 hamlede ayni kare ciftine donen hareketleri asagiyi it
- Easy seviyede "iyi ama tekrarsiz" aday varsa onu one al
- `repetition` agirligini easy icin biraz artir

Muhtemel dosyalar:

- `src/ai/AiStrategy.js`
- `src/ai/AIProfiles.js`
- `src/ai/AISelectionPolicy.js`
- `src/ai/ai.worker.js`

Basari olcutu:

- Easy AI kayitli oyunlarda reversal sayisi belirgin dusmeli
- Pat ve hisar durumlari disinda bos tekrarlar azalmalı

## P1 - Hard AI endgame conversion

Gozlem:

- Hard AI mat buluyor ama kazandigi son oyunu fazla uzatabiliyor
- Bir oyunda son oyun kapanisi 42 hamle surmus

Hedef:

- Hard AI avantajli son oyunda daha hizli kapatsin

Yapilacaklar:

- Kazanilmis son oyunda rakip mobilitesini azaltma puanini artir
- Son oyunda tekrar cezasini hard icin daha da yukselterek "bekleme oyunu"nu azalt
- Rakip royal taslara mesafe, kenara sikistirma ve mat agi puanlarini artir
- Hard modda 8 tas ve alti pozisyonlarda adaptif derinligi bir kademe daha zorla

Muhtemel dosyalar:

- `src/ai/AiStrategy.js`
- `src/ai/AiEvaluation.js`
- `src/ai/AIProfiles.js`
- `src/ai/ai.worker.js`

Basari olcutu:

- Hard AI kazandigi son oyunlari daha kisa hamle sayisiyla bitirmeli
- `hard-long-endgames.json` icindeki zayif ornekler azalmalı

## P2 - Easy AI savunma karari iyilestirme

Gozlem:

- Easy AI bazi oyunlarda baski kuruyor ama savunma tercihlerinde dagiliyor
- Hisar beraberligine veya oyuncu pat zaferine oyunu birakabiliyor

Hedef:

- Easy AI kolayca dagilmasin, ama yine hata yapabilsin

Yapilacaklar:

- Royal guvenlik agirligini biraz artir
- Tek hamlede tas kaybina giden secimleri daha sert cezalandir
- Savunma ve kacis kareleri varken "gosterisli ama zayif" hamleleri geri it

Muhtemel dosyalar:

- `src/ai/AiEvaluation.js`
- `src/ai/AIProfiles.js`
- `src/ai/AISelectionPolicy.js`

## P2 - Citadel ve pat kararlarini ayri izleme

Gozlem:

- Kayitlarda `stalemate_win` ve `citadel_draw` gercekten oyunun kaderini belirliyor
- Bunlar Timur satrancina ozgu oldugu icin ayrica optimize edilmeli

Hedef:

- AI ne zaman pat kovalamali, ne zaman hisar beraberligine inmeli daha net gorulsun

Yapilacaklar:

- Yeni rapor komutlari ekle:
  - `easy-stalemate-games`
  - `citadel-draw-games`
- AI degerlendirmesinde:
  - kaybeden taraf icin hisar beraberligini arama bonusu
  - kazanan taraf icin gereksiz hisar izinlerini azaltma

Muhtemel dosyalar:

- `functions/scripts/`
- `src/ai/AiEvaluation.js`
- `src/ai/ai.worker.js`

## P2 - Oyun tarzi raporunu daha eyleme donuk yap

Gozlem:

- Mevcut rapor iyi bir ilk resim veriyor ama "neden kaybetti" daha net cikabilir

Hedef:

- Rapor dogrudan AI tuning kararina donussun

Yapilacaklar:

- Su metrikleri ekle:
  - ayni tasla art arda tekrar sayisi
  - son oyun baslangic anindaki materyal farki
  - son oyun kapanis suresi
  - kazanilmis pozisyonda ilk tekrar hamlesi
- Her oyun icin `improvementHints` alanı uret

Muhtemel dosyalar:

- `functions/scripts/analyze-game-records.mjs`

## P3 - Tutorial icin gercek oyun ornekleri kullanma

Gozlem:

- Bu oyunlardan bazilari pat, hisar ve tekrar gibi ogretici anlar veriyor

Hedef:

- Oynayarak ogren bolumunu gercek oyuncu hatalariyla beslemek

Yapilacaklar:

- Pat zaferi orneginden mini ders cikart
- Hard AI'nin uzun kapattigi son oyundan "kazandigin oyunu nasil kapatirsin" dersi uret
- Easy AI'nin tekrar ettigi pozisyonlardan "tekrar neden kotu" egitimi tasarla

Muhtemel dosyalar:

- `src/tutorial/`
- `src/analysis/`

## Onerilen uygulama sirasi

1. Easy AI tekrar azaltma
2. Hard AI endgame conversion
3. Easy savunma karari iyilestirme
4. Citadel ve pat kararlari icin ayri raporlama
5. Analiz raporunu daha eyleme donuk hale getirme
6. Tutorial icin gercek oyun ornekleri

## Kisa backlog ozeti

- `P1` Easy AI tekrar azalt
- `P1` Hard AI son oyun kapatma hizini artir
- `P2` Easy AI savunma secimlerini toparla
- `P2` Pat ve hisar kararlarini ayrica olc
- `P2` Analiz raporuna tuning ipuclari ekle
- `P3` Gercek oyunlardan tutorial senaryolari uret
