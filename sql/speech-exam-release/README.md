# Konuşma sınavı — SQL teslim paketi

Karar: **ayrı test ortamına kurulum için hazır; canlı kullanıma açılması henüz onaylanmış değil.** Yerel PostgreSQL ve tarayıcı testleri geçti. Kurulu Supabase yetkilendirme fonksiyonları ve iki gerçek cihazda Realtime henüz doğrulanmadı. Bu paket, aşağıdaki doğrulama sırası için hazırlanmış son dosyalardır; dosya adlarında DRAFT olmaması canlı kurulum onayı anlamına gelmez.

Bu çalışma sırasında SQL'ler canlı Supabase'de çalıştırılmadı, uygulama deploy edilmedi, yayın anahtarları açılmadı.

## Dosyalar ve sıra

| Dosya | İşlem |
| --- | --- |
| `00_preflight.READONLY.sql` | İlk olarak kurulu şema ve fonksiyon gövdelerini inceler. Salt okunur; öğrenci/puan/oturum satırlarını okumaz. |
| `01_storage.sql` | Yalnızca ilk kurulum: dört yeni sınav tablosu, rubrik, indeksler ve RLS. Erişim kapalı kalır. |
| `02_rpc.sql` | Sınav RPC'lerini kurar/günceller. Sunucu kapısını kapatır, istemci EXECUTE yetkilerini kaldırır. Mevcut öğrenci/ödev/kiosk fonksiyonlarına dokunmaz. |
| `03_enable.sql` | Doğrulamadan sonra açıkça çalıştırılan etkinleştirme. Sunucu kapısını açar, yalnızca yetki kontrollü sınav RPC'sine EXECUTE verir. Ön kontroller başarısızsa transaction geri alınır. |
| `04_disable_keep_data.sql` | Gerektiğinde kapatır; tahta anahtarlarını iptal eder. Sınavları bitirmez, puanları veya tabloları silmez. Normal kurulum sırasına dahil değildir. |
| `05_status.READONLY.sql` | Kurulumdan sonra kapı, RLS ve erişim ayarlarını salt okunur kontrol eder. |

Eski `31/32 ... DRAFT` dosyalarıyla bu paketi arka arkaya çalıştırmayın. Sadece bu paketi kullanın. `01` bir kez çalıştırılır; önceden sınav tabloları oluşturulduysa yeniden çalıştırmayın. Tabloyu silerek hatayı aşmayın: mevcut sınav şeması karşılaştırıldıktan sonra uyumluysa yalnızca `02` ile RPC güncellenebilir. Her dosya hatasız tamamlanmadan sonraki adıma geçmeyin.

## Şimdi yapılacak işlem

Mevcut Supabase projesinde yalnızca `00_preflight.READONLY.sql` çalıştırılabilir. Tüm sonuç kümelerini inceleme için paylaşın; öğrenci adı, şifre veya erişim belirteci paylaşmayın. Dosya tanımları okur, kayıtları değiştirmez. Özellikle öğretmen oturumu süresi/aktiflik kontrolü, sınıf/ders yetkisi, `session_kind`, pgcrypto şeması ve Realtime fonksiyonu mevcut kurulumla karşılaştırılmalıdır. Yerel eski SQL dosyasının bulunması kurulu sürümün aynı olduğunu kanıtlamaz.

## Ayrı test projesinde

1. Mevcut temel auth/kiosk şemasının incelenmiş karşılığını yalnızca örnek hesap/sınıflarla hazırlayın. Gerçek öğrencileri veya canlı erişim anahtarlarını kopyalamayın. `tests/speech-exam-fixture.sql` yalnızca yerel PGlite test aracına aittir; Supabase SQL Editor'a yapıştırmayın.
2. `00` incelemesinden sonra `01`, ardından `02` çalıştırın. Bu aşamada erişim kapalıdır.
3. `03` çalıştırın. Public/extensions şemalarında anon/authenticated için CREATE, sınav tablolarına doğrudan erişim veya iç yardımcı fonksiyonlara EXECUTE varsa dosya durur. Bu kontroller kurulu auth gövdelerinin güvenli olduğunu otomatik kanıtlamaz.
4. `05`: `server_enabled=true`; dört tabloda `rls_enabled=true`; her iki istemci rolünde `rpc_access=true`, `internal_snapshot_access=false`, `direct_scores_access=false` beklenir. RPC'ye çağrı yetkisi verilmesi puanları herkese açmaz: her çağrı ClassLog oturumu/sınıf/ders veya süreli tahta anahtarı ile denetlenir.
5. Test uygulaması ayrı test projesine bağlanmalıdır. Uygulamanın test kopyasında `speech-exam-entry.js` içindeki `RELEASE_ENABLED` ve `speech-exam-api.mjs` içindeki `LIVE_ENABLED` true yapılmalıdır. Asıl çalışma kopyasında ikisi de halen false. Demo sayfası gerçek RPC kullanmadığından tek başına Supabase entegrasyon testi sayılmaz.
6. Yönetici/öğretmen oturumuyla örnek sınav başlatın. İkinci cihazda `parent.html?...&speechBoard=1` üzerinden kronometreyi açıp öğretmenin ürettiği geçici anahtarı girin. Bu URL parametresi tek başına erişim vermez. Anahtar mevcut sabit kiosk Broadcast kanalından aktarılmaz.
7. İki cihazda öğrenci seçimi, seçim kaldırma, puan güncellemeleri, on ölçüt sonrası adın temizlenmesi ve Excel'i doğrulayın. Sayfayı kapatıp yeniden açın; ağ bağlantısını kesip yeniden bağlayın; kaydedilen puanların ve aktif sınavın kaldığını doğrulayın. Başka öğretmenin yetkisiz sınıfı, normal veli ve kiosk oturumu sınav verilerini okuyamamalı/yazamamalı.
8. Anahtar iptali/15 dakikalık erişim süresi/öğretmen çıkışını test edin. Bunlar tahtanın erişimini kapatır, sınavı bitirmez. Sınav yalnızca `Sınavı Bitir` ile kapanır. Bitmiş sınav Excel'de kalmalıdır. Bağlantısız henüz kaydedilmemiş puanlar sayfa kapatılırsa korunacağı garanti edilen kayıtlar değildir.
9. `04` ile kapatmayı test edin; kayıtları koruduğunu `03` sonrasında öğretmen hesabıyla doğrulayın. Eski tahta anahtarları yeniden kullanılmamalıdır.

## Canlıya geçiş koşulu

Ön kontrol sonuçları karşılaştırılıp yukarıdaki gerçek Supabase/iki cihaz testleri geçtikten sonra yayın kararı verilir. SQL hazırlığı ve arayüz görüntüsünün onaylanması bu testlerin yerine geçmez. Sonraki yayın adımı istemci anahtarlarıyla birlikte HTML script sürümleri, modül import sürümleri ve Service Worker önbelleğini de güncellemelidir. Mevcut Service Worker eski önbellek girdilerini taşıdığı için yalnızca CACHE adını artırmak yeterli sayılmamalıdır. Bu pakette istemci kodu etkinleştirilmedi.

Mevcut kiosk kodunun sabit Broadcast kanalından kiosk oturum belirteci göndermesi önceki raporda belirtilen ayrı risktir; bu teslim bunu değiştirmez. Yeni sınav modülü bu kanaldan erişim belirteci göndermez.

## Yerel doğrulama

`EXAM_SQL_PACKAGE=release` ile `tests/speech-exam-db.test.cjs`, doğrudan bu klasördeki kurulum/etkinleştirme/kapatma SQL'lerini geçici PostgreSQL'de çalıştırır. Gerçek Supabase'e bağlanmaz. Kapsam: yetki reddi, veri korunumu, null puan, revizyon/tekrar kayıt, öğrenci seçimini temizleme, tahta erişimi, bitirme/geçmiş, güvenli etkinleştirme ve kayıtları silmeden kapatma.
