# Fairy Single-Thread Build Sonucu

Olusturma zamani: 2026-05-18T21:51:35.021Z

## Karar

- Faz 8 build durumu: BASARILI
- Not: Tek-thread artifact uretildi ve vendor klasorune kopyalandi.

## Arac Kontrolu

| Arac | Durum | Yol |
|---|---|---|
| em++ | Bulundu | C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\tools\emsdk\upstream\emscripten\em++.bat |
| emcc | Bulundu | C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\tools\emsdk\upstream\emscripten\emcc.bat |
| make | Bulundu | C:\Users\serda\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe |
| npm | Bulundu | C:\Program Files\nodejs\npm.cmd |

## Build Komutu

```powershell
cd "C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\Satranc Motoru\fairy-stockfish.wasm-nnue\src\emscripten"
make -C .. emscripten_build ARCH=wasm threads=no
```

## Build Ciktisi

- Exit code: 0

```text
make: Entering directory 'C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk T�rk Satranc�/Satranc Motoru/fairy-stockfish.wasm-nnue/src'
Default net: nn-3475407dc199.nnue
nn-3475407dc199.nnue available.
Network validated

Config:
debug: 'no'
sanitize: 'none'
optimize: 'yes'
arch: 'wasm'
bits: '64'
kernel: 'MSYS_NT-10.0-26200'
os: 'Windows_NT'
prefetch: 'no'
popcnt: 'no'
pext: 'no'
sse: 'no'
mmx: 'no'
sse2: 'no'
ssse3: 'no'
sse41: 'no'
avx2: 'no'
avx512: 'no'
vnni256: 'no'
vnni512: 'no'
neon: 'no'

Fairy-Stockfish specific:
largeboards: 'yes'
all: 'yes'
precomputedmagics: 'yes'
nnue: 'yes'

Flags:
CXX: em++
CXXFLAGS: -Wall -Wcast-qual -fno-exceptions -std=c++17 -DUSE_POPCNT -DNO_THREADS -DUSE_WASM_SIMD -msimd128 -DEM_COMMIT= -DEM_UPSTREAM= -DEM_EMSCRIPTEN=2.0.26 -Wno-profile-instr-out-of-date -DLARGEBOARDS -DPRECOMPUTED_MAGICS -DALLVARS -DNDEBUG -O3 -fno-strict-aliasing -fexperimental-new-pass-manager -DIS_64BIT -DNO_PREFETCH -flto -fuse-ld=lld
LDFLAGS: --pre-js emscripten/preamble.js -s MODULARIZE=1 -s EXPORT_NAME=Stockfish -s ENVIRONMENT=web,worker,node -s STRICT=1 -s ASYNCIFY=1 -s 'ASYNCIFY_IMPORTS=[emscripten_utils_getline_impl]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=134217728 -s MAXIMUM_MEMORY=2147483648 -s FILESYSTEM=1 -s EXTRA_EXPORTED_RUNTIME_METHODS=[FS] -s ALLOW_UNIMPLEMENTED_SYSCALLS -s USE_PTHREADS=0 --closure 1 -s ASSERTIONS=0 -Wall -Wcast-qual -fno-exceptions -std=c++17 -DUSE_POPCNT -DNO_THREADS -DUSE_WASM_SIMD -msimd128 -DEM_COMMIT= -DEM_UPSTREAM= -DEM_EMSCRIPTEN=2.0.26 -Wno-profile-instr-out-of-date -DLARGEBOARDS -DPRECOMPUTED_MAGICS -DALLVARS -DNDEBUG -O3 -fno-strict-aliasing -fexperimental-new-pass-manager -DIS_64BIT -DNO_PREFETCH -flto -fuse-ld=lld

Testing config sanity. If this fails, try 'make help' ...

C:/Users/serda/AppData/Local/Microsoft/WinGet/Packages/ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe/bin/make.exe ARCH=wasm COMP=em++ all
make[1]: Entering directory 'C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk T�rk Satranc�/Satranc Motoru/fairy-stockfish.wasm-nnue/src'
Default net: nn-3475407dc199.nnue
nn-3475407dc199.nnue available.
Network validated
-- Generate embedded_nnue.cpp --
node emscripten/misc/embedded_nnue.js < nn-3475407dc199.nnue > emscripten/embedded_nnue.cpp
em++ -Wall -Wcast-qual -fno-exceptions -std=c++17 -DUSE_POPCNT -DNO_THREADS -DUSE_WASM_SIMD -msimd128 -DEM_COMMIT= -DEM_UPSTREAM= -DEM_EMSCRIPTEN=2.0.26 -Wno-profile-instr-out-of-date -DLARGEBOARDS -DPRECOMPUTED_MAGICS -DALLVARS -DNDEBUG -O3 -fno-strict-aliasing -fexperimental-new-pass-manager -DIS_64BIT -DNO_PREFETCH -flto -fuse-ld=lld   -c -o embedded_nnue.o emscripten/embedded_nnue.cpp
em++ -o stockfish.js benchmark.o bitbase.o bitboard.o endgame.o evaluate.o main.o material.o misc.o movegen.o movepick.o pawns.o position.o psqt.o search.o thread.o timeman.o tt.o uci.o ucioption.o tune.o tbprobe.o evaluate_nnue.o half_ka_v2.o partner.o parser.o piece.o variant.o xboard.o half_ka_v2_variants.o wasm_simd.o embedded_nnue.o --pre-js emscripten/preamble.js -s MODULARIZE=1 -s EXPORT_NAME="Stockfish" -s ENVIRONMENT=web,worker,node -s STRICT=1 -s ASYNCIFY=1 -s 'ASYNCIFY_IMPORTS=["emscripten_utils_getline_impl"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=$((1 << 27)) -s MAXIMUM_MEMORY=$((1 << 31)) -s FILESYSTEM=1 -s EXTRA_EXPORTED_RUNTIME_METHODS=["FS"] -s ALLOW_UNIMPLEMENTED_SYSCALLS -s USE_PTHREADS=0 --closure 1 -s ASSERTIONS=0 -Wall -Wcast-qual -fno-exceptions -std=c++17 -DUSE_POPCNT -DNO_THREADS -DUSE_WASM_SIMD -msimd128 -DEM_COMMIT= -DEM_UPSTREAM= -DEM_EMSCRIPTEN=2.0.26 -Wno-profile-instr-out-of-date -DLARGEBOARDS -DPRECOMPUTED_MAGICS -DALLVARS -DNDEBUG -O3 -fno-strict-aliasing -fexperimental-new-pass-manager -DIS_64BIT -DNO_PREFETCH -flto -fuse-ld=lld
make[1]: Leaving directory 'C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk T�rk Satranc�/Satranc Motoru/fairy-stockfish.wasm-nnue/src'
cp -f ../AUTHORS ../Copying.txt stockfish.js stockfish.wasm emscripten/public
make: Leaving directory 'C:/Users/serda/OneDrive/Desktop/Uygulamalar/Timurlenk T�rk Satranc�/Satranc Motoru/fairy-stockfish.wasm-nnue/src'
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
warning: honoring legacy environment variable `NODE`.  Please switch to using `EM_NODE_JS` instead`
clang++: warning: argument unused during compilation: '-fuse-ld=lld' [-Wunused-command-line-argument]
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
warning: honoring legacy environment variable `NODE`.  Please switch to using `EM_NODE_JS` instead`
em++: warning: EXTRA_EXPORTED_RUNTIME_METHODS is deprecated, please use EXPORTED_RUNTIME_METHODS instead [-Wdeprecated]
```

## Kopyalanan Dosyalar

| Dosya | Durum |
|---|---|
| stockfish.js | Kopyalandi |
| stockfish.wasm | Kopyalandi |
| uci.js | Kopyalandi |
| package.json | Kopyalandi |
| AUTHORS | Kopyalandi |
| Copying.txt | Kopyalandi |

## Artifact Kontrolu

- Hedef klasor: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\fairy-poc\vendor\fairy-stockfish-singlethread.wasm`
- stockfish.js: 47313 byte
- stockfish.wasm: 48263421 byte
- stockfish.worker.js: yok
- SharedArrayBuffer izi: yok
- PThread/Atomics izi: yok

## Sonraki Adim

Tek-thread artifact hazir. Siradaki adim Android WebView smoke testini bu artifact ile tekrar kosmak.
