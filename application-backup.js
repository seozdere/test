(() => {
 const button=document.getElementById('fullBackupBtn'),status=document.getElementById('fullBackupStatus');
 button.addEventListener('click',async()=>{
  if(button.disabled)return;
  button.disabled=true;status.textContent='Tüm sınıf ve dönem kayıtları alınıyor…';
  try {
   const {data,error}=await _supabase.rpc('cl_export_application_backup',{p_token:ClassLogAuth.getSessionToken()});
   if(error||!data?.ok){status.textContent=data?.reason==='unauthorized'?'Yalnızca sistem yöneticisi yedek indirebilir.':data?.reason==='missing_table'?'Yedek tamamlanamadı: gerekli bir veri tablosu eksik.':'Yedek alınamadı. Bağlantıyı ve 30 numaralı SQL kurulumunu kontrol edin.';return;}
   const required=['classlog_storage','classlog_parent_links','classlog_homework_descriptions','classlog_speech_topics'];
   if(data.format!=='notik-application-backup'||!data.settings||!required.every(t=>Array.isArray(data.tables?.[t])))throw Error('Incomplete backup');
   const studentNumbers={};
   for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('classlog.student-number.v1:'))studentNumbers[key]=localStorage.getItem(key);}
   const backup={...data,local:{studentNumbers},contents:required.map(table=>({table,rows:data.tables[table].length})),notice:'Uygulama veri yedeğidir. Öğretmen hesapları, şifreler, oturumlar, SQL işlevleri ve yetki kuralları dahil değildir. Yerel numaralar yalnızca bu cihazdan alınmıştır.'};
   delete backup.ok;
   const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='NoTik_tam_yedek_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   status.textContent='Yedek dosyası hazırlandı. İndirilenler klasörünü kontrol edin. Veli bağlantılarını içerdiği için dosyayı güvenli saklayın.';
  }catch(_){status.textContent='Yedek tamamlanamadı; dosya oluşturulmadı. Bağlantıyı ve tarayıcı depolama erişimini kontrol edin.';}
  finally{button.disabled=false;}
 });
})();
