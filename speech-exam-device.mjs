import {coalescedReader} from './speech-exam-core.mjs';
const STORAGE_KEY = 'notik-approved-speech-device-v1';
const element = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
const button = (text, fn) => {const n=element('button',text);n.type='button';n.onclick=fn;return n;};

export class SpeechDeviceApi {
  constructor(client, teacherToken=()=>null) {this.client=client;this.teacherToken=teacherToken;}
  async call(action,payload={},secret=null) {
    const {data,error}=await this.client.rpc('cl_speech_device_rpc',{p_action:action,p_device_secret:secret,p_teacher_token:secret?null:this.teacherToken(),p_payload:payload});
    if(error || !data?.ok) {
      const messages={code:'Kod geçersiz, süresi dolmuş veya farklı sınıfa ait.',unauthorized:'Bu cihazın onayı yok veya erişimi kaldırıldı.',forbidden:'Bu sınıf için yetkiniz yok.',disabled:'Sınav kurulumu kapalı.',rate_limit:'Çok fazla cihaz isteği var; daha sonra tekrar deneyin.'};
      const e=Error(messages[data?.reason] || 'İşlem tamamlanamadı. Bağlantıyı ve test SQL kurulumunu kontrol edin.');e.code=data?.reason || 'network';throw e;
    }
    return data.value;
  }
  subscribe(topic,notify,state=()=>{}) {
    const channel=this.client.channel(topic).on('broadcast',{event:'changed'},notify).subscribe(status=>{state(status);if(status==='SUBSCRIBED')notify();});
    return ()=>{void this.client.removeChannel(channel);};
  }
}

export function mountDeviceAdmin(root,api,context) {
  const details=element('details',undefined,'se-device-admin se-root'),title=element('summary','Tahtayı bir kez onayla');
  const intro=element('p','Tahtada kronometreyi açıp “Bu tahtayı tanıt” düğmesine basın. Görünen cihaz kodunu bir kez buraya yazın.');
  const code=element('input');code.placeholder='8 haneli cihaz kodu';code.maxLength=12;code.autocomplete='off';code.setAttribute('aria-label','Tahta cihaz kodu');
  const label=element('input');label.placeholder='Tahta adı (isteğe bağlı)';label.maxLength=60;label.setAttribute('aria-label','Tahta adı');
  const status=element('p','', 'se-status');status.setAttribute('role','status');const list=element('div',undefined,'se-device-list');
  let busy=false,disposed=false,loaded=false;
  async function action(fn){if(busy||disposed)return;busy=true;approve.disabled=refresh.disabled=true;try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;approve.disabled=refresh.disabled=false;}}
  async function load(){const items=await api.call('list',context);if(disposed)return;list.replaceChildren();for(const item of items){
    const row=element('div');const revoke=button('Onayı kaldır',()=>action(async()=>{if(!confirm('Bu tahtanın değerlendirme erişimi kaldırılsın mı? Puanlar korunur.'))return;await api.call('revoke',{id:item.id});await load();status.textContent='Tahta onayı kaldırıldı.';}));
    row.append(element('span',item.label),revoke);list.append(row);
  }if(!items.length)list.append(element('p','Bu sınıf ve ders için onaylı tahta yok.'));}
  const approve=button('Tahtayı onayla',()=>action(async()=>{await api.call('approve',{...context,code:code.value,label:label.value});if(disposed)return;code.value='';status.textContent='Tahta onaylandı. Sonraki sınavlarda otomatik bağlanır.';await load();}));
  const refresh=button('Listeyi yenile',()=>action(load));
  const controls=element('div',undefined,'se-device-admin-controls');controls.append(code,label,approve,refresh);
  details.append(title,intro,controls,status,list);root.append(details);
  details.addEventListener('toggle',()=>{if(details.open&&!loaded){loaded=true;void action(load);}});
  return ()=>{disposed=true;details.remove();};
}

// No polling and no credential in Broadcast or URLs. The browser keeps only its
// random device secret. The server decides whether that device can see grades.
export function installAutomaticBoard(timer,api,{parentToken,loadStyles,mountBoard,storage=localStorage}={}) {
  const setup=element('section',undefined,'se-root se-device-setup');setup.hidden=true;
  const note=element('p','Değerlendirme için bu tahtayı bir kez adminden onaylayın.');note.setAttribute('role','status');
  const code=element('output','', 'se-device-code');code.hidden=true;code.setAttribute('aria-label','Cihaz onay kodu');
  const start=button('Bu tahtayı tanıt',()=>void request());
  const retry=button('Yeniden bağlan',()=>{restart();});retry.hidden=true;
  const reset=button('Yeni cihaz onayı iste',()=>{if(!confirm('Bu tarayıcıdaki cihaz kaydı sıfırlansın mı? Yeniden admin onayı gerekir.'))return;try{storage.removeItem(STORAGE_KEY);}catch{}restart();});reset.hidden=true;
  setup.append(note,code,start,retry,reset);timer.querySelector('.speech-stage').append(setup);
  let reader=null,panel=null,activeId=null,secret='',epoch=0,disposed=false,requesting=false,expiryTimer=null,connected=false;
  const subscriptions=new Map();
  function clearPanel(){panel?.();panel=null;activeId=null;}
  function clearSubscriptions(){for(const off of subscriptions.values())off();subscriptions.clear();}
  function stop(){epoch++;reader?.close();reader=null;clearSubscriptions();clearPanel();clearTimeout(expiryTimer);connected=false;setup.hidden=true;}
  function error(message){clearPanel();setup.hidden=false;code.hidden=true;start.hidden=true;retry.hidden=false;reset.hidden=false;note.textContent=message;}
  function watch(topics){
    for(const [topic,off] of subscriptions)if(!topics.includes(topic)){off();subscriptions.delete(topic);}
    for(const topic of topics)if(!subscriptions.has(topic)){
      const current=epoch;
      const off=api.subscribe(topic,()=>{if(current===epoch&&timer.open&&!document.hidden)reader?.trigger();},state=>{
        if(current!==epoch)return;
        if(state!=='SUBSCRIBED'){reader?.invalidate();error('Bağlantı kesildi. Yeniden bağlanınca değerlendirme güncellenecek.');}
      });subscriptions.set(topic,off);
    }
  }
  function apply(value){
    if(!timer.open||disposed)return;
    clearTimeout(expiryTimer);retry.hidden=true;reset.hidden=true;start.disabled=false;requesting=false;
    if(value.status!=='approved'){
      clearPanel();setup.hidden=false;
      const pending=value.status==='pending';code.hidden=!pending;code.textContent=value.code || '';start.hidden=pending;
      note.textContent=pending?'Bu cihaz kodunu adminde “Tahtayı bir kez onayla” bölümüne yazın. Kod 10 dakika geçerlidir.':'Cihaz kodunun süresi doldu. Yeniden kod oluşturun.';
      watch(value.deviceTopic?[value.deviceTopic]:[]);
      if(pending)expiryTimer=setTimeout(()=>{if(timer.open)reader?.trigger();},Math.max(0,value.expiresAt-Date.now()+50));
      return;
    }
    setup.hidden=true;watch([value.deviceTopic,value.scopeTopic]);
    if(!value.exam || value.exam.status!=='active'){clearPanel();return;}
    if(activeId!==value.exam.id){clearPanel();panel=mountBoard(timer,api,null,{managed:true});activeId=value.exam.id;}
    panel.update(value.exam);
  }
  async function restart(){
    stop();if(!timer.open||disposed||!parentToken())return;
    const current=epoch;
    try{await loadStyles();if(current!==epoch||!timer.open)return;secret=storage.getItem(STORAGE_KEY)||'';}
    catch{if(current===epoch)error('Cihaz kaydı veya görünüm yüklenemedi. Tarayıcı depolama iznini kontrol edin.');return;}
    start.disabled=false;requesting=false;
    if(!secret){setup.hidden=false;start.hidden=false;retry.hidden=true;reset.hidden=true;code.hidden=true;note.textContent='Değerlendirme için bu tahtayı bir kez adminden onaylayın.';return;}
    connected=true;
    reader=coalescedReader(()=>api.call('read',{parentToken:parentToken()},secret),value=>{if(current===epoch)apply(value);},e=>{if(current===epoch)error(e.message);});reader.trigger();
  }
  async function request(){
    if(requesting||!timer.open)return;requesting=true;start.disabled=true;const current=epoch;
    try{
      if(!secret){secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');storage.setItem(STORAGE_KEY,secret);}
      await api.call('request',{parentToken:parentToken()},secret);
      if(current===epoch)await restart();
    }catch(e){if(current===epoch){note.textContent=e.message;start.disabled=false;requesting=false;retry.hidden=false;}}
  }
  const observer=new MutationObserver(()=>{if(timer.open&&!connected)void restart();else if(!timer.open)stop();});observer.observe(timer,{attributes:true,attributeFilter:['open']});
  const offline=()=>{if(!timer.open)return;reader?.invalidate();error('İnternet bağlantısı kesildi. Puanlar yeniden doğrulanınca gösterilecek.');};
  const refresh=()=>{if(timer.open&&!document.hidden){if(reader)reader.trigger();else void restart();}};
  const visibility=()=>{if(document.hidden){reader?.invalidate();clearPanel();}else refresh();};
  const storageChanged=event=>{if(event.key===STORAGE_KEY&&timer.open)void restart();};
  const close=()=>stop();
  timer.addEventListener('close',close);window.addEventListener('offline',offline);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility);window.addEventListener('storage',storageChanged);
  if(timer.open)void restart();
  return ()=>{disposed=true;stop();observer.disconnect();timer.removeEventListener('close',close);window.removeEventListener('offline',offline);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('storage',storageChanged);setup.remove();};
}
