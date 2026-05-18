# Kozmetik Sistemi — Geliştirme Notları

**Tarih:** 13 Nisan 2026  
**Konu:** Tahta temaları + Taş skin sistemi

---

## İstek & Motivasyon

- **Kullanıcı geri bildirimi (İbrahim Yavuzdemir):** "Taşların küçük olması ve taşların belirgin olmaması nedeniyle oynayışı zorlanmaktadır. Daha belirgin taşların ve tahta çeşitlerinin gelmesini rica ederim."
- **Hedef:** 3 tarihi tahta teması + 3 taş skin'i + genel görünürlük iyileştirmesi

---

## Yapılanlar

### Yeni Dosyalar

#### `src/utils/ThemeManager.js`
Tema tercihlerini `localStorage`'a kaydeder ve `<html>` elementine `data-board-theme` / `data-piece-skin` attribute'u uygular. Uygulama başlarken `themeManager.applyAll()` ile aktif edilir.

#### `src/styles/themes.css`
CSS custom property override sistemi. JS mantığına dokunmadan sadece CSS değişkenleri yazılarak tüm tahta renkleri değişir.

---

### Değiştirilen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/utils/i18n.js` | TR + EN tema/skin çevirileri eklendi |
| `index.html` | Ayarlar overlay'ine tahta teması ve taş görünümü seçicileri eklendi |
| `src/styles/menu.css` | `.theme-btn-group`, `.theme-choice-btn` stilleri |
| `src/styles/pieces.css` | Taş boyutu **%90 → %95**, siyah taş kontrastı artırıldı |
| `src/main.js` | ThemeManager import, init, UI güncelleme, event listener'lar |

---

## Tahta Temaları

### 🏛️ Semerkant (`samarkand`) — *Varsayılan*
> Timur'un başkenti. Altın ve sıcak kahve tonları.

- Açık kare: `hsl(35, 40%, 75%)` — Krem
- Koyu kare: `hsl(25, 45%, 45%)` — Sıcak kahve
- Citadel: Altın çerçeve
- Arka plan: Derin gece mavisi

### 🏕️ İpek Yolu (`silk-road`)
> Orta Asya kervan yolu. Kum, terracotta ve bakır.

- Açık kare: `hsl(38, 55%, 72%)` — Sıcak kum
- Koyu kare: `hsl(18, 50%, 35%)` — Yanmış toprak
- Citadel: Bakır-turuncu çerçeve
- Arka plan: Karanlık kızıl-kahve

### 🕌 Horasan Gecesi (`khorasan`)
> İran-Türk sentezi. Zümrüt ve obsidyen.

- Açık kare: `hsl(155, 18%, 60%)` — Soluk zümrüt
- Koyu kare: `hsl(155, 42%, 19%)` — Derin yeşil
- Citadel: Zümrüt çerçeve
- Arka plan: Neredeyse siyah-yeşil

---

## Taş Skin'leri

### Klasik (`classic`) — *Varsayılan*
Mevcut görünüm, iyileştirilmiş kontrast ile.
- Beyaz: Standart SVG
- Siyah: `brightness(0.32)` — öncekinden çok daha belirgin

### Altın & Obsidyen (`golden`)
Yüksek kontrast. Savaş meydanı estetiği.
- Beyaz: Sıcak altın tonu (`sepia + saturate`)
- Siyah: Neredeyse siyah obsidyen (`brightness(0.07)`)

### Fildişi & Lacivert (`ivory`)
Zarif ve okunması kolay.
- Beyaz: Parlak fildişi (`brightness(1.3)`)
- Siyah: Derin lacivert (`hue-rotate(205deg)`)

---

## Görünürlük İyileştirmeleri (tüm temalar için)

- Taş boyutu: **%90 → %95** (İbrahim Bey'in şikayetine yanıt)
- Siyah taş filtresi: `brightness(0.5)` → `brightness(0.32)` — daha belirgin
- Tüm taşlara hafif kontrast arka plan dairesi eklendi (`themes.css` `.piece::before`)
- Drop-shadow gölgesi güçlendirildi

---

## Mimari Notlar

```
Settings UI → event listener (main.js)
                ↓
         themeManager.setBoardTheme(theme)
                ↓
    document.documentElement.dataset.boardTheme = theme  ← CSS cascade
                ↓
    [data-board-theme="silk-road"] { --board-dark: ... }  ← themes.css
```

Tema değiştiğinde sayfayı yenilemeye gerek yok. CSS attribute selector anlık güncellenir.

---

## Build Notu

`JAVA_HOME` sistemde JDK 17'yi gösteriyor, Capacitor 8 ise JDK 21 gerektirir.  
Build komutu:
```bash
JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot" ./gradlew assembleDebug
```
