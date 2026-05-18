# Timur Satranci Oyun Sonu Tas Rolleri

Bu dosya AI motorunun oyun sonu planlarini genisletirken hangi tasin ne is yaptigini takip etmek icin tutulur. Amac her tasa "mat atan tas" muamelesi yapmak degil; taslari dogru role koyup testlerle guvenli genisletmektir.

## Temel Ilke

Timur satrancinda oyun sonu genellikle tek bir tasla degil, rol paylasimiyla kazanilir:

- Sah / kraliyet tasi rakip sahi yaklastirir ve hisar kacisini keser.
- Kale ana bitiricidir; sira ve sutun keserek rakip sahi kenara surer.
- Yardimci taslar rakip sahin kacis karelerini kapatir.
- Piyonlar guvenli terfi planidir; terfi ettikten sonra yeni tas rolune gecer.

## Rol Haritasi

| Tas | Rol | Motor Yorumu |
| --- | --- | --- |
| Sah / Prens / Yedek Sah | Kraliyet baskisi | Rakip sahi kenarda karsilar, hisar riskini keser. |
| Kale | Ana bitirici | Mat aginin ana tasidir; tek kale + sah bitirebilir. |
| Vezir | Dogrudan ag yardimcisi | Duz bir kare kapatir; kale agini tamamlar. |
| Deniz Canavari | Dogrudan ag yardimcisi | Vezir gibi kullanilir; terfi sonrasi ag kurar. |
| General | Dogrudan ag yardimcisi | Capraz bir kare kapatir; vezirin eksik karelerini tamamlar. |
| At | Sicrayici kapatici | Cift tehdit ve kacis bozma; tek basina bitirici degil. |
| Deve | Sicrayici kapatici | Uzak L tehdidiyle kacis yollarini keser. |
| Dabbaba | Sicrayici kapatici | Duz iki kare kapatir; kenar sikistirmaya destek verir. |
| Fil | Sicrayici kapatici | Capraz iki kare kapatir; kose agina yardim eder. |
| Aslan | Sicrayici kapatici | Uc kare duz tehditle uzak alan kontrolu verir. |
| Boga | Sicrayici kapatici | Genis sicrama tehdidiyle savunma/kacis bozucu rol alir. |
| Revealer | Sicrayici kapatici | Uzak capraz sicrama tehdidiyle kose agini destekler. |
| Zurafa | Hat kontrolu | Uzun hat/kacis kontrolu kurar. |
| Gozcu | Hat kontrolu | Uzun capraz kontrolle kacis yollarini keser. |
| Piyon | Terfi kosucusu | Terfiye gider; terfi sonrasi yeni role donusur. |

## Uygulama Sirasi

1. Test pozisyonlari her rol ailesini ayri olcmeli.
2. Kale + Sah temel bitirici plan olarak korunmali.
3. Vezir / Deniz Canavari / General dogrudan yardimci ag olarak aktif kullanilmali.
4. At / Deve / Dabbaba / Fil gibi sicrayicilar "bitirici" degil, kacis bozucu olarak puanlanmali.
5. Zurafa / Gozcu gibi hat kontrol taslari, rakip sahin uzun kacis rotalarini kesince odullendirilmeli.
6. Piyon oyun sonu, sadece ilerleme degil terfi sonrasi mat planina baglanmali.

## Guncel Test Hedefi

Endgame suite sadece "kazandi mi?" diye bakmaz; hangi rol ailesinin guvenilir oldugunu da gostermelidir. Yeni tas ailesi eklenirken taktik suite de kosulmali, cunku oyun sonu bonusu mat/taktik pozisyonlarini bozmamalidir.
