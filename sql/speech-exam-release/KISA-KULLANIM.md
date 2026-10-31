# Kısa kullanım ve yapılacaklar

**Durum:** Görünüm ve yerel testler tamam. SQL paketi hazır. Canlı kullanım henüz açılmadı; deploy ve canlı SQL işlemi yapılmadı.

## Şimdi ne yapmalısınız?

1. Şimdilik deploy etmeyin; etkinleştirme SQL'ini canlıda çalıştırmayın.
2. Mevcut Supabase projenizin SQL Editor bölümünde yalnızca `00_preflight.READONLY.sql` dosyasını çalıştırın. Bu dosya veri değiştirmez.
3. Tüm sonuç kümelerini paylaşın. Öğrenci bilgisi, şifre veya erişim anahtarı paylaşmayın.
4. İncelemeden sonra ayrı, örnek verili test projesinde `01_storage.sql` → `02_rpc.sql` → `03_enable.sql` uygulanır; `05_status.READONLY.sql` ile ayarlar kontrol edilir. Önceden sınav tabloları kurulduysa `01` yeniden çalıştırılmaz.
5. Gerçek iki cihazda bağlantı/yetki testleri geçince istemci yayın anahtarları ve önbellek sürümleri hazırlanır; ardından canlı yayın kararı verilir. Sadece SQL çalıştırmak veya mevcut dosyaları deploy etmek özelliği açmaz.

Eski DRAFT dosyaları ile bu paketi birlikte çalıştırmayın. `04_disable_keep_data.sql` normal kurulum adımı değildir; gerektiğinde özelliği kapatır, sınavları ve puanları korur.

## Açıldıktan sonra nasıl kullanılır?

- Admin panelinde sınavı başlatın veya **Kayıtlı sınavlar** listesinden devam eden sınavı açın.
- Öğrenciyi seçin, 10 ölçüte 1–10 puan verin. Boş bırakılan ölçüt sıfır sayılmaz. **Kaydedildi** yazısını bekleyin.
- On ölçüt kaydedilince öğrenci adı tahtadan kalkar. Seçili karta tekrar tıklayarak veya **Seçimi kaldır** ile de kaldırabilirsiniz. Puanlar silinmez.
- **Tahta erişimi oluştur** ile alınan anahtarı, tahtadaki kronometrenin bağlantı alanına girin. Bağlantı alanı `speechBoard=1` parametresiyle görünür. Yandaki **Değerlendirme** sekmesi kartı açar/kapatır.
- Tahta anahtarı en fazla 15 dakika geçerlidir; süresi dolarsa yeni anahtar gerekir. Bu durum sınavı bitirmez.
- Sayfayı kapatmak veya internetin kesilmesi sınavı bitirmez. Kaydedilmiş puanlarla sonraki gün devam edebilirsiniz. İnternetsizken henüz kaydedilmemiş değişiklikler için sayfayı kapatmadan bağlantıyı ve kayıt onayını bekleyin.
- Yalnızca **Sınavı Bitir** sınavı kapatır. Geçmiş sınavlar **Excel İndir** ile alınabilir.

## Kontrol sonucu

Yerel SQL, kayıt koruma, yetki reddi ve kapatma testleri geçti. Masaüstü, mobil dikey/yatay ve tahta dahil altı ekran boyutu test edildi. Canlı Supabase ve gerçek iki cihaz testi henüz yapılmadı.

Ayrıntılı teknik sıra ve koşullar: `README.md`.
