# Seçili puanı tekrar tıklayarak kaldırma

1. Mevcut konuşma sınavı kurulumu üzerinde `34_speech_selection_delay.sql` henüz uygulanmadıysa önce onu uygulayın. Eski kurulum SQL'lerini yeniden çalıştırmayın.
2. `35_speech_score_toggle.sql` dosyasını Supabase SQL Editor'da çalıştırın. Bu dosya burada yalnızca hazırlanmıştır; canlıya uygulanmamıştır.
3. Sonuçta `score_toggle_installed: true`, açık sistemde `server_enabled: true`, `snapshot_public_access: false`, `direct_scores_access: false` beklenir.
4. Güncel uygulama dosyalarını birlikte yayınlayın. Yeni modül sürümü `speech-score-toggle-20261029-r1`.
5. Örnek öğrenciyle bir ölçütte 5'e basın; yeniden 5'e basınca seçim kalkmalı ve tahta puanı boş göstermelidir. 5'ten farklı bir puana basınca yeni değer kaydedilmelidir. Yenileyince boş puan korunmalıdır.

Yalnızca puan doğrulamasına JSON `null` desteği eklenir. Sıfır, metin ve aralık dışı puanlar kabul edilmez. Sınav/öğrenci yetkilendirmesi, çakışma denetimi, tekrar istek koruması, izinler ve 10 saniyelik gösterim mantığı değişmez. Tamamlanan bir öğrencinin puanı kaldırılırsa mevcut 34 mantığı gösterim süresini iptal eder. Tamamlanmış sınavlar yine değiştirilemez. Tekrar çalıştırılabilir; beklenmeyen RPC tanımında işlem iptal edilir.
