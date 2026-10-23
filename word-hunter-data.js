/* Söz Avcısı: original, child-friendly paraphrases of conventional meanings.
   Each distractor is authored for its question, never randomly borrowed.
   Reference and editorial notes: word-hunter-content.md. */
(function(){
'use strict';
const idioms=`
Ağzı açık kalmak|Çok şaşırıp ne diyeceğini bilememek.|Bir haberi herkesten önce öğrenmek.
Ağzından kaçırmak|Saklamak istediği bir bilgiyi istemeden söylemek.|Bir bilgiyi büyük bir dikkatle gizlemek.
Ağzını aramak|Birinin düşüncesini veya bildiğini dolaylı yoldan öğrenmeye çalışmak.|Birine konuşma fırsatı vermemek.
Ağzını bıçak açmamak|Üzüntü veya kızgınlık yüzünden hiç konuşmamak.|Durmadan neşeli hikâyeler anlatmak.
Ağzında bakla ıslanmamak|Sır saklayamayıp bildiklerini söylemek.|Kimseyle hiçbir bilgisini paylaşmamak.
Ağzının suyu akmak|Bir şeyi görüp ona çok imrenmek veya onu çok istemek.|Bir şeyden hoşlanmayıp hemen uzaklaşmak.
Akıl danışmak|Bir konuda birinin görüşünü istemek.|Bir konuda kimseyi dinlemeden karar vermek.
Aklı başına gelmek|Yanlışını anlayıp daha doğru düşünmeye başlamak.|Bildiklerinin hepsini bir anda unutmak.
Aklından çıkmak|Bir şeyi unutmak.|Bir şeyi ayrıntılarıyla hatırlamak.
Aklına koymak|Bir şeyi yapmaya kesin karar vermek.|Bir şeyi yapmaktan tamamen vazgeçmek.
Alın teri dökmek|Bir işi emek vererek yapmak.|Hiç çalışmadan kazanç sağlamak.
Altından kalkmak|Zor bir işi başarıyla sonuçlandırmak.|Bir işi başkasına bırakıp kaçmak.
Aralarından su sızmamak|Birbirine çok yakın ve iyi dost olmak.|Her konuda birbirleriyle tartışmak.
Arka çıkmak|Birini destekleyip korumak.|Birini yalnız bırakıp suçlamak.
Ateş püskürmek|Çok öfkelenip sert sözler söylemek.|Bir durumu sessizce ve sevinçle karşılamak.
Avucunun içi gibi bilmek|Bir yeri veya şeyi çok iyi tanımak.|Bir yer hakkında hiçbir şey bilmemek.
Ayağına gitmek|Görüşmek için birinin bulunduğu yere gitmek.|Birinin gelmesini bekleyip yerinden ayrılmamak.
Ayak uydurmak|Bir duruma veya başkalarının davranışlarına uyum sağlamak.|Her değişikliğe karşı çıkmak.
Ayakları yere basmak|Gerçekçi düşünüp sağlam kararlar vermek.|Gerçekleşmesi imkânsız hayallere kapılmak.
Baş başa vermek|Bir konuyu birlikte düşünüp görüşmek.|Bir sorunu birbirinden gizlemek.
Başına çorap örmek|Birini zor duruma düşürmek için gizlice plan yapmak.|Birinin işini kolaylaştırmak için yardım etmek.
Başının etini yemek|Sürekli konuşup istekte bulunarak birini bunaltmak.|Birinin isteğini sessizce yerine getirmek.
Burnu havada olmak|Kendini üstün görüp başkalarını küçümsemek.|Herkese alçak gönüllülükle yaklaşmak.
Burnundan solumak|Çok öfkeli olmak.|Çok sakin ve rahat olmak.
Burnunun dikine gitmek|Başkalarını dinlemeden kendi istediğini yapmak.|Her kararını başkasına bırakmak.
Can atmak|Bir şeyi yapmayı çok istemek.|Bir işi yapmak istemeyip kaçınmak.
Can kulağıyla dinlemek|Bütün dikkatini vererek dinlemek.|Konuşanı önemsemeyip başka şeylerle ilgilenmek.
Canı çekmek|Bir şeyi istemek, özellikle yemek istemek.|Bir şeyden bıkıp onu istememek.
Canı sıkılmak|Üzülmek, keyfi kaçmak veya sıkılmak.|Çok eğlenip neşelenmek.
Cebi delik olmak|Parası elinde durmamak, çok para harcamak.|Parasının hiçbir bölümünü harcamamak.
Çam devirmek|Farkında olmadan kırıcı veya uygunsuz bir söz söylemek.|Her sözü özenle seçip kimseyi kırmamak.
Çantada keklik|Elde edilmesi kesin veya kolay görülen şey.|Elde edilmesi imkânsız görülen şey.
Çene çalmak|Uzun süre sohbet etmek.|Kimseyle konuşmadan beklemek.
Çorbada tuzu bulunmak|Bir işe küçük de olsa katkı yapmak.|Yapılan bir işe hiçbir katkıda bulunmamak.
Damarına basmak|Birini hassas olduğu konuda kızdırmak.|Birinin hoşuna giden sözlerle onu rahatlatmak.
Darda kalmak|Güç bir duruma düşmek.|Her türlü imkâna kavuşup rahatlamak.
Deliye dönmek|Öfke veya sevinç gibi güçlü bir duyguyla kendini tutamamak.|Hiçbir olaydan etkilenmeden durmak.
Dil dökmek|Birini ikna etmek için çok söz söylemek.|İkna etmekten vazgeçip konuşmayı kesmek.
Dili tutulmak|Şaşkınlık veya korkudan konuşamamak.|Hiç durmadan hızlı hızlı konuşmak.
Dilinde tüy bitmek|Aynı şeyi tekrar tekrar söylemekten usanmak.|Bir konudan ilk kez söz etmek.
Dört gözle beklemek|Birini veya bir şeyi büyük bir istekle beklemek.|Birinin gelmesini hiç istememek.
El ele vermek|Birlik olup yardımlaşmak.|Birbirine yardım etmeyi reddetmek.
El etek çekmek|Bir işle veya çevreyle ilgisini kesmek.|Bir işe daha fazla katılmaya başlamak.
El üstünde tutmak|Birine çok değer verip özen göstermek.|Birini değersiz görüp ilgisiz bırakmak.
Elden ayaktan düşmek|Yaşlılık veya hastalık nedeniyle iş yapamaz hâle gelmek.|Eskisinden daha güçlü ve hareketli olmak.
Eli açık olmak|Cömert davranıp paylaşmayı sevmek.|Sahip olduklarını kimseyle paylaşmamak.
Eli ayağına dolaşmak|Heyecan veya telaş yüzünden ne yapacağını şaşırmak.|Her işi sakince ve planlı yapmak.
Eli boş dönmek|İstediğini elde edemeden geri dönmek.|Aradığı her şeyi elde ederek dönmek.
Eline yüzüne bulaştırmak|Bir işi beceremeyip kötü sonuçlandırmak.|Bir işi kusursuz biçimde bitirmek.
Etekleri zil çalmak|Çok sevinmek.|Derin bir üzüntüye kapılmak.
Göz açıp kapayıncaya kadar|Çok kısa bir sürede.|Çok uzun bir süre boyunca.
Göz boyamak|Bir şeyi olduğundan iyi göstererek aldatmak.|Bir şeyin bütün kusurlarını açıkça anlatmak.
Göz gezdirmek|Bir şeyi ayrıntıya girmeden incelemek.|Bir şeyin her ayrıntısını uzun uzun araştırmak.
Göz kulak olmak|Birini veya bir şeyi gözetip korumak.|Birini tamamen ilgisiz bırakmak.
Göz yummak|Bir kusuru görmezden gelip hoş karşılamak.|Her küçük kusuru hemen cezalandırmak.
Gözden düşmek|Daha önce gördüğü sevgi ve değeri kaybetmek.|İnsanların gözünde daha değerli hâle gelmek.
Göze girmek|Davranışlarıyla beğeni ve güven kazanmak.|Davranışları yüzünden güven kaybetmek.
Gözü arkada kalmak|Geride bıraktığı kişi veya şey için kaygılanmak.|Geride bıraktıkları için hiç kaygı duymamak.
Gözü gibi sakınmak|Bir şeyi büyük bir özenle korumak.|Bir şeyi önemsemeyip zarar görmesine izin vermek.
Gözü korkmak|Bir işin güçlüğünü görüp çekinmek.|Bir işi çok kolay bulup cesaretlenmek.
Gözünü dört açmak|Çok dikkatli olmak.|Dikkatini başka şeylere verip dalgın davranmak.
Gözünde büyütmek|Bir işi olduğundan daha zor veya önemli görmek.|Bir işi olduğundan daha önemsiz görmek.
Gözünden kaçmak|Dikkat etmediği için bir şeyi fark edememek.|Bir ayrıntıyı hemen fark etmek.
Gözleri dolmak|Ağlamak üzere gözlerinde yaş birikmek.|Bir habere gülüp eğlenmek.
Gülmekten kırılmak|Çok gülmek.|Gülmemek için ciddi durmak.
Hapı yutmak|Çok kötü bir duruma düşmek.|Bir sorundan kolayca kurtulmak.
Havadan sudan konuşmak|Önemli olmayan günlük konulardan konuşmak.|Çok önemli bir sorunu ayrıntısıyla tartışmak.
İçi içine sığmamak|Büyük bir sevinç veya heyecan duymak.|Hiçbir heyecan duymadan durmak.
İçi rahat etmek|Kaygısı geçip huzur duymak.|Kaygısının giderek artması.
İçine atmak|Üzüntüsünü veya derdini kimseye anlatmamak.|Derdini karşılaştığı herkese anlatmak.
İğne atsan yere düşmez|Bir yerin çok kalabalık olması.|Bir yerin tamamen boş olması.
İpe un sermek|Bir işi yapmamak için bahaneler ileri sürmek.|Bir işi hemen ve istekle yapmak.
İşin içinden çıkmak|Karmaşık bir sorunu çözmek.|Bir sorunu daha da karmaşık hâle getirmek.
Kabına sığmamak|Coşku veya heyecanını belli etmeden duramamak.|Coşkusunu tamamen kaybetmek.
Kafa yormak|Bir konu üzerinde çok düşünmek.|Bir konuyu hiç düşünmeden geçmek.
Kafasına takmak|Bir şeyi sürekli düşünüp dert etmek.|Bir şeyi hemen unutup önemsememek.
Kalbini kırmak|Birini söz veya davranışla üzmek.|Birini sözleriyle mutlu etmek.
Kan ter içinde kalmak|Yorulup çok terlemek.|Hiç yorulmadan dinlenmek.
Karnı zil çalmak|Çok acıkmak.|Yemek yiyemeyecek kadar tok olmak.
Kaş yapayım derken göz çıkarmak|Düzeltmek isterken daha büyük zarar vermek.|Bir sorunu hiçbir zarara yol açmadan çözmek.
Kılı kırk yarmak|Bir işi en ince ayrıntısına kadar incelemek.|Bir işi ayrıntılara bakmadan yapmak.
Kulak asmak|Bir sözü önemseyip dikkate almak.|Bir sözü hiç önemsememek.
Kulak kabartmak|Bir konuşmayı duymaya çalışarak dikkatle dinlemek.|Bir konuşmayı duymamak için uzaklaşmak.
Kulak misafiri olmak|Kendisine söylenmeyen bir konuşmayı duymak.|Konuşmanın asıl muhatabı olmak.
Küplere binmek|Çok öfkelenmek.|Çok sevinip sakinleşmek.
Lafı ağzında gevelemek|Söylemek istediğini açıkça söyleyememek.|Düşüncesini çok açık ve kısa anlatmak.
Lafı dolandırmak|Asıl söyleyeceğine doğrudan gelmemek.|Asıl konuyu hemen söylemek.
Meydan okumak|Birine karşı koyabileceğini açıkça göstermek.|Birinin karşısında hemen pes etmek.
Pabucu dama atılmak|Daha yenisi çıkınca eski değerini kaybetmek.|Herkesten daha çok ilgi görmeye başlamak.
Pireyi deve yapmak|Küçük bir sorunu çok büyütmek.|Büyük bir sorunu önemsiz saymak.
Renk vermemek|Duygusunu veya düşüncesini belli etmemek.|Duygularını açıkça göstermek.
Saman altından su yürütmek|Yaptığı işi belli etmeden gizlice yürütmek.|Yaptığı her şeyi açıkça duyurmak.
Sinek avlamak|Müşteri olmadığı için boş durmak.|Çok sayıda müşteriyle uğraşmak.
Sözünü tutmak|Verdiği sözü yerine getirmek.|Verdiği sözü bilerek yerine getirmemek.
Tepesi atmak|Birden çok öfkelenmek.|Birden sakinleşip rahatlamak.
Tereyağından kıl çeker gibi|Bir işi kolayca ve pürüzsüz biçimde yapmak.|Bir işi büyük güçlüklerle yapmak.
Toz kondurmamak|Sevdiği biri veya şey hakkında kötü söz söyletmemek.|Birini sürekli kötüleyip eleştirmek.
Yaka silkmek|Bir kişiden veya durumdan bezdiğini göstermek.|Bir kişiyi her gördüğünde sevinmek.
Yol göstermek|Birine nasıl davranacağını veya ne yapacağını anlatmak.|Birinin işini bilerek zorlaştırmak.
Yüreği ağzına gelmek|Birden çok korkmak.|Korkusunu tamamen yenip rahatlamak.
`;
const proverbs=`
Acele işe şeytan karışır.|Aceleyle yapılan işlerde hata yapma ihtimali artar.|Bir iş ne kadar acele yapılırsa o kadar kusursuz olur.
Ağaç yaşken eğilir.|İnsanın eğitimi küçük yaşta daha kolay olur.|İnsan ancak yaşlandıktan sonra eğitilebilir.
Ak akçe kara gün içindir.|Biriktirilen para zor zamanlarda işe yarar.|Biriktirilen para ilk fırsatta gereksiz şeylere harcanmalıdır.
Akıl akıldan üstündür.|Bir başkası bizden daha iyi bir çözüm bulabilir.|Hiç kimse bizden daha iyi bir fikir üretemez.
Akıllı düşman akılsız dosttan hayırlıdır.|Düşüncesiz bir dostun vereceği zarar, akıllı bir düşmanınkinden büyük olabilir.|Bir dostun düşünmeden yaptığı her iş mutlaka yarar sağlar.
Alma mazlumun ahını, çıkar aheste aheste.|Haksızlık yapan kişi bunun kötü sonuçlarıyla sonunda karşılaşır.|Haksızlık yapan kişi hiçbir zaman bunun sonucunu yaşamaz.
Altın çamura düşmekle pul olmaz.|Değerli bir kişi kötü bir duruma düşse de asıl değerini yitirmez.|Bir kişinin değeri yalnızca bulunduğu yere bağlıdır.
Armut dibine düşer.|Çocuklar çoğu zaman ailelerinin özelliklerine benzer özellikler gösterir.|Çocuklar ailelerinden hiçbir özellik almaz.
Aslan yattığı yerden belli olur.|Bir insanın yaşadığı yer, onun düzeni ve kişiliği hakkında fikir verir.|Bir kişinin çevresinin düzeni onun hakkında hiçbir şey göstermez.
Ayağını yorganına göre uzat.|Harcamalarını ve isteklerini imkânlarına göre ayarla.|İmkânların yetmese de dilediğin kadar harca.
Az söyle, çok dinle.|Çok konuşmak yerine dikkatle dinlemeye önem ver.|Başkalarını dinlemeden sürekli konuş.
Azı karar, çoğu zarar.|Bir şeyin ölçülüsü yararlı, aşırısı zararlı olabilir.|Bir şeyin miktarı arttıkça yararı da her zaman artar.
Bakarsan bağ olur, bakmazsan dağ olur.|Emek ve bakım verilen şey gelişir; ilgisiz bırakılan bozulur.|Bir şey hiç ilgilenilmeden daha iyi gelişir.
Bal bal demekle ağız tatlanmaz.|Bir sonucu yalnızca söylemek veya istemek onu gerçekleştirmez.|Bir şeyi söylemek onu gerçekleştirmek için yeterlidir.
Balık baştan kokar.|Bir topluluktaki bozulma çoğu zaman yöneticilerden başlar.|Yöneticilerin davranışları topluluğu hiç etkilemez.
Besle kargayı, oysun gözünü.|İyilik yapılan nankör biri, iyilik edene zarar verebilir.|İyilik yapılan herkes mutlaka karşılığında iyilik yapar.
Bir elin nesi var, iki elin sesi var.|Birlikte çalışarak tek başına yapılamayan işler başarılabilir.|İş birliği yapmak işleri her zaman güçleştirir.
Bir musibet bin nasihatten iyidir.|Yaşanan kötü bir deneyim, birçok öğütten daha etkili ders verebilir.|Kötü bir deneyimden hiçbir şey öğrenilemez.
Birlikten kuvvet doğar.|Birleşip yardımlaşanlar daha güçlü olur.|İnsanlar bir araya geldikçe güçlerini kaybeder.
Bugünün işini yarına bırakma.|Yapman gereken işi gereksiz yere erteleme.|Her işi son güne kadar bekletmek daha iyidir.
Büyük lokma ye, büyük söz söyleme.|Kesin ve iddialı sözler söylemekten kaçın.|Her konuda çok iddialı sözler söylemek gerekir.
Can çıkmayınca huy çıkmaz.|Yerleşmiş alışkanlıkları değiştirmek çok zordur.|İnsanın alışkanlıkları her gün kolayca değişir.
Çivi çiviyi söker.|Güç bir etki, ona benzer başka bir etkiyle giderilebilir.|Hiçbir güçlük başka bir etkiyle giderilemez.
Çok bilen çok yanılır.|Bilgisine fazla güvenen kişi de yanılabilir.|Bilgili bir insanın yanılması imkânsızdır.
Çok gezen çok bilir.|Farklı yerleri görüp deneyim kazanan kişi çok şey öğrenir.|Farklı yerler görmek insana hiçbir şey öğretmez.
Dağ dağa kavuşmaz, insan insana kavuşur.|İnsanlar uzun zaman sonra bile yeniden karşılaşabilir.|Birbirinden ayrılan insanlar bir daha hiç karşılaşamaz.
Damlaya damlaya göl olur.|Küçük birikimler zamanla büyük bir toplam oluşturur.|Küçük birikimler hiçbir zaman önemli bir miktara ulaşmaz.
Davulun sesi uzaktan hoş gelir.|Bir işin zorluklarını yaşamayan kişi onu kolay ve güzel sanabilir.|Bir iş uzaktan zor görünüyorsa mutlaka çok kolaydır.
Demir tavında dövülür.|Bir iş uygun zamanı gelince yapılmalıdır.|Bir iş için uygun zamanı gözetmek gereksizdir.
Denize düşen yılana sarılır.|Çaresiz kalan kişi normalde istemeyeceği birinden bile yardım bekler.|Çaresiz kalan kişi sunulan her yardımı geri çevirir.
Dikensiz gül olmaz.|Güzel şeylerin yanında bazı güçlükler de bulunabilir.|Güzel bir şeyin hiçbir güçlüğü olamaz.
Dost acı söyler.|Gerçek dost, hoşumuza gitmese de yararımıza olan gerçeği söyler.|Gerçek dost her zaman yalnızca hoşumuza giden sözleri söyler.
Dost kara günde belli olur.|Gerçek dost, zor zamanda verdiği destekle anlaşılır.|Dostluk yalnızca eğlenceli günlerde anlaşılır.
El elden üstündür.|Bir işi daha iyi yapabilen başka biri bulunabilir.|Bir işi bizden daha iyi yapan kimse olamaz.
Emek olmadan yemek olmaz.|Geçinmek ve kazanmak için çalışmak gerekir.|Çalışmadan her zaman bol kazanç elde edilir.
Ev alma, komşu al.|Yaşanacak yeri seçerken iyi komşular da önemlidir.|Bir ev seçerken komşuların nasıl olduğu önemsizdir.
Gülü seven dikenine katlanır.|Sevdiğimiz şeyin bazı güçlüklerine de katlanmamız gerekir.|Sevdiğimiz şeyin hiçbir zorluğuna katlanmamalıyız.
Güneş balçıkla sıvanmaz.|Apaçık gerçekler gizlenemez.|Açık bir gerçeği gizlemek her zaman kolaydır.
Hamama giren terler.|Bir işe girişen, o işin gerektirdiği sıkıntı ve giderleri göze almalıdır.|Bir işe başlayan kişi o işin bütün yüklerinden uzak kalır.
Her işte bir hayır vardır.|Kötü görünen bir olayın sonradan yararlı bir yanı ortaya çıkabilir.|Kötü görünen hiçbir olayın yararlı bir yanı olamaz.
Her yiğidin bir yoğurt yiyişi vardır.|Her insanın kendine özgü bir iş yapma yöntemi vardır.|Bütün insanlar her işi aynı yöntemle yapar.
İki dinle, bir söyle.|Konuşmadan önce başkalarını dikkatle dinle.|Dinlemekten çok konuşmaya çalış.
İşleyen demir ışıldar.|Çalışmayı sürdüren kişi canlılığını ve becerisini korur.|Çalışmak insanın bütün becerilerini yok eder.
İyilik eden iyilik bulur.|İyilik yapan kişi çoğunlukla iyilikle karşılık görür.|İyilik yapmak insan ilişkilerine hiçbir katkı sağlamaz.
Keskin sirke küpüne zarar.|Aşırı öfke en çok öfkelenen kişiye zarar verir.|Aşırı öfke kişinin kendisine her zaman yarar sağlar.
Komşu komşunun külüne muhtaçtır.|Yakın yaşayan insanlar küçük ihtiyaçlarda bile birbirine gerek duyar.|Komşular hiçbir konuda birbirine ihtiyaç duymaz.
Lafla peynir gemisi yürümez.|Bir işi başarmak için konuşmak yetmez, çalışmak gerekir.|Bir işi başarmak için yalnızca konuşmak yeterlidir.
Mart kapıdan baktırır, kazma kürek yaktırır.|Mart ayında beklenmedik ve sert soğuklar olabilir.|Mart ayında soğuk hava görülmesi imkânsızdır.
Ne ekersen onu biçersin.|Davranışlarının iyi veya kötü sonuçlarıyla karşılaşırsın.|Davranışlarının sonuçları üzerinde hiçbir etkisi yoktur.
Öfkeyle kalkan zararla oturur.|Öfkeyle davranan kişi sonunda zarar görebilir.|Öfkeyle verilen her karar iyi sonuçlanır.
Sabrın sonu selamettir.|Güçlüklere sabırla dayanmak sonunda rahatlık getirebilir.|Sabretmek hiçbir zaman iyi sonuç vermez.
Sakla samanı, gelir zamanı.|Önemsiz görünen bir şey ileride işe yarayabilir.|Şimdi kullanılmayan her şey hemen atılmalıdır.
Söz gümüşse sükût altındır.|Bazen susmak, konuşmaktan daha değerli olabilir.|Her durumda susmadan konuşmak daha değerlidir.
Sütten ağzı yanan yoğurdu üfleyerek yer.|Kötü deneyim yaşayan kişi benzer durumlarda çok temkinli olur.|Kötü deneyim yaşayan kişi aynı konuda daha dikkatsiz olur.
Tatlı dil yılanı deliğinden çıkarır.|Nazik ve gönül alıcı sözler zor kişileri bile yumuşatabilir.|İnsanları ikna etmenin tek yolu sert konuşmaktır.
Taşıma su ile değirmen dönmez.|Sürekli bir iş, geçici ve yetersiz desteklerle sürdürülemez.|Sürekli bir iş için düzenli bir kaynağa gerek yoktur.
Tek kanatla kuş uçmaz.|Bazı işler yardım ve iş birliği olmadan başarılamaz.|Her iş tek başına ve yardım almadan yapılmalıdır.
Terzi kendi söküğünü dikemez.|Bir kişi başkalarına yaptığı işi kendi ihtiyacı için ihmal edebilir.|Bir kişi kendi işlerini her zaman başkalarınınkinden önce bitirir.
Üzüm üzüme baka baka kararır.|Birlikte vakit geçiren insanlar birbirlerinin davranışlarından etkilenir.|Birlikte yaşayan insanlar birbirini hiç etkilemez.
Yalancının mumu yatsıya kadar yanar.|Yalan uzun süre gizli kalmaz, sonunda ortaya çıkar.|Bir yalan söylendiğinde gerçeği artık kimse öğrenemez.
Yalnız taş duvar olmaz.|Büyük işler için başkalarının desteği de gerekir.|Bütün büyük işler tek kişinin gücüyle kolayca yapılır.
Yazın başı pişenin kışın aşı pişer.|Uygun zamanda çalışıp hazırlık yapan, zor zamanda rahat eder.|İyi zamanlarda hiç çalışmayan, zor zamanda daha rahat eder.
Yerin kulağı var.|Gizli konuşmalar beklenmedik kişilerce duyulabilir.|Gizli bir konuşmayı başka birinin duyması imkânsızdır.
Yuvarlanan taş yosun tutmaz.|Sürekli yer veya iş değiştiren kişi düzen kurup birikim yapmakta zorlanır.|Sürekli iş değiştirmek düzen kurmanın en kolay yoludur.
Zararın neresinden dönülse kârdır.|Zararlı bir işi bırakmak, zararın artmasını önler.|Zararlı bir işe başladıysan sonuna kadar sürdürmelisin.
Aç ayı oynamaz.|İş yapması beklenen kişinin temel ihtiyaçları karşılanmalıdır.|Birinden iş beklerken ihtiyaçlarını önemsememek gerekir.
Aç tavuk kendini buğday ambarında sanır.|İnsan, çok istediği şeylere kavuştuğunu hayal edebilir.|İnsan hiçbir zaman sahip olmadığı şeyleri hayal etmez.
Akan su yosun tutmaz.|Sürekli çalışan ve etkin olan kişi canlılığını korur.|Etkin olmak insanın gelişmesini engeller.
Alışkanlık ikinci tabiattır.|Yerleşen alışkanlıklar kişinin karakteri gibi kalıcı olur.|Alışkanlıklar kişinin davranışlarını hiç etkilemez.
Anlayana sivrisinek saz, anlamayana davul zurna az.|Anlayışlı kişiye küçük bir işaret yeter; anlamak istemeyene çok açıklama yetmez.|Herkes bir konuyu aynı açıklamayla aynı hızda anlar.
At binenin, kılıç kuşananın.|Bir işi başarmak, o işteki beceri ve yeteneğe bağlıdır.|Bir işi başarmak için o işin becerisine gerek yoktur.
Az veren candan, çok veren maldan.|İmkânı az kişinin küçük yardımı da içten ve değerli olabilir.|Yalnızca büyük miktardaki yardımlar değerlidir.
Başa gelen çekilir.|Kaçınılamayan bir sıkıntıya dayanmak gerekir.|İnsan hiçbir sıkıntıyla karşılaşmaz.
Bin dost az, bir düşman çok.|Çok dost yararlıdır; tek bir düşman bile sıkıntı yaratabilir.|Dostların çokluğu zararlıdır, düşman edinmek yararlıdır.
Bir koltukta iki karpuz taşınmaz.|İki büyük işi aynı anda yürütmek güçtür.|Birçok zor işi aynı anda yapmak her zaman daha kolaydır.
Bir söyle, iki düşün.|Konuşmadan önce sözünün sonucunu düşün.|Aklına gelen her şeyi düşünmeden söyle.
Perşembenin gelişi çarşambadan bellidir.|Bir olayın nasıl sonuçlanacağı önceki belirtilerden anlaşılabilir.|Bir olayın öncesindeki belirtiler sonucu hakkında hiçbir fikir vermez.
Boş çuval ayakta durmaz.|İnsanın çalışabilmesi için temel ihtiyaçlarının karşılanması gerekir.|İnsan hiçbir ihtiyacı karşılanmadan her işi rahatça yapabilir.
Bülbülü altın kafese koymuşlar, ah vatanım demiş.|İnsan rahat yaşasa da yurduna ve alıştığı yere özlem duyabilir.|Rahat bir yere taşınan kişi yurdunu mutlaka unutur.
Çobansız koyunu kurt kapar.|Gözetimsiz bırakılan kişi veya topluluk zarar görebilir.|Bir topluluk hiç gözetilmediğinde her tehlikeden korunur.
Dağ ne kadar yüce olsa yol üstünden aşar.|Çok büyük görünen güçlükleri aşmanın da bir yolu bulunabilir.|Büyük güçlüklerin hiçbir çözüm yolu yoktur.
Sora sora Bağdat bulunur.|Bilmediğin bir işi veya yolu sorarak öğrenebilirsin.|Bilmediğin bir konuda soru sormak öğrenmeyi engeller.
Doğru söyleyeni dokuz köyden kovarlar.|Gerçekleri açıkça söyleyen kişi, hoşlanmayanların tepkisiyle karşılaşabilir.|Doğruyu söyleyen kişi her durumda herkes tarafından alkışlanır.
Düşmez kalkmaz bir Allah.|Her insan güç duruma düşebilir veya hata yapabilir.|Bazı insanların hata yapması ve zor duruma düşmesi imkânsızdır.
Eğri otur, doğru söyle.|İçinde bulunduğun durum ne olursa olsun gerçeği söyle.|Kendi çıkarın için gerçeği sakla.
Emanete hıyanet olmaz.|Koruman için verilen şeye dürüstçe sahip çıkmalısın.|Emanet edilen şeyi istediğin gibi zarar vererek kullanabilirsin.
Görünen köy kılavuz istemez.|Açıkça belli olan bir gerçeği anlamak için açıklama gerekmez.|Açık gerçekleri anlamak için mutlaka uzun açıklamalar gerekir.
Güvenme varlığa, düşersin darlığa.|Zenginliğin hep süreceğini sanıp tedbirsiz davranma.|Zengin olan kişi hiçbir zaman maddi güçlük yaşamaz.
Her çok azdan olur.|Büyük birikimler küçük başlangıçlarla oluşur.|Büyük birikimler küçük katkılarla oluşamaz.
Her parlayan altın değildir.|Çekici görünen her şey gerçekten değerli olmayabilir.|Güzel görünen her şey mutlaka çok değerlidir.
Ucuz etin yahnisi yavan olur.|Çok ucuz olduğu için alınan kalitesiz şey beklenen yararı sağlamayabilir.|Bir şey ne kadar ucuzsa kalitesi mutlaka o kadar yüksektir.
İnsan yedisinde ne ise yetmişinde de odur.|Küçük yaşta edinilen huylar ileri yaşlarda da sürebilir.|Çocuklukta edinilen huyların ileriki yaşlarla ilgisi yoktur.
İyilik yap denize at.|İyiliği karşılık beklemeden yap.|İyiliği yalnızca ödül alacağından eminsen yap.
Ateş olmayan yerden duman çıkmaz.|Bir olayla ilgili söylentinin ortaya çıkmasına yol açan bir belirti vardır.|Her söylenti hiçbir belirti olmadan ortaya çıkar.
Kaz gelen yerden tavuk esirgenmez.|Büyük bir yarar sağlanacak iş için küçük bir giderden kaçınılmaz.|Büyük bir kazanç için bile küçük bir gider yapılmamalıdır.
Ateş düştüğü yeri yakar.|Bir acıyı en derinden o acıyı yaşayanlar hisseder.|Bir acıyı uzaktaki kişiler her zaman daha derinden hisseder.
Kurunun yanında yaş da yanar.|Suçlularla birlikte suçsuzlar da zarar görebilir.|Bir olayda yalnızca suçlular zarar görür.
Minareyi çalan kılıfını hazırlar.|Büyük bir yanlış yapan kişi onu gizleyecek bahaneyi önceden düşünür.|Yanlış yapan kişi yaptığı işi gizlemeyi hiç düşünmez.
Rüzgâr eken fırtına biçer.|Kötülük çıkaran kişi daha büyük kötülüklerle karşılaşabilir.|Kötülük yapmak her zaman huzur getirir.
Son pişmanlık fayda vermez.|İş bittikten sonra pişman olmak yapılan zararı geri alamaz.|Bir işin sonunda pişman olmak bütün zararı kendiliğinden düzeltir.
`;
const parse=(text,kind,prefix)=>text.trim().split('\n').map((line,i)=>{const [term,meaning,wrong]=line.split('|');return Object.freeze({id:prefix+(i+1),kind,term,meaning,wrong});});
window.NoTikWordHunterBank=Object.freeze([...parse(idioms,'Deyim','d'),...parse(proverbs,'Atasözü','a')]);
})();
