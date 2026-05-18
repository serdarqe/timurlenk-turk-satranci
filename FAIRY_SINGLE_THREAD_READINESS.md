# Fairy Single-Thread WASM Readiness Raporu

Olusturma zamani: 2026-05-18T21:59:43.989Z

## Karar

- Faz 7 amaci: Android WebView icin `SharedArrayBuffer` gerektirmeyen tek-thread Fairy WASM yolunu hazirlamak.
- Makefile tek-thread build yolu: HAZIR
- Tek-thread artifact: HAZIR

Kisa yorum: Tek-thread build secenegi kaynak Makefile tarafinda artik olculen bir kapidir. Production entegrasyonu icin tek-thread artifact uretilmeli, `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina alinmali ve Android WebView smoke tekrar kosulmalidir.

## Otomatik Kontroller

| Kontrol | Durum | Not |
|---|---|---|
| Fairy kaynak Makefile | OK | C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\emscripten\Makefile |
| Makefile threads option | OK | threads degiskeni mevcut. |
| Makefile single-thread target | OK | emscripten_build_singlethread hedefi mevcut. |
| NO_THREADS flag | OK | Tek-thread build icin NO_THREADS flag mevcut. |
| PThread disable path | OK | Tek-thread build icin USE_PTHREADS=0 yolu mevcut. |
| PThread normal path | OK | Mevcut pthread build yolu korunuyor. |
| Worker conditional copy | OK | Worker dosyasi tek-thread buildde zorunlu degil. |
| Emscripten araci | Uyari | em++ veya emcc bulunduysa yerelde build denenebilir. |

## Yerel Build Araclari

| Arac | Durum | Yol |
|---|---|---|
| em++ | Yok | - |
| emcc | Yok | - |
| make | Bulundu | C:\Users\serda\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe |

### Beklenen tek-thread artifact

- Klasor: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\fairy-poc\vendor\fairy-stockfish-singlethread.wasm`
- Durum: var
- stockfish.js: 47313 byte
- stockfish.wasm: 48263421 byte
- stockfish.worker.js: yok
- uci.js: var
- package.json: var
- SharedArrayBuffer izi: yok
- PThread/Atomics izi: yok
- Tek-thread gorunumu: EVET

### Kaynak build public klasoru

- Klasor: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\emscripten\public`
- Durum: var
- stockfish.js: 47313 byte
- stockfish.wasm: 48263421 byte
- stockfish.worker.js: var
- uci.js: var
- package.json: var
- SharedArrayBuffer izi: yok
- PThread/Atomics izi: yok
- Tek-thread gorunumu: HAYIR

### Mevcut pthread vendor artifact

- Klasor: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\fairy-poc\vendor\fairy-stockfish-nnue.wasm`
- Durum: var
- stockfish.js: 64273 byte
- stockfish.wasm: 1636483 byte
- stockfish.worker.js: var
- uci.js: var
- package.json: var
- SharedArrayBuffer izi: var
- PThread/Atomics izi: var
- Tek-thread gorunumu: HAYIR

## Tekrar Uretme Komutlari

Emscripten/emsdk kuruluysa tek-thread build icin:

```powershell
cd "C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\emscripten" && npm run build -- threads=no
Copy-Item -Recurse -Force "C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\emscripten\public\*" "C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\fairy-poc\vendor\fairy-stockfish-singlethread.wasm"
```

Sonra kontrol:

```powershell
npm run fairy:poc:singlethread:check
npm run fairy:poc:readiness
```

## Production Gate

- Tek-thread artifact hazir degilse Fairy ana AI motoruna baglanmayacak.
- Artifact hazir olsa bile Android WebView smoke gecmeden production kapisi acilmayacak.
- GPL-3.0 lisans karari yine ayri manuel karar olarak kalacak.
