/* Kleinkram · Objekte, Mieteingänge, Nebenkosten, Zähler mit Kurve */
"use strict";
/* ---------- Haus: Objekte, Miete, Nebenkosten, Zähler ---------- */
const MK={strom:{n:'Strom',u:'kWh'},gas:{n:'Gas',u:'m³'},wasser:{n:'Wasser',u:'m³'},waerme:{n:'Wärme',u:'kWh'},sonstig:{n:'Zähler',u:''}};
const MONS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const objs=()=>S.objects||(S.objects=[]);
const objById=id=>objs().find(x=>x.id===id);
const isRented=o=>o&&o.type==='vermietet';
const isRentedDoc=d=>d.objId&&isRented(objById(d.objId));
const ymOf=d=>d.slice(0,7);
const rentDue=(o,m)=>`${m}-${pad(Math.min(Math.max(+o.faellig||3,1),28))}`;
function rentState(o,m){if(o.payments&&o.payments[m])return'paid';if(o.start&&m<ymOf(o.start))return'none';if(o.created&&m<ymOf(o.created))return'old';const due=rentDue(o,m),t=today();if(t<due)return'future';return diff(due,t)>10?'late':'due'}
function rentOpen(o){const t=today(),out=[];for(let k=2;k>=0;k--){const m=ymOf(addMonths(t.slice(0,8)+'01',-k));const st=rentState(o,m);if(st==='due'||st==='late')out.push({m,st})}return out}
function nkInfo(o,y){const em=+o.nkEndMonth||12;const end=iso(new Date(y,em,0));return{y,end,deadline:addMonths(end,12)}}
function nkOpen(o){const t=today(),cy=+t.slice(0,4),done=o.nkDone||[],out=[];const sy=o.start?+o.start.slice(0,4):cy-1;for(let y=Math.max(sy,cy-2);y<=cy;y++){const I=nkInfo(o,y);if(I.end<t&&!done.includes(y))out.push(I)}return out}
function meterSeries(mt){const r=(mt.readings||[]).slice().sort((a,b)=>a.d.localeCompare(b.d));const s=[];for(let i=1;i<r.length;i++){const days=diff(r[i-1].d,r[i].d);if(days<=0)continue;const use=r[i].v-r[i-1].v;s.push({d:r[i].d,from:r[i-1].d,days,use,perDay:use/days})}return s}
function meterWarn(mt){const s=meterSeries(mt);if(s.length<2)return null;const last=s[s.length-1];const prev=s.slice(0,-1).map(x=>x.perDay).sort((a,b)=>a-b);const med=prev[Math.floor(prev.length/2)];if(med>0&&last.perDay>med*1.25)return{pct:Math.round((last.perDay/med-1)*100),last,med};return null}
const nf=v=>Math.abs(v)>=100?Math.round(v).toLocaleString('de-DE'):(+v).toLocaleString('de-DE',{maximumFractionDigits:Math.abs(v)>=10?1:2});
function meterChart(mt){const s=meterSeries(mt);if(s.length<2)return'<p class="small muted">Ab drei Ablesungen zeigt Kleinkram hier den Verbrauch pro Tag als Kurve.</p>';
 const W=320,H=150,L=40,Rr=12,T=14,B=24,u=MK[mt.kind]?MK[mt.kind].u:'';const xs=s.map(p=>P(p.d).getTime()),x0=Math.min(...xs),x1=Math.max(...xs);
 const raw=Math.max(...s.map(p=>p.perDay))||1,mag=Math.pow(10,Math.floor(Math.log10(raw))),ymax=Math.ceil(raw*1.1/mag*2)/2*mag;
 const X=t=>L+(x1===x0?.5:(t-x0)/(x1-x0))*(W-L-Rr),Y=v=>T+(1-Math.max(0,v)/ymax)*(H-T-B);
 const pts=s.map((p,i)=>[X(xs[i]),Y(p.perDay)]),line=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
 const warn=meterWarn(mt),lp=pts[pts.length-1],col=warn?'var(--crit)':'var(--stamp)';
 const grid=[0,.5,1].map(f=>{const v=ymax*f,y=Y(v);return`<line x1="${L}" x2="${W-Rr}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y+3.5}" text-anchor="end" font-size="10" fill="var(--muted)">${nf(v)}</text>`}).join('');
 const dl=d=>`${+d.slice(8)}.${+d.slice(5,7)}.${d.slice(2,4)}`;
 return`<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:100%;display:block;font-family:var(--f-mono)" role="img" aria-label="Verbrauch pro Tag">${grid}
 <text x="${L}" y="9" font-size="10" fill="var(--muted)">${u?u+' ':''}pro Tag</text>
 <path d="M${pts[0][0]},${H-B} L${line.replace(/ /g,' L')} L${lp[0]},${H-B} Z" fill="var(--stamp)" opacity=".12"/>
 <polyline points="${line}" fill="none" stroke="var(--stamp)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
 ${pts.slice(0,-1).map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="var(--stamp)"/>`).join('')}
 <circle cx="${lp[0]}" cy="${lp[1]}" r="4.5" fill="${col}" stroke="var(--paper)" stroke-width="2"/>
 <text x="${Math.min(lp[0],W-Rr)}" y="${Math.max(lp[1]-9,11)}" text-anchor="end" font-size="11" font-weight="600" fill="${col}">${nf(s[s.length-1].perDay)}</text>
 <text x="${L}" y="${H-6}" font-size="10" fill="var(--muted)">${dl(s[0].d)}</text><text x="${W-Rr}" y="${H-6}" text-anchor="end" font-size="10" fill="var(--muted)">${dl(s[s.length-1].d)}</text></svg></div>`}
function syncHaus(){const t=today();let ch=false;const has=f=>S.tasks.some(x=>f(x)&&!x.done&&!x.archived);
 objs().forEach(o=>{
  if(isRented(o))nkOpen(o).forEach(I=>{if(diff(I.end,t)>=30&&!has(x=>x.nkObj===o.id&&x.nkYear===I.y)&&!(o.nkGen||[]).includes(I.y)){S.tasks.push({id:uid(),title:`Nebenkostenabrechnung ${I.y}: ${o.name}`,cat:'verwaltung',due:addDays(I.deadline,-30),created:t,postponed:0,started:false,done:null,cost:null,bundle:'',buddy:null,nkObj:o.id,nkYear:I.y,
   steps:[{t:'Belege des Jahres sammeln (Grundsteuer, Wasser, Müll, Versicherung, Allgemeinstrom)',done:false},{t:'Kosten nach Umlageschlüssel verteilen',done:false},{t:'Vorauszahlungen abziehen',done:false},{t:`Abrechnung nachweisbar an den Mieter schicken (spätestens ${fmtDate(I.deadline)})`,done:false},{t:'Kopie in der Ablage speichern',done:false}]});o.nkGen=(o.nkGen||[]).concat(I.y);ch=true}});
  (o.meters||[]).forEach(mt=>{if(!mt.remind||mt.remind==='none')return;const m=ymOf(t);const read=(mt.readings||[]).some(r=>ymOf(r.d)===m);let key=null,due=null;
   if(mt.remind==='monthly'&&!read&&+t.slice(8)>=25){key='m'+m;due=iso(new Date(+m.slice(0,4),+m.slice(5),0))}
   if(mt.remind==='yearly'){let d=`${t.slice(0,4)}-12-31`;if(diff(t,d)<=10&&!(mt.readings||[]).some(r=>r.d>=addDays(d,-20))){key='y'+d;due=d}}
   if(key&&mt.lastGen!==key&&!has(x=>x.meterId===mt.id)){S.tasks.push({id:uid(),title:`Zähler ablesen: ${MK[mt.kind].n}${mt.name?' '+mt.name:''} (${o.name})`,cat:'verwaltung',due,created:t,postponed:0,started:false,done:null,cost:null,bundle:'',buddy:null,meterId:mt.id,objId:o.id,steps:suggestSteps('zähler ablesen')});mt.lastGen=key;ch=true}})});
 if(ch)save()}
function objSheet(id){const isNew=!id;const o=objById(id)||{id:uid(),name:'',type:'vermietet',address:'',mieter:'',miete:'',faellig:3,start:'',nkEndMonth:12,payments:{},meters:[],nkDone:[]};
 sheet(`<h2>${isNew?'Neues Objekt':esc(o.name)}</h2>
 <div class="seg">${[['vermietet','Vermietet'],['eigen','Selbst bewohnt']].map(([k,l])=>`<button class="${o.type===k?'on':''}" data-ot="${k}">${l}</button>`).join('')}</div>
 <label class="f">Name<input class="inp" id="oN" value="${esc(o.name)}" placeholder="z. B. Wohnung 2. OG" ${isNew?'autofocus':''}></label>
 <label class="f">Adresse (optional)<input class="inp" id="oA" value="${esc(o.address)}"></label>
 <div id="oRent" class="stack">
 <div class="grid2"><label class="f">Mieter<input class="inp" id="oM" value="${esc(o.mieter)}"></label><label class="f">Miete gesamt (€)<input class="inp mono" type="number" step="0.01" inputmode="decimal" id="oR" value="${o.miete}"></label></div>
 <div class="grid2"><label class="f">Fällig am (Tag)<input class="inp mono" type="number" inputmode="numeric" id="oF" value="${o.faellig}"></label><label class="f">Mietbeginn<input class="inp" type="date" id="oS" value="${o.start||''}"></label></div>
 <label class="f">Nebenkosten-Zeitraum endet im<select class="inp" id="oE">${MON.map((m,i)=>`<option value="${i+1}" ${(+o.nkEndMonth||12)===i+1?'selected':''}>${m}</option>`).join('')}</select></label>
 <p class="small muted">Die Abrechnung muss dem Mieter spätestens 12 Monate nach Ende des Zeitraums zugehen (§ 556 BGB). Kleinkram legt die Aufgabe rechtzeitig an.</p></div>
 <div class="row"><button class="btn pri grow" id="oSave">Speichern</button>${isNew?'':'<button class="btn danger" id="oX">Löschen</button>'}</div>`,s=>{
 let type=o.type;const vis=()=>{s.querySelector('#oRent').hidden=type!=='vermietet';s.querySelectorAll('[data-ot]').forEach(b=>b.classList.toggle('on',b.dataset.ot===type))};vis();
 s.querySelectorAll('[data-ot]').forEach(b=>b.onclick=()=>{type=b.dataset.ot;vis()});
 s.querySelector('#oSave').onclick=()=>{const n=val('oN');if(!n){toast('Gib dem Objekt einen Namen.');return}Object.assign(o,{name:n,type,address:val('oA'),mieter:val('oM'),miete:+val('oR')||0,faellig:Math.min(Math.max(+val('oF')||3,1),28),start:val('oS'),nkEndMonth:+val('oE')||12});
  if(isNew){o.created=today();objs().push(o);pts(5,'Objekt angelegt')}UI.obj=o.id;save();closeSheet();render()};
 const x=s.querySelector('#oX');x&&(x.onclick=()=>confirmSheet('Objekt löschen?','Mietzahlungen und Zähler dieses Objekts verschwinden. Belege bleiben in der Ablage.','Löschen',()=>{S.objects=objs().filter(z=>z.id!==o.id);UI.obj=null;save();render()},true))})}
function meterSheet(oid,mid){const o=objById(oid);if(!o)return;o.meters=o.meters||[];const isNew=!mid;const mt=o.meters.find(m=>m.id===mid)||{id:uid(),kind:'strom',name:'',nr:'',remind:'monthly',readings:[]};
 sheet(`<h2>${isNew?'Neuer Zähler':'Zähler'}</h2><div class="grid2"><label class="f">Art<select class="inp" id="mK">${Object.entries(MK).map(([k,v])=>`<option value="${k}" ${mt.kind===k?'selected':''}>${v.n}</option>`).join('')}</select></label><label class="f">Bezeichnung (optional)<input class="inp" id="mN" value="${esc(mt.name)}" placeholder="z. B. Warmwasser"></label></div>
 <div class="grid2"><label class="f">Zählernummer<input class="inp mono" id="mR" value="${esc(mt.nr)}"></label><label class="f">Ans Ablesen erinnern<select class="inp" id="mE">${[['monthly','monatlich'],['yearly','jährlich (Dez.)'],['none','nie']].map(([k,l])=>`<option value="${k}" ${mt.remind===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
 <div class="row"><button class="btn pri grow" id="mS">Speichern</button>${isNew?'':'<button class="btn danger" id="mX">Löschen</button>'}</div>`,s=>{
 s.querySelector('#mS').onclick=()=>{Object.assign(mt,{kind:val('mK'),name:val('mN'),nr:val('mR'),remind:val('mE')});if(isNew)o.meters.push(mt);save();closeSheet();render()};
 const x=s.querySelector('#mX');x&&(x.onclick=()=>confirmSheet('Zähler löschen?','Alle Ablesungen gehen verloren.','Löschen',()=>{o.meters=o.meters.filter(z=>z.id!==mt.id);save();render()},true))})}
function readingSheet(oid,mid){const o=objById(oid),mt=o&&(o.meters||[]).find(m=>m.id===mid);if(!mt)return;const r=(mt.readings||[]).slice().sort((a,b)=>a.d.localeCompare(b.d));const last=r[r.length-1];const u=MK[mt.kind].u;
 sheet(`<h2>Ablesung: ${esc(MK[mt.kind].n)}${mt.name?' '+esc(mt.name):''}</h2>${last?`<p class="small muted">Letzter Stand: <b class="mono">${nf(last.v)} ${u}</b> am ${fmtDate(last.d)}</p>`:''}
 <div class="grid2"><label class="f">Stand${u?' ('+u+')':''}<input class="inp mono" type="number" step="0.001" inputmode="decimal" id="rV" autofocus></label><label class="f">Datum<input class="inp" type="date" id="rD" value="${today()}"></label></div>
 <button class="btn pri block" id="rS">Speichern</button>
 ${r.length?`<details><summary>Alle Ablesungen (${r.length})</summary>${r.slice().reverse().map(x=>`<div class="li"><span class="mono small">${fmtDate(x.d)}</span><div class="grow"><p class="mono">${nf(x.v)} ${u}</p></div><button class="btn sm ghost danger" data-rdel="${x.d}|${x.v}">Löschen</button></div>`).join('')}</details>`:''}`,s=>{
 s.querySelector('#rS').onclick=()=>{const v=+String(val('rV')).replace(',','.'),d=val('rD');if(!(v>=0)||val('rV')===''){toast('Trag den Zählerstand ein.');return}
  const before=r.filter(x=>x.d<=d).pop();if(before&&v<before.v){toast(`Kleiner als am ${fmtDate(before.d)} (${nf(before.v)}). Neuer Zähler? Dann lege ihn neu an.`);return}
  mt.readings=(mt.readings||[]).filter(x=>x.d!==d).concat({d,v});S.tasks.filter(x=>x.meterId===mt.id&&!x.done).forEach(x=>x.done=today());save();closeSheet();pts(3,'Zähler abgelesen');
  const w=meterWarn(mt);if(w)setTimeout(()=>toast(`Achtung: ${w.pct} % mehr Verbrauch pro Tag als sonst`),1200);render()};
 s.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{const[d,v]=b.dataset.rdel.split('|');mt.readings=mt.readings.filter(x=>!(x.d===d&&String(x.v)===v));save();closeSheet();render()})})}
function vHaus(){const os=objs();if(!os.length)return`<div class="card stack"><h3>Wohnungen und Häuser</h3><p class="small muted">Lege hier deine vermieteten Wohnungen oder dein eigenes Zuhause an. Kleinkram hakt dann monatlich die Mieteingänge ab, sammelt Handwerker-Belege pro Objekt, erinnert an die Nebenkostenabrechnung und zeigt den Verbrauch deiner Zähler als Kurve.</p><button class="btn pri" data-act="obj">Objekt anlegen</button></div>`;
 if(!UI.obj||!objById(UI.obj))UI.obj=os[0].id;const o=objById(UI.obj),y=new Date().getFullYear();
 let h=`<div class="folders" role="tablist" aria-label="Objekte">${os.map(x=>`<button class="folder${x.id===o.id?' on':''}" data-act="objsel" data-id="${x.id}" style="font-family:var(--f-body)">${esc(x.name)}</button>`).join('')}<button class="folder" data-act="obj" style="font-family:var(--f-body)">+ Neu</button></div>`;
 h+=`<div class="card row" style="margin-top:12px;gap:12px"><div class="grow"><h2>${esc(o.name)}</h2><p class="small muted">${isRented(o)?`Vermietet${o.mieter?' an '+esc(o.mieter):''}${o.miete?` · ${eur(o.miete)} / Monat`:''}`:'Selbst bewohnt'}${o.address?' · '+esc(o.address):''}</p></div><button class="btn sm" data-act="obj" data-id="${o.id}">Bearbeiten</button></div>`;
 if(isRented(o)){const ms=[...Array(12)].map((_,i)=>`${y}-${pad(i+1)}`);const paid=ms.filter(m=>rentState(o,m)==='paid').length,exp=ms.filter(m=>!['none','future','old'].includes(rentState(o,m))||rentState(o,m)==='paid').length;
  h+=reg(`Mieteingänge ${y}`,`${paid}/${exp}`,`<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px">${ms.map((m,i)=>{const st=rentState(o,m);const C={paid:['var(--ok)','✓'],late:['var(--crit)','!'],due:['var(--warn)','·'],future:['var(--line)',''],none:['var(--line)','–'],old:['var(--line)','?']}[st];
   return`<button data-act="rentT" data-id="${o.id}" data-m="${m}" ${st==='none'?'disabled':''} style="border:1.5px solid ${C[0]};background:${st==='paid'?'color-mix(in srgb,var(--ok) 14%,var(--paper))':'var(--paper)'};border-radius:10px;padding:8px 0;font-weight:700;font-size:.8rem;color:var(--ink);min-height:48px" aria-label="${MON[i]}: ${st==='paid'?'eingegangen':'offen'}">${MONS[i]}<br><span style="color:${C[0]}">${C[1]}</span></button>`}).join('')}</div>
  <p class="small muted">Tippen = Miete eingegangen. Grün: da, gelb: fällig, rot: über 10 Tage überfällig, „?“: vor Kleinkram, bei Bedarf nachtragen.${o.miete?` Eingegangen: ${eur(paid*o.miete)} von ${eur(exp*o.miete)}.`:''}</p>`);
  const nk=nkOpen(o),lastY=new Date().getFullYear()-1,nkL=nkInfo(o,y);
  h+=reg('Nebenkostenabrechnung',null,(nk.length?nk.map(I=>{const k=diff(today(),I.deadline);return`<div class="row between"><span>Abrechnung ${I.y}</span><span class="chip ${k<0?'crit':k<=60?'warn':''}">${k<0?'Frist abgelaufen':`bis ${fmtDate(I.deadline)}`}</span></div><div class="row"><button class="btn sm" data-act="nkDone" data-id="${o.id}" data-y="${I.y}">Verschickt</button></div>`}).join(''):`<p class="small muted">Alles verschickt. Nächster Zeitraum endet am ${fmtDate(nkL.end)}, Abrechnung dann bis ${fmtDate(nkL.deadline)}.</p>`)+((o.nkDone||[]).length?`<p class="small muted">Erledigt: ${o.nkDone.slice().sort().join(', ')}</p>`:''));}
 const ds=S.docs.filter(d=>d.objId===o.id&&+d.year===y);const sum=ds.reduce((a,d)=>a+(+d.amount||0),0);
 h+=reg(`Belege ${y}`,ds.length,(ds.length?ds.slice(0,5).map(d=>`<div class="row between" data-act="doc" data-id="${d.id}" style="cursor:pointer"><span class="small">${esc(d.title||d.payee)}</span><span class="mono small">${d.amount?eur(d.amount):''}</span></div>`).join('')+`<div class="row between"><b>Summe</b><b class="mono">${eur(sum)}</b></div>`:'<p class="small muted">Noch keine Belege zugeordnet. Beim Scannen einer Rechnung unter „Gehört zu“ dieses Objekt wählen.</p>')+(isRented(o)?'<p class="small muted">Bei vermieteten Objekten zählen Handwerkerkosten als Werbungskosten (Anlage V), nicht als § 35a.</p>':''));
 (o.meters||[]).forEach(mt=>{const s=meterSeries(mt),w=meterWarn(mt),u=MK[mt.kind].u,r=(mt.readings||[]).slice().sort((a,b)=>a.d.localeCompare(b.d)),last=r[r.length-1],lp=s[s.length-1];
  h+=reg(`${MK[mt.kind].n}${mt.name?' · '+esc(mt.name):''}`,null,`<div class="row between"><div><p class="mono"><b>${last?nf(last.v)+' '+u:'–'}</b></p><p class="small muted">${last?'abgelesen '+fmtD(last.d):'noch keine Ablesung'}${mt.nr?' · Nr. '+esc(mt.nr):''}</p></div>${lp?`<div style="text-align:right"><p class="mono"><b>${nf(lp.perDay)} ${u}</b></p><p class="small muted">pro Tag</p></div>`:''}</div>
  ${w?`<div class="banner" style="background:color-mix(in srgb,var(--crit) 10%,var(--paper));border-color:color-mix(in srgb,var(--crit) 35%,var(--line))"><div class="grow small"><b>${w.pct} % mehr Verbrauch</b> pro Tag als üblich (${nf(w.last.perDay)} statt ${nf(w.med)} ${u}).${mt.kind==='gas'||mt.kind==='waerme'?' Im Winter ist mehr normal.':' Gerät defekt oder Leck? Kurz prüfen lohnt sich.'}</div></div>`:''}
  ${meterChart(mt)}<div class="row"><button class="btn sm pri" data-act="reading" data-id="${o.id}" data-m="${mt.id}">Ablesung eintragen</button><button class="btn sm ghost" data-act="meter" data-id="${o.id}" data-m="${mt.id}">Einstellungen</button></div>`)});
 h+=`<button class="btn block" data-act="meter" data-id="${o.id}" style="margin-top:14px">Zähler hinzufügen</button>`;
 return h}
