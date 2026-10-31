# NoTik — tamamlanan canlı kurulum SQL arşivi

Arşiv tarihi: 27 Ekim 2026
İlgili uygulama sürümü: speech-live-20261027-r2

Bu klasör, kullanıcı tarafından adım adım tamamlanan canlı konuşma sınavı kurulumunun son SQL dosyalarını içerir. Dosyalar kaynak paketten değiştirilmeden kopyalanmış ve SHA-256 ile doğrulanmıştır. Bu arşiv oluşturulurken hiçbir SQL çalıştırılmamıştır. Bu bir şema/kurulum dosyası arşividir; veritabanı verilerinin yedeği değildir.

## Canlıda izlenen sıra

1. Ön kontrol: kurulum/00_CANLI_ONKONTROL.READONLY.sql ve tek-sonuc-kontrolleri/ADIM-00-SADECE-JSON.READONLY.sql. Temel tablo, sütun ve yetkiler incelendi.
2. kurulum/01_TABLOLAR.sql — sınav tabloları ve rubrik kuruldu. Başarılı.
3. kurulum/02_SINAV_RPC_KAPALI.sql — sınav RPC'leri erişim kapalı olarak kuruldu. Başarılı.
4. kurulum/03_TAHTA_CIHAZ_ONAYI_KAPALI.sql — kalıcı cihaz onayı kuruldu. Başarılı.
5. tek-sonuc-kontrolleri/ADIM-04-TEK-SONUC.READONLY.sql — beş tablo/RLS doğrulandı; sunucu ve RPC erişimleri kapalıydı.
6. kurulum/04B_ESKI_KIOSK_AKTARIMINI_KAPAT.sql — kullanılmayan eski kiosk kapatıldı. İki rolün çalıştırma izni false, aktif eski kiosk oturumu 0, sınav sunucusu false olarak doğrulandı.
7. Güncel 13 uygulama dosyası kullanıcı tarafından deploy edildi.
8. kurulum/05_ERISIMI_AC.sql — sınav erişimi açıldı. Başarılı.
9. tek-sonuc-kontrolleri/ADIM-06-TEK-SONUC.READONLY.sql — sunucu true; anon/authenticated için iki RPC erişimi true, doğrudan tablo ve iç snapshot erişimleri false; beş tablonun tamamı mevcut ve RLS true.

kurulum/04_KAPALI_KURULUM_KONTROL.READONLY.sql ve kurulum/06_ACILIS_KONTROL.READONLY.sql paketteki çok sonuçlu kontrollerdir. Tek JSON sonucu paylaşmak için yukarıdaki ADIM-04 ve ADIM-06 sürümleri kullanılmıştır. Bu alternatif dosyalar da tam arşiv için saklanmıştır.

## Acil kapatma dosyası

kurulum/90_ACIL_KAPAT_VERILERI_KORU.sql yalnızca gerektiğinde kullanılmak üzere hazırlanmıştır. Tamamlanan canlı kurulum sırasında çalıştırıldığı bildirilmemiştir. Normal kurulum sırasının bir adımı değildir.

## Kurulum sonrası doğrulanan kullanım

Kullanıcı canlıda cihaz onayı, sınav başlatma, puan verme/geri alma, cihaz iznini kaldırma ve yeniden onaylama, Excel indirme, sınav bitirme ve sayfalar kapatılıp açıldıktan sonra devam eden sınava kayıtlı puanlarla dönme kontrollerinin başarılı olduğunu bildirdi. Tamamlanan sınavı yeniden aktif etme özelliği mevcut değildir; kullanıcı şimdilik böyle kalmasını istedi.

## Arşivin kullanımı

- Mevcut canlı kuruluma 01–03 ve 04B dosyalarını tekrar çalıştırmayın. Özellikle 04B önceki kiosk fonksiyonunun tam tanımına bağlı bir defalık kontrol içerir.
- Farklı veya sıfır bir Supabase projesine otomatik toplu kurulum betiği değildir. Temel ClassLog auth, sınıf ve dönem yapıları ön koşuldur; önce ön kontrol yapılmalıdır.
- Dosyalar sırf numara sırasına göre topluca çalıştırılmamalıdır; 90 acil kapatmadır, 04/06 alternatif kontrol sürümleri vardır.
- Daha önce kullanıcıdan alınan eski temel SQL'ler ../kullanici-sql-yedegi-2026-10-27/ altında korunmaktadır. Bunlar tarihsel arşivdir, doğrulanmış tek bir çalıştırma sırası değildir.
- Üst sql klasöründeki DRAFT ve eski speech-exam-release dosyaları tarihsel sürümlerdir. Tamamlanan bu canlı kurulumun nihai dosyaları bu arşivdedir.
- SQL arşivini web sitesine deploy etmeyin; arşiv olarak saklayın.

DOSYA-LISTESI.sha256.json, 12 SQL dosyasının kaynak yollarını ve SHA-256 özetlerini içerir.
