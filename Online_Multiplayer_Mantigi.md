# 9'lu SOS - Online Multiplayer Sistem Raporu

Bu rapor, "9'lu SOS" projesinde kullanılan online oynama (multiplayer) mantığının detaylarını içermektedir. Bu mimari, merkezi bir oyun sunucusuna ihtiyaç duymadan **Peer-to-Peer (P2P)** bağlantısı kurarak oyuncuların karşılıklı oynamasını sağlar. Başka oyun veya projelerde bu yapıyı kolayca uyarlayabilirsiniz.

## 1. Genel Mimari ve Kullanılan Teknolojiler
Projedeki multiplayer sistemi **WebRTC** teknolojisine dayanmaktadır. WebRTC'nin karmaşık altyapısını soyutlamak ve kolaylaştırmak için **[PeerJS](https://peerjs.com/)** kütüphanesi tercih edilmiştir. 
* **Avantajı:** Sürekli çalışan özel bir WebSocket/Oyun sunucusu yazmanıza gerek kalmaz. Sadece bağlantının ilk kurulma anında (signaling) PeerJS'in ücretsiz eşleştirme sunucusu kullanılır. Bağlantı sağlandıktan sonra veriler iki kullanıcının tarayıcısı arasında doğrudan (P2P) akar.
* **Gereksinim:** Projeye dahil edilmiş bir `peerjs` script'i (CDN üzerinden veya lokalden).

## 2. Ayrıntılı Çalışma Mantığı (NetworkManager Sınıfı)
Tüm ağ işlemleri kapsül halinde `www/network.js` içindeki `NetworkManager` sınıfı üzerinden yönetilir. Sistem, **Host (Oda Kuran)** ve **Guest (Katılan)** olmak üzere asimetrik bir rol yapısına sahiptir.

### A. Oda Kurma (Host İşlemleri)
1. **Oda Kodu Üretimi:** Host olan oyuncu için `SOS9-XXXXXX` formatında rastgele, kısa ve okunabilir bir ID üretilir (`_generateRoomId` fonksiyonu).
2. **Peer Tanımlaması:** Host, PeerJS objesini yaratırken bu sabit ve bilinen ID'yi zorunlu ID olarak atar: 
   ```javascript
   this.peer = new Peer(roomId, { debug: 2 });
   ```
3. **Bağlantı Bekleme:** `this.peer.on('connection', ...)` eventi ile dışarıdan gelen bağlantılar dinlenir.
4. **Karakter Ataması:** Host her zaman oyuna ilk başlayan **'X'** karakterini kontrol eder (`this.myPlayerType = 'X'`).

### B. Odaya Katılma (Guest İşlemleri)
1. **Peer Tanımlaması:** Guest oyuncu kod üretmez. Sadece rastgele bir PeerJS objesi (ID belirtmeden) oluşturur.
2. **Host'a Bağlanma:** Arkadaşının gönderdiği Host ID'sini kullanarak direkt hedef odaya bağlanır:
   ```javascript
   const conn = this.peer.connect(roomId, {
       metadata: { playerName: playerName }
   });
   ```
   *Not: Guest oyuncu, adını `metadata` içinde karşı tarafa iletir.*
3. **Karakter Ataması:** Guest oyuncu daima ikinci karakter olan **'O'** karakterini kontrol eder (`this.myPlayerType = 'O'`).

### C. Handshake (El Sıkışma) ve Başlangıç
* Guest bağlandığında, metadata üzerinden ismini Host'a gönderir.
* Host bağlantıyı kabul ettiğinde aralarında bir veri akışı (DataChannel) açılır (`_setupConnection`).
* Host, kendi adını içeren bir `{ type: 'init', playerName: myName }` paketini Guest'e göndererek iki tarafın da birbirinin ismini bilmesini sağlar.
* Her iki tarafta da `onConnect` callback'i tetiklenir ve oyun ekranı başlatılır (`ui.js` üzerinden).

## 3. Veri İletişimi (Oyun Senkronizasyonu)
Oyun başladıktan sonra iki oyuncu arasında JSON formatında obje mesajları alınıp verilir. Üç temel mesaj tipi vardır:

* **init (Başlangıç):** İsim senkronizasyonu içindir. Sadece bağlandıktan heman sonra bir kez atılır.
* **move (Hamle):**
  Bir oyuncu kendi sırasında geçerli bir hamle yaptığında, arayüz (UI) bunu `network.sendMove(boardIndex, cellIndex)` çağrısıyla gönderir.
  ```javascript
  { type: 'move', boardIndex: 1, cellIndex: 5 }
  ```
  Karşı tarafın `on('data')` eventi bu mesajı dinler ve `onMoveReceived` callback'ini çağırır. Gelen bu hamle doğrudan yerel oyun motoruna işletilir (`game.playMove(b, c)`).
* **restart (Yeniden Oynama):**
  Oyun bittiğinde veya taraflardan biri yeni oyun başlattığında fırlatılır. `uiController._remoteNewGame()` tetiklenerek her iki oyuncunun da ekranı aynı anda temizlenir.

## 4. Kullanıcı Arayüzü (UI) ve Oyun Motoru Entegrasyonu
`ui.js` içerisinde bulunan entegrasyon mantığı, kuralların delinmemesi için bazı kilit unsurlara sahiptir:

1. **Sıra Kontrolü:** `_handleLocalMove` işlemi yapılırken şu kontrol mecburidir:
   ```javascript
   if (this.gameMode === 'online' && this.game.currentPlayer !== this.network.myPlayerType) return;
   ```
   Bu sayede sırası gelmeyen oyuncu tahtaya tıklasa bile işlem reddedilir ve ağa sahte hamle gönderimi engellenir.
2. **Kopma (Disconnect) Yönetimi:** `connection.on('close')` event'i dinlenerek bağlantı kesildiğinde oyuncuya uyarı verilir (`Rakip ayrıldı!`) ve ana menüye dönülür.

## 5. Başka Bir Projeye Uyarlarken Dikkat Edilmesi Gerekenler
Bu altyapıyı yeni bir projeye (Örnek: Satranç, Dama veya Kızma Birader) uyarlarken izlemeniz gereken adımlar şunlardır:

1. **Gerekli Dosyalar:**
   - PeerJS Kütüphanesi (`<script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>`)
   - `network.js` (Class mantığını projenize göre biraz modifiye etmeniz gerekecektir)
2. **Durum (State) Senkronizasyonu:**
   Sıra tabanlı oyunlarda sadece *hamleyi (move)* göndermek yeterlidir. Ancak anlık etkileşimli oyunlarda (Örn: Biliardo) veya bağlantı kopup geri geldiği senaryolarda "Oyun Durumunun Tamamını" (Full State) ara ara gönderecek yeni bir mesaj tipi (Örn: `{ type: 'sync_state', boardState: [...] }`) eklemeniz gerekebilir.
3. **Cheating (Hile) Koruması:**
   P2P mimarisinde merkezi bir sunucu kodları doğrulamadığı için her iki tarayıcı da oyunun kurallarına uyulduğunu kontrol etmelidir. Orijinal projede olduğu gibi, gelen `move` isteğini ekrana yansıtmadan önce kendi oyun motorunuza (`this.game.playMove`) atarak hamlenin kural dışı olup olmadığını teyit etmelisiniz.
4. **Bağlantı Zaman Aşımı:**
   STUN/TURN sunucusu ayarları varsayılan bırakıldığında kısıtlı ağlarda (%10-15 lik kurumsal ağlar veya aşırı katı NAT arkasındaki 4G bağlantıları) PeerJS eşleşemeyebilir. Daha prodüksiyon düzeyinde bir iş için özel TURN sunucu adresleri eklenebilir. 
   *(Mevcut projede PeerJS varsayılan ayarlarıyla gayet verimli çalışmaktadır.)*

**Özetle:** 9'lu SOS projesi, basit ama oldukça etkili bir asimetrik P2P modeli kullanır. Hamleler ve oyun yeniden başlatma komutları event bazlı gönderilerek minimum veri transferiyle çok oyunculu deneyim sunar.
