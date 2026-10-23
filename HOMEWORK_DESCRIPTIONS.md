# Ödev açıklamaları — kurulum ve kontrol

1. Supabase SQL Editor'de `sql/27_homework_descriptions.sql` dosyasını bir kez çalıştırın.
   Dosya mevcut `cl_get_teacher_view`, `cl_get_parent_view`, `cl_get_session_row`,
   `cl_get_settings_blob` fonksiyonlarını ve `classlog_parent_links` tablosunu kullanır.
   Mevcut ödev/ders içi kayıtlarını ve fonksiyonlarını değiştirmez.
2. Güncellenen `admin.html`, `parent.html`, `admin.js`, `parent.js`, `data.js`,
   `style.css`, `sw.js` dosyalarını birlikte yayımlayın.
3. Öğretmen panelinde sınıf, ders ve tarihi seçin. Tarihin üstündeki alana
   açıklamayı yazıp **Kaydet** düğmesine basın. Boş metni kaydetmek açıklamayı kaldırır.
4. Aynı sınıfın veli bağlantısını başka bir tarayıcıda açın. Tarihin yanındaki
   **?** düğmesinin üzerine gelin veya dokunun. Kaydedilen açıklama canlı yenileme
   bildirimiyle yüklenir; bildirim ulaşmazsa mevcut 3 saniyelik kontrol devreye girer.

## Canlı kabul kontrolü

- Açıklamayı ekleyin, değiştirin, boş kaydedip kaldırın; veli ekranında takip edin.
- Ödev işaretlerini ve ders içi puanlarını değiştirin; açıklamanın korunduğunu kontrol edin.
- Diğer sınıf/ders/tarihe geçin; açıklamanın doğru bağlamda kaldığını kontrol edin.
- İki öğretmen sekmesinde aynı açıklamayı düzenleyin. Eski sürümü kaydeden sekmede
  çakışma mesajı görünmeli; önceki kayıt sessizce ezilmemeli.
- Arşivde ve tahta oturumunda açıklama değiştirilememeli.
- Uzun metin, satır sonu, telefon ekranı, klavye odağı ve Escape ile kapatmayı kontrol edin.

SQL uygulanmamışsa açıklama alanı servis/kurulum mesajı gösterir. Ödev ve ders içi
işaretlerinin mevcut yükleme ve kaydetme yolları çalışmaya devam eder.
