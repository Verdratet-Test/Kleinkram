/* Kleinkram · Plan scannen: Dienst-/Bereitschaftsplan fotografieren → eigene Zeilen als Termine oder Aufgaben */
"use strict";
/* Ablauf: Foto → Texterkennung (Handy: ML Kit, Web: Tesseract) → Zeilen der Tabelle bilden →
   Datum je Zeile lesen (bei Wochenplänen mit KW-Abgleich und Lücken-Füllen) → eigene Zeilen finden
   (Name/Kürzel und/oder farbige Markierung) → Prüfansicht → erst nach Tipp speichern. */
let PL=null;
const plMed=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};

/* ---------- Datum & Kalenderwoche ---------- */
function plIsoMon(Y,k){const j=new Date(Y,0,4);j.setDate(j.getDate()-((j.getDay()+6)%7)+7*(k-1));return iso(j)}
function plIsoWeek(s){const d=P(s);d.setDate(d.getDate()+3-((d.getDay()+6)%7));const w1=new Date(d.getFullYear(),0,4);return 1+Math.round(((d-w1)/864e5-3+((w1.getDay()+6)%7))/7)}
function plMkDate(d,m,y,Y){d=+d;m=+m;y=y==null||y===''?(Y||new Date().getFullYear()):+y;if(y<100)y+=2000;
 if(d<1||d>31||m<1||m>12||y<2000||y>2099)return null;if(Y&&Math.abs(y-Y)>1)return null;const s=`${y}-${pad(m)}-${pad(d)}`;return P(s).getMonth()===m-1?s:null}
/* Typische Lesefehler in Zahlen: O→0, l/I/|→1 (nur direkt neben Ziffern) */
function plFixDigits(t){return t.replace(/(?<=\d)[oO]|[oO](?=\d)/g,'0').replace(/(?<=\d)[lI|!]|[lI|!](?=\d)/g,'1')}
function plDates(text,Y){const t=plFixDigits(text),out=[];let m;
 const re=/(?<!\d)(\d{1,2})\s?[.,:;]\s?(\d{1,2})\s?[.,:;]\s?(\d{4}|\d{2})(?!\d)/g;
 while((m=re.exec(t))){const s=plMkDate(m[1],m[2],m[3],Y);if(s)out.push({s,i:m.index})}
 if(out.length<2){/* Ziffern ohne Trennzeichen, z. B. „2405.27.31.05.27“ oder „151227-201227“ */
  const tk=t.split(/[\s\-–—_|]+/).map(x=>x.replace(/\D/g,''));
  for(let i=0;i<tk.length&&out.length<2;i++){let ds='';for(let j=i;j<tk.length;j++){ds+=tk[j];if(ds.length===12){const a=plMkDate(ds.slice(0,2),ds.slice(2,4),ds.slice(4,6),Y),b=plMkDate(ds.slice(6,8),ds.slice(8,10),ds.slice(10),Y);if(a&&b&&b>=a&&!out.length){out.push({s:a,i:999},{s:b,i:1000});i=tk.length}break}
    if(ds.length===6&&j===i){const a=plMkDate(ds.slice(0,2),ds.slice(2,4),ds.slice(4),Y);if(a&&!out.some(o=>o.s===a)&&(j+1>=tk.length||tk[j+1].length!==6)){out.push({s:a,i:999});break}}
    if(ds.length>12)break}}}
 if(!out.length){/* Datum ohne Jahr: „03.05.“ */const re2=/(?<![\d.])(\d{1,2})\.(\d{1,2})\.(?!\d)/g;while((m=re2.exec(t))){const s=plMkDate(m[1],m[2],null,Y);if(s)out.push({s,i:m.index})}}
 out.sort((a,b)=>a.i-b.i);return out.map(o=>o.s)}
function plTime(text){const m=/(?<![\d.,:])([01]?\d|2[0-3]):([0-5]\d)(?![\d.,:])/.exec(text);return m?`${pad(+m[1])}:${m[2]}`:null}

/* ---------- Namen unscharf vergleichen ---------- */
function plNorm(s){return String(s||'').toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'')}
function plLev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function plNameHit(text,names){const T=plNorm(text),words=T.split(/[^a-z0-9]+/).filter(w=>w.length>=2),flat=T.replace(/[^a-z]/g,'');
 return names.some(nm=>{const n=plNorm(nm).replace(/[^a-z0-9]/g,'');if(n.length<2)return false;if(n.length<=3)return words.includes(n);
  const tol=n.length>=8?2:1;return flat.includes(n)||words.some(w=>Math.abs(w.length-n.length)<=tol&&plLev(w,n)<=tol)})}
const plNames=()=>String(S.set.planName||'').split(/[,;/]+/).map(x=>x.trim()).filter(Boolean);

/* ---------- Zeilen der Tabelle bilden ---------- */
function plLines(raw){return(raw||[]).filter(l=>l&&String(l.text||'').trim()).map(l=>{let x0,y0,x1,y1,ang=null;
 if(l.pts&&l.pts.length===8){const p=l.pts;x0=Math.min(p[0],p[6]);x1=Math.max(p[2],p[4]);y0=Math.min(p[1],p[3]);y1=Math.max(p[5],p[7]);const dx=p[2]-p[0];if(Math.abs(dx)>4)ang=Math.atan2(p[3]-p[1],dx)}
 else{x0=l.x;y0=l.y;x1=l.x+l.w;y1=l.y+l.h}
 const h=l.pts&&l.pts.length===8?Math.hypot(l.pts[6]-l.pts[0],l.pts[7]-l.pts[1]):y1-y0;
 return{t:String(l.text).trim(),x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2,h:h||y1-y0,ang}})}
function plAnalyse(raw,W,H){const L=plLines(raw);if(!L.length)return{rows:[],plan:[],ta:0};
 const angs=L.filter(l=>l.ang!=null&&l.x1-l.x0>2.5*l.h).map(l=>l.ang);const a=angs.length?plMed(angs):0,ta=Math.tan(a);
 let hs=plMed(L.map(l=>l.h))||12;L.forEach(l=>l.py=l.cy-l.cx*ta);
 const rows=[];let cur=null;
 L.slice().sort((p,q)=>p.py-q.py).forEach(l=>{if(cur&&l.py-cur.py<hs*.55){cur.lines.push(l);cur.py+=(l.py-cur.py)/cur.lines.length}else{cur={lines:[l],py:l.py};rows.push(cur)}});
 rows.forEach(r=>{r.lines.sort((p,q)=>p.x0-q.x0);r.text=r.lines.map(l=>l.t).join('  ');r.x0=Math.min(...r.lines.map(l=>l.x0));r.x1=Math.max(...r.lines.map(l=>l.x1))});
 /* Jahr: aus der Überschrift (2027) oder aus den meisten Datumsangaben */
 let Y=null;for(const r of rows.slice(0,6)){const m=/(?<!\d)(20\d\d)(?!\d)/.exec(r.text);if(m){Y=+m[1];break}}
 if(!Y){const ys=[];rows.forEach(r=>plDates(r.text).forEach(s=>ys.push(+s.slice(0,4))));if(ys.length)Y=plMed(ys)|0}
 rows.forEach(r=>{const ds=plDates(r.text,Y);r.d=ds[0]||null;r.e=ds[1]&&ds[1]>=ds[0]&&diff(ds[0],ds[1])<=62?ds[1]:null;r.own=!!r.d;r.time=plTime(r.text);
  const f=plFixDigits(r.lines[0].t).split(/\s+/)[0],m=/^[^\dA-Za-z]{0,3}(\d{1,2})[^\d]{0,3}$/.exec(f);r.k=m&&+m[1]>=1&&+m[1]<=53?+m[1]:null});
 /* Wochenplan? (Montag bis Montag bzw. 7 Tage, mehrere Zeilen) */
 const wk=rows.filter(r=>r.d&&r.e&&diff(r.d,r.e)===7);const weekly=wk.length>=3&&wk.length>=rows.filter(r=>r.d).length*.5;
 if(weekly){
  /* sichere Zeilen: Datum passt zum Wochenmuster (KW nicht nötig – eingekreiste Zahlen werden oft falsch gelesen);
     Ausreißer fliegen raus, indem die längste aufsteigende Datumsfolge von oben nach unten behalten wird */
  let C=rows.filter(r=>r.d&&r.e&&diff(r.d,r.e)===7);
  const n=C.length,len=Array(n).fill(1),prev=Array(n).fill(-1);
  for(let i=0;i<n;i++)for(let j=0;j<i;j++)if(C[j].d<C[i].d&&len[j]+1>len[i]){len[i]=len[j]+1;prev[i]=j}
  let bi=len.indexOf(Math.max(...len));const keep=[];while(bi>=0){keep.unshift(C[bi]);bi=prev[bi]}
  C=keep;C.forEach(r=>r.sure=true);
  rows.forEach(r=>{if(r.sure)return;const A=[...C].reverse().find(c=>c.py<r.py),B=C.find(c=>c.py>r.py);let cand=null;
   if(A&&B){const wks=diff(A.d,B.d)/7,f=(r.py-A.py)/(B.py-A.py),k=Math.round(f*wks);if(k>0&&k<wks&&Math.abs(f*wks-k)<.35)cand=addDays(A.d,7*k)}
   else if((A||B)&&/\d/.test(r.text)){const R=A||B,i=C.indexOf(R),N=C[A?i-1:i+1];if(N){const pitch=Math.abs(R.py-N.py)/Math.max(1,Math.abs(diff(N.d,R.d))/7),k=Math.round((r.py-R.py)/pitch);if(k!==0&&Math.abs(k)<=2&&Math.abs((r.py-R.py)/pitch-k)<.35)cand=addDays(R.d,7*k)}}
   if(!cand)return;
   const okK=r.k!=null&&plIsoWeek(cand)===r.k,okD=r.d===cand;
   r.d=cand;r.e=addDays(cand,7);r.guess=!(okK||okD);r.sure=okK||okD});
  rows.forEach(r=>{if(r.sure&&r.d&&!r.e)r.e=addDays(r.d,7)});
  rows.forEach(r=>{if(r.d)r.k=plIsoWeek(r.d)})}
 let plan=rows.filter(r=>r.d&&(!weekly||r.sure||r.guess));
 /* doppelt erkannte Zeilen (gleiches Datum) zusammenlegen */
 const by={};plan=plan.filter(r=>{const o=by[r.d];if(o&&weekly){o.text+='  '+r.text;o.lines.push(...r.lines);o.guess=o.guess&&r.guess;return false}by[r.d]=r;return true});
 plan.forEach(r=>r.text=r.text.replace(/\s+/g,' '));
 /* Überschrift über der Tabelle */
 const top=plan.length?plan[0].py:Infinity;const heads=rows.filter(r=>r.py<top&&/[A-Za-zÄÖÜäöü]{5,}/.test(r.text));
 const head=heads.length?heads.reduce((b,r)=>(r.text.replace(/[^A-Za-zÄÖÜäöüß]/g,'').length>b.text.replace(/[^A-Za-zÄÖÜäöüß]/g,'').length?r:b)).text.replace(/\s+/g,' ').trim():'';
 const xs0=plan.map(r=>r.x0),xs1=plan.map(r=>r.x1);
 /* Zeilenabstand → realistische Schrifthöhe (manche Erkennungen liefern zu hohe Kästen) */
 const gaps=[];for(let i=1;i<plan.length;i++){const st=weekly?Math.max(1,Math.round(diff(plan[i-1].d,plan[i].d)/7)):1;gaps.push((plan[i].py-plan[i-1].py)/st)}
 const pitch=plMed(gaps.filter(x=>x>0))||hs*1.8;hs=Math.min(hs,pitch*.7);
 return{rows,plan,ta,hs,pitch,Y,weekly,head,X0:xs0.length?Math.max(0,Math.min(...xs0)-hs*1.5):0,X1:xs1.length?Math.min(W||1e9,Math.max(...xs1)+hs):W}}
function plTitleFrom(head){let t=String(head||'').replace(/(?<!\d)(19|20)\d\d(?!\d)/g,'').replace(/\b(KW|Datum|Mitarbeiter|Name)\b/gi,'');
 t=t.replace(/([A-Za-zÄÖÜäöüß]{3,}?)s?-?plan\b/i,'$1').replace(/\s{2,}/g,' ').replace(/^[^0-9A-Za-zÄÖÜäöüß]+|[^0-9A-Za-zÄÖÜäöüß)]+$/g,'').trim();return t.slice(0,60)||'Dienst'}

/* ---------- Markierungen im Foto (Kuli-Kreise, Textmarker) ---------- */
function plBand(A,r){const i=A.plan.indexOf(r),nb=[A.plan[i-1],A.plan[i+1]].filter(Boolean).map(o=>Math.abs(o.py-r.py)/(Math.max(1,o.d&&r.d&&A.weekly?Math.abs(diff(o.d,r.d))/7:1)));const pitch=nb.length?Math.min(...nb,A.pitch*1.4):A.pitch;return{h:Math.max(A.hs*1.1,pitch*.92),pitch}}
function plHue(R,G,B){const mx=Math.max(R,G,B),mn=Math.min(R,G,B);if(mx===mn)return{h:0,s:0,v:mx/255};let h;if(mx===R)h=60*(((G-B)/(mx-mn))%6);else if(mx===G)h=60*((B-R)/(mx-mn)+2);else h=60*((R-G)/(mx-mn)+4);if(h<0)h+=360;return{h,s:(mx-mn)/mx,v:mx/255}}
/* Kuli blau/grün: dunkel und deutlich bläulicher/grünlicher als die schwarze Druckschrift (Grundton bBR/bBG je Foto gemessen) */
const plPen=(R,G,B,bBR,bBG)=>Math.max(R,G,B)<215&&((B-R)-bBR>=18&&(B-G)-bBG>=8||(G-R)>=28&&(G-B)>=12&&Math.max(R,G,B)<190);
const plHL=c=>c.s>=.22&&c.v>=.6&&(c.h>=45&&c.h<=185||c.h>=275&&c.h<=345||c.h>185&&c.h<265&&c.v>.8); /* Textmarker gelb/grün/blau/pink – nicht orange/rot (Druckfarbe) */
function plMarks(cv,A){if(!A.plan.length)return;const W=cv.width,H=cv.height;let D;try{D=cv.getContext('2d').getImageData(0,0,W,H).data}catch(e){return}
 const at=(x,y)=>{const k=(y*W+x)*4;return plHue(D[k],D[k+1],D[k+2])};
 const pitch=A.pitch,top=A.plan[0].py-pitch*.8,bot=A.plan[A.plan.length-1].py+pitch*.8,X0=Math.max(0,A.X0|0),X1=Math.min(W,A.X1|0);
 const inT=(x,y)=>{const yp=y-x*A.ta;return yp>=top&&yp<=bot};
 /* Grundton der dunklen Druckschrift (Farbstich der Kamera) */
 const br=[],bg=[];for(let y=0;y<H;y+=6)for(let x=X0;x<X1;x+=6){if(!inT(x,y))continue;const k=(y*W+x)*4,R=D[k],G=D[k+1],B=D[k+2];if(Math.max(R,G,B)<150){br.push(B-R);bg.push(B-G)}}
 const bBR=plMed(br),bBG=plMed(bg);
 /* 1) Kuli: zusammenhängende Striche (Kreis, Haken, Unterstreichung) finden und der Zeile mit dem nächsten Mittelpunkt zuordnen */
 const g=Math.max(4,Math.round(A.hs*.5)),cells=new Map();
 for(let y=0;y<H;y+=2)for(let x=X0;x<X1;x+=2){const yp=y-x*A.ta;if(yp<top||yp>bot)continue;const k=(y*W+x)*4;if(!plPen(D[k],D[k+1],D[k+2],bBR,bBG))continue;
  const key=((yp/g)|0)*100000+((x/g)|0);const c=cells.get(key);if(c){c.n++;c.sy+=yp}else cells.set(key,{n:1,sy:yp,cy:(yp/g)|0,cx:(x/g)|0})}
 const seen=new Set(),blobs=[];
 for(const[key,c]of cells){if(seen.has(key)||c.n<2)continue;const st=[key];seen.add(key);let n=0,sy=0,y0=1e9,y1=-1e9;
  while(st.length){const k=st.pop(),q=cells.get(k);n+=q.n;sy+=q.sy;y0=Math.min(y0,q.cy);y1=Math.max(y1,q.cy);
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const k2=(q.cy+dy)*100000+(q.cx+dx);if(!seen.has(k2)&&cells.has(k2)){seen.add(k2);st.push(k2)}}}
  const hgt=(y1-y0+1)*g;if(n*4>=A.hs*A.hs*.15&&hgt<=pitch*2.6)blobs.push({y:sy/n,n})}
 A.plan.forEach(r=>{r.pen=0;r.hl=0});
 blobs.forEach(b=>{let best=null,bd=1e9;A.plan.forEach(r=>{const d=Math.abs(r.py-b.y);if(d<bd){bd=d;best=r}});if(best&&bd<pitch*.6)best.pen+=b.n*4/(A.hs*A.hs)});
 /* 2) Textmarker: Fläche in der Zeilenmitte */
 A.plan.forEach(r=>{const{h}=plBand(A,r);let hl=0,n=0;
  for(let x=Math.max(0,A.X0|0);x<Math.min(W,A.X1);x+=3){const yc=r.py+x*A.ta;for(let y=Math.max(0,(yc-h*.3)|0);y<Math.min(H,yc+h*.3);y+=3){n++;if(plHL(at(x,y)))hl++}}
  r.hl=n?hl/n:0});
 const mh=plMed(A.plan.map(r=>r.hl)),xh=Math.max(...A.plan.map(r=>r.hl));
 A.plan.forEach(r=>r.marked=r.pen>=.25||r.hl>=Math.max(.08,mh*5,xh*.4))}

/* ---------- Texterkennung für den Plan ---------- */
function plPrep(cv){/* farbige Druckschrift (orange/rot) dunkel machen: kleinster Farbkanal + Kontrast */
 const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const x=c.getContext('2d');x.drawImage(cv,0,0);const d=x.getImageData(0,0,c.width,c.height),a=d.data;
 for(let i=0;i<a.length;i+=4){const v=Math.min(a[i],a[i+1],a[i+2]);const w=Math.max(0,Math.min(255,(v-60)*255/140));a[i]=a[i+1]=a[i+2]=w}x.putImageData(d,0,0);return c}
async function plRecognize(cv,onProg){
 if(CAP){try{onProg&&onProg('Lese den Plan …',.4);const r=await nativeOCR(cv);if(r&&r.lines&&r.lines.length)return r.lines}catch(e){}}
 const T=await tessWorker(onProg);try{await T.setParameters({tessedit_pageseg_mode:'6'})}catch(e){}
 let r;try{r=await T.recognize(plPrep(cv),{},{text:true,blocks:true})}finally{try{await T.setParameters({tessedit_pageseg_mode:'3'})}catch(e){}}
 if(!S.ocrReady){S.ocrReady=true;save()}
 let lines=r.data.lines;if(!lines||!lines.length){lines=[];(r.data.blocks||[]).forEach(b=>(b.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(l=>lines.push(l))))}
 return lines.map(l=>({text:l.text,x:l.bbox.x0,y:l.bbox.y0,w:l.bbox.x1-l.bbox.x0,h:l.bbox.y1-l.bbox.y0}))}

/* ---------- Ablauf & Prüfansicht ---------- */
const PLIN='<input type="file" id="planInput" accept="image/*" capture="environment" hidden><input type="file" id="planInputG" accept="image/*" hidden>';
const PLBTN=`<div class="row pic-row"><label class="btn pri grow" for="planInput">${ICON.cam} Foto aufnehmen</label><label class="btn grow" for="planInputG">${ICON.gal} Aus Galerie</label></div>`;
function planInfoSheet(){sheet(`<h2>Plan scannen</h2>
 <p class="muted">Fotografier einen Dienst-, Schicht- oder Bereitschaftsplan. Kleinkram sucht deine Zeilen heraus und trägt sie als Termine oder Aufgaben ein.</p>
 <label class="f">Dein Name im Plan (oder Kürzel)<input class="inp" id="plN0" value="${esc(S.set.planName||'')}" placeholder="z. B. Hatipoglu" autocapitalize="words"></label>
 <p class="small muted">Deine Zeilen werden über den Namen gefunden. Zusätzlich zählen markierte Zeilen: Kuli-Kreis oder Textmarker (gelb, grün, blau, pink). Mehrere Namen mit Komma trennen.</p>
 ${PLBTN}${PLIN}
 <p class="small muted">Tipp: ganze Tabelle, gerade von oben, gutes Licht. Das Foto bleibt auf deinem Handy.</p>`,s=>{const n=s.querySelector('#plN0');n.onchange=()=>{S.set.planName=n.value.trim();save()}})}
async function planScan(file){const nm=document.getElementById('plN0');if(nm){S.set.planName=nm.value.trim();save()}
 let im;try{im=await loadImg(file)}catch(e){toast('Das Bild ließ sich nicht öffnen.');return}
 const cv=canvasOf(im,2400);let stop=false;
 sheet(`<h2>Lese den Plan …</h2><p class="muted" id="oM">Starte Texterkennung …</p><span class="bar" style="width:100%"><i id="oB" style="width:3%"></i></span><p class="small muted">${CAP||S.ocrReady?'Dauert ein paar Sekunden.':'Beim ersten Mal wird die Texterkennung einmalig geladen (etwa 5 MB).'}</p><button class="btn ghost" id="oX">Abbrechen</button>`,s=>s.querySelector('#oX').onclick=()=>{stop=true;closeSheet()});
 let lines;try{lines=await plRecognize(cv,(msg,pr)=>{const m=$('#oM'),b=$('#oB');if(m)m.textContent=msg;if(b)b.style.width=Math.max(3,Math.round(pr*100))+'%'})}catch(e){if(stop)return;closeSheet();toast(CAP?'Texterkennung fehlgeschlagen.':'Texterkennung konnte nicht geladen werden (beim ersten Mal Internet nötig).');return}
 if(stop)return;
 const A=plAnalyse(lines,cv.width,cv.height);plMarks(cv,A);
 if(!A.plan.length){sheet(`<h2>Keine Termine gefunden</h2><p class="muted">Auf dem Foto war keine Tabelle mit Datum zu erkennen.</p><p class="small muted">Tipp: näher ran, gerade von oben, ohne Schatten. Die Spalte mit dem Datum muss gut lesbar sein.</p>${PLBTN}${PLIN}`);return}
 const titles=S.set.planTitles||{};
 PL={cv,A,img:cv.toDataURL('image/jpeg',.8),title:titles[A.head]||plTitleFrom(A.head),showAll:false};
 plSelect();planReview()}
function plSelect(){const A=PL.A,names=plNames(),useM=S.set.planMarks!==false;
 A.plan.forEach(r=>{r.byName=names.length?plNameHit(r.text,names):false;r.on=r.byName||(useM&&r.marked)})}
function plExists(r,title,kind){return kind==='aufgabe'?S.tasks.some(t=>t.src==='plan'&&t.due===r.d&&t.planTitle===title):S.events.some(e=>e.date===r.d&&e.title===title)}
function plPoly(r){const A=PL.A,{h}=plBand(A,r),x0=A.X0,x1=A.X1,y0=r.py+x0*A.ta,y1=r.py+x1*A.ta,k=h/2;return`${x0},${y0-k} ${x1},${y1-k} ${x1},${y1+k} ${x0},${y0+k}`}
function planReview(){const A=PL.A,W=PL.cv.width,H=PL.cv.height,kind=S.set.planKind||'termin',cat=S.set.planCat||'geschaeft';
 const nOn=A.plan.filter(r=>r.on).length,nMark=A.plan.filter(r=>r.marked).length,nName=A.plan.filter(r=>r.byName).length;
 sheet(`<h2>Plan prüfen</h2>
 <p class="small muted">${A.plan.length} Zeilen mit Datum erkannt${A.weekly?' (Wochenplan)':''}. <b>Grün</b> wird übernommen. Tipp auf eine Zeile im Foto schaltet um.</p>
 <div class="pl-photo"><div class="pl-in"><img src="${PL.img}" alt="Foto des Plans"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="plSvg">${A.plan.map((r,i)=>`<polygon data-i="${i}" points="${plPoly(r)}" class="${r.on?'on':''}${r.guess?' guess':''}"/>`).join('')}</svg></div></div>
 <label class="f">Dein Name im Plan<input class="inp" id="plN" value="${esc(S.set.planName||'')}" placeholder="Name oder Kürzel"></label>
 <label class="switch"><span>Markierte Zeilen übernehmen<br><span class="small muted">${nMark?`${nMark} markierte Zeile${nMark>1?'n':''} gefunden`:'Keine Markierung gefunden'}</span></span><input type="checkbox" id="plM" ${S.set.planMarks!==false?'checked':''}></label>
 <label class="f">Titel<input class="inp" id="plT" value="${esc(PL.title)}"></label>
 <div class="grid2"><label class="f">Eintragen als<select class="inp" id="plK"><option value="termin" ${kind==='termin'?'selected':''}>Termin</option><option value="aufgabe" ${kind==='aufgabe'?'selected':''}>Aufgabe</option></select></label>${catSelect('plC',cat)}</div>
 <div class="grid2"><label class="f">Uhrzeit (optional)<input class="inp" type="time" id="plH" value="${esc(S.set.planTime||'')}"></label><label class="f">Erinnerung<select class="inp" id="plR"><option value="">keine extra</option><option value="vortag" ${S.set.planRemind==='vortag'?'selected':''}>am Vortag, 18 Uhr</option></select></label></div>
 <div id="plList"></div>
 <button class="btn pri block" id="plGo"></button>
 <p class="small muted">Nichts wird gespeichert, bevor du tippst. ${nName?`${nName}× „${esc(plNames().join(', '))}“ gefunden.`:plNames().length?'Dein Name wurde nicht gefunden – prüf die Schreibweise oder markiere die Zeilen.':''}</p>`,s=>{
  const svg=s.querySelector('#plSvg');svg.onclick=e=>{const p=e.target.closest('polygon');if(!p)return;const r=A.plan[+p.dataset.i];r.on=!r.on;p.classList.toggle('on',r.on);plList()};
  s.querySelector('#plN').onchange=e=>{S.set.planName=e.target.value.trim();save();plSelect();planReview()};
  s.querySelector('#plM').onchange=e=>{S.set.planMarks=e.target.checked;save();plSelect();planReview()};
  ['plT','plK'].forEach(id=>s.querySelector('#'+id).addEventListener('change',()=>{PL.title=val('plT');plList()}));
  s.querySelector('#plGo').onclick=plSave;plList()})}
function plList(){const A=PL.A,box=$('#plList');if(!box)return;const title=val('plT')||PL.title,kind=val('plK')||'termin';
 const rows=A.plan.filter(r=>r.on||PL.showAll);
 box.innerHTML=(rows.length?rows.map(r=>{const i=A.plan.indexOf(r),dup=plExists(r,title,kind);return`<div class="pl-row${r.on?' on':''}"><button class="pl-tg" data-pl="${i}" aria-label="${r.on?'Abwählen':'Auswählen'}">${r.on?'✓':''}</button><div class="grow">
  <div class="row" style="gap:6px;flex-wrap:wrap">${A.weekly&&r.k?`<span class="chip">KW ${r.k}</span>`:''}${r.byName?'<span class="chip ok">Name</span>':''}${r.marked?'<span class="chip stamp">markiert</span>':''}${r.guess?'<span class="chip warn">Datum geschätzt – bitte prüfen</span>':''}${dup?'<span class="chip">schon eingetragen</span>':''}</div>
  <div class="grid2" style="margin-top:6px"><label class="f">Von<input class="inp" type="date" data-pd="${i}" value="${r.d}"></label><label class="f">Bis<input class="inp" type="date" data-pe="${i}" value="${r.e||''}"></label></div>
  <p class="small muted pl-src">${esc(r.text.slice(0,90))}</p></div></div>`}).join(''):'<p class="muted">Keine Zeile ausgewählt. Tipp im Foto auf deine Zeilen oder trag oben deinen Namen ein.</p>')
  +`<button class="btn ghost sm" id="plAll">${PL.showAll?'Nur ausgewählte zeigen':`Alle ${A.plan.length} Zeilen zeigen`}</button>`;
 box.querySelectorAll('[data-pl]').forEach(b=>b.onclick=()=>{const r=A.plan[+b.dataset.pl];r.on=!r.on;const p=document.querySelector(`#plSvg polygon[data-i="${b.dataset.pl}"]`);p&&p.classList.toggle('on',r.on);plList()});
 box.querySelectorAll('[data-pd]').forEach(x=>x.onchange=()=>{const r=A.plan[+x.dataset.pd];if(x.value){const sh=r.e?diff(r.d,r.e):0;r.d=x.value;if(r.e)r.e=addDays(r.d,sh);r.guess=false;plList()}});
 box.querySelectorAll('[data-pe]').forEach(x=>x.onchange=()=>{A.plan[+x.dataset.pe].e=x.value&&x.value>=A.plan[+x.dataset.pe].d?x.value:null});
 box.querySelector('#plAll').onclick=()=>{PL.showAll=!PL.showAll;plList()};
 const sel=A.plan.filter(r=>r.on),nNew=sel.filter(r=>!plExists(r,title,kind)).length,g=$('#plGo');
 if(g){g.disabled=!nNew;g.textContent=nNew?`${nNew} ${kind==='aufgabe'?(nNew>1?'Aufgaben':'Aufgabe'):(nNew>1?'Termine':'Termin')} eintragen`:sel.length?'Alles schon eingetragen':'Nichts ausgewählt'}}
function plSave(){const A=PL.A,title=val('plT')||PL.title,kind=val('plK')||'termin',cat=val('plC')||'geschaeft',time=val('plH')||null,rem=val('plR');
 const sel=A.plan.filter(r=>r.on&&r.d&&!plExists(r,title,kind));if(!sel.length)return;
 sel.forEach(r=>{const t=time||null;
  if(kind==='aufgabe')S.tasks.push({id:uid(),title:r.e?`${title} (${fmtDate(r.d)} – ${fmtDate(r.e)})`:title,cat,due:r.d,created:today(),postponed:0,started:false,done:null,steps:[],cost:null,bundle:'',buddy:null,src:'plan',planTitle:title});
  else S.events.push({id:uid(),title,date:r.d,end:r.e&&r.e!==r.d?r.e:null,time:t,cat,repeat:'none',kind:'termin',yearKnown:false,src:'plan',...(rem==='vortag'?{remindPrev:'18:00'}:{})})});
 S.set.planKind=kind;S.set.planCat=cat;S.set.planTime=time||'';S.set.planRemind=rem;S.set.planTitles=Object.assign(S.set.planTitles||{},A.head?{[A.head]:title}:{});
 pts(5,'Plan übernommen');save();const first=sel.map(r=>r.d).sort()[0];UI.sel=first;UI.month=first.slice(0,7);PL=null;
 sheet(`<h2>Eingetragen</h2><p class="muted">${sel.length} ${kind==='aufgabe'?'Aufgaben':'Termine'} „${esc(title)}“, ab ${fmtDate(first)}.</p>${kind==='termin'?`<p class="small muted">Auch im Handy-Kalender (und damit auf der Uhr) haben?</p><button class="btn pri block" data-act="ics">In Handy-Kalender übertragen</button>`:''}<button class="btn block" data-act="close">Fertig</button>`);
 go(kind==='aufgabe'?'aufgaben':'kalender')}

document.addEventListener('change',e=>{if(e.target&&(e.target.id==='planInput'||e.target.id==='planInputG')){const f=e.target.files[0];e.target.value='';if(f)planScan(f)}});
