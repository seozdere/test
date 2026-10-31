# NoTik nöbet modülü — kurulum ve mevcut doğrulama durumu

Üretim Supabase veritabanında hiçbir işlem yapılmadı; Netlify/GitHub dağıtımı yapılmadı.
Son kapasite değişikliğinin testleri henüz çalıştırılamadığı için bu paket şu anda **canlıya geçiş için doğrulanmış sayılmaz**.

## SQL sırası

Son yerel kontroller tamamlandıktan sonra Supabase SQL Editor'da dosyaları değiştirmeden, ayrı ayrı ve şu sırayla çalıştırın:

1. `00_preflight.READONLY.sql`: mevcut temel NoTik şemasını kontrol eder; veri değiştirmez. Eksik bağımlılık varsa kuruluma devam edilmez.
2. `01_install.sql`: sekiz nöbet tablosunu, sunucu işlevlerini, RLS/yetki sınırlarını ve ana öğrenci listesi bağlantısını kurar. Nöbet erişimini kapalı bırakır. Mevcut ödev/ders içi kayıtlarını taşımaz veya silmez.
3. `02_enable.sql`: güvenlik kontrollerinden sonra nöbet uçlarını açar.
4. Güncellenmiş uygulama dosyalarını kendi GitHub/Netlify akışınızla yayımlayın.

`90_disable_keep_data.sql` yalnızca nöbet erişimini kapatmak gerektiğinde kullanılır; normal kurulum adımı değildir. Kayıtları silmez. Yeniden etkinleştirme `02_enable.sql` ile yapılır.
`01_install.sql` tekrar çalıştırıldığında erişim tekrar kapanır; ardından `02_enable.sql` gerekir.
Eski ad değiştirme ve uygulama yedekleme işlevleri korunur; yeni sarmalayıcılar nöbet kimliklerini ve nöbet tablolarını da kapsar.

## Veri modeli ve adalet

- Öğretim yılı, öğrenci kimliği, pasiflik/muafiyet, tur, tur üyeliği, takvim günü, görev ve değişiklik geçmişi için sekiz tablo kullanılır.
- Ana öğrenci listesi isim tabanlı olduğu için nöbette ayrı sabit öğrenci kimliği vardır. Ad değişikliği bu kimliği korur. Ayrılan isim tekrar geldiğinde aynı öğrenci / farklı öğrenci seçimi gerekir.
- Gerçek sayaç yalnızca ayrı ayrı onaylanan `completed` görevlerden hesaplanır. Plan ve yedek sayaç artırmaz. Geçmiş düzeltme bir sayacı elle azaltmak yerine kaynak gerçekleşme kaydını değiştirir.
- Kura önce en eski açık tur hakkını, ardından görev sayısı, yakın tarihli görev, haftanın günü ve eşleşme dengesini kullanır. Eşitlik kayıtlı tohumla çözülür. Aynı veri ve tohum aynı önizlemeyi verir.
- Geleceğe ayrılmış asıl görevler plan hesabında rezervasyon sayılır; yedek tur hakkı tüketmez. Yeni öğrenci katıldığı açık turdan başlar; geçmiş turların borcu yüklenmez.
- Yayımlanmış listeler yeniden hesaplamada korunur. Değişiklik istenirse seçilen günler yeniden önizlenir, açık onay ve gerekçe gerekir. Başka öğrencilerin gerçek geçmişi yeniden yazılmaz.
- Tatil ve yarım gün görev üretmez. Sonradan eklenen tatil ilgili görevleri iptal eder; onaylı geçmiş varsa ayrıca açık onay gerekir. Tatil kaldırılması kendiliğinden görev geri getirmez; yeniden önizleme gerekir.
- Günlük kapasite gün üzerinde saklanır. Ayarı 2'den 1 veya 3'e değiştirmek geçmiş/yayımlanmış günleri değiştirmez; yeni kapasite yalnızca yeniden planlanan günlere uygulanır.
- Her yazma tek işlem içinde yıl kilidi, beklenen sürüm ve benzersiz işlem kimliği ile korunur. Aynı isteğin ağ kesintisi sonrası tekrarı ikinci kayıt oluşturmaz.
- Veli uçları sınıf bağlantısını doğrular; yalnızca yayımlanmış takvimi ve güvenli alanları döndürür. Pasiflik gerekçeleri, seçim açıklamaları ve denetim kaydı veliye verilmez.

## Yerelde doğrulananlar

Son kapasite değişikliğinden **önce**:

- 1, 2, 3, 10, 29, 30, 31 ve 40 kişilik sınıflarda üçer tohumla 196'şar okul günü: toplam **4.704 günlük adalet kontrolü** geçti. Normal katılımda en çok/en az görev farkı 1'i aşmadı; tatiller ve yarım günler dışarıda kaldı.
- PGlite üzerinde gerçek SQL çalıştırılarak kurulumun tekrarı, öğretmen/veli yetkileri, tabloya doğrudan erişim engeli, yayımlanmış liste koruması, bireysel onay, geçmiş düzeltme/geri alma, tatil iptali, yeniden açma, eski sürüm reddi, işlem tekrarının tekilleştirilmesi, ad değişikliği ve yeni öğrenci senaryoları geçti.
- Tarih/hafta hesapları ve API tekrar denemesi testleri geçti. Mevcut veli önbelleği regresyon testi geçti.
- Örnek tarayıcı panelinde tek öğrenci onayı diğer öğrenciyi değiştirmedi; gün “Kısmen tamamlandı” oldu.

## Açık doğrulamalar ve sınırlar

- Son değişiklik: gün bazında kapasite saklama, Excel'de güncel öğrenci adının kullanılması. Bunlardan sonra tam test turu henüz çalışmadı.
- `tests/duty-capacity.test.cjs`, `tests/duty-recovery.test.cjs`, `tests/duty-xlsx.test.mjs` eklendi; **henüz çalıştırılmadı**.
- Excel testi ZIP CRC, OOXML parçaları, Türkçe karakterler, formül olarak yorumlanmayan isimler, 1–3 görevli, yedi günlük aralık ve özel bilgilerin dışarı çıkmamasını denetler. Masaüstü Excel ile açma ve gerçek tarayıcı indirmesi henüz doğrulanmadı.
- Tam tarayıcı otomasyonu `EPERM`, sonraki indirme denetimi oturum hatası verdi. Mobil ekran ölçüleri ve tüm UI akışları tamamlandı sayılmaz.
- PGlite tek bağlantılıdır: gerçek PostgreSQL'de eşzamanlı iki bağlantının kilit davranışı test edilmedi. Canlı Supabase Realtime ve üretim şema uyumu test edilmedi; üretime erişilmedi.
- Son oturumda komut çalıştırma ortamı `managed networking requires the elevated Windows sandbox backend` hatasıyla başlayamadı; önceki Node/tarayıcı araçları da kullanılamaz oldu. Bu nedenle son test ve kaynak kontrolü bekliyor. Test görevi kullanıcıya devredilmedi.

## Kalan geliştirici işi

Yerel çalıştırma ortamı açıldığında mevcut ve yeni `tests/duty-*.test.*` testlerini çalıştır; hataları düzelt. Son kaynak sürümünde simülasyon, SQL ve Excel testlerini tekrar doğrula; mobil/masaüstü panel akışlarını ve indirmeyi tamamla. Ardından bu notun durumunu güncelle ve kullanıcıya yalnızca SQL/deploy adımlarını bırak.

Uygulama statik HTML/JS'dir; yeni üretim paketi bağımlılığı veya derleme aracı eklenmedi. XLSX üretimi tarayıcıda yapılır. Haftalık dışa aktarma hazırlandı; aylık düğme eklenmedi.
