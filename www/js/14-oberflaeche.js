/* Kleinkram · Rendern, Fenster (Sheets), 5-Minuten-Fokus */
"use strict";
/* ---------- Rendern ---------- */
function render(){S.contracts=S.contracts||[];syncRecurring();syncContracts();syncHaus();syncWarranties();if(typeof syncAblauf==='function')syncAblauf();const v=$('#view');
 if(!navOk(UI.tab))UI.tab='heute';
 v.innerHTML=({heute:vHeute,kalender:vKalender,aufgaben:vAufgaben,ablage:vAblage,ich:()=>typeof vMehr==='function'?vMehr():'',aufraeumen:vAufraeumen}[UI.tab]||vHeute)();
 const NV=NAV.filter(n=>navOk(n[0]));$('#nav').style.gridTemplateColumns=`repeat(${NV.length},1fr)`;$('#nav').innerHTML=NV.map(([k,l,p])=>`<button class="${UI.tab===k?'on':''}" data-act="go" data-to="${k}" aria-current="${UI.tab===k?'page':'false'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>${l}</button>`).join('');
 v.querySelectorAll('img[data-img]').forEach(im=>IDB.get(im.dataset.img).then(src=>{if(src)im.src=src}));
onPic(document,'scanInput',scanFile);if(typeof kopfBind==='function')kopfBind(document);}
function go(tab){UI.tab=tab;try{history.replaceState(null,'','#'+tab)}catch(e){}render();window.scrollTo(0,0)}

/* ---------- Sheets ---------- */
let sheetClose=null;
function sheet(html,onMount){const host=$('#sheetHost');host.innerHTML=`<div class="sheet-bg" data-act="bgclose"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-top"><div class="grab"></div><button class="sheet-x" data-act="close" aria-label="Schließen">${ICON.x}</button></div>${html}</div></div>`;const sh=host.querySelector('.sheet');swipeClose(sh);onMount&&onMount(sh);const f=host.querySelector('[autofocus]');f&&setTimeout(()=>f.focus(),60)}
function swipeClose(sh){let y0=null,dy=0,drag=false;const bg=sh.parentElement;
 sh.addEventListener('touchstart',e=>{const fromTop=e.target.closest('.sheet-top');if(sh.scrollTop>2&&!fromTop){y0=null;return}if(e.target.closest('input,textarea,select'))return;y0=e.touches[0].clientY;dy=0;drag=false},{passive:true});
 sh.addEventListener('touchmove',e=>{if(y0===null)return;dy=e.touches[0].clientY-y0;if(dy<=0&&!drag){y0=null;return}if(dy>8)drag=true;if(drag){e.preventDefault();sh.classList.add('drag');sh.classList.remove('back');sh.style.transform=`translateY(${Math.max(0,dy)}px)`;bg.style.background=`rgba(10,14,12,${Math.max(.05,.45-dy/700)})`}},{passive:false});
 sh.addEventListener('touchend',()=>{if(y0===null)return;y0=null;if(drag&&dy>110){sh.style.transform='translateY(100%)';setTimeout(closeSheet,120)}else{sh.classList.remove('drag');sh.classList.add('back');sh.style.transform='';bg.style.background=''}drag=false});}
function closeSheet(){$('#sheetHost').innerHTML='';sheetClose&&sheetClose();sheetClose=null}
function confirmSheet(title,text,okLabel,onOk,danger){sheet(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="row"><button class="btn grow" data-act="close">Abbrechen</button><button class="btn grow ${danger?'danger':'pri'}" id="cOk">${esc(okLabel)}</button></div>`,s=>s.querySelector('#cOk').onclick=()=>{closeSheet();onOk()})}
const catSelect=(id,val)=>`<label class="f">Bereich<select class="inp" id="${id}">${Object.keys(CATS).map(c=>`<option value="${c}" ${val===c?'selected':''}>${CATS[c]}${CATHINT[c]?` (${CATHINT[c]})`:''}</option>`).join('')}</select></label>`;
/* Foto: zwei Wege – Kamera (capture) oder Galerie/Dateien (ohne capture, sonst öffnet Android nur die Kamera) */
const picBtns=(id,cam,cls)=>`<div class="row pic-row"><label class="btn grow ${cls||''}" for="${id}">${ICON.cam} ${cam||'Foto aufnehmen'}</label><label class="btn grow" for="${id}G">${ICON.gal} Aus Galerie</label></div><input type="file" id="${id}" accept="image/*" capture="environment" hidden><input type="file" id="${id}G" accept="image/*" hidden>`;
function onPic(root,id,fn){[id,id+'G'].forEach(k=>{const el=root.querySelector('#'+k);if(el)el.onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)fn(f)}})}
/* Erklär-Tipp: einmal zeigen, wegtippbar */
const tip=(k,html)=>S.set.tips&&S.set.tips[k]?'':`<div class="tip"><span class="tip-ic" aria-hidden="true">💡</span><p class="small grow">${html}</p><button class="tip-x" data-act="tipX" data-k="${k}" aria-label="Tipp ausblenden">${ICON.x}</button></div>`;
const val=id=>{const e=document.getElementById(id);return e?e.value.trim():''};

/* Schnell eintragen */
function quickSheet(){sheet(`<h2>Was möchtest du festhalten?</h2><p class="small muted">Sag oder schreib es, wie du es denkst: „Zahnarzt Freitag 14 Uhr“, „Rechnung Stadtwerke bezahlen bis 20.11.“, „Geburtstag Mama 3. März“, „Elektriker Heizung morgen 8 Uhr“.</p>
 <div class="big-in"><input class="inp" id="qIn" placeholder="Eintippen oder sprechen" autocomplete="off" autofocus><button class="iconbtn" id="qMic" aria-label="Spracheingabe">${ICON.mic}</button></div>
 <div id="qOut"></div>${typeof plusTiles==='function'?plusTiles():''}`,s=>{const inp=s.querySelector('#qIn');
 const upd=()=>{const p=parseQuick(inp.value);if(inp.dataset.force)p.type=inp.dataset.force;const o=s.querySelector('#qOut');if(!inp.value.trim()){o.innerHTML='';return}
  o.innerHTML=`<div class="stack"><div class="seg"><button class="${p.type==='termin'?'on':''}" data-qt="termin">Termin</button><button class="${p.type==='aufgabe'?'on':''}" data-qt="aufgabe">Aufgabe</button></div>
  <label class="f">Titel<input class="inp" id="qT" value="${esc(p.title)}"></label>
  <div class="grid2"><label class="f">${p.type==='aufgabe'?'Fällig am':'Datum'}<input class="inp" type="date" id="qD" value="${p.date||(p.type==='termin'?today():'')}"></label>${p.type==='termin'?`<label class="f">Uhrzeit<input class="inp" type="time" id="qH" value="${p.time||''}"></label>`:`<label class="f">Aufschieben kostet (€)<input class="inp" type="number" inputmode="decimal" id="qC" placeholder="z. B. 5"></label>`}</div>
  ${p.type==='termin'?`<div class="grid2">${catSelect('qCat',p.cat)}<label class="f">Wiederholen<select class="inp" id="qR">${[['none','nie'],['weekly','wöchentlich'],['monthly','monatlich'],['yearly','jährlich']].map(([k,l])=>`<option value="${k}" ${p.repeat===k?'selected':''}>${l}</option>`).join('')}</select></label></div>${p.end?`<label class="f">Bis<input class="inp" type="date" id="qE" value="${p.end}"></label>`:''}<label class="switch"><span>Geburtstag</span><input type="checkbox" id="qB" ${p.kind==='geburtstag'?'checked':''}></label>`:catSelect('qCat',p.cat)}
  <button class="btn pri block" id="qSave">Speichern</button></div>`;
  o.querySelectorAll('[data-qt]').forEach(b=>b.onclick=()=>{inp.dataset.force=b.dataset.qt;upd()});
  o.querySelector('#qSave').onclick=()=>saveQuick(o)};
 inp.oninput=()=>{delete inp.dataset.force;upd()};
 s.querySelector('#qMic').onclick=()=>mic(inp,upd);
 inp.onkeydown=e=>{if(e.key==='Enter'&&s.querySelector('#qSave'))saveQuick(s.querySelector('#qOut'))};})}
function saveQuick(o){const title=val('qT');if(!title){toast('Gib noch einen Titel ein.');return}
 const isT=!!o.querySelector('#qH');const date=val('qD');const cat=val('qCat')||'privat';
 if(isT){if(!date){toast('Datum fehlt.');return}const bday=o.querySelector('#qB')&&o.querySelector('#qB').checked;
  S.events.push({id:uid(),title,date,end:val('qE')||null,time:bday?null:(val('qH')||null),cat,repeat:bday?'yearly':val('qR'),kind:bday?'geburtstag':'termin',yearKnown:bday?date.slice(0,4)<String(new Date().getFullYear()):false});
  toast(`Termin eingetragen: ${fmtD(date)}`)}
 else{const c=+val('qC');S.tasks.push({id:uid(),title,cat,due:date||null,created:today(),postponed:0,started:false,done:null,steps:[],cost:c>0?{eur:c,note:'Folgekosten'}:null,bundle:'',buddy:null});toast('Aufgabe angelegt')}
 pts(2,'Eingetragen statt im Kopf behalten');save();closeSheet();render()}
function mic(inp,upd){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Tipp: Tippe aufs Mikrofon deiner Tastatur und sprich.');inp.focus();return}
 try{const r=new SR();r.lang='de-DE';r.interimResults=true;r.onresult=e=>{inp.value=[...e.results].map(x=>x[0].transcript).join(' ');upd()};r.onerror=e=>toast(e.error==='not-allowed'||e.error==='service-not-allowed'?'Mikrofon hier gesperrt. Nutze das Mikrofon deiner Tastatur.':'Spracheingabe ging nicht. Nutze die Tastatur-Diktierfunktion.');r.start();toast('Ich höre zu …')}catch(e){toast('Nutze das Mikrofon deiner Tastatur.')}}

/* Termin bearbeiten */
function eventSheet(id,dateDefault){const e=S.events.find(x=>x.id===id)||{title:'',date:dateDefault||today(),time:'',cat:'privat',repeat:'none',kind:'termin',end:null};
 sheet(`<h2>${id?'Termin':'Neuer Termin'}</h2><label class="f">Titel<input class="inp" id="eT" value="${esc(e.title)}" ${id?'':'autofocus'}></label>
 <div class="grid2"><label class="f">Datum<input class="inp" type="date" id="eD" value="${e.date}"></label><label class="f">Uhrzeit<input class="inp" type="time" id="eH" value="${e.time||''}"></label></div>
 <div class="grid2"><label class="f">Bis (mehrtägig)<input class="inp" type="date" id="eE" value="${e.end||''}"></label><label class="f">Wiederholen<select class="inp" id="eR">${[['none','nie'],['weekly','wöchentlich'],['monthly','monatlich'],['yearly','jährlich']].map(([k,l])=>`<option value="${k}" ${e.repeat===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
 ${catSelect('eC',e.cat)}<label class="switch"><span>Geburtstag (Geburtsjahr im Datum = Alter anzeigen)</span><input type="checkbox" id="eB" ${e.kind==='geburtstag'?'checked':''}></label>
 <div class="row"><button class="btn pri grow" id="eS">Speichern</button>${id?'<button class="btn danger" id="eX">Löschen</button>':''}</div>${id?`<div class="row"><button class="btn grow" id="eCal">${CAP?'In Kalender eintragen':'Google Kalender (Chrome)'}</button><button class="btn grow" id="eCal2">Link kopieren</button></div>`:''}`,s=>{
 const a1=s.querySelector('#eCal'),a2=s.querySelector('#eCal2');a1&&(a1.onclick=()=>{if(CAP)capInsert(evItem(e,0));else openOutside(gcalUrl(evItem(e,0)));e.icsAt=today();save()});a2&&(a2.onclick=()=>{copy(gcalUrl(evItem(e,0)));e.icsAt=today();save()});
 s.querySelector('#eS').onclick=()=>{const t=val('eT'),d=val('eD');if(!t||!d){toast('Titel und Datum, bitte.');return}const b=s.querySelector('#eB').checked;
  const o={id:e.id||uid(),title:t,date:d,time:b?null:(val('eH')||null),end:val('eE')||null,repeat:b?'yearly':val('eR'),cat:val('eC'),kind:b?'geburtstag':'termin',yearKnown:b&&d.slice(0,4)<String(new Date().getFullYear())};
  if(id)Object.assign(e,o);else S.events.push(o);save();closeSheet();render();toast('Gespeichert')};
 const x=s.querySelector('#eX');x&&(x.onclick=()=>{S.events=S.events.filter(z=>z.id!==id);save();closeSheet();render();toast('Termin gelöscht')})})}

/* Aufgabe bearbeiten */
function taskSheet(id){const isNew=!id;const t=S.tasks.find(x=>x.id===id)||{id:uid(),title:'',cat:'privat',due:'',created:today(),postponed:0,started:false,done:null,steps:[],cost:null,bundle:'',buddy:null};let steps=(t.steps||[]).map(s=>({...s}));
 const stepsHtml=()=>steps.map((s,i)=>`<div class="stepi${s.done?' done':''}"><button class="check${s.done?' on':''}" data-si="${i}" aria-label="Schritt erledigt">${ICON.check}</button><input class="inp" data-st="${i}" value="${esc(s.t)}"><button class="iconbtn" data-sx="${i}" aria-label="Schritt entfernen" style="width:40px;height:40px">${ICON.x}</button></div>`).join('');
 sheet(`<h2>${isNew?'Neue Aufgabe':'Aufgabe'}</h2><label class="f">Was genau?<input class="inp" id="tT" value="${esc(t.title)}" ${isNew?'autofocus':''}></label>
 <div class="grid2">${catSelect('tC',t.cat)}<label class="f">Fällig am<input class="inp" type="date" id="tD" value="${t.due||''}"></label></div>
 <details class="more" ${t.alarm||t.cost||t.bundle||t.buddy||(t.steps||[]).length?'open':''}><summary><b>Mehr Optionen</b> <span class="small muted">Mini-Schritte, Alarm, Kosten, Buddy</span></summary><div class="stack" style="margin-top:10px">
 <label class="switch"><span>Alarm-Modus<br><span class="small muted">klingelt wie ein Wecker, auch bei lautlos</span></span><input type="time" class="inp" id="tAl" value="${esc(t.alarm||'')}" style="width:120px"></label>
 <div class="grid2"><label class="f">Aufschieben kostet (€)<input class="inp" type="number" inputmode="decimal" id="tK" value="${t.cost?t.cost.eur:''}" placeholder="0"></label><label class="f">Wofür?<input class="inp" id="tKn" value="${esc(t.cost?t.cost.note:'')}" placeholder="Mahngebühr, Strafe …"></label></div>
 <div class="stack"><div class="row between"><h3>Mini-Schritte</h3><button class="btn sm" id="tSug">Vorschlagen</button></div><div class="steps" id="tSteps">${stepsHtml()}</div><button class="btn sm ghost" id="tAdd" style="align-self:flex-start">+ Schritt</button></div>
 <label class="f">Belohnung dabei (Reizkopplung)<input class="inp" id="tB" value="${esc(t.bundle||'')}" placeholder="z. B. Lieblings-Podcast nur dabei hören"></label>
 <details ${t.buddy?'open':''}><summary>Buddy, der dich anschubst</summary><div class="stack" style="margin-top:8px"><div class="grid2"><label class="f">Name<input class="inp" id="tBn" value="${esc(t.buddy?t.buddy.name:'')}"></label><label class="f">Telefon<input class="inp" type="tel" id="tBp" value="${esc(t.buddy?t.buddy.phone:'')}"></label></div><label class="f">Angefangen bis (Uhrzeit am Fälligkeitstag)<input class="inp" type="time" id="tBy" value="${esc(t.buddy?t.buddy.by:'')}"></label><p class="small muted">Kleinkram schickt nichts selbst. Ist die Uhrzeit am Fälligkeitstag vorbei und die Aufgabe noch nicht angefangen, bekommst du eine Erinnerung und auf „Heute“ den Vorschlag, ${t.buddy&&t.buddy.name?esc(t.buddy.name):'deinem Buddy'} zu schreiben. Absenden tust du.</p>${t.buddy&&t.buddy.name?`<button class="btn" id="tBnow">Jetzt Nachricht an ${esc(t.buddy.name)}</button>`:''}</div></details>
 </div></details>
 <div class="row"><button class="btn pri grow" id="tS">Speichern</button>${isNew?'':`<button class="btn" id="tDone">Erledigt</button>`}</div>
 ${isNew?'':`<div class="row"><button class="btn ghost grow" id="tArc">Streichen (ins Archiv)</button><button class="btn ghost danger" id="tX">Löschen</button></div>`}`,s=>{
 const box=s.querySelector('#tSteps');const re=()=>{box.innerHTML=stepsHtml()};
 box.oninput=e=>{const i=e.target.dataset.st;if(i!=null)steps[i].t=e.target.value};
 box.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.si!=null){steps[b.dataset.si].done=!steps[b.dataset.si].done;re()}if(b.dataset.sx!=null){steps.splice(+b.dataset.sx,1);re()}};
 s.querySelector('#tSug').onclick=()=>{const title=val('tT')||t.title;steps=steps.filter(x=>x.t.trim()).concat(suggestSteps(title));re()};
 s.querySelector('#tAdd').onclick=()=>{steps.push({t:'',done:false});re();box.querySelector(`[data-st="${steps.length-1}"]`).focus()};
 const collect=()=>{const title=val('tT');if(!title){toast('Gib der Aufgabe einen Titel.');return false}const k=+val('tK');Object.assign(t,{title,cat:val('tC'),due:val('tD')||null,cost:k>0?{eur:k,note:val('tKn')}:null,steps:steps.filter(x=>x.t.trim()),bundle:val('tB'),buddy:val('tBn')?{name:val('tBn'),phone:val('tBp'),by:val('tBy')}:null,alarm:val('tAl')||null});if(t.alarm&&!t.due){const n=new Date(),[ah,am]=t.alarm.split(':').map(Number);t.due=(ah*60+am>n.getHours()*60+n.getMinutes())?today():addDays(today(),1)}delete t.example;if(isNew)S.tasks.push(t);save();return true};
 s.querySelector('#tS').onclick=()=>{if(collect()){closeSheet();render();toast(t.buddy&&t.buddy.by&&t.due?`Gespeichert. ${t.buddy.name} ist dein Buddy ab ${t.buddy.by} Uhr am ${fmtDate(t.due)}.`:'Gespeichert')}};
 const bn=s.querySelector('#tBnow');bn&&(bn.onclick=()=>{if(collect()){closeSheet();buddySheet(t.id)}});
 const dn=s.querySelector('#tDone');dn&&(dn.onclick=()=>{if(collect()){closeSheet();completeTask(t.id)}});
 const ar=s.querySelector('#tArc');ar&&(ar.onclick=()=>{t.archived=true;save();closeSheet();render();toast('Gestrichen. Völlig okay.')});
 const x=s.querySelector('#tX');x&&(x.onclick=()=>confirmSheet('Aufgabe löschen?','Sie verschwindet ganz, auch aus dem Archiv.','Löschen',()=>{S.tasks=S.tasks.filter(z=>z.id!==t.id);save();render()},true))})}

/* Blockade-Check-in */
function laterSheet(id){const t=S.tasks.find(x=>x.id===id);if(!t)return;
 sheet(`<h2>Was blockiert dich gerade?</h2><p class="small muted">„${esc(t.title)}“. Ehrlich antworten hilft mehr als Disziplin.</p><div class="opt">
 <button data-why="how">Weiß nicht, wie ich anfangen soll<small>Ich zerlege es in winzige Schritte.</small></button>
 <button data-why="fear">Angst, es falsch zu machen<small>Erlaubnis: Ein schlechter erster Versuch reicht völlig.</small></button>
 <button data-why="tired">Zu müde<small>Ab auf morgen früh. Ohne schlechtes Gewissen.</small></button>
 <button data-why="boring">Zu langweilig<small>Koppeln wir es an etwas Schönes.</small></button>
 <button data-why="skip">Passt heute einfach nicht<small>Auf morgen schieben.</small></button></div>`,s=>s.querySelectorAll('[data-why]').forEach(b=>b.onclick=()=>{const w=b.dataset.why;closeSheet();
  if(w==='how'){if(!(t.steps||[]).length)t.steps=suggestSteps(t.title);save();taskSheet(t.id);toast('Hier sind Mini-Schritte. Fang mit dem ersten an.')}
  else if(w==='fear'){focusMode(t.id,'Erlaubnis erteilt: Es darf schlecht werden. 5 Minuten, egal wie.')}
  else if(w==='boring'){sheet(`<h2>Was gönnst du dir dabei?</h2><p class="small muted">Etwas Angenehmes, das du nur während dieser Aufgabe machst.</p><label class="f">Belohnung<input class="inp" id="bdl" value="${esc(t.bundle||'')}" placeholder="Podcast, Musik, Kaffee, Snack" autofocus></label><button class="btn pri block" id="bdlS">5 Minuten mit Belohnung</button>`,s2=>s2.querySelector('#bdlS').onclick=()=>{t.bundle=val('bdl');save();closeSheet();focusMode(t.id)})}
  else{if(w==='tired')t.snoozeUntil=addDays(today(),1);postpone(t,t.due&&t.due>addDays(today(),1)?t.due:addDays(today(),1));render();
   if(t.postponed>=3)setTimeout(()=>tooBig(t),250);else toast(w==='tired'?'Morgen früh steht es oben. Schlaf gut.':'Auf morgen verschoben.')}}))}
function tooBig(t){sheet(`<h2>Das schiebst du ${t.postponed}-mal</h2><p class="muted">„${esc(t.title)}“ rostet langsam. Ist die Aufgabe vielleicht zu groß?</p><div class="opt">
 <button id="tb1">Kleiner machen<small>In Mini-Schritte zerlegen, nur den ersten tun.</small></button><button id="tb2">Streichen<small>Ins Archiv. Manche Dinge müssen nicht sein.</small></button><button id="tb3">Bleibt so<small>Ich krieg das hin.</small></button></div>`,s=>{
 s.querySelector('#tb1').onclick=()=>{closeSheet();if(!(t.steps||[]).length)t.steps=suggestSteps(t.title);save();taskSheet(t.id)};
 s.querySelector('#tb2').onclick=()=>{t.archived=true;save();closeSheet();render();toast('Gestrichen. Ein Ding weniger im Kopf.')};
 s.querySelector('#tb3').onclick=closeSheet})}

/* Frischer Start */
function restartSheet(){const od=openTasks().filter(x=>x.due&&x.due<today());const keep=new Set(od.map(x=>x.id));
 sheet(`<h2>Frischer Start</h2><p class="muted">Was davon ist dir noch wichtig? Der Rest kommt ins Archiv. Danach verteile ich alles neu, höchstens zwei pro Tag.</p><div class="card" style="padding:4px 0">${od.map(x=>`<label class="li" style="cursor:pointer"><input type="checkbox" data-k="${x.id}" checked style="width:22px;height:22px;accent-color:var(--stamp)"><div class="grow"><p>${esc(x.title)}</p><p class="small muted">war fällig ${fmtD(x.due)}</p></div></label>`).join('')}</div><button class="btn pri block" id="rsGo">Neu verteilen</button>`,s=>{
 s.querySelectorAll('[data-k]').forEach(c=>c.onchange=()=>c.checked?keep.add(c.dataset.k):keep.delete(c.dataset.k));
 s.querySelector('#rsGo').onclick=()=>{let i=0;od.forEach(x=>{if(keep.has(x.id)){x.due=addDays(today(),Math.floor(i/2));x.postponed=0;i++}else x.archived=true});save();closeSheet();stamp('Neustart');pts(10,'Frischer Start');render()}})}

/* Buddy-Nachricht (nie automatisch) */
const intlPhone=p=>{let x=String(p||'').replace(/[^\d+]/g,'');if(x.startsWith('+'))return x.slice(1);if(x.startsWith('00'))return x.slice(2);if(x.startsWith('0'))return'49'+x.slice(1);return x};
function buddySheet(id){const t=S.tasks.find(x=>x.id===id);if(!t||!t.buddy)return;const msg=`Hey ${t.buddy.name}, ich wollte ${t.due&&t.due<today()?'eigentlich schon':'heute'} „${t.title}“ anfangen und hab's noch nicht gemacht. Schubs mich mal an!`;const ph=t.buddy.phone;
 sheet(`<h2>Nachricht an ${esc(t.buddy.name)}</h2><textarea class="inp" id="bm">${esc(msg)}</textarea>
 ${ph?`<div class="row"><button class="btn pri grow" id="bmw">WhatsApp</button><button class="btn grow" id="bms">SMS</button></div>`:''}<div class="row"><button class="btn${ph?'':' pri'} grow" id="bmsh">Teilen (Signal, Telegram …)</button><button class="btn grow" id="bmc">Kopieren</button></div>
 ${ph?'':'<p class="small muted">Trag in der Aufgabe eine Telefonnummer ein, dann öffnet Kleinkram WhatsApp oder SMS direkt mit dem Text.</p>'}<p class="small muted">Du entscheidest, ob und wie du sie abschickst.</p><button class="btn ghost" id="bmStart">Lieber selbst anfangen: 5 Minuten</button>`,s=>{
 const txt=()=>s.querySelector('#bm').value;const w=s.querySelector('#bmw'),sm=s.querySelector('#bms');
 w&&(w.onclick=()=>{openOutside(`https://wa.me/${intlPhone(ph)}?text=${encodeURIComponent(txt())}`);pts(2,'Um Hilfe gebeten')});
 sm&&(sm.onclick=()=>{openOutside(`sms:${String(ph).replace(/[^\d+]/g,'')}?body=${encodeURIComponent(txt())}`);pts(2,'Um Hilfe gebeten')});
 s.querySelector('#bmc').onclick=()=>copy(s.querySelector('#bm').value,s.querySelector('#bm'));s.querySelector('#bmsh').onclick=()=>{if(!share(s.querySelector('#bm').value))copy(s.querySelector('#bm').value,s.querySelector('#bm'))};s.querySelector('#bmStart').onclick=()=>{closeSheet();focusMode(t.id)}})}
function copy(text,el){try{navigator.clipboard.writeText(text).then(()=>toast('Kopiert'),()=>{sel(el)})}catch(e){sel(el)}function sel(el){if(el&&el.select){el.focus();el.select();toast('Markiert. Jetzt kopieren.')}else toast('Kopieren ging nicht.')}}

/* Routine bearbeiten */
function rtSheet(id){const r=S.routines.find(x=>x.id===id)||{id:uid(),title:'',pflicht:true,days:[],freq:'daily',n:3,wd:0,time:''};
 sheet(`<h2>${id?'Routine':'Neue Routine'}</h2><label class="f">Was?<input class="inp" id="rT" value="${esc(r.title)}" placeholder="z. B. Rechnungen prüfen" ${id?'':'autofocus'}></label>
 <div class="grid2"><label class="f">Wie oft?<select class="inp" id="rF">${[['daily','täglich'],['days','alle X Tage'],['weekly','wöchentlich']].map(([k,l])=>`<option value="${k}" ${(r.freq||'daily')===k?'selected':''}>${l}</option>`).join('')}</select></label>
 <label class="f" id="rNw">Alle … Tage<input class="inp mono" type="number" inputmode="numeric" id="rN" value="${r.n||3}"></label><label class="f" id="rWw">Wochentag<select class="inp" id="rW">${RWD.map((d,i)=>`<option value="${i}" ${(+r.wd||0)===i?'selected':''}>${d}</option>`).join('')}</select></label></div>
 <label class="f">Uhrzeit (für den Handy-Kalender, optional)<input class="inp" type="time" id="rH" value="${esc(r.time||'')}"></label>
 <label class="switch"><span>Pflicht (zählt für Freizeit & Tagesbonus)</span><input type="checkbox" id="rP" ${r.pflicht?'checked':''}></label><div class="row"><button class="btn pri grow" id="rS">Speichern</button>${id?'<button class="btn danger" id="rX">Löschen</button>':''}</div>`,s=>{
 const vis=()=>{const f=val('rF');s.querySelector('#rNw').hidden=f!=='days';s.querySelector('#rWw').hidden=f!=='weekly'};s.querySelector('#rF').onchange=vis;vis();
 s.querySelector('#rS').onclick=()=>{const t=val('rT');if(!t){toast('Name fehlt.');return}const old=JSON.stringify([r.freq,r.n,r.wd,r.time,r.title]);Object.assign(r,{title:t,pflicht:s.querySelector('#rP').checked,freq:val('rF'),n:Math.max(1,+val('rN')||1),wd:+val('rW'),time:val('rH'),link:/rechnung|überweis|bezahl/i.test(t)?'unpaid':/dokument|ablage|einräum|papier|post/i.test(t)?'docs':null});if(old!==JSON.stringify([r.freq,r.n,r.wd,r.time,r.title]))r.icsAt=null;if(!id)S.routines.push(r);save();closeSheet();render()};
 const x=s.querySelector('#rX');x&&(x.onclick=()=>confirmSheet('Routine löschen?','Die Serie geht verloren.','Löschen',()=>{S.routines=S.routines.filter(z=>z.id!==id);save();render()},true))})}

/* Wiederkehrend */
const RECTPL=[['Handy aufräumen','privat',1,3],['HU/TÜV','privat',24,30,{eur:15,note:'Verwarnung bei über 2 Monaten'}],['Kfz-Versicherung vergleichen (Stichtag 30.11.)','privat',12,21,null,'11-30'],['Rauchmelder testen','verwaltung',12,14],['Heizungswartung','verwaltung',12,30],['Nebenkostenabrechnung an Mieter','verwaltung',12,60,null,'12-31'],['Zahnarzt-Kontrolle','privat',6,21,null],['Verträge & Abos prüfen','verwaltung',12,14],['Erste-Hilfe-Kasten Auto prüfen','privat',12,14]];
function recTplSheet(){sheet(`<h2>Vorlagen</h2><div class="opt">${RECTPL.map((r,i)=>`<button data-i="${i}">${esc(r[0])}<small>${everyLabel(r[2])}</small></button>`).join('')}</div>`,s=>s.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const r=RECTPL[b.dataset.i];const y=new Date().getFullYear();let next=r[5]?`${y}-${r[5]}`:addMonths(today(),r[2]);if(next<today())next=addMonths(next,12);closeSheet();recSheet(null,{title:r[0],cat:r[1],every:r[2],lead:r[3],cost:r[4],next})}))}
function recSheet(id,pre){const r=S.recurring.find(x=>x.id===id)||Object.assign({id:uid(),title:'',cat:'verwaltung',every:12,next:addMonths(today(),12),lead:14,cost:null,lastGen:null},pre||{});
 sheet(`<h2>${id?'Wiederkehrend':'Neu: wiederkehrend'}</h2><label class="f">Was?<input class="inp" id="wT" value="${esc(r.title)}" placeholder="z. B. Strom ablesen" ${id?'':'autofocus'}></label>
 <div class="grid2">${catSelect('wC',r.cat)}<label class="f">Wie oft?<select class="inp" id="wE">${[[1,'monatlich'],[3,'vierteljährlich'],[6,'halbjährlich'],[12,'jährlich'],[24,'alle 2 Jahre']].map(([k,l])=>`<option value="${k}" ${+r.every===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <div class="grid2"><label class="f">Nächstes Mal<input class="inp" type="date" id="wN" value="${r.next}"></label><label class="f">Erinnern (Tage vorher)<input class="inp" type="number" inputmode="numeric" id="wL" value="${r.lead}"></label></div>
 <div class="grid2"><label class="f">Risiko bei Verpassen (€)<input class="inp" type="number" inputmode="decimal" id="wK" value="${r.cost?r.cost.eur:''}"></label><label class="f">Wofür?<input class="inp" id="wKn" value="${esc(r.cost?r.cost.note:'')}"></label></div>
 <p class="small muted">{vorjahr} im Titel wird automatisch zur Jahreszahl, z. B. „Steuererklärung {vorjahr}“.</p>
 <div class="row"><button class="btn pri grow" id="wS">Speichern</button>${id?'<button class="btn danger" id="wX">Löschen</button>':''}</div>`,s=>{
 s.querySelector('#wS').onclick=()=>{const t=val('wT'),n=val('wN');if(!t||!n){toast('Titel und Datum, bitte.');return}const k=+val('wK');Object.assign(r,{title:t,cat:val('wC'),every:+val('wE'),next:n,lead:Math.max(0,+val('wL')||0),cost:k>0?{eur:k,note:val('wKn')}:null});if(r.lastGen&&r.lastGen!==n)r.lastGen=null;if(!id)S.recurring.push(r);save();closeSheet();render();toast('Gespeichert')};
 const x=s.querySelector('#wX');x&&(x.onclick=()=>confirmSheet('Löschen?','Bereits angelegte Aufgaben bleiben.','Löschen',()=>{S.recurring=S.recurring.filter(z=>z.id!==id);save();render()},true))})}

/* ---------- Fokus: Nur 5 Minuten ---------- */
let FT=null;
function focusMode(id,note){const t=S.tasks.find(x=>x.id===id);if(!t)return;closeSheet();
 markActive();if(!t.started){t.started=true;save();pts(5,'Angefangen zählt')}save();
 let total=300,left=300,run=true,last=Date.now();
 const host=$('#focusHost');
 const draw=()=>{const st=nextStep(t);const steps=t.steps||[];const C=2*Math.PI*90,fr=left/total;
  host.innerHTML=`<div class="focus" role="dialog" aria-modal="true" aria-label="Fokus"><div class="focus-in">
  <div class="row between"><span class="cat-chip" style="${cv(t.cat)}">${CATS[t.cat]}</span><button class="iconbtn" data-f="close" aria-label="Fokus schließen">${ICON.x}</button></div>
  <h1 style="text-align:center">${esc(t.title)}</h1>
  ${note?`<p class="promise" style="color:var(--stamp);font-weight:700">${esc(note)}</p>`:''}
  <div class="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="100" cy="100" r="90" fill="none" stroke="var(--stamp)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-fr)}"/></svg><div class="t" id="fT">${Math.floor(left/60)}:${pad(left%60)}</div></div>
  <p class="promise">${left>0?'Nur 5 Minuten. Danach darfst du ohne schlechtes Gewissen aufhören.':'Geschafft. Aufhören ist okay. Oder noch eine Runde?'}</p>
  ${st?`<div class="card row"><button class="check" data-f="step" aria-label="Schritt erledigt">${ICON.check}</button><div class="grow"><p class="small muted">Schritt ${steps.indexOf(st)+1} von ${steps.length}</p><p><b>${esc(st.t)}</b></p></div></div>`:steps.length?'<p class="promise">Alle Schritte geschafft.</p>':''}
  ${t.bundle?`<div class="banner"><div class="grow"><p class="small muted">Dabei gönnst du dir</p><p><b>${esc(t.bundle)}</b></p></div></div>`:''}
  <div class="grid2"><button class="btn" data-f="pause">${run?'Pause':'Weiter'}</button><button class="btn" data-f="plus">+5 Minuten</button></div>
  <button class="btn pri block" data-f="done">Ganz erledigt</button><button class="btn ghost block" data-f="enough">Für jetzt reicht's</button></div></div>`};
 draw();
 clearInterval(FT);FT=setInterval(()=>{const now=Date.now();if(run&&left>0){left=Math.max(0,left-Math.round((now-last)/1000));if(left===0){sound('bell');haptic([80,60,80]);draw()}else{const el=$('#fT');if(el)el.textContent=`${Math.floor(left/60)}:${pad(left%60)}`;const c=host.querySelector('circle:last-child');if(c){const C=2*Math.PI*90;c.setAttribute('stroke-dashoffset',C*(1-left/total))}}}last=now},1000);
 let wake=null;try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(w=>wake=w).catch(()=>{})}catch(e){}
 const end=()=>{clearInterval(FT);host.innerHTML='';try{wake&&wake.release()}catch(e){}render()};
 host.onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;const f=b.dataset.f;
  if(f==='close'||f==='enough'){if(f==='enough'&&total-left>=120)pts(3,'Drangeblieben');end();if(f==='enough')toast('Gut gemacht. Der Anfang ist das Schwerste.')}
  if(f==='pause'){run=!run;last=Date.now();draw()}
  if(f==='plus'){left+=300;total=Math.max(total,left);run=true;last=Date.now();draw()}
  if(f==='step'){const st=nextStep(t);if(st){st.done=true;markActive();save();sound('tick');haptic(12);pts(2,'Schritt geschafft');if(!nextStep(t)&&t.steps.length){note='Alle Schritte erledigt. Abstempeln?'}draw()}}
  if(f==='done'){end();completeTask(t.id)}}}
