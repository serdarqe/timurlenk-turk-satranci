# Fairy GPL Release Decision

Karar: GPL yolu secildi.

Timurlenk Turk Satranci motoru GitHub'da acik kaynak olarak paylasilacak. Fairy-Stockfish/WASM-NNUE GPL-3.0 lisansli oldugu icin proje, Fairy bileseni ile birlikte yayinlanan surumlerde GPL uyumlu kaynak yayin stratejisini izler.

## Kabul edilenler

- Proje kokune GPL lisans metni eklendi: `LICENSE`
- Kök paket lisansi `GPL-3.0-only` olarak ayarlandi.
- Fairy ucuncu taraf bildirimi eklendi: `THIRD_PARTY_NOTICES.md`
- Kaynak dagitim rehberi eklendi: `SOURCE_DISTRIBUTION.md`
- GitHub yayin rehberi eklendi: `OPEN_SOURCE_RELEASE_GUIDE.md`
- GPL kontrol komutu eklendi: `npm run release:gpl:check`
- Uygulama ana menusune "Acik Kaynak ve Lisanslar" ekrani eklendi.
- Uygulama icinde "Powered by Fairy-Stockfish (GPL-3.0)" bildirimi ve Fairy kaynak linki gosterilir.
- Genel release kapisi eklendi: `npm run release:check`

## Devam eden sinir

Bu karar, Fairy motorunun tum Timur kurallarini %100 native bildigi anlamina gelmez. Guncel yolda Fairy-first fork varsayilan aciktir; JS Timur motoru kural hakemi, guvenli fallback ve Timur'a ozel wrapper katmani olarak korunur. Production release icin Android WebView uzun stres testi, hibrit kalite olcumu ve lisans bildirimlerinin final kaynak tag'i ile eslestirilmesi gerekir.

## Hukuki not

Bu belge pratik proje karari ve teknik uyum notudur; resmi hukuki danismanlik degildir. Yayindan once gerekirse lisans konusunda uzman bir hukukcudan kontrol alinmalidir.
