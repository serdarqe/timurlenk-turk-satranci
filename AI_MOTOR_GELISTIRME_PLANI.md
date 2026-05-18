# AI Motor Geliştirme Planı

Bu yol haritası Timurlenk Türk Satrancı AI motorunu daha güçlü, daha süre-bilinçli ve daha stratejik hale getirmek için fazlara bölünmüş plandır.

## Faz 1: Gerçek Süre Motoru

**Durum: Uygulandı**

AI’ye gerçek deadline eklendi. `maxThinkMs` sadece ayar değil, gerçekten aramayı durduran süre sınırı oldu. Iterative deepening ile AI önce hızlı iyi hamle buluyor, süre kalırsa derinleşiyor.

## Faz 2: Arama Hafızası

**Durum: Uygulandı**

Transposition table oyun boyunca korunuyor. Önceki en iyi hamle, killer moves ve history heuristic eklendi. Böylece AI aynı pozisyonları tekrar tekrar hesaplamadan önceki arama bilgisini kullanabiliyor.

## Faz 3: Değerlendirme Motoru v2

**Durum: Uygulandı**

Taş konumu, savunma/saldırı haritası, taş güvenliği, kraliyet güvenliği, merkez kontrolü, tempo, gelişim ve piyon yapısı ayrı ayrı puanlanıyor. AI tahtadaki tüm taş ilişkilerini daha okunabilir ve ölçülebilir bileşenlerle değerlendiriyor.

## Faz 4: Taktik Hesaplama Güçlendirme

**Durum: Uygulandı**

Static exchange evaluation, zorunlu hamleler, şah/tehdit uzatmaları ve daha iyi quiescence eklendi. AI artık savunulan yem taşlarını daha sert cezalandırıyor, kötü takasları aday sıralamasında aşağı itiyor ve taktik/şah durumlarında aramayı seçici şekilde uzatıyor.

## Faz 5: Açılış Kitabı v2

**Durum: Uygulandı**

Mevcut lineer kitap, rakip cevabına göre dallanan açılış ağacına çevrildi. AI artık oyuncunun erken hamlesini okuyor, tanımlı dal varsa ona göre kitap hamlesi seçiyor, tanımsız cevapta kitaptan çıkıyor ve seçilen kitap hamlesi yine motor analiziyle güvenlik kontrolünden geçiyor.

## Faz 6: Oyun Sonu Motoru

**Durum: Uygulandı**

Az taşlı pozisyonlar için özel `AIEndgame` modülü kuruldu. Mat ağı, hisar riski, pat/stalemate ağı, kraliyet avı, terminal oyun sonu skorları ve taktik güvenlik ayrı bileşenlerle hesaplanıyor. AI artık kazanan oyun sonunda sessiz oyalanma yerine şah baskısı ve kraliyet avını daha değerli görüyor; rakip kraliyetin hisara kaçma riskini ise daha sert cezalandırıyor.

## Faz 7: Zorluk ve Karakter İnceliği

**Durum: Uygulandı**

Aynı güçlü motor korunarak zorluk ve karakter davranışları ayrı bir karar tarzı katmanına taşındı. Kolay daha affedici ve tempolu, orta daha dengeli, zor ise risk/taktik güvenlik konusunda çok daha seçici davranıyor. Timur baskı ve kazanca çevirme, Beyazıd tempo/saldırı, Uluğ Bey hesap ve güvenlik, Saray Veziri savunma/taş güvenliği ağırlıklarıyla root aday puanını ayrıca şekillendiriyor.

## Faz 8: Test ve Ölçüm Sistemi

**Durum: Planlandı**

Kayıtlı oyunlardan test pozisyonları çıkarılacak. Her sürümde AI’nin taş kaybı, fırsat kaçırma, açılıştan çıkma, oyun sonu bitirme ve süre kullanımı ölçülecek.
