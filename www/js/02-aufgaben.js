/* Kleinkram · Routinen mit Rhythmus, wiederkehrende Aufgaben, Aufgaben-Logik, Mini-Schritte */
"use strict";
/* ---------- Routinen ---------- */
const RWD=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const rWin=r=>r.freq==='weekly'?7:r.freq==='days'?Math.max(1,+r.n||1):1;
function lastDone(r,upto){let m='';for(const d of r.days)if(d<=upto&&d>m)m=d;return m}
function rDue(r,day=today()){if(r.days.includes(day))return true;const ld=lastDone(r,day);
 if(r.freq==='weekly'){const k=(P(day).getDay()-(+r.wd||0)+7)%7;return !ld||ld<addDays(day,-k)}
 if(r.freq==='days')return !ld||diff(ld,day)>=rWin(r);return true}
function rNext(r){const t=today();if(r.freq==='weekly'){const k=((+r.wd||0)-P(t).getDay()+7)%7;return addDays(t,k||7)}if(r.freq==='days'){const ld=lastDone(r,t);return addDays(ld||t,rWin(r))}return addDays(t,1)}
const rLabel=r=>r.freq==='weekly'?`jeden ${RWD[+r.wd||0]}`:r.freq==='days'?`alle ${rWin(r)} Tage`:'täglich';
function rStreak(r){const w=rWin(r),set=new Set(r.days);const has=(a,b)=>{for(let d=a;d<=b;d=addDays(d,1))if(set.has(d))return true;return false};let end=today();if(!has(addDays(end,-w+1),end))end=addDays(end,-w);let n=0;while(n<500&&has(addDays(end,-w+1),end)){n++;end=addDays(end,-w)}return n}
function rLink(r){if(r.link==='unpaid'){const n=S.docs.filter(d=>d.kind==='rechnung'&&!d.paid).length;return`<button class="chip ${n?'warn':'ok'}" data-act="rlink" data-l="unpaid">${n?`${n} offen`:'alles bezahlt'}</button>`}
 if(r.link==='docs')return`<button class="chip" data-act="rlink" data-l="docs">Ablage</button>`;return''}
function allStreak(){const set=new Set(S.allDone);let d=today();if(!set.has(d))d=addDays(d,-1);let n=0;while(set.has(d)){n++;d=addDays(d,-1)}return n}
function pflichtDone(day=today()){const p=S.routines.filter(r=>r.pflicht&&rDue(r,day));return p.length>0&&p.every(r=>r.days.includes(day))}
function toggleRoutine(id){const r=S.routines.find(x=>x.id===id);if(!r)return;const t=today();
 if(r.days.includes(t)){r.days=r.days.filter(d=>d!==t);S.allDone=S.allDone.filter(d=>d!==t);save();render();return}
 r.days.push(t);r.days=r.days.slice(-400);sound('tick');haptic(12);
 if(pflichtDone(t)&&!S.allDone.includes(t)){S.allDone.push(t);S.allDone=S.allDone.slice(-400)}
 if(pflichtDone(t)&&!S.bonusDays.includes(t)){S.bonusDays.push(t);S.bonusDays=S.bonusDays.slice(-400);const st=allStreak();const b=10+Math.min(st,10)*2;pts(5,r.title);setTimeout(()=>pts(b,`Alle Routinen · ${st} Tage am Stück`),700);setTimeout(()=>stamp('Tag geschafft'),300)}
 else pts(5,r.title);
 save();render();const el=document.querySelector(`[data-rid="${id}"] .check`);el&&el.classList.add('pop')}

/* ---------- Wiederkehrendes → Aufgaben ---------- */
function recTitle(r){const y=+r.next.slice(0,4);return r.title.replace('{vorjahr}',y-1).replace('{jahr}',y)}
function syncRecurring(){const t=today();let ch=false;
 S.recurring.forEach(r=>{if(!r.next)return;if(t>=addDays(r.next,-(r.lead||14))&&r.lastGen!==r.next&&!S.tasks.some(x=>x.rid===r.id&&!x.done&&!x.archived)){
  S.tasks.push({id:uid(),title:recTitle(r),cat:r.cat,due:r.next,created:t,postponed:0,started:false,done:null,steps:[],cost:r.cost?{...r.cost}:null,bundle:'',buddy:null,rid:r.id});r.lastGen=r.next;ch=true}});
 if(ch)save()}
const everyLabel=m=>m===12?'jährlich':m===1?'monatlich':m===24?'alle 2 Jahre':m===6?'halbjährlich':m===3?'vierteljährlich':`alle ${m} Monate`;

/* ---------- Aufgaben ---------- */
const openTasks=()=>S.tasks.filter(x=>!x.done&&!x.archived);
function snow(t){if(t.done||!t.due)return 0;const k=diff(today(),t.due);if(k<0)return 3;if(k<=2)return 2;if(k<=7)return 1;return 0}
const SNOWTXT=['ruhig','rollt an','wird größer','Lawine'];
const ageOf=t=>Math.min(t.postponed||0,3);
function score(t){const s=snow(t);return s*100+(t.cost&&t.cost.eur?20:0)+(t.started?15:0)+ageOf(t)*8-(t.due?Math.max(0,diff(today(),t.due)):30)}
function ranked(){return openTasks().filter(t=>!t.snoozeUntil||t.snoozeUntil<=today()).sort((a,b)=>score(b)-score(a))}
function nextStep(t){return(t.steps||[]).find(s=>!s.done)}
function completeTask(id,silent){const t=S.tasks.find(x=>x.id===id);if(!t||t.done)return;const d=today();t.done=d;markActive();
 let n=15,why='Erledigt';if(t.due&&d<=t.due){n+=10;why='Erledigt, vor der Frist'}if(ageOf(t)>=2){n+=ageOf(t)*5;why='Altlast besiegt'}if(t.rid)n+=5;
 if(!t.example&&t.cost&&+t.cost.eur>0&&(!t.due||d<=t.due)){S.pot.entries.push({id:uid(),d,eur:+t.cost.eur,w:`${t.title}: ${t.cost.note||'Kosten vermieden'}`})}
 if(t.rid){const r=S.recurring.find(x=>x.id===t.rid);if(r&&r.lastGen===r.next){r.next=addMonths(r.next,r.every||12);while(r.next<=d)r.next=addMonths(r.next,r.every||12)}}
 if(t.nkObj){const o=objById(t.nkObj);if(o){o.nkDone=o.nkDone||[];if(!o.nkDone.includes(t.nkYear))o.nkDone.push(t.nkYear)}}
 if(t.docId){const doc=S.docs.find(x=>x.id===t.docId);if(doc&&!doc.paid){doc.paid=true;doc.paidDate=d}}
 save();if(!silent)stamp();pts(n,why);if(!t.example&&t.cost&&+t.cost.eur>0&&(!t.due||d<=t.due))setTimeout(()=>toast(`${eur(t.cost.eur)} wandern in deinen Spar-Topf`),1500);render()}
function postpone(t,toDate){t.postponed=(t.postponed||0)+1;t.due=toDate||addDays(today(),1);save()}

/* Mini-Schritte (offline, nach Stichworten) */
const STEPLIB=[
 [/steuer|elster/i,['Ordner mit Belegen auf den Tisch legen','ELSTER-Login suchen und einmal einloggen','Lohnsteuerbescheinigung raussuchen','Handwerker-Rechnungen in der Ablage ansehen','Nur die Anlage N anfangen','Speichern. Für heute reicht das.']],
 [/einspruch|widerspruch/i,['Bescheid neben deine Unterlagen legen','Abweichungen markieren','Entscheiden: Einspruch ja oder nein','Einspruch schreiben (ELSTER: „Einspruch“) oder Steuerberater fragen','Bestätigung in der Ablage speichern']],
 [/rechnung|bezahl|überweis|ueberweis|mahnung/i,['Rechnung vor dich legen','Banking-App öffnen','GiroCode scannen oder IBAN kopieren','Betrag und Empfänger prüfen','Überweisung selbst absenden','Hier als erledigt abhaken']],
 [/arzt|zahnarzt|termin vereinbar|praxis/i,['Telefonnummer raussuchen','Deinen Kalender für die nächsten 2 Wochen ansehen','Zwei mögliche Zeiten notieren','Anrufen und nur nach einem Termin fragen','Termin hier eintragen']],
 [/anruf|anrufen|telefon/i,['Nummer raussuchen','Zwei Sätze notieren: Was willst du erreichen?','Wählen. Ein schlechter Anruf ist besser als keiner.','Ergebnis kurz notieren']],
 [/kündig|kuendig/i,['Vertrag oder Kundennummer raussuchen','Kündigungsfrist nachsehen','Kündigung schreiben (2 Sätze reichen)','Absenden und Bestätigung anfordern','Frist im Kalender eintragen']],
 [/antrag|beantrag|formular|ausfüll|ausfuell/i,['Formular finden und öffnen','Liste der nötigen Unterlagen aufschreiben','Die ersten drei Felder ausfüllen','Fehlende Unterlagen besorgen','Prüfen, unterschreiben, abgeben']],
 [/mail|e-mail|schreib|brief|antwort/i,['Empfänger raussuchen','Betreff schreiben','Drei Stichpunkte notieren','Ausformulieren, ruhig holprig','Selbst absenden']],
 [/handwerk|elektrik|klempner|heizung|reparatur|installateur/i,['Problem fotografieren','Zwei Betriebe raussuchen','Anfrage schicken oder anrufen','Termin hier eintragen','Rechnung später scannen (Steuer!)']],
 [/zähler|zaehler|ablesen|strom|gas|wasser/i,['Taschenlampe und Handy schnappen','Zählerstand fotografieren','Stand beim Versorger eingeben','Foto in der Ablage speichern']],
 [/reifen|tüv|tuev|werkstatt|auto|kfz/i,['Werkstatt-Nummer raussuchen','Zwei mögliche Termine überlegen','Anrufen oder online buchen','Termin eintragen']],
 [/putz|aufräum|aufraeum|sortier|keller|bad|küche|kueche/i,['Timer auf 5 Minuten','Nur eine Fläche wählen','Müll weg, Rest an seinen Platz','Kurz ansehen: sieht besser aus']],
 [/kauf|besorg|bestell/i,['Genau aufschreiben, was du brauchst','Wo gibt es das? Ein Laden oder Shop','Bestellen oder hinfahren']],
];
function suggestSteps(title){const hit=STEPLIB.find(([re])=>re.test(title));return(hit?hit[1]:['Was ist der allererste sichtbare Handgriff? Nur den.','Alles Nötige hinlegen','5 Minuten anfangen','Nächsten Schritt notieren']).map(t=>({t,done:false}))}
