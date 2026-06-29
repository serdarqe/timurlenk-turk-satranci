console.log(`
Oyun veri komutlari

1. Firestore'dan oyunlari cek
   npm run export:games -- --service-account "C:\\path\\service-account.json"

2. Oyunlari okunur ozetle gor
   npm run view:games

3. Tek bir oyunun tum hamlelerini gor
   npm run view:game-moves -- --game-id <oyunId>

4. Oyunlari stil + AI davranisi + hamle dogrulugu ile analiz et
   npm run report:games-analysis

5. CSV ozet cikar
   npm run export:games:csv

6. AI'nin en zorlandigi oyunlari bul
   npm run report:ai-struggles

7. Tum AI kayiplari
   npm run report:ai-losses

8. Easy AI kayiplari
   npm run report:easy-ai-losses

9. Medium AI kayiplari
   npm run report:medium-ai-losses

10. Hard AI kayiplari
    npm run report:hard-ai-losses

11. Easy pat oyunlari
    npm run report:easy-stalemate-games

12. Hisar beraberligi oyunlari
    npm run report:citadel-draw-games

13. Uzun oyunlar
   npm run report:long-endgames

14. Hard uzun AI oyunlari
    npm run report:hard-long-endgames

15. Tum raporlari toplu uret
    npm run report:all

Dosyalar varsayilan olarak exports klasorune yazilir.
`);
