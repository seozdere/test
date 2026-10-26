# Canlı Konuşma Sınavı — geliştirme teslimi

Tarih: 25 Ekim 2026. Canlı Supabase'e bağlanılmadı, SQL uygulanmadı, gerçek öğrenci verileri kullanılmadı. Commit/push/PR/deploy yapılmadı.

## Durum

Arayüz, puanlama modeli, kayıt kuyruğu, gerçek XLSX üreticisi, mevcut kronometreye eklenebilen salt okunur tahta görünümü ve kalıcı depolama/RPC taslakları hazırdır. **Normal uygulamada özellik kapalıdır.** Admin'deki buton devre dışıdır; normal veli sayfasında ek veri, sorgu, abonelik veya öğrenci listesi okunmaz. Yalnızca 1 KB'dan küçük giriş dosyası yüklenir.

Önizleme: http://localhost:8003/tests/speech-exam-demo.html . Yeni örnek sınavlar 35 uydurma öğrenci kullanır; daha önce oluşturulmuş örnek sınavlar korunur. Supabase istemcisi yüklenmez. Örnek kayıtları notik-synthetic-speech-exams-v1 anahtarında bu tarayıcıya yazar. Bu kayıtlar gerçek sınav kaydı değildir. Gerçek modülün veri kaynağı Supabase RPC'leridir; sonuçları localStorage'a yazmaz.

Önizlemede “Sınavı Başlat”, öğrenci seçimi, puanlama, bitirme, geçmiş sınav ve Excel çalışır. “Örnek tahta görünümü” ikinci sekmede mevcut kronometrenin arka planı, HTML'i ve zamanlayıcı fonksiyonlarıyla açılır. parent.js başlangıç kodu, Supabase ve konu/öğrenci sorguları çalıştırılmaz; konu seçimi düğmeleri örnek ekranda kapalıdır. Sağdaki oklu “Değerlendirme” sekmesi varsayılan kapalıdır; açıldığında ölçüt kartı sağdan kayar. Yeşil pulse yalnızca bağlantı doğrulanmışken görünür; kesinti, bitirme veya erişim sona ermesinde durur.

## Uygulananlar

- Rubriğin verilen 10 tam metni ve sırası korundu. Her puan null veya 1–10; boş kriter sıfıra çevrilmez. Eksik formda geçici toplam, tamamlanınca /100 gösterilir.
- Sınavın sınıf/ders/dönem/tarihi ve rubrik kopyası sabitlenir. Öğrenciler sınav içi UUID ve isim kopyasıyla saklanır. Sonradan isim değişmesi geçmiş sonucu başka öğrenciye bağlamaz.
- Bir sınıfta yalnızca bir aktif sınav olabilir. Sınav başına bir oturum ve öğrenci başına bir sonuç satırı tutulur. Bitirme sonuçları silmez.
- 250 ms debounce, tek yazma kuyruğu, sunucu revizyonu ve tekrar denemede aynı işlem kimliği kullanılır. Kayıt sürerken yapılan yeni seçimler kuyruğa eklenir. Aynı seçili puana tekrar basmak kayıt oluşturmaz.
- Öğrenci/geçmiş geçişi, Excel, bitirme ve pencere kapatma önce bekleyen kayıtları tamamlar. Hata/çakışmada taslak korunur; diğer cihazın kaydı sessizce ezilmez. “Sunucudaki kaydı aç” yerel taslağı bırakmadan önce onay ister.
- Bağlantı geri geldiğinde kayıtlar yeniden denenir ve güncel sınav okunur. Otomatik polling yoktur. Kayıt beklerken tarayıcı yenilemesine karşı standart çıkış uyarısı vardır; çevrimdışı, kaydedilmemiş taslaklar kalıcı sınav sonucu sayılmaz.
- XLSX modülü yalnızca “Excel İndir” işleminde yüklenir. Harici kütüphane/CDN gerektirmeyen küçük OOXML/ZIP üreticisi kullanılır. 18 sütun: öğrenci bağlamı, 10 tam kriter adı, kesin toplam, geçici toplam ve tamamlanma. Eksikler boş hücredir; formül benzeri isimler açıkça metin hücresidir.
- Plus Jakarta Sans ailesi, dokunmatik puan alanları, mobilde 5+5 puan dizilimi. Mobil öğrenci listesi kompakt seçim alanı ve önceki/sonraki düğmeleridir; 35 öğrenci ölçütleri aşağı itmez. Tahta ölçütleri kronometre içinde açılır yan karttır; mobilde bağımsız kaydırılır. Uzun ölçütler sarılır; yatay taşma oluşmaz.

## Dosyalar

Mevcut dosyalarda sınırlı değişiklik:

- admin.html: mevcut konuşma konuları bölümüne devre dışı sınav giriş butonu ve küçük giriş script'i.
- parent.html: aynı etkisiz giriş script'i; mevcut kronometre HTML/fonksiyonları değişmedi.
- sw.js: giriş script'i önbellek listesi ve sürüm artışı (v571). Supabase isteklerini önbelleğe almayan mevcut kural korundu. Ağır modüller ön yüklenmez.

Yeni uygulama dosyaları:

- speech-exam-entry.js: kapalı yayın anahtarı.
- speech-exam-host.mjs: admin diyaloğu ve gerçek kronometre bağlantısı.
- speech-exam-core.mjs: rubrik, puanlar, dışa aktarma satırları, yazma ve okuma kuyruğu.
- speech-exam-api.mjs: kapalı istemci kapısı ve RPC/Broadcast bildirim adaptörü.
- speech-exam-ui.mjs: yönetim, öğrenci listesi, değerlendirme ve salt okunur tahta görünümü.
- speech-exam.css: yalnızca bu modüle ait responsive stiller.
- speech-exam-xlsx.mjs: gerektiğinde yüklenen gerçek XLSX üreticisi.

SQL dosyaları:

1. sql/31_speech_exam_storage.DRAFT.sql: rubrik, oturum, sonuç, tahta erişim tabloları; null/puan kısıtları, tek aktif sınav indeksi, RLS ve doğrudan erişim iptali.
2. sql/32_speech_exam_rpc.DRAFT.sql: sunucu yetkilendirmesi, oluşturma/listeleme/okuma/seçim/kayıt/bitirme, süreli tahta erişimi, kişisel veri içermeyen değişiklik bildirimi. **Sunucu kapısı false; istemci rollerine EXECUTE verilmez.**
3. sql/33_speech_exam_preflight.READONLY.sql: isteğe bağlı manuel şema/fonksiyon karşılaştırması. Öğrenci, parola veya oturum belirteci satırı okumaz; herhangi bir yazma işlemi içermez.

Yeni test/kanıt dosyaları:

- tests/speech-exam.test.mjs, tests/speech-exam-db.test.cjs, tests/speech-exam-fixture.sql
- tests/speech-exam-browser.test.cjs
- tests/speech-exam-demo.html, tests/speech-exam-demo-store.mjs
- tests/speech-exam-timer-preview.mjs: yalnızca örnek ekranda mevcut kronometreyi yeniden kullanır.
- tests/speech-exam-sample.xlsx, tests/artifacts/speech-browser-sample.xlsx
- tests/artifacts/speech-admin-portrait.png, speech-board-{desktop,portrait,landscape,smartboard}.png

## Güvenlik ve mevcut kiosk riski

Masaüstündeki 1.txt–4.txt ve sql klasörü incelendi. Temel tanımlar “Yeni Metin Belgesi - Kopya (12).txt” içinde bulundu. Kaynak dosyaların varlığı, aynı sürümün canlı Supabase'de kurulu olduğunu kanıtlamaz. Eski bootstrap/yama dosyaları yeniden çalıştırılmadı ve yeniden çalıştırılmaları önerilmiyor.

Mevcut admin.js içindeki buildBoardUnlockPayload / sendBoardCommand akışı, kiosk oturum belirtecini sabit Broadcast kanalında gönderiyor; tahta kodu alıcı istemcide karşılaştırılıyor. Bu **mevcut risk değiştirilmedi**. Bazı eski cl_issue_kiosk_session sürümlerinde yalnızca öğretmen kaydı doğrulanıyor; çağıranın tam öğretmen oturumu olması ayrıca aranmadığı için bu da bağımsız güvenlik incelemesine alınmalıdır.

Yeni sınav sistemi bu akışı kullanmaz. Yazma ve erişim anahtarı üretme RPC'leri tam, süresi geçmemiş öğretmen oturumunu ve sınıf/ders yetkisini doğrular. Normal veli token'ı, kiosk token'ı veya URL parametresi yetki vermez.

Tahta için öğretmen tarafından üretilen 256 bit, en fazla 15 dakikalık ayrı anahtar kullanılır. Veritabanında yalnızca SHA-256 özeti tutulur. Anahtar yetkili tahtaya elle aktarılır; Broadcast veya URL üzerinden taşınmaz. Tahta anahtarı yalnızca aktif öğrenciyi okumaya yarar. İptal, süre dolması, öğretmen oturumunun kapanması/yetkisinin kaldırılması veya sınav bitmesi puan erişimini durdurur. Tahtadaki bağlantı kesilince puan paneli temizlenir.

Yeni speech_change_<rastgele konu> kanalı yalnızca revision bildirir. Konu adı bir yetki sınırı değildir; puanlar her seferinde yetkili RPC'den alınır. Bildirimlerin kaçması yeniden bağlantı/görünürlükte güncel okuma ile toparlanır. Puan tabloları Realtime publication'a eklenmez. [Resmî Broadcast açıklaması](https://supabase.com/docs/guides/realtime/broadcast).

## Test sonuçları

- Saf model/kuyruk testleri: GEÇTİ. Boş puan, toplam, debounce, kayıt sırasında yeni seçim, hata/tekrar, idempotency, revizyon çakışması, geçmiş ve birleştirilen okumalar.
- Yerel PostgreSQL 18.6 / PGlite 0.5.11: GEÇTİ. İki migration geçici ve tamamen örnek verili DB'de çalıştırıldı. Kapalı yayın kapısı, tablo/helper erişim reddi, veli/kiosk/yetkisiz sınıf/sona ermiş oturum reddi, geçersiz puanlar, tekrar kayıt, geçmiş, salt okunur tahta, iptal/süre dolması ve bildirimin yalnızca revision içermesi doğrulandı. Eski örnek öğrenci/ödev verileri aynı kaldı.
- Tarayıcı: GEÇTİ. Ayrı headless Chrome profili; 320×568, 390×844, 667×375, 844×390, 1440×900, 1920×1080. Yatay taşma, 42–44 px veya daha yüksek puan butonları, klavye, öğrenci geçişi, kayıt hatası/tekrar, yenileme, iki sekme, bitirme/geçmiş, Excel ve gerçek kronometre kontrolleri.
- XLSX: GEÇTİ. openpyxl ile açıldı; 18 sütun, tam başlıklar, boş kriterler ve formül benzeri adın metin olarak kalması doğrulandı.
- Mevcut parent-cache, parent-performance ve word-hunter-touch testleri: GEÇTİ.
- Mevcut mark-queue testinin doğrudan çalışması eski test VM'inde crypto, puan yardımcıları ve sessionStorage eksikliğinden başarısız. Uygulama/test dosyasına dokunmadan, bu tarayıcı ortamı eksikleri geçici çalıştırıcıda sağlanınca test GEÇTİ.
- Testler gerçek Supabase'e hiç istek göndermedi. Gerçek Supabase Realtime dağıtımı, gerçek iki cihaz ve fiziksel akıllı tahta henüz test edilmedi. Testlerde dış font trafiği engellendi; CSS font ailesi mevcut Plus Jakarta Sans ile aynı, görüntü kanıtlarında tarayıcı yedek fontu kullanılabilir.
- PGlite yalnızca %TEMP%/notik-exam-test-runtime altında test aracı olarak kuruldu; uygulamaya npm bağımlılığı veya paket dosyası eklenmedi.

## Manuel kalan adımlar

1. Önizlemeden yönetim/tahta yerleşimini ve örnek Excel'i inceleyin. Gerçek öğrenci verisi girmeyin.
2. Kurulu Supabase şemasını kaynak SQL ile karşılaştırın. 33_...READONLY.sql bunu incelemek içindir; bu geliştirme sırasında canlıda çalıştırılmadı.
3. SQL taslaklarını önce **ayrı, örnek verili Supabase test projesinde** değerlendirin. pgcrypto public veya extensions şemasında bulunmalı; realtime.send(jsonb,text,text,boolean) ve kanal ayarları doğrulanmalı. anon/authenticated rollerinin public şemasında CREATE izni olmamalıdır.
4. Yetkisiz RPC, gerçek Realtime yeniden bağlanması, iptal, öğretmen çıkışı ve iki cihaz testleri geçmeden canlı erişimi açmayın. Yerel testler gerçek dağıtım doğrulamasının yerine geçmez.
5. İnceleme tamamlandıktan sonra migration uygulaması ve yayın ayrıca ele alınmalı. Üç kapalı anahtar (speech-exam-entry.js, speech-exam-api.mjs, SQL cl_speech_exam_enabled) ile RPC EXECUTE yetkisi bilinçli olarak ayrı tutulmuştur. Yalnızca arayüz anahtarını değiştirmek erişim açmaz.
6. Gerçek kullanımda öğretmen aktif sınavdan “Tahta erişimi oluştur” ile anahtarı alır. Tahtanın parent sayfasında speechBoard=1 parametresi yalnızca bağlantı alanını gösterir; kronometre açılıp anahtar girilir. Parametre veya normal veli bağlantısı puan okuma yetkisi sağlamaz.

Bu teslimde canlı kurulum, aktivasyon ve yayın yapılmadı.

## Son SQL teslim paketi — 26 Ekim 2026

Güncel teslim `sql/speech-exam-release/` klasöründedir. Eski DRAFT dosyaları yerine bu paket kullanılmalıdır; iki set birlikte çalıştırılmaz. Kısa kullanıcı raporu `KISA-KULLANIM.md`, ayrıntılı kurulum sırası `README.md` içindedir.

Paket: salt okunur ön kontrol, ilk kurulum tabloları, güncellenebilir RPC'ler, ayrı etkinleştirme, verileri koruyarak kapatma ve salt okunur durum kontrolü. Dosyalar doğrudan yerel PostgreSQL testinde çalıştırıldı; pgcrypto hem public hem extensions şemasında doğrulandı. Etkinleştirmenin güvensiz şema CREATE yetkisinde durması ve kapatmanın puanları/aktif sınav durumunu koruması da test edildi.

Canlıya açma kararı henüz verilmedi: kurulu Supabase auth fonksiyonları ve gerçek iki cihaz Realtime testi bekleniyor. Kullanıcının ilk adımı sadece `00_preflight.READONLY.sql` çıktısını paylaşmaktır. İstemci yayın anahtarları false olarak korunmuştur. SQL dosyalarının son teslim paketi olarak verilmesi, canlı etkinleştirme onayı değildir.

## Son düzenleme: devam eden sınav ve değerlendirme kartı

- Sınavda otomatik bitirme veya gün sonu süresi yoktur. Sadece açıkça `Sınavı Bitir` işlemi durumu değiştirir. Kayıtlı sınav listesi tarihe göre filtrelenmez; yeniden girişte devam eden sınav açılır. Bağlantı/oturum/tahta anahtarı süresinin dolması sınavı bitirmez. Kaydedilmiş puanlar korunur; bağlantısızken henüz kaydedilmemiş puanlar sayfa açık kaldığı sürece yeniden denenebilir, sayfa kapatılırken uyarı verilir.
- Masaüstünde seçili öğrenci kartına tekrar tıklama, `Seçimi kaldır` düğmesi veya mobil seçicide boş seçenek seçimi temizler. SQL `select` işlemi artık null öğrenci kabul eder; başka öğrencilerin erişim kontrolleri korunur.
- On ölçütün tamamı başarılı kaydedilince sunucu aynı işlemde aktif öğrenciyi temizler. Puanlar ve sınav korunur, öğrenci tekrar seçilip düzenlenebilir. Tahta RPC'si bu durumda hiçbir öğrenci adı veya puanı döndürmez. Hatalı kayıt seçimi kaldırmaz.
- Değerlendirme başlığı kısaltıldı. Kart kronometrenin kapatma düğmesinin altında kalır; kendi kapatma düğmesi ve açma sekmesi glossy görünümdedir. Toplam ayrı, ortalanmış ve büyütülmüş glossy satırdadır. Değişen puanlar kısa pop/yeşil parlama ile belirtilir; hareket azaltma tercihi desteklenir.
- Değişen uygulama dosyaları: `speech-exam-ui.mjs`, `speech-exam.css`, `speech-exam-host.mjs`. SQL değişikliği yalnızca `sql/32_speech_exam_rpc.DRAFT.sql` taslağındadır. Demo/veri/test dosyaları ve önbellek sürümleri de güncellendi.
- Ek testler: sonraki gün listeden devam etme, istemci kapatıp açma, null seçim, başarılı tamamlama sonrası adın temizlenmesi, hata durumunda seçimin korunması, kayıtların kalması, yeşil animasyon sınıfları, toplam satırı ve kronometre kapatma düğmesiyle çakışmama.
- Canlı SQL çalıştırılmadı; yayın kapıları kapalıdır. Bu davranışlar yerel örnek veri ve geçici PostgreSQL üzerinde doğrulanır. Gerçek sistemde kullanıma geçmeden önce güncellenmiş RPC taslağı ayrı test projesinde doğrulanmalıdır; yalnızca önizlemeyi görmek için SQL gerekmez.
