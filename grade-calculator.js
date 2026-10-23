(() => {
 const dialog=document.getElementById('gradeDialog');
 const inputs=['gradeWritten','gradeSpeaking','gradeListening'].map(id=>document.getElementById(id));
 const result=document.getElementById('gradeResult'),hint=document.getElementById('gradeHint');
 function update(){
  const values=inputs.map(input=>{const raw=input.value.trim().replace(',','.');const value=/^\d+(\.\d+)?$/.test(raw)?Number(raw):NaN;const valid=Number.isFinite(value)&&value>=0&&value<=100;input.setAttribute('aria-invalid',String(raw!==''&&!valid));return valid?value:null;});
  const invalid=inputs.some(input=>input.getAttribute('aria-invalid')==='true');
  hint.hidden=!invalid;
  hint.textContent=invalid?'0 ile 100 arasında bir not gir.':'';
  result.textContent=!invalid&&values.some(v=>v!==null)?((values[0]??0)*.5+(values[1]??0)*.25+(values[2]??0)*.25).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 }
 inputs.forEach(input=>input.addEventListener('input',update));
 window.openGradeCalculator=()=>{if(dialog.open)return;dialog.showModal();if(dialog.requestFullscreen)dialog.requestFullscreen().catch(()=>{});};
 window.closeGradeCalculator=()=>{if(!dialog.open||dialog.classList.contains('speech-closing'))return;dialog.classList.add('speech-closing');setTimeout(()=>{dialog.close();dialog.classList.remove('speech-closing');if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});},matchMedia('(prefers-reduced-motion: reduce)').matches?0:260);};
 window.resetGradeCalculator=()=>{inputs.forEach(input=>{input.value='';});update();inputs[0].focus();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();window.closeGradeCalculator();});
})();
