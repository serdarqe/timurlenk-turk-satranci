# AI Acilis, Orta Oyun ve Oyun Sonu Raporu

Tarih: 2026-05-17

Bu rapor, mevcut Timurlenk Turk Satranci AI motorunun uc ana oyun fazindaki durumunu ozetler:

- Acilis
- Orta oyun
- Oyun sonu

Kisa sonuc: Acilis ve oyun sonu artik ozel sistemlere sahip. Orta oyun da guclu genel arama/evaluation katmanlariyla oynuyor, fakat henuz acilis ve oyun sonu kadar ayri benchmark ve ozel plan sistemiyle olculmuyor. Siradaki en dogru buyuk gelistirme alani orta oyun benchmark'i ve taktik/stratejik plan secici olur.

## 1. Acilis Durumu

### Mevcut Sistem

Acilis kitabi artik basit sabit hamle listesi degil. Mevcut yapida sunlar var:

- Dalli acilis kitabi.
- Pozisyon/hash tabanli kitap secimi.
- Bot ve karakter repertuvari.
- Kitap hamlesi icin motor guvenlik filtresi.
- Negatif SEE veya belirgin taktik risk varsa kitaptan cikma.
- AI-vs-AI verisinden kitap basari istatistigi uretme altyapisi.

Bu iyi bir temel. AI artik rakip kitaptan ciktiginda ayni plana koru korune devam etmiyor.

### Guncel Olcum

Calistirilan komut:

```bash
npm run report:opening-safety -- --max-plies 12 --think-ms 35 --output exports/opening-safety-current.md --json exports/opening-safety-current.json
```

Sonuc:

- Senaryo: 66
- Flagged scenario: 25
- Illegal move: 0
- Ortalama entegre kitap hamlesi: 0.36
- Major black loss scenario: 5
- En kotu materyal: `full_safe_development/pressure`, min `-66`

### Yorum

Bu rapor iki seyi gosteriyor:

1. Legalite iyi: illegal hamle yok.
2. Kitap guvenlik filtresi cok sert calisiyor olabilir: cogu bayrak `no_book_move` ve `ai_rejects_book_immediately`.

Yani AI kitap hamlesini kotu oldugu icin veya yeterince guvenmedigi icin hemen reddediyor. Bu bazen iyi bir davranis; ama acilis kitabi cok az kullanilirsa AI her oyunda sifirdan dusunmeye baslar ve repertuvar hissi azalir.

### Acilis Icin Siradaki Isler

- `no_book_move` bayragini tek basina hata saymamak; motor skoru guvenliyse bunu "bilerek kitaptan cikti" olarak ayirmak.
- Full dizilimde `full_safe_development`, `full_lion_gate`, `full_revealer_shield` pressure varyantlarini yeniden kontrol etmek.
- Kitap hamlesi kabul esiklerini zorluga ve bot seviyesine gore ayirmak.
- AI-vs-AI maclarindan acilis basari oranini otomatik kitaba geri beslemek.

## 2. Oyun Ortasi Durumu

### Mevcut Sistem

Oyun ortasi acilis ve oyun sonu gibi tek bir "MiddleGameSolver" moduluyle ayrilmiyor. Bunun yerine genel motor katmanlari oyun ortasini yonetiyor:

- Evaluation v3 faz ayrimi: acilis / orta oyun / oyun sonu.
- Orta oyunda merkez kontrolu, mobilite, tas destegi ve royal guvenligi puanlaniyor.
- Attack map ile taslarin tehdit/savunma iliskisi okunuyor.
- SEE ile tas alisverisleri kontrol ediliyor.
- Quiescence v2 ile tas alma, royal tehdit, hisar tehdit, terfi ve buyuk tas kurtarma hamleleri derinlestiriliyor.
- PVS/alpha-beta, transposition table, killer/history ve continuation history ile arama guclendiriliyor.
- Selection policy, riskli hamleleri ve tempo kaybini azaltmak icin guvenli adaylara donebiliyor.

Bu nedenle motor oyun ortasinda tamamen rastgele oynamiyor; tahtadaki tas konumlarini, saldiri/savunma iliskilerini, materyali, merkezi ve tempoyu hesaba katiyor.

### Guncel Kanitlar

Son hedef matrix raporu:

- `exports/ai-matrix-white-masculine-riskcheck.md`
- 12 senaryo
- Flag: 0
- Illegal move: 0
- Terminal AI loss: 0
- Average unsafe move: 0

Bu, ozellikle beyaz AI eril dizilimdeki erken riskli hamlelerin toparlandigini gosteriyor.

Ancak daha uzun orta oyun raporu icin denenen 60 ply matrix kosusu 4 dakika limitinde bitmedi. Bu da bize pratik bir eksik gosteriyor:

- Orta oyun icin daha hafif, ozel, hizli bir benchmark suite gerekiyor.

### Orta Oyunun Guclu Yanlari

- Artik basit tas kaybi eskisine gore daha az.
- Zor mod, riskli takaslari daha sert cezalandiriyor.
- AI ayni tasi ileri geri oynama ve tempo kaybi konusunda daha kontrollu.
- Rakibin sonraki hamlede cevapta tas kazanma riski hesaba katiliyor.
- Karakterler oyun tarzini etkiliyor: Timur baski ve kazanca cevirme, Beyazid saldiri/tempo, Ulug Bey hesap, Saray Veziri guvenlik/savunma.

### Orta Oyunun Zayif Yanlari

Orta oyun su anda en cok gelistirilebilecek alan.

Eksikler:

- Ozel orta oyun benchmark'i yok.
- Cift saldiri, catal, sis, pusu, savunucu yuklenmesi gibi taktik motifler daha net puzzle/test setine baglanmali.
- 5-6 hamle sonraki planlar secici aramayla daha iyi takip edilmeli.
- AI bazen iyi materyal kazanci ile uzun vadeli konumsal risk arasindaki farki yeterince net ayirmayabilir.
- Taslari yayma, hat acma, zayif kare yaratma, rakip royal kacis alanini azaltma gibi stratejik planlar ayri "plan secici" olarak modellenmeli.
- Orta oyun icin "hamle kalitesi" raporu henuz acilis ve oyun sonu kadar ayrintili degil.

### Orta Oyun Icin Siradaki En Dogru Gelistirmeler

1. MiddleGameBenchmark eklemek.
   - 30-50 pozisyonluk test seti.
   - Her pozisyon icin beklenen hamle tipi: tas kazan, tehdit savun, catal kur, royal guvenligini koru, tempo kazan.

2. Taktik motif dedektoru eklemek.
   - Fork/catal.
   - Skewer/sis.
   - Pin/hat baglama.
   - Overloaded defender.
   - Discovered attack.
   - Trapped piece.

3. Orta oyun plan secici eklemek.
   - "Merkezi tut"
   - "Rakip royal etrafini daralt"
   - "Zayif tasi hedefle"
   - "Savunmasiz hatti kapat"
   - "Taslari koordine et"

4. Quiet move uzatmalarini guclendirmek.
   - Sadece tas alan hamleyi degil, 1-2 hamle sonra tas kazandiran sessiz tehditleri de daha iyi aramak.

5. Orta oyun kalite raporu eklemek.
   - Bad exchange.
   - Missed tactic.
   - Hanging piece.
   - Tempo loss.
   - Plan drift.
   - Center control loss.

## 3. Oyun Sonu Durumu

### Mevcut Sistem

Oyun sonu artik motorun en net gelisen taraflarindan biri.

Eklenenler:

- `AIEndgame` modulu.
- Kucuk materyal WDL cache.
- Kazanan/kaybeden taraf icin plan uretimi.
- Kraliyet avi.
- Hisar kacis mesafesi.
- Pat/stalemate ve uzun oyun riski.
- Rook-helper net.
- Promoted Vizier, Sea Monster, General ve diger destek tas rolleri.
- `AIEndgameRoles` ile tas rol haritasi.

### Guncel Olcum

Calistirilan komut:

```bash
node --test tests/endgame-suite.test.mjs
```

Sonuc:

- Toplam pozisyon: 25
- Kazanildi: 25
- Kismi: 0
- Basarisiz: 0
- Illegal: 0
- Kazanma orani: %100

Bu cok iyi bir sonuc. Daha once sorunlu olan terfi ve rook-helper oyun sonlari da artik benchmark icinde kazaniliyor.

### Oyun Sonunun Guclu Yanlari

- Kazanilmis az tasli pozisyonlari bitirme basarisi ciddi sekilde artti.
- Terfi sonrasi planlar daha iyi.
- Rook + yardimci tas aglari daha genis tas turlerine yayildi.
- Kaybeden taraf icin hisar/pat direnisi mantigi var.
- Oyun sonu artik sadece materyal saymiyor; kacis, baski, mobilite ve net kurma hesaplaniyor.

### Oyun Sonunun Kalan Riski

- Gercek offline tablebase yok. Yani her az tasli pozisyon icin matematiksel kesinlik garanti degil.
- Benchmark pozisyonlari iyi ama daha fazla gercek mac pozisyonu eklenmeli.
- Uzun AI-vs-AI maclarinda oyun sonu bazen 120+ hamleye uzayabilir; bu kalite raporuyla takip edilmeli.

## 4. Genel Degerlendirme

| Faz | Durum | Puan | Yorum |
|---|---:|---:|---|
| Acilis | Iyi ama ayar istiyor | 78/100 | Kitap guvenli, fakat filtre bazen fazla erken kitaptan cikariyor. |
| Orta oyun | Orta-iyi | 72/100 | Genel motor guclu; ancak ozel orta oyun benchmark'i ve plan secici eksik. |
| Oyun sonu | Cok iyi | 88/100 | 25/25 endgame benchmark basarili; tablebase olmadigi icin kesinlik siniri var. |

## 5. Siradaki Onerilen Faz

En mantikli siradaki faz:

**MiddleGame v1 - Orta Oyun Taktik ve Plan Motoru**

Icerik:

- Orta oyun benchmark suite.
- Taktik motif dedektoru.
- Plan secici.
- Quiet threat extension.
- Orta oyun kalite raporu.

Beklenen etki:

- Zor mod daha "insan gibi planli" oynar.
- Basit tas kaybi daha da azalir.
- Oyuncu hata yaptiginda AI daha cabuk cezalandirir.
- AI sadece acilis ve oyun sonunda degil, macin orta bolumunde de baskiyi surdurur.

