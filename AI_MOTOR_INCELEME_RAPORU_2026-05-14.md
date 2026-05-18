# AI Motoru İnceleme ve Geliştirme Raporu

Tarih: 2026-05-14

Amaç: Timur satrancı yapay zekasını tüm tahta konumunu okuyabilen, taş ilişkilerini daha iyi hesaplayan, açılış ve oyun sonunda daha güvenilir davranan, bot/zorluk/karakter ayrımları daha gerçekçi olan bir motor seviyesine taşımak.

## Kısa Sonuç

Mevcut AI motoru hazır bir satranç motoru değildir; proje içinde geliştirilmiş özel bir Timur satrancı motorudur. Temel yapı güçlü bir noktaya gelmiş durumda: worker üzerinde çalışıyor, süre bütçesi var, iterative deepening var, transposition table var, açılış kitabını körü körüne oynatmamaya çalışan güvenlik kontrolü var, oyun sonu için ayrı heuristikler var.

Ama hedeflenen "chess.com benzeri" motor seviyesine henüz ulaşmış değil. En büyük eksikler şunlar:

- Arama derinliği ve süre limiti mobil için çok kontrollü tutuluyor; hard mod bile gerçek anlamda 15-20 hamle sonrasını hesaplamıyor.
- Tehdit haritası ve taş değişim hesabı var ama tam satranç motoru seviyesinde değil; pin, zorunlu cevap, uzun taktik zincir ve çok hamleli taş kazanımı sınırlı yakalanıyor.
- Açılış kitabı küçük, sadece eril dizilim için tanımlı ve dallanma sayısı az.
- Oyun sonu motoru tablebase/çözümleyici değil; kazancı heuristik olarak yönlendiriyor.
- 15 bot var ama botların motor gücü ayrımı daha çok stil/kitap tercihi üzerinden ilerliyor; gerçek ELO benzeri seviye farkı için arama derinliği, hata modeli ve zaman kullanımı bot bazında daha fazla ayrılmalı.

## Mevcut AI Akışı

AI karar akışı şu şekilde çalışıyor:

1. `AIEngine` oyun durumunu sadeleştirip worker'a gönderiyor.
2. Worker state'i yeniden kuruyor, gerekirse beyaz AI için tahtayı aynalıyor.
3. Zorluk, karakter, bot ve süre bilgisine göre profil oluşturuluyor.
4. Süre bütçesi ve pozisyon kritikliği hesaplanıyor.
5. Açılış kitabı hamlesi bulunursa önce motor değerlendirmesiyle güvenlik kontrolünden geçiriliyor.
6. Aday hamleler iterative deepening ile değerlendiriliyor.
7. Seçim politikası zorluğa göre en iyi veya bilinçli hatalı hamle seçiyor.
8. Hamle UI tarafında uygulanıyor, oyun sonu kontrolleri çalışıyor.

Önemli dosyalar:

- `src/ai/AIEngine.js`: Worker'a gönderilen oyun durumu, bot/karakter/süre bağlamı.
- `src/ai/ai.worker.js`: Ana arama motoru, minimax, quiescence, opening güvenlik kontrolü.
- `src/ai/AiEvaluation.js`: Tahta değerlendirme, tehdit haritası, taş güvenliği, kraliyet güvenliği.
- `src/ai/AIProfiles.js`: Kolay, orta, zor profil ayarları.
- `src/ai/AIBots.js`: 1-15 bot kataloğu.
- `src/ai/AIPersonas.js`: Timur, Beyazıd, Uluğ Bey, Saray Veziri karakter etkileri.
- `src/ai/OpeningBook.js`: Açılış kitabı.
- `src/ai/AIEndgame.js`: Oyun sonu heuristikleri.
- `src/ai/AITimeBudget.js`: Süreye göre düşünme bütçesi.

## Güçlü Taraflar

Motorun temeli iyi:

- Ana arama UI'ı kilitlememek için web worker içinde çalışıyor.
- `maxThinkMs` gerçek deadline olarak kullanılıyor.
- Iterative deepening var; AI önce hızlı bir hamle bulup süre kaldıkça derinleşiyor.
- Transposition table, best move memory, killer moves ve history score altyapısı var.
- Açılış kitabı artık tamamen kör değil; motor puanına ve taktik riske göre kitaptan çıkabiliyor.
- Taş güvenliği, kraliyet güvenliği, merkez kontrolü, tempo, gelişim, piyon yapısı ve tehdit haritası gibi değerlendirme bileşenleri var.
- Süre kontrolü 5 dk, 15 dk, 30 dk ve süresiz moda göre AI davranışını etkiliyor.
- Kolay/orta/zor ayrımı sadece rastgelelik değil; derinlik, risk toleransı, hamle limiti ve seçim politikasıyla da ayrılıyor.

## Ana Bulgular

### 1. Hard mod güçlü ama "gerçek motor" derinliğinde değil

Hard profilinde kök hamle limiti 36, dal hamle limiti 14. Süre bütçesinde hard için normal modda 1300 ms, 30 dk modunda 1200 ms başlangıç bütçesi var ve genel üst limit 1800 ms. Derinlik üst sınırı 7 civarında kalıyor.

Bu mobil için mantıklı ama chess.com motoru gibi 15-20 hamle sonrası plan üretmez. Şu an seçici ve hızlı bir oyun motoru var; uzun varyant hesaplayan derin motor yok.

Risk:

- Zor mod bazı taktik fırsatları kaçırabilir.
- Uzun vadeli feda, sıkıştırma, kraliyet avı, zorunlu hamle serileri sınırlı görülebilir.
- İnsan oyuncu birkaç hamlelik tuzak kurarsa hard mod bazen materyal/konum avantajını yanlış tartabilir.

Öneri:

- Principal Variation Search eklenmeli.
- Late Move Reduction eklenmeli.
- Check/capture/threat extension daha agresif yapılmalı.
- Aspiration window ile aynı sürede daha derin arama yapılmalı.
- Kritik pozisyonlarda hard için 1800 ms üst sınırı isteğe bağlı artırılmalı.

### 2. Tehdit haritası var ama tam taktik çözümleyici değil

`AiEvaluation` içinde tehdit haritası, taş güvenliği ve static exchange hesabı var. Ancak bu hesaplar hâlâ yaklaşık. Tam capture sequence, pin, zorunlu kraliyet cevabı, savunma yükü, taşın hareket edince arkasındaki hattı açması gibi konular sınırlı yakalanıyor.

Risk:

- AI "taş aldım" derken bir sonraki hamlede daha büyük taş kaybedebilir.
- Savunmasız taşları her zaman en doğru sırayla toplayamayabilir.
- Rakibin çok hamleli tehdidini geç fark edebilir.

Öneri:

- Static Exchange Evaluation tam capture tree haline getirilmeli.
- Legal threat map ve pseudo threat map ayrılmalı.
- Pinned/overloaded defender analizi eklenmeli.
- Fork/skewer/discovered attack motifleri ayrı puanlanmalı.

### 3. Açılış kitabı sınırlı ve tüm oyun yapısını kapsamıyor

Açılış kitabında 6 ana kitap var ve tamamı eril dizilim için tanımlı. Zorluklara göre kitap hamlesi limiti kolay 2, orta 4, zor 7. Kitapta dallanma var ama hâlâ dar. Rakip kitap dışı oynadığında motor kitaptan çıkabiliyor; bu doğru yönde. Fakat kitap ağı geniş olmadığı için bazı oyunlarda AI hızlıca genel aramaya kalıyor.

Risk:

- Botlar açılışta birbirine benzer oynayabilir.
- Dişil ve tam dizilimde açılış kitabı etkisi yok veya çok sınırlı kalır.
- Rakip beklenmedik hamle yapınca doğru stratejik plan her zaman oluşmayabilir.

Öneri:

- Açılış kitabı lineer liste değil, ağırlıklı varyant ağacı olmalı.
- Her kitap hamlesi motorla önceden doğrulanmalı.
- Eril, dişil ve tam dizilim için ayrı kitap havuzları oluşturulmalı.
- Botlara kitap sadece isimle değil, varyant ağırlıklarıyla dağıtılmalı.

### 4. Oyun sonu motoru iyi bir başlangıç ama tablebase değil

`AIEndgame` az taşlı pozisyonlarda özel puanlama yapıyor. Hisar riski, pat riski, kraliyet avı, mat ağı ve dönüşüm gibi kavramları hesaba katıyor. Fakat yalnızca belirli taş sayısı altında ve genelde kazanıyor görünen taraf için daha etkili.

Risk:

- Kazanılmış oyunlarda gereksiz uzatma görülebilir.
- Pat/hisar gibi özel sonuçlar bazı varyantlarda geç hesaplanabilir.
- Az taşlı pozisyonda kesin kazanç yolu yerine dolanan hamleler seçilebilir.

Öneri:

- 5-6 taş ve altı için küçük tablebase benzeri exact solver kurulmalı.
- Kraliyet avı ve hisar durumları için özel "distance to win/draw" metriği eklenmeli.
- Oyun sonu test pozisyonları kayıtlı oyunlardan otomatik çıkarılmalı.

### 5. Botlar görünürde 15 seviye ama motor gücü daha fazla ayrılmalı

Bot kataloğunda 1-15 arası bot var. 1-4 kolay, 5-9 orta, 10-15 zor bandına bağlanmış. Botlar karakter, kitap tercihi, precision/safety/pressure/conversion/bookTrust gibi çarpanlarla ayrılıyor.

Bu iyi bir UX başlangıcı. Ancak seviye 10-15 arasındaki gerçek güç farkı, chess.com botları gibi net hissedilmesi için yeterince motor seviyesine bağlı değil.

Risk:

- Bazı botlar sadece farklı stil gibi hissedebilir, daha güçlü/zayıf gibi değil.
- 5 yıldız botlar arasında derinlik ve hata toleransı farkı az kalabilir.
- Kolay bot bazen beklenenden güçlü, orta bot bazen zor gibi oynayabilir.

Öneri:

- Her bot için ayrı `searchDepthBonus`, `branchScale`, `blunderRate`, `riskTolerance`, `bookTrust`, `endgamePrecision` alanları eklenmeli.
- Bot seviyesi ELO benzeri hedefle kalibre edilmeli.
- Botlar kaydedilmiş test maçlarıyla ölçülmeli.

### 6. Karakterler iyi fikir ama daha görünür oyun kimliği kazanmalı

Timur, Beyazıd, Uluğ Bey ve Saray Veziri motor ağırlıklarını etkiliyor. Saldırganlık, güvenlik, tempo, dönüşüm ve süre tarzı ayrımları var.

Risk:

- Karakter farkı bazı oyunlarda hissedilir, bazı oyunlarda sadece küçük puan çarpanı gibi kalır.
- Karakterin oyun planı açılış, orta oyun ve oyun sonu boyunca tutarlı bir "kişilik" oluşturmayabilir.

Öneri:

- Her karakter için faz bazlı strateji profili eklenmeli.
- Timur: üstünlüğü kazanca çevirme ve baskı.
- Beyazıd: saldırı, karmaşa, hızlı tehdit.
- Uluğ Bey: hesap, güvenli taş değişimi, düşük risk.
- Saray Veziri: savunma, taş koruma, geç oyun direnci.

### 7. Süre zekası var ama stratejik saat oyunu sınırlı

AI süre modunu, kalan süreleri, kritikliği ve karakter tarzını dikkate alıyor. Kendi süresi azsa hızlanıyor, rakip süresi azsa daha baskılı hamleleri tercih ediyor.

Risk:

- Saat üstünlüğünü gerçek bir insan gibi uzun vadeli baskıya çevirmeyebilir.
- Karmaşık pozisyon seçimi daha çok anlık bonus üzerinden ilerliyor.
- Süresiz modda kalite artışı sınırlı; yine üst limitlere takılıyor.

Öneri:

- Rakip az süreliyken "cevap zorlaştıran hamle" metriği güçlendirilmeli.
- Süresiz ve 30 dk modunda hard için daha yüksek kalite modu açılmalı.
- Düşük süre senaryoları için ayrı hızlı ama güvenli move ordering eklenmeli.

### 8. Test altyapısı var ama gerçek oyun kalitesi ölçümü eksik

AI için test dosyaları mevcut: worker, profil, bot, açılış, oyun sonu, süre bütçesi, pozisyon kritikliği ve stil politikası test ediliyor.

Eksik olan taraf:

- Kayıtlı gerçek maçlardan otomatik regresyon pozisyonları.
- "Bu pozisyonda hard kesin taş kaybetmemeli" testleri.
- Bot seviye kalibrasyon maçları.
- Açılıştan çıkma doğruluğu testleri.
- Oyun sonu kesin kazanım/pat engelleme testleri.
- Performans bütçesi ve cihaz bazlı süre testi.

## Chess.com Benzeri Motora Dönüşüm Planı

### Faz 1: Taktik Doğruluk Motoru

Amaç: AI basit taş kayıplarını, savunmasız taşları ve zorunlu taktikleri daha iyi görsün.

Yapılacaklar:

- Tam Static Exchange Evaluation.
- Legal/pseudo threat map ayrımı.
- Pin, fork, skewer, discovered attack motifleri.
- Savunmasız taş ve overloaded defender analizi.
- Hard modda taktik fırsatı kaçırma toleransını düşürme.

Beklenen etki:

- Zor mod taşını daha az boşa verir.
- Fırsat gördüğünde kitaptan daha cesur çıkar.
- Orta mod daha dengeli, kolay mod kontrollü hatalı oynar.

### Faz 2: Arama Motoru v3

Amaç: Aynı sürede daha derin ve daha doğru hesaplama.

Yapılacaklar:

- Principal Variation Search.
- Aspiration window.
- Late Move Reduction.
- Check/capture/threat extension.
- Futility pruning ve reverse futility pruning.
- Daha güçlü move ordering.

Beklenen etki:

- Hard mod daha uzun plan kurar.
- Kritik pozisyonlarda 1-2 ply daha derine inebilir.
- Aynı cihazda daha iyi hamle kalitesi alınır.

### Faz 3: Değerlendirme Motoru v3

Amaç: AI tahtadaki tüm taşların konumunu daha insan gibi okusun.

Yapılacaklar:

- Faz bazlı evaluation: açılış, orta oyun, oyun sonu.
- Piece-square table benzeri Timur satrancı konum tabloları.
- Kraliyet güvenliği v2.
- Piyon/er yapısı, geçer taş, zayıf kare ve hat kontrolü.
- Mobilite kalitesi: sadece kaç hamle var değil, ne kadar iyi hamle var.

Beklenen etki:

- AI sadece materyal değil, konumsal üstünlükle oynar.
- Taşlarını koordineli geliştirir.
- Kral/şah benzeri ana taşını gereksiz öne sürmez.

### Faz 4: Açılış Kitabı v3

**Durum: Uygulandı**

Amaç: Kitap hamleleri oyun akışına uyumlu, dallanan ve güvenli olsun.

Yapılacaklar:

- Eril, dişil ve tam dizilim için ayrı kitaplar.
- Varyant ağacı ve ağırlıklı seçim.
- Her kitap hamlesi için motor onayı.
- Botlara farklı repertuvar.
- Rakip kitap dışına çıkınca plan geçişi.

Beklenen etki:

- AI açılışta doğal ve çeşitli oynar.
- Kitaba bağlı kalıp taş kaybetmez.
- Botların kişiliği açılıştan itibaren hissedilir.

Uygulama notu:

- Eril kitaba ek olarak dişil ve tam dizilim için ayrı repertuvarlar eklendi.
- Açılış dalları artık hamle güveni, öncelik ve kitap dışına çıkış bilgisi taşıyor.
- Rakip kitap dışına çıkarsa AI düşük güvenli plan geçişi üretiyor; hard mod bu geçişi motor avantajına karşı zorlamıyor.
- Beyaz AI aynalama akışında açılış metadata bilgileri korunuyor.
- Kitaptaki tüm yeni hamleler motorun legal hamle doğrulamasından geçirildi.

### Faz 5: Oyun Sonu Solver

Amaç: Az taşlı pozisyonlarda kesin kazanç ve beraberlik yollarını daha iyi bulmak.

Yapılacaklar:

- 5-6 taş altı exact search.
- Hisar/pat/kraliyet avı özel mesafe metriği.
- Kazanılmış oyunlarda sadeleştirme ve dönüşüm planı.
- Kaybedilen oyunlarda direnç ve pat arama.

Beklenen etki:

- AI kazanılmış oyunu daha kısa bitirir.
- Gereksiz tekrar azalır.
- Oyun sonu analizleri daha doğru olur.

Durum: Uygulandı.

Uygulama notu:

- 6 taş ve altı pozisyonlar için seçici exact-search oyun sonu solver eklendi.
- Solver yalnızca kritik oyun sonu durumlarında devreye giriyor: kraliyet yakalama, hisar tehdidi, az taşlı kesin hesap ve terminal sonuç ihtimali.
- Hisar/pat/kraliyet avı için mesafe metriği eklendi; AI artık kazanırken sadeleştirme, kaybederken direnç ve beraberlik arama davranışını daha net puanlıyor.
- Exact solver skoru mevcut taktik motoru ezmeyecek şekilde kalibre edildi; terminal kazanç/kayıp yüksek öncelikli, yaprak tahminleri kontrollü ağırlıkta kullanılıyor.
- Yeni regresyon testleri son kraliyeti alma ve rakibin tek hamlede hisar beraberliği bulma senaryolarını doğruluyor.

### Faz 6: Bot ELO ve Seviye Kalibrasyonu

Amaç: 1-15 bot gerçekten kademeli güç farkı sunsun.

Yapılacaklar:

- Her bot için ayrı arama derinliği ve hata modeli.
- Bot başına açılış repertuvarı.
- Bot başına oyun sonu hassasiyeti.
- Bot başına risk ve tempo karakteri.
- Self-play ile seviye ölçümü.

Beklenen etki:

- 1 yıldız acemi gibi, 5 yıldız gerçekten usta gibi oynar.
- Klasik kolay/orta/zor korunur ama bot modu daha zengin olur.

Durum: Uygulandı.

Uygulama notu:

- 15 botun tamamına ELO benzeri rating ve strengthScore kalibrasyonu eklendi.
- Bot seviyesi artık profil üzerinde gerçek etki yapıyor: arama derinliği, kök/dal aday limiti, hata payı, en iyi hamleyi seçme olasılığı ve tehlikeli hamle toleransı kademeli değişiyor.
- 4 yıldız hard botlar artık klasik hard tabanlı ama hâlâ hafif insanî hata payı taşıyor; 5 yıldız botlar daha düşük hata toleransı ve daha yüksek oyun sonu hassasiyetiyle ayrışıyor.
- Bot başına açılış repertuvarı korunup rating bilgisi seçim kartlarına taşındı.
- Oyun sonu, taş güvenliği, tekrar ve baskı ağırlıkları bot seviyesine göre ölçekleniyor.
- Yeni regresyon testleri bot rating sıralaması, kalibrasyon verisi, hard bot ayrışması ve seviye bazlı profil güçlenmesini doğruluyor.

### Faz 7: Gerçek Oyun Verisiyle Ölçüm

Amaç: AI gelişimini hissiyatla değil veriyle izlemek.

Yapılacaklar:

- Firestore oyun kayıtlarından test pozisyonları çıkarma.
- "AI taş kaybetti mi?", "fırsat kaçırdı mı?", "oyun sonunu bitirdi mi?" metrikleri.
- Her build için otomatik AI kalite raporu.
- Hard/medium/easy için ayrı regresyon testleri.

Beklenen etki:

- Her yeni geliştirme ölçülebilir olur.
- Eski hatalar tekrar geri gelmez.

## Öncelik Sırası

En doğru ilerleme sırası:

1. Taktik doğruluk ve tam static exchange.
2. Hard mod için daha güçlü arama motoru.
3. Kraliyet güvenliği ve konumsal evaluation v3.
4. Açılış kitabı v3.
5. Oyun sonu solver.
6. Bot ELO kalibrasyonu.
7. Gerçek maç verisi regresyon sistemi.

## Son Değerlendirme

Mevcut motor "oynanabilir ve gelişmiş özel AI" seviyesinde. Worker, süre, profil, karakter, bot, açılış ve oyun sonu altyapısı kurulmuş. Bu iyi bir temel.

Ancak "gerçek chess.com motoru" hedefi için ana fark şurada: Mevcut AI iyi heuristiklerle seçim yapıyor; hedef motor ise çok daha derin varyant hesaplamalı, taktikleri net çözmeli, oyun sonunu daha kesin oynamalı ve seviyeleri ölçülebilir biçimde ayırmalı.

Yani sıfırdan başlamak gerekmiyor. Doğru yol, mevcut motoru koruyup üzerine daha ciddi taktik hesaplama, arama motoru v3, evaluation v3, açılış v3 ve oyun sonu solver katmanlarını sırayla eklemek.
