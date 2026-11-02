/* Kleinkram · Kalender-Datei (.ics), Google-Kalender-Link, Export-Fenster */
"use strict";
/* ---------- Kalender-Datei (.ics) ---------- */
const icsEsc=x=>String(x||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1');
const icsD=x=>x.replace(/-/g,'');
const icsFold=l=>{const o=[];while(l.length>70){o.push(l.slice(0,70));l=' '+l.slice(70)}o.push(l);return o.join('\r\n')};
const ICS_TZ=['BEGIN:VTIMEZONE','TZID:Europe/Berlin','BEGIN:DAYLIGHT','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','TZNAME:CEST','DTSTART:19700329T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','BEGIN:STANDARD','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','TZNAME:CET','DTSTART:19701025T030000','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','END:VTIMEZONE'];
function buildICS(items){const now=new Date();const st=`${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
 const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Kleinkram//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH',...ICS_TZ];
 items.forEach(it=>{L.push('BEGIN:VEVENT',`UID:${it.uid}@kleinkram.app`,`DTSTAMP:${st}`,icsFold('SUMMARY:'+icsEsc(it.title)));
  if(it.time){const[h,m]=it.time.split(':').map(Number);const e2=new Date(2000,0,1,h+1,m);const endDay=it.time>='23:00'?addDays(it.end||it.date,1):(it.end||it.date);
   L.push(`DTSTART;TZID=Europe/Berlin:${icsD(it.date)}T${pad(h)}${pad(m)}00`,`DTEND;TZID=Europe/Berlin:${icsD(endDay)}T${pad(e2.getHours())}${pad(e2.getMinutes())}00`)}
  else L.push(`DTSTART;VALUE=DATE:${icsD(it.date)}`,`DTEND;VALUE=DATE:${icsD(addDays(it.end||it.date,1))}`);
  if(it.rrule)L.push('RRULE:'+it.rrule);if(it.cat)L.push('CATEGORIES:'+icsEsc(it.cat));if(it.desc)L.push(icsFold('DESCRIPTION:'+icsEsc(it.desc)));
  if(it.alarm)L.push('BEGIN:VALARM','ACTION:DISPLAY',icsFold('DESCRIPTION:'+icsEsc(it.title)),'TRIGGER:'+it.alarm,'END:VALARM');
  L.push('END:VEVENT')});
 L.push('END:VCALENDAR');return L.join('\r\n')+'\r\n'}
const RR={yearly:'FREQ=YEARLY',monthly:'FREQ=MONTHLY',weekly:'FREQ=WEEKLY'};
function evItem(e,min){return{uid:e.id,title:e.title,date:e.date,end:e.end&&e.end!==e.date?e.end:null,time:e.time,rrule:RR[e.repeat]||null,cat:CATS[e.cat],desc:'Aus Kleinkram',alarm:e.time?(min>0?`-PT${min}M`:null):(min>0?'-PT15H':null)}}
function gcalUrl(it){const f=(d,t)=>t?`${icsD(d)}T${t.replace(':','')}00`:icsD(d);let dates;
 if(it.time){const[h,m]=it.time.split(':').map(Number);const e=new Date(2000,0,1,h+1,m);const endDay=it.time>='23:00'?addDays(it.end||it.date,1):(it.end||it.date);dates=`${f(it.date,it.time)}/${f(endDay,`${pad(e.getHours())}:${pad(e.getMinutes())}`)}`}
 else dates=`${icsD(it.date)}/${icsD(addDays(it.end||it.date,1))}`;
 const q=new URLSearchParams({action:'TEMPLATE',text:it.title,dates,details:it.desc||'',ctz:'Europe/Berlin'});if(it.rrule)q.set('recur','RRULE:'+it.rrule);return'https://calendar.google.com/calendar/render?'+q.toString()}
function capInsert(it){const st=P(it.date);let en;if(it.time){const[h,m]=it.time.split(':').map(Number);st.setHours(h,m,0,0);en=new Date(st.getTime()+3600000)}else en=P(addDays(it.end||it.date,1));
 return CapP('KleinkramNative').insertEvent({title:it.title,description:it.desc||'',begin:st.getTime(),end:en.getTime(),allDay:!it.time,rrule:it.rrule||''}).catch(()=>{toast('Keine Kalender-App gefunden. Ich öffne Google Kalender.');openOutside(gcalUrl(it))})}
function exportSheet(){const t=today();const fut=e=>e.repeat&&e.repeat!=='none'||(e.end||e.date)>=t;let items=[];
 sheet(`<h2>In den Handy-Kalender</h2>${CAP?'<div class="banner"><div class="grow small">Tippe bei jedem Eintrag auf <b>In Kalender eintragen</b>. Deine Kalender-App öffnet sich mit dem fertigen Termin, du tippst nur auf <b>Speichern</b>.</div></div>':''}<div class="banner" ${CAP?'hidden':''}><div class="grow small"><b>So geht's:</b> „In Chrome öffnen“ tippen, im Teilen-Menü <b>Chrome</b> wählen. Dort öffnet sich der fertige Termin in deinem Google Kalender, du tippst nur auf <b>Speichern</b>. Wiederholungen sind schon eingestellt. Klappt das Teilen nicht: „Link kopieren“ und in Chrome einfügen.</div></div>
 <details><summary>Was soll rein?</summary><div class="stack" style="margin-top:6px">
 <label class="switch"><span>Termine</span><input type="checkbox" id="xE" checked></label>
 <label class="switch"><span>Fristen von Aufgaben (ganztägig)</span><input type="checkbox" id="xT" checked></label>
 <label class="switch"><span>Kündigungsfristen von Verträgen</span><input type="checkbox" id="xC" checked></label>
 <label class="switch"><span>Routinen als Serie (z. B. alle 3 Tage)</span><input type="checkbox" id="xR" checked></label>
 <label class="switch"><span>Nur, was noch nicht übertragen wurde</span><input type="checkbox" id="xN" checked></label>
 <label class="f">Erinnerung (für Kalender-Datei)<select class="inp" id="xA">${[[0,'keine'],[10,'10 Minuten'],[30,'30 Minuten'],[60,'1 Stunde'],[120,'2 Stunden'],[1440,'1 Tag']].map(([k,l])=>`<option value="${k}" ${+(S.set.remindMin||30)===k?'selected':''}>${l}</option>`).join('')}</select></label></div></details>
 <div id="xList" class="stack"></div>
 <details><summary>Alles auf einmal (als Datei)</summary><div class="stack" style="margin-top:6px"><p class="small muted">Für viele Einträge: Datei speichern und am PC auf calendar.google.com unter Einstellungen → Importieren hochladen. Manche Kalender-Apps (z. B. Samsung) öffnen die Datei auch direkt.</p><button class="btn" id="xGo">Datei teilen</button><button class="btn" id="xDl">In „Downloads“ speichern</button></div></details>`,s=>{
 const pick=()=>{const onlyNew=s.querySelector('#xN').checked,min=+val('xA');const it=[];
  if(s.querySelector('#xE').checked)S.events.filter(e=>fut(e)&&(!onlyNew||!e.icsAt)).forEach(e=>{it.push(Object.assign(evItem(e,min),{mark:()=>e.icsAt=today()}))});
  if(s.querySelector('#xT').checked)openTasks().filter(x=>x.due&&x.due>=t&&!x.cid&&(!onlyNew||x.icsDue!==x.due)).forEach(x=>it.push({uid:'task-'+x.id,title:'Frist: '+x.title,date:x.due,cat:CATS[x.cat],desc:x.cost&&+x.cost.eur?`Aufschieben kostet ${eur(x.cost.eur)}`:'Aus Kleinkram',alarm:'PT9H',mark:()=>x.icsDue=x.due}));
  if(s.querySelector('#xC').checked)S.contracts.forEach(c=>{const I=cInfo(c);if(I.deadline&&I.deadline>=t&&(!onlyNew||c.icsDl!==I.deadline))it.push({uid:'vertrag-'+c.id+'-'+I.deadline,title:`Kündigungsfrist: ${c.name}`,date:I.deadline,cat:'Verwaltung',desc:`Letzter Tag zum Kündigen${c.anbieter?' bei '+c.anbieter:''}. Vertragsende ${fmtDate(I.end)}.`,alarm:'-P14D',mark:()=>c.icsDl=I.deadline})});
  if(s.querySelector('#xR').checked)S.routines.filter(r=>!onlyNew||!r.icsAt).forEach(r=>{const start=rDue(r)&&!r.days.includes(t)?t:rNext(r);const BD=['SU','MO','TU','WE','TH','FR','SA'];
   it.push({uid:'routine-'+r.id,title:r.title,date:start,time:r.time||null,rrule:r.freq==='weekly'?`FREQ=WEEKLY;BYDAY=${BD[+r.wd||0]}`:r.freq==='days'?`FREQ=DAILY;INTERVAL=${rWin(r)}`:'FREQ=DAILY',cat:'Routine',desc:'Routine aus Kleinkram. Abhaken in der App bringt Punkte.',alarm:r.time?(min>0?`-PT${min}M`:null):'PT9H',mark:()=>r.icsAt=today()})});
  return it};
 const RRL={'FREQ=DAILY':'täglich','FREQ=WEEKLY':'wöchentlich','FREQ=MONTHLY':'monatlich','FREQ=YEARLY':'jährlich'};
 const list=()=>{items=pick();s.querySelector('#xList').innerHTML=items.length?items.map((it,i)=>`<div class="card stack" style="padding:10px 12px;gap:8px"><div><p><b>${esc(it.title)}</b></p><p class="small muted">${fmtD(it.date)}${it.time?` · ${it.time} Uhr`:' · ganztägig'}${it.rrule?` · ${RRL[it.rrule]||(it.rrule.includes('INTERVAL')?'alle '+it.rrule.split('INTERVAL=')[1]+' Tage':'wöchentlich')}`:''}</p></div>
  <div class="row">${CAP?`<button class="btn sm pri" data-xn="${i}" data-xi="${i}">In Kalender eintragen</button><button class="btn sm" data-xs="${i}" data-xi="${i}">Google im Browser</button>`:`<button class="btn sm pri" data-xs="${i}" data-xi="${i}">In Chrome öffnen</button><button class="btn sm" data-xc="${i}" data-xi="${i}">Link kopieren</button>`}</div></div>`).join(''):'<div class="empty">Alles schon übertragen. Unter „Was soll rein?“ kannst du auch bereits Übertragenes noch einmal anzeigen.</div>';
  s.querySelectorAll('[data-xn]').forEach(b=>b.addEventListener('click',()=>capInsert(items[+b.dataset.xn])));
  s.querySelectorAll('[data-xs]').forEach(b=>b.addEventListener('click',()=>openOutside(gcalUrl(items[+b.dataset.xs]))));
  s.querySelectorAll('[data-xc]').forEach(b=>b.addEventListener('click',()=>copy(gcalUrl(items[+b.dataset.xc]))));
  s.querySelectorAll('[data-xi]').forEach(a=>a.addEventListener('click',()=>{const it=items[+a.dataset.xi];if(it&&!it.done){it.done=true;it.mark();save();a.closest('.card').style.opacity=.55}}))};
 s.querySelectorAll('details input,details select').forEach(i=>i.onchange=list);list();
 const fileDone=()=>{items.forEach(it=>it.mark());save();pts(5,'Kalender abgeglichen')};
 s.querySelector('#xGo').onclick=async()=>{if(items.length&&await shareFile(`kleinkram-${today()}.ics`,buildICS(items),'text/calendar')){fileDone();closeSheet()}};
 s.querySelector('#xDl').onclick=()=>{if(items.length&&saveFile(`kleinkram-${today()}.ics`,buildICS(items),'text/calendar')){fileDone();closeSheet()}}})}
const fmtDate=x=>x?`${+x.slice(8)}.${+x.slice(5,7)}.${x.slice(0,4)}`:'';
