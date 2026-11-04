/* Kleinkram · Garantien mit Ablauf-Erinnerung */
"use strict";
/* ---------- Garantie-Wächter ---------- */
const wEnd=w=>addDays(addMonths(w.buy,+w.months||24),-1);
function syncWarranties(){const t=today();let ch=false;(S.warranties||[]).forEach(w=>{if(!w.buy)return;const end=wEnd(w),k=diff(t,end);
 if(k>=0&&k<=30&&w.lastGen!==end&&!S.tasks.some(x=>x.wid===w.id&&!x.done&&!x.archived)){S.tasks.push({id:uid(),title:`Noch ${k} Tage Garantie: ${w.name}`,cat:'privat',due:end,created:t,postponed:0,started:false,done:null,cost:null,bundle:'',buddy:null,wid:w.id,
  steps:[{t:'Funktioniert noch alles? Einmal durchprobieren',done:false},{t:'Kratzer, Geräusche, Macken notieren',done:false},{t:'Bei Mangel: Kaufbeleg in Kleinkram öffnen und Händler/Hersteller kontaktieren',done:false}]});w.lastGen=end;ch=true}});if(ch)save()}
function warrantySheet(id){const isNew=!id;S.warranties=S.warranties||[];const w=S.warranties.find(x=>x.id===id)||{id:uid(),name:'',buy:today(),months:24,shop:'',price:'',sn:'',note:'',hasImg:false};let img=null;
 sheet(`<h2>${isNew?'Garantie erfassen':esc(w.name)}</h2>
 ${picBtns('wF','Kaufbeleg fotografieren')}<img class="preview-img" id="wI" ${w.hasImg?'':'hidden'} alt="Kaufbeleg">
 <label class="f">Was?<input class="inp" id="wN" value="${esc(w.name)}" placeholder="z. B. Waschmaschine" ${isNew?'autofocus':''}></label>
 <div class="grid2"><label class="f">Gekauft am<input class="inp" type="date" id="wB" value="${w.buy}"></label><label class="f">Garantie<select class="inp" id="wM">${[[6,'6 Monate'],[12,'1 Jahr'],[24,'2 Jahre'],[36,'3 Jahre'],[60,'5 Jahre'],[120,'10 Jahre']].map(([k,l])=>`<option value="${k}" ${+w.months===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <div class="grid2"><label class="f">Händler<input class="inp" id="wS" value="${esc(w.shop)}"></label><label class="f">Preis (€)<input class="inp mono" type="number" step="0.01" inputmode="decimal" id="wP" value="${w.price}"></label></div>
 <label class="f">Seriennummer (optional)<input class="inp mono" id="wR" value="${esc(w.sn)}"></label><label class="f">Notiz<input class="inp" id="wO" value="${esc(w.note)}" placeholder="z. B. Herstellergarantie, Registrierung nötig"></label>
 <p class="small muted">Gesetzliche Gewährleistung beim Händler: 2 Jahre. Herstellergarantien können länger sein. 30 Tage vor Ablauf erinnert Kleinkram dich.</p>
 <div class="row"><button class="btn pri grow" id="wSave">Speichern</button>${isNew?'':'<button class="btn danger" id="wX">Löschen</button>'}</div>`,s=>{
 if(w.hasImg)IDB.get('w-'+w.id).then(src=>{if(src)s.querySelector('#wI').src=src});
 onPic(s,'wF',async f=>{try{const im=await loadImg(f);img=canvasOf(im,1400).toDataURL('image/jpeg',.72);const p=s.querySelector('#wI');p.src=img;p.hidden=false}catch(er){toast('Bild ließ sich nicht öffnen.')}});
 s.querySelector('#wSave').onclick=async()=>{const n=val('wN'),b=val('wB');if(!n||!b){toast('Name und Kaufdatum, bitte.');return}const old=wEnd(w);Object.assign(w,{name:n,buy:b,months:+val('wM'),shop:val('wS'),price:+val('wP')||'',sn:val('wR'),note:val('wO')});if(wEnd(w)!==old)w.lastGen=null;
  if(img){w.hasImg=true;await IDB.put('w-'+w.id,img)}if(isNew){S.warranties.push(w);pts(5,'Garantie erfasst')}save();closeSheet();render();const k=diff(today(),wEnd(w));toast(k<0?'Garantie ist schon abgelaufen':`Garantie bis ${fmtDate(wEnd(w))}`)};
 const x=s.querySelector('#wX');x&&(x.onclick=()=>confirmSheet('Garantie löschen?','Eintrag und Foto verschwinden.','Löschen',()=>{S.warranties=S.warranties.filter(z=>z.id!==w.id);IDB.del('w-'+w.id);save();render()},true))})}
function vGarantie(){const ws=(S.warranties||[]).slice().sort((a,b)=>wEnd(a).localeCompare(wEnd(b)));const t=today();const act=ws.filter(w=>wEnd(w)>=t),old=ws.filter(w=>wEnd(w)<t);
 const row=w=>{const k=diff(t,wEnd(w));return`<div class="li" data-act="warranty" data-id="${w.id}" style="cursor:pointer"><span class="dot" style="${cv('privat')}"></span><div class="grow"><p>${esc(w.name)}</p><p class="small muted">${w.shop?esc(w.shop)+' · ':''}gekauft ${fmtDate(w.buy)}${w.price?' · '+eur(w.price):''}</p></div><span class="chip ${k<0?'':k<=30?'crit':k<=90?'warn':'ok'}">${k<0?'abgelaufen':k<=90?`noch ${k} Tage`:`bis ${fmtDate(wEnd(w))}`}</span></div>`};
 return reg('Garantien',act.length,(act.map(row).join('')||'<div class="empty">Noch nichts erfasst. Fotografier den Kaufbeleg von Waschmaschine, Handy oder Werkzeug. Kleinkram erinnert dich 30 Tage, bevor die Garantie endet.</div>')+`<div class="li"><button class="btn sm" data-act="warranty">Garantie erfassen</button></div>`,true)+(old.length?`<div class="card" style="margin-top:14px"><details><summary>Abgelaufen (${old.length})</summary>${old.map(row).join('')}</details></div>`:'')}
