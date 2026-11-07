/* Kleinkram · Kopf leeren (schnell alles rein, später sortieren) + Widget-Daten */
"use strict";
const inbox=()=>S.inbox=S.inbox||[];
const notizen=()=>S.notizen=S.notizen||[];
function kopfCard(){const n=inbox().length;
 return`<div class="card kopf" style="margin-top:12px"><div class="row" style="gap:8px"><input class="inp grow" id="kIn" placeholder="Kopf leeren: Was geht dir durch den Kopf?" autocomplete="off" enterkeyhint="done"><button class="iconbtn" id="kMic" aria-label="Sprechen">${ICON.mic}</button></div>
 ${n?`<button class="btn sm block" data-act="kopf" style="margin-top:8px">${n} Gedanke${n>1?'n':''} sortieren</button>`:''}</div>`}
function kopfAdd(text){const L=String(text||'').split(/\n|;/).map(x=>x.trim()).filter(Boolean);if(!L.length)return 0;L.forEach(t=>inbox().push({id:uid(),t,d:today()}));pts(1,'Kopf geleert');save();return L.length}
function kopfBind(root){const i=root.querySelector('#kIn');if(!i)return;const go=()=>{const n=kopfAdd(i.value);if(n){i.value='';toast(n>1?`${n} Gedanken notiert`:'Notiert – sortieren kannst du später');render()}};
 i.onkeydown=e=>{if(e.key==='Enter')go()};i.onblur=()=>{if(i.value.trim())go()};const m=root.querySelector('#kMic');m&&(m.onclick=()=>mic(i,()=>{}))}
/* Vorschlag: Datum/Uhrzeit → Termin, sonst Aufgabe; „Idee“, „merken“ → Notiz */
function kopfGuess(t){if(/^(idee|notiz|merken|info)\b|:$/i.test(t))return'notiz';const p=parseQuick(t);return p.type==='termin'&&p.date?'termin':'aufgabe'}
function kopfSheet(){const L=inbox();
 sheet(`<h2>Kopf leeren</h2><p class="small muted">Alles raus aus dem Kopf – Zeile für Zeile. Danach jeden Gedanken mit einem Tipp einsortieren.</p>
 <div class="big-in"><textarea class="inp" id="kT" rows="3" placeholder="Ein Gedanke pro Zeile …"></textarea><button class="iconbtn" id="kM" aria-label="Sprechen">${ICON.mic}</button></div><button class="btn block" id="kA">Hinzufügen</button>
 ${L.length?`<h3>Zum Sortieren (${L.length})</h3>${L.map(x=>{const g=kopfGuess(x.t);return`<div class="card stack" style="padding:10px"><p>${esc(x.t)}</p><div class="kopf-btns">${[['aufgabe','Aufgabe'],['termin','Termin'],['notiz','Notiz']].map(([k,l])=>`<button class="btn sm${g===k?' pri':''}" data-ks="${x.id}:${k}">${l}</button>`).join('')}<button class="btn sm ghost" data-kx="${x.id}" aria-label="Löschen">${ICON.x}</button></div></div>`}).join('')}
  <button class="btn block ghost" id="kAll">Alle wie vorgeschlagen einsortieren</button>`:'<p class="small muted">Nichts zu sortieren. 🎉</p>'}
 ${notizen().length?`<details><summary>Notizen (${notizen().length})</summary>${notizen().slice().reverse().map(n=>`<div class="li"><div class="grow"><p>${esc(n.t)}</p><p class="small muted">${fmtD(n.d)}</p></div><button class="btn sm ghost" data-nt="${n.id}">Zur Aufgabe</button><button class="iconbtn" data-nx="${n.id}" aria-label="Löschen" style="width:40px;height:40px">${ICON.x}</button></div>`).join('')}</details>`:''}`,s=>{
  s.querySelector('#kA').onclick=()=>{const n=kopfAdd(val('kT'));if(n)kopfSheet()};s.querySelector('#kM').onclick=()=>mic(s.querySelector('#kT'),()=>{});
  const sort=(id,k)=>{const x=inbox().find(z=>z.id===id);if(!x)return;const p=parseQuick(x.t);
   if(k==='aufgabe')S.tasks.push({id:uid(),title:p.title||x.t,cat:p.cat||'privat',due:p.date||null,created:today(),postponed:0,started:false,done:null,steps:[],cost:null,bundle:'',buddy:null});
   if(k==='termin'){if(!p.date){S.inbox=inbox().filter(z=>z.id!==id);save();quickSheet();setTimeout(()=>{const q=$('#qIn');if(q){q.value=x.t;q.dispatchEvent(new Event('input'))}},80);return false}S.events.push({id:uid(),title:p.title||x.t,date:p.date,end:p.end||null,time:p.time||null,cat:p.cat||'privat',repeat:p.repeat||'none',kind:'termin',yearKnown:false})}
   if(k==='notiz')notizen().push({id:uid(),t:x.t,d:x.d});
   S.inbox=inbox().filter(z=>z.id!==id);return true};
  s.querySelectorAll('[data-ks]').forEach(b=>b.onclick=()=>{const[id,k]=b.dataset.ks.split(':');if(sort(id,k)!==false){pts(1,'Einsortiert');save();render();kopfSheet()}});
  s.querySelectorAll('[data-kx]').forEach(b=>b.onclick=()=>{S.inbox=inbox().filter(z=>z.id!==b.dataset.kx);save();render();kopfSheet()});
  const all=s.querySelector('#kAll');all&&(all.onclick=()=>{let n=0;inbox().slice().forEach(x=>{const g=kopfGuess(x.t);if(g==='termin'&&!parseQuick(x.t).date)return;if(sort(x.id,g))n++});pts(n,'Einsortiert');save();render();toast(`${n} einsortiert`);kopfSheet()});
  s.querySelectorAll('[data-nx]').forEach(b=>b.onclick=()=>{S.notizen=notizen().filter(z=>z.id!==b.dataset.nx);save();kopfSheet()});
  s.querySelectorAll('[data-nt]').forEach(b=>b.onclick=()=>{const n=notizen().find(z=>z.id===b.dataset.nt);S.tasks.push({id:uid(),title:n.t,cat:'privat',due:null,created:today(),postponed:0,started:false,done:null,steps:[],cost:null,bundle:'',buddy:null});S.notizen=notizen().filter(z=>z.id!==n.id);save();render();toast('Aufgabe angelegt');kopfSheet()})})}

/* ---------- Widget auf dem Startbildschirm (Android) ---------- */
function widgetData(){const t=today(),R=ranked(),one=R[0];const nx=typeof wNextAll==='function'?wNextAll():null;
 const rt=(S.routines||[]).filter(r=>rDue(r,t)).slice(0,4).map(r=>({id:r.id,t:r.title,done:r.days.includes(t)}));
 return{tag:t,eins:one?one.title:'Nichts Dringendes – genieß den Tag',sub:one?[one.due?(one.due<t?'überfällig':one.due===t?'heute fällig':'fällig '+fmtD(one.due)):'',one.cost?'Aufschieben kostet '+eur(one.cost.eur):''].filter(Boolean).join(' · '):'',
  wecker:nx?`⏰ ${wFmtNext(nx.t)}${nx.w.label?' · '+nx.w.label:''}`:'',routinen:rt,mehr:Math.max(0,(S.routines||[]).filter(r=>rDue(r,t)&&!r.days.includes(t)).length-rt.filter(r=>!r.done).length)}}
let widgetLast='';
async function widgetSync(){if(!CAP)return;try{const r=await CapP('Wecker').widgetAbgehakt();const ticks=r&&r.ticks||{};let ch=false;
  Object.entries(ticks).forEach(([id,on])=>{const ro=(S.routines||[]).find(x=>x.id===id);if(ro&&ro.days.includes(today())!==!!on){toggleRoutine(id);ch=true}});if(ch)render()}catch(e){}
 const d=JSON.stringify(widgetData());if(d===widgetLast)return;widgetLast=d;try{await CapP('Wecker').widgetDaten({daten:d})}catch(e){}}
if(CAP){document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(widgetSync,400)});setTimeout(widgetSync,1500)}
