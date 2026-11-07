/* Kleinkram · Briefe als PDF: Kündigung, Einspruch Steuerbescheid, Widerspruch, freier Brief – alles im Handy erzeugt */
"use strict";
/* ---------- kleiner PDF-Erzeuger (A4, Helvetica, deutsche Umlaute) ---------- */
const PDF_HW=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const PDF_CP={'−':0x2D,'✓':0x78,'€':0x80,'‚':0x82,'„':0x84,'…':0x85,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97};
const pdfCode=ch=>{const c=ch.charCodeAt(0);if(c<128)return c;if(PDF_CP[ch]!=null)return PDF_CP[ch];if(c>=160&&c<256)return c;return 63};
function pdfCharW(code){if(code>=32&&code<=126)return PDF_HW[code-32];if(code===0x80)return 556;if(code===0x84||code===0x93||code===0x94||code===0x91||code===0x92)return 333;if(code===0x96)return 556;if(code===0x97)return 1000;
 const base={196:667,214:778,220:722,228:556,246:556,252:556,223:611,167:556,176:400,233:556,232:556,224:556,225:556,231:500,201:667};return base[code]||556}
function pdfW(s,size,bold){let w=0;for(const ch of String(s))w+=pdfCharW(pdfCode(ch));return w*size/1000*(bold?1.06:1)}
function pdfEsc(s){let o='';for(const ch of String(s)){const c=pdfCode(ch);const x=String.fromCharCode(c);o+=x==='('||x===')'||x==='\\'?'\\'+x:x}return o}
const MM=2.8346;
function PDF(){const pages=[];let cur=null;
 const D={W:210,H:297,
  page(){cur=[];pages.push(cur);return D},
  text(x,y,s,o={}){const size=o.size||11,font=o.bold?'F2':'F1';let X=x;if(o.align==='right')X=x-pdfW(s,size,o.bold)/MM;if(o.align==='center')X=x-pdfW(s,size,o.bold)/MM/2;
   cur.push(`BT /${font} ${size} Tf ${(X*MM).toFixed(2)} ${((297-y)*MM).toFixed(2)} Td (${pdfEsc(s)}) Tj ET`);return D},
  line(x1,y1,x2,y2,w=.4){cur.push(`${w} w ${(x1*MM).toFixed(2)} ${((297-y1)*MM).toFixed(2)} m ${(x2*MM).toFixed(2)} ${((297-y2)*MM).toFixed(2)} l S`);return D},
  rect(x,y,w,h,gray=.93){cur.push(`${gray} g ${(x*MM).toFixed(2)} ${((297-y-h)*MM).toFixed(2)} ${(w*MM).toFixed(2)} ${(h*MM).toFixed(2)} re f 0 g`);return D},
  wrap(s,width,size=11,bold=false){const out=[];String(s).split('\n').forEach(par=>{if(!par.trim()){out.push('');return}let line='';par.split(/\s+/).forEach(w=>{const t=line?line+' '+w:w;if(pdfW(t,size,bold)/MM>width&&line){out.push(line);line=w}else line=t});out.push(line)});return out},
  bytes(){let o='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const off=[];const obj=(n,body)=>{off[n]=o.length;o+=`${n} 0 obj\n${body}\nendobj\n`};
   const np=pages.length,kids=[];for(let i=0;i<np;i++)kids.push(`${5+i*2} 0 R`);
   obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${np} >>`);
   obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
   pages.forEach((p,i)=>{const st=p.join('\n');obj(5+i*2,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6+i*2} 0 R >>`);obj(6+i*2,`<< /Length ${st.length} >>\nstream\n${st}\nendstream`)});
   const n=5+np*2,x=o.length;o+=`xref\n0 ${n}\n0000000000 65535 f \n`;for(let i=1;i<n;i++)o+=String(off[i]).padStart(10,'0')+' 00000 n \n';o+=`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
   const u=new Uint8Array(o.length);for(let i=0;i<o.length;i++)u[i]=o.charCodeAt(i)&255;return u}};
 return D.page()}

/* ---------- Geschäftsbrief nach DIN 5008 (Form B) ---------- */
const MONL=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const dLong=d=>{const x=P(d);return`${x.getDate()}. ${MONL[x.getMonth()]} ${x.getFullYear()}`};
const me=()=>S.set.me=S.set.me||{name:'',strasse:'',ort:'',tel:'',mail:'',iban:''};
function pdfLetter(L){const d=PDF(),m=me(),left=25,right=190,bw=right-left;let y;
 const fold=()=>{d.line(4,105,8,105,.3);d.line(4,210,8,210,.3);d.line(4,148.5,10,148.5,.3)};fold();
 /* Absender oben rechts */
 y=22;[m.name,m.strasse,m.ort,m.tel?'Tel. '+m.tel:'',m.mail].filter(Boolean).forEach((t,i)=>{d.text(right,y,t,{size:i?9.5:11,bold:!i,align:'right'});y+=i?4.4:5.2});
 /* Rücksendeangabe + Anschrift im Fenster */
 d.text(left,50,[m.name,m.strasse,m.ort].filter(Boolean).join(' · '),{size:7});d.line(left,51.2,left+85,51.2,.2);
 y=58;String(L.an||'').split('\n').filter(x=>x.trim()).forEach(t=>{d.text(left,y,t.trim(),{size:11});y+=5});
 if(L.versand){d.text(left,y+1.5,L.versand,{size:8.5,bold:true})}
 /* Bezugszeile + Datum */
 y=98;if(L.ref&&L.ref.length){L.ref.forEach(([k,v],i)=>{d.text(left+i*42,y,k,{size:7.5});d.text(left+i*42,y+4,v,{size:9.5})});}
 d.text(right,y+4,`${(m.ort||'').replace(/^\d{4,5}\s*/,'')||''}${m.ort?', ':''}${dLong(L.datum||today())}`,{size:10,align:'right'});
 y=L.ref&&L.ref.length?114:110;d.wrap(L.betreff,bw,11.5,true).forEach(t=>{d.text(left,y,t,{size:11.5,bold:true});y+=5.6});y+=5;
 const np=()=>{d.page();fold();y=25};
 const para=txt=>{d.wrap(txt,bw,11).forEach(t=>{if(y>272)np();if(t)d.text(left,y,t,{size:11});y+=5.3})};
 para(L.anrede||'Sehr geehrte Damen und Herren,');y+=3;
 (L.absaetze||[]).forEach(a=>{if(a&&a.table){y=pdfTable(d,a,y,left,right,np);y+=4;return}para(a);y+=3});
 if(y>258)np();y+=2;para(L.gruss||'Mit freundlichen Grüßen');y+=16;d.text(left,y,m.name||'',{size:11});
 if(L.anlagen&&L.anlagen.length){y+=10;if(y>275)np();d.text(left,y,'Anlage'+(L.anlagen.length>1?'n':''),{size:9.5,bold:true});y+=4.6;L.anlagen.forEach(a=>{d.text(left,y,'– '+a,{size:9.5});y+=4.4})}
 return d.bytes()}
/* Tabelle für die Nebenkostenabrechnung: {table:true, cols:[{t,w,align}], rows:[[...]], foot:[[...]]} */
function pdfTable(d,T,y,left,right,np){const sz=T.size||8.6,lh=4.6;const xs=[];let x=left;T.cols.forEach(c=>{xs.push(x);x+=c.w});
 const row=(cells,bold,shade)=>{const lines=cells.map((c,i)=>T.cols[i].align==='right'?[String(c)]:d.wrap(String(c),T.cols[i].w-2,sz,bold));const h=Math.max(...lines.map(l=>l.length))*lh+1.4;
  if(y+h>280){np();head()}if(shade)d.rect(left,y-3.6,right-left,h,.94);
  lines.forEach((l,i)=>l.forEach((t,k)=>{const c=T.cols[i];d.text(c.align==='right'?xs[i]+c.w-1.5:xs[i]+.5,y+k*lh,t,{size:sz,bold,align:c.align==='right'?'right':undefined})}));y+=h};
 const head=()=>{row(T.cols.map(c=>c.t),true,true)};head();T.rows.forEach(r=>row(r,false,false));d.line(left,y-3,right,y-3,.4);
 /* Summenzeilen: Text über die ganze Breite, Betrag rechts */
 (T.foot||[]).forEach((r,i)=>{const last=i===T.foot.length-1;if(y+lh>280){np()}if(last)d.rect(left,y-3.6,right-left,lh+1.6,.9);d.text(left+.5,y,String(r[0]),{size:last?sz+.8:sz,bold:true});d.text(right-1.5,y,String(r[r.length-1]),{size:last?sz+.8:sz,bold:true,align:'right'});y+=lh+1.6});return y}

/* ---------- Fristen ---------- */
const nextWorkday=d=>{let x=d;while([0,6].includes(P(x).getDay()))x=addDays(x,1);return x};
/* Bescheid gilt am 4. Tag nach Aufgabe zur Post als bekanntgegeben (seit 2025), Frist 1 Monat; fällt das Ende aufs Wochenende → Montag */
const einspruchFrist=bescheid=>nextWorkday(addMonths(addDays(bescheid,4),1));

/* ---------- Brief-Assistent ---------- */
const BRIEF_ART={kuendigung:'Kündigung',einspruch:'Einspruch gegen Steuerbescheid',widerspruch:'Widerspruch gegen Bescheid',frei:'Freier Brief'};
const briefe=()=>S.briefe=S.briefe||[];
function meFields(){const m=me();return`<details ${m.name?'':'open'}><summary><b>Absender</b> ${m.name?`<span class="small muted">· ${esc(m.name)}</span>`:'<span class="chip warn">bitte ausfüllen</span>'}</summary><div class="stack" style="margin-top:8px">
 <label class="f">Name<input class="inp" id="meN" value="${esc(m.name)}" autocomplete="name"></label><label class="f">Straße, Hausnummer<input class="inp" id="meS" value="${esc(m.strasse)}" autocomplete="street-address"></label>
 <label class="f">PLZ und Ort<input class="inp" id="meO" value="${esc(m.ort)}" placeholder="72250 Freudenstadt"></label><div class="grid2"><label class="f">Telefon (optional)<input class="inp" id="meT" value="${esc(m.tel)}" type="tel"></label><label class="f">E-Mail (optional)<input class="inp" id="meM" value="${esc(m.mail)}" type="email"></label></div></div></details>`}
function meRead(){const m=me();Object.assign(m,{name:val('meN'),strasse:val('meS'),ort:val('meO'),tel:val('meT'),mail:val('meM')});save();return m.name&&m.strasse&&m.ort}
function briefStart(){sheet(`<h2>Brief schreiben</h2><p class="small muted">Kleinkram setzt den Brief fertig auf (DIN 5008, passt ins Fensterkuvert). Du bekommst ein PDF zum Ausdrucken, Mailen oder Hochladen – verschickt wird nichts automatisch.</p>
 <div class="stack">${[['kuendigung','Kündigung','Vertrag kündigen – mit Frist, Vertragsnummer, Bitte um Bestätigung'],['einspruch','Einspruch Steuerbescheid','Frist: 1 Monat nach Bekanntgabe'],['widerspruch','Widerspruch','gegen einen Bescheid, z. B. Krankenkasse, Rentenversicherung, Behörde'],['frei','Freier Brief','Betreff und Text selbst schreiben']].map(([k,t,d])=>`<button class="li" data-ba="${k}" style="text-align:left;width:100%;background:none;border:1px solid var(--line);border-radius:12px;padding:12px"><div class="grow"><p><b>${t}</b></p><p class="small muted">${d}</p></div></button>`).join('')}</div>
 ${briefe().length?`<h3>Zuletzt erstellt</h3>${briefe().slice(-6).reverse().map(b=>`<div class="li"><div class="grow"><p>${esc(b.betreff.slice(0,70))}</p><p class="small muted">${BRIEF_ART[b.art]||''} · ${fmtD(b.datum)}</p></div><button class="btn sm" data-bo="${b.id}">PDF</button></div>`).join('')}`:''}`,s=>{
 s.querySelectorAll('[data-ba]').forEach(b=>b.onclick=()=>{if(b.dataset.ba==='kuendigung'){const cs=(S.contracts||[]).filter(c=>!c.cancelled);if(cs.length)return pickContract(cs);return briefSheet('kuendigung',{})}briefSheet(b.dataset.ba,{})});
 s.querySelectorAll('[data-bo]').forEach(b=>b.onclick=()=>{const x=briefe().find(z=>z.id===b.dataset.bo);if(x)briefOut(x.L,x)})})}
function pickContract(cs){sheet(`<h2>Welchen Vertrag kündigen?</h2>${cs.map(c=>`<button class="li" data-pc="${c.id}" style="width:100%;text-align:left;background:none;border:0"><div class="grow"><p>${esc(c.name)}</p><p class="small muted">${esc(c.anbieter||'')}</p></div></button>`).join('')}<button class="btn block" data-pc="">Anderer Vertrag (nicht in Kleinkram)</button>`,s=>s.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>briefSheet('kuendigung',{cid:b.dataset.pc||null})))}
function briefSheet(art,o){const c=o.cid?(S.contracts||[]).find(x=>x.id===o.cid):null;const I=c?cInfo(c):null;const zum=I?I.end:'';
 const F={kuendigung:`<label class="f">Empfänger (Anbieter mit Adresse)<textarea class="inp" id="bAn" rows="4" placeholder="Stadtwerke Muster GmbH&#10;Kundenservice&#10;Musterstraße 1&#10;12345 Musterstadt">${esc(c&&c.adresse||(c?c.anbieter:''))}</textarea></label>
  <label class="f">Vertrag<input class="inp" id="bV" value="${esc(c?c.name:'')}" placeholder="z. B. Stromliefervertrag"></label>
  <div class="grid2"><label class="f">Vertragsnummer<input class="inp mono" id="bVn" value="${esc(c?c.vnr:'')}"></label><label class="f">Kundennummer<input class="inp mono" id="bKn" value="${esc(c?c.knr:'')}"></label></div>
  <label class="f">Kündigen zum<input class="inp" type="date" id="bZ" value="${zum}"></label><p class="small muted">${I?`Laut deinen Angaben endet der Vertrag frühestens am ${fmtDate(I.end)}${I.deadline?`; die Kündigung muss bis ${fmtDate(I.deadline)} ankommen`:''}. `:''}„Hilfsweise zum nächstmöglichen Zeitpunkt“ steht automatisch drin.</p>
  <label class="switch"><span>SEPA-Lastschrift zum Vertragsende widerrufen</span><input type="checkbox" id="bSepa" checked></label>
  <label class="switch"><span>Rückgewinnungs-Anrufe/Werbung untersagen</span><input type="checkbox" id="bWerb" checked></label>`,
 einspruch:`<label class="f">Finanzamt (Name und Adresse)<textarea class="inp" id="bAn" rows="4" placeholder="Finanzamt Freudenstadt&#10;Musterstraße 1&#10;72250 Freudenstadt">${esc(S.set.fa||'')}</textarea></label>
  <div class="grid2"><label class="f">Steuernummer<input class="inp mono" id="bStn" value="${esc(S.set.stnr||'')}"></label><label class="f">Bescheid vom<input class="inp" type="date" id="bBd"></label></div>
  <label class="f">Welcher Bescheid?<input class="inp" id="bBs" value="Einkommensteuerbescheid ${new Date().getFullYear()-1}"></label><p class="small muted" id="bFr"></p>
  <label class="f">Begründung<textarea class="inp" id="bBg" rows="5" placeholder="z. B. Die Werbungskosten für … wurden nicht berücksichtigt. Belege liegen bei."></textarea></label>
  <label class="switch"><span>Begründung reiche ich nach<br><span class="small muted">Kleinkram legt eine Aufgabe in 3 Wochen an</span></span><input type="checkbox" id="bNach"></label>
  <div class="grid2"><label class="switch"><span>Aussetzung der Vollziehung beantragen</span><input type="checkbox" id="bAdv"></label><label class="f">Betrag (€, optional)<input class="inp mono" id="bAdvB" inputmode="decimal"></label></div>`,
 widerspruch:`<label class="f">Empfänger (Behörde/Kasse mit Adresse)<textarea class="inp" id="bAn" rows="4"></textarea></label>
  <div class="grid2"><label class="f">Aktenzeichen / Versichertennr.<input class="inp mono" id="bAz"></label><label class="f">Bescheid vom<input class="inp" type="date" id="bBd"></label></div>
  <label class="f">Worum geht es?<input class="inp" id="bBs" placeholder="z. B. Ablehnung der Kostenübernahme für …"></label><p class="small muted" id="bFr"></p>
  <label class="f">Begründung<textarea class="inp" id="bBg" rows="5"></textarea></label>
  <label class="switch"><span>Begründung reiche ich nach</span><input type="checkbox" id="bNach"></label>`,
 frei:`<label class="f">Empfänger<textarea class="inp" id="bAn" rows="4"></textarea></label><label class="f">Betreff<input class="inp" id="bBs"></label><label class="f">Text<textarea class="inp" id="bBg" rows="8"></textarea></label>`};
 sheet(`<h2>${BRIEF_ART[art]}</h2>${meFields()}${F[art]}
 <label class="f">Versandart (steht über der Adresse)<select class="inp" id="bVa"><option value="">– keine –</option><option ${art==='kuendigung'?'selected':''}>Einschreiben</option><option>Einschreiben mit Rückschein</option><option>Per E-Mail</option><option>Per Fax</option></select></label>
 ${art==='kuendigung'?'<p class="small muted">Tipp: Wurde der Vertrag online abgeschlossen, muss der Anbieter einen Kündigungsbutton auf seiner Website haben (§ 312k BGB). Dann kannst du den Text auch dort einfügen.</p>':''}
 <div class="sheet-foot"><button class="btn pri block" id="bGo">PDF erstellen</button></div>`,s=>{
  const fr=s.querySelector('#bFr'),bd=s.querySelector('#bBd');if(bd&&fr){const u=()=>{if(!bd.value){fr.textContent='';return}const f=einspruchFrist(bd.value);const k=diff(today(),f);fr.innerHTML=`Frist voraussichtlich bis <b>${fmtDate(f)}</b>${k<0?' – <b>abgelaufen</b>':k<=7?` – nur noch ${k} Tag${k===1?'':'e'}!`:''}. Feiertage bitte selbst prüfen; maßgeblich ist das Datum im Bescheid.`};bd.onchange=u;u()}
  s.querySelector('#bGo').onclick=()=>{if(!meRead()){toast('Bitte Absender (Name, Straße, Ort) ausfüllen.');s.querySelector('details').open=true;return}
   const an=val('bAn');if(!an){toast('Empfänger fehlt.');return}const L={an,versand:val('bVa'),datum:today(),absaetze:[],anlagen:[]};let extra=null;
   if(art==='kuendigung'){const vn=val('bVn'),kn=val('bKn'),v=val('bV')||'Vertrag',z=val('bZ');L.betreff=`Kündigung ${v}`;L.ref=[vn&&['Vertragsnummer',vn],kn&&['Kundennummer',kn]].filter(Boolean);
    L.absaetze.push(`hiermit kündige ich meinen Vertrag „${v}“${vn?` (Vertragsnummer ${vn})`:''} fristgerecht${z?` zum ${fmtDate(z)}`:''}, hilfsweise zum nächstmöglichen Zeitpunkt.`,'Bitte bestätigen Sie mir den Eingang dieser Kündigung und das Vertragsende schriftlich.');
    if(s.querySelector('#bSepa').checked)L.absaetze.push('Das Ihnen erteilte SEPA-Lastschriftmandat widerrufe ich zum Vertragsende. Ein eventuelles Guthaben überweisen Sie bitte auf mein Konto.');
    if(s.querySelector('#bWerb').checked)L.absaetze.push('Einer Kontaktaufnahme zu Werbe- oder Rückgewinnungszwecken – auch telefonisch oder per E-Mail – widerspreche ich ausdrücklich.');
    if(c){c.adresse=an;if(vn)c.vnr=vn;if(kn)c.knr=kn}extra={cid:c&&c.id,zum:z}}
   if(art==='einspruch'){const st=val('bStn'),b=val('bBd'),w=val('bBs');S.set.fa=an;S.set.stnr=st;L.betreff=`Einspruch gegen den ${w}${b?` vom ${fmtDate(b)}`:''}`;L.ref=[st&&['Steuernummer',st]].filter(Boolean);
    L.absaetze.push(`gegen den ${w}${b?` vom ${fmtDate(b)}`:''} lege ich hiermit Einspruch ein.`);
    if(s.querySelector('#bNach').checked)L.absaetze.push('Die Begründung reiche ich gesondert nach.');else if(val('bBg'))L.absaetze.push('Begründung:\n'+val('bBg'));
    if(s.querySelector('#bAdv').checked){const a=val('bAdvB');L.absaetze.push(`Zugleich beantrage ich die Aussetzung der Vollziehung${a?` in Höhe von ${eur(+a.replace(',','.'))}`:''} bis zur Entscheidung über den Einspruch.`)}
    L.absaetze.push('Bitte bestätigen Sie mir den Eingang des Einspruchs.');extra={nach:s.querySelector('#bNach').checked,frist:b?einspruchFrist(b):null}}
   if(art==='widerspruch'){const az=val('bAz'),b=val('bBd'),w=val('bBs');L.betreff=`Widerspruch gegen den Bescheid${b?` vom ${fmtDate(b)}`:''}${w?` – ${w}`:''}`;L.ref=[az&&['Aktenzeichen',az]].filter(Boolean);
    L.absaetze.push(`gegen Ihren Bescheid${b?` vom ${fmtDate(b)}`:''}${az?` (Aktenzeichen ${az})`:''} lege ich hiermit fristgerecht Widerspruch ein.`);
    if(s.querySelector('#bNach').checked)L.absaetze.push('Die Begründung reiche ich gesondert nach.');else if(val('bBg'))L.absaetze.push('Begründung:\n'+val('bBg'));
    L.absaetze.push('Bitte bestätigen Sie mir den Eingang des Widerspruchs schriftlich.');extra={nach:s.querySelector('#bNach').checked}}
   if(art==='frei'){L.betreff=val('bBs')||'Schreiben';L.absaetze.push(val('bBg')||'')}
   const rec={id:uid(),art,datum:today(),betreff:L.betreff,L};briefe().push(rec);S.briefe=briefe().slice(-30);
   if(extra&&extra.nach)S.tasks.push({id:uid(),title:`Begründung nachreichen: ${L.betreff.slice(0,50)}`,cat:'verwaltung',due:addDays(today(),21),created:today(),postponed:0,started:false,done:null,steps:[],cost:null,bundle:'',buddy:null});
   pts(10,'Brief geschrieben');save();briefOut(L,rec,extra)}})}
function briefPreview(L){const m=me();return`<div class="brief-pv"><div style="text-align:right;font-size:.75em">${[m.name,m.strasse,m.ort].filter(Boolean).map(esc).join('<br>')}</div><div style="margin:10px 0 8px">${esc(L.an).replace(/\n/g,'<br>')}</div>
 <p style="text-align:right;font-size:.8em">${dLong(L.datum||today())}</p><p><b>${esc(L.betreff)}</b></p><p>${esc(L.anrede||'Sehr geehrte Damen und Herren,')}</p>${(L.absaetze||[]).filter(a=>typeof a==='string').map(a=>`<p>${esc(a).replace(/\n/g,'<br>')}</p>`).join('')}${(L.absaetze||[]).some(a=>a&&a.table)?'<p class="small muted">[Tabelle im PDF]</p>':''}<p>${esc(L.gruss||'Mit freundlichen Grüßen')}</p><p>${esc(m.name)}</p></div>`}
function briefFile(L){return(L.betreff||'Brief').replace(/[^\wäöüÄÖÜß\- ]+/g,'').trim().replace(/\s+/g,'_').slice(0,60)+'_'+(L.datum||today())+'.pdf'}
function briefOut(L,rec,extra){const bytes=pdfLetter(L),name=briefFile(L);
 sheet(`<h2>Brief ist fertig</h2>${briefPreview(L)}
 <div class="grid2"><button class="btn pri" id="boS">Teilen / Drucken</button><button class="btn" id="boD">Speichern</button></div>
 ${extra&&extra.cid?`<button class="btn block" id="boK">Vertrag als gekündigt markieren</button>`:''}${extra&&extra.frist?`<p class="small muted">Frist: ${fmtDate(extra.frist)}. Einspruch rechtzeitig abschicken – per Post, Fax oder über ELSTER („Einspruch“).</p>`:''}
 <p class="small muted">Tipp: Per Einschreiben verschicken oder Sendebeleg aufheben – und die Antwort später in der Ablage speichern.</p>`,s=>{
  s.querySelector('#boS').onclick=()=>shareBin(name,bytes,'application/pdf');s.querySelector('#boD').onclick=()=>saveBin(name,bytes,'application/pdf');
  const k=s.querySelector('#boK');k&&(k.onclick=()=>{const c=(S.contracts||[]).find(x=>x.id===extra.cid);if(c&&!c.cancelled){c.cancelled=true;c.cancelEnd=extra.zum||cInfo(c).end;S.tasks.filter(x=>x.cid===c.id&&!x.done).forEach(x=>x.done=today());pts(15,'Vertrag gekündigt')}save();render();toast('Als gekündigt markiert');k.remove()})})}
