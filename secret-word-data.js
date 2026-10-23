/* NoTik classroom content. Original clues, grouped from broad to specific.
 * Each row: answer | distinguishing clue | strongest clue.
 * The category's opening clue is the first of three clues. No student data. */
(() => {
 'use strict';
 const source = `
@Hayvanlar|Doğada yaşayan bir hayvandır.
aslan|Kedigillerden güçlü bir avcıdır.|Erkeğinin başını çevreleyen yelesi vardır.
kaplan|Tek başına avlanmayı sever.|Turuncu kürkünün üzerinde siyah çizgiler bulunur.
zürafa|Afrika'nın otlaklarında yaşar.|Çok uzun boynuyla ağaçların yüksek yapraklarına uzanır.
fil|Sürü hâlinde yaşayan iri bir memelidir.|Uzun hortumunu hem su içmek hem nesne tutmak için kullanır.
zebra|Atlara benzeyen bir otçuldur.|Gövdesi siyah beyaz çizgilerle kaplıdır.
kanguru|Arka bacakları ön bacaklarından güçlüdür.|Yavrusunu kesesinde taşır ve sıçrayarak ilerler.
koala|Ağaçlarda yaşayan Avustralyalı bir keseli hayvandır.|Başlıca besini okaliptüs yapraklarıdır.
panda|Çin'in dağ ormanlarında yaşar.|Siyah beyaz kürkü vardır ve çoğunlukla bambu yer.
tilki|Keskin işitmesiyle küçük avları bulabilir.|Sivri kulakları ve kabarık kuyruğuyla tanınır.
kurt|Köpekgillerden, çoğu zaman sürü kuran bir avcıdır.|Uzun uzun uluyarak haberleşebilir.
ayı|Kışın uzun süre dinlenen türleri vardır.|İri gövdesi, kısa kuyruğu ve güçlü pençeleri bulunur.
geyik|Ormanlarda yaşayan otçul bir memelidir.|Erkeklerinin çoğunda dallanmış boynuzlar bulunur.
tavşan|Tehlikeden hızlı koşarak uzaklaşır.|Uzun kulakları ve kısa, pamuksu kuyruğu vardır.
sincap|Ağaçlara çevikçe tırmanır.|Kabarık kuyruğu vardır ve kış için yemiş saklayabilir.
kirpi|Geceleri yiyecek arayan küçük bir memelidir.|Tehlikede dikenli gövdesini top gibi yuvarlar.
köstebek|Yaşamının büyük bölümünü yer altında geçirir.|Güçlü ön ayaklarıyla tüneller kazar.
deve|Kurak bölgelerde yaşamaya uyumludur.|Sırtındaki hörgüçte su değil yağ depolar.
at|İnsanlar onu binmek ve yük taşımak için kullanmıştır.|Ayaklarının ucunda toynak bulunur; kişner.
koyun|Sürü hâlinde yetiştirilen bir çiftlik hayvanıdır.|Yünü kırkılır ve sesi meleme olarak adlandırılır.
keçi|Kayalık yamaçlara iyi tırmanır.|Sütü sağılan bu hayvanın çenesinde sakal olabilir.
@Kanatlılar ve küçük canlılar|Hayvanlar dünyasının bir üyesidir.
kartal|Güçlü pençeleri olan yırtıcı bir kuştur.|Yüksekten süzülürken keskin gözleriyle avını görür.
baykuş|Birçok türü geceleri avlanır.|İri gözlüdür ve sessiz uçuşuyla tanınır.
serçe|Şehirlerde de sık görülen küçük bir kuştur.|Çatılarda, dallarda cıvıldayan kahverengi gri kuşlardan biridir.
güvercin|Yerini bulma yeteneğiyle tanınan bir kuştur.|Geçmişte ayağına bağlanan mesajları taşıyan türleri kullanılmıştır.
leylek|Mevsime göre göç eden uzun bacaklı bir kuştur.|Uzun gagası vardır, bacalara büyük yuvalar kurabilir.
kırlangıç|Uçarken böcek yakalayabilir.|Çatallı kuyruğu vardır ve çamurdan yuva yapar.
martı|Kıyılarda ve deniz üstünde görülür.|Vapur çevresinde uçan beyaz gri kuş olarak tanınır.
penguen|Kanatları olmasına rağmen uçamaz.|Siyah beyaz tüylüdür ve çok iyi yüzer.
papağan|Renkli tüyleriyle dikkat çeker.|Bazı türleri insan sesini taklit edebilir.
tavuskuşu|Erkeği gösterişli tüylerini sergiler.|Kuyruğunu yelpaze gibi açtığında göz biçimli desenler görünür.
arı|Çiçekler arasında dolaşırken tozlaşmaya yardımcı olur.|Bazı türleri kovanda bal üretir.
karınca|Koloniler hâlinde yaşayan küçük bir böcektir.|Yere açılan yuvasına sıra hâlinde yiyecek taşıyabilir.
kelebek|Yetişkin olmadan önce tırtıl evresinden geçer.|Renkli kanatlarıyla çiçekler arasında uçar.
uğurböceği|Bahçelerde yaprak bitlerini yiyebilir.|Birçok türünün kırmızı kanat kapağında siyah benekler bulunur.
çekirge|Uzun arka bacakları vardır.|Otların arasında sıçrayarak ilerleyen bir böcektir.
yusufçuk|Genellikle suya yakın yerlerde görülür.|İki çift saydam kanadı ve uzun ince bir gövdesi vardır.
örümcek|Böceklerden farklı bir canlı grubundadır.|Sekiz bacağı vardır ve birçok türü ağ örer.
salyangoz|Yavaş ilerleyen yumuşak gövdeli bir canlıdır.|Sırtında sarmal bir kabuk taşır ve ardından iz bırakır.
solucan|Toprağın havalanmasına katkıda bulunur.|Bacaksız, uzun gövdeli bu canlı nemli toprakta yaşar.
akrep|Sıcak bölgelerde de görülen sekiz bacaklı bir canlıdır.|Önünde kıskaçları, kıvrık kuyruğunun ucunda iğnesi bulunur.
@Su canlıları|Yaşamı suyla yakından ilişkili bir hayvandır.
yunus|Hava solumak için su yüzeyine çıkar.|Bir memelidir; seslerden yararlanarak çevresini algılayabilir.
balina|Yavrularını sütle besleyen bir deniz memelisidir.|Mavi türü, yaşayan en büyük hayvandır.
köpekbalığı|İskeleti büyük ölçüde kıkırdaktan oluşur.|Sırt yüzgeci ve keskin dişleriyle tanınan bir balıktır.
ahtapot|Kayalık diplerde saklanabilir.|Sekiz kolu vardır ve mürekkep püskürtebilir.
kalamar|Hızla hareket etmek için su püskürtür.|Uzun gövdesi ve ikisi daha uzun olan on uzantısı vardır.
denizanası|Şeffaf ya da yarı şeffaf gövdesi vardır.|Şemsiye biçimli gövdesinin altından dokunaçlar sarkar.
denizyıldızı|Deniz tabanında yaşayan bir omurgasızdır.|Çoğunlukla merkezden yayılan beş kolu bulunur.
denizatı|Balık olmasına rağmen alışılmış balık biçiminde değildir.|Başı ata benzer ve yavruları erkek bireyin kesesinde gelişir.
yengeç|Sert bir dış kabukla korunur.|İki büyük kıskacı vardır ve çoğu yana doğru yürür.
ıstakoz|Deniz dibinde yaşayan bir kabukludur.|Uzun antenleri ve iri kıskaçlarıyla tanınır.
karides|Küçük bir su kabuklusudur.|İnce uzun antenleri ve kıvrık bir gövdesi vardır.
midye|Kayalara tutunarak yaşayabilir.|Yumuşak gövdesi birbirine bağlı iki koyu renk kabuk arasındadır.
istiridye|İki kabuğu arasında yumuşak bir gövde taşır.|İnci oluşumuyla ilişkilendirilen deniz canlısıdır.
mercan|Birçok küçük hayvanın oluşturduğu koloniler hâlinde bulunur.|Ilık denizlerde resif adı verilen yapılar oluşturabilir.
fok|Kıyıya çıkarak dinlenebilen bir memelidir.|Yüzgece benzeyen ayakları ve bıyıkları vardır.
suaygırı|Günün önemli bölümünü suda geçirebilir.|İri gövdeli, kısa bacaklı ve çok geniş ağızlı bir Afrika memelisidir.
timsah|Hem suda hem kıyıda yaşayan bir sürüngendir.|Uzun çenesi, güçlü kuyruğu ve zırh gibi pulları vardır.
kurbağa|Yaşamına suda iribaş olarak başlar.|Arka bacaklarıyla sıçrar ve vıraklar.
kaplumbağa|Karada ya da suda yaşayan türleri vardır.|Gövdesini koruyan sert kabuğuyla tanınır.
alabalık|Serin ve temiz tatlı sularda yaşayan türleri vardır.|Benekli gövdeli, akarsularda da görülen bir balıktır.
@Bitkiler|Toprakta yetişen bir bitkidir.
çam|Kışın da yeşil kalan türleri yaygındır.|İğne biçimli yaprakları vardır ve kozalak taşır.
meşe|Uzun ömürlü, güçlü gövdeli bir ağaçtır.|Palamut adı verilen meyveleri vardır.
çınar|Geniş gölgesiyle meydanlarda da görülür.|Büyük, el ayasına benzeyen yaprakları vardır.
söğüt|Su kenarlarında yetişen türleri bulunur.|Salkım türünün ince dalları yere doğru sarkar.
kavak|Hızlı büyüyen, uzun boylu bir ağaçtır.|Yol kenarlarında sıra hâlinde görülen ince uzun türleri vardır.
sedir|Dağlık bölgelerde yetişen iğne yapraklı bir ağaçtır.|Lübnan bayrağında resmi bulunan ağaçtır.
servi|Mezarlıklarda da sık görülen bir ağaçtır.|Yukarı doğru uzanan dar, koyu yeşil görünümüyle tanınır.
palmiye|Sıcak iklimlerde yaygındır.|Yaprakları genellikle uzun gövdesinin tepesinde toplanır.
bambu|Hızla büyüyebilen bir bitkidir.|Boğumlu gövdesi vardır ve pandaların temel besinidir.
kaktüs|Kurak ortamlara uyumludur.|Su depolayan gövdesi ve çoğu türünde dikenleri bulunur.
gül|Bahçelerde süs amacıyla yetiştirilir.|Kokulu, kat kat taç yapraklı çiçekleri ve dikenli dallarıyla tanınır.
lale|Soğanlı bir süs bitkisidir.|Osmanlı tarihinde bir döneme adını veren çiçektir.
papatya|Kırlarda görülen bir çiçektir.|Sarı merkezi çevreleyen beyaz taç yapraklarıyla tanınır.
menekşe|Saksıda da yetiştirilen bir çiçektir.|Adı aynı zamanda mora yakın bir rengi anlatır.
orkide|Çok sayıda türü bulunan bir çiçek grubudur.|Süs bitkisi olarak yetiştirilen gösterişli, simetrik çiçekleri vardır.
lavanta|Kokusu için de yetiştirilen bir bitkidir.|Mor çiçekli tarlalarıyla ve kurutulmuş koku keseleriyle tanınır.
ayçiçeği|Tohumlarından yağ elde edilir.|Büyük sarı çiçek başının ortasında çekirdekler oluşur.
buğday|Tarlalarda yetiştirilen bir tahıldır.|Taneleri öğütülerek ekmeklik un yapılır.
pamuk|Sıcak bölgelerde yetiştirilen bir tarım bitkisidir.|Beyaz yumuşak lifleri iplik ve kumaş yapımında kullanılır.
yonca|Hayvan yemi olarak da yetiştirilir.|Üç yaprakçıklısı yaygındır, dört yapraklısı şansla ilişkilendirilir.
@Meyveler|Yenebilen bir meyvedir.
elma|Kırmızı, yeşil ya da sarı çeşitleri vardır.|Ortası çekirdekli, yuvarlak ve gevrek bir meyvedir.
armut|Ağaçta yetişen sulu bir meyvedir.|Genellikle altı geniş, sapına doğru daralan bir biçimi vardır.
muz|Sıcak iklimlerde yetişir.|Olgunlaştığında sarı kabuğu soyulan uzun, kıvrık bir meyvedir.
portakal|Turunçgiller ailesindendir.|Turuncu kabuğunun içinde dilimlere ayrılan sulu meyve eti bulunur.
mandalina|Kışın sık tüketilen bir turunçgildir.|Portakaldan genellikle küçüktür ve kabuğu kolay soyulur.
limon|Turunçgillerden ekşi bir meyvedir.|Sarı kabukludur; suyu salataya ve çaya katılabilir.
greyfurt|İri bir turunçgildir.|Sarı kabuklu, içi pembe olabilen, acımsı ekşi bir meyvedir.
çilek|Tatlılarda da kullanılan kırmızı bir meyvedir.|Küçük çekirdek benzeri noktaları dış yüzeyinde görünür.
kiraz|İlkbahar sonu ve yaz başında olgunlaşır.|Uzun saplı, küçük, parlak kırmızı ve tek çekirdekli bir meyvedir.
vişne|Kiraza benzeyen bir meyvedir.|Ekşi tadıyla reçel ve meyve suyunda sık kullanılır.
şeftali|Yazın olgunlaşan çekirdekli bir meyvedir.|Kabuğu ince tüylü, içi sulu ve ortası iri çekirdeklidir.
kayısı|Taze ya da kurutulmuş olarak yenir.|Turuncu renkli küçük meyvesiyle Malatya ile özdeşleşmiştir.
erik|Yeşil ya da mor çeşitleri vardır.|İlkbaharda çıkan yeşil çeşidi ekşi ve gevrek yenir.
üzüm|Bağlarda yetiştirilir.|Taneleri salkım hâlindedir ve kurutulunca kuru meyve olur.
incir|Taze ve kurutulmuş olarak tüketilir.|Yumuşak iç kısmında çok sayıda minik çekirdek bulunur.
nar|Sonbaharda olgunlaşan bir meyvedir.|Kalın kabuğunun içinde çok sayıda kırmızı, sulu tane vardır.
karpuz|Sıcak yaz günlerinde sık yenir.|Yeşil kabuklu, çoğunlukla kırmızı içli ve çok sulu büyük bir meyvedir.
kavun|Yazın olgunlaşan iri bir meyvedir.|Kokulu, tatlı iç kısmının ortasında toplu çekirdekler bulunur.
ananas|Tropikal bir meyvedir.|Sert, desenli kabuğu ve tepesinde dikenimsi yaprakları vardır.
kivi|İçi çoğunlukla yeşil olan bir meyvedir.|Kahverengi tüylü kabuğu ve diliminde halka gibi dizilen siyah çekirdekleri vardır.
@Sebzeler ve mutfak bitkileri|Mutfakta yiyecek olarak kullanılan bir bitkidir.
domates|Salata ve soslarda sık kullanılır.|Olgunlaştığında çoğunlukla kırmızı olan sulu bir üründür; salça yapılır.
biber|Tatlı ve acı çeşitleri vardır.|Yeşil, kırmızı ya da sarı olabilir; içi oyulup dolması yapılır.
patlıcan|Pişirilerek tüketilen bir sebzedir.|Mor parlak kabuğuyla ve karnıyarık yemeğiyle tanınır.
kabak|Yazlık ve kışlık çeşitleri vardır.|Yeşil çeşidinden mücver, iri turuncu çeşidinden tatlı yapılır.
salatalık|Çoğunlukla çiğ tüketilir.|Uzun yeşil gövdesi dilimlenerek cacığa katılır.
havuç|Toprak altındaki kısmı yenir.|Genellikle turuncu, uzun ve sivri uçlu bir köktür.
patates|Toprak altında yumrular oluşturur.|Kızartması ve püresi yapılan nişastalı bir besindir.
soğan|Yemeklerin başlangıcında sık doğranır.|Kat kat yapısı vardır ve doğrarken gözleri yaşartabilir.
sarımsak|Keskin kokusuyla yemeklere tat verir.|Bir başı, diş adı verilen küçük bölümlere ayrılır.
pırasa|Soğangillerden bir sebzedir.|Uzun yeşil yaprakları ve beyaz silindir biçimli alt kısmı vardır.
ıspanak|Yaprakları pişirilerek yenir.|Koyu yeşil yapraklıdır; börek içi olarak da kullanılır.
marul|Salatalarda sık kullanılan bir sebzedir.|Geniş, gevrek yaprakları bir baş çevresinde toplanır.
lahana|Yaprakları çiğ ya da pişirilmiş yenir.|Sıkı bir baş oluşturan kat kat yapraklarıyla sarma yapılır.
karnabahar|Çiçek kısmı sebze olarak yenir.|Yeşil yaprakların arasında beyaz, dallanmış bir başı vardır.
brokoli|Çiçek kısmı yenebilen bir sebzedir.|Küçük yeşil ağaçlara benzeyen başları vardır.
bezelye|Baklagillerden bir bitkidir.|Yeşil kılıfının içinde sıra sıra yuvarlak taneler bulunur.
fasulye|Tazesi ve kurusu yemeklerde kullanılır.|Uzun yeşil kılıflarının içindeki taneler olgunlaşınca kurutulabilir.
mercimek|Çorbası yapılan bir baklagildir.|Kırmızı ya da yeşil, küçük ve yassı taneleri vardır.
nohut|Kuru baklagiller arasında yer alır.|Humus ve leblebi yapımında kullanılan yuvarlak taneli besindir.
maydanoz|Yemekleri süslemek ve tatlandırmak için kullanılır.|İnce saplı, küçük parçalı yeşil yaprakları vardır.
@Yiyecekler|Sofrada tüketilen bir yiyecektir.
ekmek|Tahıl unundan hazırlanır.|Hamuru mayalanıp fırında pişirilir; dilimlenerek yenebilir.
peynir|Sütten elde edilen bir besindir.|Beyaz, kaşar ve tulum gibi çeşitleri vardır.
yoğurt|Sütün mayalanmasıyla oluşur.|Kaşıkla yenir; suyla karıştırıldığında ayran yapılır.
tereyağı|Süt ya da kremadan elde edilir.|Sarımsı renklidir ve sıcak tavada erir.
zeytin|Kahvaltıda yenir ve yağı çıkarılır.|Yeşil ya da siyah, içinde sert çekirdeği olan küçük bir meyvedir.
bal|Çiçeklerden toplanan özlerle üretilir.|Arıların peteklerde biriktirdiği tatlı ve kıvamlı besindir.
reçel|Meyveler şekerle pişirilerek hazırlanır.|Kahvaltıda ekmeğe sürülen, içinde meyve parçaları olabilen tatlıdır.
pekmez|Meyve suyunun koyulaştırılmasıyla yapılır.|Üzüm ya da dut çeşidi yaygındır; tahinle karıştırılabilir.
tahin|Yağlı tohumların ezilmesiyle hazırlanır.|Susamdan yapılır ve pekmezle birlikte yenir.
çorba|Genellikle yemeğin başında içilir.|Kâsede sunulan mercimek, tarhana ve yayla çeşitleri vardır.
pilav|Taneli bir ana malzemeyle pişirilir.|Pirinç ya da bulgurla yapılan, tane tane olması istenen yemektir.
makarna|Hamurdan yapılan bir besindir.|Kaynar suda pişirilen çubuk, burgu ve kelebek biçimleri vardır.
mantı|Hamurun içine harç konularak hazırlanır.|Küçük bohçalar hâlinde pişirilip yoğurtla servis edilir.
börek|Kat kat hamur ya da yufkayla yapılır.|İçine peynir, patates veya ıspanak konulabilir.
simit|Fırınlarda ve sokak tezgâhlarında satılır.|Halka biçimindedir ve üzeri susamla kaplıdır.
poğaça|Fırında pişirilen bir hamur işidir.|İçi peynirli ya da zeytinli olabilen küçük, yumuşak çörektir.
gözleme|İnce açılan hamurla hazırlanır.|İçine harç konulup katlanır ve sac üzerinde pişirilir.
baklava|Kat kat ince hamurdan yapılan bir tatlıdır.|Arasına fıstık ya da ceviz konur, üzerine şerbet dökülür.
dondurma|Soğuk tüketilen bir tatlıdır.|Külaha konulabilir ve sıcakta erir.
sütlaç|Sütle hazırlanan bir tatlıdır.|İçinde pirinç bulunur ve kâsede servis edilir.
@Okul eşyaları|Öğrenirken veya ders çalışırken kullanılabilir.
kalem|Düşünceleri kâğıda aktarmaya yarar.|Kurşun, tükenmez ve dolma çeşitleri olan yazı aracıdır.
silgi|Yazarken yapılan hataları düzeltmeye yarar.|Kurşun kalem izlerini kâğıttan temizler.
kalemtıraş|Bir yazı aracını kullanıma hazırlar.|Kurşun kalemin ucunu açar ve talaş çıkarır.
cetvel|Düz çizgi çizmekte kullanılır.|Üzerindeki santimetre işaretleriyle uzunluk ölçülür.
pergel|Geometri dersinde kullanılan bir araçtır.|Bir ucu sabit tutulurken diğer ucuyla çember çizilir.
iletki|Geometride ölçüm yapmaya yarar.|Üzerindeki derece işaretleriyle açı ölçülür.
gönye|Teknik çizimlerde kullanılır.|Dik açı kontrol etmeye yarayan üçgen biçimli cetveldir.
defter|Sayfaları bir araya getirilmiş bir okul eşyasıdır.|Çizgili veya kareli sayfalarına ders notları yazılır.
kitap|Bilgi ya da hikâye taşıyabilir.|Bir kapağın arasında bir araya getirilmiş okunacak sayfalardır.
dosya|Belgeleri düzenli tutar.|Kâğıtlar bunun içine konulur veya bölmelerinde saklanır.
klasör|Çok sayıda belgeyi bir arada saklar.|İçindeki metal halkalara delikli kâğıtlar takılabilir.
çanta|Eşyaları taşımayı kolaylaştırır.|Öğrenciler kitap ve defterlerini içine koyup sırtında taşıyabilir.
makas|İki parçalı bir el aletidir.|Parmaklarla açılıp kapanan iki bıçağı kâğıdı keser.
yapıştırıcı|İki yüzeyi birbirine tutturur.|Kâğıt etkinliklerinde sıvı veya çubuk biçimi kullanılır.
zımba|Kâğıtları bir arada tutmaya yarar.|Basıldığında küçük metal teli kâğıtlardan geçirip kıvırır.
ataş|Kâğıtları delmeden birleştirebilir.|Kıvrılmış ince telden yapılmış küçük bir tutturucudur.
raptiye|Panoya bir şey asmakta kullanılır.|Geniş başlı, kısa sivri uçlu küçük bir çividir.
tebeşir|Bir yüzeye yazı yazmakta kullanılır.|Kara tahtaya yazılır, silinince beyaz toz bırakabilir.
pano|Duyuru ve çalışmaların sergilenmesini sağlar.|Okul koridorunda resim ve kâğıtların asıldığı yüzeydir.
tahta|Sınıfta ortak anlatım yüzeyi olarak kullanılır.|Öğretmen üzerine yazar, öğrenciler karşıdan okur.
@Ev eşyaları|Ev içinde kullanılan bir eşyadır.
masa|Üzerinde çalışılabilir ya da yemek yenebilir.|Genellikle ayaklar üzerinde duran düz bir yüzeyi vardır.
sandalye|Oturmak için kullanılır.|Çoğunlukla tek kişilik, sırt dayanağı olan bir oturaktır.
koltuk|Dinlenmek için kullanılır.|Yumuşak minderleri ve çoğunlukla kol dayanakları vardır.
dolap|Eşyaları saklamaya yarar.|Kapaklarının arkasında raflar veya askılık bulunur.
çekmece|Küçük eşyaları saklar.|Bir mobilyanın içinden çekilerek açılan bölmedir.
raf|Eşyaları yerleştirmeye yarar.|Duvara ya da dolaba yatay takılan düz bölümdür.
yatak|Dinlenmek için kullanılır.|Üzerine çarşaf serilir ve gece burada uyunur.
yastık|Yumuşak bir ev eşyasıdır.|Uyurken başın altına konulur.
yorgan|İçinde dolgu bulunan bir örtüdür.|Uyurken sıcak tutması için üstümüze çekilir.
battaniye|Soğuktan korunmak için kullanılır.|Yatağa veya dizlerin üzerine örtülen kalın örtüdür.
çarşaf|Yatakta kullanılan bir kumaştır.|Yatağın üzerine serilir; lastikli çeşidi köşelere geçirilir.
perde|Bir açıklığı örtmeye yarar.|Pencereye asılır, ışığı ve dışarıdan görünmeyi azaltır.
halı|Evin zemininde kullanılır.|Desenli ve dokunmuş bir yer yaygısıdır.
kilim|Yere ya da duvara serilebilen bir dokumadır.|Halıdan farklı olarak genellikle havsız, düz dokunur.
ayna|Günlük bakımda kullanılır.|Karşısına geçince kendi yansımamızı görürüz.
lamba|Karanlıkta işe yarar.|Elektrikle ya da başka bir enerjiyle ışık verir.
avize|Odayı aydınlatmaya yarar.|Tavandan sarkan, birden çok ışığı olabilen aydınlatma aracıdır.
vazo|Dekorasyon için kullanılır.|İçine çiçek konulan uzun ya da geniş ağızlı kaptır.
saksı|Evde bitki yetiştirmeyi sağlar.|İçine toprak doldurulur ve bitki dikilir.
saat|Günlük plan yapmaya yardımcı olur.|Akrep ve yelkovanla ya da rakamlarla zamanı gösterir.
@Mutfak araçları|Yiyecek hazırlarken veya servis ederken kullanılır.
tabak|Yemek servisinde kullanılır.|Yemeğin konulduğu genellikle yuvarlak ve yayvan kaptır.
kâse|Sıvı ve katı yiyecekleri tutabilir.|Çorbaya uygun, tabaktan daha derin bir kaptır.
bardak|İçecek servisinde kullanılır.|Su ve meyve suyu içmek için ağza götürülen kaptır.
fincan|Genellikle sıcak içeceklerle kullanılır.|Kahve içilen, küçük kulplu bir kaptır.
kaşık|Sofrada kullanılan bir araçtır.|Çukur ucuyla çorba gibi sıvıları ağza taşır.
çatal|Yiyecekleri tutmaya yarar.|Ucundaki birkaç dişle lokmayı batırıp kaldırırız.
bıçak|Yiyecek hazırlamada kullanılır.|Keskin ağzıyla ekmek, meyve veya sebze keser.
tencere|Yemek pişirmeye yarar.|Ocakta kullanılan, genellikle iki kulplu ve kapaklı derin kaptır.
tava|Ocak üzerinde kullanılır.|Uzun saplı, yayvan yapısıyla kızartma yapmaya uygundur.
tepsi|Fırında veya servis sırasında kullanılır.|Kenarları hafif yükseltilmiş geniş, düz kaptır.
kevgir|Sıvıyla katıyı ayırmaya yardımcı olur.|Delikli, büyük kaşık biçimli mutfak aracıdır.
süzgeç|Yiyeceklerin suyunu ayırır.|Deliklerinden su geçerken makarna gibi parçaları içeride tutar.
rende|Yiyecekleri küçük parçalara ayırır.|Peynir ve havuç, keskin delikli yüzeyine sürtülür.
kepçe|Derin kaplardan yemek almaya yarar.|Uzun sapı ve çukur başıyla çorba servis eder.
merdane|Hamur hazırlarken kullanılır.|Silindir biçimindedir; hamurun üzerinde yuvarlanarak onu açar.
oklava|Hamuru inceltmek için kullanılır.|Yufka açmaya yarayan uzun, ince bir çubuktur.
çaydanlık|Sıcak içecek hazırlamaya yarar.|Altında su kaynayan, üstünde çay demlenen iki katlı kaptır.
termos|İçeceğin sıcaklığını uzun süre korur.|İçindeki çay sıcak, su ise soğuk kalabilir.
kavanoz|Yiyecek saklamaya yarar.|Reçel veya turşunun konulduğu kapaklı cam kaptır.
sürahi|İçecek servisinde kullanılır.|Kulpu ve dökme ağzı vardır; içinden bardaklara su doldurulur.
@Giysiler|Giyilen veya üzerimizde taşınan bir eşyadır.
gömlek|Üst bedene giyilir.|Genellikle yakası ve önden iliklenen düğmeleri vardır.
tişört|Günlük giyimde kullanılır.|Çoğunlukla kısa kollu, yakasız ve pamuklu bir üst giysidir.
kazak|Soğuk havada sıcak tutar.|Yünden örülebilir ve baştan geçirilerek giyilir.
hırka|Serin havada başka giysilerin üzerine giyilir.|Önden açık, düğmeli ya da fermuarlı örgü giysidir.
ceket|Üst bedeni örten bir dış giysidir.|Takım elbisenin kollu ve yakalı üst parçasıdır.
mont|Soğuktan korunmak için giyilir.|Kalın, kısa bir dış giysidir; kapüşonu olabilir.
palto|Kışın dışarıda giyilir.|Genellikle dizlere yaklaşan uzun ve kalın üst giysidir.
yağmurluk|Islak havalarda işe yarar.|Su geçirmeyen kumaşıyla yağmurdan korur.
pantolon|Belden aşağı giyilir.|İki bacağı ayrı ayrı örten paçaları vardır.
etek|Belden aşağı giyilen bir giysidir.|Pantolondan farklı olarak iki ayrı paçası yoktur.
elbise|Tek parça hâlinde giyilir.|Üst gövdeyi örten bölümüyle eteği birleşik olan giysidir.
şort|Sıcak havalarda ve sporda giyilir.|Paçaları genellikle dizin üzerinde biten kısa pantolondur.
çorap|Ayakkabıdan önce giyilir.|Ayağı ve bazen bacağın bir kısmını örten örgü giysidir.
ayakkabı|Dışarıda yürürken kullanılır.|Ayağı zeminden korur; tabanı ve üst kısmı vardır.
terlik|Evde veya yazın giyilebilir.|Ayağa kolay geçirilen, çoğu zaman topuğu açık ayak giysisidir.
çizme|Yağmurda veya kışın giyilir.|Ayağın yanı sıra bacağın bir bölümünü de örter.
eldiven|Soğuktan veya kirden koruyabilir.|Ellere geçirilir ve çoğu türünde parmak bölmeleri vardır.
atkı|Kışın sıcak tutmak için kullanılır.|Boyna dolanan uzun kumaş ya da örgüdür.
bere|Soğuk havada takılır.|Başı saran, genellikle örgü ve siperliksiz bir başlıktır.
şapka|Başı güneşten koruyabilir.|Başa takılır; çevresinde kenarlık veya önünde siperlik bulunabilir.
@Meslekler|Bir mesleği yapan kişidir.
öğretmen|Bilgi ve beceri kazandırmak için çalışır.|Sınıfta ders anlatır ve öğrencilerin öğrenmesine yardımcı olur.
doktor|Sağlık alanında çalışır.|Hastaları muayene eder, hastalıkları teşhis edip tedavi planlar.
hemşire|Sağlık hizmeti sunan bir meslek üyesidir.|Hasta bakımını yürütür, tedavi uygulamalarında görev alır.
eczacı|İlaçlar konusunda uzmanlaşmıştır.|Eczanede ilaçları hazırlar veya verir, kullanımları hakkında bilgi sunar.
veteriner|Sağlık alanında uzmanlık eğitimi alır.|Hayvanların hastalıklarını teşhis ve tedavi eder.
mühendis|Bilim ve matematikten yararlanarak çözümler tasarlar.|Makine, yapı veya yazılım gibi sistemler geliştirir.
mimar|Yapıların tasarımıyla ilgilenir.|Ev ve okul gibi binaların planlarını çizer.
avukat|Hukuk alanında çalışır.|Kişilerin haklarını savunur ve mahkemede onları temsil edebilir.
hâkim|Adalet sisteminde görev yapar.|Mahkemede delilleri değerlendirerek karar verir.
polis|Kamu güvenliği için çalışır.|Suçları önleme ve araştırma görevleri vardır.
itfaiyeci|Acil durumlarda kurtarma çalışmalarına katılır.|Yangını söndürmek için hortum ve özel araçlar kullanır.
pilot|Ulaşım alanında görev yapar.|Uçağı kullanır ve uçuşu yönetir.
kaptan|Bir taşıtın yönetiminden sorumludur.|Geminin seyrini ve mürettebatın çalışmalarını yönetir.
şoför|Kara ulaşımında çalışır.|Otobüs, taksi veya kamyon gibi araçları kullanır.
aşçı|Yiyecek hazırlama konusunda çalışır.|Restoran mutfağında yemek pişirir.
fırıncı|Hamur işleri üretir.|Fırında ekmek ve benzeri ürünler pişirir.
çiftçi|Tarım alanında çalışır.|Tarlasını eker, yetişen ürünleri hasat eder.
marangoz|Bir malzemeyi kesip birleştirerek eşya üretir.|Ahşaptan masa, dolap veya kapı yapar.
terzi|Giysiler üzerinde çalışır.|Ölçü alır, kumaş keser ve dikiş diker.
berber|Kişisel bakım hizmeti verir.|Saç keser ve sakal tıraşı yapar.
@Meslekler ve uğraşlar|Belirli bir alanda emek veren kişidir.
dişçi|Sağlık hizmeti sunar.|Dişleri kontrol eder, çürükleri tedavi eder.
gazeteci|Haber toplar ve doğrular.|Güncel olayları gazete veya haber sitelerinde okuyucuya aktarır.
yazar|Düşüncelerini metne dönüştürür.|Roman, öykü veya deneme gibi eserler kaleme alır.
şair|Dili ses ve anlam yönünden özenle kullanır.|Dizelerden oluşan şiirler yazar.
ressam|Görsel sanatlarla uğraşır.|Fırça ve boyayla tuval üzerinde resim yapabilir.
heykeltıraş|Üç boyutlu sanat eserleri üretir.|Taş, kil veya metali işleyerek heykel yapar.
müzisyen|Seslerle sanatsal çalışmalar yapar.|Bir çalgı çalar veya müzik icra eder.
besteci|Müzik alanında üretim yapar.|Yeni melodiler ve müzik eserleri oluşturur.
oyuncu|Bir karakteri canlandırır.|Tiyatro sahnesinde veya filmde rol alır.
yönetmen|Bir sanat yapımının bütününü düzenler.|Film çekiminde oyuncuları ve sahnelerin uygulanışını yönlendirir.
fotoğrafçı|Görüntü üretmek için çalışır.|Işık ve kadrajı ayarlayıp fotoğraf çeker.
arkeolog|Geçmişte yaşamış toplumları araştırır.|Kazılarda bulunan eski eşyaları ve yapı kalıntılarını inceler.
astronot|Özel eğitim gerektiren keşif çalışmalarına katılır.|Uzay aracında görev yapar ve uzayda deneyler yürütebilir.
bilimci|Kanıta dayalı araştırmalar yapar.|Gözlem ve deneylerle yeni bilgiler üretmeye çalışır.
kütüphaneci|Bilgi kaynaklarını düzenler.|Kütüphanede kitapların bulunmasına ve ödünç verilmesine yardımcı olur.
postacı|İletişim hizmetinde çalışır.|Mektup ve gönderileri adreslerine dağıtır.
bahçıvan|Bitkilerin bakımıyla ilgilenir.|Bahçeyi düzenler, çiçekleri diker ve budama yapar.
balıkçı|Su ürünleriyle ilgili çalışır.|Olta ya da ağ kullanarak balık tutar.
madenci|Yer altındaki kaynakları çıkarır.|Ocaklarda kömür veya metal cevheri için çalışır.
antrenör|Sporcuların gelişmesine yardımcı olur.|Antrenman programı hazırlar ve takıma çalışma yaptırır.
@Yer şekilleri|Yeryüzünde görülebilen doğal bir oluşumdur.
dağ|Çevresine göre belirgin biçimde yükselir.|Etek, yamaç ve zirve bölümleri olan yüksek yer şeklidir.
tepe|Çevresinden daha yüksekte bulunur.|Dağa göre genellikle daha alçak ve küçük yükseltidir.
vadi|İki yamaç arasında uzanır.|Çoğunlukla içinden akarsu geçen uzun çukurluktur.
ova|Yerleşim ve tarıma uygun olabilir.|Çevresine göre alçakta kalan geniş, düz arazidir.
plato|Üzerinde tarım ve hayvancılık yapılabilir.|Akarsularla yarılmış yüksek düzlüktür.
yayla|Mevsimlik yerleşim görülebilir.|Yazın serinlemek ve hayvan otlatmak için çıkılan yüksek alandır.
ada|Küçük veya çok büyük olabilir.|Her tarafı suyla çevrili kara parçasıdır.
yarımada|Bir bölümü ana karaya bağlıdır.|Üç tarafı suyla çevrili kara parçasıdır.
körfez|Kıyı biçimlerinden biridir.|Denizin karanın içine sokulmuş geniş bölümüdür.
koy|Kıyıda korunaklı bir yer olabilir.|Körfezden genellikle daha küçük deniz girintisidir.
boğaz|İki su alanı arasında bağlantı kurar.|İki kara arasında kalan dar deniz geçididir.
burun|Kıyıda görülen bir kara biçimidir.|Karanın denize doğru uzanan çıkıntısıdır.
delta|Akarsu ağzında oluşabilir.|Akarsuyun taşıdığı malzemeleri biriktirmesiyle gelişen düzlük alandır.
şelale|Akarsuların üzerinde görülebilir.|Suyun yüksekten aşağı döküldüğü doğal basamaktır.
mağara|Doğal süreçlerle oluşur.|Yer altında veya kaya içinde bulunan, girilebilen boşluktur.
kanyon|Akarsu aşındırmasıyla oluşabilir.|Dik yamaçlı, derin ve dar bir vadidir.
volkan|Yer içindeki maddelerle ilişkilidir.|Lav, kül ve gaz püskürtebilen yer şeklidir.
buzul|Soğuk bölgelerde bulunur.|Karın birikerek sıkışmasıyla oluşan, yavaş hareket eden büyük buz kütlesidir.
çöl|Yağışın çok az olduğu bir bölgedir.|Sıcak veya soğuk olabilir; bitki örtüsü genellikle seyrektir.
orman|Birçok canlıya yaşam alanı sağlar.|Geniş bir alanı kaplayan ağaç topluluğudur.
@Sular ve hava olayları|Doğada gözlemlenebilen bir durum veya oluşumdur.
okyanus|Dünya yüzeyinin büyük bölümünü kaplayan sulardandır.|Kıtaları ayıran çok büyük tuzlu su kütlesidir.
deniz|Kıyısında limanlar kurulabilir.|Okyanuslarla bağlantılı veya kısmen kapalı tuzlu su alanıdır.
göl|Karalar arasında bulunur.|Bir çanakta birikmiş, çevresi karayla kuşatılmış su kütlesidir.
ırmak|Bir yatak içinde hareket eder.|Genellikle büyük akarsular için kullanılan addır.
dere|Yağışlarla suyu artabilir.|Irmağa göre genellikle daha küçük akarsudur.
pınar|Suyun doğal olarak ortaya çıktığı yerdir.|Yer altı suyunun yeryüzüne çıktığı kaynaktır.
yağmur|Bulutlardan yere ulaşır.|Sıvı su damlaları hâlindeki yağıştır.
kar|Soğuk havalarda görülür.|Beyaz buz kristalleri biçiminde yeryüzüne düşer.
dolu|Kuvvetli bulutlarda oluşabilir.|Yağışın buz taneleri hâlinde düşmesidir.
sis|Görüş uzaklığını azaltır.|Yere yakın havada asılı duran küçük su damlacıklarıdır.
bulut|Gökyüzünde farklı biçimlerde görülür.|Havada asılı su damlacıkları veya buz kristallerinden oluşur.
rüzgâr|Yelkenleri ve türbinleri hareket ettirebilir.|Havanın bir yerden başka bir yere akışıdır.
fırtına|Ulaşımı ve günlük yaşamı zorlaştırabilir.|Çok kuvvetli rüzgârlarla gelişen hava olayıdır.
hortum|Şiddetli hava olaylarından biridir.|Buluttan yere doğru uzanabilen, hızla dönen hava sütunudur.
şimşek|Fırtınalı havada kısa süreli görünür.|Bulutlar arasında veya bulut içinde oluşan parlak elektrik boşalmasıdır.
yıldırım|Fırtınada oluşan bir elektrik olayıdır.|Bulut ile yer arasında gerçekleşen elektrik boşalmasıdır.
gökkuşağı|Yağıştan sonra görülebilir.|Güneş ışığının su damlalarında oluşturduğu renkli yaydır.
çiy|Sabahları bitkilerin üzerinde görülebilir.|Havadaki su buharının soğuk yüzeyde damlacığa dönüşmesidir.
kırağı|Soğuk sabahlarda yüzeyleri kaplayabilir.|Ot ve yaprak üzerinde oluşan ince buz kristalleridir.
iklim|Bir bölgeyi uzun süre boyunca tanımlar.|Hava koşullarının uzun yıllara ait genel özellikleridir.
@Uzay|Gökyüzü ve uzayla ilgili bir kavramdır.
güneş|Dünya için temel enerji kaynağıdır.|Sistemimizin merkezindeki yıldızdır.
ay|Gökyüzündeki görünümü günlere göre değişir.|Dünya'nın doğal uydusudur.
yıldız|Çok uzaklarda olduğu için küçük görünebilir.|Kendi ışığını üreten sıcak gök cismidir.
gezegen|Bir yıldızın çevresinde dolanır.|Dünya gibi, kendi ışığını üretmeyen büyük gök cismidir.
uydu|Başka bir gök cisminin çevresinde dolanır.|Doğal örneği Ay'dır; insan yapımı olanları da uzaya gönderilir.
galaksi|Çok büyük bir uzay topluluğudur.|Milyarlarca yıldız içerebilir; Samanyolu bir örneğidir.
evren|Uzayla ilgili en geniş kavramlardan biridir.|Bütün maddeyi, enerjiyi, uzayı ve zamanı kapsar.
yörünge|Uzaydaki hareketi anlatır.|Bir gök cisminin başka bir cisim çevresinde izlediği yoldur.
meteor|Atmosferde görülen bir olayla ilişkilidir.|Halk arasında yıldız kayması denilen ışıklı izdir.
göktaşı|Uzaydan gelen bir kaya parçasıdır.|Atmosferden geçip yere ulaşan parçaya verilen addır.
asteroit|Güneş çevresinde dolanan küçük bir gök cismidir.|Birçoğu Mars ile Jüpiter arasındaki kuşakta bulunan kayalık cisimdir.
kuyrukluyıldız|Güneş'e yaklaştığında görünümü değişebilir.|Buz ve toz içeren, parlak kuyruğu oluşabilen gök cismidir.
bulutsu|Uzayın bazı bölgelerinde bulunur.|Gaz ve toz bulutudur; içinde yeni yıldızlar oluşabilir.
teleskop|Uzak gök cisimlerini incelemeyi kolaylaştırır.|Işığı toplayıp büyütülmüş görüntü sağlayan gözlem aracıdır.
roket|Yükleri çok yükseğe taşıyabilir.|Püskürttüğü gazın etkisiyle ilerleyerek uzaya araç götürür.
mekik|Ulaşım için kullanılan bir araç türüdür.|Uzay görevlerinden sonra piste inebilen kanatlı araç olarak da bilinir.
gözlemevi|Gökyüzünü araştırmak için kurulur.|İçinde teleskoplar bulunan bilimsel gözlem yeridir.
astronomi|Bir bilim dalıdır.|Yıldızları, gezegenleri ve diğer gök cisimlerini inceler.
tutulma|Gök cisimlerinin konumuyla oluşur.|Güneş veya Ay'ın başka bir cisim nedeniyle örtülmesi ya da gölgede kalmasıdır.
eksen|Dönme hareketini anlatırken kullanılır.|Dünya'nın kutuplarından geçtiği düşünülen hayalî dönme çizgisidir.
@Fen araçları|Bilimsel ölçüm veya incelemede kullanılır.
mikroskop|Gözün seçemediği ayrıntıları inceletir.|Çok küçük canlı ve yapıları büyüterek gösterir.
termometre|Bir fiziksel büyüklüğü ölçer.|Sıcaklığı dereceyle gösteren araçtır.
barometre|Hava olaylarını izlemekte kullanılabilir.|Açık hava basıncını ölçer.
dinamometre|Ölçüm sırasında yayı uzayabilir.|Kuvveti ölçen araçtır.
ampermetre|Elektrik devresinde kullanılır.|Elektrik akımını amper birimiyle ölçer.
voltmetre|Elektrik devresindeki iki noktaya bağlanır.|Elektrik gerilimini volt birimiyle ölçer.
terazi|Karşılaştırma veya ölçüm yapar.|Eşit kollu türü kütleyi karşılaştırır; mutfakta kullanılan türleri de vardır.
mezura|Ölçüm yapılacak yere göre kıvrılabilir.|Terzilerin kullandığı esnek uzunluk ölçme şerididir.
kronometre|İki olay arasındaki zamanı ölçer.|Başlatılıp durdurularak geçen saniyeleri gösterir.
pusula|Yön bulmayı kolaylaştırır.|Mıknatıslı iğnesi kuzey doğrultusunu gösterir.
mercek|Işığın yönünü değiştirebilir.|Büyüteç ve gözlükte kullanılan eğri yüzeyli saydam parçadır.
prizma|Işık deneylerinde kullanılabilir.|Üçgen cam türü beyaz ışığı renklere ayırabilir.
beher|Laboratuvarda sıvı tutmak için kullanılır.|Dökme ağzı bulunan, genellikle silindir biçimli cam kaptır.
pipet|Az miktarda sıvıyla çalışmayı sağlar.|Laboratuvarda sıvı aktarmaya yarayan ince borudur.
huni|Sıvı aktarırken dökülmeyi azaltır.|Geniş ağzı dar bir boruya açılan araçtır.
mıknatıs|Bazı metallere etki eder.|Demiri çekebilir; kuzey ve güney kutupları vardır.
pil|Taşınabilir cihazlarda kullanılır.|Kimyasal enerjiden elektrik enerjisi sağlayan küçük kaynaktır.
ampul|Elektrik devresine bağlanabilir.|Elektrik enerjisiyle ışık veren aydınlatma parçasıdır.
anahtar|Elektrik devresini kontrol edebilir.|Açılıp kapatılarak akımın geçmesi sağlanır veya kesilir.
kablo|Elektrikli araçlar arasında uzanabilir.|İçindeki iletken tellerle elektrik veya veri taşır.
@Madde ve enerji|Fen derslerinde karşılaşılan bir kavramdır.
atom|Maddenin yapısıyla ilgilidir.|Çekirdek ve elektronlardan oluşan çok küçük yapı birimidir.
molekül|Maddenin tanecikli yapısıyla ilgilidir.|Birbirine bağlı atomlardan oluşan taneciktir.
element|Maddeleri sınıflandırırken kullanılır.|Aynı tür atomlardan oluşan saf maddedir.
bileşik|Saf maddelerden biridir.|Farklı elementlerin belirli oranlarda kimyasal bağ kurmasıyla oluşur.
karışım|Birden çok madde içerir.|Bileşenleri kimyasal kimliklerini korur; tuzlu su buna örnektir.
çözelti|Bir karışım türüdür.|Tuzlu su gibi her yerinde aynı özellik gösteren karışımdır.
yoğunluk|Maddenin ayırt edici özelliklerinden biridir.|Birim hacimdeki kütleyi ifade eder.
kütle|Bir cismin özelliğini anlatır.|Kilogramla ölçülen madde miktarıdır.
hacim|Bir cismin kapladığı yerle ilgilidir.|Litre veya metreküp birimleriyle ifade edilir.
kuvvet|Cisimlerin hareketini değiştirebilir.|İtme veya çekme etkisine verilen addır.
enerji|Değişimlerin gerçekleşmesinde rol oynar.|Hareket, ısı ve ışık gibi farklı biçimlerde bulunabilir.
sürtünme|Hareketli yüzeyler arasında ortaya çıkabilir.|Harekete karşı koyan, ayakkabımızın kaymasını da azaltan etkidir.
yerçekimi|Dünya'nın cisimlere uyguladığı etkiyle ilgilidir.|Bıraktığımız bir cismin yere düşmesine neden olan çekimdir.
basınç|Bir yüzeye etki eden kuvvetle ilgilidir.|Birim alana düşen dik kuvvettir.
ısı|Sıcaklık farkıyla ilişkilidir.|Sıcaktan soğuğa aktarılan enerjidir.
ışık|Çevremizi görmemizi sağlar.|Güneş ve lambadan yayılan, gözümüzün algıladığı enerji türüdür.
ses|Bir kaynaktan çevreye yayılır.|Titreşimlerle oluşur ve kulağımızla algılanır.
buharlaşma|Bir hâl değişimidir.|Sıvının yüzeyinden gaz hâline geçmesidir.
yoğuşma|Soğuk yüzeylerde gözlenebilir.|Gazın sıvı hâline dönüşmesidir.
erime|Isı alan bazı maddelerde gerçekleşir.|Katının sıvıya dönüşmesidir; buzun su olması buna örnektir.
@Matematik|Sayılar veya şekillerle ilgili bir kavramdır.
üçgen|Düzlemde kapalı bir şekildir.|Üç kenarı ve üç köşesi vardır.
kare|Dört kenarlı bir şekildir.|Bütün kenarları eşittir ve dört açısı da diktir.
dikdörtgen|Dört köşeli bir şekildir.|Karşılıklı kenarları eşit, bütün açıları diktir.
çember|Düzlemde eğri bir çizgidir.|Bir merkeze eşit uzaklıktaki noktaların oluşturduğu kapalı çizgidir.
daire|Yuvarlak bir düzlem şeklidir.|Çemberin iç bölgesiyle birlikte oluşturduğu şekildir.
küre|Üç boyutlu bir cisimdir.|Top biçimindedir; yüzeyindeki her nokta merkeze eşit uzaklıktadır.
küp|Üç boyutlu bir geometrik cisimdir.|Altı yüzünün her biri eş kareden oluşur.
koni|Üç boyutlu bir cisimdir.|Dairesel tabanı ve tek tepe noktası vardır; külahı andırır.
silindir|Üç boyutlu bir cisimdir.|Birbirine paralel iki dairesel tabanı vardır; konserve kutusunu andırır.
piramit|Çok yüzlü bir geometrik cisimdir.|Tabanının kenarlarından yükselen üçgen yüzler tek tepede birleşir.
açı|İki doğrultu arasındaki açıklığı anlatır.|Ortak başlangıçlı iki ışının oluşturduğu şekildir.
kenar|Geometrik şekillerde bulunur.|Çokgenin iki komşu köşesini birleştiren doğru parçasıdır.
köşe|Geometrik şekillerin bir parçasıdır.|Çokgende iki kenarın birleştiği noktadır.
çap|Çemberle ilgili bir uzunluktur.|Merkezden geçen, çemberin iki noktasını birleştiren parçadır.
yarıçap|Çemberle ilgili bir ölçüdür.|Merkez ile çember üzerindeki bir nokta arasındaki uzaklıktır.
çevre|Bir şeklin ölçülebilen özelliğidir.|Şeklin sınırının toplam uzunluğudur.
alan|Düzlemde kaplanan bölgeyi anlatır.|Metrekare gibi kareli birimlerle ölçülür.
kesir|Bir sayıyı ifade etme yoludur.|Pay ve paydadan oluşur; bütünün eş parçalarını anlatabilir.
oran|İki miktarı karşılaştırır.|Bir çokluğun diğerine bölünmesiyle ifade edilen ilişkidir.
denklem|Matematiksel bir eşitliktir.|İçindeki bilinmeyenin değerini bulmaya çalışırız.
@Türkçe|Dil ve anlatımla ilgili bir kavramdır.
harf|Yazılı dilin temel işaretidir.|Sesleri göstermek için kullanılır; alfabede sıralanır.
hece|Konuşmanın ses birimlerinden biridir.|Ağzımızdan tek seferde çıkan ses veya ses topluluğudur.
kelime|Anlam taşıyan bir dil birimidir.|Cümle kurarken boşluklarla ayırarak yazdığımız sözcüktür.
cümle|Bir yargı veya düşünce bildirir.|Kelimelerin anlamlı biçimde birleşmesiyle oluşur; büyük harfle başlar.
paragraf|Yazılı anlatımın bir bölümüdür.|Bir düşünce çevresinde birleşen cümlelerden oluşur.
nokta|Bir noktalama işaretidir.|Tamamlanmış cümlelerin sonuna konur.
virgül|Yazıda anlamı düzenler.|Eş görevli kelimeleri ayırabilen, küçük kuyruklu noktalama işaretidir.
ünlem|Duyguları yazıda belirtmeye yardımcı olur.|Sevinç, korku veya şaşkınlık anlatan cümlelerin sonuna konabilir.
tırnak|Yazıda çift olarak kullanılabilir.|Başkasından aynen aktarılan sözlerin başına ve sonuna konulan işarettir.
parantez|Yazıda açıklama eklemeye yarar.|Yay biçimli iki işaret arasına ek bilgi alınır.
alfabe|Bir dilin yazı sistemine aittir.|Harflerin belirli sırayla oluşturduğu bütündür.
sözlük|Bilgi aramak için kullanılan bir kaynaktır.|Kelimelerin anlamlarını genellikle alfabetik sırayla açıklar.
deyim|Söz varlığımızın bir parçasıdır.|Çoğu zaman gerçek anlamından farklı anlam taşıyan kalıplaşmış söz grubudur.
atasözü|Kuşaktan kuşağa aktarılan bir sözdür.|Toplumun deneyimine dayanan, öğüt veren veya yargı bildiren kalıplaşmış sözdür.
anlam|Dil ve iletişimin temel kavramlarından biridir.|Bir kelimenin veya cümlenin ifade ettiği düşünce ya da kavramdır.
zıtlık|Anlamlar arasındaki bir ilişkidir.|Sıcak ile soğuk, uzun ile kısa arasındaki karşıtlıktır.
fiil|Bir sözcük türüdür.|İş, oluş veya durum bildirir; koşmak buna örnektir.
sıfat|Bir sözcük türüdür.|Bir adı niteler veya belirtir; kırmızı kalemdeki kırmızı gibi.
zamir|Bir sözcük türüdür.|Adın yerini tutar; ben, sen ve o buna örnektir.
yüklem|Cümlenin temel ögelerindendir.|Cümlede yargıyı bildiren bölümdür.
@Edebiyat|Yazılı veya sözlü anlatımla ilgili bir kavramdır.
masal|Olağanüstü olaylar anlatabilir.|Bir varmış bir yokmuş diye başlayan, perili ve devli anlatı türüdür.
öykü|Kurmaca bir anlatı türüdür.|Romandan genellikle daha kısa, az sayıda olay ve kişiye odaklanan anlatıdır.
roman|Kurmaca bir edebî türdür.|Kişi, olay, zaman ve mekânı geniş biçimde işleyen uzun anlatıdır.
şiir|Dilin ses ve çağrışımlarından yararlanır.|Genellikle dizeler hâlinde yazılan edebî anlatımdır.
fabl|Ders verme amacı taşıyabilir.|Hayvanların insan gibi konuştuğu kısa anlatı türüdür.
destan|Toplumların geçmişiyle ilgilidir.|Kahramanlıkları ve büyük olayları olağanüstü ögelerle anlatır.
efsane|Bir yer veya olay çevresinde anlatılabilir.|Gerçek olduğuna inanılarak aktarılan, olağanüstülük içerebilen halk anlatısıdır.
bilmece|Eğlendirirken düşündürür.|Bir varlığı dolaylı anlatarak dinleyiciden adını bulmasını ister.
tekerleme|Ses benzerlikleriyle dikkat çeker.|Söylenmesi güç olabilen, uyaklı ve ritmik söz dizisidir.
mani|Halk edebiyatının bir türüdür.|Genellikle dört dizeden oluşan kısa şiirdir.
ninni|Sözlü kültürün bir parçasıdır.|Bebeği uyutmak için ezgiyle söylenen sözlerdir.
mektup|Duygu veya haber iletmek için yazılır.|Hitapla başlayabilir; zarfa konup bir adrese gönderilebilir.
günlük|Kişisel bir yazı türüdür.|Yaşananların tarih belirtilerek günü gününe yazılmasıdır.
anı|Kişisel yaşantıya dayanır.|Geçmişte yaşananların sonradan anlatıldığı yazı türüdür.
deneme|Yazarın düşüncelerini serbestçe işlemesini sağlar.|Bir konuda kesin sonuca varma zorunluluğu olmadan yazılan düşünce yazısıdır.
makale|Bilgi vermek veya görüşü kanıtlamak için yazılır.|Bir konuyu belgeler ve gerekçelerle ele alan yazı türüdür.
biyografi|Bir kişinin hayatını anlatır.|Bir insanın yaşamının başka biri tarafından yazılmasıdır.
otobiyografi|Yaşam öyküsü anlatan bir türdür.|Kişinin kendi hayatını kendisinin yazmasıdır.
röportaj|Araştırma ve görüşme içerebilir.|Bir konu veya kişiyi gözlem ve konuşmalarla tanıtan yazı türüdür.
diyalog|İletişimde ve edebiyatta kullanılır.|İki veya daha fazla kişi arasında karşılıklı konuşmadır.
@Müzik|Ses sanatlarıyla ilgili bir kavram veya araçtır.
piyano|Tuşlu bir müzik aletidir.|Siyah beyaz tuşlarına basılınca içindeki tellere çekiçler vurur.
keman|Yayla çalınan telli bir çalgıdır.|Çene ile omuz arasında tutulan dört telli çalgıdır.
gitar|Telli bir müzik aletidir.|Genellikle altı teli vardır ve kucakta tutularak çalınır.
bağlama|Türk halk müziğinde kullanılır.|Uzun saplı, perdeli ve mızrapla da çalınan telli sazdır.
ud|Telli bir müzik aletidir.|Kısa saplı, perdesiz ve geniş yuvarlak gövdeli çalgıdır.
kanun|Çok sayıda teli olan bir çalgıdır.|Yatay tutulur ve parmaklara takılan mızraplarla çalınır.
arp|Telli bir müzik aletidir.|Üçgen çerçevesindeki farklı uzunlukta teller parmakla çekilir.
flüt|Üflemeli bir çalgıdır.|Delikleri açılıp kapatılan bir boruya hava üflenerek ses çıkarılır.
klarnet|Üflemeli bir müzik aletidir.|Kamışlı ağızlığı ve anahtarlarla kapatılan delikleri vardır.
trompet|Bakır üflemeli çalgılardandır.|Genellikle üç pistonuna basılarak sesleri değiştirilen parlak sesli çalgıdır.
trombon|Bakır üflemeli bir çalgıdır.|Sesleri değiştirmek için ileri geri kayan bir bölümü vardır.
saksafon|Caz müziğinde sık duyulur.|Kamışlı ağızlığı, metal gövdesi ve kıvrık ağzı olan çalgıdır.
davul|Vurmalı bir müzik aletidir.|Gerilmiş derisine tokmak veya çubukla vurularak çalınır.
tef|Elde tutulan vurmalı bir çalgıdır.|Yuvarlak çerçevesinin çevresinde küçük ziller bulunabilir.
zil|Vurmalı çalgılar arasında yer alır.|Metal yüzeyine vurulunca ya da iki parçası çarpıştırılınca çınlar.
nota|Müziği yazıyla göstermeye yarar.|Do, re, mi gibi sesleri belirten işaretlere verilen addır.
ritim|Müzikte düzen duygusu oluşturur.|Ses ve susuşların süre bakımından belirli biçimde tekrarlanmasıdır.
melodi|Müzikte tanınabilir bir bütün oluşturur.|Ardışık seslerden oluşan ezgidir.
koro|Bir müzik topluluğudur.|Birlikte şarkı söyleyen kişilerden oluşur.
orkestra|Bir müzik topluluğudur.|Farklı çalgıları çalan müzisyenler bir şefin yönetiminde birlikte çalar.
@Görsel ve sahne sanatları|Sanat üretimi veya sunumuyla ilgili bir kavramdır.
tuval|Resim yapmak için kullanılan bir yüzeydir.|Çerçeveye gerilmiş kumaş üzerine boya uygulanır.
fırça|Renkleri yüzeye aktarmaya yarar.|Sapının ucunda kıllar veya lifler bulunan resim aracıdır.
palet|Resim yaparken elde tutulabilir.|Boyaların konulup karıştırıldığı düz araçtır.
suluboya|Bir resim tekniği ve malzemesidir.|Su ile inceltilen saydam renklerle kâğıda uygulanır.
pastel|Bir boya türüdür.|Çubuk biçimindeki renkli malzemeyle doğrudan yüzeye çizilir.
heykel|Üç boyutlu bir sanat eseridir.|Taş, kil veya metalden biçimlendirilmiş insan ya da nesne tasviridir.
seramik|Kil kullanılarak üretilir.|Biçim verilen kilin yüksek sıcaklıkta pişirilmesiyle elde edilir.
mozaik|Bir görüntü oluşturma tekniğidir.|Küçük taş, cam veya seramik parçaları yan yana dizilir.
ebru|Geleneksel bir süsleme sanatıdır.|Su yüzeyindeki renkli desenler kâğıda aktarılır.
hat|Geleneksel yazı sanatlarından biridir.|Harfleri estetik biçimde yazma sanatıdır.
tezhip|Kitap süslemede kullanılan bir sanattır.|Sayfalar altın ve renkli motiflerle bezenir.
minyatür|Geleneksel resim türlerinden biridir.|Eski el yazmalarında görülen ince ayrıntılı küçük resimdir.
tiyatro|İzleyici karşısında sunulan bir sanattır.|Oyuncular sahnede karakterleri ve olayları canlandırır.
sahne|Gösterilerde kullanılan bir alandır.|Oyuncuların seyirci karşısında oyunu sergilediği bölümdür.
dekor|Bir gösterinin görsel dünyasını kurar.|Sahnede olayın geçtiği yeri anlatan eşya ve düzenlemelerdir.
kostüm|Sahne veya gösteride kullanılır.|Oyuncunun canlandırdığı kişiye uygun giydiği kıyafettir.
maske|Yüz görünümünü değiştirebilir.|Yüze takılan, başka bir yüzü veya karakteri temsil eden nesnedir.
kukla|Bir gösteri aracıdır.|El, ip veya çubukla hareket ettirilen oyuncak karakterdir.
sinema|Görüntü ve sesle hikâye anlatır.|Filmlerin üretildiği sanat ve bu filmlerin izlendiği salon için kullanılan addır.
animasyon|Hareketli görüntü üretme yöntemidir.|Çizimlerin veya nesne görüntülerinin art arda gösterilmesiyle hareket oluşturulur.
@Spor|Bedensel hareket ve oyunla ilgili bir kavramdır.
futbol|İki takım arasında oynanır.|Oyuncular topu çoğunlukla ayaklarıyla karşı kaleye göndermeye çalışır.
basketbol|Takım hâlinde oynanan bir spordur.|Top, yerden yüksek bir çembere atılarak sayı kazanılır.
voleybol|İki takımın arasında file bulunur.|Top yere düşmeden karşı sahaya ellerle gönderilir.
hentbol|Kaleli bir takım sporudur.|Oyuncular topu elleriyle taşıyıp paslaşarak gol atar.
tenis|Raketle oynanan bir spordur.|Top bir file üzerinden rakibin sahasına gönderilir.
badminton|Raketle oynanır.|Top yerine tüyleri bulunan hafif bir nesne file üzerinden vurulur.
yüzme|Suda yapılan bir spordur.|Serbest, sırtüstü ve kurbağalama gibi stilleri vardır.
atletizm|Birçok yarış dalını kapsar.|Koşu, atlama ve atma dallarının ortak adıdır.
güreş|İki sporcu arasında yapılan bir mücadeledir.|Amaç rakibi kurallara uygun tutuşlarla yere üstün konuma getirmektir.
okçuluk|Hedefe isabet ettirmeye dayanır.|Yay gerilerek ok atılan spordur.
eskrim|İki sporcu özel koruyucu giysilerle yarışır.|Epe, flöre veya kılıçla puan alınan spordur.
kayak|Karlı yüzeyde yapılır.|Ayaklara takılan uzun araçlarla kar üzerinde kayılır.
paten|Denge gerektiren bir etkinliktir.|Ayakkabının altındaki tekerlek veya bıçakla kayılır.
sörf|Dalgalardan yararlanan bir spordur.|Tahta üzerinde durularak suyun üzerinde ilerlenir.
kürek|Suda yapılan bir spordur.|Tekne, uzun saplı palalar suya çekilerek ilerletilir.
yelken|Rüzgârdan yararlanan bir spordur.|Teknenin bez yüzeyine dolan rüzgâr onu hareket ettirir.
satranç|Düşünmeye dayalı bir oyundur.|Şah, vezir, kale ve piyonlar kareli tahta üzerinde hareket eder.
hakem|Spor karşılaşmalarında görev yapar.|Kurallara uyulup uyulmadığını denetler ve karar verir.
kaleci|Bazı takım sporlarında özel bir görevi vardır.|Rakibin topu kaleye sokmasını engellemeye çalışır.
madalya|Başarıyı simgeleyen bir ödüldür.|Yarışma sonunda boyna takılabilir; altın, gümüş ve bronz çeşitleri vardır.
@Ulaşım|Bir yerden başka bir yere gitmekle ilgili araç veya yapıdır.
bisiklet|İnsan gücüyle hareket eder.|İki tekerleği vardır; pedalları çevrilerek kullanılır.
motosiklet|Motorla çalışan bir kara taşıtıdır.|Genellikle iki tekerleği vardır ve sürücüsü kask takar.
otomobil|Kara yolunda yolcu taşır.|Genellikle dört tekerlekli, kişisel kullanım için üretilen motorlu araçtır.
otobüs|Çok sayıda yolcu taşır.|Şehir içinde duraklara uğrayan büyük kara taşıtıdır.
minibüs|Kara yolunda yolcu taşır.|Otobüsten küçük, otomobilden büyük bir yolcu aracıdır.
kamyon|Yük taşımak için kullanılır.|Arkasında geniş kasa bulunan büyük motorlu kara taşıtıdır.
tren|Raylar üzerinde ilerler.|Birbirine bağlı vagonlardan oluşan taşıttır.
tramvay|Şehir içi ulaşımda kullanılır.|Sokaklardaki raylar üzerinde giden toplu taşıma aracıdır.
metro|Büyük şehirlerde yolcu taşır.|Çoğu hattı yer altında bulunan hızlı raylı ulaşım sistemidir.
uçak|Hava ulaşımında kullanılır.|Sabit kanatları ve motorlarıyla uçar.
helikopter|Havada belirli bir noktada durabilir.|Üstündeki dönen pervaneyle yükselen hava aracıdır.
gemi|Su üzerinde ulaşım sağlar.|Denizde yolcu veya yük taşıyan büyük araçtır.
vapur|Özellikle kıyı şehirlerinde yolcu taşır.|Deniz üzerinde iskeleler arasında düzenli sefer yapan taşıttır.
kano|Suda kullanılan küçük bir araçtır.|Dar ve hafif gövdesi kürekle ilerletilir.
feribot|Su üzerinden ulaşım sağlar.|Yolcularla birlikte otomobil gibi araçları da taşıyabilir.
denizaltı|Suda hareket eden bir araçtır.|Suyun altında yol alabilir ve uzun süre kalabilir.
teleferik|Yükseklik farkı olan yerlerde kullanılır.|Kabinleri havada gerili kablolar boyunca ilerler.
asansör|Bina içinde ulaşımı kolaylaştırır.|İnsanları katlar arasında dikey olarak taşıyan kabindir.
köprü|Ulaşım yolunu bir engelin üzerinden geçirir.|Akarsu veya vadi gibi yerlerin iki yakasını birleştirir.
tünel|Ulaşım için açılan bir geçittir.|Dağın veya yerin içinden geçen kapalı yoldur.
@Teknoloji|Bilgiye ulaşmak veya iş yapmak için kullanılan bir araç ya da kavramdır.
bilgisayar|Verileri işleyen elektronik bir cihazdır.|Programlarla çalışır; klavye, ekran ve işlemci gibi parçaları vardır.
klavye|Elektronik cihazlara bilgi girmeyi sağlar.|Üzerindeki harf ve sayı tuşlarına basarak yazı yazılır.
fare|Bilgisayarda yönlendirme sağlar.|Ekrandaki imleci hareket ettirip tıklama yapmaya yarar.
ekran|Görüntüleri kullanıcıya sunar.|Telefon ve bilgisayarda yazı ve resimleri gördüğümüz yüzeydir.
yazıcı|Dijital bilgiyi fiziksel ortama aktarır.|Bilgisayardaki yazı ve resimleri kâğıda basar.
tarayıcı|Görüntüyü bilgisayara aktarabilir.|Kâğıt üzerindeki belgeyi dijital görüntüye dönüştüren cihazdır.
hoparlör|Elektronik cihazlara bağlanabilir.|Elektrik sinyallerini duyabileceğimiz sese dönüştürür.
mikrofon|Sesle ilgili bir cihazdır.|Konuşma veya müziği kaydetmek ya da iletmek için sesi sinyale dönüştürür.
kulaklık|Ses dinlemek için kullanılır.|Kulağa takılır veya kulağın üzerine yerleştirilir.
kamera|Görüntü kaydetmeye yarar.|Fotoğraf veya video çeken cihazdır.
telefon|Uzak kişilerle iletişim kurar.|Arama yapmaya ve sesli konuşmaya yarayan cihazdır.
tablet|Taşınabilir bir elektronik cihazdır.|Dokunmatik ekranlı, telefondan büyük ve çoğunlukla klavyesiz bilgisayardır.
internet|İletişim ve bilgi paylaşımı sağlar.|Dünyadaki bilgisayar ağlarını birbirine bağlayan büyük ağdır.
yazılım|Elektronik cihazların çalışmasını yönlendirir.|Bilgisayara ne yapacağını söyleyen programların genel adıdır.
donanım|Bilgisayar sistemiyle ilgili bir kavramdır.|Ekran ve işlemci gibi fiziksel parçalara verilen ortak addır.
algoritma|Bir sorunu çözmek için hazırlanır.|İşlemlerin adım adım ve belirli sırayla anlatılmasıdır.
şifre|Bilgi güvenliğinde kullanılır.|Bir hesaba girişte yalnızca sahibinin bilmesi gereken gizli karakter dizisidir.
robot|Belirli işleri yerine getirebilir.|Programlanabilen, çevresine fiziksel olarak etki edebilen makinedir.
sensör|Çevredeki değişimleri algılar.|Işık, sıcaklık veya hareketi ölçüp sinyale dönüştüren parçadır.
işlemci|Elektronik cihazın temel parçalarındandır.|Bilgisayardaki komutları yürüten hesaplama birimidir.
@Yerler|İnsanların belirli amaçlarla kullandığı bir yerdir.
okul|Toplumdaki eğitim yapılarındandır.|Öğrencilerin ders görmek için gittiği kurumdur.
kütüphane|Bilgi kaynaklarına erişim sağlar.|Kitapların düzenlendiği, okunup ödünç alınabildiği yerdir.
hastane|Sağlık hizmeti sunulur.|Doktorların hastaları muayene ve tedavi ettiği kurumdur.
eczane|Sağlık ürünleriyle ilgili hizmet verir.|İlaçların eczacı tarafından verildiği yerdir.
müze|Geçmişi veya sanatı tanıtır.|Tarihî eser ve sanat ürünlerinin korunup sergilendiği yerdir.
laboratuvar|Araştırma ve inceleme yapılır.|Deneyler ve ölçümler için düzenlenmiş çalışma yeridir.
atölye|Üretim ve uygulama için kullanılır.|Araç ve malzemelerle eşya veya sanat ürünü yapılan çalışma yeridir.
fabrika|Üretim yapılan bir tesistir.|Makinelerle çok sayıda ürünün üretildiği büyük iş yeridir.
istasyon|Ulaşım sisteminin bir parçasıdır.|Trenlerin yolcu almak veya indirmek için durduğu yerdir.
liman|Su ulaşımında kullanılır.|Gemilerin yanaşıp yolcu veya yük alıp bıraktığı yerdir.
iskele|Kıyıda bulunan bir yapıdır.|Vapurlara binmek için kullanılan, suya doğru uzanabilen yanaşma yeridir.
havalimanı|Hava ulaşımına hizmet eder.|Uçakların inip kalktığı ve yolcu işlemlerinin yapıldığı yerdir.
stadyum|Spor etkinliklerinde kullanılır.|Saha çevresinde çok sayıda seyirci tribünü bulunan yapıdır.
park|Şehir içinde dinlenme olanağı sağlar.|Ağaçlar, yürüyüş yolları ve oyun alanları bulunabilen açık alandır.
bahçe|Bitki yetiştirmek veya dinlenmek için kullanılır.|Bir yapının yanında da bulunabilen çiçekli veya ağaçlı alandır.
meydan|Yerleşim yerinin açık alanlarından biridir.|Sokakların birleştiği geniş, ortak kullanım alanıdır.
çarşı|Alışveriş için kullanılan bir yerdir.|Bir arada bulunan çok sayıda dükkânın oluşturduğu bölgedir.
pazar|Alım satım yapılan bir yerdir.|Belirli günlerde kurulan sebze, meyve ve eşya tezgâhları bulunur.
otel|Yolculuk sırasında kullanılır.|Ücret karşılığında gecelemek için oda sunan işletmedir.
kamp|Doğada geçici konaklama biçimidir.|Çadır kurup bir süre açık havada kalınan düzenlemedir.
@Değerler ve duygular|İnsanların davranışları veya hisleriyle ilgili bir kavramdır.
saygı|Birlikte yaşamayı kolaylaştırır.|Başkalarının haklarına ve sınırlarına özen göstermektir.
sevgi|İnsanları birbirine yaklaştıran bir duygudur.|Birine veya bir şeye bağlılık ve içten ilgi duymaktır.
dostluk|İnsanlar arasında gelişen bir bağdır.|Güven, yakınlık ve karşılıklı destek üzerine kurulan arkadaşlıktır.
dayanışma|Zorluklarla baş etmeyi kolaylaştırır.|Bir grubun üyelerinin birbirine destek olmasıdır.
yardımlaşma|Toplumsal ilişkileri güçlendirir.|İnsanların ihtiyaç anında birbirine yardım etmesidir.
dürüstlük|Güvenilir davranışlarla ilgilidir.|Doğruyu söylemek ve aldatmadan davranmaktır.
adalet|Haklarla ilgili bir değerdir.|Herkese hakkını vermek ve tarafsız davranmaktır.
sabır|Zor durumlarda gerekli olabilir.|Beklerken veya güçlük karşısında dayanıklı ve sakin kalabilmektir.
cesaret|Korkuyla baş etmede rol oynar.|Tehlike veya güçlük karşısında gerekli adımı atabilme gücüdür.
özgüven|Kişinin kendine bakışıyla ilgilidir.|Kendi yeteneklerine ve karar verebilmesine güvenmesidir.
empati|Başkalarını anlamaya yardımcı olur.|Kendini karşısındakinin yerine koyup onun duygularını anlamaya çalışmaktır.
hoşgörü|Farklılıklarla birlikte yaşamayı kolaylaştırır.|Kendinden farklı düşünce ve davranışlara anlayış gösterebilmektir.
sorumluluk|Görevler ve sonuçlarla ilgilidir.|Üstlenilen işi yerine getirmek ve davranışlarının sonuçlarını kabul etmektir.
merak|Öğrenmeyi başlatabilen bir duygudur.|Bir şeyi bilme, anlama ve araştırma isteğidir.
umut|Gelecekle ilgili bir duygudur.|İyi bir şeyin gerçekleşebileceğine yönelik beklentidir.
sevinç|Olumlu bir olayla ortaya çıkabilir.|Güzel haber alınca duyulan mutluluk duygusudur.
özlem|Uzaklıkla ilişkili bir duygudur.|Birini ya da bir yeri yeniden görme isteğidir.
heyecan|Önemli bir olay öncesinde duyulabilir.|Kalbin hızlı atmasıyla da hissedilen yoğun duygusal hareketliliktir.
şaşkınlık|Beklenmedik bir durumda yaşanabilir.|Olan bitene bir an anlam veremeyince duyulan hayret duygusudur.
gurur|Bir başarıyla ortaya çıkabilir.|Kendinin veya yakınının başarısından duyulan kıvançtır.
@Günlük yaşam ve keşif|Günlük yaşamda veya keşiflerde karşılaşılabilir.
harita|Bir yeri tanımayı ve yön bulmayı kolaylaştırır.|Yeryüzünün tamamının veya bölümünün küçültülmüş çizimidir.
atlas|Bilgi edinmek için kullanılan bir kitaptır.|Çeşitli haritaları bir araya getirir.
takvim|Planlama için kullanılır.|Günleri, haftaları ve ayları gösterir.
ajanda|İşleri hatırlamaya yardımcı olur.|Randevu ve günlük planların tarihli sayfalara yazıldığı defterdir.
büyüteç|Küçük ayrıntıları incelemek için kullanılır.|Saplı bir mercekle yakındaki yazı veya nesneleri büyük gösterir.
fener|Karanlıkta işe yarar.|Elde taşınabilen, ışığını istenen yöne tutabildiğimiz araçtır.
çadır|Geçici barınma sağlar.|Kamp yaparken direk ve kumaşla kurulan taşınabilir barınaktır.
matara|Yolculuklarda kullanılır.|Yanımızda su taşımak için kullandığımız kapaklı kaptır.
dürbün|Uzak nesneleri görmeyi kolaylaştırır.|İki gözle bakılan, uzaktaki görüntüyü büyüten araçtır.
bavul|Yolculukta eşya taşır.|Giysilerin yerleştirildiği, kapaklı ve bazen tekerlekli büyük çantadır.
bilet|Bir hizmetten yararlanmayı sağlar.|Yolculuk veya gösteriye giriş hakkını belirten belgedir.
pasaport|Ülkeler arası yolculukta kullanılır.|Kimliği ve vatandaşlığı gösteren resmî seyahat belgesidir.
adres|Bir yeri bulmayı sağlar.|Mahalle, sokak ve bina numarası gibi konum bilgilerinin bütünüdür.
zarf|Bir gönderiyi korur.|Mektubun içine konulduğu, ağzı kapatılan kâğıt kılıftır.
pul|Posta gönderileriyle ilişkilidir.|Posta ücretini göstermek için zarfa yapıştırılan küçük kâğıttır.
paket|Eşyayı taşımaya veya korumaya yarar.|Bir şeyin kâğıt, kutu ya da başka bir malzemeyle sarılmış hâlidir.
şemsiye|Hava koşullarından korunmayı sağlar.|Açıldığında başımızın üzerinde genişleyen, yağmurdan koruyan araçtır.
merdiven|Farklı yüksekliklere ulaşmayı sağlar.|Üzerine basılarak çıkılan veya inilen basamaklardan oluşur.
çekiç|Onarım işlerinde kullanılır.|Sapının ucundaki sert başla çivi çakmaya yarar.
tornavida|Onarımda kullanılan bir el aletidir.|Vidayı döndürerek sıkmaya veya çıkarmaya yarar.
`;
 const puzzles=[]; let category='',opening='';
 for(const line of source.trim().split('\n')){
  if(!line.trim())continue;
  const parts=line.trim().split('|');
  if(parts[0].startsWith('@')){category=parts[0].slice(1);opening=parts[1];continue;}
  const [word,second,third]=parts;
  if(!word||!second||!third)throw new Error('Incomplete secret clue: '+word);
  puzzles.push(Object.freeze({word:word.toLocaleLowerCase('tr-TR').replace(/[âîû]/g,c=>({'â':'a','î':'i','û':'u'}[c])),category,clues:Object.freeze([opening,second,third])}));
 }
 const original=[{"word":"kütüphane","category":"Okul","clues":["Sessizliğin önemli olduğu bir yerdir.","Bilgi arayanların uğrak yeridir.","Kitaplar burada raflarda durur ve ödünç alınabilir."]},{"word":"nokta","category":"Türkçe","clues":["Küçük görünür, önemli bir görevi vardır.","Bazı kısaltmalarda da kullanılır.","Tamamlanmış cümlenin sonuna gelir."]},{"word":"gökkuşağı","category":"Doğa","clues":["Gökyüzünde kısa süreliğine görülebilir.","Yağmur ve güneş bir araya geldiğinde oluşabilir.","Renkli bir yay şeklindedir."]},{"word":"pusula","category":"Keşif","clues":["Yolculuklarda işe yarayan bir araçtır.","Haritayla birlikte kullanılabilir.","İğnesi kuzeyi bulmamıza yardım eder."]},{"word":"masal","category":"Edebiyat","clues":["Olağanüstü olaylar içerebilir.","Kahramanları arasında devler ve periler olabilir.","Bir varmış, bir yokmuş diye başlayabilir."]},{"word":"virgül","category":"Türkçe","clues":["Yazıda anlamı düzenlemeye yardımcı olur.","Eş görevli kelimeleri birbirinden ayırabilir.","Noktaya benzer ama altında küçük bir kuyruğu vardır."]},{"word":"yaprak","category":"Doğa","clues":["Mevsime göre rengi değişebilir.","Bazı ağaçlar sonbaharda onu döker.","Bitkinin ışıkla besin üretmesinde görev alır."]},{"word":"sözlük","category":"Türkçe","clues":["Basılı ya da dijital olabilir.","İçindeki maddeler genellikle alfabetik sıralanır.","Bilmediğin kelimelerin anlamını burada bulursun."]},{"word":"tiyatro","category":"Sanat","clues":["Bir metin izleyici karşısında canlanır.","Sahne, dekor ve oyuncular bir aradadır.","Perde açılır ve oyun başlar."]},{"word":"teleskop","category":"Bilim","clues":["Uzağı gözlemlemeyi kolaylaştırır.","Gözlemevlerinde bulunabilir.","Gezegenleri ve yıldızları incelemek için kullanılır."]},{"word":"dayanışma","category":"Değerler","clues":["Zor işleri birlikte kolaylaştırır.","Bir grubun üyeleri birbirine destek olur.","Yardımlaşma ve birlik duygusuyla ilgilidir."]},{"word":"mektup","category":"İletişim","clues":["Birine duygu ve düşüncelerini iletmenin yoludur.","Hitapla başlayıp imzayla bitebilir.","Zarfa konulup postayla gönderilebilir."]}];
 const seen=new Set();
 const data=Object.freeze([...original,...puzzles].filter(p=>{if(seen.has(p.word))return false;seen.add(p.word);return true;}).map(p=>Object.freeze({...p,clues:Object.freeze([...p.clues])})));
 if(typeof module!=='undefined'&&module.exports)module.exports=data;else window.NoTikSecretWords=data;
})();
