# Tamamlanan öğrenciyi 10 saniye gösterme

Bu güncelleme, tamamlanmış canlı sınav kurulumunun üzerine uygulanır. Eski 01–06 kurulum dosyalarını tekrar çalıştırmayın. Tarihsel arşiv dosyaları değiştirilmedi.

## Uygulama

1. Güncel ana klasördeki uygulama değişikliklerini normal yönteminizle yayınlayın. İstemci önbellek sürümü `speech-xlsx-template-20261028-r1` olmalı. `admin.html`, `admin.js`, `admin-layout.js`, `admin-layout.css`, `parent.html`, `sw.js`, `speech-exam-entry.js`, `speech-exam-host.mjs`, `speech-exam-api.mjs`, `speech-exam-core.mjs`, `speech-exam-device.mjs`, `speech-exam-ui.mjs`, `speech-exam.css` ve `speech-exam-xlsx.mjs` dosyalarını birlikte güncelleyin. Canlı ortamın `data.js` bağlantı ayarlarını test ortamının değerleriyle değiştirmeyin.
2. Canlı Supabase SQL Editor'da yalnızca `34_speech_selection_delay.sql` dosyasını çalıştırın. Bu çalışma sırasında SQL dosyası hazırlanmış, canlıya uygulanmamıştır.
3. Sonuçta `delay_installed: true`, `delay_seconds: 10`, `server_enabled: true`, `snapshot_public_access: false`, `direct_scores_access: false` beklenir.
4. Örnek öğrenciyle son ölçütü kaydedin. Son puan ve öğrenci 10 saniye görünmeli, ardından öğrenci seçimi bekleme yazısı gelmeli. Sınav devam etmeli; geçmiş puanlar ve Excel sonuçları korunmalıdır. Başka öğrenciye geçerseniz önceki zamanlayıcı yeni öğrenciyi kaldırmamalıdır.

Yeni istemci eski SQL ile çalışabilir ancak eski SQL son notta seçimi hâlâ hemen kaldırır. Tam davranış için hem uygulama dosyaları hem SQL güncellenmelidir.

## Teknik kapsam

- Sınav tablosuna nullable `selection_expires_at` alanı eklenir. Mevcut sınav/öğrenci/puan kayıtlarına toplu güncelleme yapılmaz.
- Son başarılı puan kaydı tüm ölçütleri tamamlıyorsa gösterim son tarihi sunucu saatine göre 10 saniye ileri alınır. Aynı isteğin tekrar gönderilmesi süreyi uzatmaz; yeni başarılı puan düzenlemesi süreyi yeniden başlatır.
- Süre dolunca snapshot seçimi boş gösterir; tahta öğrenci adı ve puanlarını artık alamaz. Alttaki seçim kimliğinin fiziksel olarak silinmesine gerek yoktur. Öğretmen geçmişi tüm kayıtları korur.
- İstemciler, sunucunun gönderdiği süreyi tek seferlik zamanlayıcıyla uygular. Süre sonunda ek RPC, polling, cron veya Realtime aboneliği oluşturulmaz. Sonradan açılan sayfa da sunucudan süresi dolmuş öğrenciyi alamaz.
- Yeni öğrenci seçme, seçimi elle kaldırma ve sınavı bitirme eski son tarihi iptal eder. Tamamlanan öğrenciyi tekrar elle seçmek geçmiş puanları incelemeye izin verir.
- Yetkilendirme/RLS/çağrı izinleri ve sunucunun açık/kapalı durumu korunur. Beklenen RPC kodu bulunamazsa transaction iptal edilir. Aynı güncellemenin tekrar çalıştırılması desteklenir.

## Doğrulama

`tests/speech-selection-delay-db.test.cjs`: yerel geçici PostgreSQL ve örnek verilerle 10 saniyelik süre, tekrar isteği, yetkili tahta görünürlüğü, kayıtların korunması, yeni öğrenciye geçiş, elle kaldırma, sınav bitirme, değişmeyen izinler ve tekrar çalıştırma doğrulandı.

`tests/speech-exam-layout.test.cjs`: yedi ekran boyutu, son notun 10 saniye görünmesi, bekleme noktalarının sırası, öğretmen/tahta seçiminin temizlenmesi ve eski zamanlayıcının yeni öğrenciyi etkilememesi doğrulandı. Gerçek Supabase bağlantısı ve gerçek öğrenci verisi kullanılmadı.
