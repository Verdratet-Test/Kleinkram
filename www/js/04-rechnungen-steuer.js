/* Kleinkram · IBAN, GiroCode, Rechnungstext auslesen, § 35a */
"use strict";
/* ---------- Rechnungen verstehen ---------- */
const IBANLEN={DE:22,AT:20,CH:21,NL:18,FR:27,IT:27,ES:24,BE:16,LU:20,PL:28,DK:18,CZ:24,LI:21,IE:22,GB:22,PT:25,SE:24,FI:18};
function ibanOK(s){s=s.replace(/\s/g,'').toUpperCase();if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s))return false;if(IBANLEN[s.slice(0,2)]&&s.length!==IBANLEN[s.slice(0,2)])return false;
 const r=(s.slice(4)+s.slice(0,4)).replace(/[A-Z]/g,c=>c.charCodeAt(0)-55);let m=0;for(const ch of r)m=(m*10+ +ch)%97;return m===1}
const fmtIban=s=>(s||'').replace(/\s/g,'').toUpperCase().replace(/(.{4})/g,'$1 ').trim();
function findIban(txt){const U=txt.toUpperCase();const re=/([A-Z]{2})(\d{2})/g;let m;while(m=re.exec(U)){let rest=U.slice(m.index).replace(/[^A-Z0-9 ]/g,'#').split('#')[0].replace(/ /g,'');if(m[1]==='DE')rest=rest.slice(0,2)+rest.slice(2).replace(/O/g,'0').replace(/[IL]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2');const L=IBANLEN[m[1]];const lens=L?[L]:[...Array(20)].map((_,i)=>34-i);for(const l of lens){const c=rest.slice(0,l);if(c.length===l&&ibanOK(c))return c}}return''}
const toNum=s=>+String(s).replace(/[.\s]/g,'').replace(',','.');
function parseInvoiceText(txt){const out={raw:String(txt).slice(0,6000)};const lines=txt.split(/\n/).map(l=>l.trim()).filter(Boolean);
 out.iban=findIban(txt);
 const bic=txt.match(/BIC\s*[:.]?\s*([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/i);if(bic)out.bic=bic[1].toUpperCase();
 const amRe=/(\d{1,3}(?:[.\s]\d{3})*|\d+),(\d{2})(?!\d)/g;const KW=/(gesamt|rechnungsbetrag|zu zahlen|zahlbetrag|endbetrag|summe|brutto|total|offener betrag|betrag)/i;
 let best=null,max=0;lines.forEach(l=>{const a=[...l.matchAll(amRe)].map(x=>toNum(x[0]));a.forEach(v=>{if(v>max)max=v});if(KW.test(l)&&a.length){const v=a[a.length-1];if(best===null||(/gesamt|zu zahlen|zahlbetrag|endbetrag|rechnungsbetrag/i.test(l))||v>best)best=v}});
 out.amount=best??(max||'');
 const due=txt.match(/(zahlbar(?:\s+bis)?|fällig(?:\s+am|\s+bis)?|faellig|zahlungsziel|bis\s+spätestens|spätestens(?:\s+bis|\s+zum|\s+am)?|bis\s+zum)[^\d\n]{0,30}(\d{1,2})\.(\d{1,2})\.(\d{2,4})/i);if(due)out.due=mkDate(due[2],due[3],due[4]);
 else{const n=txt.match(/innerhalb\s+(?:von\s+)?(\d{1,3})\s+Tag/i);if(n)out.due=addDays(today(),+n[1])}
 // Nummern: das erste Stück mit mindestens 4 Ziffern nach dem Stichwort (auch wenn die Erkennung Spalten vermischt)
 const numAfter=re=>{const m=txt.match(new RegExp(re.source+'\\.?\\s*:?([\\s\\S]{0,60})','i'));if(!m)return'';const t=m[m.length-1].match(/[A-Z]{0,4}[-\/]?\d[\dA-Z\-\/.]{2,}\d/i);return t&&(t[0].match(/\d/g)||[]).length>=4?t[0]:''};
 const rn=numAfter(/Rechnungs?\s*-?\s*(?:nr|nummer|no)/),kn=numAfter(/Kunden\s*-?\s*(?:nr|nummer)/),vn=numAfter(/Vertrags?\s*-?\s*(?:nr|nummer|konto)/);
 out.ref=[rn?`Rechnung ${rn}`:'',kn?`Kundennr. ${kn}`:'',!rn&&!kn&&vn?`Vertrag ${vn}`:''].filter(Boolean).join(' ');
 // Empfänger: Firmenname mit Rechtsform, am häufigsten genannt
 const FIRM=/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß&.,\- ]{1,60}?\s(?:GmbH\s*&\s*Co\.?\s*KG|GmbH|AG|KG|e\.\s?K\.|UG|GbR|mbH|eG))(?![A-Za-z])/;const cnt={};
 const SAL=/^(?:(?:ihre?|frau|herrn?|firma|an|sehr|geehrte[rn]?|mit|freundlichen|grüßen|grüssen|von|absender|rechnung|mahnung)\s+)+/i;
 lines.forEach(l=>{const m=l.match(FIRM);if(m){const n=m[1].replace(/,/g,' ').replace(/\s+/g,' ').trim().replace(SAL,'');if(n.split(' ').length>=2)cnt[n]=(cnt[n]||0)+1}});
 const names=Object.keys(cnt),low=x=>x.toLowerCase();
 // Familien bilden: Varianten, die auf denselben Kern enden („Freudenstadt GmbH & Co. KG“ ⊂ „Stadtwerke Freudenstadt GmbH & Co. KG“)
 const fam=r=>names.filter(n=>low(n).endsWith(low(r)));const famCount=r=>fam(r).reduce((a,n)=>a+cnt[n],0);
 const root=names.sort((a,b)=>famCount(b)-famCount(a)||a.length-b.length)[0];let pay='';
 if(root){const vs=fam(root).sort((a,b)=>b.length-a.length);pay=vs.find(v=>/^[A-ZÄÖÜ]/.test(v)&&v.split(' ').length<=6)||root}
 if(!pay){const l=lines.find(l=>/[A-Za-zÄÖÜäöü]{3}/.test(l)&&!/rechnung|mahnung/i.test(l))||'';pay=l.split(/\s[-–·|]\s/)[0].replace(/[\s\d\W]+$/,'')}
 out.payee=(pay||'').slice(0,70);out.mahnung=/(?<![\wäöüß])(\d\.\s*)?mahnung(?![\wäöüß])/i.test(txt);
 if(/(handwerk|elektro|sanitär|heizung|maler|montage|reparatur|schornstein|dachdecker|installation|fliesen|tischler|schreiner)/i.test(txt))out.taxType='handwerker';
 else if(/(reinigung|gartenpflege|hausmeister|winterdienst|treppenhaus)/i.test(txt))out.taxType='haushalt';
 let labor=0;lines.forEach(l=>{if(/(lohn|arbeits(?:kosten|lohn|zeit|stunde)|montage|fahrt|anfahrt)/i.test(l)){const a=[...l.matchAll(amRe)].map(x=>toNum(x[0]));if(a.length)labor+=a[a.length-1]}});if(labor)out.labor=Math.round(labor*100)/100;
 return out}
function parseEPC(txt){const L=txt.split(/\r?\n/);if(L[0]!=='BCD')return null;return{bic:L[4]||'',payee:L[5]||'',iban:(L[6]||'').replace(/\s/g,''),amount:L[7]?+L[7].replace(/^EUR/,''):'',ref:L[10]||L[9]||''}}
function parseBezahlCode(txt){if(!/^bank:\/\//i.test(txt))return null;try{const u=new URL(txt.replace(/^bank:\/\//i,'https://x/'));const g=k=>u.searchParams.get(k)||'';return{payee:g('name'),iban:g('iban')||g('account'),bic:g('bic')||g('bnc'),amount:g('amount')?toNum(g('amount')):'',ref:g('reason')}}catch(e){return null}}
function epcPayload(d){const amt=(+d.amount||0).toFixed(2);return['BCD','002','1','SCT',(d.bic||'').toUpperCase(),(d.payee||'').slice(0,70),(d.iban||'').replace(/\s/g,'').toUpperCase(),+amt>0?'EUR'+amt:'','','',(d.ref||'').slice(0,140)].join('\n')}
function qrSvg(text){if(typeof qrcode!=='function')return null;try{qrcode.stringToBytes=x=>Array.from(new TextEncoder().encode(x));const q=qrcode(0,'M');q.addData(text,'Byte');q.make();return q.createSvgTag({cellSize:6,margin:4,scalable:true})}catch(e){return null}}

/* ---------- Steuer ---------- */
const TAXT={none:'Nicht steuerrelevant',handwerker:'Handwerkerleistung (§ 35a)',haushalt:'Haushaltsnahe Dienstleistung (§ 35a)',werbung:'Werbungskosten / Beruf',sonstig:'Sonstiges für die Steuer'};
function rates(y){const d={hw:{p:20,max:1200},hh:{p:20,max:4000}};return S.tax[y]?{hw:{...d.hw,...S.tax[y].hw},hh:{...d.hh,...S.tax[y].hh}}:d}
function taxYear(y){const all=S.docs.filter(d=>d.year==y),docs=all.filter(d=>!isRentedDoc(d));const vm=objs().filter(isRented).map(o=>{const ds=all.filter(d=>d.objId===o.id);return{o,ds,sum:ds.reduce((a,d)=>a+(+d.amount||0),0),rent:Object.keys(o.payments||{}).filter(m=>m.startsWith(y+'-')).length*(+o.miete||0)}}).filter(x=>x.ds.length||x.rent);const hw=docs.filter(d=>d.taxType==='handwerker').reduce((a,d)=>a+(+d.labor||0),0);const hh=docs.filter(d=>d.taxType==='haushalt').reduce((a,d)=>a+(+d.labor||0),0);const wk=docs.filter(d=>d.taxType==='werbung').reduce((a,d)=>a+(+d.amount||0),0);const R=rates(y);
 return{hw,hh,wk,hwBack:Math.min(hw*R.hw.p/100,R.hw.max),hhBack:Math.min(hh*R.hh.p/100,R.hh.max),R,vm,count:docs.filter(d=>d.taxType&&d.taxType!=='none').length+vm.reduce((a,x)=>a+x.ds.length,0)}}
