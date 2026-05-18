# Timurlenk Satranci AI Motoru - Guncel Denetim Raporu

Tarih: 2026-05-16

Kaynak rapor: `AI_MOTOR_DENETIM_RAPORU.md`

Bu rapor, eski denetim raporundaki celiskili veya guncelligini kaybetmis maddeleri duzeltmek ve Faz 1-12 sonrasi AI motorunun gercek durumunu daha net gostermek icin hazirlandi.

## 1. Yonetici Ozeti

Mevcut AI motoru artik basit bir "hamle secici" degil. Motor; legal hamle guvenligi, pozisyon hafizasi, tehdit haritasi, statik takas hesabi, alpha-beta/PVS arama, quiescence search, acilis kitabi, oyun sonu WDL analizi, bot kalibrasyonu ve otomatik kalite raporu katmanlarina sahip.

Ancak motoru "chess.com/Stockfish seviyesinde" saymak dogru olmaz. Timur satranci varyant oldugu icin hazir tablebase, hazir opening book veya klasik Stockfish altyapisi dogrudan kullanilamiyor. Bu projede kurulan motor, Timur satrancina ozel ve veriyle gelistirilebilir bir motor mimarisidir.

Guncel denetim puani:

| Alan | Puan | Degerlendirme |
|---|---:|---|
| Motor mimarisi | 88 / 100 | Katmanlar guclu, klasik motor prensipleri uyarlanmis. |
| Gercek oyun gucu kaniti | 74 / 100 | AI-vs-AI otomasyon var, fakat duzenli buyuk benchmark baseline'i henuz standartlasmali. |
| Test altyapisi | 78 / 100 | Perft, AI, acilis, endgame, bot ve otomasyon testleri var; taktik puzzle suite eksik. |
| Acilis guvenligi | 82 / 100 | Dalli/hash tabanli kitap ve guvenlik filtresi var; uzun vadeli veriyle agirlik guncelleme henuz tam otomatik degil. |
| Oyun sonu | 78 / 100 | WDL cache ve plan var; offline tablebase yok. |
| Bot sistemi | 84 / 100 | 1-15 bot, hedefler ve kalibrasyon raporu var; daha cok macla gercek ayrisma olculmeli. |
| Genel guncel puan | 84 / 100 | Mimari guclu, siradaki buyuk kazanc veri/benchmark ve taktik suite. |

## 2. Eski Rapordaki Duzeltilen Celiskiler

| Eski rapordaki ifade | Guncel durum | Duzeltme |
|---|---|---|
| "Test edilen motor versiyonu Faz 3+" | Motor Faz 12'ye kadar ilerledi. | Rapor Faz 1-12 sonrasi duruma guncellendi. |
| "AI-vs-AI test framework yok" | `Al vs Al ( Otomasyon)` klasorunde otomasyon, lig/matrix/fast kosular ve testler var. | Kritik eksik artik framework yoklugu degil; buyuk benchmark baseline'inin standartlasmasi. |
| "Test altyapisi 4/10" | 228 ana test, otomasyon testleri, perft, opening, endgame, bot calibration ve quality report testleri var. | Test puani yukari cekildi; eksik olarak taktik puzzle suite ve daha derin perft seti belirtildi. |
| "Quiescence sadece capture'lari ariyor" | Quiescence v2 capture, check/royal threat, citadel threat, promotion ve buyuk tas kurtarma hamlelerini de ayiriyor. | Bu madde eski kalmis; kalan risk aday/genislik limitlerinin gercek maclarda kalibrasyonu. |
| "Acilis kitabi lineer" | Opening Book v3 pozisyon hash, veri skoru, bot repertuvari ve guvenlik filtresi tasiyor. | Lineer kitap sorunu buyuk olcude giderildi; veriyle surekli tune sistemi gelistirilmeli. |
| "Perft test dosyasi yok" | `tests/perft.test.js` var. | Eksik olan sey dosya degil, daha genis/deep referans pozisyon seti. |
| "Killer/history belirsiz" | Move Ordering v3 icinde TT, killer/history, capture history, continuation history ve pozitif SEE onceligi var. | Bu alan artik uygulanmis kabul edilmeli. |
| "Bot seviyeleri bilinmiyor" | Bot kalibrasyon raporu ve seviye kapilari var. | Yine de tam guven icin cok macli round-robin periyodik kosulmali. |
| "Kalite raporu yok" | Faz 12 ile `quality-report.json` ve `quality-report.md` uretimi eklendi. | Eksik artik rapor yoklugu degil; raporlarin surumler arasi baseline olarak arsivlenmesi. |

## 3. Guncel Motor Mimarisi

### 3.1 Legal Hamle ve Perft

Motorun kural tabani `MoveValidator`, `GameRules`, `GameState` ve `Perft` katmanlariyla test ediliyor.

Eklenenler:

- Eril, disil ve tam dizilim icin baslangic perft sayilari.
- `royal_swap` ve `citadel_exchange` gibi Timur'a ozel hamlelerin apply/revert testleri.
- Hamle uygulama ve geri alma sonrasinda state imzasi tutarlilik kontrolu.

Eksik/kalan:

- Daha derin perft referanslari gerekir.
- Ozellikle az tasli ama ozel kural iceren 20-30 referans pozisyon daha eklenmeli.

### 3.2 Zobrist Hash ve Transposition Table

Motor pozisyonlari deterministik hash ile taniyor.

Eklenenler:

- `ZobristHash` ile tas, sira, dizilim, fidye/hisar haklari dahil pozisyon anahtari.
- Incremental hash update.
- `TranspositionTable` ile depth, score, bound, bestMove ve age bilgisi.
- Derin kaydin sig kayitla ezilmemesi.

Fayda:

- Ayni pozisyonlar tekrar hesaplanmiyor.
- AI-vs-AI ve arama motoru daha kararli calisiyor.

### 3.3 Attack Map v2

AI artik tahtadaki tum tehdit/savunma iliskilerini merkezi bir katmandan okuyor.

Eklenenler:

- Kare bazli saldiran/savunan listesi.
- Legal ve pseudo saldiri ayrimi.
- Savunmasiz tas raporu.
- Overloaded defender analizi.
- Royal guvenlik kareleri.

Fayda:

- AI kendi tasinin askida oldugunu daha iyi gorur.
- Rakip tasin savunmasiz kaldigi anlari daha iyi yakalar.
- Evaluation, SEE ve move ordering ayni tehdit bilgisinden beslenir.

### 3.4 Timur SEE v2

Static Exchange Evaluation, tas alisverislerini daha guvenli hesaplamak icin guclendirildi.

Eklenenler:

- Capture tree simülasyonu.
- En dusuk degerli saldiran/cevap mantigi.
- Kraliyet ve hisar yakinligi icin ozel risk cezasi.
- Root adaylarina SEE skoru, exchange debt, capture tree depth ve method bilgisi.
- Negatif SEE borcu tasiyan acilis kitabi hamlelerinin reddedilmesi.

Fayda:

- Hard mod zehirli tas alma hatasini daha az yapar.
- Orta mod bariz kotu takaslari daha cok gormeye baslar.
- Kitap hamlesi guvenli degilse AI kitaptan cikabilir.

Kalan risk:

- SEE hala heuristic bir hesap; tum Timur varyant takaslarini tablebase kesinliginde cozmez.

### 3.5 Search Engine v3

Arama motoru alpha-beta/PVS yapisina yaklastirildi.

Eklenenler:

- Fail-soft cutoff raporu.
- PVS null-window ve re-search akisi.
- Futility pruning.
- Reverse futility pruning.
- Taktik guard: sah, tas alma ve tehdit hamleleri budamadan korunuyor.
- Deadline ve iterative deepening altyapisi onceki fazlarla birlikte calisiyor.

Fayda:

- Ayni surede daha iyi hamle bulunur.
- Hard mod kritik pozisyonlarda daha derin hesaplar.
- Gereksiz dallar azalir.

Kalan risk:

- Mobil performans nedeniyle klasik motorlardaki 15-20 ply tam genis arama hedeflenmiyor; secici arama ile yaklasiliyor.

### 3.6 Move Ordering v3

AI hangi hamleyi once deneyecegini daha iyi siraliyor.

Eklenenler:

- TT best move onceligi.
- Killer/history mantigi.
- Capture history.
- Continuation history.
- Pozitif SEE veren capture onceligi.
- Merkez, gelisim ve royal guvenlik bonuslari.
- Kitap hamlesi root adayda oncelikli ama guvensizse filtreleniyor.

Fayda:

- Alpha-beta daha hizli keser.
- Ayni think-ms ile daha kaliteli arama olur.

### 3.7 Quiescence v2

Eski rapordaki "sadece capture" iddiasi artik dogru degil.

Eklenenler:

- Capture hamleleri.
- Check/royal threat hamleleri.
- Citadel threat hamleleri.
- Promotion hamleleri.
- Buyuk tas kurtarma hamleleri.
- Negatif SEE capture filtreleme.
- Zorluga gore node ve aday limitleri.
- Quiescence istatistikleri.

Fayda:

- AI "tas aldim ama sonra daha buyugunu verdim" hatasini daha az yapar.
- Taktik pozisyonlarda leaf evaluation daha az yanilir.

Kalan risk:

- Quiescence aday limitleri cok kisiksa bazi sessiz ama kuvvetli tehditler yine kacabilir.

### 3.8 Evaluation v3

Degerlendirme motoru sadece materyal saymiyor; oyunun planini da okumaya calisiyor.

Eklenenler:

- Faz ayrimi: acilis, orta oyun, oyun sonu.
- Piece-square/konum puanlari.
- Royal guvenligi.
- Merkez kontrolu.
- Tas koordinasyonu.
- Ortak hedef baskisi.
- Izole/kenarda kalan tas cezasi.
- Tempo devamlıligi.
- Ayni tasla ileri-geri oyalanma cezasi.
- Oyun sonu donusum skoru.

Fayda:

- AI taslari tahtaya daha mantikli yayar.
- Hard mod gereksiz tempo kaybini daha sert cezalandirir.
- Oyun sadece materyal degil, konum/plana gore oynanir.

### 3.9 Opening Book v3

Acilis kitabi artik sadece sabit bir hamle listesi degil.

Eklenenler:

- Pozisyon hash tabanli kitap secimi.
- Dalli kitap yapisi.
- Kitap veri skoru.
- Acilis/pozisyon bazli istatistik katmani.
- Bot repertuvari.
- Persona ve bot seviyesine gore tercih.
- Motor guvenlik filtresi.
- AI-vs-AI maclarindan kitap istatistigi uretme yardimcisi.

Fayda:

- Rakip kitaptan cikarsa AI ayni plana koru korune devam etmez.
- Kitap hamlesi negatif SEE/taktik borc tasiyorsa reddedilir.
- Botlar farkli acilis karakteri kazanabilir.

Kalan risk:

- Uretilen kitap istatistiklerinin uzun vadeli kalici repertuvar guncellemesine donusmesi daha da otomatiklestirilmeli.

### 3.10 Endgame Solver v2

Oyun sonu motoru tablebase degil, ama daha guclu bir WDL/plan katmanina sahip.

Eklenenler:

- Kucuk materyal gruplari icin WDL cache.
- Win/loss/draw/advantage/risk sonuc etiketleri.
- Guven skoru.
- Kraliyet avi mesafesi.
- Hisar kacis mesafesi.
- Mobilite.
- Kenar/kose baskisi.
- Materyal farki.
- Kazanan taraf icin donusum plani.
- Kaybeden taraf icin direnç plani.

Fayda:

- AI kazanilmis oyun sonunu daha planli bitirmeye calisir.
- Kaybeden taraf hisar/pat direnisi arayabilir.

Kalan risk:

- Offline tablebase yok; kesin kazanc/beraberlik bilgisi her pozisyonda garanti degil.

### 3.11 Bot Kalibrasyon Sistemi

1-15 bot yapisi sadece isim/veri degil, olculen metriklere baglandi.

Eklenenler:

- Her bot icin rating hedefi.
- Beklenen skor.
- Kritik hata limiti.
- Acilis basari hedefi.
- Oyun sonu donusum hedefi.
- Beraberlik limiti.
- Bot bazli W/D/L ve scoreRate.
- `level15Over10` ve `level10Over5` lig kapilari.
- Tune onerileri.

Fayda:

- Botlarin kagit uzerindeki gucu olculebilir hale geldi.
- 15. botun 10. bottan, 10. botun 5. bottan ayrisip ayrismadigi raporlanabilir.

Kalan risk:

- Bu raporlarin guvenilir olmasi icin cok macli round-robin periyodik calistirilmali.

### 3.12 AI Kalite Raporu Otomasyonu

Faz 12 ile motor artik her otomasyon kosusunda kalite karnesi uretebiliyor.

Eklenenler:

- `quality-report.json`
- `quality-report.md`
- `summary.json` icinde `qualityReport`
- Beraberlik orani.
- Max-move draw orani.
- Kotu takas sayisi.
- Cevapta tas kaybi riski.
- Tempo kaybi sinyali.
- Dusuk veri skorlu/riskli kitap hamlesi.
- Uzun beraberlik.
- Onceki kosuyla `improved/regressed/stable` kiyaslama.

Fayda:

- Motor iyilesmeleri artik sadece gozlemle degil veriyle takip edilir.
- Kotu giden alanlar otomatik gorunur.

Kalan risk:

- README ciktı listesi kalite raporu dosyalarini da icerecek sekilde guncellenmeli.
- Her surum icin baseline raporlari arsivlenmeli.

## 4. Guncel 12 Test Basligi Degerlendirmesi

### 4.1 Legal hamleler dogru mu?

Durum: Iyi.

Perft ve apply/revert testleri var. Ancak referans pozisyon sayisi artmali. Timur'a ozel kurallarda derinlik 3-4 perft degerleri uzun vadede sabitlenmeli.

### 4.2 AI taslari gereksiz kaybediyor mu?

Durum: Orta-iyi.

Attack Map, SEE v2, Quiescence v2 ve Evaluation v3 bunu azaltmak icin eklendi. Yine de gercek maclarda hard modun gereksiz tas kaybi kalite raporu ve AI-vs-AI maclariyla izlenmeli.

### 4.3 Rakibin tehditlerini goruyor mu?

Durum: Iyiye yakin.

Attack Map v2 rakip tehditlerini merkezi okuyor. Quiescence artik royal/citadel threat ve rescue hamlelerini de goruyor. Eksik: ayrilmis taktik puzzle suite.

### 4.4 Tas kazanma firsatlarini kaciriyor mu?

Durum: Olculebilir, ama puzzle suite eksik.

AI bu firsatlari SEE, attack map ve search ile okuyabiliyor. Fakat 100-200 pozisyonluk "taktik bulmaca benchmark" kurulmadan net basari yuzdesi verilemez.

### 4.5 Acilis kitabi kotu pozisyonda birakiyor mu?

Durum: Onceki rapora gore belirgin sekilde daha iyi.

Opening Book v3 hash, stats, data score ve guvenlik filtresi tasiyor. Kalan sorun: uzun AI-vs-AI verisinin kitaba surekli geri beslenmesi henuz daha da otomatiklestirilmeli.

### 4.6 AI gerektiğinde kitaptan cikiyor mu?

Durum: Iyi.

SEE borcu, taktik risk ve motor skoru kotu ise kitap hamlesi reddediliyor. Bu sistem var. Kalan is: bu esiklerin bot seviyelerine gore daha hassas tune edilmesi.

### 4.7 Kolay/orta/zor farki hissediliyor mu?

Durum: Var, ama insan testleriyle pekistirilmeli.

Profiller; derinlik, hata toleransi, risk secimi, sure kullanimi ve style policy ile ayriliyor. Ancak oyuncu deneyimi icin en iyi test: kolay/orta/zor modda insan ve AI-vs-AI kazanma oranlari.

### 4.8 1-15 bot seviyeleri ayrisiyor mu?

Durum: Sistem var, kanit icin daha cok mac gerekir.

Bot kalibrasyon raporu var. En guvenilir test, 15 botun tam round-robin ligidir. Su anda sistem bunu kosabilecek altyapiya sahip.

### 4.9 Oyun sonunu bitirebiliyor mu?

Durum: Gelisti, ama tablebase yok.

Endgame Solver v2 WDL cache ve plan uretiyor. Buna ragmen kesin tablebase olmadigi icin bazi kazanilmis pozisyonlar uzayabilir. AI-vs-AI kalite raporunda uzun beraberlik ve terminal win sinyalleri izlenmeli.

### 4.10 Cok fazla beraberlik/tekrar var mi?

Durum: Olculebilir.

Repetition/tempo cezasi ve kalite raporu var. Max-move draw ve long draw artik otomatik raporlanabiliyor. Kalan is, bu metrikleri her surumde onceki surumle kiyaslamak.

### 4.11 Sureli oyunlarda sureyi mantikli kullaniyor mu?

Durum: Altyapi var.

Time context, time budget ve clock pressure katmanlari var. Yine de 5 dk, 15 dk, 30 dk ve suresiz icin uzun AI-vs-AI testleriyle gercek sure davranisi izlenmeli.

### 4.12 Oyuncu hata yaptiginda AI cezalandiriyor mu?

Durum: Hard icin daha iyi, ama benchmark gerekli.

SEE, attack map ve search bu amaca hizmet ediyor. Yine de "blunder-response suite" eksik. Hard %95+, medium %70-85, easy %40-60 gibi hedefler benchmark ile olculmeli.

## 5. Guncel En Ciddi 10 Eksik/Risk

| # | Eksik/Risk | Etki | Oncelik |
|---|---|---|---|
| 1 | Taktik puzzle benchmark yok | Hard modun gercek taktik gucu net olculemez. | Kritik |
| 2 | Buyuk round-robin bot ligi standart pipeline degil | Bot seviyeleri veriyle duzenli kanitlanmaz. | Kritik |
| 3 | Offline endgame tablebase yok | Bazi kesin kazanclar uzayabilir. | Kritik |
| 4 | Derin perft referans seti sinirli | Move generation regresyonlari nadir pozisyonlarda kacabilir. | Yuksek |
| 5 | Opening stats kalici repertuvara tam otomatik geri yazilmiyor | Kitap zamanla kendini yeterince hizli iyilestirmez. | Yuksek |
| 6 | Quality report baseline arsiv sistemi standart degil | Surumler arasi net iyilesme/gerileme takibi eksik kalir. | Yuksek |
| 7 | Mobil performans nedeniyle arama derinligi sinirli | chess.com/Stockfish benzeri derinlik hedeflenemez. | Orta |
| 8 | Parallel search yok | Hard mod uzun sureli oyunlarda daha guclu hesap yapamaz. | Orta |
| 9 | README otomasyon ciktisi kalite raporlarini tam listelemiyor | Gelistirme kullaniminda kafa karisikligi yaratir. | Dusuk-Orta |
| 10 | Analitik veriden otomatik agirlik tune sistemi henuz yok | Motor gelisimi hala kismen manuel karar gerektirir. | Orta |

## 6. Guncel Iyilestirme Plani

### Kisa vade

- 100-200 pozisyonluk taktik puzzle suite kur.
- Blunder-response testleri ekle.
- Perft referans pozisyonlarini artir.
- `quality-report.md` ciktisini README'ye ekle.
- Her AI degisikliginden sonra ayni seed ile fast/league kosusu alip eski kalite raporuyla karsilastir.

### Orta vade

- 15 bot tam round-robin ligini standart komut haline getir.
- Opening book stats'i kalici repertuvar agirliklarina donusturen script yaz.
- Hard mod icin daha agresif endgame conversion esikleri dene.
- Uzun beraberlik ureten maclardan otomatik problem pozisyonu cikar.

### Uzun vade

- 3-4 tasli Timur'a ozel mini tablebase uret.
- Parallel worker search dene.
- Pozisyon/hamle verilerinden hafif NNUE benzeri evaluation denemesi planla.
- Firebase oyun verilerinden anonim training/benchmark seti olustur.

## 7. Onerilen Test Komutlari

Mevcut otomasyon komutlari:

```powershell
cd "C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Al vs Al ( Otomasyon)"
npm test
npm run run:fast
npm run run:quick
npm run run:matrix
npm run run:league
npm run run:nightly
```

Guncel kalite takibi icin onerilen kosu:

```powershell
npm run run -- --league --fast --max-moves 120 --think-ms 25
```

Daha guvenilir ama daha uzun kosu:

```powershell
npm run run -- --league --max-moves 220 --think-ms 70
```

Tam bot odakli test:

```powershell
npm run run -- --matrix --bots-only --repeat 1 --max-moves 220 --think-ms 70
```

## 8. Son Karar

Eski raporun ana fikri dogruydu: motor guclu ama daha cok veriyle test edilmeli. Fakat raporun bircok teknik maddesi Faz 7-12 sonrasi guncelligini kaybetti.

Guncel dogru tablo sudur:

- AI-vs-AI otomasyon artik var.
- Kalite raporu artik var.
- Bot kalibrasyonu artik var.
- Quiescence sadece capture degil.
- Acilis kitabi sadece lineer degil.
- Perft ve motor testleri var.
- Asil eksik: buyuk, tekrarlanabilir, surumler arasi baseline'li benchmark disiplini.

Motorun sonraki kalite sicramasi yeni bir tekil algoritmadan cok, bu olcum sistemini surekli calistirip rapordaki zayif alanlara gore motoru tune etmekten gelecek.
