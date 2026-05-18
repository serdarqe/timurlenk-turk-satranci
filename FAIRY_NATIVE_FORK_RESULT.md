# Fairy Native Fork Sonucu

Tarih: 2026-05-19

## Hedef

Faz 16 notunda kalan is, Fairy-first app entegrasyonunun bir adim otesine gecip Fairy-Stockfish kaynak kodunda Timur Satranci varyantini native olarak baslatmakti.

## Yapilanlar

- `Satranc Motoru/fairy-stockfish.wasm-nnue/src/variant.cpp` icine `timur_variant()` eklendi.
- Varyant `timur` adiyla native kaydedildi.
- Geriye uyumluluk icin `timur_poc` adi da ayni native varyanta baglandi.
- 11x10 ana tahta native ayarlandi: `RANK_10` ve `FILE_K`.
- Mevcut POC baslangic dizilimi native FEN olarak eklendi.
- Rok ve piyon cift adim kapatildi.
- En passant kapatildi.
- 3-kat tekrar ve 50 hamle yardimcilari native varyant ayarina eklendi.
- Son yatayda zorunlu terfi ayarlandi.
- Terfi havuzu Timur POC ile uyumlu kuruldu: vezir, general, at, fil, kale, dabbaba, deve.
- Temel tarihi taslar native piece/Betza olarak tanitildi.
- Zurafa simdilik `IMMOBILE_PIECE` olarak guvenli placeholder kaldi.
- Kaynak kontrolu icin `npm run fairy:native:source:check` eklendi.
- Native bestmove kontrolu icin `npm run fairy:native:bestmove` eklendi.
- Native kaynakla pthread ve single-thread WASM build alindi.
- Android/WebView icin single-thread artifact `public/fairy-singlethread` altina hazirlandi.
- Oyun tarafinda Fairy motoru artik harici `timur_poc` yuklemek yerine built-in `timur` varyantini secer.

## Native Eklenen Tas Cekirdegi

| FEN | Tas | Native hareket durumu |
|---|---|---|
| `k` | Sah | Native |
| `p` | Piyon | Native, cift adimsiz |
| `r` | Kale | Native |
| `n` | At | Native |
| `v` | Vezir | Native Wazir |
| `g` | General | Native Fers |
| `e` | Fil | Native Alfil |
| `d` | Dabbaba | Custom `D` |
| `c` | Deve | Custom `C` |
| `s` | Deniz canavari | Custom `W` |
| `l` | Aslan | Custom `H` yaklasimi |
| `b` | Boga | Custom `Z` yaklasimi |
| `h` | Gozcu | Custom `G` yaklasimi |
| `q` | Prens | Custom `K`, royal mantik wrapper fazinda |
| `a` | Ek sah | Custom `K`, royal mantik wrapper fazinda |
| `t` | Picket | Custom `B` yaklasimi |
| `z` | Zurafa | Simdilik immobile placeholder |

## Bilerek Disarida Birakilanlar

Bunlar native C++ fork icin sonraki fazdir:

- Hisar kareleri ve hisar beraberligi.
- Sah-hisar yer degistirme.
- Pawn-of-pawns terfi zinciri.
- Prens ve ek sahin tam royal mantigi.
- Zurafanin gercek tarihi hareketi.
- Picket icin "en az iki kare" gibi ince hareket siniri.
- Timur'a ozel NNUE/eval egitimi.

## Dogrulama

Calisan kontroller:

```powershell
npm run fairy:native:source:check
npm run fairy:native:bestmove
npm run fairy:poc:singlethread:build
npm run fairy:poc:webview:prepare
npm run fairy:poc:webview:check
npm run fairy:poc:fork:test
npm run fairy:poc:readiness
npm run build
```

C++/WASM build:

```bash
make -C .. emscripten_build ARCH=wasm
npm run fairy:poc:singlethread:build
```

Sonuc:

- Mevcut `tools/emsdk` kullanildi; yeni indirme gerekmedi.
- Git Bash icinde `emcc 2.0.26` ve `GNU Make 4.4.1` ile native kaynak derlendi.
- Pthread build `Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten/public` altina uretildi.
- Single-thread build `TimurChessWeb/fairy-poc/vendor/fairy-stockfish-singlethread.wasm` altina kopyalandi.
- WebView paketi `TimurChessWeb/public/fairy-singlethread` altinda hazirlandi.
- `npm run fairy:native:bestmove` native `timur` varyanti ile `bestmove d3d4` urettigini dogruladi.

## Mevcut Oyun Etkisi

Bu adimdan sonra oyun tarafindaki Fairy-first motor `public/fairy-singlethread` artifact'ini ve built-in `timur` varyantini kullanir.

Harici `timur-draft.variants.ini` dosyasi silinmedi; POC karsilastirma scriptleri, smoke sayfasinda `?variant=poc` modu ve geriye donuk testler icin korunur.

## Sonraki Net Adim

1. Android emulator/WebView icinde uzun smoke/stres testi kos.
2. Native artifact ile gercek oyunda Fairy kayıt alanlarini kontrol et.
3. Zurafa, hisar, royal ek sah ve pawn-of-pawns kurallarini C++ fazlari olarak ekle.
4. POC karsilastirma scriptlerini yavas yavas native `timur` odakli hale getir.
