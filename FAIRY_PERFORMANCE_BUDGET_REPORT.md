# Fairy Performans ve Sure Butcesi Raporu

Baslangic: 2026-05-18T19:35:15.156Z
Bitis: 2026-05-18T19:35:15.766Z

## Kapsam

- Bu rapor Faz 11 icin tek-thread Fairy-Stockfish POC performansini olcer.
- Mevcut JS Timur AI ana motor olarak kalir; Fairy henuz production AI degildir.
- Olcum masaustu Node ortaminda yapilir, mobil WebView icin guvenli tarafta kalmak adina 3x yavaslama katsayisi kullanilir.

## Artifact

- Secilen artifact: `singlethread`
- Klasor: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\fairy-poc\vendor\fairy-stockfish-singlethread.wasm`
- Tekrar sayisi: 2
- Depth timeout: 300000ms

## Sonuclar

| Depth | Durum | Ortalama | P95 | Mobil tahmini ort. | Mobil tahmini P95 | Engine time | Seldepth | Bestmove | Nodes | Score |
|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| 1 | OK | 15ms | 23ms | 45ms | 69ms | 2ms | 1 | bestmove d3d4 | 0 | cp 115 |
| 2 | OK | 6ms | 6ms | 17ms | 18ms | 1ms | 2 | bestmove d3d4 ponder a8a7 | 0 | cp 100 |
| 3 | OK | 6ms | 6ms | 17ms | 18ms | 2ms | 3 | bestmove d3d4 ponder d8d7 | 0 | cp 146 |
| 4 | OK | 8ms | 8ms | 24ms | 24ms | 4ms | 4 | bestmove d3d4 ponder k8k7 | 0 | cp 92 |
| 5 | OK | 9ms | 10ms | 27ms | 30ms | 5ms | 5 | bestmove d3d4 ponder k8k7 | 0 | cp 98 |
| 6 | OK | 9ms | 9ms | 26ms | 27ms | 5ms | 6 | bestmove d3d4 ponder k8k7 | 0 | cp 161 |
| 7 | OK | 18ms | 18ms | 54ms | 54ms | 15ms | 7 | bestmove d3d4 ponder k8k7 | 0 | cp 115 |
| 8 | OK | 26ms | 29ms | 77ms | 87ms | 19ms | 9 | bestmove d3d4 ponder k8k7 | 0 | cp 138 |

## Onerilen Sure Butceleri

| Mod | Guvenli hedef | Onerilen depth | Not |
|---|---:|---:|---|
| 5 dk | <= 500ms mobil P95 | 8 | Hizli cevap ve pil/isi guvenligi oncelikli. |
| 15 dk | <= 1200ms mobil P95 | 8 | Dengeli kalite ve akicilik. |
| 30 dk | <= 2500ms mobil P95 | 8 | Daha derin arama ama WebView donmasin. |
| Suresiz | <= 5000ms mobil P95 | 8 | Kalite odakli, yine de sinirsiz bekleme yok. |

## Yorum

- Depth kararlarini dogrudan production ayari kabul etme; Android WebView icinde ayrica dogrulanmali.
- Bu POC build nodes alanini 0 raporluyor; sure butcesinde dis elapsed/P95 ve engine time birlikte dikkate alinmali.
- Tek-thread motor ana thread uzerinde calistigi icin yuksek depth UI donmasi yaratabilir.
- Faz 12 veya sonraki debug entegrasyonda Fairy hamlesi her zaman JS Timur legal kapisindan gecmelidir.

