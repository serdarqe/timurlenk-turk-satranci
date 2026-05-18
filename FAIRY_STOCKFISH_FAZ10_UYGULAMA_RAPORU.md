# Fairy-Stockfish Faz 10 Uygulama Raporu

Tarih: 2026-05-19

## Kapsam

Revize plandaki Faz 10, GPL lisans uyumu ve release oncesi yasal/teknik kaynak bildirimi icindir.

## Yapilanlar

- Ana menuye `Acik Kaynak ve Lisanslar` baglantisi eklendi.
- Uygulama ici lisans ekraninda Fairy-Stockfish attribution bilgisi gosterildi.
- Fairy-Stockfish upstream kaynak linki eklendi.
- Uygulama kaynak kodunun GPL uyumlu yayinlanacagi kullaniciya bildirildi.
- TR/EN i18n metinleri eklendi.
- GPL release kontrol scripti uygulama ici lisans ekranini da denetleyecek sekilde guclendirildi.
- Genel release gate komutu eklendi: `npm run release:check`.
- GPL karar ve kaynak yayin rehberi guncellendi.
- Fairy asset manifestlerindeki eski "production disi" notlari guncel durumla uyumlu hale getirildi.

## Dogrulama

Calisan komutlar:

```powershell
npm run release:gpl:check
npm run build
npm run release:check
```

Sonuc:

- GPL dosya kontrolu gecti.
- Kök paket lisansi `GPL-3.0-only`.
- Fairy paket metadata lisansi `GPL-3.0`.
- Gizli dosya ignore kurallari gecerli.
- Uygulama ici Fairy-Stockfish attribution ekrani tespit edildi.
- Production web build basarili.

## Kalan Manuel Adim

GitHub public kaynak yayinini tamamlamak icin gelistirici hesabinda repo acilmali ve Play Store surumuyle eslesen tag yayinlanmali.

Onerilen repo adi:

```text
timurlenk-turk-satranci
```

Onerilen ilk tag:

```text
v1.2.14-v26
```

## Sonraki Faz

Revize plana gore siradaki teknik faz:

```text
Faz 3 - Zurafa Native Hareketi
```

