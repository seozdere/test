(() => {
 const context = () => ({p_class_name:ClassLogData.currentClass,p_subject_id:ClassLogData.currentSubject,p_term_id:ClassLogData._teacherTermId()});
 const admin = document.getElementById('speechAdmin');
 if(admin) {
  let loaded=null,revision=0;
  const input=document.getElementById('speechTopicsInput'), save=document.getElementById('speechTopicsSave'), status=document.getElementById('speechAdminStatus');
  const lines=()=>[...new Set(input.value.split(/\r?\n/).map(s=>s.replace(/^\s*\d+[.)-]\s*/, '').trim()).filter(Boolean))];
  function preview(){ const list=document.getElementById('speechTopicsPreview');list.replaceChildren();lines().forEach(s=>{const li=document.createElement('li');li.textContent=s;list.append(li);}); }
  async function load(){save.disabled=true;loaded=null;const ctx=context();status.textContent='Yükleniyor…';try {
   const {data,error}=await _supabase.rpc('cl_get_speech_topics',{p_token:ClassLogAuth.getSessionToken(),...ctx});
   if(error||!data?.ok)throw Error();
   if(JSON.stringify(ctx)!==JSON.stringify(context())) {status.textContent='Sınıf değişti. Listeyi yeniden yükleyin.';return;}
   loaded=ctx;revision=data.revision;input.value=data.topics.join('\n');preview();document.getElementById('speechAdminContext').textContent=ctx.p_class_name+' · '+ctx.p_subject_id;
   save.disabled=false;status.textContent='Kayıtlı konular yüklendi.';
  }catch(_){status.textContent='Konular yüklenemedi. Bağlantıyı ve 28 numaralı SQL kurulumunu kontrol edin.';}}
  input.addEventListener('input',preview);admin.addEventListener('toggle',()=>{if(admin.open)load();});document.getElementById('speechTopicsReload').onclick=load;
  save.onclick=async()=>{
   if(!loaded||JSON.stringify(loaded)!==JSON.stringify(context())) {status.textContent='Sınıf veya ders değişti. Önce kayıtlı listeyi yükleyin; taslağınız korunuyor.';return;}
   const topics=lines();if(topics.length>200||topics.some(s=>s.length>500)){status.textContent='En fazla 200 konu ve konu başına 500 karakter kullanın.';return;}
   save.disabled=true;try {const {data,error}=await _supabase.rpc('cl_save_speech_topics',{p_token:ClassLogAuth.getSessionToken(),...loaded,p_topics:topics,p_expected_revision:revision});if(error||!data?.ok){status.textContent=data?.reason==='conflict'?'Liste başka yerde değişti. Taslağınızı kopyalayıp kayıtlı listeyi yükleyin.':'Kaydedilemedi. Bağlantıyı, yetkinizi ve SQL kurulumunu kontrol edin.';return;}revision=data.revision;status.textContent='Konular kaydedildi. Bir sonraki konu seçiminde güncel liste kullanılır.';}catch(_){status.textContent='Kaydedilemedi. Taslağınız korunuyor.';}finally{save.disabled=false;}
  };
 }
 const pick=document.getElementById('speechTopicPick');if(!pick)return;
 const restart=document.getElementById('speechTopicRestart'), message=document.getElementById('speechTopicMessage'),card=document.getElementById('speechTopicCard');
 let busy=false, scope='',used=new Set();
 function sync(){pick.disabled=busy||speechStarted!==null;restart.disabled=pick.disabled;}
 window.syncSpeechTopicControls=sync;
 function ensureScope(){const key='notik.speech.used:'+JSON.stringify([currentParentToken||ClassLogData.currentClass,ClassLogData.activeTermId,currentSubject]);if(key!==scope){scope=key;try{used=new Set(JSON.parse(sessionStorage.getItem(key)||'[]'));}catch(_){used=new Set();}card.hidden=true;card.textContent='';pick.querySelector('.speech-topic-label').textContent='Konu seç';restart.hidden=false;} }
 function persist(){try{sessionStorage.setItem(scope,JSON.stringify([...used]));}catch(_){}}
 window.restartSpeechTopics=()=>{if(speechStarted!==null||busy)return;ensureScope();used.clear();persist();restart.hidden=false;message.textContent='Konu havuzu yeniden başlatıldı.';};
 window.pickSpeechTopic=async()=>{
  if(speechStarted!==null||busy)return;ensureScope();busy=true;sync();message.textContent='Konular yükleniyor…';const requestedScope=scope;
  try {
   const {data,error}=await _supabase.rpc(currentParentToken?'cl_get_parent_speech_topics':'cl_get_speech_topics',currentParentToken?{p_parent_token:currentParentToken,p_subject_id:currentSubject}:{p_token:ClassLogAuth.getSessionToken(),...context()});
   if(error||!data?.ok)throw Error();
   ensureScope();if(scope!==requestedScope||speechStarted!==null)return;
   const topics=[...new Set(data.topics.filter(s=>typeof s==='string'&&s.trim()))];
   if(!topics.length){message.textContent='Henüz konuşma konusu eklenmedi.';return;}
   const remaining=topics.filter(s=>!used.has(s));
   if(!remaining.length){message.textContent='Tüm konular kullanıldı';restart.hidden=false;return;}
   const topic=remaining[Math.floor(Math.random()*remaining.length)];
   card.hidden=false;card.classList.remove('topic-reveal');card.classList.add('topic-shuffling');
   message.textContent='Konu seçiliyor…';
   card.replaceChildren();
   const deck=document.createElement('span');deck.className='topic-shuffle-deck';deck.setAttribute('aria-hidden','true');
   for(let i=0;i<3;i++){const tile=document.createElement('span');tile.className='topic-shuffle-card';tile.textContent='?';deck.append(tile);}
   card.append(deck);
   await new Promise(resolve=>setTimeout(resolve,2000));
   card.classList.remove('topic-shuffling');
   ensureScope();
   if(scope!==requestedScope||speechStarted!==null||!document.getElementById('speechDialog').open){card.hidden=true;message.textContent='';return;}
   used.add(topic);persist();card.textContent=topic;card.hidden=false;
   card.classList.remove('topic-reveal');void card.offsetWidth;card.classList.add('topic-reveal');pick.querySelector('.speech-topic-label').textContent='Yeni konu';message.textContent='';restart.hidden=false;
  }catch(_){message.textContent='Konular yüklenemedi. Öğretmeniniz bağlantıyı ve konu kurulumunu kontrol edebilir.';}finally{busy=false;sync();}
 };
})();
