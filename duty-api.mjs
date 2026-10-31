const messages={disabled:'Nöbet sistemi henüz etkinleştirilmemiş. SQL kurulumu tamamlanmalı.',unauthorized:'Oturum veya veli bağlantısı geçerli değil.',forbidden:'Bu sınıf için yetkiniz yok.',conflict:'Başka bir işlem verileri değiştirdi. Güncel listeyi yükleyip yeniden önizleyin.'};
export class DutyApi{
 constructor(client,token,parent=false){this.client=client;this.token=token;this.parent=parent;this.failed=null;this.busy=false;}
 async call(action,payload={}){const token=this.token();if(!token)throw Error(messages.unauthorized);const {data,error}=await this.client.rpc(this.parent?'cl_duty_parent':'cl_duty_rpc',this.parent?{p_parent_token:token,p_year_id:payload.yearId||null}:{p_token:token,p_action:action,p_payload:payload});if(error||!data?.ok){const e=Error(messages[data?.reason]||error?.message||'Nöbet işlemi tamamlanamadı.');e.code=data?.reason||error?.code;throw e;}return data;}
 async read(action,payload){return (await this.call(action,payload)).value;}
 async write(action,payload){if(this.parent)throw Error('Salt okunur erişim');if(this.busy)throw Error('Önceki kayıt sürüyor.');if(this.failed)throw Error('Önce sonuçlanmamış işlemi tekrar deneyin veya güncel veriyi yükleyin.');const job={action,payload:{...payload,operationId:crypto.randomUUID()}};return this.send(job);}
 async send(job){this.busy=true;try{const r=await this.call(job.action,job.payload);this.failed=null;return r.replayed?await this.read('get',{yearId:r.yearId}):r.value;}catch(e){if(e.code==='conflict'||e.code==='P0001'||e.code==='23505'||e.code==='23514')this.failed=null;else this.failed=job;throw e;}finally{this.busy=false;}}
 retry(){if(!this.failed)throw Error('Tekrar edilecek işlem yok');return this.send(this.failed);}
 subscribe(year,callback){if(!this.client.channel)return ()=>{};const channel=this.client.channel('duty_change_'+year).on('broadcast',{event:'changed'},({payload})=>callback(payload?.revision));channel.subscribe();return ()=>this.client.removeChannel(channel);}
}
