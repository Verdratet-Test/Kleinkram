/* Kleinkram · IBAN, GiroCode, Rechnungstext auslesen, § 35a */
"use strict";
/* ---------- Rechnungen verstehen ---------- */
const IBANLEN={DE:22,AT:20,CH:21,NL:18,FR:27,IT:27,ES:24,BE:16,LU:20,PL:28,DK:18,CZ:24,LI:21,IE:22,GB:22,PT:25,SE:24,FI:18};
function ibanOK(s){s=s.replace(/\s/g,'').toUpperCase();if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s))return false;if(IBANLEN[s.slice(0,2)]&&s.length!==IBANLEN[s.slice(0,2)])return false;
 const r=(s.slice(4)+s.slice(0,4)).replace(/[A-Z]/g,c=>c.charCodeAt(0)-55);let m=0;for(const ch of r)m=(m*10+ +ch)%97;return m===1}
const fmtIban=s=>(s||'').replace(/\s/g,'').toUpperCase().replace(/(.{4})/g,'$1 ').trim();
/* ---------- Rechnung auslesen ----------
   Eingabe: reiner Text ODER das Ergebnis der Texterkennung mit Lage jeder Zeile ({lines:[{text,x,y,w,h,pts}],width,height}).
   Mit Lage werden Textstücke, die auf dem Papier nebeneinander stehen, wieder zu einer Zeile zusammengesetzt
   („Gesamtbetrag …… 119,00 €“) – die Texterkennung liefert Spalten sonst getrennt. */
const toNum=s=>+String(s).replace(/[.\s' ]/g,'').replace(',','.');
const OCRDIG=s=>s.replace(/[OQD]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2').replace(/G/g,'6');
/* alle gültigen IBANs im Text (Prüfziffer muss stimmen; typische Lesefehler O→0, I→1 … werden probiert) */
function findIbans(txt){const U=String(txt).toUpperCase().replace(/[​·•]/g,' ');const out=[];const re=/(?<![A-Z0-9])([A-Z0O]{2})\s?([0-9OISBZ]{2})(?=[\s\dA-Z])/g;let m;
 while(m=re.exec(U)){let cc=m[1];if(/^[D0O][E3F]$/.test(cc)&&cc!=='DE'&&!IBANLEN[cc])cc='DE';if(!/^[A-Z]{2}$/.test(cc))continue;
  let rest=U.slice(m.index+m[1].length).replace(/[^A-Z0-9 ]/g,'#').split('#')[0].replace(/ /g,'');const L=IBANLEN[cc];if(!L&&!/IBAN/.test(U.slice(Math.max(0,m.index-30),m.index)))continue;
  const lens=L?[L]:[...Array(20)].map((_,i)=>34-i);
  for(const l of lens){let c=cc+rest.slice(0,l-2);if(c.length!==l)continue;const tries=[c];if(cc==='DE')tries.push(cc+OCRDIG(c.slice(2)));else tries.push(cc+OCRDIG(c.slice(2,4))+c.slice(4));
   const ok=tries.find(ibanOK);if(ok){if(!out.includes(ok))out.push(ok);break}}}
 return out}
const findIban=txt=>findIbans(txt)[0]||'';
const INVMON={jan:1,feb:2,mär:3,mar:3,mrz:3,apr:4,mai:5,jun:6,jul:7,aug:8,sep:9,okt:10,nov:11,dez:12};
/* alle Datumsangaben einer Zeile: 12.11.2026, 12.11.26, 12. November 2026, 2026-11-12 */
function invDates(s){const out=[];let m;const add=(d,mo,y,i)=>{y=+y<100?2000+ +y:+y;if(y<2015||y>2040||mo<1||mo>12||d<1||d>31)return;out.push({iso:`${y}-${pad(+mo)}-${pad(+d)}`,i})};
 const a=/(?<!\d)(\d{1,2})\s?[.,]\s?(\d{1,2})\s?[.,]\s?(\d{4}|\d{2})(?!\d)/g;while(m=a.exec(s))add(+m[1],+m[2],m[3],m.index);
 const b=/(?<!\d)(\d{1,2})\.?\s+(Jan|Feb|Mär|Mar|Mrz|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)[a-zä]*\.?\s+(\d{4})/gi;while(m=b.exec(s))add(+m[1],INVMON[m[2].toLowerCase()],m[3],m.index);
 const c=/(?<!\d)(20\d\d)-(\d{2})-(\d{2})(?!\d)/g;while(m=c.exec(s))add(+m[3],+m[2],m[1],m.index);
 return out.sort((x,y)=>x.i-y.i)}
/* Geldbeträge einer Zeile mit Position; Datum, Prozent, Mengen und Stückpreise zählen nicht */
function invAmounts(s){const out=[];let m;const dates=[];const dr=/\d{1,2}\s?[.,]\s?\d{1,2}\s?[.,]\s?(?:\d{4}|\d{2})(?!\d)/g;while(m=dr.exec(s))dates.push([m.index,m.index+m[0].length]);
 const inDate=i=>dates.some(([a,b])=>i>=a&&i<b);
 const re=/(?<![\d.,])(-?\s?)(\d{1,3}(?:[.\s' ]\d{3})+|\d+)\s?([,.])\s?(\d{2}|-|–|—)(?![\d])/g;
 while(m=re.exec(s)){const at=m.index+m[1].length;if(inDate(at))continue;const dec=m[3],grp=m[2];if(dec==='.'&&/[.]/.test(grp))continue;if(dec==='.'&&/^(-|–|—)$/.test(m[4]))continue;
  const before=s.slice(Math.max(0,at-6),at),after=s.slice(m.index+m[0].length,m.index+m[0].length+10);
  if(/^\s?(%|v\.\s?H|Prozent)/i.test(after))continue;if(/^\s?(Std|Stk|St\.|Stück|kWh|m²|m2|m³|m3|qm|kg|km|l\b|Liter|x\b|h\b|Min|Tage?|Monate?|Pkt|Punkte)/i.test(after))continue;
  if(/^\s?(€|EUR)?\s?\/|^\s?(€|EUR)?\s?(je|pro)\b/i.test(after))continue;
  const cur=/(€|EUR|Euro)\s?-?\s?$/i.test(before)||/^\s?(€|EUR|Euro)/i.test(after);
  if(dec==='.'&&!cur)continue;
  const v=toNum(grp)+(/\d\d/.test(m[4])?+m[4]/100:0);if(!(v>0)||v>9999999)continue;out.push({v:Math.round(v*100)/100,i:at,cur,neg:/-/.test(m[1])})}
 const re2=/(?<![\d.,])(\d{1,6})\s?(€|EUR)(?![A-Za-z])/g;while(m=re2.exec(s)){if(inDate(m.index)||out.some(o=>Math.abs(o.i-m.index)<12))continue;out.push({v:+m[1],i:m.index,cur:true})}
 return out.sort((a,b)=>a.i-b.i)}
/* Zeilen wieder zusammensetzen: gleiche Höhe auf dem Blatt = eine Zeile, von links nach rechts */
function invRows(inp){if(!inp.lines||!inp.lines.length){let T=String(inp.text||'').split(/\n/).map(t=>t.trim()).filter(Boolean);const isAm=t=>invAmounts(t).length===1&&t.replace(/[\d.,\s€EUR+\-–]/gi,'').length<2,noAm=t=>!invAmounts(t).length&&/[A-Za-zÄÖÜäöü]{3}/.test(t);
  for(let i=0;i<T.length;i++){if(!isAm(T[i]))continue;let n=0;while(i+n<T.length&&isAm(T[i+n]))n++;let l=0;while(l<n&&i-1-l>=0&&noAm(T[i-1-l]))l++;if(n>=2&&l>=n){for(let k=0;k<n;k++)T[i-n+k]+='   '+T[i+k];T.splice(i,n);i-=1}else i+=n-1}
  return T.map((t,i)=>({text:t,cells:[{text:t,x:0,y:i*20,w:1000,h:16,x0:0,lw:1000,lh:16}],x:0,y:i*20,w:1000,h:16,cy:i*20+8,lh:16}))}
 let L=inp.lines.filter(l=>l.text&&l.text.trim()).map(l=>({text:l.text.trim(),x:l.x,y:l.y,w:l.w,h:l.h,pts:l.pts}));
 // Schräglage ausgleichen (Foto nicht ganz gerade): mittlere Neigung der langen Zeilen
 const ang=L.filter(l=>l.pts&&l.pts.length===8&&l.w>60).map(l=>Math.atan2(l.pts[3]-l.pts[1],l.pts[2]-l.pts[0])).sort((a,b)=>a-b);const rot=ang.length>3?ang[ang.length>>1]:0;
 const c=Math.cos(-rot),s=Math.sin(-rot);L.forEach(l=>{const mx=l.x+l.w/2,my=l.y+l.h/2;l.cx=mx*c-my*s;l.cy=mx*s+my*c;if(l.pts&&l.pts.length===8){l.lh=Math.hypot(l.pts[6]-l.pts[0],l.pts[7]-l.pts[1])||l.h;l.lw=Math.hypot(l.pts[2]-l.pts[0],l.pts[3]-l.pts[1])||l.w}else{l.lh=l.h;l.lw=l.w}l.x0=l.cx-l.lw/2});
 L.sort((a,b)=>a.cy-b.cy);const rows=[];
 L.forEach(l=>{let best=null,bd=1e9;for(let k=rows.length-1;k>=0&&k>=rows.length-6;k--){const r=rows[k];const d=Math.abs(r.cy-l.cy);if(d<Math.min(r.lh,l.lh)*.55&&d<bd&&!r.cells.some(q=>l.x0<q.x0+q.lw-4&&q.x0<l.x0+l.lw-4)){best=r;bd=d}}
  if(best){best.cells.push(l);best.cy=(best.cy*(best.cells.length-1)+l.cy)/best.cells.length;best.lh=Math.max(best.lh,l.lh)}else rows.push({cells:[l],cy:l.cy,lh:l.lh})});
 rows.forEach(r=>{r.cells.sort((a,b)=>a.x0-b.x0);r.text=r.cells.map(q=>q.text).join('   ');const x=Math.min(...r.cells.map(q=>q.x)),y=Math.min(...r.cells.map(q=>q.y));r.x=x;r.y=y;r.w=Math.max(...r.cells.map(q=>q.x+q.w))-x;r.h=Math.max(...r.cells.map(q=>q.y+q.h))-y});
 return rows}
const INV_TOP=/(noch\s+zu\s+zahlen|zu\s+zahlen(?:der)?|zahl(?:ungs)?betrag|nachzahlung|gesamtforderung|offener\s+(?:betrag|posten|rechnungsbetrag)|offene\s+forderung|forderungsbetrag|überweisungsbetrag|zu\s+überweisen|fälliger\s+betrag|betrag\s+fällig|amount\s+due|total\s+due)/i;
const INV_STRONG=/(zu\s+zahlen|zahl(?:ungs)?betrag|rechnungs(?:end)?betrag|rechnungssumme|gesamtbetrag|gesamtsumme|gesamtforderung|endbetrag|endsumme|bruttobetrag|brutto\s?summe|summe\s+brutto|gesamt\s+brutto|brutto\s+gesamt|offener\s+(?:betrag|posten)|offene\s+forderung|forderungsbetrag|nachzahlung|überweisungsbetrag|fälliger\s+betrag|betrag\s+fällig|zu\s+überweisen|amount\s+due|total\s+due|grand\s+total|gesamtpreis|zahlen\s+sie)/i;
const INV_MED=/(gesamt|summe|brutto|betrag|total|beitrag|preis)/i;
const INV_NEG=/(netto|zwischensumme|mwst|mehrwertsteuer|umsatzsteuer|\bust\b|rabatt|skonto|abschlag|vorauszahlung|bereits\s+(?:gezahlt|bezahlt|erhalten)|gutschrift|übertrag|einzelpreis|stückpreis|steuerbetrag|zzgl|mahngebühr|mahnkosten|verzugszins|porto|versand)/i;
function parseInvoice(inp){if(typeof inp==='string')inp={text:inp};const rows=invRows(inp);const txt=rows.map(r=>r.text).join('\n');const flat=inp.text&&inp.lines?inp.text+'\n'+txt:txt;
 const out={raw:txt.slice(0,6000),alts:{amount:[],iban:[]},src:{},W:inp.width||0,H:inp.height||0};const box=r=>inp.lines&&r?{x:r.x,y:r.y,w:r.w,h:r.h}:null;
 const t0=today();const hs=rows.map(r=>r.lh||r.h).sort((a,b)=>a-b);const medH=hs[hs.length>>1]||16;
 /* --- Hinweise --- */
 out.mahnung=/(?<![\wäöüß])(\d\.\s*)?(mahnung|zahlungserinnerung)(?![\wäöüß])/i.test(txt);
 out.lastschrift=/(lastschrift|abgebucht|abbuchen|abbuchung|eingezogen|einziehen|bankeinzug|sepa-?\s?mandat|von\s+ihrem\s+konto)/i.test(txt)&&!/(bitte\s+überweisen|überweisen\s+sie|keine?\s+(?:lastschrift|einzug|abbuchung))/i.test(txt);
 out.bezahlt=/(betrag\s+dankend\s+erhalten|bereits\s+(?:bezahlt|beglichen)|bezahlt\s+(?:per|mit|am)|bar\s+bezahlt|zahlung\s+erhalten|kartenzahlung|ec-?\s?karte|per\s+paypal|mit\s+paypal)/i.test(txt);
 /* --- IBAN: die des Empfängers, nicht die eigene --- */
 const own=(typeof S==='object'&&S&&S.set&&S.set.me&&S.set.me.iban||'').replace(/\s/g,'').toUpperCase();const ib=[];
 rows.forEach((r,k)=>{findIbans(r.text).forEach(x=>{if(ib.some(q=>q.iban===x))return;const ctx=(rows[k-1]?rows[k-1].text:'')+' '+r.text;ib.push({iban:x,row:r,mine:x===own||/(ihr(?:e[mnrs]?)?\s+(?:konto|iban|bankverbindung)|von\s+ihrem|abbuch|lastschrift|mandat|zahlungspflichtig|eingezogen|einziehen)/i.test(ctx)})})});
 findIbans(flat.replace(/\n/g,' ')).forEach(x=>{if(!ib.some(q=>q.iban===x))ib.push({iban:x,row:null,mine:x===own})});
 const pick=ib.find(x=>!x.mine)||(!out.lastschrift?ib[0]:null);if(pick){out.iban=pick.iban;if(pick.row)out.src.iban=box(pick.row)}else out.iban='';out.alts.iban=ib.map(x=>x.iban);
 const bic=txt.match(/(?:BIC|SWIFT)\s*[:.\-/]?\s*(?:SWIFT)?\s*[:.]?\s*([A-Z]{4}\s?DE\s?[A-Z0-9]{2}\s?(?:[A-Z0-9]{3})?|[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/);if(bic)out.bic=bic[1].replace(/\s/g,'').toUpperCase();
 /* --- Betrag: jede Zahl bekommt Punkte --- */
 const cand=[];rows.forEach((r,k)=>{if(findIbans(r.text).length&&!/(betrag|summe|gesamt)/i.test(r.text))return;invAmounts(r.text).forEach(a=>cand.push(Object.assign({row:r,k,sc:0},a)))});
 const scoreRow=(t)=>{let s=0;const top=INV_TOP.test(t),strong=top||INV_STRONG.test(t),neg=INV_NEG.test(t.replace(INV_TOP,'')),incl=/(inkl|incl|einschl|enthalten|enthält)/i.test(t);if(top)s+=22;else if(strong)s+=10;else if(INV_MED.test(t))s+=4;if(neg&&!(strong&&incl))s-=strong?6:8;if(/netto/i.test(t)&&!/brutto/i.test(t))s-=4;return s};
 cand.forEach(c=>{const r=c.row;const last=!invAmounts(r.text).some(a=>a.i>c.i);let s=scoreRow(r.text);if(!last&&s>0)s=Math.min(s,2);
  if(s===0&&last){const up=rows[c.k-1];if(up&&!invAmounts(up.text).length&&Math.abs(up.cy-r.cy)<medH*3.2){const u=scoreRow(up.text);if(u>0)s+=u-1}}
  if(s===0&&inp.lines){const q=r.cells.find(q=>q.text.includes(String(c.v).split('.')[0].slice(-3)))||r.cells[r.cells.length-1];for(let j=c.k-1;j>=0&&j>=c.k-3;j--){const u=rows[j];if(r.cy-u.cy>medH*6)break;const hc=u.cells.find(h=>!invAmounts(h.text).length&&h.x0<q.x0+q.lw&&q.x0<h.x0+h.lw+medH&&Math.abs((h.x0+h.lw)-(q.x0+q.lw))<Math.max(h.lw,q.lw)*1.2);if(hc){const us=scoreRow(hc.text);if(us>0){s+=us-1;break}}}}
  if(c.cur)s+=2;if((r.lh||r.h)>medH*1.18)s+=1.5;if(c.neg)s-=3;c.sc=s});
 // Rechenprobe: Netto + Steuer = Brutto  → Brutto ist der Rechnungsbetrag
 const vals=[...new Set(cand.map(c=>c.v))];const near=(a,b,t)=>Math.abs(a-b)<=t;
 vals.forEach(b=>vals.forEach(n=>{if(n>=b)return;const tx=Math.round((b-n)*100)/100;if(!vals.some(v=>near(v,tx,.011)))return;if(!(near(tx,n*.19,.03)||near(tx,n*.07,.03)))return;
  cand.forEach(c=>{if(c.v===b)c.sc+=7;else if(c.v===n||near(c.v,tx,.011))c.sc-=5})}));
 const paidRow=/(abschl[aä]g|vorauszahlung|bereits\s+(?:gezahlt|bezahlt|erhalten)|anzahlung|gutschrift)/i;const bru=cand.filter(c=>INV_STRONG.test(c.row.text)&&!paidRow.test(c.row.text)),pd=cand.filter(c=>paidRow.test(c.row.text));
 bru.forEach(b=>pd.forEach(p=>{const d=Math.round((b.v-p.v)*100)/100;if(d<=0)return;const hit=cand.filter(c=>near(c.v,d,.011));if(hit.length)hit.forEach(c=>c.sc+=6);else{const tr=rows.findIndex(r=>INV_TOP.test(r.text)&&!invAmounts(r.text).length&&/\d/.test(r.text));if(tr>=0&&!out.calc){out.calc=d;cand.push({row:rows[tr],k:tr,v:d,i:0,cur:true,sc:21,calc:true})}}}));
 const maxV=Math.max(0,...cand.map(c=>c.v));cand.forEach(c=>{c.sc+=c.k/Math.max(1,rows.length)*1.5;if(c.v===maxV&&cand.length>1)c.sc+=1.2});
 cand.sort((a,b)=>b.sc-a.sc||b.v-a.v);const best=cand[0];
 if(best){out.amount=best.v;out.src.amount=box(best.row);if(best.calc)out.amountNote='Betrag war nicht sauber lesbar – aus Rechnungsbetrag minus Abschlägen errechnet';out.amountSure=best.sc>=9&&(!cand[1]||cand[1].v===best.v||best.sc-cand.find(c=>c.v!==best.v).sc>=3)}else out.amount='';
 out.alts.amount=[...new Set(cand.map(c=>c.v))].slice(0,6);
 /* --- Rechnungsdatum und Frist --- */
 const allD=[];rows.forEach((r,k)=>invDates(r.text).forEach(d=>allD.push(Object.assign({row:r,k},d))));
 const labelDate=(re)=>{for(let k=0;k<rows.length;k++){const r=rows[k];const m=r.text.match(re);if(!m)continue;const after=invDates(r.text).filter(d=>d.i>=m.index);if(after[0])return Object.assign({row:r},after[0]);
   const lc=r.cells.find(q=>re.test(q.text));for(let j=k+1;j<=k+2&&j<rows.length;j++){const n=rows[j];if(n.cy-r.cy>medH*4)break;let cs=n.cells.filter(q=>invDates(q.text).length);if(lc&&inp.lines)cs=cs.filter(q=>q.x0<lc.x0+lc.lw+medH*2&&lc.x0<q.x0+q.lw+medH*2);if(cs[0])return Object.assign({row:n},invDates(cs[0].text)[0])}}return null};
 const invD=labelDate(/(rechnungs\s?-?\s?datum|belegdatum|rechnung\s+vom|ausstellungsdatum|invoice\s+date)/i)||labelDate(/(?<![a-zäöü])datum(?![a-zäöü])/i);
 const sane=d=>d&&d>=addDays(t0,-400)&&d<=addDays(t0,400);if(invD&&sane(invD.iso))out.inv=invD.iso;
 const DUE=/(zahlbar\s+(?:bis|zum|am)|fällig(?:keit)?(?:sdatum)?\s*(?:am|bis|zum|:)?|faellig|zahlungsziel|zahlungstermin|zahlung\s+bis|zahlen\s+sie\s+bis|begleichen\s+sie[^\n]{0,40}?bis|überweisen\s+sie[^\n]{0,60}?bis|bis\s+spätestens|spätestens\s+(?:bis|zum|am)|bis\s+zum|abgebucht\s+am|abbuchung\s+(?:am|zum)|eingezogen\s+am|einzug\s+(?:am|zum)|buchen\s+wir\s+(?:am|zum)|ziehen\s+wir\s+(?:am|zum)|due\s+date)/i;
 let due=null;for(let k=0;k<rows.length&&!due;k++){const r=rows[k];const m=r.text.match(DUE);if(!m)continue;const ds=invDates(r.text).filter(d=>d.i>=m.index);if(ds[0]){due=Object.assign({row:r},ds[0]);break}
  const lc=r.cells.find(q=>DUE.test(q.text));for(let j=k+1;j<=k+2&&j<rows.length&&!due;j++){const n=rows[j];if(n.cy-r.cy>medH*4)break;let cs=n.cells.filter(q=>invDates(q.text).length);if(lc&&inp.lines)cs=cs.filter(q=>q.x0<lc.x0+lc.lw+medH*2&&lc.x0<q.x0+q.lw+medH*2);if(cs[0])due=Object.assign({row:n},invDates(cs[0].text)[0])}}
 if(due&&sane(due.iso)&&(!out.inv||due.iso>=out.inv)){out.due=due.iso;out.src.due=box(due.row)}
 else{const n=txt.match(/(?:innerhalb|binnen)\s+(?:von\s+)?(\d{1,3})\s+(?:Kalender|Werk)?\s?Tagen?|Zahlungsziel\s*:?\s*(\d{1,3})\s+Tage|(\d{1,3})\s+Tage\s+(?:netto|ohne\s+Abzug|nach\s+(?:Erhalt|Rechnungs))/i);
  if(n){const d=+(n[1]||n[2]||n[3]);const r=rows.find(r=>r.text.includes(n[0].slice(0,20)));out.due=addDays(out.inv||t0,d);if(out.due<t0)out.dueNote='Frist laut Rechnung schon vorbei';if(r)out.src.due=box(r)}
  else if(/(sofort\s+(?:fällig|zahlbar)|zahlbar\s+sofort|sofort\s+(?:ohne|rein\s+netto)|nach\s+erhalt)/i.test(txt)){out.due=addDays(t0,3);out.dueNote='laut Rechnung sofort fällig'}}
 /* --- Nummern: Wert steht hinter dem Stichwort, im Feld rechts daneben oder darunter --- */
 const NUMV=/[A-Z]{0,5}[-\/ ]?\d[\dA-Z\-\/.]{1,}\d/i;const numOk=t=>t&&(t[0].match(/\d/g)||[]).length>=4&&!invDates(t[0]).length?t[0].replace(/[.\-\/]$/,''):'';
 const numAfter=re=>{for(let k=0;k<rows.length;k++){const r=rows[k];const ci=r.cells.findIndex(q=>re.test(q.text));if(ci<0)continue;const q=r.cells[ci];const m=q.text.match(re);
   let v=numOk(q.text.slice(m.index+m[0].length).replace(/^[\s.:#]+/,'').match(NUMV));if(v)return v;
   if(r.cells[ci+1]){v=numOk(r.cells[ci+1].text.match(NUMV));if(v&&!/[a-zäöü]{4}/i.test(r.cells[ci+1].text.replace(v,'')))return v}
   if(inp.lines)for(let j=k+1;j<=k+2&&j<rows.length;j++){const n=rows[j];if(n.cy-r.cy>medH*4)break;const cs=n.cells.filter(c=>c.x0<q.x0+q.lw&&q.x0<c.x0+c.lw);for(const c of cs){v=numOk(c.text.match(NUMV));if(v&&!/[a-zäöü]{5}/i.test(c.text.replace(v,'')))return v}}}return''};
 const rn=numAfter(/(?:Rechnungs?|Beleg|Invoice)\s*-?\s*(?:nr|nummer|no|number)\.?/i)||numAfter(/Rechnung\s+(?:Nr\.?|Nummer)/i),kn=numAfter(/Kunden\s*-?\s*(?:nr|nummer|konto)\.?/i),vn=numAfter(/(?:Vertrags?|Versicherungs(?:schein)?|Policen?|Buchungs|Kassen|Akten|Vorgangs)\s*-?\s*(?:nr|nummer|konto|zeichen)\.?/i);
 out.ref=[rn?`Rechnung ${rn}`:'',kn?`Kundennr. ${kn}`:'',!rn&&!kn&&vn?`Nr. ${vn}`:''].filter(Boolean).join(' ');
 /* --- Empfänger --- */
 let pay='';const kh=txt.match(/(?:Kontoinhaber(?:in)?|Zahlungsempfänger(?:in)?|Empfänger(?:in)?|Begünstigte[r]?)\s*:?\s+([^\n]{3,70})/i);if(kh){const c=kh[1].split(/\s{3,}| IBAN| BIC| Bank/i)[0].trim();if(/[A-Za-zÄÖÜäöü]{3}/.test(c)&&!/^(iban|bic|bank)/i.test(c))pay=c}
 const lines=rows.map(r=>r.text);
 if(!pay){const FIRM=/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß&.,\- ]{1,60}?\s(?:GmbH\s*&\s*Co\.?\s*KG|GmbH|AG|KG|e\.\s?K\.|e\.\s?V\.|UG(?:\s*\(haftungsbeschränkt\))?|GbR|mbH|eG|OHG|SE))(?![A-Za-z])/;const cnt={};
  const SAL=/^(?:(?:ihre?|frau|herrn?|firma|an|sehr|geehrte[rn]?|mit|freundlichen|grüßen|grüssen|von|absender|rechnung|mahnung)\s+)+/i;
  rows.forEach(r=>r.cells.forEach(q=>{const m=q.text.match(FIRM);if(m){const n=m[1].replace(/,/g,' ').replace(/\s+/g,' ').trim().replace(SAL,'');if(n.split(' ').length>=2)cnt[n]=(cnt[n]||0)+1}}));
  const names=Object.keys(cnt),low=x=>x.toLowerCase();const fam=r=>names.filter(n=>low(n).endsWith(low(r)));const famCount=r=>fam(r).reduce((a,n)=>a+cnt[n],0);
  const root=names.sort((a,b)=>famCount(b)-famCount(a)||a.length-b.length)[0];
  if(root){const vs=fam(root).sort((a,b)=>b.length-a.length);pay=vs.find(v=>/^[A-ZÄÖÜ]/.test(v)&&v.split(' ').length<=6)||root}}
 if(!pay&&inp.lines&&out.H){// Briefkopf: größte Schrift im oberen Viertel
  const top=rows.flatMap(r=>r.cells).filter(q=>q.y<out.H*.2&&/[A-Za-zÄÖÜäöü]{3}/.test(q.text)&&!/(rechnung|invoice|mahnung|seite|datum|kunden|telefon|www\.|@)/i.test(q.text)&&q.text.length<60).sort((a,b)=>b.lh-a.lh)[0];if(top&&top.lh>medH*1.4)pay=top.text}
 if(!pay){const l=lines.find(l=>/[A-Za-zÄÖÜäöü]{3}/.test(l)&&!/rechnung|mahnung/i.test(l))||'';pay=l.split(/\s[-–·|]\s|\s{3,}/)[0].replace(/[\s\d\W]+$/,'')}
 out.payee=(pay||'').slice(0,70);
 /* --- Steuer --- */
 if(/(handwerk|elektro|sanitär|heizung|maler|montage|reparatur|schornstein|dachdecker|installation|fliesen|tischler|schreiner)/i.test(txt))out.taxType='handwerker';
 else if(/(reinigung|gartenpflege|hausmeister|winterdienst|treppenhaus)/i.test(txt))out.taxType='haushalt';
 let labor=0;const LAB=/(lohn|arbeits(?:kosten|lohn|zeit|stunde|leistung)|montage|fahrt|anfahrt)/i;const expl=rows.find(r=>LAB.test(r.text)&&/(enthalten|anteil|§\s?35\s?a|davon)/i.test(r.text)&&invAmounts(r.text).length);
 if(expl)labor=invAmounts(expl.text)[0].v;else rows.forEach(r=>{if(LAB.test(r.text)){const a=invAmounts(r.text);if(a.length)labor+=a[a.length-1].v}});if(labor)out.labor=Math.round(labor*100)/100;
 return out}
const parseInvoiceText=txt=>parseInvoice({text:String(txt||'')});
function parseEPC(txt){const L=txt.split(/\r?\n/);if(L[0]!=='BCD')return null;return{bic:L[4]||'',payee:L[5]||'',iban:(L[6]||'').replace(/\s/g,''),amount:L[7]?+L[7].replace(/^EUR/,''):'',ref:L[10]||L[9]||''}}
function parseBezahlCode(txt){if(!/^bank:\/\//i.test(txt))return null;try{const u=new URL(txt.replace(/^bank:\/\//i,'https://x/'));const g=k=>u.searchParams.get(k)||'';return{payee:g('name'),iban:g('iban')||g('account'),bic:g('bic')||g('bnc'),amount:g('amount')?toNum(g('amount')):'',ref:g('reason')}}catch(e){return null}}
function epcPayload(d){const amt=(+d.amount||0).toFixed(2);return['BCD','002','1','SCT',(d.bic||'').toUpperCase(),(d.payee||'').slice(0,70),(d.iban||'').replace(/\s/g,'').toUpperCase(),+amt>0?'EUR'+amt:'','','',(d.ref||'').slice(0,140)].join('\n')}
function qrSvg(text){if(typeof qrcode!=='function')return null;try{qrcode.stringToBytes=x=>Array.from(new TextEncoder().encode(x));const q=qrcode(0,'M');q.addData(text,'Byte');q.make();return q.createSvgTag({cellSize:6,margin:4,scalable:true})}catch(e){return null}}

/* ---------- Steuer ---------- */
const TAXT={none:'Nicht steuerrelevant',handwerker:'Handwerkerleistung (§ 35a)',haushalt:'Haushaltsnahe Dienstleistung (§ 35a)',werbung:'Werbungskosten / Beruf',sonstig:'Sonstiges für die Steuer'};
function rates(y){const d={hw:{p:20,max:1200},hh:{p:20,max:4000}};return S.tax[y]?{hw:{...d.hw,...S.tax[y].hw},hh:{...d.hh,...S.tax[y].hh}}:d}
function taxYear(y){const all=S.docs.filter(d=>d.year==y),docs=all.filter(d=>!isRentedDoc(d));const vm=objs().filter(isRented).map(o=>{const ds=all.filter(d=>d.objId===o.id);return{o,ds,sum:ds.reduce((a,d)=>a+(+d.amount||0),0),rent:Object.keys(o.payments||{}).filter(m=>m.startsWith(y+'-')).length*(+o.miete||0)}}).filter(x=>x.ds.length||x.rent);const hw=docs.filter(d=>d.taxType==='handwerker').reduce((a,d)=>a+(+d.labor||0),0);const hh=docs.filter(d=>d.taxType==='haushalt').reduce((a,d)=>a+(+d.labor||0),0);const wk=docs.filter(d=>d.taxType==='werbung').reduce((a,d)=>a+(+d.amount||0),0);const R=rates(y);
 return{hw,hh,wk,hwBack:Math.min(hw*R.hw.p/100,R.hw.max),hhBack:Math.min(hh*R.hh.p/100,R.hh.max),R,vm,count:docs.filter(d=>d.taxType&&d.taxType!=='none').length+vm.reduce((a,x)=>a+x.ds.length,0)}}
