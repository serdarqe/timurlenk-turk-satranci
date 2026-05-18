# Timur Satranci Motor Mimari Plani

Tarih: 2026-05-16

Amaç: `Satranc Motoru` klasöründeki klasik satranç motoru PDF'lerinde anlatılan mimariyi mevcut Timurlenk Türk Satrancı AI motoru ile karşılaştırmak ve bu bilgilerden yola çıkarak Timur satrancına özel, ölçülebilir, geliştirilebilir ve chess.com benzeri kaliteye yaklaşan bir motor planı çıkarmak.

Kaynak PDF'ler:

- `Satranc Motoru/Satranç Motorlarının İç Mimarisi ve Çalışma Prensipleri.pdf`
- `Satranc Motoru/Satranç Motoru Teknik İncelemesi.pdf`

İlgili mevcut motor dosyaları:

- `src/ai/ai.worker.js`
- `src/ai/AiEvaluation.js`
- `src/ai/AIEngine.js`
- `src/ai/AIProfiles.js`
- `src/ai/AIBots.js`
- `src/ai/AIStylePolicy.js`
- `src/ai/OpeningBook.js`
- `src/ai/AIEndgame.js`
- `src/ai/AITimeBudget.js`
- `src/ai/AIPositionCriticality.js`
- `src/ai/AIClockPressure.js`
- `src/ai/AiStrategy.js`

## 1. Kisa Sonuc

PDF'lerde anlatılan klasik güçlü satranç motoru yaklaşımı şu omurgaya dayanıyor:

- Hızlı tahta temsili.
- Doğru ve test edilebilir hamle üretimi.
- Iterative deepening ile derinleşen arama.
- Alpha-beta, PVS ve quiescence search.
- Transposition table ile pozisyon hafızası.
- Güçlü hamle sıralama.
- Static exchange evaluation ile taş alışverişi hesabı.
- Açılış kitabı ve oyun sonu tablebase/solver yaklaşımı.
- Süre yönetimi.
- Perft, taktik testleri, self-play ve benchmark sistemi.

Bizim Timur satrancı motorumuz bu yapıların bir kısmını zaten içeriyor. Worker tabanlı arama, süre bütçesi, iterative deepening, transposition table, açılış kitabı, oyun sonu heuristikleri, botlar, karakterler ve AI-vs-AI otomasyon altyapısı var.

Ama mevcut motor hala "tam disiplinli satranç motoru" değil. Daha çok özel kurallı bir oyun AI'sı ile satranç motoru arasında güçlü bir ara seviyede. Hedefimiz, bu temeli koruyup klasik motor disiplinini Timur satrancının kurallarına uyarlamak olmalı.

En önemli karar:

Stockfish doğrudan kopyalanmamalı. Timur satrancı 8x8 klasik satranç değildir. Tahta 11x10 yapıda, taşlar farklı, piyon türleri farklı, kraliyet güvenliği farklı, hisar/citadel gibi özel sonuçlar var. Bu yüzden Stockfish mantığı örnek alınmalı ama motor çekirdeği Timur satrancına özel kurulmalı.

## 2. PDF'lerden Cikan Klasik Motor Ilkeleri

### 2.1 Tahta Temsili

Klasik motorlarda tahta temsili performansın temelidir.

PDF'lerde öne çıkan yaklaşımlar:

- 8x8 array veya mailbox temsil.
- 0x88 veya 10x12 taşma kontrollü temsil.
- Bitboard temsili.
- Magic bitboards veya PEXT/BMI2 ile hızlı saldırı üretimi.
- Zobrist hash ile pozisyon kimliği.
- Make/unmake mantığı ile hamleyi hızlı uygulama ve geri alma.

Klasik satrançta bitboard çok güçlüdür çünkü tahta 64 karedir. Timur satrancında ise tahta 110 kareye yakındır. Bu nedenle klasik 64-bit bitboard doğrudan yetmez.

Timur için öneri:

- Mevcut kare/array temsili korunmalı.
- Üstüne Zobrist hash, incremental state ve attack-map cache eklenmeli.
- 64-bit bitboard taklidi yapmak yerine 110 kareye uygun hibrit temsil kullanılmalı.
- Taş listesi, kare haritası ve saldırı haritası birlikte çalışmalı.

### 2.2 Hamle Uretimi

Klasik motorlarda hamle üretimi iki aşamalıdır:

- Pseudo-legal hamle üret.
- Kral/şah güvenliği ve özel kurallara göre legal filtre uygula.

Bu sistem perft testleriyle doğrulanır. Perft, belirli bir pozisyondan N derinlikte kaç legal hamle olduğunu sayar. Klasik motorlarda bu, kuralların doğru çalıştığını kanıtlamanın en önemli yoludur.

Timur için öneri:

- Her taş türü için ayrı pseudo-legal üretici olmalı.
- Hisar, özel kraliyet durumu, piyon türleri, terfi/özel hareketler legal filtrede net ele alınmalı.
- Timur perft sistemi kurulmalı.
- Her yeni kural değişikliğinde perft bozulursa motor değişikliği durdurulmalı.

### 2.3 Arama Motoru

PDF'lerde klasik motor arama sistemi şu parçalardan oluşuyor:

- Minimax / negamax.
- Alpha-beta pruning.
- Fail-soft skor dönüşü.
- Principal Variation Search.
- Iterative deepening.
- Aspiration window.
- Late Move Reduction.
- Null Move Pruning.
- Futility pruning.
- Quiescence search.

Bizim motorda iterative deepening, süre sınırı, transposition table, PVS benzeri akış, LMR ve quiescence yaklaşımı bulunuyor. Ancak bu sistem daha net, ölçülebilir ve Timur kurallarına göre güvenli hale getirilmeli.

Timur için öneri:

- Arama çekirdeği net bir negamax/fail-soft yapısına taşınmalı.
- TT entry'leri exact/lower/upper bound ayırmalı.
- PVS ana varyantta tam derin, diğer hamlelerde dar pencereyle çalışmalı.
- LMR yalnızca güvenli hamlelerde uygulanmalı.
- Şah tehdidi, taş alma, hisar riski, kraliyet avı ve terfi benzeri kritik hamlelerde reduction yapılmamalı.

### 2.4 Transposition Table

Klasik motorlarda transposition table aynı pozisyonu tekrar tekrar hesaplamayı engeller.

Tipik entry alanları:

- Pozisyon hash.
- Derinlik.
- Skor.
- Bound tipi: exact, lower, upper.
- En iyi hamle.
- Yaş/age.

Bizde transposition table ve hafıza yapısı var. Ancak daha klasik motor disiplinine yaklaştırılmalı.

Timur için öneri:

- Incremental Zobrist hash kullanılmalı.
- TT sadece string pozisyon imzasına bağlı kalmamalı.
- Entry yaşlandırma eklenmeli.
- Oyun boyunca memory korunmalı ama eski ve düşük derinlikli entry'ler temizlenmeli.
- Bound tipi doğru kullanılmalı.

### 2.5 Hamle Siralama

Klasik motorlarda alpha-beta başarısının yarısı hamle sıralamadan gelir. İyi hamle önce denenirse arama çok daha fazla dalı keser.

PDF'lerdeki önemli sıralama unsurları:

- TT/hash move.
- Kazandıran capture.
- SEE pozitif capture.
- Check hamleleri.
- Killer moves.
- History heuristic.
- Continuation history.
- Promotion ve taktik hamleler.

Bizde history, killer ve best move hafızası var. Ancak capture-history, continuation-history ve Timur'a özel taktik öncelikler daha güçlü hale getirilmeli.

Timur için öneri:

- TT move her zaman ilk sıraya alınmalı.
- SEE pozitif taş almalar öne alınmalı.
- Savunmasız royal/şah tehditleri öne alınmalı.
- Hisar tehdidini durduran hamleler öne alınmalı.
- Aynı taşı gereksiz gidip getiren hamleler geriye atılmalı.
- Açılışta gelişim ve merkez kontrolü öne alınmalı.

### 2.6 Static Exchange Evaluation

Static Exchange Evaluation, bir karedeki taş alışverişinin sonucunu hesaplar. Basitçe şu soruya cevap verir:

Bu taşı alırsam, rakip tekrar alırsa, ben tekrar alırsam, en sonunda karlı çıkar mıyım?

Bizde SEE benzeri güvenlik hesapları var. Ancak Timur satrancında taş hareketleri farklı olduğu için klasik satranç SEE doğrudan yetmez.

Timur için öneri:

- Her kare için saldıran ve savunan taş listesi çıkarılmalı.
- En düşük değerli saldıran taşla alışveriş zinciri simüle edilmeli.
- Royal/şah benzeri taşlar özel risk katsayısı almalı.
- Hisar veya oyun sonu özel sonucunu tetikleyen alışverişler ayrıca hesaplanmalı.
- Zor modda SEE negatif hamleler çok sert cezalandırılmalı.

### 2.7 Quiescence Search

Quiescence search, motorun taktik gürültü içeren pozisyonlarda erken durmasını engeller.

Klasik örnek:

AI veziri alıyor gibi görünür ama bir hamle sonra mat oluyor. Normal arama kısa kalırsa bunu göremeyebilir. Quiescence, taş alma ve şah gibi kritik devamları biraz daha arar.

Timur için öneri:

- Capture hamleleri.
- Kraliyet tehdidi.
- Hisar tehdidi.
- Şah/royal baskı hamleleri.
- Terfi/özel piyon hamleleri.
- Büyük taş kaybını önleyen savunmalar.

Quiescence içinde aranmalı. Ama tüm hamleler aranırsa motor yavaşlar. Bu yüzden sadece taktik gürültü oluşturan hamleler seçilmeli.

### 2.8 Degerlendirme Motoru

Klasik motorlar pozisyonu şu başlıklarla değerlendirir:

- Materyal.
- Taş konumu.
- Şah güvenliği.
- Merkez kontrolü.
- Mobilite.
- Piyon yapısı.
- Açık hatlar.
- Gelişim.
- Oyun fazı.

Bizde bu başlıkların çoğu var. Timur için daha özel ve daha ölçülebilir hale gelmeli.

Timur'a özel değerlendirme bileşenleri:

- Taş değeri.
- Taş konumu.
- Taş yayılımı.
- Kraliyet güvenliği.
- Hisar/citadel riski.
- Merkez ve geçiş kareleri kontrolü.
- Taş savunma ağı.
- Savunmasız taş sayısı.
- Overloaded defender.
- Tempo.
- Erken taş kaybı.
- Açılış gelişimi.
- Oyun sonu dönüşüm gücü.
- Rakip kaçış kareleri.
- Plan devamlılığı.

### 2.9 Acilis Kitabi

Klasik motorlarda açılış kitabı motorun yerine geçmez. Sadece güvenli ve bilinen açılış hatlarını sağlar.

Önemli ilke:

Kitap hamlesi kötüleştiyse motor kitaptan çıkmalıdır.

Bizde bu yönde güvenlik kontrolü var. Ancak kitaplar daha veriye dayalı, dallı ve botlara göre ayrılmış hale gelmeli.

Timur için öneri:

- Kitap hamleleri Zobrist pozisyon anahtarına bağlanmalı.
- Her kitap hamlesinin başarı oranı tutulmalı.
- AI-vs-AI maçlarından kitap sonuçları çıkarılmalı.
- Kolay botlar dar ve hatalı kitap kullanabilir.
- Orta botlar güvenli ama sınırlı kitap kullanmalı.
- Zor ve 5 yıldız botlar kitap hamlesini motorla doğrulamalı.

### 2.10 Oyun Sonu

Klasik satrançta Syzygy gibi tablebase yapıları vardır. Bunlar az taşlı pozisyonlarda kesin kazanır/berabere/kaybeder bilgisini verir.

Timur satrancında hazır tablebase yok. Bu nedenle özel oyun sonu çözümleyici gerekir.

Timur için öneri:

- Az taşlı pozisyonlarda exact search.
- WDL cache: win/draw/loss.
- Hisar/pat/kraliyet yakalama özel sonucu.
- Kazanan taraf için dönüşüm mesafesi.
- Kaybeden taraf için direnç ve beraberlik arama.
- Tekrar ve 120 hamle sınırı riskleri.

### 2.11 Sure Yonetimi

Klasik motorlar her hamlede sabit süre düşünmez. Pozisyona göre süre ayırır.

PDF mantığına göre motor:

- Açılışta hızlı oynar.
- Kritik taktik pozisyonda daha fazla düşünür.
- Süresi azsa basit ve güvenli hamle seçer.
- Rakibin süresi azsa cevaplaması zor hamleler seçebilir.

Bizde süre bütçesi var. Ancak arama motoru ile daha sıkı bağlanmalı.

Timur için öneri:

- Süre bütçesi sadece bekleme süresi değil, arama derinliği ve aday hamle sayısını da belirlemeli.
- 5 dk modunda hızlı ama güvenli.
- 15 dk modunda dengeli.
- 30 dk modunda daha derin.
- Süresiz modda kalite odaklı ama sınırsız beklemeyen yapı.

### 2.12 Test ve Olcum

Klasik motor geliştirmede test sistemi olmazsa motor gelişmez. Her değişiklik hissiyatla değil ölçümle değerlendirilir.

Timur için zorunlu testler:

- Perft testleri.
- Legal hamle testleri.
- Taktik pozisyon testleri.
- Açılış kitabı güvenlik testleri.
- Oyun sonu dönüşüm testleri.
- AI-vs-AI lig testleri.
- Bot seviye kalibrasyonu.
- Gerçek oyuncu maçlarından regresyon testleri.

## 3. Mevcut Timur Motoru ile Karsilastirma

### 3.1 Mevcut Guclu Taraflar

Mevcut motor şu açılardan güçlü:

- Web worker içinde çalışıyor.
- UI'ı kilitlemeden AI hesaplıyor.
- Süre bütçesi var.
- Iterative deepening var.
- Transposition table ve arama hafızası var.
- Açılış kitabı var.
- Açılış hamlesi için güvenlik kontrolü var.
- Taş güvenliği ve tehdit haritası var.
- Oyun sonu modülü var.
- Kolay, orta, zor profiller var.
- Karakterler var.
- 1-15 bot sistemi var.
- AI-vs-AI otomasyon var.
- Oyun kayıtları Firestore ve yerel analiz için kullanılabiliyor.

### 3.2 Mevcut Eksikler

Eksikler:

- Tam perft sistemi yok veya ana geliştirme akışının merkezinde değil.
- Tahta temsili klasik motor seviyesinde incremental optimize değil.
- Zobrist hash ve TT bound sistemi daha disiplinli hale getirilmeli.
- SEE daha Timur'a özel ve daha derin olmalı.
- Quiescence search daha iyi taktik filtrelemeli.
- Hamle sıralama daha güçlü olmalı.
- Açılış kitabı sonuç verisiyle beslenmeli.
- Oyun sonu solver tablebase benzeri kesinlikte değil.
- Bot seviyeleri daha fazla ölçümle kalibre edilmeli.
- Motor gelişimi için otomatik kalite skoru çıkarılmalı.

### 3.3 Riskler

Eğer bu eksikler giderilmezse:

- Zor mod bazı basit taş kayıplarını hâlâ kaçırabilir.
- Açılışta kitap hamlesi güvenli görünse bile birkaç hamle sonra zayıf kalabilir.
- Oyun sonlarında kazanılmış pozisyonlar uzayabilir.
- AI-vs-AI maçları çok fazla beraberliğe gidebilir.
- Bot seviyeleri oyuncuya yeterince farklı hissettirmeyebilir.
- Motor gelişimi subjektif kalır, veriyle ölçülemez.

## 4. Timur Satrancina Ozel Motor Hedefi

Hedef motor şu özelliklere sahip olmalı:

- Tüm tahtayı okuyabilmeli.
- Her taşın saldırı ve savunma ilişkisini hesaplamalı.
- Oyuncunun sonraki en iyi cevaplarını tahmin etmeli.
- Kendi taşlarını gereksiz kaybetmemeli.
- Taş kazancı kısa vadeli ise ama uzun vadede kayıp getiriyorsa bunu fark etmeli.
- Açılışta taşları avantajlı dizmeli.
- Kitaba körü körüne bağlı kalmamalı.
- Orta oyunda planlı baskı kurmalı.
- Oyun sonunda kazanılmış pozisyonu bitirebilmeli.
- Zorluklara göre aynı motoru farklı kalite seviyelerinde kullanmalı.
- Botlara farklı ama tutarlı oyun karakteri vermeli.
- Mobil cihazda makul sürede çalışmalı.

## 5. Hedef Mimari

### 5.1 Katman 1: Timur Rules Core

Sorumluluk:

- Tahta durumu.
- Taş listesi.
- Kare işgali.
- Hamle uygulama.
- Hamle geri alma.
- Legal hamle doğrulama.
- Oyun sonucu kontrolü.

Geliştirme:

- Make/unmake daha standart hale getirilmeli.
- Her hamle sonrası incremental state güncellenmeli.
- Zobrist hash eklenmeli.
- Pozisyon tekrarları net takip edilmeli.

Beklenen fayda:

- Arama hızlanır.
- TT daha güvenilir olur.
- AI-vs-AI otomasyon daha stabil olur.

### 5.2 Katman 2: Move Generation ve Perft

Sorumluluk:

- Tüm taşlar için pseudo-legal hamle üretimi.
- Legal filtre.
- Özel kuralların doğrulanması.

Geliştirme:

- Her taş türü için perft pozisyonları hazırlanmalı.
- Açılış dizilimleri için perft değerleri kaydedilmeli.
- Hisar, pat, kraliyet yakalama, özel piyon hareketleri için ayrı testler kurulmalı.

Beklenen fayda:

- Taş hamleleri doğru mu sorusu net cevaplanır.
- Motor geliştikçe kural hatası geri gelmez.

### 5.3 Katman 3: Attack Map ve Threat Map

Sorumluluk:

- Hangi taş hangi kareyi tehdit ediyor?
- Hangi taş savunuluyor?
- Hangi taş savunmasız?
- Hangi royal/şah güvenli değil?
- Hangi kareler kritik?

Geliştirme:

- Legal attack map ve pseudo attack map ayrılmalı.
- Her kare için saldıran/savunan listesi tutulmalı.
- Pinned/blocked/overloaded defender hesaplanmalı.
- Attack map quiescence, SEE ve evaluation tarafından ortak kullanılmalı.

Beklenen fayda:

- AI tüm tahta ilişkilerini daha iyi okur.
- Zor mod kolay taş kaybetmez.
- Orta mod daha dengeli olur.

### 5.4 Katman 4: Timur SEE

Sorumluluk:

- Taş alışverişinin net sonucunu hesaplamak.
- Kısa vadeli kazanç ama uzun vadeli kaybı yakalamak.

Geliştirme:

- Saldıran/savunan taşlar değer sırasına göre simüle edilmeli.
- Özel taş hareketleri hesaba katılmalı.
- Royal güvenliği ve hisar etkisi normal materyal hesabından ayrı eklenmeli.
- SEE skoru move ordering, quiescence ve root seçimde kullanılmalı.

Beklenen fayda:

- AI bedava taş ile zehirli taşı ayırır.
- Hard mod taktik olarak daha güvenli hale gelir.

### 5.5 Katman 5: Search Engine v3

Sorumluluk:

- En iyi hamleyi aramak.
- Rakibin en iyi cevabını hesaplamak.
- Zorluk ve süreye göre derinleşmek.

Geliştirme:

- Negamax/fail-soft omurga.
- PVS.
- Aspiration window.
- TT bound sistemi.
- LMR güvenlik kuralları.
- Futility pruning.
- Check/threat/capture extension.
- Deadline kontrollü iterative deepening.

Zorluk davranışı:

- Kolay: Daha düşük derinlik, kontrollü hata, daha dar aday arama.
- Orta: 2-4 hamle sonrası daha düzenli hesap, az hata.
- Zor: En iyi adaylarda 5-8 ply ve kritik pozisyonda seçici uzatma.
- 5 yıldız bot: Zor mod üstüne daha düşük hata toleransı ve daha güçlü taktik uzatma.

Beklenen fayda:

- Aynı sürede daha kaliteli hamle.
- Hard mod daha az tempo kaybı.
- Uzun planlar daha iyi görülür.

### 5.6 Katman 6: Quiescence v2

Sorumluluk:

- Aramanın taktik gürültüde yanlış durmasını önlemek.

Geliştirme:

- Capture hamleleri.
- SEE pozitif capture.
- Şah/royal tehdidi.
- Hisar tehdidi.
- Terfi ve özel piyon hamleleri.
- Büyük taş kurtarma hamleleri.

Sadece bu tür hamleler quiescence içine alınmalı.

Beklenen fayda:

- AI "taş aldım ama daha büyüğünü kaybettim" hatasını daha az yapar.
- Oyun sonunda taktik netlik artar.

### 5.7 Katman 7: Evaluation v3

Sorumluluk:

- Pozisyonu sayısal olarak değerlendirmek.

Bileşenler:

- Material score.
- Piece-square score.
- Mobility score.
- Mobility quality.
- Threat map score.
- Piece safety.
- Royal safety.
- Center control.
- Line control.
- Development.
- Tempo.
- Pawn/er structure.
- Citadel/hisar risk.
- Endgame conversion.
- Repetition pressure.
- Plan continuity.

Geliştirme:

- Her bileşen ayrı raporlanmalı.
- Oyun sonu analizinde aynı bileşenler kullanılmalı.
- AI-vs-AI maçlarından bileşen ağırlıkları tune edilmeli.
- Zorluklar evaluation'ı bozmak yerine arama kalitesi ve seçim politikasıyla ayrılmalı.

Beklenen fayda:

- Oyun sonu analizi daha doğru olur.
- Kazanan oyuncu yanlışlıkla daha kötü oynadı gibi görünmez.
- AI taşların konumuna göre daha planlı oynar.

### 5.8 Katman 8: Opening Book v3

Sorumluluk:

- Açılışta güvenli ve tematik hamleler sağlamak.

Geliştirme:

- Pozisyon hash tabanlı kitap.
- Eril, dişil ve tam dizilim için ayrı kitap.
- Botlara repertuvar dağıtımı.
- Kitap hamlesi için motor güvenlik testi.
- Kitap başarısını AI-vs-AI verisinden ölçme.

Kitaptan çıkma kuralları:

- Hamle SEE negatifse çık.
- Rakip beklenmeyen kuvvetli hamle yaptıysa çık.
- Motor kitap hamlesinden daha iyi taktik bulduysa çık.
- Kraliyet güvenliği bozuluyorsa çık.
- Hard modda kitap güven puanı daha sıkı olsun.

Beklenen fayda:

- AI açılışta taşlarını daha iyi dizer.
- Kitaba bağlı kalıp taş kaybetmez.
- Botlar farklı açılış karakteri kazanır.

### 5.9 Katman 9: Endgame Solver

Sorumluluk:

- Az taşlı pozisyonlarda kesin veya yarı kesin sonuç üretmek.

Geliştirme:

- 5-6 taş altı exact search.
- WDL cache.
- Hisar/pat özel sonuç kontrolü.
- Kraliyet avı mesafesi.
- Kazanan taraf için dönüşüm metriği.
- Kaybeden taraf için direnç metriği.

Beklenen fayda:

- AI kazanılmış oyunu bitirir.
- Gereksiz tekrar azalır.
- 120 hamle hedefi daha gerçekçi olur.

### 5.10 Katman 10: Difficulty, Persona ve Bot Layer

Sorumluluk:

- Aynı motoru farklı seviyelerde ve farklı karakterlerde oynatmak.

Kurallar:

- Kolay, orta, zor ayrı motor olmamalı.
- Tek güçlü motor kullanılmalı.
- Fark; derinlik, aday sayısı, hata payı, risk toleransı, süre kullanımı ve seçim politikasıyla verilmeli.

Bot sistemi:

- 1-5: Acemi ve öğretici.
- 6-10: Orta, planlı ama hata yapabilen.
- 11-15: Güçlü, az hata yapan, taktik gören.

Karakter sistemi:

- Timur: Baskı, üstünlüğü kazanca çevirme, dengeli güç.
- Beyazıd: Hızlı saldırı, tempo, karmaşa.
- Uluğ Bey: Hesap, güvenlik, uzun plan.
- Saray Veziri: Savunma, taş koruma, geç oyun direnci.

Beklenen fayda:

- Oyuncu botlar arasında gerçek güç ve stil farkı hisseder.

### 5.11 Katman 11: Time Manager v2

Sorumluluk:

- Süre moduna göre arama kalitesi belirlemek.

Geliştirme:

- 5 dk: kısa süre, düşük aday sayısı, güvenli hamle.
- 15 dk: dengeli kalite.
- 30 dk: daha yüksek derinlik.
- Süresiz: kalite modu ama üst limitli.
- Kritik pozisyonda ek süre.
- Açılışta hızlı karar.
- Oyun sonunda kazanma/kaybetme kritikse ek süre.
- Rakibin süresi azsa cevaplaması zor hamle bonusu.

Beklenen fayda:

- AI süreyi gerçek oyuncu gibi kullanır.
- Hızlı modda gereksiz beklemez.
- Uzun modda daha kaliteli oynar.

### 5.12 Katman 12: Test, Benchmark ve Veri

Sorumluluk:

- Motor gelişimini ölçmek.

Kurulacak sistemler:

- Timur perft suite.
- Taktik test suite.
- Açılış test suite.
- Oyun sonu test suite.
- Bot lig sistemi.
- 120 hamle hızlı kayıt sistemi.
- Eski/yeni motor karşılaştırma.
- Firestore oyunlarından test pozisyonu çıkarma.

Metrikler:

- Beraberlik oranı.
- Ortalama hamle sayısı.
- 120 hamleye takılma oranı.
- Erken taş kaybı.
- Kitap sonrası materyal farkı.
- Oyun sonu kazanımı bitirme oranı.
- Hard mod blunder oranı.
- Orta mod fırsat kaçırma oranı.
- Kolay mod hata yoğunluğu.
- Botlar arası güç sıralaması.

Beklenen fayda:

- Her geliştirme veriyle ölçülür.
- Motor kötüleşirse hemen görülür.

## 6. Fazli Uygulama Plani

### Faz 1: Timur Perft ve Kural Dogrulama

Durum: Uygulandı.

Amaç:

Motorun temel kural üretimi güvenilir olsun.

Yapılacaklar:

- Başlangıç dizilimleri için perft pozisyonları.
- Taş bazlı özel pozisyonlar.
- Hisar/pat/kraliyet yakalama testleri.
- Piyon/er türleri için özel hareket testleri.
- Hamle uygulama/geri alma tutarlılık testi.

Çıktı:

- `tests/ai/perft` benzeri test yapısı.
- Her pozisyon için beklenen hamle sayısı.

Başarı ölçütü:

- Tüm perft testleri geçmeli.
- AI geliştirmeleri legal hamle sistemini bozmamalı.

Uygulama notu:

- `src/game/Perft.js` eklendi.
- Legal hamle toplama, `perft`, `dividePerft`, hamle uygulama/geri alma ve state imzası üretme yardımcıları kuruldu.
- Eril, dişil ve tam dizilim için başlangıç derinlik 1-2 perft sayıları sabitlendi.
- Normal hamle, `royal_swap` ve `citadel_exchange` apply/revert akışı test altına alındı.
- Bu faz şu an motorun "legal hamle üretimi bozuldu mu?" sorusuna hızlı regresyon cevabı veriyor.

### Faz 2: Zobrist Hash ve TT v2

Durum: Uygulandı.

Amaç:

Pozisyon hafızasını klasik motor seviyesine yaklaştırmak.

Yapılacaklar:

- Her taş/kare için Zobrist anahtarı.
- Sıra, dizilim, özel durumlar için hash bileşeni.
- Incremental hash update.
- TT entry: depth, score, bound, bestMove, age.
- TT temizleme/yaşlandırma.

Çıktı:

- Daha hızlı tekrar pozisyon tanıma.
- Daha doğru transposition table.

Başarı ölçütü:

- Aynı pozisyon aynı hash üretmeli.
- Make/unmake sonrası hash eski haline dönmeli.
- AI-vs-AI performansı düşmemeli.

Uygulama notu:

- `src/game/ZobristHash.js` eklendi; taş/sıra/dizilim/fidye/hisar değişim haklarını içeren deterministik `z2:<hex>` pozisyon anahtarı üretiyor.
- Normal hamleler için incremental Zobrist güncellemesi test altına alındı; tam yeniden hesaplama ile aynı hash sonucunu veriyor.
- `src/ai/TranspositionTable.js` eklendi; depth, score, bound, bestMove ve age bilgili TT entry yönetimi yapıyor.
- AI worker TT anahtarında derinliği ayrı tutuyor; exact/lower/upper bound kayıtlarını alpha-beta penceresine göre kullanıyor.
- TT kayıtları yaşlandırılıyor, derin kayıtlar sığ kayıtlarla ezilmiyor ve tablo limitinde yaşlı/sığ kayıtlar temizleniyor.
- Beyaz AI siyah perspektife geçerken tekrar pozisyon hafızası yeni Zobrist hash ile aynalanıyor.

### Faz 3: Attack Map v2

Durum: Uygulandı.

Amaç:

AI'nin tüm tahta ilişkilerini tek merkezden okuması.

Yapılacaklar:

- Kare bazlı saldıran/savunan listesi.
- Legal ve pseudo tehdit ayrımı.
- Savunmasız taş sayısı.
- Royal güvenlik kareleri.
- Overloaded defender analizi.

Çıktı:

- Evaluation, SEE, move ordering ve quiescence aynı tehdit verisini kullanır.

Başarı ölçütü:

- Zor mod erken taş kayıplarında azalma.
- Oyun sonu analizinde taş güvenliği daha doğru çıkar.

Uygulama notu:

- `src/ai/AttackMap.js` eklendi; kare bazlı pseudo/legal saldıran, savunan, taş raporu, royal güvenlik ve overloaded defender verisi üretiyor.
- `buildBoardThreatMap` artık Attack Map v2 özetinden besleniyor ve `attackMapVersion: 2` bilgisi taşıyor.
- Mevcut değerlendirme, taş güvenliği, SEE destek fonksiyonları ve hamle sıralama yardımcıları aynı merkezi saldırı/savunma hesaplarını kullanacak şekilde bağlandı.
- Overloaded defender değeri threat map skoruna düşük ağırlıkla eklendi; savunmada tek taşa fazla yük bindiğinde AI bunu risk olarak görüyor.
- Royal güvenlik raporu saldırı altında kalma, legal saldırı, güvenli kaçış ve güvensiz kaçış karelerini ayrı ayrı izliyor.
- Hard mod yüksek güvenli ilk kitap hamlesini koruyacak, ancak düşük güvenli transition kitap hamlesini motor avantajına karşı zorlamayacak şekilde açılış güvenlik penceresi kalibre edildi.

### Faz 4: Timur SEE v2

Amaç:

Taş alışverişlerini daha doğru hesaplamak.

Yapılacaklar:

- Capture tree simülasyonu.
- En düşük değerli saldıran prensibi.
- Royal/hisar özel risk.
- SEE skorunu root adaylarına ekleme.
- SEE negatif kitap hamlesini reddetme.

Çıktı:

- Daha güvenli taktik kararlar.

Başarı ölçütü:

- Hard mod basit zehirli taşları almaz.
- Orta mod çoğu kötü takası görür.
- Kolay mod bazen hata yapar ama sürekli taş vermez.

Durum:

- Uygulandı.
- `evaluateStaticExchangeForMove` artık `timur_see_v2` sonucu döndürüyor.
- Capture tree simülasyonu, en düşük değerli saldıran/cevap bilgisi, takas derinliği ve takas dizisi raporlanıyor.
- Kraliyet/hisar yakınlığı ve saldırı altında kraliyet hamlesi özel SEE cezası alıyor.
- Root aday metadata alanlarına SEE skoru, exchange debt, capture tree depth ve SEE method bilgisi eklendi.
- Negatif SEE borcu zorluk limitini aşan kitap hamlesi doğrudan reddediliyor.

### Faz 5: Search Engine v3

Amaç:

Aynı sürede daha derin ve daha doğru arama.

Yapılacaklar:

- Fail-soft negamax netleştirme.
- PVS akışını standartlaştırma.
- Aspiration window.
- LMR guard kuralları.
- Check/capture/threat extension.
- Futility ve reverse futility pruning.

Çıktı:

- Daha güçlü hard mod.
- Kritik pozisyonda daha iyi hesap.

Başarı ölçütü:

- Test pozisyonlarında hard blunder oranı düşmeli.
- AI-vs-AI ligde 120 hamle beraberlik oranı azalmalı.

Durum:

- Uygulandı.
- Search Engine v3 icin dusuk derinlikte reverse futility ve futility move pruning eklendi.
- Sah, tas alma ve tehdit gibi taktik devam hamleleri futility budamasindan korundu.
- PVS null-window ve yeniden arama akisi merkezi yardimcilara alindi.
- Fail-soft cutoff, futility prune, reverse futility prune ve tactical guard istatistikleri search memory icinde raporlanir hale geldi.
- Testler: `npm test` 215/215 basarili, `npm run build` basarili.

### Faz 6: Move Ordering v3

Amaç:

Alpha-beta verimini artırmak.

Yapılacaklar:

- TT move ilk sıraya.
- SEE pozitif capture.
- Killer moves.
- History heuristic.
- Continuation history.
- Capture history.
- Gelişim/merkez/royal güvenlik öncelikleri.

Çıktı:

- Daha hızlı ve kaliteli arama.

Başarı ölçütü:

- Aynı think-ms ile daha iyi hamle.
- Aranan node sayısı düşmeli veya kalite artmalı.

Durum:

- Uygulandı.
- Mevcut TT/best move/killer/history sıralaması korunarak Move Ordering v3 genişletildi.
- Capture history ve continuation history arama hafızasına eklendi.
- Pozitif SEE veren yakalama hamleleri aramada daha erken denenir hale getirildi.
- Gelişim, merkez kontrolü ve kraliyet güvenliği için ek sıralama bonusları eklendi.
- Açılış kitabı hamlesi root aramada öncelikli aday yapıldı; yine de güvenlik kontrolünden geçmezse motor kitaptan çıkmaya devam eder.
- Yeni search memory istatistikleri eklendi: continuation/capture history update ve order kullanımı, pozitif SEE order ve positional order bonus.
- Testler: `npm test` 216/216 basarili, `npm run build` basarili.

### Faz 7: Quiescence v2

Amaç:

Horizon effect azaltmak.

Yapılacaklar:

- Capture, check, royal threat, hisar threat seçimi.
- SEE negatif capture filtreleme.
- Büyük taş kurtarma hamleleri.
- Quiescence node limiti.

Çıktı:

- Taktik pozisyonlarda daha doğru değerlendirme.

Başarı ölçütü:

- "Taş aldı ama sonra daha büyüğünü kaybetti" vakaları azalmalı.

Durum:

- Uygulandı.
- Quiescence v2 artık capture, check/royal threat, hisar tehdidi, terfi ve büyük taş kurtarma hamlelerini ayrı taktik sınıflar olarak topluyor.
- Negatif SEE veren yakalama hamleleri, hamle şah/kraliyet/hisar tehdidi üretmiyorsa quiescence içinde filtreleniyor.
- Büyük taş kurtarma hamleleri ilk quiescence katmanında deneniyor; böylece savunma sezgisi eklenirken arama ağacı kontrolsüz büyümüyor.
- Zorluklara göre quiescence node limiti ve aday hamle limiti eklendi.
- Yeni arama istatistikleri eklendi: quiescence node, node limit, negatif SEE skip, capture/check/royal/hisar threat ve rescue move sayıları.
- Testler: `node --test tests\ai-worker.test.js` 32/32 başarılı, `npm test` 218/218 başarılı, `npm run build` başarılı.

### Faz 8: Evaluation v3

Amaç:

AI'nin taş konumu, plan ve oyun fazı algısını güçlendirmek.

Yapılacaklar:

- Açılış/orta oyun/oyun sonu faz ayrımı.
- Piece-square tabloları.
- Kraliyet güvenliği v2.
- Taş yayılımı ve koordinasyon.
- Tempo kaybı cezası.
- Plan devamlılığı.
- Oyun sonu dönüşüm skoru.

Çıktı:

- Daha planlı, daha doğal oyun.

Başarı ölçütü:

- AI ilk hamleden son hamleye kadar aynı baskıyla oynar.
- Taşları gereksiz ileri sürüp kaybetmez.

Durum:

- Uygulandı.
- Mevcut faz ayrımı, piece-square, kraliyet güvenliği, stratejik plan ve oyun sonu dönüşüm skorları korundu.
- Yeni koordinasyon bileşeni eklendi: destekli merkez ağı, ortak hedef baskısı ve taşların birlikte çalışma kalitesi ödüllendiriliyor; izole/kenarda kalan taşlar cezalandırılıyor.
- Yeni tempo devamlılığı bileşeni eklendi: son hamle geçmişinden ileri gelişim ödüllendiriliyor, aynı taşın ileri-geri oyalanması cezalandırılıyor.
- Hard açılış kitabı güven penceresi yeni Evaluation v3 skorlarıyla yeniden kalibre edildi; güvenli Timur Kuşatması ilk hamlesi korunuyor, kötü SEE/taktik borç taşıyan kitap hamleleri yine reddediliyor.
- Testler: `node --test tests\ai-evaluation-v3.test.js tests\ai-strategy.test.js tests\ai-style-policy.test.js tests\ai-worker.test.js` 56/56 başarılı, `npm test` 220/220 başarılı, `npm run build` başarılı.

### Faz 9: Opening Book v3

Amaç:

Açılışları güvenli, dallı ve veri destekli yapmak.

Yapılacaklar:

- Pozisyon hash tabanlı kitap.
- Kitap başarı istatistiği.
- Bot repertuvarı.
- Motor güvenlik filtresi.
- AI-vs-AI sonuçlarından kitap güncelleme.

Çıktı:

- Açılışlar daha çeşitli ve güvenli olur.

Başarı ölçütü:

- İlk 10-20 hamlede gereksiz taş kaybı azalmalı.
- Kitap kaynaklı kayıp azalmalı.

Durum:

- Uygulandı.
- Açılış kitabı artık her seçimde mevcut tahta için Zobrist pozisyon hash'i üretip hamle metadata'sına ekliyor.
- Kitap başarı istatistiği katmanı eklendi: açılış bazlı ve pozisyon-hash bazlı oyun/kazanç/beraberlik/kayıp skorları güven ve öncelik hesabına katılıyor.
- Veri destekli seçim eklendi: aynı pozisyonda güvenilir istatistiği zayıf kalan kitap hamlesi yerine daha başarılı repertuvar öne geçebiliyor.
- Bot repertuvarı dışarıdan okunabilir hale getirildi; bot tercihi, seviye, persona, dizilim, pozisyon hash'i ve kitap istatistiği birlikte sıralanıyor.
- AI-vs-AI maçlarından kitap istatistiği üreten yardımcı eklendi; otomasyon kayıtlarına `openingPositionHash`, `openingDataScore` ve `openingStats` alanları eklendi.
- Motor güvenlik filtresi korunuyor: kitap seçimi veriyle güçlense bile worker tarafındaki SEE, taktik borç ve cevap tehdidi kontrollerinden geçmeden oynanmıyor.
- Testler: `node --test tests\opening-book.test.js tests\ai-worker.test.js tests\ai-bots.test.js tests\ai-profiles.test.js` 82/82 başarılı, `npm test` 224/224 başarılı, `npm run build` başarılı, AI-vs-AI otomasyon `npm test` 5/5 başarılı.

### Faz 10: Endgame Solver v2

Amaç:

Az taşlı pozisyonlarda kesinlik artırmak.

Yapılacaklar:

- Küçük materyal grupları için WDL cache.
- Hisar/pat/kraliyet yakalama distance metriği.
- Kazanan taraf dönüşüm planı.
- Kaybeden taraf direnç planı.

Çıktı:

- Kazanılmış oyun daha hızlı biter.

Başarı ölçütü:

- Oyun sonu tekrarları azalır.
- Kazanılan pozisyonun 120 hamleye gitme oranı düşer.

Durum:

- Uygulandı.
- `AIEndgame` içine küçük materyal grupları için kalıcı WDL cache eklendi; aynı az taşlı pozisyon tekrar geldiğinde solver sonucu yeniden hesaplamak yerine cache'ten okunuyor.
- WDL sonucu artık `win`, `loss`, `draw`, `advantage`, `risk` gibi okunabilir sonuç, güven skoru, derinlik, cache bilgisi ve bileşen skorları taşıyor.
- Hisar/pat/kraliyet yakalama için distance metrikleri genişletildi: kraliyet avı mesafesi, kendi hisar kaçış mesafesi, rakip hisar kaçış mesafesi, mobilite, kenar/köşe baskısı ve materyal farkı aynı raporda birleşiyor.
- Kazanan taraf için dönüşüm planı üretildi: kraliyeti yakalama, hisarı kesme, pat/mat ağını sıkılaştırma ve kenar baskısını kazanca çevirme adımları okunabilir hale geldi.
- Kaybeden taraf için direnç planı üretildi: hisar beraberliğine koşma, kaçış karelerini koruma ve baskıyı azaltacak taş değişimi önerileri eklendi.
- Mevcut `analyzeEndgameMoveOutcome` skoru WDL plan bileşenlerini de taşıyor; AI worker oyun sonunda sadece hamle puanı değil, dönüşüm/direnç planını da görebiliyor.
- Testler: `node --test tests\ai-endgame.test.js` 6/6 başarılı, ana AI test paketi 83/83 başarılı, `npm test` 226/226 başarılı, `npm run build` başarılı.

### Faz 11: Bot Kalibrasyon Sistemi

Amaç:

1-15 botun gerçek güç farkını ölçmek.

Yapılacaklar:

- Her bot için rating hedefi.
- Bot-vs-bot lig.
- Seviye bazlı hata oranı.
- Açılış ve oyun sonu başarısı.
- Bot ayarlarını sonuçlara göre tune etme.

Çıktı:

- Botlar seviye seviye daha net ayrılır.

Başarı ölçütü:

- 15. seviye bot 10. seviyeden anlamlı şekilde güçlü olmalı.
- 10. seviye bot 5. seviyeden anlamlı şekilde güçlü olmalı.

Durum:

- Uygulandı.
- `AIBotCalibration` modülü eklendi; 15 bot için rating hedefi, beklenen skor, kritik hata limiti, açılış başarı hedefi, oyun sonu dönüşüm hedefi ve beraberlik limiti üretilebiliyor.
- AI-vs-AI maç kayıtlarından bot başına oyun, galibiyet, beraberlik, mağlubiyet, skor oranı, kritik hata oranı, açılış kitabı verimi, oyun sonu dönüşüm sinyali ve ortalama hamle sayısı çıkarılıyor.
- Seviye bazlı lig kapıları eklendi: `level15Over10` ve `level10Over5` sonuçları `pass`, `fail` veya `needs-data` olarak raporlanıyor.
- Tune önerisi üretildi: bot hedefinin üstünde/altında kalan veya kritik hata/açılış/oyun sonu eşiğini kaçıran botlar için `strengthen-rating`, `reduce-or-fix`, `hold`, `needs-data` önerileri çıkıyor.
- AI-vs-AI otomasyon `summary.json` içine `botCalibration` alanı eklendi; Markdown rapora Bot Kalibrasyonu bölümü eklendi.
- Testler: `node --test tests\ai-bot-calibration.test.js tests\ai-bots.test.js` 7/7 başarılı, `npm test` 228/228 başarılı, `npm run build` başarılı, AI-vs-AI otomasyon `npm test` 6/6 başarılı.

### Faz 12: AI Kalite Raporu Otomasyonu

Amaç:

Her geliştirme sonrası motor kalitesini otomatik görmek.

Yapılacaklar:

- AI-vs-AI maç özetlerinden rapor üretme.
- Beraberlik, taş kaybı, oyun sonu, kitap hatası metriği.
- Eski sürümle karşılaştırma.
- Markdown rapor üretimi.

Çıktı:

- Her build sonrası ölçülebilir AI raporu.

Başarı ölçütü:

- Yeni motorun iyi/kötü olduğu veriyle anlaşılır.

Durum:

- Uygulandı.
- AI-vs-AI otomasyon için `quality-report` modülü eklendi; maç kayıtlarından sonuç kalitesi, taktik güvenlik, açılış güvenliği, oyun sonu dönüşümü ve zaman/zorluk kırılımları çıkarılıyor.
- Beraberlik oranı, hamle limiti beraberliği, kötü takas, cevapta taş kaybı riski, tempo kaybı, düşük veri skorlu/riskli kitap hamlesi ve uzun beraberlik metrikleri otomatik hesaplanıyor.
- Önceki koşu raporuyla kıyas sistemi eklendi; beraberlik, taktik hata, açılış veri skoru ve kazanca dönüşüm gibi metrikler `improved`, `regressed`, `stable` olarak raporlanıyor.
- AI-vs-AI otomasyon artık her koşuda `summary.json` içine `qualityReport` alanı koyuyor ve ayrıca `quality-report.json` ile `quality-report.md` üretiyor; hızlı kayıt modunda da kalite raporu çıkıyor.
- Markdown raporda AI kalite özeti ve öneriler yer alıyor; klasik otomasyon raporuna da AI Kalite Özeti bölümü eklendi.
- Testler: `node --test tests\quality-report.test.mjs tests\automation-api.test.mjs` 8/8 başarılı.

## 7. Klasik Motor Ilkelerini Timur'a Uyarlarken Dikkat Edilecekler

### 7.1 Bitboard Konusu

Klasik satranç motorlarında bitboard çok güçlüdür. Ancak Timur satrancı 64 kare değil. Bu yüzden bitboard birebir alınmamalı.

Doğru yaklaşım:

- Kare array korunur.
- Taş listesi tutulur.
- Attack map cache eklenir.
- İleride gerekirse 128-bit veya iki parçalı bitset denenebilir.

### 7.2 Tablebase Konusu

Klasik Syzygy tablebase kullanılamaz.

Doğru yaklaşım:

- Timur'a özel küçük materyal solver yazılır.
- Önce runtime exact search.
- Sonra sık görülen pozisyonlar cache'lenir.
- En son offline tablebase benzeri veri üretilebilir.

### 7.3 NNUE veya Makine Ogrenmesi

PDF'lerde NNUE modern motorların önemli parçası olarak geçiyor. Ancak hemen NNUE eklemek doğru ilk adım değil.

Doğru sıra:

1. Önce motor testleri ve veri toplama netleşmeli.
2. Sonra evaluation bileşenleri ölçülebilir hale gelmeli.
3. Daha sonra AI-vs-AI ve gerçek maçlardan feature dataset çıkarılmalı.
4. En son küçük NNUE benzeri evaluator denenmeli.

Şimdilik NNUE hedef değil, uzun vadeli opsiyon olmalı.

### 7.4 Chess.com Seviyesi Hedefi

Chess.com motorları çok güçlü arama ve devasa veri/engine altyapısı kullanır. Mobil cihazda 15-20 hamle tam genişlikte arama gerçekçi değildir.

Timur için gerçekçi hedef:

- Tüm hamlelerde 15-20 hamle aramak değil.
- Önemli taktik hatlarda seçici derinleşmek.
- Açılışta kitap + güvenlik filtresi kullanmak.
- Orta oyunda plan ve tehdit haritası kullanmak.
- Oyun sonunda exact solver kullanmak.

Bu yaklaşım mobilde güçlü ve pratik olur.

## 8. Guncel Motor Icin Oncelikli Yapilacaklar

En kısa vadede en çok fayda sağlayacak işler:

1. AI-vs-AI 120 maç raporlarından erken taş kaybı ve tekrar örüntülerini çıkarmak.
2. Hard mod için SEE negatif hamleleri daha sert elemek.
3. OpeningBook içinde kitap hamlesi güvenlik eşiğini hard modda artırmak.
4. Attack map üzerinden savunmasız taşları daha net cezalandırmak.
5. Oyun sonu solver'ın kazanç dönüşüm skorunu güçlendirmek.
6. Bot-vs-bot maçlarında beraberlik oranı ve ortalama hamle sayısını otomatik raporlamak.

## 9. Basari Metrikleri

Motorun geliştiğini anlamak için şu hedefler takip edilmeli:

- 120 hamlelik AI-vs-AI hızlı ligde max-move draw oranı azalmalı.
- Hard mod erken taş kaybı oranı düşmeli.
- Kitap sonrası ilk 20 hamlede materyal kaybı düşmeli.
- Kazanılmış oyun sonlarında bitirme oranı artmalı.
- Aynı pozisyonda hard mod daha kararlı hamle seçmeli.
- Kolay mod hata yapmalı ama tamamen anlamsız oynamamalı.
- Orta mod fırsatları çoğunlukla görmeli.
- 15. bot 10. bottan, 10. bot 5. bottan ölçülebilir biçimde güçlü olmalı.
- Oyun sonu analizinde kazanan tarafın performansı daha doğru okunmalı.

## 10. Nihai Hedef

Nihai hedef, hazır bir klasik satranç motorunu Timur satrancına zorla uydurmak değildir.

Nihai hedef:

Timur satrancının kendi kurallarını bilen, kendi açılışlarını kullanan, kendi oyun sonunu çözen, taş ilişkilerini tüm tahta üzerinden hesaplayan, zorluk ve bot seviyelerine göre davranışı ayarlanabilen, AI-vs-AI verisiyle sürekli gelişen özel bir Timur satrancı motoru kurmaktır.

Bu motorun adı proje içinde şöyle düşünülebilir:

`Timur Engine`

Bu motorun ana ilkesi:

Her hamle sadece o anki taş kazancına göre değil, rakibin cevabına, sonraki taktik zincire, kraliyet güvenliğine, oyun fazına, süreye, bot karakterine ve uzun vadeli plana göre seçilmelidir.
