/* Kleinkram · Nebenkostenabrechnung (Betriebskosten) pro Objekt und Jahr, PDF je Mieter */
"use strict";
/* Kostenarten nach § 2 BetrKV: [Schlüssel, Name, Standard-Umlage, Stichworte zum Vorbefüllen aus Belegen] */
const BK=[['grundsteuer','Grundsteuer','flaeche',['grundsteuer','grundbesitzabgabe']],['wasser','Wasserversorgung','personen',['frischwasser','trinkwasser','wasserversorgung','wassergeld']],
 ['abwasser','Entwässerung / Abwasser','personen',['abwasser','schmutzwasser','niederschlagswasser','entwässerung','kanal']],['heizung','Heizung (inkl. Wartung, Messdienst)','mix70',['heizöl','heizung','pellets','fernwärme','brennstoff','erdgas','ista','techem','brunata','minol']],
 ['warmwasser','Warmwasser','mix70',['warmwasser']],['aufzug','Aufzug','flaeche',['aufzug','fahrstuhl']],['muell','Straßenreinigung & Müllabfuhr','personen',['müll','abfall','straßenreinigung','entsorgung','restmüll']],
 ['reinigung','Gebäudereinigung & Ungezieferbekämpfung','flaeche',['reinigung','treppenhaus','ungeziefer','schädling']],['garten','Gartenpflege','flaeche',['garten','grünpflege','rasen','baumschnitt','hecke']],
 ['licht','Allgemeinstrom / Beleuchtung','flaeche',['allgemeinstrom','beleuchtung','hausstrom']],['schornstein','Schornsteinfeger','flaeche',['schornstein','kaminfeger','emissionsmessung','feuerstätte']],
 ['versicherung','Sach- & Haftpflichtversicherung','flaeche',['gebäudeversicherung','wohngebäude','haftpflicht','elementar','versicherung']],['hauswart','Hauswart','flaeche',['hauswart','hausmeister']],
 ['kabel','Gemeinschaftsantenne','einheiten',['antenne']],['waesche','Wäschepflege (Waschküche)','personen',['waschmaschine','waschküche']],['sonstig','Sonstige Betriebskosten','flaeche',['rauchmelder','dachrinne','wartung']]];
const BK_KEY={flaeche:'nach Wohnfläche',personen:'nach Personen',einheiten:'nach Wohneinheiten',verbrauch:'nach Verbrauch',mix70:'30 % Fläche / 70 % Verbrauch',mix50:'50 % Fläche / 50 % Verbrauch',direkt:'Betrag je Mieter (z. B. Heizkostenabrechnung)'};
const BK35=['reinigung','garten','hauswart','schornstein'];
const r2=v=>Math.round((+v||0)*100)/100;
const nfm=v=>(+v||0).toLocaleString('de-DE',{maximumFractionDigits:2});
function nkPeriod(o,y){const I=nkInfo(o,y);return{von:addDays(addMonths(I.end,-12),1),bis:I.end}}
function nkData(o,y){o.nka=o.nka||{};if(!o.nka[y]){const p=nkPeriod(o,y);
  o.nka[y]={von:p.von,bis:p.bis,flaeche:'',personen:'',einheiten:1,ergebnisArt:'ueberweisen',vzNeu:true,
   mieter:[{id:uid(),name:o.mieter||'',von:o.start&&o.start>p.von?o.start:p.von,bis:p.bis,flaeche:'',personen:1,vz:'',vzGezahlt:''}],
   kosten:BK.map(([k,,key])=>({id:k,art:k,betrag:'',key,verbrauch:{},gesamt:'',direkt:{}}))};
  nkFromDocs(o,o.nka[y])}
 return o.nka[y]}
/* Belege des Objekts im Zeitraum den Kostenarten zuordnen (Vorschlag) */
function nkFromDocs(o,N){const ds=S.docs.filter(d=>d.objId===o.id&&(d.date||'')>=N.von&&(d.date||'')<=N.bis&&+d.amount>0);const used={};
 ds.forEach(d=>{const t=`${d.title||''} ${d.payee||''} ${(d.raw||'').slice(0,400)}`.toLowerCase();const hit=BK.find(([,,,kw])=>kw.some(w=>t.includes(w)));if(!hit)return;(used[hit[0]]=used[hit[0]]||[]).push(d)});
 N.kosten.forEach(k=>{const L=used[k.art];if(L&&!(+k.betrag)){k.betrag=r2(L.reduce((a,d)=>a+(+d.amount||0),0));k.belege=L.map(d=>d.id)}});return Object.keys(used).length}
function nkCalc(N){const pd=diff(N.von,N.bis)+1;const res=N.mieter.map(m=>{const a=m.von&&m.von>N.von?m.von:N.von,b=m.bis&&m.bis<N.bis?m.bis:N.bis;const tage=a<=b?diff(a,b)+1:0;return{m,von:a,bis:b,tage,f:tage/pd,rows:[],sum:0,s35:0}});
 N.kosten.filter(k=>+k.betrag>0||(k.key==='direkt'&&Object.values(k.direkt||{}).some(v=>+v))).forEach(k=>{const B=+k.betrag||0,name=(BK.find(x=>x[0]===k.art)||[0,k.name||'Kosten'])[1];
  res.forEach(r=>{let sh=0,ds='';const v=+(k.verbrauch||{})[r.m.id]||0,g=+k.gesamt||0,fl=+N.flaeche?(+r.m.flaeche||0)/+N.flaeche:0;const zeit=r.tage<pd?` × ${r.tage}/${pd} Tage`:'';
   if(k.key==='flaeche'){sh=B*fl*r.f;ds=`${nfm(r.m.flaeche)} von ${nfm(N.flaeche)} m²${zeit}`}
   else if(k.key==='personen'){sh=+N.personen?B*(+r.m.personen||0)/+N.personen*r.f:0;ds=`${nfm(r.m.personen)} von ${nfm(N.personen)} Personen${zeit}`}
   else if(k.key==='einheiten'){sh=+N.einheiten?B/+N.einheiten*r.f:0;ds=`1 von ${nfm(N.einheiten)} Einheiten${zeit}`}
   else if(k.key==='verbrauch'){sh=g?B*v/g:0;ds=`Verbrauch ${nfm(v)} von ${nfm(g)}`}
   else if(k.key==='mix70'||k.key==='mix50'){const a=k.key==='mix70'?.7:.5;sh=B*((1-a)*fl*r.f+(g?a*v/g:0));ds=`${Math.round((1-a)*100)} % nach Fläche (${nfm(r.m.flaeche)}/${nfm(N.flaeche)} m²), ${Math.round(a*100)} % nach Verbrauch (${nfm(v)}/${nfm(g)})`}
   else if(k.key==='direkt'){sh=+(k.direkt||{})[r.m.id]||0;ds='laut Einzelabrechnung'}
   sh=r2(sh);r.rows.push({k,name,B,sh,ds});r.sum+=sh;if(BK35.includes(k.art))r.s35+=sh})});
 res.forEach(r=>{r.sum=r2(r.sum);r.s35=r2(r.s35);const g=String(r.m.vzGezahlt??'').trim();r.vz=g!==''?r2(+g.replace(',','.')):r2((+r.m.vz||0)*12*r.f);r.saldo=r2(r.sum-r.vz);r.vzNeu=Math.ceil(r.sum/12/5)*5});return{pd,res}}
function nkWarn(N){const w=[];if(!(+N.flaeche))w.push('Gesamtwohnfläche fehlt');N.mieter.forEach(m=>{if(!m.name)w.push('Mieter ohne Namen');if(!(+m.flaeche))w.push(`Wohnfläche von ${m.name||'Mieter'} fehlt`)});
 N.kosten.forEach(k=>{if(+k.betrag>0&&['verbrauch','mix70','mix50'].includes(k.key)&&!(+k.gesamt))w.push(`${(BK.find(x=>x[0]===k.art)||[0,'Kosten'])[1]}: Gesamtverbrauch fehlt`);});
 if(N.kosten.some(k=>+k.betrag>0&&k.key==='personen')&&!(+N.personen))w.push('Personen im ganzen Haus fehlen');return[...new Set(w)]}

/* ---------- Ansicht ---------- */
function nkSheet(oid,y){const o=objById(oid);if(!o)return;y=+y;const N=nkData(o,y);let all=false;let tm=null;const sv=()=>{clearTimeout(tm);tm=setTimeout(save,400)};
 const body=()=>{const C=nkCalc(N),warn=nkWarn(N);const shown=N.kosten.filter(k=>all||+k.betrag>0||k.key==='direkt'&&Object.values(k.direkt||{}).some(v=>+v));
  return`<h3>1. Zeitraum &amp; Haus</h3><div class="grid2"><label class="f">Von<input class="inp" type="date" data-f="von" value="${N.von}"></label><label class="f">Bis<input class="inp" type="date" data-f="bis" value="${N.bis}"></label></div>
  <div class="grid2"><label class="f">Wohnfläche gesamt (m²)<input class="inp mono" inputmode="decimal" data-f="flaeche" value="${N.flaeche}"></label><label class="f">Personen im ganzen Haus<input class="inp mono" inputmode="decimal" data-f="personen" value="${N.personen}"></label></div>
  <label class="f">Wohneinheiten im Haus<input class="inp mono" inputmode="numeric" data-f="einheiten" value="${N.einheiten}"></label><p class="small muted">Gesamtfläche und Personen inklusive selbst bewohnter oder leerer Wohnungen – Leerstand trägt der Vermieter.</p>
  <h3>2. Mieter</h3>${N.mieter.map(m=>`<div class="card stack" style="padding:10px"><div class="row"><input class="inp grow" data-m="${m.id}:name" value="${esc(m.name)}" placeholder="Name"><button class="iconbtn" data-mx="${m.id}" aria-label="Mieter entfernen" style="width:40px;height:40px">${ICON.x}</button></div>
   <div class="grid2"><label class="f">Eingezogen / ab<input class="inp" type="date" data-m="${m.id}:von" value="${m.von||''}"></label><label class="f">Ausgezogen / bis<input class="inp" type="date" data-m="${m.id}:bis" value="${m.bis||''}"></label></div>
   <div class="grid2"><label class="f">Wohnfläche (m²)<input class="inp mono" inputmode="decimal" data-m="${m.id}:flaeche" value="${m.flaeche}"></label><label class="f">Personen<input class="inp mono" inputmode="decimal" data-m="${m.id}:personen" value="${m.personen}"></label></div>
   <div class="grid2"><label class="f">Vorauszahlung / Monat (€)<input class="inp mono" inputmode="decimal" data-m="${m.id}:vz" value="${m.vz}"></label><label class="f">Tatsächlich gezahlt (€, optional)<input class="inp mono" inputmode="decimal" data-m="${m.id}:vzGezahlt" value="${m.vzGezahlt}" placeholder="wird berechnet"></label></div></div>`).join('')}
  <button class="btn sm" id="nkAddM">+ Mieter</button>
  <h3>3. Kosten</h3><div class="row"><button class="btn sm" id="nkDocs">Aus Belegen übernehmen</button><button class="btn sm ghost" id="nkAll">${all?'Nur genutzte zeigen':'Alle Kostenarten zeigen'}</button></div>
  ${shown.length?'':'<p class="small muted">Noch keine Kosten. Tippe „Alle Kostenarten zeigen“ und trag die Jahresbeträge ein – oder ordne beim Scannen Rechnungen diesem Objekt zu.</p>'}
  ${shown.map(k=>{const nm=(BK.find(x=>x[0]===k.art)||[0,'Kosten'])[1];const vb=['verbrauch','mix70','mix50'].includes(k.key);return`<div class="card stack" style="padding:10px"><div class="row between"><b>${nm}</b>${k.belege&&k.belege.length?`<span class="chip">aus ${k.belege.length} Beleg${k.belege.length>1?'en':''}</span>`:''}</div>
   <div class="grid2"><label class="f">Jahresbetrag (€)<input class="inp mono" inputmode="decimal" data-c="${k.id}:betrag" value="${k.betrag}"></label><label class="f">Verteilung<select class="inp" data-ck="${k.id}">${Object.entries(BK_KEY).map(([a,b])=>`<option value="${a}" ${k.key===a?'selected':''}>${b}</option>`).join('')}</select></label></div>
   ${vb?`<label class="f">Gesamtverbrauch im Haus<input class="inp mono" inputmode="decimal" data-c="${k.id}:gesamt" value="${k.gesamt}"></label>${N.mieter.map(m=>`<label class="f">Verbrauch ${esc(m.name||'Mieter')}<input class="inp mono" inputmode="decimal" data-cv="${k.id}:${m.id}" value="${(k.verbrauch||{})[m.id]??''}"></label>`).join('')}`:''}
   ${k.key==='direkt'?N.mieter.map(m=>`<label class="f">Betrag ${esc(m.name||'Mieter')} (€)<input class="inp mono" inputmode="decimal" data-cd="${k.id}:${m.id}" value="${(k.direkt||{})[m.id]??''}"></label>`).join(''):''}
   ${k.art==='heizung'||k.art==='warmwasser'?'<p class="small muted">Heizkostenverordnung: 50–70 % müssen nach Verbrauch verteilt werden. Hast du eine Abrechnung vom Messdienst, nimm „Betrag je Mieter“.</p>':''}${k.art==='kabel'?'<p class="small muted">Kabel-TV-Gebühren dürfen seit 1.7.2024 nicht mehr umgelegt werden.</p>':''}</div>`}).join('')}
  <h3>4. Ergebnis</h3>${warn.length?`<div class="banner"><div class="grow small">${warn.map(esc).join('<br>')}</div></div>`:''}
  ${C.res.map(r=>`<div class="card stack" style="padding:10px"><div class="row between"><b>${esc(r.m.name||'Mieter')}</b><span class="small muted">${r.tage} Tage</span></div>
   <div class="tax"><span>Kosten-Anteil</span><span class="sum">${eur(r.sum)}</span><span>Vorauszahlungen</span><span class="sum">− ${eur(r.vz)}</span><span><b>${r.saldo>=0?'Nachzahlung':'Guthaben'}</b></span><span class="sum big">${eur(Math.abs(r.saldo))}</span></div>
   <div class="grid2"><button class="btn pri" data-pdf="${r.m.id}">PDF</button><button class="btn" data-pdfs="${r.m.id}">Teilen</button></div></div>`).join('')}
  <h3>5. Brief</h3><label class="f">Ergebnis<select class="inp" data-f="ergebnisArt"><option value="ueberweisen" ${N.ergebnisArt==='ueberweisen'?'selected':''}>Guthaben überweise ich / Nachzahlung bitte überweisen</option><option value="verrechnen" ${N.ergebnisArt==='verrechnen'?'selected':''}>Guthaben mit der nächsten Miete verrechnen</option></select></label>
  <label class="f">Deine IBAN für Nachzahlungen (optional)<input class="inp mono" id="nkIban" value="${esc(me().iban||'')}" placeholder="DE…"></label>
  <label class="switch"><span>Neue Vorauszahlung vorschlagen<br><span class="small muted">passend zu den Kosten (§ 560 Abs. 4 BGB)</span></span><input type="checkbox" data-f="vzNeu" ${N.vzNeu?'checked':''}></label>
  <p class="small muted">Prüf die Abrechnung vor dem Versand. Sie muss dem Mieter spätestens 12 Monate nach Ende des Zeitraums zugehen (§ 556 Abs. 3 BGB).</p>
  ${(o.nkDone||[]).includes(y)?'<p class="small"><span class="chip ok">verschickt</span></p>':`<button class="btn block" id="nkSent">Als verschickt markieren</button>`}`};
 sheet(`<h2>Nebenkosten ${y}</h2><p class="small muted">${esc(o.name)}${o.address?' · '+esc(o.address):''}</p>${me().name?'':meFields()}<div id="nkBox">${body()}</div>`,s=>{const box=s.querySelector('#nkBox');
  const redraw=()=>{const st=s.scrollTop;box.innerHTML=body();s.scrollTop=st};
  const res=()=>{const C=nkCalc(N);box.querySelectorAll('[data-pdf]').forEach((b,i)=>{const r=C.res[i];const t=b.closest('.card').querySelector('.tax');if(t&&r)t.innerHTML=`<span>Kosten-Anteil</span><span class="sum">${eur(r.sum)}</span><span>Vorauszahlungen</span><span class="sum">− ${eur(r.vz)}</span><span><b>${r.saldo>=0?'Nachzahlung':'Guthaben'}</b></span><span class="sum big">${eur(Math.abs(r.saldo))}</span>`})};
  const num=v=>String(v).replace(',','.');
  box.addEventListener('input',e=>{const t=e.target,d=t.dataset;
   if(d.f){N[d.f]=t.type==='checkbox'?t.checked:t.value}
   else if(d.m){const[id,f]=d.m.split(':');const m=N.mieter.find(x=>x.id===id);if(m)m[f]=['flaeche','personen','vz'].includes(f)?num(t.value):t.value}
   else if(d.c){const[id,f]=d.c.split(':');const k=N.kosten.find(x=>x.id===id);if(k){k[f]=num(t.value);if(f==='betrag')k.belege=null}}
   else if(d.cv){const[id,mid]=d.cv.split(':');const k=N.kosten.find(x=>x.id===id);k.verbrauch=k.verbrauch||{};k.verbrauch[mid]=num(t.value)}
   else if(d.cd){const[id,mid]=d.cd.split(':');const k=N.kosten.find(x=>x.id===id);k.direkt=k.direkt||{};k.direkt[mid]=num(t.value)}
   else if(t.id==='nkIban'){me().iban=t.value.replace(/\s+/g,'').toUpperCase()}
   sv();res()});
  box.addEventListener('change',e=>{const t=e.target;if(t.dataset.ck){const k=N.kosten.find(x=>x.id===t.dataset.ck);k.key=t.value;sv();redraw()}if(t.dataset.f==='ergebnisArt'||t.dataset.f==='vzNeu'){N[t.dataset.f]=t.type==='checkbox'?t.checked:t.value;sv()}if(t.type==='date'&&(t.dataset.f||t.dataset.m)){sv();redraw()}});
  box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
   if(b.id==='nkAddM'){N.mieter.push({id:uid(),name:'',von:N.von,bis:N.bis,flaeche:'',personen:1,vz:'',vzGezahlt:''});sv();redraw()}
   if(b.dataset.mx){if(N.mieter.length<2){toast('Mindestens ein Mieter.');return}N.mieter=N.mieter.filter(m=>m.id!==b.dataset.mx);sv();redraw()}
   if(b.id==='nkAll'){all=!all;redraw()}
   if(b.id==='nkDocs'){const n=nkFromDocs(o,N);sv();redraw();toast(n?'Belege übernommen – bitte prüfen':'Keine passenden Belege im Zeitraum gefunden')}
   if(b.dataset.pdf||b.dataset.pdfs){if(s.querySelector('#meN')&&!meRead()){toast('Bitte erst deinen Namen und deine Adresse oben eintragen.');return}if(!me().name){toast('Absender fehlt.');return}
    const w=nkWarn(N);if(w.length)toast('Hinweis: '+w[0]);const id=b.dataset.pdf||b.dataset.pdfs;const C=nkCalc(N);const r=C.res.find(x=>x.m.id===id);const L=nkLetter(o,y,N,r);save();
    const bytes=pdfLetter(L),name=`Betriebskostenabrechnung_${y}_${(r.m.name||'Mieter').replace(/[^\wäöüÄÖÜß]+/g,'_')}.pdf`;if(b.dataset.pdf)saveBin(name,bytes,'application/pdf');else shareBin(name,bytes,'application/pdf')}
   if(b.id==='nkSent'){o.nkDone=[...new Set([...(o.nkDone||[]),y])];S.tasks.filter(x=>x.nkObj===o.id&&x.nkYear===y&&!x.done).forEach(x=>x.done=today());pts(20,'Nebenkosten abgerechnet');save();render();redraw();toast('Erledigt – gut gemacht!')}})})}
function nkLetter(o,y,N,r){const m=me(),fd=d=>fmtDate(d);const ab=[];const zahl=addDays(today(),30);
 ab.push(`anbei erhalten Sie die Abrechnung der Betriebskosten für die Wohnung „${o.name}“${o.address?`, ${o.address}`:''}.\nAbrechnungszeitraum: ${fd(N.von)} bis ${fd(N.bis)}${r.tage<diff(N.von,N.bis)+1?`\nIhr Nutzungszeitraum: ${fd(r.von)} bis ${fd(r.bis)} (${r.tage} Tage)`:''}`);
 ab.push({table:true,cols:[{t:'Kostenart',w:46},{t:'Gesamtkosten',w:26,align:'right'},{t:'Verteilung',w:64},{t:'Ihr Anteil',w:27,align:'right'}],
  rows:r.rows.map(x=>[x.name,x.k.key==='direkt'?'–':eur(x.B),x.ds,eur(x.sh)]),
  foot:[['Summe Ihrer Kosten','','',eur(r.sum)],['abzüglich Ihrer Vorauszahlungen','','','− '+eur(r.vz)],[r.saldo>=0?'Nachzahlung':'Guthaben','','',eur(Math.abs(r.saldo))]]});
 if(r.saldo>0)ab.push(`Daraus ergibt sich eine Nachzahlung von ${eur(r.saldo)}. Bitte überweisen Sie den Betrag bis zum ${fd(zahl)}${m.iban?` auf mein Konto IBAN ${m.iban.replace(/(.{4})/g,'$1 ').trim()}`:''} (Verwendungszweck: Betriebskosten ${y}, ${o.name}).`);
 else if(r.saldo<0)ab.push(N.ergebnisArt==='verrechnen'?`Daraus ergibt sich ein Guthaben von ${eur(-r.saldo)} für Sie. Ich verrechne es mit der nächsten Mietzahlung – Sie können diese also um den Betrag kürzen.`:`Daraus ergibt sich ein Guthaben von ${eur(-r.saldo)} für Sie. Ich überweise Ihnen den Betrag bis zum ${fd(zahl)}.`);
 else ab.push('Ihre Vorauszahlungen decken die Kosten genau – es ergibt sich weder Nachzahlung noch Guthaben.');
 if(N.vzNeu&&r.m.vz&&Math.abs(r.vzNeu-(+r.m.vz||0))>=5){const ab1=addMonths(today().slice(0,8)+'01',2);ab.push(`Auf Grundlage dieser Abrechnung passe ich die monatliche Betriebskostenvorauszahlung ab dem ${fd(ab1)} von ${eur(+r.m.vz)} auf ${eur(r.vzNeu)} an (§ 560 Abs. 4 BGB).`)}
 if(r.s35>0)ab.push(`Für Ihre Steuererklärung (§ 35a EStG): In Ihrem Anteil sind ${eur(r.s35)} für haushaltsnahe Dienstleistungen bzw. Handwerkerleistungen enthalten (Gebäudereinigung, Gartenpflege, Hauswart, Schornsteinfeger). Absetzbar sind davon nur die Arbeitskosten.`);
 ab.push('Die Rechnungen und Belege können Sie nach vorheriger Absprache gern bei mir einsehen. Bei Fragen melden Sie sich einfach.');
 return{an:`${r.m.name||'Mieter'}\n${(o.address||'').split(/,\s*/).join('\n')}`,datum:today(),betreff:`Betriebskostenabrechnung ${fd(N.von)} – ${fd(N.bis)}`,anrede:`Guten Tag ${r.m.name||''},`.replace(' ,',','),absaetze:ab}}
