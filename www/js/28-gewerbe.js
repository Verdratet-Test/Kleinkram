/* Kleinkram · Gewerbe-Kasse (Nebengewerbe, Kleinunternehmer)
   Einnahmen und Ausgaben getrennt von allem Privaten und vom §35a-Sammler. Daten in S.biz, Belege in IndexedDB „gw-<id>“.
   Alles bleibt auf dem Gerät. Export, Sicherung und Teilen nur auf Knopfdruck. Ersetzt keine Steuerberatung. */
const GW_EIN=['Verkäufe Verdrahtet','Sonstige Einnahmen'];
const GW_AUS=['Software und Abos','Hosting und Domain','Gebühren Bezahldienst und Stores','Werbung','Beratung und Rechtstexte','Behörden und Amtsgebühren','Geschäftsadresse','Geräte und Hardware','Fachliteratur und Normen','Reisen und Messe','Telefon und Internet (Anteil)','Sonstige Ausgaben'];
const GW_TEL='Telefon und Internet (Anteil)',GW_GER='Geräte und Hardware',GW_FEE='Gebühren Bezahldienst und Stores';
const GW_LAND={nein:'Nein',eu:'EU',nicht:'Nicht-EU'};
const GW_EU=new Set('AT BE BG CY CZ DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' '));
function gw(){const B=S.biz=S.biz||{};B.items=B.items||[];B.trash=B.trash||[];B.firm=B.firm||{};B.done=B.done||{};B.abos=B.abos||[];B.aboDone=B.aboDone||{};B.genM=B.genM||{};
 B.set=Object.assign({start:'2026-12-01',pay:'Digistore24',mode:'auszahlung',tel:''},B.set||{});return B}
const gwYM=d=>String(d||'').slice(0,7);
const gwPrevYM=ym=>{let[y,m]=ym.split('-').map(Number);m--;if(!m){m=12;y--}return`${y}-${pad(m)}`};
const gwDE=d=>d?`${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}`:'';
const gwNum=n=>(Math.round((+n||0)*100)/100).toFixed(2).replace('.',',');
/* Betrag lesen: „1.234,56“, „29,9“, „29.90“, „12 €“ – nie negativ */
function gwParse(s){s=String(s??'').trim().replace(/[\s\u00a0€']|EUR/gi,'');if(!s)return null;s=s.replace(/^(\d[\d.]*),[-–—]$/,'$1,00');if(/[-−–]/.test(s))return'neg';
 const c=s.lastIndexOf(','),d=s.lastIndexOf('.');
 if(c>=0&&d>=0){const dec=c>d?',':'.',grp=dec===','?'.':',';s=s.split(grp).join('').replace(dec,'.')}
 else if(c>=0){if((s.match(/,/g)||[]).length>1)return NaN;s=s.replace(',','.')}
 else if(d>=0&&(/^\d{1,3}(\.\d{3})+$/.test(s)))s=s.replace(/\./g,'');
 if(!/^\d+(\.\d+)?$/.test(s))return NaN;if(/\.\d{3,}$/.test(s))return'dec';return Math.round(parseFloat(s)*100)/100}
const gwFound=()=>+gw().set.start.slice(0,4)||new Date().getFullYear();
const gwYW=d=>{if(!d)return false;const md=d.slice(5);return md>='12-22'||md<='01-10'};
const gwSign=it=>it.art==='ein'?1:-1;
const gwFirmKey=w=>String(w||'').toLowerCase().replace(/\b(gmbh|ag|ug|ltd|limited|inc|llc|co|kg|se|b\.v\.|bv|sarl|s\.a\.)\b|[^a-zäöüß0-9]/g,'');

/* ---------- Auswertung pro Jahr ---------- */
/* gerechnet wird in ganzen Cent, damit sich keine Rundungsfehler aufsummieren */
const gwCt=v=>Math.round((+v||0)*100);
function gwYear(y){const B=gw(),L=B.items.filter(it=>it.date&&it.date.startsWith(String(y)+'-'));const M=[...Array(12)].map(()=>({ein:0,aus:0,n:0}));const cats={};const ausl={};let ein=0,aus=0;
 L.forEach(it=>{const m=+it.date.slice(5,7)-1,c=gwCt(it.amount);if(it.art==='ein'){ein+=c;M[m].ein+=c}else{aus+=c;M[m].aus+=c}M[m].n++;
  const g=cats[it.kat]=cats[it.kat]||{art:it.art,sum:0,n:0};g.sum+=c;g.n++;
  if(it.art==='aus'&&it.ausland&&it.ausland!=='nein'){(ausl[m]=ausl[m]||[]).push(it)}});
 M.forEach(x=>{x.ein/=100;x.aus/=100});Object.values(cats).forEach(g=>g.sum/=100);
 return{L,M,cats,ausl,ein:ein/100,aus:aus/100,gewinn:(ein-aus)/100}}
const gwYears=()=>{const s=new Set(gw().items.map(it=>+it.date.slice(0,4)));s.add(new Date().getFullYear());s.add(gwFound());return[...s].filter(Boolean).sort((a,b)=>b-a)};
function gwLimit(y,ein){const fy=gwFound(),prev=gwYear(y-1).ein;
 if(y<fy)return{max:25000,txt:'Vor dem Gewerbebeginn.'};
 if(y===fy)return{max:25000,txt:'Gründungsjahr: harte Grenze. Ab dem Umsatz, der 25.000 € übersteigt, fällt sofort Umsatzsteuer an.'};
 if(prev>25000)return{max:100000,warn:true,txt:`Vorjahr ${eur(prev)} – über 25.000 €. Dann giltst du in diesem Jahr nicht mehr als Kleinunternehmer. Mit Steuerberater klären.`};
 return{max:25000,txt:`Über 25.000 € bleibst du dieses Jahr Kleinunternehmer, ab 1.1.${y+1} nicht mehr. Über 100.000 € entfällt die Regelung sofort.`}}

/* ---------- Erinnerungen als Aufgaben (Belege des Monats, Sichern) ---------- */
function gwTask(o){return Object.assign({id:uid(),cat:'geschaeft',created:today(),postponed:0,started:false,done:null,steps:[],cost:null,bundle:'',buddy:null},o)}
function syncGewerbe(){if(typeof mod!=='function'||!mod('gewerbe'))return;const B=gw(),t=today(),cur=gwYM(t);let ch=false;
 if(!B.enabledYM){B.enabledYM=cur;ch=true}
 const startYM=[gwYM(B.set.start),B.enabledYM].sort()[1];
 S.tasks.forEach(x=>{if(x.gwMonth&&x.done&&!B.done[x.gwMonth]){B.done[x.gwMonth]=x.done;ch=true}});
 /* für jeden abgeschlossenen Monat seit Beginn (höchstens 12 zurück) – auch wenn die App einen Monat lang nicht offen war */
 let P=gwPrevYM(cur);const todo=[];for(let i=0;i<12&&P>=startYM;i++){todo.unshift(P);P=gwPrevYM(P)}
 todo.forEach(P=>{if(B.done[P]||B.genM[P]||S.tasks.some(x=>x.gwMonth===P&&!x.archived))return;const[y,m]=P.split('-');
  S.tasks.push(gwTask({title:`Gewerbe-Kasse: Belege ${MONL[+m-1]} ${y} eintragen`,due:addDays(cur+'-01',6),gwMonth:P,steps:[{t:'Mehr → Gewerbe-Kasse öffnen',done:false},{t:'Belege scannen oder eintragen',done:false},{t:'Monat als vollständig markieren',done:false}]}));B.genM[P]=1;ch=true});
 const age=B.lastBackup?diff(B.lastBackup,t):999;
 if(B.items.length&&age>=30&&B.genB!==cur&&!S.tasks.some(x=>x.gwBackup&&!x.done&&!x.archived)){S.tasks.push(gwTask({title:'Gewerbe-Kasse sichern',due:addDays(t,3),gwBackup:true,steps:[{t:'Mehr → Gewerbe-Kasse → Sicherung',done:false},{t:'Datei an einen Ort außerhalb des Handys teilen (z. B. Google Drive, E-Mail an dich, PC)',done:false}]}));B.genB=cur;ch=true}
 if(ch)save()}
function gwMonthDone(P){const B=gw();B.done[P]=today();const tk=S.tasks.find(x=>x.gwMonth===P&&!x.done);save();if(tk)completeTask(tk.id);else render()}
function gwBackedUp(out){const B=gw();B.lastBackup=today();if(out)B.lastBackupOut=today();save();S.tasks.filter(x=>x.gwBackup&&!x.done).forEach(x=>completeTask(x.id,true))}

/* ---------- Abos: jeden Monat als Vorschlag ---------- */
function gwAboDue(){const B=gw(),t=today(),cur=gwYM(t),out=[];B.abos.filter(a=>a.active!==false).forEach(a=>{let ym=a.from;let guard=0;
  while(ym<=cur&&guard++<36){const day=Math.min(28,a.day||1);const d=`${ym}-${pad(day)}`;if(d<=t&&!B.aboDone[`${a.id}:${ym}`])out.push({a,ym,d});ym=gwYM(addMonths(ym+'-01',1))}});return out}

/* ---------- Ansicht ---------- */
const gwBadge=(t,c)=>`<span class="chip ${c||''}" style="font-size:.7rem">${t}</span>`;
function gwRow(it){const tel=it.full&&it.pct?` · Rechnung ${eur(it.full)}, ${String(it.pct).replace('.',',')} %`:'';
 return`<button class="li gw-row" data-act="gwEdit" data-id="${it.id}"><div class="grow" style="min-width:0"><p style="overflow-wrap:anywhere"><b>${esc(it.wer||it.kat)}</b>${it.wofuer?` <span class="muted">· ${esc(it.wofuer)}</span>`:''}</p>
 <p class="small muted">${gwDE(it.date)} · ${esc(it.kat)}${tel}</p><p>${it.ausland&&it.ausland!=='nein'?gwBadge('Ausland '+GW_LAND[it.ausland],'warn'):''}${!it.beleg?gwBadge('kein Beleg','crit'):''}${it.file?gwBadge('📎 Beleg'):''}${gwYW(it.date)?gwBadge('Jahreswechsel','warn'):''}${it.pair?gwBadge('Verkauf/Gebühr'):''}</p></div>
 <b class="mono" style="white-space:nowrap;color:${it.art==='ein'?'var(--ok)':'var(--crit)'}">${it.art==='ein'?'+':'−'} ${eur(it.amount)}</b></button>`}
function vGewerbe(){const B=gw(),y=UI.gwY||new Date().getFullYear(),Y=gwYear(y),lim=gwLimit(y,Y.ein),cur=gwYM(today());
 let h=`<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-act="go" data-to="ich">${ICON.left} Zurück</button></div>`+head('Gewerbe-Kasse',`seit ${gwDE(B.set.start)}`);
 h+=`<div class="gw-note small">Ersetzt keine Steuerberatung. Belege müssen 8 Jahre aufgehoben werden – Kleinkram löscht nichts von selbst.</div>`;
 h+=`<div class="gw-years">${gwYears().map(v=>`<button class="folder ${v===y?'on':''}" data-act="gwYear" data-y="${v}">${v}</button>`).join('')}</div>`;
 h+=`<div class="row" style="gap:8px;margin:10px 0"><label class="btn pri grow" for="gwScan">📷 Beleg scannen</label><button class="btn grow" data-act="gwNew">＋ Buchung</button></div>
 <input type="file" id="gwScan" accept="image/*" capture="environment" hidden><input type="file" id="gwScanG" accept="image/*" multiple hidden>
 <p class="small" style="margin:-4px 0 8px"><label for="gwScanG" class="linkish">Beleg aus der Galerie</label></p>`;
 /* Hinweise */
 const age=B.lastBackup?diff(B.lastBackup,today()):null;
 if(B.items.length&&(age===null||age>=30))h+=`<div class="card gw-warn"><p><b>Sichern nicht vergessen</b></p><p class="small">${age===null?'Die Gewerbe-Kasse wurde noch nie gesichert.':`Letzte Sicherung vor ${age} Tagen.`} Geht das Handy kaputt, ist sonst die Buchhaltung weg.</p><button class="btn sm pri" data-act="gwBackup">Jetzt sichern</button></div>`;
 const due=gwAboDue();if(due.length)h+=reg('Abos – bitte bestätigen',due.length,due.map((x,i)=>`<div class="gw-abo"><p><b>${esc(x.a.wer||x.a.kat)}</b> · ${eur(x.a.amount)}</p><p class="small muted">${esc(x.a.kat)} · fällig ${gwDE(x.d)}</p><div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn sm pri" data-act="gwAboOk" data-i="${i}">Buchen</button><button class="btn sm" data-act="gwAboEdit" data-i="${i}">Ändern</button><button class="btn sm ghost" data-act="gwAboSkip" data-i="${i}">Überspringen</button></div></div>`).join(''));
 Object.keys(Y.ausl).sort((a,b)=>a-b).forEach(m=>{const L=Y.ausl[m],s=L.reduce((a,it)=>a+it.amount,0);
  h+=`<div class="card gw-warn"><p><b>⚠️ ${MONL[m]} ${y}: ${L.length} ${L.length===1?'Ausgabe':'Ausgaben'} aus dem Ausland</b></p><p class="small">Reverse Charge prüfen, eventuell Umsatzsteuer-Voranmeldung nötig. Grob 19 % auf ${eur(s)} = ${eur(s*.19)}.</p><p class="small muted">${L.map(it=>esc(it.wer||it.kat)).join(', ')}</p></div>`});
 /* Zahlen */
 const pctL=Math.min(100,Y.ein/lim.max*100);
 h+=`<div class="gw-sums"><div class="gw-sum"><span>Einnahmen</span><b style="color:var(--ok)">${eur(Y.ein)}</b></div><div class="gw-sum"><span>Ausgaben</span><b style="color:var(--crit)">${eur(Y.aus)}</b></div><div class="gw-sum wide"><span>Gewinn ${y}</span><b>${eur(Y.gewinn)}</b></div></div>
 <div class="card"><div class="row" style="justify-content:space-between"><b>Luft bis ${lim.max===25000?'25.000':'100.000'} €</b><b class="mono">${eur(Math.max(0,lim.max-Y.ein))}</b></div><span class="bar" style="width:100%;margin:8px 0"><i style="width:${pctL.toFixed(1)}%;background:${pctL>=100?'var(--crit)':pctL>=80?'var(--warn)':'var(--ok)'}"></i></span><p class="small muted">${esc(lim.txt)} Gezählt werden Einnahmen nach Zahlungsdatum.</p>${lim.warn?'<p class="small"><span class="chip crit">bitte prüfen</span></p>':''}</div>`;
 /* Monate */
 const maxM=Math.max(1,...Y.M.map(x=>Math.max(x.ein,x.aus)));
 h+=reg('Nach Monaten',null,`<div class="gw-months">${Y.M.map((x,i)=>{const ym=`${y}-${pad(i+1)}`,past=ym<cur,sel=UI.gwM===i;return`<button class="gw-m ${sel?'on':''}" data-act="gwMonth" data-m="${i}"><span class="gw-bars"><i style="height:${x.ein/maxM*100}%;background:var(--ok)"></i><i style="height:${x.aus/maxM*100}%;background:var(--crit)"></i></span><small>${MONL[i].slice(0,3)}</small>${B.done[ym]?'<small class="gw-ok">✓</small>':''}</button>`}).join('')}</div>
  ${UI.gwM!=null?(()=>{const i=UI.gwM,x=Y.M[i],ym=`${y}-${pad(i+1)}`;return`<div class="li"><div class="grow"><p><b>${MONL[i]} ${y}</b></p><p class="small muted">Einnahmen ${eur(x.ein)} · Ausgaben ${eur(x.aus)} · Gewinn ${eur(x.ein-x.aus)}</p></div>${ym<=cur?(B.done[ym]?`<span class="chip ok">vollständig</span>`:`<button class="btn sm" data-act="gwDone" data-ym="${ym}">Monat vollständig</button>`):''}</div>`})():'<p class="small muted">Monat antippen für Details und um ihn als vollständig zu markieren.</p>'}`);
 /* Kategorien */
 const cs=Object.entries(Y.cats).sort((a,b)=>(a[1].art===b[1].art?b[1].sum-a[1].sum:a[1].art==='ein'?-1:1));
 h+=reg('Nach Kategorien',cs.length,cs.length?cs.map(([k,c])=>`<div class="li"><div class="grow"><p>${esc(k)}</p><p class="small muted">${c.n} ${c.n===1?'Buchung':'Buchungen'}</p></div><b class="mono" style="color:${c.art==='ein'?'var(--ok)':'var(--crit)'}">${c.art==='ein'?'+':'−'} ${eur(c.sum)}</b></div>`).join(''):'<p class="small muted">Noch keine Buchungen in diesem Jahr.</p>');
 /* Buchungen */
 const L=Y.L.filter(it=>UI.gwM==null||+it.date.slice(5,7)-1===UI.gwM).sort((a,b)=>b.date.localeCompare(a.date)||(b.created||0)-(a.created||0));
 h+=reg(UI.gwM!=null?`Buchungen ${MONL[UI.gwM]}`:'Buchungen',L.length,L.length?L.map(gwRow).join(''):'<p class="small muted">Keine Buchungen.</p>');
 /* Export & Sicherung */
 h+=reg('Export und Sicherung',null,`<p class="small muted">Nur auf Knopfdruck. Für ${y}.</p><div class="gw-grid">
  <button class="btn" data-act="gwCsv">📄 CSV</button><button class="btn" data-act="gwPdf">🧾 Jahres-PDF</button><button class="btn" data-act="gwZip">🗂️ Belege als ZIP</button><button class="btn" data-act="gwBackup">💾 Sicherung</button></div>
  <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn sm ghost" data-act="gwRestore">Sicherung einspielen</button><button class="btn sm ghost" data-act="gwTrash">Papierkorb (${B.trash.length})</button><button class="btn sm ghost" data-act="gwSet">Einstellungen</button></div>
  <p class="small muted" style="margin-top:6px">Zuletzt gesichert: ${B.lastBackup?fmtD(B.lastBackup):'noch nie'}${B.lastBackupOut?` · außerhalb des Handys: ${fmtD(B.lastBackupOut)}`:''}</p>`);
 return h}

/* ---------- Buchung anlegen / ändern ---------- */
function gwGuessKat(text,art){const t=String(text||'').toLowerCase();const B=gw();
 if(art==='ein')return new RegExp(B.set.pay.toLowerCase().replace(/[^a-z0-9]/g,'.?')).test(t)||/verdrahtet/.test(t)?GW_EIN[0]:GW_EIN[1];
 const R=[[/google play|app store|apple distribution|digistore|paddle|stripe|paypal|lemon ?squeezy|gebühr|transaktion|fee\b/,GW_FEE],[/google ads|meta platforms|facebook|tiktok ads|werbung|anzeige|ads\b/,'Werbung'],
  [/hetzner|ionos|strato|netcup|all-inkl|domain|hosting|vercel|netlify|cloudflare|server/,'Hosting und Domain'],[/telekom|vodafone|o2|telefónica|1&1|congstar|mobilfunk|dsl|glasfaser/,GW_TEL],
  [/rechtstext|it-recht|händlerbund|e-recht24|anwalt|rechtsanw|steuerberat|kanzlei/,'Beratung und Rechtstexte'],[/gewerbeamt|stadtkasse|gemeinde|finanzamt|ihk|gebührenbescheid|landratsamt|bundeskasse/,'Behörden und Amtsgebühren'],
  [/geschäftsadresse|postanschrift|virtual office|ladungsfähige/,'Geschäftsadresse'],[/vde|beuth|din |norm|fachbuch|thalia|hugendubel|verlag/,'Fachliteratur und Normen'],
  [/deutsche bahn|\bdb\b|hotel|messe|flug|lufthansa|ryanair|tankstelle|parkhaus/,'Reisen und Messe'],[/github|adobe|jetbrains|figma|microsoft|openai|anthropic|notion|canva|abo|subscription|lizenz|software/,'Software und Abos'],
  [/mediamarkt|saturn|notebook|laptop|monitor|smartphone|tablet|festplatte|ssd|hardware|computer/,GW_GER]];
 for(const[re,k]of R)if(re.test(t))return k;return'Sonstige Ausgaben'}
function gwGuessLand(text,iban){const t=String(text||'').toLowerCase(),cc=String(iban||'').slice(0,2).toUpperCase();
 if(cc&&cc!=='DE')return GW_EU.has(cc)?'eu':'nicht';
 if(/reverse charge|steuerschuldnerschaft des leistungsempfängers|vat to be accounted|ireland|irland|dublin|luxembourg|luxemburg|netherlands|niederlande/.test(t))return'eu';
 if(/united states|\busa\b|\binc\.|\bllc\b|california|delaware|san francisco|singapore|united kingdom|\bltd\b.*london/.test(t))return'nicht';return null}

function gwForm(id,pre,after){const B=gw(),old=id?B.items.find(x=>x.id===id):null;const it=Object.assign({art:'aus',date:today(),inv:'',amount:'',wer:'',wofuer:'',kat:'',ausland:'nein',beleg:true,note:''},old||{},pre||{});
 let file=undefined,fileMeta=old&&old.file?old.file:null;if(pre&&pre._img){file=pre._img;fileMeta={mime:'image/jpeg'}}
 const firms=[...new Set(B.items.map(x=>x.wer).filter(Boolean))].slice(-80);
 const katOpts=a=>(a==='ein'?GW_EIN:GW_AUS).map(k=>`<option ${k===it.kat?'selected':''}>${esc(k)}</option>`).join('');
 sheet(`<h2>${old?'Buchung ändern':'Neue Buchung'}</h2>${pre&&pre._scan?'<p class="small gw-scan">Vorgeschlagen vom Scan – bitte prüfen und korrigieren.</p>':''}
 <div class="seg gw-art"><button type="button" data-art="ein" class="${it.art==='ein'?'on':''}">Einnahme</button><button type="button" data-art="aus" class="${it.art==='aus'?'on':''}">Ausgabe</button></div>
 <div class="grid2"><label class="f">Zahlungsdatum<input class="inp" type="date" id="gD" value="${esc(it.date)}"></label><label class="f">Rechnungsdatum <span class="muted small">(optional)</span><input class="inp" type="date" id="gR" value="${esc(it.inv||'')}"></label></div>
 <div id="gSplitBox" ${it.art==='ein'&&!old?'':'hidden'}><label class="switch"><span>Verkauf brutto und Gebühr getrennt buchen<br><span class="small muted">Sonst wird die Auszahlung als Einnahme gebucht, die Abrechnung von ${esc(B.set.pay)} ist der Beleg.</span></span><input type="checkbox" id="gSp" ${B.set.mode==='brutto'?'checked':''}></label>
  <div class="grid2" id="gSpF" hidden><label class="f">Verkauf brutto (€)<input class="inp mono" id="gSb" inputmode="decimal" autocomplete="off"></label><label class="f">Gebühr ${esc(B.set.pay)} (€)<input class="inp mono" id="gSg" inputmode="decimal" autocomplete="off"></label></div></div>
 <div id="gTelBox" hidden><label class="f">Rechnungsbetrag Telefon/Internet (€)<input class="inp mono" id="gTf" inputmode="decimal" value="${it.full?gwNum(it.full):''}" autocomplete="off"></label><p class="small muted" id="gTi"></p></div>
 <label class="f" id="gAl"><span id="gAlT">Betrag in € (Endbetrag laut Rechnung, brutto)</span><input class="inp mono" id="gA" inputmode="decimal" value="${it.amount!==''?gwNum(it.amount):''}" placeholder="29,90" autocomplete="off"></label>
 <label class="f">Wer<input class="inp" id="gW" value="${esc(it.wer)}" list="gwFirms" autocomplete="off" placeholder="z. B. Hetzner Online GmbH"></label><datalist id="gwFirms">${firms.map(f=>`<option value="${esc(f)}">`).join('')}</datalist>
 <label class="f">Wofür<input class="inp" id="gF" value="${esc(it.wofuer)}" autocomplete="off" placeholder="z. B. Server November"></label>
 <label class="f">Kategorie<select class="inp" id="gK">${katOpts(it.art)}</select></label>
 <div class="f"><span>Ausland?</span><div class="seg gw-land">${Object.entries(GW_LAND).map(([k,l])=>`<button type="button" data-land="${k}" class="${it.ausland===k?'on':''}">${l}</button>`).join('')}</div></div>
 <label class="switch"><span>Beleg vorhanden</span><input type="checkbox" id="gBe" ${it.beleg?'checked':''}></label>
 <div class="gw-file" id="gFile"></div>
 <div class="row" style="gap:8px"><label class="btn sm" for="gFi">📎 Foto oder PDF anhängen</label><input type="file" id="gFi" accept="image/*,application/pdf" hidden><button class="btn sm ghost" id="gFx" type="button" hidden>Anhang entfernen</button></div>
 <label class="f">Notiz<textarea class="inp" id="gN" rows="2">${esc(it.note)}</textarea></label>
 ${!old?`<label class="switch" id="gAboL"><span>Kommt jeden Monat wieder (Abo)<br><span class="small muted">Kleinkram schlägt die Buchung dann jeden Monat vor – du bestätigst, änderst oder überspringst.</span></span><input type="checkbox" id="gAbo" ${pre&&pre._abo?'disabled':''}></label>`:''}
 <div id="gH" class="stack" style="gap:6px"></div><p class="small" id="gE" style="color:var(--crit)" role="alert"></p>
 ${old&&old.hist&&old.hist.length?`<details class="more"><summary class="small">Änderungen (${old.hist.length})</summary>${old.hist.slice(-8).reverse().map(x=>`<p class="small muted">${fmtD(x.at)}: ${esc(x.txt)}</p>`).join('')}</details>`:''}
 <div class="sheet-foot stack"><button class="btn pri block" id="gS">${old?'Änderungen speichern':'Speichern'}</button>${old?'<button class="btn block ghost" id="gDel" style="color:var(--crit)">Buchung löschen</button>':''}</div>`,s=>{
  const $s=q=>s.querySelector(q);let art=it.art,land=it.ausland;
  const showFile=async()=>{const box=$s('#gFile');let src=file;if(src===undefined&&fileMeta&&old)src=await IDB.get('gw-'+old.id);
   if(src&&/^data:image/.test(src))box.innerHTML=`<img src="${src}" alt="Beleg" style="max-width:100%;max-height:220px;border-radius:10px;border:1px solid var(--line)">`;
   else if(src&&/^data:application\/pdf/.test(src))box.innerHTML=`<button class="btn sm" type="button" id="gPdfV">📄 PDF-Beleg ansehen</button>`;else box.innerHTML='';
   const pv=$s('#gPdfV');if(pv)pv.onclick=()=>shareBin('beleg.pdf',gwB64(src),'application/pdf');$s('#gFx').hidden=!src};
  showFile();
  const tel=()=>$s('#gK').value===GW_TEL;
  const hints=()=>{const H=[];const d=val('gD'),a=gwParse(val('gA'));
   if(gwYW(d))H.push('Jahreswechsel: Zuordnung mit Steuerberater prüfen.');
   if(art==='aus'&&land!=='nein')H.push('Ausland: Reverse Charge prüfen, eventuell Umsatzsteuer-Voranmeldung nötig.');
   if(art==='aus'&&$s('#gK').value===GW_GER&&typeof a==='number'&&a/1.19>800)H.push('Über 800 € netto: Abschreibung prüfen.');
   if(d&&d<B.set.start)H.push(`Vor dem Gewerbebeginn (${gwDE(B.set.start)}) – stimmt das Datum?`);
   if(!$s('#gBe').checked)H.push('Ohne Beleg: Notiz eintragen, wofür das Geld war, und Beleg möglichst nachreichen.');
   $s('#gH').innerHTML=H.map(x=>`<p class="small gw-hint">${esc(x)}</p>`).join('')};
  const telCalc=()=>{const box=$s('#gTelBox');box.hidden=!tel();$s('#gAlT').textContent=tel()?'Gebuchter Anteil (€)':split()?'Einnahme (Verkauf brutto)':'Betrag in € (Endbetrag laut Rechnung, brutto)';if(!tel())return;
   const p=parseFloat(String(B.set.tel).replace(',','.'));const f=gwParse(val('gTf'));
   if(!(p>0)){$s('#gTi').innerHTML='Noch kein Prozentsatz hinterlegt – unter <b>Einstellungen</b> eintragen, dann rechnet Kleinkram den Anteil aus. Bis dahin den Anteil selbst eintragen.';return}
   if(typeof f==='number'&&f>0){const v=Math.round(f*p)/100;$s('#gA').value=gwNum(v);$s('#gTi').textContent=`Rechnung ${eur(f)} · gebucht ${String(p).replace('.',',')} % = ${eur(v)}`}else $s('#gTi').textContent=`Es werden ${String(p).replace('.',',')} % gebucht.`};
  const split=()=>art==='ein'&&!old&&$s('#gSp')&&$s('#gSp').checked;
  const splitCalc=()=>{$s('#gSplitBox').hidden=!(art==='ein'&&!old);$s('#gSpF').hidden=!split();$s('#gA').readOnly=split();if(split()){const b=gwParse(val('gSb'));if(typeof b==='number')$s('#gA').value=gwNum(b)}telCalc()};
  s.querySelectorAll('[data-art]').forEach(b=>b.onclick=()=>{art=b.dataset.art;s.querySelectorAll('[data-art]').forEach(x=>x.classList.toggle('on',x===b));$s('#gK').innerHTML=(art==='ein'?GW_EIN:GW_AUS).map(k=>`<option>${esc(k)}</option>`).join('');if(art==='ein'){land='nein';s.querySelectorAll('[data-land]').forEach(x=>x.classList.toggle('on',x.dataset.land==='nein'))}const ab=$s('#gAboL');if(ab)ab.hidden=art!=='aus';splitCalc();hints()});
  s.querySelectorAll('[data-land]').forEach(b=>b.onclick=()=>{land=b.dataset.land;s.querySelectorAll('[data-land]').forEach(x=>x.classList.toggle('on',x===b));hints()});
  ['#gD','#gA','#gBe'].forEach(q=>$s(q).addEventListener('input',hints));$s('#gBe').onchange=hints;
  $s('#gK').onchange=()=>{telCalc();hints()};$s('#gTf').oninput=()=>{telCalc();hints()};
  if($s('#gSp')){$s('#gSp').onchange=splitCalc;$s('#gSb').oninput=splitCalc}
  $s('#gA').addEventListener('input',()=>{if(/-|−/.test(val('gA'))){$s('#gA').value=val('gA').replace(/[-−]/g,'');$s('#gE').textContent='Beträge immer ohne Minus eintragen – Einnahme oder Ausgabe ergibt sich aus der Art.'}else $s('#gE').textContent=''});
  $s('#gW').addEventListener('change',()=>{const k=gwFirmKey(val('gW')),m=B.firm[k];if(m&&!old){if(m.art===art&&(art==='ein'?GW_EIN:GW_AUS).includes(m.kat))$s('#gK').value=m.kat;if(art==='aus'&&m.land){land=m.land;s.querySelectorAll('[data-land]').forEach(x=>x.classList.toggle('on',x.dataset.land===land))}telCalc();hints()}});
  const hasOld=()=>file===undefined?!!fileMeta:!!file;
  $s('#gFi').onclick=ev=>{if(old&&old.file&&file===undefined&&!$s('#gFi').dataset.ok){ev.preventDefault();gwInlineAsk($s('#gFile'),'Vorhandenen Beleg durch einen neuen ersetzen? Der alte Beleg wird dann gelöscht.','Ersetzen',()=>{$s('#gFi').dataset.ok='1';$s('#gFi').click()})}};
  $s('#gFi').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
   if(f.type==='application/pdf'){if(f.size>12e6){toast('Die PDF ist größer als 12 MB.');return}file=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});fileMeta={mime:'application/pdf'}}
   else{try{const im=await prepDoc(f);file=canvasOf(im,1600).toDataURL('image/jpeg',.8);fileMeta={mime:'image/jpeg'}}catch(er){toast('Das Bild ließ sich nicht öffnen.');return}}
   $s('#gBe').checked=true;showFile();hints()};
  $s('#gFx').onclick=()=>{if(!hasOld())return;gwInlineAsk($s('#gFile'),'Beleg wirklich entfernen? Belege müssen 8 Jahre aufgehoben werden.','Entfernen',()=>{file=null;fileMeta=null;showFile()})};
  splitCalc();hints();
  $s('#gS').onclick=async()=>{const E=t=>{$s('#gE').textContent=t;return false};const d=val('gD');if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return E('Bitte ein Zahlungsdatum wählen.');
   let a=gwParse(val('gA'));let sb=null,sg=null;
   if(split()){sb=gwParse(val('gSb'));sg=gwParse(val('gSg'));if(sb==='neg'||sg==='neg')return E('Beträge immer ohne Minus eintragen.');if(sb==='dec'||sg==='dec')return E('Höchstens zwei Nachkommastellen (Cent).');if(!(sb>0))return E('Bitte den Verkauf brutto eintragen.');if(sg===null||sg==='')sg=0;if(!(sg>=0)||Number.isNaN(sg))return E('Die Gebühr ist keine gültige Zahl.');if(sg>sb)return E('Die Gebühr ist größer als der Verkauf.');a=sb}
   if(a==='neg')return E('Beträge immer ohne Minus eintragen – Einnahme oder Ausgabe ergibt sich aus der Art.');if(a==='dec')return E('Höchstens zwei Nachkommastellen (Cent).');if(a===null)return E('Bitte einen Betrag eintragen.');if(Number.isNaN(a)||!(a>0))return E('Der Betrag ist keine gültige Zahl (z. B. 29,90).');if(a>1e7)return E('Der Betrag ist unrealistisch hoch.');
   const rec={art,date:d,inv:val('gR')||'',amount:a,wer:val('gW').trim(),wofuer:val('gF').trim(),kat:$s('#gK').value,ausland:art==='ein'?'nein':land,beleg:$s('#gBe').checked,note:val('gN').trim()};
   if(tel()){const f=gwParse(val('gTf'));const p=parseFloat(String(B.set.tel).replace(',','.'));if(typeof f==='number'&&f>0){rec.full=f;if(p>0)rec.pct=p}else{rec.full=null;rec.pct=null}}else{rec.full=null;rec.pct=null}
   let target;
   if(old){const ch=[];const NM={art:'Art',date:'Datum',inv:'Rechnungsdatum',amount:'Betrag',wer:'Wer',wofuer:'Wofür',kat:'Kategorie',ausland:'Ausland',beleg:'Beleg',note:'Notiz',full:'Rechnungsbetrag Telefon',pct:'Anteil %'};
    Object.keys(NM).forEach(k=>{if(String(old[k]??'')!==String(rec[k]??''))ch.push(k==='amount'?`Betrag ${gwNum(old.amount)} → ${gwNum(rec.amount)}`:NM[k])});
    if(file!==undefined)ch.push(file?'Beleg ersetzt':'Beleg entfernt');Object.assign(old,rec);old.hist=old.hist||[];if(ch.length)old.hist.push({at:today(),txt:ch.join(', ')});old.changed=Date.now();target=old}
   else{target=Object.assign({id:uid(),created:Date.now(),hist:[]},rec);B.items.push(target);
    if(split()&&sg>0){const fee={id:uid(),created:Date.now()+1,hist:[],art:'aus',date:d,inv:rec.inv,amount:sg,wer:B.set.pay,wofuer:`Gebühr zu: ${rec.wofuer||rec.wer||'Verkauf'}`,kat:GW_FEE,ausland:'nein',beleg:rec.beleg,note:'',pair:target.id};target.pair=fee.id;B.items.push(fee)}
    const ab=$s('#gAbo');if(ab&&ab.checked&&art==='aus'){B.abos.push({id:uid(),wer:rec.wer,wofuer:rec.wofuer,kat:rec.kat,amount:rec.amount,ausland:rec.ausland,full:rec.full,day:+d.slice(8,10),from:gwYM(addMonths(d,1)),active:true})}}
   let fileOk=true;
   if(file!==undefined){if(file){fileOk=await IDB.putOk('gw-'+target.id,file);target.file=fileMeta}else{try{await IDB.del('gw-'+target.id)}catch(e){}target.file=null}}
   if(rec.wer)B.firm[gwFirmKey(rec.wer)]={art,kat:rec.kat,land:rec.ausland};
   const saved=gwSave();closeSheet();if(after)after(target);render();
   if(!saved||!fileOk)gwSaveFail(!saved,!fileOk);else toast(old?'Gespeichert':'Gebucht')};
  const del=$s('#gDel');if(del)del.onclick=()=>confirmSheet('Buchung löschen?',`${old.wer||old.kat} · ${eur(old.amount)} am ${gwDE(old.date)}. Sie kommt in den Papierkorb der Gewerbe-Kasse und lässt sich dort wiederherstellen. Belege müssen 8 Jahre aufgehoben werden.`,'In den Papierkorb',()=>{gwDelete(old.id);toast('In den Papierkorb gelegt');render()},true,()=>gwForm(id))})}
function gwDelete(id){const B=gw(),i=B.items.findIndex(x=>x.id===id);if(i<0)return;const it=B.items.splice(i,1)[0];it.deleted=today();B.trash.push(it);if(it.pair){const p=B.items.find(x=>x.id===it.pair);if(p)delete p.pair;delete it.pair}save()}
function gwTrashSheet(){const B=gw();sheet(`<h2>Papierkorb der Gewerbe-Kasse</h2><p class="small muted">Gelöschte Buchungen samt Beleg. Belege müssen 8 Jahre aufgehoben werden – endgültig löschen nur, wenn die Buchung wirklich falsch war.</p>
 <div class="card" style="padding:4px 0">${B.trash.length?B.trash.slice().reverse().map(it=>`<div class="li"><div class="grow" style="min-width:0"><p><b>${esc(it.wer||it.kat)}</b> · ${it.art==='ein'?'+':'−'} ${eur(it.amount)}</p><p class="small muted">${gwDE(it.date)} · gelöscht ${fmtD(it.deleted)}</p></div><button class="btn sm" data-tr="${it.id}">Zurückholen</button><button class="btn sm ghost" data-tx="${it.id}" aria-label="Endgültig löschen">✕</button></div>`).join(''):'<div class="li"><p class="muted">Leer.</p></div>'}</div>`,s=>{
 s.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{const i=B.trash.findIndex(x=>x.id===b.dataset.tr);const it=B.trash.splice(i,1)[0];delete it.deleted;it.hist=it.hist||[];it.hist.push({at:today(),txt:'Aus dem Papierkorb zurückgeholt'});B.items.push(it);save();toast('Zurückgeholt');gwTrashSheet();render()});
 s.querySelectorAll('[data-tx]').forEach(b=>b.onclick=()=>{const it=B.trash.find(x=>x.id===b.dataset.tx);confirmSheet('Endgültig löschen?',`${it.wer||it.kat} · ${eur(it.amount)}. Buchung und Beleg sind danach weg. Belege müssen 8 Jahre aufgehoben werden.`,'Endgültig löschen',async()=>{B.trash=B.trash.filter(x=>x!==it);try{await IDB.del('gw-'+it.id)}catch(e){}save();gwTrashSheet()},true,()=>gwTrashSheet())})})}

/* ---------- Beleg scannen ---------- */
async function gwScanFiles(files){files=(Array.isArray(files)?files:[files]).filter(Boolean);if(!files.length)return;let stop=false;
 sheet(`<h2>Lese den Beleg …</h2><p class="muted" id="oM">Starte Texterkennung …</p><span class="bar" style="width:100%"><i id="oB" style="width:5%"></i></span><button class="btn ghost" id="oX">Überspringen und selbst eintippen</button>`,s=>s.querySelector('#oX').onclick=()=>{stop=true});
 const ims=[];for(const f of files){try{ims.push(await prepDoc(f))}catch(e){}}if(!ims.length){closeSheet();toast('Das Bild ließ sich nicht öffnen.');return}
 const img=stackImg(ims,1100);let d={},raw='';
 try{const pages=[];for(let i=0;i<ims.length&&!stop;i++)pages.push(await ocrFull(ims[i],(m,p)=>{const a=$('#oM'),b=$('#oB');if(a)a.textContent=m;if(b)b.style.width=Math.max(5,Math.round((i+p)/ims.length*100))+'%'}));if(pages.length){const J=ocrJoin(pages);raw=J.text||'';d=parseInvoice(J)}}catch(e){}
 const B=gw(),pay=B.set.pay.toLowerCase();const isPay=pay&&raw.toLowerCase().includes(pay)&&/(auszahlung|gutschrift|abrechnung|payout)/i.test(raw);
 const art=isPay?'ein':'aus';const wer=isPay?B.set.pay:(d.payee||'');const fm=B.firm[gwFirmKey(wer)];
 let kat=fm&&fm.art===art?fm.kat:gwGuessKat(wer+' '+raw,art);let land=art==='ein'?'nein':(fm&&fm.land)||gwGuessLand(raw,d.iban)||'nein';
 gwForm(null,{_scan:true,_img:img,art,date:today(),inv:d.inv||'',amount:typeof d.amount==='number'?d.amount:'',wer,wofuer:'',kat,ausland:land,beleg:true,note:[d.ref,d.lastschrift?'wird abgebucht':'',d.bezahlt?'laut Beleg bezahlt':''].filter(Boolean).join(' · ')})}
PIC_FN.gwScan=f=>gwScanFiles(f);SCAN_IDS.gwScan=3;
document.addEventListener('change',e=>{const t=e.target;if(t&&(t.id==='gwScan'||t.id==='gwScanG')){const fs=[...t.files];t.value='';if(fs.length)gwScanFiles(fs)}});

/* ---------- Einstellungen ---------- */
function gwSetSheet(){const B=gw(),S2=B.set;sheet(`<h2>Einstellungen Gewerbe-Kasse</h2>
 <label class="f">Gewerbe seit<input class="inp" type="date" id="gsS" value="${esc(S2.start)}"></label><p class="small muted">Das Jahr des Beginns gilt als Gründungsjahr (harte 25.000 €-Grenze).</p>
 <label class="f">Bezahldienst<input class="inp" id="gsP" value="${esc(S2.pay)}" placeholder="Digistore24"></label>
 <label class="f">Einnahmen vom Bezahldienst buchen als<select class="inp" id="gsM"><option value="auszahlung" ${S2.mode!=='brutto'?'selected':''}>Auszahlung (Abrechnung ist der Beleg)</option><option value="brutto" ${S2.mode==='brutto'?'selected':''}>Verkauf brutto und Gebühr getrennt</option></select></label>
 <label class="f">Telefon und Internet: Anteil fürs Gewerbe (%)<input class="inp mono" id="gsT" inputmode="decimal" value="${esc(S2.tel)}" placeholder="z. B. 20"></label><p class="small muted">Leer lassen, wenn du den Anteil selbst einträgst. Änderungen gelten für neue Buchungen.</p>
 <h3 class="so-h">Abos</h3><div class="card" style="padding:4px 0">${B.abos.length?B.abos.map(a=>`<div class="li"><div class="grow" style="min-width:0"><p><b>${esc(a.wer||a.kat)}</b> · ${eur(a.amount)}</p><p class="small muted">${esc(a.kat)} · jeden ${a.day}. · ab ${MONL[+a.from.slice(5,7)-1]} ${a.from.slice(0,4)}${a.active===false?' · beendet':''}</p></div>${a.active===false?'':`<button class="btn sm ghost" data-ae="${a.id}">Beenden</button>`}</div>`).join(''):'<div class="li"><p class="small muted">Noch keine. Beim Buchen einer Ausgabe „Kommt jeden Monat wieder“ anhaken.</p></div>'}</div>
 <div class="sheet-foot"><button class="btn pri block" id="gsGo">Speichern</button></div>`,s=>{
 s.querySelectorAll('[data-ae]').forEach(b=>b.onclick=()=>{const a=B.abos.find(x=>x.id===b.dataset.ae);confirmSheet('Abo beenden?',`${a.wer||a.kat}: Es kommen keine Vorschläge mehr. Bisherige Buchungen bleiben.`,'Beenden',()=>{a.active=false;save();gwSetSheet()},false,()=>gwSetSheet())});
 s.querySelector('#gsGo').onclick=()=>{const st=val('gsS');if(!/^\d{4}-\d{2}-\d{2}$/.test(st)){toast('Bitte ein Datum für den Gewerbebeginn wählen.');return}const t=val('gsT').trim().replace(',','.');if(t&&!(+t>0&&+t<=100)){toast('Der Anteil muss zwischen 1 und 100 % liegen.');return}
  Object.assign(S2,{start:st,pay:val('gsP').trim()||'Digistore24',mode:val('gsM'),tel:t});save();closeSheet();toast('Gespeichert');render()}})}

/* ---------- CSV ---------- */
function gwCsv(y){const L=gw().items.filter(it=>it.date.startsWith(String(y))).sort((a,b)=>a.date.localeCompare(b.date)||(a.created||0)-(b.created||0));
 /* Text so schreiben, dass jede Tabelle ihn richtig liest: Zeilenumbrüche raus, Semikolon/Komma/Anführungszeichen in Anführungszeichen,
    und Text, der mit = + - @ beginnt, bekommt ein Hochkomma – sonst würde Excel ihn als Formel ausführen. */
 const q=(v,num)=>{v=String(v??'').replace(/[\r\n\t]+/g,' ').trim();if(!num&&/^[=+\-@]/.test(v))v="'"+v;return!num&&/[;,"]/.test(v)?`"${v.replace(/"/g,'""')}"`:v};
 const rows=[['Datum','Art','Betrag (€)','Wer','Wofür','Kategorie','Ausland?','Beleg da','Notiz']];
 L.forEach(it=>{const extra=[it.inv?`Rechnungsdatum ${gwDE(it.inv)}`:'',it.full?`Rechnung ${gwNum(it.full)} €${it.pct?`, Anteil ${String(it.pct).replace('.',',')} %`:''}`:'',it.pair?(it.art==='ein'?'Verkauf brutto, Gebühr separat gebucht':'Gebühr zum Verkauf'):''].filter(Boolean);
  rows.push([gwDE(it.date),it.art==='ein'?'Einnahme':'Ausgabe',gwNum(it.amount),it.wer,it.wofuer,it.kat,GW_LAND[it.ausland||'nein'],it.beleg?'ja':'nein',[it.note,...extra].filter(Boolean).join(' · ')])});
 return'\uFEFF'+rows.map((r,i)=>r.map((v,k)=>q(v,i>0&&(k===0||k===2))).join(';')).join('\r\n')+'\r\n'}
const gwTxtBytes=s=>new TextEncoder().encode(s);
function gwB64(dataUrl){const b=atob(String(dataUrl).split(',')[1]||'');const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function gwOut(name,bytes,mime,what){sheet(`<h2>${esc(what)}</h2><p class="small muted">${esc(name)} · ${fmtB(bytes.length)}</p><p class="small muted">„Speichern“ legt die Datei unter Dokumente/Kleinkram ab. „Teilen“ öffnet die Android-Auswahl (z. B. Drive, E-Mail an dich, Drucken) – verschickt wird erst, wenn du dort bestätigst.</p>
 <div class="sheet-foot stack"><button class="btn pri block" id="goS">Speichern</button><button class="btn block" id="goT">Teilen / Drucken</button></div>`,s=>{s.querySelector('#goS').onclick=()=>{saveBin(name,bytes,mime);closeSheet()};s.querySelector('#goT').onclick=async()=>{await shareBin(name,bytes,mime)}})}

/* ---------- Jahres-PDF ---------- */
function gwPdf(y){const Y=gwYear(y),B=gw(),d=PDF(),L=20,R=190;let yy=22;const np=()=>{d.page();yy=22};const need=h=>{if(yy+h>282)np()};
 const row=(cols,vals,o={})=>{need(6);if(o.shade)d.rect(L,yy-4.2,R-L,6.2,o.shade);let x=L;cols.forEach((w,i)=>{const right=i>0;d.text(right?x+w-1.5:x+1,yy,String(vals[i]),{size:o.size||9.5,bold:o.bold,align:right?'right':undefined});x+=w});yy+=6.2};
 d.text(L,yy,`Gewerbe-Kasse – Jahresübersicht ${y}`,{size:16,bold:true});yy+=7;
 d.text(L,yy,`${S.set&&S.set.me&&S.set.me.name?S.set.me.name+' · ':''}Kleinunternehmer (§ 19 UStG) · Gewerbe seit ${gwDE(B.set.start)} · erstellt am ${gwDE(today())}`,{size:9});yy+=10;
 row([110,60],['Einnahmen',eur(Y.ein)]);row([110,60],['Ausgaben',eur(Y.aus)]);row([110,60],['Gewinn (Einnahmen minus Ausgaben)',eur(Y.gewinn)],{bold:true,shade:.92});yy+=2;
 const lim=gwLimit(y,Y.ein);d.text(L,yy,`Umsatzgrenze: ${eur(Y.ein)} von ${eur(lim.max)} – noch ${eur(Math.max(0,lim.max-Y.ein))} Luft.`,{size:9});yy+=9;
 d.text(L,yy,'Nach Monaten',{size:12,bold:true});yy+=6;row([70,33,33,34],['Monat','Einnahmen','Ausgaben','Gewinn'],{bold:true,shade:.93});
 Y.M.forEach((x,i)=>row([70,33,33,34],[MONL[i],eur(x.ein),eur(x.aus),eur(x.ein-x.aus)]));row([70,33,33,34],['Summe',eur(Y.ein),eur(Y.aus),eur(Y.gewinn)],{bold:true,shade:.9});yy+=6;
 need(30);d.text(L,yy,'Nach Kategorien',{size:12,bold:true});yy+=6;row([95,25,50],['Kategorie','Anzahl','Summe'],{bold:true,shade:.93});
 const ce=Object.entries(Y.cats);[['ein','Einnahmen'],['aus','Ausgaben']].forEach(([a,l])=>{const xs=ce.filter(([,c])=>c.art===a).sort((p,q)=>q[1].sum-p[1].sum);if(!xs.length)return;row([170],[l],{bold:true});xs.forEach(([k,c])=>row([95,25,50],[k,c.n,eur(c.sum)]));row([95,25,50],[`Summe ${l}`,xs.reduce((s,[,c])=>s+c.n,0),eur(a==='ein'?Y.ein:Y.aus)],{bold:true,shade:.94})});yy+=4;
 const am=Object.keys(Y.ausl);if(am.length){need(20);d.text(L,yy,'Ausgaben aus dem Ausland (Reverse Charge prüfen)',{size:12,bold:true});yy+=6;am.forEach(m=>{const s=Y.ausl[m].reduce((a,it)=>a+it.amount,0);row([110,60],[`${MONL[m]}: ${Y.ausl[m].map(it=>it.wer||it.kat).join(', ')}`.slice(0,70),eur(s)])});yy+=4}
 const nb=Y.L.filter(it=>!it.beleg).length;if(nb){need(8);d.text(L,yy,`${nb} ${nb===1?'Buchung':'Buchungen'} ohne Beleg.`,{size:9});yy+=7}
 need(12);d.text(L,yy,'Erstellt mit Kleinkram. Ersetzt keine Steuerberatung. Belege 8 Jahre aufbewahren.',{size:8.5});
 return d.bytes()}

/* ---------- ZIP (ohne Kompression) ---------- */
const GW_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const gwCrc=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=GW_CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function gwZipBuild(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;const now=new Date();const dt=((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1))&0xFFFF,dd=(((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate())&0xFFFF;
 files.forEach(f=>{const nm=enc.encode(f.name),data=f.data,crc=gwCrc(data);const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
  parts.push(new Uint8Array(h.buffer),nm,data);const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);cen.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+data.length});
 const cs=cen.reduce((a,p)=>a+p.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 const all=[...parts,...cen,new Uint8Array(e.buffer)];const out=new Uint8Array(all.reduce((a,p)=>a+p.length,0));let p=0;all.forEach(x=>{out.set(x,p);p+=x.length});return out}
async function gwZip(y){const L=gw().items.filter(it=>it.date.startsWith(String(y))&&it.file).sort((a,b)=>a.date.localeCompare(b.date));const files=[],used=new Set();
 for(const it of L){const src=await IDB.get('gw-'+it.id);if(!src)continue;const ext=/^data:application\/pdf/.test(src)?'pdf':'jpg';let base=`${it.date}_${it.art==='ein'?'Einnahme':'Ausgabe'}_${(it.wer||it.kat).replace(/[^\wäöüÄÖÜß.-]+/g,'-').slice(0,40)}_${gwNum(it.amount)}`;let n=base,k=2;while(used.has(n))n=`${base}_${k++}`;used.add(n);files.push({name:`Belege ${y}/${n}.${ext}`,data:gwB64(src)})}
 files.push({name:`Belege ${y}/Buchungen ${y}.csv`,data:gwTxtBytes(gwCsv(y))});return{bytes:gwZipBuild(files),n:files.length-1}}

/* ---------- Eigene Sicherung der Gewerbe-Kasse ---------- */
async function gwBackupData(){const B=gw(),files={};for(const it of[...B.items,...B.trash])if(it.file){const v=await IDB.get('gw-'+it.id);if(v)files['gw-'+it.id]=v}
 return JSON.stringify({kind:'kleinkram-gewerbe',v:1,at:new Date().toISOString(),biz:B,files})}
async function gwBackupSheet(){const data=await gwBackupData(),name=`kleinkram-gewerbe-${today()}.json`,bytes=gwTxtBytes(data);const B=gw();
 sheet(`<h2>Gewerbe-Kasse sichern</h2><p class="small muted">${B.items.length} Buchungen, ${B.trash.length} im Papierkorb, alle Belegfotos und PDFs · ${fmtB(bytes.length)}</p>
 <div class="card gw-warn"><p class="small"><b>Wichtig:</b> Eine Sicherung nur auf dem Handy hilft nicht, wenn das Handy kaputtgeht. Teile die Datei an einen Ort außerhalb – z. B. Google Drive, E-Mail an dich selbst oder deinen PC. Verschickt wird erst, wenn du in der Android-Auswahl bestätigst.</p></div>
 <p class="small muted">Die Gewerbe-Kasse ist außerdem in der normalen Kleinkram-Sicherung enthalten.</p>
 <div class="sheet-foot stack"><button class="btn pri block" id="gbT">Teilen (Drive, E-Mail, PC …)</button><button class="btn block" id="gbS">Auf dem Handy speichern</button></div>`,s=>{
  s.querySelector('#gbT').onclick=async()=>{const ok=await shareBin(name,bytes,'application/json');if(ok){gwBackedUp(true);closeSheet();toast('Sicherung geteilt – danke!')}};
  s.querySelector('#gbS').onclick=async()=>{if(CAP){try{await capWriteBin(name,bytes,'DOCUMENTS');gwBackedUp(false);closeSheet();toast('Gespeichert unter Dokumente/Kleinkram – bitte zusätzlich außerhalb des Handys sichern')}catch(e){toast('Speichern ging nicht. Bitte „Teilen“ nutzen.')}}else if(saveBin(name,bytes,'application/json')){gwBackedUp(false);closeSheet()}}})}
function gwRestoreSheet(){sheet(`<h2>Sicherung der Gewerbe-Kasse einspielen</h2><p class="small muted">Datei „kleinkram-gewerbe-….json“ wählen. Vor dem Einspielen siehst du, was drin ist.</p><label class="btn block" for="grF">Datei wählen</label><input type="file" id="grF" accept=".json,application/json" hidden>`,s=>{
 s.querySelector('#grF').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{let o;try{o=JSON.parse(String(r.result))}catch(er){toast('Das ist keine gültige Sicherung.');return}
  if(!o||o.kind!=='kleinkram-gewerbe'||!o.biz||!Array.isArray(o.biz.items)){toast(o&&o.v===1&&o.tasks?'Das ist eine normale Kleinkram-Sicherung – die spielst du unter Mehr → Daten & Sicherung ein.':'Das ist keine Sicherung der Gewerbe-Kasse.');return}gwRestorePreview(o)};r.readAsText(f)}})}
function gwRestorePreview(o){const B=gw(),ids=new Set(B.items.map(x=>x.id));const neu=o.biz.items.filter(x=>!ids.has(x.id)).length;
 sheet(`<h2>Sicherung vom ${fmtD(String(o.at).slice(0,10))}</h2><p>${o.biz.items.length} Buchungen, ${Object.keys(o.files||{}).length} Belege</p><p class="small muted">${neu} davon fehlen gerade auf diesem Gerät.</p>
 <div class="sheet-foot stack"><button class="btn pri block" id="grM">Zusammenführen</button><p class="small muted">Fehlende Buchungen kommen dazu, bei doppelten gewinnt die neuere Fassung. Nichts wird gelöscht.</p><button class="btn block" id="grR">Ersetzen</button><p class="small muted">Die Gewerbe-Kasse auf diesem Gerät wird durch die Sicherung ersetzt.</p></div>`,s=>{
  s.querySelector('#grM').onclick=async()=>{const n=await gwMerge(o);closeSheet();toast(`${n} Buchungen ergänzt oder aktualisiert`);render()};
  s.querySelector('#grR').onclick=()=>confirmSheet('Gewerbe-Kasse ersetzen?',`Aktuell ${B.items.length} Buchungen auf diesem Gerät. Sie werden durch die ${o.biz.items.length} Buchungen aus der Sicherung ersetzt.`,'Ersetzen',async()=>{await gwReplace(o);toast('Sicherung eingespielt');render()},true,()=>gwRestorePreview(o))})}
async function gwPutFiles(o,only){for(const[k,v]of Object.entries(o.files||{}))if(!only||only.has(k))await IDB.put(k,v)}
async function gwMerge(o){const r=gwMergeBiz(gw(),o.biz);await gwPutFiles(o,r.files);save();return r.n}
async function gwReplace(o){const old=gw();for(const it of[...old.items,...old.trash])if(it.file){try{await IDB.del('gw-'+it.id)}catch(e){}}S.biz=o.biz;gw();await gwPutFiles(o);save()}

/* ---------- Absicherung: wirklich gespeichert? ---------- */
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
function gwSave(){save();try{const o=JSON.parse(localStorage.getItem(KEY)||'null');return!!(o&&o.biz&&o.biz.items.length===gw().items.length&&o.biz.trash.length===gw().trash.length)}catch(e){return false}}
function gwSaveFail(data,file){sheet(`<h2>⚠️ Nicht dauerhaft gespeichert</h2><p>${data?'Die Buchung konnte auf diesem Gerät nicht gespeichert werden (Speicher voll oder gesperrt). Nach einem Neustart wäre sie weg.':'Der Beleg (Foto/PDF) konnte nicht dauerhaft gespeichert werden.'}</p><p class="small muted">Bitte jetzt eine Sicherung teilen und Speicherplatz auf dem Handy freimachen.</p><div class="sheet-foot"><button class="btn pri block" data-act="gwBackup">Jetzt sichern</button></div>`)}
function gwInlineAsk(box,txt,ok,fn){const d=document.createElement('div');d.className='card gw-warn';d.innerHTML=`<p class="small">${esc(txt)}</p><div class="row" style="gap:6px"><button class="btn sm" type="button">Abbrechen</button><button class="btn sm danger" type="button">${esc(ok)}</button></div>`;box.prepend(d);const[b1,b2]=d.querySelectorAll('button');b1.onclick=()=>d.remove();b2.onclick=()=>{d.remove();fn()}}
/* Gewerbe-Kasse aus einer anderen Fassung dazunehmen (Sicherung): fehlende Buchungen dazu, bei gleichen die neuere Fassung */
function gwMergeBiz(B,src){let n=0;const files=new Set();const mergeList=(dst,list)=>{(list||[]).forEach(x=>{const i=dst.findIndex(y=>y.id===x.id);if(i<0){dst.push(x);n++;if(x.file)files.add('gw-'+x.id)}else if((x.changed||x.created||0)>(dst[i].changed||dst[i].created||0)){dst[i]=x;n++;if(x.file)files.add('gw-'+x.id)}})};
 mergeList(B.items,src.items);const live=new Set(B.items.map(x=>x.id));mergeList(B.trash,(src.trash||[]).filter(x=>!live.has(x.id)));B.trash=B.trash.filter(x=>!B.items.some(y=>y.id===x.id));
 (src.abos||[]).forEach(a=>{if(!B.abos.some(x=>x.id===a.id))B.abos.push(a)});Object.assign(B.aboDone,src.aboDone||{});Object.assign(B.done,src.done||{});Object.entries(src.firm||{}).forEach(([k,v])=>{if(!B.firm[k])B.firm[k]=v});return{n,files}}

/* ---------- Aktionen ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;if(!/^gw/.test(a))return;e.stopPropagation();
 const y=UI.gwY||new Date().getFullYear();
 if(a==='gwOpen')go('gewerbe');
 else if(a==='gwNew')gwForm(null);
 else if(a==='gwEdit')gwForm(b.dataset.id);
 else if(a==='gwYear'){UI.gwY=+b.dataset.y;UI.gwM=null;render()}
 else if(a==='gwMonth'){const m=+b.dataset.m;UI.gwM=UI.gwM===m?null:m;render()}
 else if(a==='gwDone')gwMonthDone(b.dataset.ym);
 else if(a==='gwCsv')gwOut(`gewerbe-kasse-${y}.csv`,gwTxtBytes(gwCsv(y)),'text/csv','CSV-Export');
 else if(a==='gwPdf')gwOut(`gewerbe-kasse-jahresuebersicht-${y}.pdf`,gwPdf(y),'application/pdf','Jahresübersicht als PDF');
 else if(a==='gwZip'){const z=await gwZip(y);if(!z.n){toast(`Für ${y} sind noch keine Belege angehängt.`);return}gwOut(`gewerbe-kasse-belege-${y}.zip`,z.bytes,'application/zip',`${z.n} Belege als ZIP`)}
 else if(a==='gwBackup')gwBackupSheet();
 else if(a==='gwRestore')gwRestoreSheet();
 else if(a==='gwTrash')gwTrashSheet();
 else if(a==='gwSet')gwSetSheet();
 else if(a==='gwPlus'){closeSheet();sheet(`<h2>Gewerbe-Beleg</h2><div class="stack"><label class="btn pri block" for="gwScan">📷 Beleg scannen</label><label class="btn block" for="gwScanG">🖼️ Aus der Galerie</label><button class="btn block" data-act="gwNew">⌨️ Eintippen</button></div><input type="file" id="gwScan" accept="image/*" capture="environment" hidden><input type="file" id="gwScanG" accept="image/*" multiple hidden>`)}
 else if(/^gwAbo/.test(a)){const x=gwAboDue()[+b.dataset.i];if(!x)return;const B=gw(),key=`${x.a.id}:${x.ym}`;
  if(a==='gwAboSkip'){B.aboDone[key]='skip';save();toast('Übersprungen');render()}
  else if(a==='gwAboOk'){const A=x.a;B.items.push({id:uid(),created:Date.now(),hist:[],art:'aus',date:x.d,inv:'',amount:A.amount,wer:A.wer,wofuer:A.wofuer,kat:A.kat,ausland:A.ausland||'nein',beleg:false,note:'Abo – Beleg nachreichen',full:A.full||null,pct:A.full?+gw().set.tel||null:null,abo:A.id});B.aboDone[key]='ok';save();toast('Gebucht – Beleg bitte anhängen');render()}
  else gwForm(null,{art:'aus',date:x.d,amount:x.a.amount,wer:x.a.wer,wofuer:x.a.wofuer,kat:x.a.kat,ausland:x.a.ausland||'nein',beleg:false,full:x.a.full||'',_abo:true},()=>{B.aboDone[key]='ok';save()})}});
