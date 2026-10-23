/* Original classroom sentences. Each | separates an independently movable phrase.
 * Keep words inside a phrase together; the last phrase is the predicate.
 * Other phrases can change order, allowing natural Turkish alternatives. */
(() => {
 'use strict';
 const source=`
çocuklar|bahçedeki kuru yaprakları|birlikte|topladı
öğrenciler|bugün|kütüphaneden yeni kitaplar|aldı
küçük kardeşim|resmini|özenle|boyadı
annem|akşam yemeğini|erkenden|hazırladı
babam|bozulan bisikletimi|dün|onardı
komşumuz|sokaktaki kedilere|her gün|bakıyor
öğretmenimiz|zor soruyu|tahtada|açıkladı
arkadaşım|kaybolan kalemini|sıranın altında|buldu
yağmur|bahçedeki çiçekleri|gece boyunca|suladı
güneş|bulutların arasından|yavaşça|göründü
kuşlar|sabahın erken saatlerinde|neşeyle|ötüyordu
çiftçiler|olgunlaşan buğdayları|bu hafta|biçti
balıkçılar|ağlarını|sabah erkenden|denize|attı
dedem|eski anılarını|bize|anlattı
ninem|yün iplerden|renkli atkılar|ördü
öğrenciler|sınıf panosunu|renkli resimlerle|süsledi
arkadaşlarımız|yarışmanın sonucunu|büyük heyecanla|bekledi
annem|penceredeki saksıları|balkona|taşıdı
minik kedi|yumuşak minderin üzerinde|uyudu
yaşlı adam|ağacın gölgesinde|biraz|dinlendi
gezginler|dağın zirvesine|gün doğmadan|ulaştı
sporcular|yarışmadan önce|düzenli olarak|çalıştı
çocuklar|sahilde buldukları taşları|özenle|biriktirdi
öğretmen|ödevleri|dersin sonunda|dikkatle|inceledi
abla|küçük kardeşine|yeni masalını|okudu
bahçıvan|bahçedeki fidanları|sabah erken|suladı
yağmur damlaları|pencerenin camında|izler|bıraktı
göçmen kuşlar|sonbaharda|sıcak ülkelere|uçtu
güçlü rüzgâr|ağaçların dallarını|hafifçe|salladı
küçük çocuk|uçurtmasını|gökyüzüne doğru|bıraktı
öğrenciler|deneyin sonuçlarını|defterlerine|yazdı
arkadaşım|kitabın son bölümünü|merakla|okudu
ablalar|piknik sepetini|birlikte|hazırladı
çocuklar|kırılan oyuncaklarını|babalarıyla birlikte|onardı
annem|alışveriş listesini|küçük defterine|yazdı
yaşlı kadın|kaybolan gözlüğünü|masada|buldu
minik serçe|pencerenin önüne|kondu
bahar yağmurları|kuruyan toprağı|yeniden|canlandırdı
genç ressam|denizin maviliğini|tuvaline|yansıttı
öğretmenimiz|çevre temizliğinin önemini|bize|anlattı
öğrenciler|bilmedikleri kelimeleri|sözlükten|araştırdı
babam|arabanın kirli camlarını|dikkatle|sildi
kardeşim|yeni öğrendiği şarkıyı|neşeyle|söyledi
komşular|sokaktaki çukurları|belediyeye|bildirdi
yolcular|otobüs durağında|sabırla|bekledi
kütüphaneci|yeni gelen kitapları|raflara|yerleştirdi
çocuklar|parkta kurulan salıncağa|sırayla|bindi
öğrenciler|gezi sırasında|ilginç notlar|aldı
güneş ışıkları|odanın duvarlarını|sarıya|boyadı
kar taneleri|evlerin çatılarını|sessizce|kapladı
arkadaşım|kendi yazdığı şiiri|sınıfta|okudu
annem|fazla kalan ekmekleri|kurutarak|sakladı
öğrenciler|kullanılmış kâğıtları|ayrı kutulara|attı
çocuklar|yeni diktikleri fidanları|düzenli|suladı
genç sporcu|son engeli|başarıyla|aştı
çoban|koyun sürüsünü|akşamüstü|topladı
arılar|rengârenk çiçeklerin arasında|durmadan|dolaştı
küçük köpek|sahibinin ayaklarının dibinde|bekledi
balıklar|temiz suyun içinde|özgürce|yüzdü
öğrenciler|müzedeki eski eşyaları|ilgiyle|inceledi
dedem|bahçeye|bir elma ağacı|dikti
kardeşim|boş kutulardan|küçük evler|yaptı
annem|kışlık giysileri|üst rafa|kaldırdı
çocuklar|oyunun kurallarını|birlikte|belirledi
öğretmen|her öğrencinin fikrini|dikkatle|dinledi
arkadaşım|otobüsteki yaşlı yolcuya|yer|verdi
öğrenciler|sınıf kitaplığını|düzenli olarak|temizliyor
babam|kamp ateşini|dikkatlice|söndürdü
küçük çocuk|yağmurdan sonra|gökkuşağını|gördü
bahçıvan|kuruyan dalları|özenle|budayıp topladı
çiçeklerin kokusu|bütün bahçeyi|sabahleyin|sardı
çocuklar|karlı tepeden|kızakla|aşağı kaydı
görevliler|kaybolan çocuğu|ailesine|teslim etti
öğrenciler|sorunun çözümünü|birlikte|tartıştı
genç yazar|ilk kitabını|dostlarına|imzaladı
yolcular|uzun yolculuktan sonra|köye|vardı
çocuklar|karanlık odada|el fenerini|açtı
annem|eski fotoğrafları|büyük albüme|yerleştirdi
babam|sebzeleri|bol suyla|iyice|yıkadı
öğrenciler|proje için|farklı kaynaklardan|yararlandı
küçük kardeşim|oyuncaklarını|kutunun içine|yerleştirdi
genç müzisyen|yeni bestesini|sahnede|seslendirdi
çocuklar|kıyıya vuran çöpleri|birlikte|topladı
öğretmenimiz|sınav tarihini|bugün|duyurdu
annem|yağmur başlayınca|çamaşırları|içeri aldı
kardeşim|okul çantasını|akşamdan|hazırladı
gökyüzündeki yıldızlar|gece boyunca|ışıldadı
öğrenciler|farklı ülkelerin kültürlerini|araştırarak|öğrendi
babam|kırık sandalyeyi|yeni parçalarla|sağlamlaştırdı
çocuklar|bahçe duvarını|renkli boyalarla|boyadı
küçük kız|hasta arkadaşına|mektup|yazdı
öğrenciler|çalışma planlarını|haftanın başında|hazırladı
arkadaşım|yeni öğrendiği bilgiyi|bizimle|paylaştı
annem|marketten aldığı meyveleri|buzdolabına|koydu
minik karınca|büyük ekmek kırıntısını|taşıdı
güçlü dalgalar|kıyıdaki kayalara|durmadan|çarptı
çocuklar|okul gezisini|sabırsızlıkla|bekliyor
öğretmen|başarılı çalışmaları|panoda|sergiledi
abla|kardeşinin çözemediği soruyu|sabırla|açıkladı
çiftçi|yeni aldığı tohumları|tarlaya|ekti
öğrenciler|topladıkları bilgileri|bir tabloda|birleştirdi
dedem|eski radyosunu|her sabah|açıyor
çocuklar|sokaktaki hayvanlar için|su|bıraktı
annem|yırtılan çantamı|sağlam iplikle|dikti
genç kaptan|gemiyi|güvenli limana|yanaştırdı
öğrenciler|tören hazırlıklarını|zamanında|tamamladı
küçük kardeşim|resimdeki eksik parçayı|buldu
yaşlı ağaç|yazın|bize|gölge verdi
çocuklar|okudukları kitabı|arkadaşlarına|önerdi
öğretmenimiz|konuyu|günlük hayattan örneklerle|açıkladı
arkadaşım|sahipsiz köpeğe|sıcak yuva|buldu
yolcular|yağmur dinene kadar|durakta|bekledi
annem|yeni çiçekleri|pencerenin önüne|koydu
kardeşim|doğum günü kartını|kendisi|hazırladı
çocuklar|orman gezisinde|farklı yapraklar|topladı
genç öğrenci|merak ettiği soruyu|sordu
babam|piknik alanını|ayrılmadan önce|temizledi
kuşlar|ağacın yüksek dallarına|yuva|yaptı
çocuklar|gösterideki sihirbazı|hayranlıkla|izledi
öğrenciler|birlikte çalışmanın faydasını|deneyerek|gördü
arkadaşım|kırdığı saksı için|özür diledi
annem|yeni tarifini|komşularıyla|paylaştı
usta|bozulan saatin parçalarını|dikkatle|inceledi
genç kız|koşu yarışında|birinci|oldu
çocuklar|yolculuk boyunca|neşeli şarkılar|söyledi
öğrenciler|tarihi kalenin duvarlarını|merakla|inceledi
babam|pazar sabahı|bisikletimin lastiğini|şişirdi
kardeşim|kaybolan oyuncağını|bahçede|arıyor
komşumuz|bahçesindeki olgun domatesleri|bize|getirdi
genç ressam|sergisini|küçük salonda|açtı
öğrenciler|ağaçların büyümesini|haftalar boyunca|gözlemledi
çocuklar|göl kenarında|yaban ördeklerini|izledi
annem|misafirler gelmeden önce|masayı|hazırladı
abla|boş zamanlarında|küçük hikâyeler|yazıyor
babam|pencerenin gevşeyen vidasını|sıkıca|sıktı
öğrenciler|yardım kampanyasına|gönüllü olarak|katıldı
çocuklar|çevrelerindeki sesleri|gözlerini kapatarak|dinledi
yağmur suları|yolun kenarında|birikti
küçük kız|ilkbaharın gelişini|çiçeklerle|kutladı
öğretmenimiz|konuşan öğrencileri|nazikçe|uyardı
arkadaşım|arkadaşına|yeni kalemini|ödünç verdi
çocuklar|bahçedeki küçük kaplumbağayı|dikkatle|izledi
annem|akşamları|bize|güzel masallar|okur
çiftçiler|yağmurun başlamasını|umutla|bekledi
görevliler|kütüphanenin kapılarını|sabahleyin|açtı
öğrenciler|tasarladıkları köprüyü|tahta çubuklarla|yaptı
kardeşim|yeni ayakkabılarını|kapının önünde|çıkardı
babam|gece gökyüzünü|dürbünle|inceledi
çocuklar|saklanan arkadaşlarını|tek tek|buldu
öğretmen|konuşmasını|güzel bir soruyla|bitirdi
küçük çocuk|annesinin elini|sıkıca|tuttu
arkadaşım|yarım bıraktığı resmi|tamamladı
öğrenciler|yaz tatilinde|yüzmeyi|öğrendi
annem|balkondaki çiçekleri|soğuktan|korudu
genç sporcu|yarıştan sonra|rakibini|kutladı
çocuklar|elma ağacının altında|oturup|dinlendi
usta|yeni dolabın kapaklarını|özenle|taktı
öğrenciler|eski gazetelerden|renkli kolajlar|hazırladı
babam|yolculuktan önce|lastikleri|kontrol etti
küçük kardeşim|kendi ayakkabısını|bağlamayı|öğrendi
kuşlar|fırtına başlayınca|yuvalarına|döndü
çocuklar|güneş batarken|sahilden|ayrıldı
annem|mutfaktaki eski kavanozları|yeniden|değerlendirdi
öğrenciler|grup çalışmalarında|görevleri|paylaştı
arkadaşım|yeni okuluna|kısa sürede|alıştı
yaşlı adam|bahçesindeki gülleri|severek|yetiştiriyor
çocuklar|müzede gördüklerini|resimlerle|anlattı
öğretmenimiz|cevap vermeden önce|biraz|düşündü
genç yazar|okurlarının sorularını|içtenlikle|yanıtladı
babam|ağır bavulu|üst rafa|yerleştirdi
öğrenciler|arkadaşlarının fikirlerine|saygıyla|yaklaştı
annem|kuruyan çamaşırları|dolaba|yerleştirdi
çocuklar|deniz kabuklarını|renklerine göre|ayırdı
müzisyen|konserden önce|gitarını|akort etti
komşular|mahalle parkını|birlikte|güzelleştirdi
öğrenciler|kitaptaki ana düşünceyi|belirledi
kardeşim|yaptığı kurabiyeleri|bize|ikram etti
annem|otobüse yetişmek için|erken|çıktı
çocuklar|uzaktaki dağları|hayranlıkla|seyretti
öğretmen|açık kalan lambaları|söndürdü
minik tavşan|çalılıkların arkasına|hızla|saklandı
öğrenciler|yazdıkları cümleleri|dikkatle|kontrol etti
babam|bahçedeki kuru otları|temizledi
çocuklar|ilk kez|teleskopla|gökyüzünü|inceledi
annem|eski gömlekten|küçük çanta|dikti
arkadaşım|okul yolunda|yaralı kuş|buldu
sporcular|antrenmandan sonra|bol su|içti
öğrenciler|gözlemlerini|küçük çizimlerle|destekledi
çocuklar|bahçedeki karıncaları|büyüteçle|inceledi
dedem|çocukluk arkadaşını|yıllar sonra|gördü
pencere açılınca|içeriye|serin hava|girdi
çocuklar|sessizce|ormandaki doğal sesleri|dinledi
öğretmenimiz|soruları|kolaydan zora doğru|sıraladı
arkadaşım|bilmediği kelimelerin anlamlarını|not aldı
babam|eski bisikletimi|küçük kardeşime|verdi
çocuklar|su birikintilerinin üzerinden|dikkatle|atladı
öğrenciler|olayları|oluş sırasına göre|anlattı
annem|kış hazırlıklarını|sonbaharda|tamamladı
minik kedi|ip yumağının peşinden|koştu
komşumuz|kapımızın önüne|bir çiçek|bıraktı
genç araştırmacı|deney sırasında|ölçümleri|kaydetti
öğrenciler|küçük hatalarını|kendileri|düzeltti
çocuklar|sağanak yağmurdan|kapalı durağa|sığındı
babam|karanlık merdiveni|fenerle|aydınlattı
annem|vazodaki çiçeklerin suyunu|değiştirdi
öğrenciler|sorunlara|farklı açılardan|baktı
küçük çocuk|elindeki balonu|arkadaşına|uzattı
genç ressam|resmindeki renkleri|uyumla|birleştirdi
öğrenciler|günlük çalışmalarını|düzenli olarak|tekrarladı
çocuklar|piknikten kalan çöpleri|ayırarak|topladı
annem|bozulan fermuarı|terziye|gösterdi
babam|bahçenin eski kapısını|yeniden|boyadı
öğretmenimiz|başarının sırrını|güzel örneklerle|anlattı
küçük kardeşim|ilk mektubunu|dedesine|gönderdi
çocuklar|boş şişeleri|geri dönüşüme|götürdü
öğrenciler|doğru bilgiyi|güvenilir kaynaklardan|araştırdı
genç kaptan|sisli havada|yavaşça|ilerledi
annem|sofradaki meyveleri|eşit olarak|paylaştırdı
çocuklar|kaybolan topu|çitlerin arkasında|buldu
öğrenciler|sunumlarını|fotoğraf ve çizimlerle|zenginleştirdi
babam|arızalı lambanın ampulünü|değiştirdi
yaşlı kadın|komşusuna|taze ekmek|götürdü
çocuklar|gösteri bittiğinde|oyuncuları|alkışladı
öğretmen|öğrencilerin merakını|yeni sorularla|artırdı
arkadaşım|kırılan oyuncağını|hemen|çöpe atmadı
annem|bahçeden topladığı naneleri|kuruttu
öğrenciler|yarışmayı kazanmak için|birlikte|çalıştı
çocuklar|ormandaki tabelaları|dikkatle|okudu
babam|ağacın kırılan dalını|dikkatlice|kesti
küçük kız|resim defterini|çantasında|sakladı
öğrenciler|sınıfın yeni kurallarını|birlikte|yazdı
annem|biten pilimizi|atık kutusuna|attı
çocuklar|kurumuş yapraklardan|güzel desenler|oluşturdu
genç bilimci|araştırmasının sonuçlarını|toplantıda|sundu
öğrenciler|çözüme ulaşmak için|sabırla|uğraştı
babam|evin önündeki yolu|süpürdü
çocuklar|karşıya geçmeden|ışığı|kontrol etti
öğretmenimiz|kitap okuma saatini|başlattı
annem|kavanozların kapaklarını|sıkıca|kapattı
minik serçe|bahçedeki su kabından|içti
öğrenciler|fark ettikleri yanlışları|nazikçe|söyledi
kardeşim|uyumadan önce|dişlerini|fırçaladı
çocuklar|öğrendikleri yeni oyunu|arkadaşlarına|öğretti
babam|tamir ettiği radyoyu|yeniden|çalıştırdı
genç müzisyen|sahneye çıkmadan önce|heyecanlandı
öğrenciler|bu haftaki hedeflerini|belirledi
annem|kaybolan düğmeyi|halının üzerinde|buldu
çocuklar|kıyıdaki küçük tekneyi|kumdan|kurtardı
öğretmen|zorlanan öğrenciye|ek süre|verdi
arkadaşım|günlük harçlığından|biraz para|biriktirdi
babam|bahçeye gelen kuşları|ürkütmeden|izledi
çocuklar|gezi fotoğraflarını|panoya|astı
öğrenciler|deney araçlarını|kullandıktan sonra|temizledi
annem|kurabiye hamurunu|eşit parçalara|böldü
küçük kardeşim|kendi yatağını|sabahleyin|topladı
genç sporcu|uzun atlayışı|başarıyla|tamamladı
çocuklar|bahçeye kurulan çadırı|birlikte|kaldırdı
öğretmenimiz|yeni konunun başlığını|yazdı
annem|çantamdaki gereksiz eşyaları|çıkardı
öğrenciler|düşüncelerini|açık cümlelerle|ifade etti
babam|çiçeklerin yerini|güneşe göre|değiştirdi
çocuklar|topladıkları kozalakları|sepetlere|doldurdu
genç yazar|kitabının kapağını|kendisi|tasarladı
öğrenciler|oyun sırasında|birbirini|cesaretlendirdi
annem|misafirler için|taze limonata|hazırladı
küçük çocuk|kalabalıkta|ailesinin yanından|ayrılmadı
babam|eski fotoğraf makinesini|özenle|saklıyor
çocuklar|yapbozun son parçasını|birlikte|yerleştirdi
öğrenciler|açık kalan musluğu|kapattı
annem|komşunun getirdiği çiçekleri|vazoya|koydu
genç dağcı|tırmanıştan önce|malzemelerini|hazırladı
çocuklar|yağmur başladığında|kapalı alana|geçti
öğretmenimiz|her grubun çalışmasını|değerlendirdi
babam|ağacın çevresindeki toprağı|havalandırdı
öğrenciler|yeni kelimelerle|kısa hikâyeler|kurdu
annem|poşetleri|yeniden kullanmak için|sakladı
çocuklar|ilk kar tanelerini|sevinçle|karşıladı
genç ressam|kuruyan fırçalarını|suya|bıraktı
öğrenciler|tartışma sırasında|söz hakkını|bekledi
babam|kırık pencerenin camını|yeniledi
küçük kız|defterinin kapağını|çizimlerle|süsledi
çocuklar|yardım isteyen arkadaşlarını|yalnız bırakmadı
öğretmen|sınıfa|ilginç bir soru|yöneltti
annem|pişen ekmeği|fırından|çıkardı
öğrenciler|mektuplarını|renkli zarflara|yerleştirdi
babam|yağmurlu havada|arabayı|dikkatlice|kullandı
çocuklar|gece gökyüzündeki yıldızları|saymaya çalıştı
genç sporcu|kaybetmesine rağmen|rakibini|alkışladı
öğrenciler|kütüphanedeki kitapları|konularına göre|ayırdı
annem|balkon kapısını|rüzgâr nedeniyle|kapattı
küçük kardeşim|büyük yapbozu|sabırla|tamamladı
çocuklar|kaygan yolda|yavaş adımlarla|ilerledi
öğretmenimiz|soruyu anlayamayan öğrenciye|yardım etti
babam|yolculuğun rotasını|haritada|işaretledi
öğrenciler|yazılarını|noktalama işaretlerine göre|düzeltti
annem|misafirlerini|kapıda|güler yüzle|karşıladı
çocuklar|ormandan ayrılırken|çevreyi|temiz bıraktı
genç araştırmacı|bilinmeyen bitkiyi|fotoğrafla|kaydetti
öğrenciler|günlük planlarına|dinlenme araları|ekledi
çocuklar|arkadaşlarının güzel fikirlerini|dikkatle|dinledi
`;
 const data=source.trim().split('\n').map((line,i)=>{
  const groups=line.trim().split('|').map(g=>g.split(/\s+/));
  return Object.freeze({id:'sentence-'+String(i+1).padStart(3,'0'),groups:Object.freeze(groups.map(g=>Object.freeze(g))),words:Object.freeze(groups.flat())});
 });
 if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(data);else window.NoTikSentences=Object.freeze(data);
})();
