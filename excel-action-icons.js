// Shared decorative icons for dynamically opened Excel panels.
(()=>{
 const paths={listen:'M4 4h10M4 8h7M4 20h16M14 5l3-3 5 5-3 3M8 16l1-5 8-8 5 5-8 8-6 1Z',reload:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1',download:'M12 3v11m-4-4 4 4 4-4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',share:'M8 11l8-5M8 13l8 5M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0',depo:'M7 17H6a4 4 0 0 1-1-7.9 7 7 0 0 1 13.6-1.4A4.7 4.7 0 0 1 19 17h-2M12 21V11m-4 4 4-4 4 4'};
 const selectors={listen:'[data-entry-listen]',reload:'[data-entry-reload]',download:'[data-entry-download],.se-action-download,.duty-export-actions [data-action="excel"],.duty-export-actions [data-action="excelMonth"]',share:'[data-entry-share],.se-action-share,.duty-export-actions [data-action^="shareExcel"]',depo:'[data-entry-depo],.se-action-depo,.duty-export-actions [data-action^="depoExcel"]'};
 function decorate(root){if(!(root instanceof Element))return;for(const [kind,selector] of Object.entries(selectors)){
  const items=[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const button of items){if(button.dataset.excelIcon)continue;button.dataset.excelIcon=kind;button.classList.add('excel-icon-button');
   button.querySelectorAll(':scope > svg').forEach(n=>n.remove());
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('excel-action-icon');
   const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[kind]);svg.append(path);
   if(!button.querySelector(':scope > span')){const label=document.createElement('span');label.textContent=button.textContent;button.replaceChildren(label);}button.prepend(svg);
  }
 }}
 decorate(document.body);new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)decorate(node);}).observe(document.body,{childList:true,subtree:true});
})();
