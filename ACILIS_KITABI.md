# Timurlenk Türk Satrancı - Motor Uyumlu Açılış Kitabı

**6 açılış - Eril dizilim - mevcut oyun motoru ile doğrulanmış sürüm**

Bu dosya Faz 3 açılış kitabı için kaynak olarak kullanılabilir. Önceki sürümdeki bazı hareket açıklamaları tarihsel/teorik notlara yakındı; bu sürüm ise doğrudan oyundaki `MoveValidator` ve taş hareketleriyle uyumludur.

---

## Koordinat Sistemi

```
Sütunlar : a b c d e f g h i j k   (soldan sağa, 11 sütun)
Sıralar  : 1-10                    (1 = Beyaz arka sıra, 10 = Siyah arka sıra)

Beyaz başlangıç:
  Sıra 1 : Fil a1  Dev b1  Db c1   [d-h boş]   Db i1  Dev j1  Fil k1
  Sıra 2 : K a2  At b2  Göz c2  Zür d2  Bak e2  ŞAH f2  Vez g2  Zür h2  Göz i2  At j2  K k2
  Sıra 3 : a3 b3 c3 d3 e3 f3 g3 h3 i3 j3 k3 piyonları

Siyah başlangıç:
  Sıra 10: Fil a10  Dev b10  Db c10  [d-h boş]  Db i10  Dev j10  Fil k10
  Sıra 9 : K a9  At b9  Göz c9  Zür d9  Bak e9  ŞAH f9  Vez g9  Zür h9  Göz i9  At j9  K k9
  Sıra 8 : a8-k8 piyonları
```

**Kısaltmalar:** At=Knight, Dev=Camel, Db=Dabbaba, Fil=Elephant, Göz=Picket, Zür=Giraffe, Bak=General, Vez=Vizier, K=Rook, P=Piyon.

---

## Motor Hareket Kuralları

Bu bölüm mevcut kod davranışına göre yazılmıştır.

| Taş | Motor hareketi |
|-----|----------------|
| Şah / Prens / Eğreti Şah | Her yöne 1 kare |
| Vezir | 1 kare düz: ileri, geri, sağ, sol |
| Bakan | 1 kare çapraz |
| At | 2+1 L sıçrama |
| Deve | 3+1 uzun L sıçrama |
| Dabbaba | Tam 2 kare düz sıçrama |
| Fil | Tam 2 kare çapraz sıçrama |
| Zürafa | Önce 1 kare çapraz boş olmalı, sonra aynı yönde en az 3 kare düz/yan ilerler; yol kapalıysa gidemez |
| Gözcü | Çaprazda en az 2 kare kayar; taş üzerinden atlamaz |
| Kale | Düz hatlarda sınırsız kayar; taş üzerinden atlamaz |
| Piyon | 1 kare ileri gider, sadece dolu çapraz kareye alır; çift adım yok |

Önemli düzeltmeler:

- `Vez g2→h3` bu motorda geçerli değildir; Vezir çapraz gitmez.
- `Bak e2→g4` bu motorda geçerli değildir; Bakan 2 kare çapraz gitmez.
- `At b2→d3` başlangıçta geçerli değildir; d3 kendi piyonu ile doludur.
- `Ka3→a5` önünde a4 piyonu varken geçerli değildir; Kale taş üzerinden atlamaz.

---

# 1. Açılış - Merkez Piyonu

**Seviye:** Kolay  
**Uygun karakter:** Timur  
**Konsept:** e-f-g piyonlarıyla merkezi kapat, iki Atı merkeze çıkar, Bakanı güvenli gelişim karesine al.

### Hamleler

```opening
1. e3→e4
2. g3→g4
3. At b2→c4
4. f3→f4
5. At j2→i4
6. Bak e2→f3
```

### Neden uyumlu?

- e3, f3, g3 piyonları tek kare ileri oynar.
- b2 Atı c4'e, j2 Atı i4'e legal L sıçraması yapar.
- e2 Bakanı f3'e 1 kare çapraz gider; f3 piyonu 4. hamlede boşalttığı için kare açıktır.

### Pozisyon fikri

```
Güçlü : e4-f4-g4 piyon zinciri, c4 At, i4 At, f3 Bakan
Plan  : Veziri g3'e çıkar, Kaleleri ancak piyon yolu açıldıktan sonra geliştir
Risk  : Merkez piyonları fazla ilerlerse arka sıra taşları pasif kalabilir
```

---

# 2. Açılış - Çift At Baskısı

**Seviye:** Kolay-Orta  
**Uygun karakter:** Beyazıd  
**Konsept:** İki Atı hızla ileri üs karelerine taşı, sonra merkez piyonlarıyla destekle.

### Hamleler

```opening
1. At b2→c4
2. At j2→i4
3. At c4→d6
4. At i4→h6
5. e3→e4
6. f3→f4
7. g3→g4
```

### Neden uyumlu?

- `b2→c4`, `j2→i4`, `c4→d6`, `i4→h6` motorun At L sıçramasına uygundur.
- d6 ve h6 kareleri başlangıçta boştur.
- Son üç hamle normal piyon ilerlemesidir.

### Pozisyon fikri

```
Güçlü : d6 At ve h6 At siyahın 8. sıra piyon hattına baskı kurar
Plan  : Merkez piyonlarıyla Atların geri dönüş karelerini koru
Risk  : Atlar çok ileride yalnız kalırsa tempo kaybedebilir
```

---

# 3. Açılış - Piyon Kalesi

**Seviye:** Orta  
**Uygun karakter:** Saray Veziri  
**Konsept:** d-e-f-g-h hattında güvenli piyon duvarı kur, sonra Atları iki kanattan yerleştir.

### Hamleler

```opening
1. f3→f4
2. e3→e4
3. g3→g4
4. d3→d4
5. h3→h4
6. At b2→c4
7. At j2→i4
```

### Neden uyumlu?

- Beş piyon hamlesinin tamamı tek kare ileri ve hedef kareleri boştur.
- Atlar c4 ve i4'e legal sıçrar.

### Pozisyon fikri

```
Güçlü : d4-e4-f4-g4-h4 piyon duvarı
Plan  : Veziri g3'e, Bakanı f3'e alarak zinciri destekle
Risk  : Çok sağlam ama yavaş; Kale ve Dabbaba gelişimi gecikir
```

---

# 4. Açılış - Deve Aktif

**Seviye:** Orta  
**Uygun karakter:** Uluğ Bey  
**Konsept:** Deve'nin 3+1 sıçramasını erken kullan; merkez piyonları ve At ile ikinci baskı katmanını kur.

### Hamleler

```opening
1. Dev b1→c4
2. e3→e4
3. At j2→i4
4. g3→g4
5. Dev c4→f5
6. At b2→c4
7. At c4→d6
```

### Neden uyumlu?

- Deve b1'den c4'e, sonra f5'e motorun 3+1 uzun L sıçramasıyla gider.
- Sol At b2'den c4'e ancak Deve f5'e çıktıktan sonra yerleşir; c4 artık boştur.
- c4 Atı d6'ya legal sıçrar.

### Pozisyon fikri

```
Güçlü : f5 Deve, d6 At, i4 At
Plan  : f3-f4 ve Bak e2-f3 ile merkezi sağlamlaştır
Risk  : f5 Deve yalnız kalırsa geri dönüş rotası iyi hesaplanmalı
```

---

# 5. Açılış - Kale Koridoru

**Seviye:** Orta-Zor  
**Uygun karakter:** Timur  
**Konsept:** Kale'yi doğrudan beşinci sıraya atmaya çalışma; önce piyon koridoru aç, sonra Kaleyi üçüncü sırada yatay hatta kullan.

### Hamleler

```opening
1. a3→a4
2. b3→b4
3. K a2→a3
4. K a3→b3
5. k3→k4
6. j3→j4
7. K k2→k3
```

### Neden uyumlu?

- a3 ve b3 piyonları açılmadan Kale hareket edemez; bu yüzden önce koridor açılır.
- `K a2→a3` a3 boşaldıktan sonra legaldir.
- `K a3→b3` b3 boşaldıktan sonra yatay Kale hareketidir.
- Sağ Kale için de k3 piyonu önce k4'e alınır.

### Pozisyon fikri

```
Güçlü : b3 Kale ve k3 Kale, iki kanatta esnek baskı
Plan  : b4-b5 veya j4-j5 ile Kale arkasından itme hazırla
Risk  : Piyonlar Kale önünü tekrar kapatabilir; acele hücum yerine koridoru koru
```

---

# 6. Açılış - Timur Kuşatması

**Seviye:** Zor  
**Uygun karakter:** Timur  
**Konsept:** At-Deve koordinasyonu ile merkez ve siyah piyon hattına çok cepheli baskı kur.

### Hamleler

```opening
1. At b2→c4
2. At j2→i4
3. e3→e4
4. At c4→d6
5. Dev b1→c4
6. Dev c4→f5
7. g3→g4
8. f3→f4
9. Bak e2→f3
```

### Neden uyumlu?

- Sol At c4'e çıkar ve 4. hamlede d6'ya giderek c4 karesini Deve için boşaltır.
- Deve b1-c4-f5 rotasını legal uzun L sıçramalarıyla tamamlar.
- e3, f3 ve g3 piyonları tek kare ileri gider.
- Bakan e2'den f3'e 1 kare çapraz gider; f3 piyonu 8. hamlede f4'e çıktığı için hedef kare boştur.

### Pozisyon fikri

```
Güçlü : d6 At + f5 Deve + i4 At üçlü baskısı
Plan  : f3 Bakan ile e4-g4 merkezini koru, sonra Vez g2-g3 ile bağlantı kur
Risk  : Gelişim güçlü ama hassas; yanlış sırada oynanırsa c4 karesi tıkanır
```

---

## Faz 3 İçin Motor Veri Formatı Önerisi

Bu kitap beyaz açısından yazılmıştır. AI siyah oynadığı için Faz 3'te hamleler aynalanmalıdır:

```
Beyaz koordinatı: file, rank
Siyah aynası    : aynı file, 11 - rank

Örnek:
e3→e4  =>  e8→e7
At b2→c4 => At b9→c7
Dev b1→c4 => Dev b10→c7
```

Önerilen açılış girdisi:

```js
{
  id: 'timur_siege',
  formation: 'masculine',
  personaId: 'timur',
  difficulty: 'hard',
  side: 'black',
  moves: [
    { from: 'b9', to: 'c7', note: 'At merkezi üsse çıkar' },
    { from: 'j9', to: 'i7', note: 'Sağ At simetrik gelişir' }
  ]
}
```

## Faz 5 - Dallı Kitap Davranışı

Motor artık açılışları yalnızca sırayla takip etmez. İlk oyuncu cevabı da okunur:

- Oyuncu bilinen bir merkez, at veya kanat gelişimi oynarsa AI ilgili açılış dalına geçer.
- Oyuncu tanımlı dal dışında bir hamle yaparsa AI kitaptan çıkar ve normal arama motoruyla oynar.
- Seçilen kitap hamlesi yine motor adayları içinde analiz edilir; taktik olarak kötü kalırsa kullanılmaz.
- Siyah AI için kitap hamleleri rank aynasıyla uygulanır; beyaz AI oynarken aynı mantık siyah perspektife çevrilerek kullanılır.

---

## Açılış Karşılaştırması

| Açılış | Seviye | Hız | Saldırı | Pozisyon | Karakter |
|--------|--------|-----|---------|----------|----------|
| Merkez Piyonu | Kolay | Orta | Orta | Güçlü | Timur |
| Çift At Baskısı | Kolay-Orta | Hızlı | Yüksek | Orta | Beyazıd |
| Piyon Kalesi | Orta | Yavaş | Düşük | Çok güçlü | Saray Veziri |
| Deve Aktif | Orta | Orta | Yüksek | Orta | Uluğ Bey |
| Kale Koridoru | Orta-Zor | Orta | Orta | Esnek | Timur |
| Timur Kuşatması | Zor | Yavaş | Çok yüksek | Çok güçlü | Timur |

---

## Genel Açılış İlkeleri

1. Merkezi e-f-g piyonlarıyla sahiplen.
2. Atları erken çıkar; Atlar piyon açılmadan gelişebilir.
3. Deve'yi doğru sırada çıkar; c4 karesi At ve Deve arasında çakışabilir.
4. Kale için önce piyon koridoru aç; Kale taş üzerinden atlamaz.
5. Vezir düz, Bakan çapraz gider; modern satranç veziri gibi düşünme.
6. Gözcü çapraz kayar; piyon gibi düz ilerlemez.
7. Zürafa yolu kapalıysa çalışmaz; ilk çapraz kare mutlaka boş olmalı.
8. Siyah AI için beyaz açılışlarını rank aynasıyla kullan.
