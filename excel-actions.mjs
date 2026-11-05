export const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DEPO_ORIGIN='https://deppo.netlify.app';
let style;
function shareFailure(error){
 const code=error?.name||'Bilinmeyen hata';
 const reason={NotAllowedError:'Tarayıcı dosya türünü, paylaşım iznini veya dokunma süresini reddetti. Dosya paylaşımı bu cihazda engellenmiş olabilir.',TypeError:'Tarayıcı bu dosyayı paylaşamıyor.',DataError:'İşletim sistemi dosyayı paylaşım uygulamasına aktaramadı.',InvalidStateError:'Başka bir paylaşım işlemi açık veya sayfa etkin değil.'}[code]||'Paylaşım menüsü açılamadı.';
 return reason+' ('+code+') Dosyayı indirip Dosyalar uygulamasından paylaşabilirsiniz.';
}
function downloadPrepared(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

export function excelFile(bytes,name){return new File([bytes],name,{type:XLSX_MIME});}
// Try native sharing directly; offer a fresh gesture only if the browser rejects it.
export async function presentExcel(file,mode){
 if(mode==='pdf'||mode==='share'){file=await (await import('./workbook-pdf.mjs?v=1')).workbookPdf(file);if(mode==='pdf'){downloadPrepared(file);return;}}
 let shareError='';
 if(mode==='share'&&navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file]});return;}catch(e){if(e.name==='AbortError')return;shareError=shareFailure(e);}
 }

 if(!style)style=document.getElementById('excel-actions-style');
 if(!style){style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./excel-actions.css?v=2',import.meta.url);document.head.append(style);}
 const dialog=document.createElement('dialog');dialog.className='excel-transfer';
 const heading=document.createElement('h3'),name=document.createElement('p'),status=document.createElement('p'),actions=document.createElement('div'),go=document.createElement('button'),close=document.createElement('button');
 heading.textContent=mode==='share'?'PDF paylaş':'Depo’ya kaydet';name.textContent=file.name;status.setAttribute('role','status');go.type=close.type='button';go.textContent=mode==='share'?'Paylaşım menüsünü aç':'Depo’ya bağlan';close.textContent='Kapat';actions.append(go,close);if(mode==='share'){const fallback=document.createElement('button');fallback.type='button';fallback.textContent='PDF indir';fallback.onclick=()=>downloadPrepared(file);actions.insertBefore(fallback,close);}dialog.append(heading,name,status,actions);document.body.append(dialog);
 let cleanup=()=>{},busy=false;
 const finish=()=>{if(busy&&mode==='share')return;cleanup();dialog.close();dialog.remove();};close.onclick=finish;dialog.oncancel=e=>{e.preventDefault();finish();};
 if(mode==='depo'&&!['https://bbgmko.netlify.app','https://seozdere.github.io'].includes(location.origin)){go.disabled=true;status.textContent='Depo bağlantısı yalnızca canlı NoTik adresinde kullanılabilir.';}
 if(shareError)status.textContent=shareError;
 if(mode==='share'&&(!navigator.share||!navigator.canShare?.({files:[file]}))){go.disabled=true;status.textContent='Bu tarayıcı PDF dosyası paylaşımını desteklemiyor veya paylaşım izni kapalı. Dosyayı indirip telefonun Dosyalar uygulamasından paylaşabilirsiniz.';}
 go.onclick=async()=>{
  if(busy)return;
  busy=true;go.disabled=true;dialog.querySelector('select')?.setAttribute('disabled','');
  if(mode==='share'){
   try{await navigator.share({files:[file]});status.textContent='Paylaşım menüsüne gönderildi.';}catch(e){status.textContent=e.name==='AbortError'?'Paylaşım iptal edildi.':shareFailure(e);}finally{busy=false;go.disabled=false;}return;
  }
  const id=crypto.randomUUID();let popup,sent=false;
  const send=(type)=>popup.postMessage({type,id,file},DEPO_ORIGIN);
  const listener=e=>{
   if(e.origin!==DEPO_ORIGIN||e.source!==popup||e.data?.id!==id)return;
   if(e.data.type==='notik-ready'&&!sent){sent=true;send('notik-file');status.textContent='Dosya Depo’ya iletildi. Depo penceresinde klasörü seçip kaydedin.';}
   if(e.data.type==='notik-result'){
    cleanup();busy=false;
    status.textContent=e.data.ok?'Dosya Depo’ya kaydedildi.':(e.data.uncertain?'Yükleme sonucu doğrulanamadı. Tekrar göndermeden Depo dosya listesini kontrol edin.':'Depo aktarımı tamamlanamadı. Depo penceresindeki açıklamayı kontrol edin.');
   }
  };
  window.addEventListener('message',listener);
  popup=window.open(`${DEPO_ORIGIN}/notik-import.html#${new URLSearchParams({origin:location.origin,id})}`,'_blank','popup,width=600,height=720');
  if(!popup){window.removeEventListener('message',listener);busy=false;go.disabled=false;status.textContent='Depo penceresi engellendi. Bu site için açılır pencereye izin verin.';return;}
  status.textContent='Depo açıldı. Gerekirse mevcut Depo hesabınızla giriş yapın.';
  const timer=setTimeout(()=>{cleanup();busy=false;status.textContent='Aktarım süresi doldu. Yeniden göndermeden önce Depo’daki sonucu kontrol edin.';},10*60*1000);
  const closed=setInterval(()=>{if(popup.closed){cleanup();busy=false;status.textContent='Depo penceresi kapandı. Yeniden göndermeden önce dosya listesini kontrol edin.';}},1500);
  cleanup=()=>{clearTimeout(timer);clearInterval(closed);window.removeEventListener('message',listener);};
 };
 if(mode==='depo'){const format=document.createElement('select');format.setAttribute('aria-label','Dosya biçimi');format.innerHTML='<option value="xlsx">Excel (.xlsx)</option><option value="pdf">PDF (.pdf)</option>';dialog.insertBefore(format,actions);const original=file;format.onchange=async()=>{go.disabled=true;format.disabled=true;try{file=format.value==='pdf'?await (await import('./workbook-pdf.mjs?v=1')).workbookPdf(original):original;name.textContent=file.name;}catch(e){status.textContent=e.message;format.value='xlsx';file=original;}finally{go.disabled=false;format.disabled=false;}};}
 dialog.showModal();
}
