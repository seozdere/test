// Plain-text editing; existing save handlers and escaping remain in charge.
(()=>{
 for(const id of ['parentNoticeInput','parentTickerInput','parentPopupInput']){
  const input=document.getElementById(id);if(!input)continue;
  const bar=document.createElement('div');bar.className='announcement-edit-tools';bar.setAttribute('role','group');bar.setAttribute('aria-label','Duyuru metni araçları');
  const message=document.createElement('span');message.className='announcement-edit-hint';message.setAttribute('role','status');message.textContent='Enter: alt satır';
  function replace(text,start=input.selectionStart,end=input.selectionEnd){if(input.maxLength>=0&&input.value.length-end+start+text.length>input.maxLength){message.textContent='Karakter sınırına ulaşıldı.';return;}input.setRangeText(text,start,end,'end');input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));message.textContent='Enter: alt satır';}
  function tool(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);bar.append(b);}
  const emoji=document.createElement('select');emoji.setAttribute('aria-label','Emoji ekle');emoji.add(new Option('😊 Emoji',''));for(const e of ['📌','📢','📚','📝','✅','❗','🎉','😊','🙏','⭐'])emoji.add(new Option(e,e));emoji.onchange=()=>{if(emoji.value)replace(emoji.value);emoji.value='';};bar.append(emoji);
  function list(numbered){const start=input.selectionStart===0?0:input.value.lastIndexOf('\n',input.selectionStart-1)+1;let end=input.value.indexOf('\n',input.selectionEnd);if(end<0)end=input.value.length;const lines=input.value.slice(start,end).split('\n');replace(lines.map((line,i)=>(numbered?(i+1)+'. ':'• ')+line.replace(/^\s*(?:[•*-]|\d+[.)])\s+/, '')).join('\n'),start,end);}
  tool('• Liste',()=>list(false));tool('1. Sıralı liste',()=>list(true));bar.append(message);input.before(bar);
  input.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.isComposing||event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||input.selectionStart!==input.selectionEnd)return;const start=input.selectionStart===0?0:input.value.lastIndexOf('\n',input.selectionStart-1)+1,line=input.value.slice(start,input.selectionStart),match=line.match(/^(\s*)(?:(\d+)[.)]|([•*-]))\s+(.*)$/);if(!match)return;event.preventDefault();if(!match[4])replace('',start,input.selectionStart);else replace('\n'+match[1]+(match[2]?String(Number(match[2])+1)+'.':match[3])+' ');});
 }
})();
