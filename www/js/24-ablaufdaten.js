/* Kleinkram · Ablaufdaten: Ausweis, Reisepass, Führerschein, TÜV … – rechtzeitig erneuern (nur das Datum wird gespeichert) */
"use strict";
/* [Art, Vorlauf in Monaten, Verlängerung in Jahren (Vorschlag), Mini-Schritte] */
const ABL={
 perso:['Personalausweis',3,10,['Termin beim Bürgeramt buchen (oft Wochen Vorlauf)','Biometrisches Passbild besorgen (digital, z. B. Fotograf oder Automat im Amt)','Alten Ausweis mitnehmen','Neuen Ausweis abholen (ca. 3–4 Wochen später)']],
 pass:['Reisepass',4,10,['Termin beim Bürgeramt buchen','Biometrisches Passbild besorgen','Alten Pass mitnehmen','Für Reisen: Einreisebestimmungen prüfen (oft 6 Monate Restgültigkeit nötig)']],
 fs:['Führerschein (Umtausch)',3,15,['Umtauschfrist für deinen Führerschein prüfen','Termin bei der Führerscheinstelle','Passbild, Ausweis und alten Führerschein mitnehmen']],
 tuev:['TÜV / Hauptuntersuchung',1,2,['Termin bei TÜV, DEKRA oder Werkstatt machen','Licht, Reifen, Bremsen vorher kurz checken','Fahrzeugschein mitnehmen']],
 karte:['Bank- / Kreditkarte',1,4,['Neue Karte kommt meist automatisch – Post im Blick behalten','Alte Karte zerschneiden','Neue Karte bei Online-Shops und Abos hinterlegen']],
 kk:['Krankenkassenkarte',1,5,['Neue Karte bei der Krankenkasse anfordern, falls nicht automatisch','Foto hochladen, wenn verlangt']],
 sonstig:['Sonstiges',2,1,['Erneuerung beantragen']]};
const abls=()=>S.ablauf=S.ablauf||[];
const ablVor=a=>addMonths(a.datum,-(+a.vorlauf||ABL[a.art][1]));
function syncAblauf(){const t=today();let ch=false;abls().forEach(a=>{if(!a.datum)return;const vor=ablVor(a);
 if(t>=vor&&a.lastGen!==a.datum&&!S.tasks.some(x=>x.ablId===a.id&&!x.done&&!x.archived)){const k=diff(t,a.datum);
  S.tasks.push({id:uid(),title:`${a.name||ABL[a.art][0]}${a.wer&&a.wer!=='Ich'?` (${a.wer})`:''} ${k<0?'ist abgelaufen':`läuft am ${fmtDate(a.datum)} ab`} – erneuern`,cat:'verwaltung',due:addDays(a.datum,a.art==='tuev'?0:-14),created:t,postponed:0,started:false,done:null,cost:null,bundle:'',buddy:null,ablId:a.id,
   steps:ABL[a.art][3].map(x=>({t:x,done:false})).concat([{t:'Neues Ablaufdatum in Kleinkram eintragen',done:false}])});a.lastGen=a.datum;ch=true}});if(ch)save()}
function ablaufSheet(id){const isNew=!id;const a=abls().find(x=>x.id===id)||{id:uid(),art:'perso',name:'',wer:'Ich',datum:'',vorlauf:''};
 sheet(`<h2>${isNew?'Ablaufdatum eintragen':esc(a.name||ABL[a.art][0])}</h2>
 <label class="f">Was?<select class="inp" id="aA">${Object.entries(ABL).map(([k,v])=>`<option value="${k}" ${a.art===k?'selected':''}>${v[0]}</option>`).join('')}</select></label>
 <label class="f" id="aNw">Bezeichnung<input class="inp" id="aN" value="${esc(a.name)}" placeholder="z. B. Aufenthaltstitel, Jagdschein, Feuerlöscher-Prüfung"></label>
 <div class="grid2"><label class="f">Für wen?<input class="inp" id="aW" value="${esc(a.wer)}" placeholder="Ich, Partnerin, Kind …"></label><label class="f">Gültig bis<input class="inp" type="date" id="aD" value="${a.datum}"></label></div>
 <label class="f">Erinnern<select class="inp" id="aV">${[1,2,3,4,6].map(m=>`<option value="${m}" ${(+a.vorlauf||ABL[a.art][1])===m?'selected':''}>${m} Monat${m>1?'e':''} vorher</option>`).join('')}</select></label>
 <p class="small muted">Gespeichert wird nur das Datum – keine Ausweisnummer. Das Datum steht auf dem Dokument („gültig bis“), beim TÜV auf der Plakette bzw. im Fahrzeugschein.</p>
 <div class="row"><button class="btn pri grow" id="aS">Speichern</button>${isNew?'':'<button class="btn" id="aR">Erneuert</button><button class="btn danger" id="aX">Löschen</button>'}</div>`,s=>{
  const vis=()=>{s.querySelector('#aNw').hidden=val('aA')!=='sonstig'};vis();s.querySelector('#aA').onchange=()=>{vis();s.querySelector('#aV').value=ABL[val('aA')][1]};
  s.querySelector('#aS').onclick=()=>{const d=val('aD');if(!d){toast('Wann läuft es ab?');return}const old=a.datum;Object.assign(a,{art:val('aA'),name:val('aA')==='sonstig'?val('aN'):'',wer:val('aW')||'Ich',datum:d,vorlauf:+val('aV')});if(old!==d)a.lastGen=null;
   if(isNew){abls().push(a);pts(3,'Ablaufdatum gemerkt')}save();closeSheet();render();toast(`Erinnerung ab ${fmtDate(ablVor(a))}`)};
  const r=s.querySelector('#aR');r&&(r.onclick=()=>{const nd=addMonths(a.datum,12*ABL[a.art][2]);sheet(`<h2>Erneuert 🎉</h2><label class="f">Neu gültig bis<input class="inp" type="date" id="aND" value="${nd}"></label><p class="small muted">Vorschlag: ${ABL[a.art][2]} Jahr${ABL[a.art][2]>1?'e':''} später – bitte mit dem neuen Dokument vergleichen.</p><button class="btn pri block" id="aNS">Speichern</button>`,s2=>s2.querySelector('#aNS').onclick=()=>{a.datum=val('aND');a.lastGen=null;S.tasks.filter(x=>x.ablId===a.id&&!x.done).forEach(x=>x.done=today());pts(10,'Dokument erneuert');save();closeSheet();render()})});
  const x=s.querySelector('#aX');x&&(x.onclick=()=>confirmSheet('Eintrag löschen?','','Löschen',()=>{S.ablauf=abls().filter(z=>z.id!==a.id);save();render()},true))})}
function vAblauf(){const t=today();const L=abls().slice().sort((a,b)=>a.datum.localeCompare(b.datum));
 return reg('Ausweise & Prüftermine',L.length,(L.map(a=>{const k=diff(t,a.datum),vor=t>=ablVor(a);return`<div class="li" data-act="ablauf" data-id="${a.id}" style="cursor:pointer"><span class="dot" style="${cv('verwaltung')}"></span><div class="grow"><p>${esc(a.name||ABL[a.art][0])}</p><p class="small muted">${esc(a.wer||'Ich')} · gültig bis ${fmtDate(a.datum)}</p></div><span class="chip ${k<0?'crit':vor?'warn':'ok'}">${k<0?'abgelaufen':vor?`noch ${k} Tage`:k>730?`${Math.floor(k/365)} Jahre`:`${Math.round(k/30)} Monate`}</span></div>`}).join('')||'<div class="empty">Personalausweis, Reisepass, TÜV, Führerschein: einmal das Ablaufdatum eintragen – Kleinkram erinnert dich so früh, dass du noch einen Termin beim Amt bekommst.</div>')+`<div class="li"><button class="btn sm" data-act="ablauf">Ablaufdatum eintragen</button></div>`,true)}
