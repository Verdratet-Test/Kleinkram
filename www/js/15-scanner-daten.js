/* Kleinkram · Foto-Scanner, Texterkennung, Spar-Topf, Sicherung */
"use strict";
/* ---------- Scanner ---------- */
function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=u})}
function canvasOf(im,max){const s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c}
async function readQR(im){try{if('BarcodeDetector' in window){const bd=new BarcodeDetector({formats:['qr_code']});const r=await bd.detect(im);if(r&&r[0])return r[0].rawValue}}catch(e){}
 if(typeof jsQR==='function'){for(const m of[1600,1100,800]){const c=canvasOf(im,m);const d=c.getContext('2d').getImageData(0,0,c.width,c.height);const q=jsQR(d.data,c.width,c.height,{inversionAttempts:'attemptBoth'});if(q&&q.data)return q.data}}return null}
async function readText(im){try{if('TextDetector' in window){const r=await new TextDetector().detect(im);if(r&&r.length)return r.map(x=>x.rawValue).join('\n')}}catch(e){}return null}
let TESS=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function prepCanvas(im){const c=canvasOf(im,2200),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height),a=d.data;let lo=255,hi=0;const g=new Uint8Array(a.length/4);
 for(let i=0,j=0;i<a.length;i+=4,j++){const v=(a[i]*.3+a[i+1]*.59+a[i+2]*.11)|0;g[j]=v;if(v<lo)lo=v;if(v>hi)hi=v}const k=255/Math.max(1,hi-lo);
 for(let i=0,j=0;i<a.length;i+=4,j++){const v=Math.max(0,Math.min(255,(g[j]-lo)*k));a[i]=a[i+1]=a[i+2]=v}x.putImageData(d,0,0);return c}
const OCRMSG={'loading tesseract core':'Lade Texterkennung …','initializing tesseract':'Starte Texterkennung …','loading language traineddata':'Lade deutsches Wörterbuch …','initializing api':'Starte Texterkennung …','recognizing text':'Lese den Text …'};
let TESSPROG=null;
async function tessWorker(onProg){TESSPROG=onProg||null;if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 const logger=m=>TESSPROG&&TESSPROG(OCRMSG[m.status]||'Arbeite …',m.progress||0);
 if(!TESS){try{TESS=await Tesseract.createWorker('deu',1,{logger,langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/deu/4.0.0_best_int'})}catch(e){TESS=await Tesseract.createWorker('deu',1,{logger})}}
 return TESS}
/* Auf dem Handy: Texterkennung von Google (ML Kit) im Gerät, ohne Internet */
async function nativeOCR(cv){const r=await CapP('Texterkennung').erkennen({image:cv.toDataURL('image/jpeg',.92).split(',')[1]});return r}
async function ocr(im,onProg){
 if(CAP){try{onProg&&onProg('Lese den Text …',.5);const r=await nativeOCR(canvasOf(im,2600));const L=r.lines||[];const by={};L.forEach(l=>(by[l.block]=by[l.block]||[]).push(l.text));const tx=Object.keys(by).map(k=>by[k].join('\n')).join('\n');if(tx.trim())return tx}catch(e){}}
 await tessWorker(onProg);
 const r=await TESS.recognize(prepCanvas(im));if(!S.ocrReady){S.ocrReady=true;save()}return r.data.text||''}
async function scanFile(file){toast('Lese die Rechnung …');let im;try{im=await loadImg(file)}catch(e){toast('Das Bild ließ sich nicht öffnen.');return}
 const img=canvasOf(im,1400).toDataURL('image/jpeg',.72);let data={},how='';
 const q=await readQR(im);if(q){const p=parseEPC(q)||parseBezahlCode(q);if(p){data=p;how='qr'}}
 if(!how){const tx=await readText(im);if(tx){data=parseInvoiceText(tx);how='text'}}
 if(!how&&(CAP||navigator.onLine!==false||S.ocrReady)){let stop=false;
  sheet(`<h2>Lese die Rechnung …</h2><p class="muted" id="oM">Starte Texterkennung …</p><span class="bar" style="width:100%"><i id="oB" style="width:3%"></i></span><p class="small muted">${CAP||S.ocrReady?'Dauert ein paar Sekunden.':'Beim ersten Mal wird die Texterkennung einmalig geladen (etwa 5 MB). Danach geht es auch offline. Das Foto bleibt auf deinem Handy.'}</p><button class="btn ghost" id="oX">Überspringen und selbst eintippen</button>`,s=>s.querySelector('#oX').onclick=()=>{stop=true;closeSheet();invoiceSheet(data,img,'')});
  try{const tx=await ocr(im,(msg,pr)=>{const m=$('#oM'),b=$('#oB');if(m)m.textContent=msg;if(b)b.style.width=Math.max(3,Math.round(pr*100))+'%'});if(stop)return;
   const d2=parseInvoiceText(tx);if(d2.iban||d2.amount||d2.payee){data=d2;how='ocr'}else how='ocrfail'}catch(e){if(stop)return;how='ocrerr'}
  closeSheet()}
 invoiceSheet(data,img,how==='ocrfail'||how==='ocrerr'?'':how,undefined,how)}
function pasteSheet(){sheet(`<h2>Rechnungstext einfügen</h2><p class="small muted">Öffne das Foto in Google Lens oder der Galerie, wähle „Text kopieren“ und füg ihn hier ein. Kleinkram sucht IBAN, Betrag, Rechnungsnummer und Frist heraus.</p><textarea class="inp" id="pT" style="min-height:180px" placeholder="Text hier einfügen" autofocus></textarea><button class="btn pri block" id="pGo">Auslesen</button>`,s=>s.querySelector('#pGo').onclick=()=>{const tx=val('pT');if(!tx){toast('Erst Text einfügen.');return}const d=parseInvoiceText(tx);closeSheet();invoiceSheet(d,null,'paste')})}
function invoiceSheet(d,img,how,existing,why){const doc=existing||{};const v=(k,dd)=>esc(d[k]??doc[k]??dd??'');const y=new Date().getFullYear();
 const mahn=d.mahnung&&!existing?'<span class="chip crit">Das ist eine Mahnung. Schnell zahlen.</span>':'';const info=mahn+(how==='qr'?'<span class="chip ok">GiroCode auf der Rechnung erkannt</span>':how==='ocr'?'<span class="chip stamp">Text erkannt. Bitte jede Zahl prüfen.</span>':how==='text'||how==='paste'?'<span class="chip stamp">Aus dem Text gelesen. Bitte prüfen.</span>':existing?'':'<span class="chip warn">Kein Code gefunden</span>');
 sheet(`<h2>${existing?'Rechnung':'Rechnung prüfen'}</h2>${info}
 ${!how&&!existing?`<p class="small muted">${why==='ocrerr'?'Die Texterkennung konnte nicht geladen werden. Beim ersten Mal braucht sie Internet.':why==='ocrfail'?'Auf dem Foto war kaum Text zu erkennen. Tipp: gerade von oben, gutes Licht, ganze Seite.':'Kein Code gefunden.'} Trag die Daten ein oder <button class="btn sm" data-act="pasteInv">Text einfügen</button>. Das Foto wird trotzdem abgelegt.</p>`:''}
 ${img?`<img class="preview-img" src="${img}" alt="Foto der Rechnung">`:''}
 <label class="f">Empfänger<input class="inp" id="iP" value="${v('payee')}"></label>
 <label class="f">IBAN <span id="iOk"></span><input class="inp mono" id="iI" value="${esc(fmtIban(d.iban??doc.iban??''))}" autocapitalize="characters" spellcheck="false"></label>
 <div class="grid2"><label class="f">Betrag (€)<input class="inp mono" type="number" step="0.01" inputmode="decimal" id="iA" value="${v('amount')}"></label><label class="f">BIC (optional)<input class="inp mono" id="iB" value="${v('bic')}" autocapitalize="characters"></label></div>
 <label class="f">Verwendungszweck<input class="inp" id="iR" value="${v('ref')}"></label>
 <div class="grid2"><label class="f">Zahlen bis<input class="inp" type="date" id="iD" value="${v('due',addDays(today(),14))}"></label><label class="f">Mahngebühr, falls zu spät (€)<input class="inp" type="number" inputmode="decimal" id="iF" value="${v('fee',5)}"></label></div>
 <label class="f">Steuer<select class="inp" id="iX">${Object.entries(TAXT).map(([k,l])=>`<option value="${k}" ${(d.taxType??doc.taxType??'none')===k?'selected':''}>${l}</option>`).join('')}</select></label>
 <div class="grid2"><label class="f">Davon Arbeitskosten (€)<input class="inp mono" type="number" step="0.01" inputmode="decimal" id="iL" value="${v('labor')}" placeholder="Lohn + Fahrt"></label><label class="f">Jahresordner<input class="inp mono" type="number" id="iY" value="${v('year',y)}"></label></div>
 ${objs().length?`<label class="f">Gehört zu<select class="inp" id="iO"><option value="">–</option>${objs().map(o=>`<option value="${o.id}" ${(d.objId??doc.objId)===o.id?'selected':''}>${esc(o.name)}${isRented(o)?' (vermietet)':''}</option>`).join('')}</select></label>`:''}
 <label class="switch"><span>Schon bezahlt</span><input type="checkbox" id="iPaid" ${(d.paid??doc.paid)?'checked':''}></label>
 <div class="row"><button class="btn grow" id="iQR">GiroCode zeigen</button><button class="btn pri grow" id="iS">${existing?'Speichern':'Ablegen'}</button></div>
 ${existing?`<button class="btn ghost danger" id="iDel">Löschen</button>`:''}
 ${d.raw?`<details><summary>Erkannter Text</summary><textarea class="inp mono" id="iRaw" readonly style="min-height:160px;font-size:.75rem">${esc(d.raw)}</textarea><button class="btn sm" id="iRawC">Text kopieren</button></details>`:''}
 <p class="small muted">Kleinkram überweist nie selbst. Du prüfst und schickst in deiner Banking-App ab.</p>`,s=>{const rc=s.querySelector('#iRawC');rc&&(rc.onclick=()=>copy(d.raw,s.querySelector('#iRaw')));
 const ib=s.querySelector('#iI'),ok=s.querySelector('#iOk');const chk=()=>{const x=ib.value.replace(/\s/g,'');ok.innerHTML=!x?'':ibanOK(x)?'<span class="chip ok">gültig</span>':'<span class="chip crit">Prüfziffer passt nicht</span>'};ib.oninput=chk;chk();
 const form=()=>({payee:val('iP'),iban:val('iI').replace(/\s/g,'').toUpperCase(),bic:val('iB').toUpperCase(),amount:+val('iA')||0,ref:val('iR'),due:val('iD'),fee:+val('iF')||0,taxType:val('iX'),labor:+val('iL')||0,year:+val('iY')||y,paid:s.querySelector('#iPaid').checked,objId:val('iO')||null});
 s.querySelector('#iQR').onclick=()=>{const f=form();if(!ibanOK(f.iban)){toast('Erst eine gültige IBAN eintragen.');return}giroSheet(f,()=>invoiceSheet(Object.assign({},d,f),img,how,existing))};
 s.querySelector('#iS').onclick=async()=>{const f=form();if(!f.payee&&!f.amount){toast('Mindestens Empfänger oder Betrag, bitte.');return}
  const isNew=!existing;const o=existing?S.docs.find(x=>x.id===existing.id):{id:uid(),kind:'rechnung',date:today()};
  Object.assign(o,f,{title:f.payee||'Rechnung'});if(d.raw)o.raw=d.raw;if(f.paid&&!o.paidDate)o.paidDate=today();
  if(isNew){S.docs.push(o);if(img){o.hasImg=true;await IDB.put(o.id,img)}}
  let task=S.tasks.find(x=>x.docId===o.id);
  if(!f.paid){if(!task){task={id:uid(),title:`${d.mahnung?'Mahnung: ':''}${f.payee||'Rechnung'} bezahlen`,cat:'verwaltung',due:f.due||null,created:today(),postponed:0,started:false,done:null,steps:[{t:'Banking-App öffnen',done:false},{t:'GiroCode scannen oder IBAN kopieren',done:false},{t:'Prüfen und selbst absenden',done:false}],cost:f.fee?{eur:f.fee,note:'Mahngebühr'}:null,bundle:'',buddy:null,docId:o.id};S.tasks.push(task)}else{task.due=f.due||task.due;task.cost=f.fee?{eur:f.fee,note:'Mahngebühr'}:null}}
  else if(task&&!task.done){task.done=today()}
  save();closeSheet();if(isNew){pts(f.taxType!=='none'?10:5,f.taxType!=='none'?'Beleg für die Steuer abgelegt':'Rechnung abgelegt');UI.year=f.year}else toast('Gespeichert');render()};
 const del=s.querySelector('#iDel');del&&(del.onclick=()=>confirmSheet('Rechnung löschen?','Foto und Daten verschwinden von diesem Gerät.','Löschen',()=>{S.docs=S.docs.filter(x=>x.id!==existing.id);S.tasks=S.tasks.filter(x=>!(x.docId===existing.id&&!x.done));IDB.del(existing.id);save();render()},true))})}
function giroSheet(f,back){const svg=qrSvg(epcPayload(f));
 sheet(`<h2>GiroCode</h2><p class="small muted">In der Banking-App „Foto-Überweisung“ bzw. „Scan2Bank“ wählen und diesen Code scannen, zum Beispiel vom Handy deines Partners oder vom Laptop. Manche Apps lesen auch einen Screenshot aus der Galerie.</p>
 ${svg?`<div class="qr">${svg}</div>`:'<p class="chip warn">QR-Erzeugung gerade nicht verfügbar. Nutze die Kopier-Felder.</p>'}
 <div class="stack">${[['Empfänger',f.payee],['IBAN',fmtIban(f.iban)],['Betrag',(+f.amount).toFixed(2).replace('.',',')],['Verwendungszweck',f.ref]].filter(x=>x[1]).map(([l,x],i)=>`<div class="copyrow"><div class="grow"><p class="small muted">${l}</p><p class="mono">${esc(x)}</p></div><button class="btn sm" data-cp="${i}">Kopieren</button></div>`).join('')}</div>
 <button class="btn block" id="gB">Zurück</button>`,s=>{const vals=[f.payee,f.iban,(+f.amount).toFixed(2).replace('.',','),f.ref].filter(Boolean);s.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>copy(vals[b.dataset.cp]));s.querySelector('#gB').onclick=()=>{closeSheet();back&&back()}})}
function docSheet(id){const d=S.docs.find(x=>x.id===id);if(!d)return;if(d.kind==='rechnung'){IDB.get(d.id).then(img=>invoiceSheet({},img,'',d));return}
 IDB.get(d.id).then(img=>sheet(`<h2>${esc(d.title)}</h2>${img?`<img class="preview-img" src="${img}" alt="${esc(d.title)}">`:''}<p class="small muted">${esc(d.note||'')}</p><p class="small muted">Ordner ${d.year}${d.taxType&&d.taxType!=='none'?` · ${esc(TAXT[d.taxType])}`:''}</p><div class="row"><button class="btn grow" data-act="close">Schließen</button><button class="btn danger" id="dX">Löschen</button></div>`,s=>s.querySelector('#dX').onclick=()=>confirmSheet('Dokument löschen?','Es verschwindet von diesem Gerät.','Löschen',()=>{S.docs=S.docs.filter(x=>x.id!==id);IDB.del(id);save();render()},true)))}
function newDocSheet(){let img=null,raw='',dls=[];const y=new Date().getFullYear();
 sheet(`<h2>Dokument ablegen</h2><label class="btn block" for="dF">${ICON.cam} Foto aufnehmen oder wählen</label><input type="file" id="dF" accept="image/*" capture="environment" hidden><img class="preview-img" id="dI" hidden alt="Vorschau">
 <p class="small muted" id="dO" hidden></p><div id="dDl"></div>
 <details><summary>Text einfügen statt Foto</summary><textarea class="inp" id="dP" placeholder="Text des Briefs einfügen"></textarea><button class="btn sm" id="dPGo">Nach Fristen suchen</button></details>
 <label class="f">Titel<input class="inp" id="dT" placeholder="z. B. Steuerbescheid 2025"></label><label class="f">Notiz<input class="inp" id="dN" placeholder="optional"></label>
 <div class="grid2"><label class="f">Jahresordner<input class="inp mono" type="number" id="dY" value="${y}"></label><label class="f">Steuer<select class="inp" id="dX">${Object.entries(TAXT).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label></div><button class="btn pri block" id="dS">Ablegen</button>`,s=>{
 const showDl=()=>{const box=s.querySelector('#dDl');if(!raw){box.innerHTML='';return}if(!s.querySelector('#dT').value){const g=guessDocTitle(raw);if(g)s.querySelector('#dT').value=g}
  box.innerHTML=dls.length?`<div class="stack"><h3>Gefundene Fristen</h3>${dls.map((d,i)=>`<div class="card stack" style="padding:10px"><label class="switch" style="padding:0"><span><b>${esc(d.kind)}</b></span><input type="checkbox" data-dl="${i}" checked></label><label class="f">Bis<input class="inp" type="date" data-dld="${i}" value="${d.date}"></label><p class="small muted">${esc(d.calc)}. „…${esc(d.ctx.slice(0,150))}…“</p></div>`).join('')}<p class="small muted">Wird als Aufgabe angelegt. Bitte das Datum mit dem Brief vergleichen.</p></div>`:'<p class="small muted">Keine Frist im Text gefunden.</p>';
  box.querySelectorAll('[data-dld]').forEach(i=>i.onchange=()=>dls[i.dataset.dld].date=i.value);box.querySelectorAll('[data-dl]').forEach(i=>i.onchange=()=>dls[i.dataset.dl].off=!i.checked)};
 const analyse=txt=>{raw=String(txt||'').slice(0,6000);dls=findDeadlines(raw);showDl()};
 s.querySelector('#dPGo').onclick=()=>analyse(val('dP'));
 s.querySelector('#dF').onchange=async e=>{const f=e.target.files[0];if(!f)return;let im;try{im=await loadImg(f);img=canvasOf(im,1400).toDataURL('image/jpeg',.72);const p=s.querySelector('#dI');p.src=img;p.hidden=false}catch(er){toast('Bild ließ sich nicht öffnen.');return}
  if(navigator.onLine===false&&!S.ocrReady)return;const o=s.querySelector('#dO');o.hidden=false;o.textContent='Lese den Brief und suche Fristen …';
  try{const tx=await ocr(im,(m,pr)=>{o.textContent=`${m} ${Math.round(pr*100)} %`});o.hidden=true;analyse(tx)}catch(er){o.textContent='Texterkennung ging gerade nicht. Du kannst den Text auch einfügen.'}};
 s.querySelector('#dS').onclick=async()=>{const t=val('dT');if(!t){toast('Gib dem Dokument einen Titel.');return}const o={id:uid(),kind:'dokument',title:t,note:val('dN'),year:+val('dY')||y,taxType:val('dX'),date:today(),hasImg:!!img,raw};S.docs.push(o);if(img)await IDB.put(o.id,img);
  const mk=dls.filter(d=>!d.off&&d.date);mk.forEach(d=>S.tasks.push({id:uid(),title:`${d.kind}: ${t}`,cat:'verwaltung',due:d.date,created:today(),postponed:0,started:false,done:null,cost:null,bundle:'',buddy:null,docRef:o.id,steps:suggestSteps(d.kind+' '+t)}));
  save();closeSheet();UI.year=o.year;pts(5,'Dokument abgelegt');if(mk.length)setTimeout(()=>toast(`${mk.length} Frist${mk.length>1?'en':''} als Aufgabe angelegt`),900);render()}})}

/* ---------- Spar-Topf & Daten ---------- */
function potAddSheet(){sheet(`<h2>In den Spar-Topf</h2><p class="small muted">Kosten, die du durch Pünktlichkeit vermieden hast.</p><div class="grid2"><label class="f">Betrag (€)<input class="inp" type="number" step="0.01" inputmode="decimal" id="pA" autofocus></label><label class="f">Wofür?<input class="inp" id="pW" placeholder="z. B. Skonto genutzt"></label></div><button class="btn pri block" id="pS">Hinzufügen</button>`,s=>s.querySelector('#pS').onclick=()=>{const a=+val('pA');if(!(a>0)){toast('Betrag fehlt.');return}S.pot.entries.push({id:uid(),d:today(),eur:a,w:val('pW')||'Selbst eingetragen'});save();closeSheet();render();toast(`${eur(a)} im Topf`)})}
function payoutSheet(){const p=potNow();confirmSheet('Auszahlen',`${eur(p)} gehören dir. Nimm sie dir wirklich und gönn dir was. Der Topf startet danach bei null.`,'Ausgezahlt',()=>{S.pot.payouts.push({d:today(),eur:p});save();stamp('Gegönnt');render()})}
async function fullBackup(){const imgs={};const keys=[...S.docs.filter(d=>d.hasImg).map(d=>d.id),...(S.warranties||[]).filter(w=>w.hasImg).map(w=>'w-'+w.id)];for(const k of keys){const v=await IDB.get(k);if(v)imgs[k]=v}return JSON.stringify(Object.assign({},S,{_imgs:imgs}))}
function applyBackup(txt){const o=JSON.parse(txt);if(!o||o.v!==1||!Array.isArray(o.tasks))throw 0;const imgs=o._imgs||{};delete o._imgs;S=o;Object.entries(imgs).forEach(([k,v])=>IDB.put(k,v));save();render()}
function backupSheet(){const data=JSON.stringify(S);sheet(`<h2>Sicherung</h2><p class="small muted">Am sichersten: als Datei speichern. Sie landet in „Downloads“ und bleibt auch erhalten, wenn die App gelöscht wird. Der Text unten enthält keine Fotos.</p><textarea class="inp mono" id="bk" style="min-height:200px;font-size:.75rem" readonly>${esc(data)}</textarea><div class="row"><button class="btn pri grow" id="bkF">Als Datei speichern (mit Fotos)</button></div><div class="row"><button class="btn grow" id="bkS">Teilen</button><button class="btn grow" id="bkC">Kopieren</button></div>`,s=>{s.querySelector('#bkC').onclick=()=>copy(data,s.querySelector('#bk'));s.querySelector('#bkS').onclick=()=>{if(!share(data))copy(data,s.querySelector('#bk'))};
 s.querySelector('#bkF').onclick=async()=>{const full=await fullBackup();if(saveFile(`kleinkram-sicherung-${today()}.json`,full,'application/json')){S.lastBackup=today();save()}}})}
function restoreSheet(){sheet(`<h2>Sicherung einspielen</h2><p class="small muted">Ersetzt alle aktuellen Daten auf diesem Gerät.</p><label class="btn block" for="rsF">Sicherungsdatei wählen</label><input type="file" id="rsF" accept=".json,application/json,text/plain" hidden><p class="small muted">oder Text einfügen:</p><textarea class="inp mono" id="rs" style="min-height:180px;font-size:.75rem" placeholder="Sicherungstext einfügen"></textarea><button class="btn pri block" id="rsGo">Einspielen</button>`,s=>{s.querySelector('#rsGo').onclick=()=>{try{applyBackup(val('rs'));closeSheet();toast('Sicherung eingespielt')}catch(e){toast('Das ist keine gültige Kleinkram-Sicherung.')}};
 s.querySelector('#rsF').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{applyBackup(String(r.result));closeSheet();toast('Sicherung eingespielt')}catch(er){toast('Das ist keine gültige Kleinkram-Sicherung.')}};r.readAsText(f)}})}

/* ---------- Werkseinstellungen: alles in der App löschen (zweifach bestätigt) ---------- */
function resetSheet(){const n=k=>(S[k]||[]).length;
 sheet(`<h2>Werkseinstellungen</h2><p class="muted">Setzt Kleinkram auf den Zustand nach der Installation zurück.</p>
 <div class="banner"><div class="grow"><h3>Wird gelöscht</h3><p class="small">${n('tasks')} Aufgaben, ${n('events')} Termine, ${n('routines')} Routinen, ${n('docs')} Belege/Dokumente mit Fotos, ${n('contracts')} Verträge, Haus &amp; Zähler, ${n('warranties')} Garantien, Spar-Topf, Punkte (${S.points}), Einstellungen und alle geplanten Erinnerungen.</p></div></div>
 <p class="small muted"><b>Bleibt erhalten:</b> gespeicherte Sicherungsdateien, Dateien in Dokumente/Kleinkram und im Kleinkram-Papierkorb, Termine, die schon im Handy-Kalender stehen.</p>
 ${S.lastBackup?`<p class="small muted">Letzte Sicherung: ${fmtD(S.lastBackup)}.</p>`:'<p class="small"><b>Du hast noch keine Sicherung.</b> Ohne Sicherung ist alles endgültig weg.</p>'}
 <button class="btn block" data-act="backup">Erst Sicherung speichern</button>
 <div class="row"><button class="btn grow" data-act="close">Abbrechen</button><button class="btn grow danger" id="rs1">Weiter</button></div>`,s=>s.querySelector('#rs1').onclick=resetSheet2)}
function resetSheet2(){sheet(`<h2>Wirklich alles löschen?</h2><p class="muted">Das lässt sich nicht rückgängig machen. Zum Bestätigen tippe <b>LÖSCHEN</b> ein.</p>
 <label class="f">Bestätigung<input class="inp" id="rsW" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="LÖSCHEN"></label>
 <div class="row"><button class="btn grow" data-act="close">Abbrechen</button><button class="btn grow danger" id="rs2" disabled>Endgültig löschen</button></div>`,s=>{
  const w=s.querySelector('#rsW'),b=s.querySelector('#rs2');const ok=()=>/^l(ö|oe|o)schen$/i.test(w.value.trim());
  w.oninput=()=>b.disabled=!ok();b.onclick=()=>{if(ok())factoryReset()};setTimeout(()=>w.focus(),80)})}
async function factoryReset(){const b=$('#rs2');if(b){b.disabled=true;b.textContent='Lösche …'}
 const tmo=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms||2500))]);
 if(CAP){try{const LN=CapP('LocalNotifications');const p=await tmo(LN.getPending());if(p&&p.notifications&&p.notifications.length)await tmo(LN.cancel({notifications:p.notifications.map(x=>({id:x.id}))}))}catch(e){}}
 try{Object.keys(localStorage).filter(k=>/^kleinkram/i.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
 IDB.mem.clear();try{IDB.db&&IDB.db.close()}catch(e){}IDB.db=null;
 await tmo(new Promise(r=>{try{const q=indexedDB.deleteDatabase('kleinkram');q.onsuccess=q.onerror=q.onblocked=()=>r()}catch(e){r()}}));
 S=seed();try{localStorage.removeItem(KEY)}catch(e){}try{sessionStorage.setItem('kk-reset','1')}catch(e){}
 location.replace(location.pathname+'#heute');location.reload()}
