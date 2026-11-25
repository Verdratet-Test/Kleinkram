/* Kleinkram · PDF lesen, ausfüllen, unterschreiben, Seiten bearbeiten
   Alles läuft im Gerät: pdf.js (Anzeigen) und pdf-lib (Bearbeiten) liegen in www/lib.
   Das Original bleibt immer erhalten – gespeichert wird als neue Datei, außer man ersetzt es ausdrücklich. */

const pdfList=()=>S.pdfs=S.pdfs||[];
const pdfSigs=()=>S.pdfSigs=S.pdfSigs||[];
const PDF_MAX=40e6;

/* ---------- Bibliotheken bei Bedarf laden ---------- */
let _pdfjs=null,_pdflibP=null;
async function pdfJs(){if(_pdfjs)return _pdfjs;const base=new URL('lib/',location.href).href;
 const m=await import(base+'pdf.min.js');m.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.js';return _pdfjs=m}
function pdfLib(){if(window.PDFLib)return Promise.resolve(window.PDFLib);if(_pdflibP)return _pdflibP;
 _pdflibP=new Promise((res,rej)=>{const s=document.createElement('script');s.src='lib/pdf-lib.min.js';s.onload=()=>window.PDFLib?res(window.PDFLib):rej(new Error('pdf-lib fehlt'));s.onerror=()=>{_pdflibP=null;rej(new Error('pdf-lib fehlt'))};document.head.appendChild(s)});return _pdflibP}

/* ---------- Bytes und Speicher ---------- */
const pdfDataUrl=u=>'data:application/pdf;base64,'+u8b64(u);
function pdfBytes(src){if(!src)return null;if(src instanceof Uint8Array)return src;const b=atob(String(src).replace(/^data:[^,]*,/,''));const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
async function pdfLoadBytes(id){return pdfBytes(await IDB.get('pdf-'+id))}
const pdfCleanName=n=>(String(n||'Dokument').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Dokument');
const pdfFileName=n=>pdfCleanName(n)+'.pdf';
function pdfSize(b){return b>1e6?(b/1e6).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1e3))+' KB'}

/* legt eine PDF in Kleinkram ab (prüft vorher, ob sie lesbar ist) – gibt den Eintrag zurück */
async function pdfStore(bytes,name,src,extra){
 if(!bytes||bytes.length<8||String.fromCharCode(...bytes.subarray(0,1024)).indexOf('%PDF')<0){toast('Das ist keine PDF-Datei.');return null}
 if(bytes.length>PDF_MAX){toast('Die PDF ist größer als 40 MB.');return null}
 let pages=0,locked=false;
 try{const J=await pdfJs();const d=await J.getDocument(pdfOpts(bytes.slice())).promise;pages=d.numPages;d.destroy()}catch(e){if(e&&e.name==='PasswordException')locked=true;else{toast('Die PDF ist beschädigt oder lässt sich nicht öffnen.');return null}}
 const it=Object.assign({id:uid(),name:pdfCleanName(name),created:new Date().toISOString(),updated:new Date().toISOString(),pages,size:bytes.length,src:src||'datei',locked},extra||{});
 const ok=await IDB.putOk('pdf-'+it.id,pdfDataUrl(bytes));
 if(!ok){toast('Speichern ging nicht – ist der Speicher voll?');return null}
 pdfList().push(it);save();return it}
function pdfOpts(bytes,pw){const base=new URL('lib/pdfjs/',location.href).href;return{data:bytes,password:pw,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',isEvalSupported:false,enableXfa:false}}

/* ---------- Ablage → PDF ---------- */
function vPdf(){const L=pdfList().slice().sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
 let h=tip('pdf','PDF öffnen, Formular ausfüllen, mit dem Finger unterschreiben. Das Original bleibt immer erhalten. <b>Hinweis:</b> Wo das Gesetz Schriftform verlangt (z. B. Kündigung von Arbeits- oder Mietvertrag), braucht es weiter Papier mit echter Unterschrift.');
 h+=`<div class="scan-row"><label class="scan-btn pri" for="pdfIn">${ICON.doc}<span>PDF öffnen</span><small>ausfüllen, unterschreiben</small></label><label class="scan-btn" for="pdfScan">${ICON.cam}<span>Scannen → PDF</span><small>Blätter zu einer PDF</small></label></div>
 <label class="scan-gal" for="pdfImg">${ICON.gal} Fotos aus der Galerie zu einer PDF</label>
 <input type="file" id="pdfIn" accept="application/pdf,.pdf" multiple hidden><input type="file" id="pdfScan" accept="image/*" capture="environment" hidden><input type="file" id="pdfScanG" accept="image/*" hidden><input type="file" id="pdfImg" accept="image/*" multiple hidden>
 <button class="btn block ghost" data-act="pdfSigs" style="margin-top:8px">✍️ Meine Unterschriften${pdfSigs().length?` (${pdfSigs().length})`:''}</button>`;
 h+=`<div class="card" style="margin-top:14px;padding:4px 0">${L.map(p=>`<div class="li" data-act="pdfItem" data-id="${p.id}" style="cursor:pointer"><span class="thumb pdf-th" aria-hidden="true">PDF</span><div class="grow"><p>${esc(p.name)}</p><p class="small muted">${p.pages?`${p.pages} Seite${p.pages===1?'':'n'} · `:''}${pdfSize(p.size||0)} · ${fmtDate((p.updated||'').slice(0,10))}</p></div>${p.signed?'<span class="chip ok">unterschrieben</span>':''}${p.locked?'<span class="chip">geschützt</span>':''}</div>`).join('')||'<div class="empty">Noch keine PDFs. Öffne eine PDF, scanne Blätter oder teile eine PDF aus einer anderen App an Kleinkram.</div>'}</div>`;
 return h}

function pdfOpen(){UI.abl='pdf';go('ablage')}

/* Datei-Auswahl in der Ablage (Ereignis-Delegation, weil die Ansicht neu gezeichnet wird) */
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.id)return;
 if(t.id==='pdfIn'){const fs=[...t.files];t.value='';if(!fs.length)return;let last=null;
  for(const f of fs){if(f.size>PDF_MAX){toast(`${f.name}: größer als 40 MB.`);continue}const it=await pdfStore(new Uint8Array(await f.arrayBuffer()),f.name,'datei');if(it)last=it}
  render();if(last&&fs.length===1)pdfEdit(last.id);else if(last)toast(`${fs.length} PDFs übernommen.`);return}
 if(t.id==='pdfImg'){const fs=[...t.files];t.value='';if(fs.length)pdfFromImages(fs);return}});
/* Kamera/Dokumentenscanner: bis zu 20 Seiten in einem Rutsch */
SCAN_IDS.pdfScan=20;PIC_FN.pdfScan=f=>pdfFromImages(Array.isArray(f)?f:[f]);
['pdfScan','pdfScanG'].forEach(k=>document.addEventListener('change',e=>{if(e.target&&e.target.id===k){const f=e.target.files[0];e.target.value='';if(f)pdfFromImages([f])}}));

/* Fotos → eine PDF (DIN A4, Bild eingepasst) */
async function pdfFromImages(files,targetId){if(!files.length)return;toast(files.length>1?`Erstelle PDF aus ${files.length} Bildern …`:'Erstelle PDF …');
 try{const P=await pdfLib();const doc=await P.PDFDocument.create();
  for(const f of files){let im;try{im=typeof prepDoc==='function'&&!f._scan?await prepDoc(f):await loadImg(f)}catch(e){continue}
   const c=canvasOf(im,2400);const jpg=pdfBytes(c.toDataURL('image/jpeg',.85));const img=await doc.embedJpg(jpg);
   const land=c.width>c.height;const W=land?841.89:595.28,H=land?595.28:841.89,m=18;const s=Math.min((W-2*m)/c.width,(H-2*m)/c.height);
   const pg=doc.addPage([W,H]);pg.drawImage(img,{x:(W-c.width*s)/2,y:(H-c.height*s)/2,width:c.width*s,height:c.height*s})}
  if(!doc.getPageCount()){toast('Die Bilder ließen sich nicht lesen.');return}
  const bytes=await doc.save();
  if(targetId)return bytes;
  const it=await pdfStore(bytes,`Scan ${fmtDate(today())}`,'scan');if(!it)return;render();pdfItemSheet(it.id)}catch(e){toast('Die PDF ließ sich nicht erstellen.')}}

/* ---------- Aktionen zu einer PDF ---------- */
function pdfItemSheet(id){const p=pdfList().find(x=>x.id===id);if(!p)return;
 sheet(`<h2>${esc(p.name)}</h2><p class="small muted">${p.pages?`${p.pages} Seite${p.pages===1?'':'n'} · `:''}${pdfSize(p.size||0)} · ${fmtDate((p.created||'').slice(0,10))}${p.signed?' · unterschrieben':''}</p>
 ${p.locked?'<p class="small">Diese PDF ist mit einem Passwort geschützt. Ansehen geht nach Eingabe des Passworts, bearbeiten nicht.</p>':''}
 <button class="btn pri block" id="piE">${p.locked?'Ansehen':'Öffnen · ausfüllen · unterschreiben'}</button>
 <div class="grid2" style="margin-top:8px"><button class="btn" id="piS">Teilen / Drucken</button><button class="btn" id="piD">Speichern</button></div>
 <div class="grid2" style="margin-top:8px"><button class="btn ghost" id="piR">Umbenennen</button><button class="btn ghost danger" id="piX">Löschen</button></div>`,s=>{
  s.querySelector('#piE').onclick=()=>{closeSheet();pdfEdit(id)};
  s.querySelector('#piS').onclick=async()=>{const b=await pdfLoadBytes(id);if(b)shareBin(pdfFileName(p.name),b,'application/pdf');else toast('Datei nicht gefunden.')};
  s.querySelector('#piD').onclick=async()=>{const b=await pdfLoadBytes(id);if(b)saveBin(pdfFileName(p.name),b,'application/pdf');else toast('Datei nicht gefunden.')};
  s.querySelector('#piR').onclick=()=>pdfRename(id);
  s.querySelector('#piX').onclick=()=>confirmSheet('PDF löschen?',`„${p.name}“ wird aus Kleinkram gelöscht. Dateien, die du schon geteilt oder gespeichert hast, bleiben.`,'Löschen',()=>{S.pdfs=pdfList().filter(x=>x.id!==id);IDB.del('pdf-'+id);save();render();toast('Gelöscht.')},true,()=>pdfItemSheet(id))})}
function pdfRename(id){const p=pdfList().find(x=>x.id===id);if(!p)return;
 sheet(`<h2>Umbenennen</h2><label class="f">Name<input class="inp" id="prN" value="${esc(p.name)}" autofocus></label><button class="btn pri block" id="prO">Übernehmen</button>`,s=>{s.querySelector('#prO').onclick=()=>{const v=pdfCleanName(s.querySelector('#prN').value);p.name=v;save();render();pdfItemSheet(id)}})}

/* ---------- Unterschriften ---------- */
function pdfSigsSheet(after){const L=pdfSigs();
 sheet(`<h2>Meine Unterschriften</h2><p class="small muted">Einmal mit dem Finger zeichnen, dann in jeder PDF antippen und platzieren. Bleibt nur auf diesem Gerät.</p>
 <div class="stack" id="psL">${L.map(x=>`<div class="row between sig-row"><img class="sig-pv" data-sig="${x.id}" alt="${esc(x.label)}"><span class="small grow">${esc(x.label)}</span><button class="btn sm ghost danger" data-del="${x.id}">Löschen</button></div>`).join('')||'<p class="muted">Noch keine gespeichert.</p>'}</div>
 <div class="grid2" style="margin-top:10px"><button class="btn pri" id="psU">Unterschrift zeichnen</button><button class="btn" id="psK">Kürzel zeichnen</button></div>`,async s=>{
  for(const im of s.querySelectorAll('[data-sig]'))im.src=await IDB.get('pdfsig-'+im.dataset.sig)||'';
  s.querySelector('#psU').onclick=()=>pdfSigPad('Unterschrift',()=>pdfSigsSheet(after));
  s.querySelector('#psK').onclick=()=>pdfSigPad('Kürzel',()=>pdfSigsSheet(after));
  s.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const x=L.find(y=>y.id===b.dataset.del);confirmSheet('Unterschrift löschen?',`„${x.label}“ wird von diesem Gerät gelöscht. Schon unterschriebene PDFs bleiben unverändert.`,'Löschen',()=>{S.pdfSigs=pdfSigs().filter(y=>y.id!==x.id);IDB.del('pdfsig-'+x.id);save();pdfSigsSheet(after)},true,()=>pdfSigsSheet(after))})})}

/* Zeichenfeld: glatte Linie, Farbe schwarz oder blau, Ränder werden abgeschnitten */
function pdfSigPad(label,done){let color='#111111';
 sheet(`<h2>${esc(label)} zeichnen</h2><p class="small muted">Mit dem Finger auf der Linie unterschreiben. Tipp: Handy quer halten gibt mehr Platz.</p>
 <div class="sig-pad"><canvas id="spC"></canvas><div class="sig-line"></div></div>
 <div class="row" style="gap:8px;margin-top:8px"><button class="chip-btn on" data-col="#111111">Schwarz</button><button class="chip-btn" data-col="#1a3a8f">Blau</button><span class="grow"></span><button class="btn sm ghost" id="spX">Neu</button></div>
 <label class="f">Name dafür<input class="inp" id="spN" value="${esc(label)}${pdfSigs().some(x=>x.label===label)?' '+(pdfSigs().filter(x=>x.label.startsWith(label)).length+1):''}"></label>
 <button class="btn pri block" id="spO">Speichern</button>`,s=>{
  const cv=s.querySelector('#spC'),box=cv.parentElement,dpr=Math.min(3,window.devicePixelRatio||1);
  const W=box.clientWidth||340,H=Math.round(Math.min(260,Math.max(170,W*.45)));cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';
  const g=cv.getContext('2d');g.scale(dpr,dpr);g.lineCap='round';g.lineJoin='round';let strokes=[],cur=null;
  const pos=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top,p:e.pressure&&e.pointerType==='pen'?e.pressure:.5}};
  const draw=()=>{g.clearRect(0,0,W,H);g.strokeStyle=color;g.fillStyle=color;for(const st of strokes){if(st.length===1){g.beginPath();g.arc(st[0].x,st[0].y,1.6,0,7);g.fill();continue}
   g.beginPath();g.moveTo(st[0].x,st[0].y);for(let i=1;i<st.length-1;i++){const mx=(st[i].x+st[i+1].x)/2,my=(st[i].y+st[i+1].y)/2;g.lineWidth=1.8+st[i].p*2.2;g.quadraticCurveTo(st[i].x,st[i].y,mx,my)}const l=st[st.length-1];g.lineTo(l.x,l.y);g.stroke()}};
  cv.onpointerdown=e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);cur=[pos(e)];strokes.push(cur);draw()};
  cv.onpointermove=e=>{if(!cur)return;e.preventDefault();const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const x of ev)cur.push(pos(x));draw()};
  cv.onpointerup=cv.onpointercancel=()=>{cur=null};
  s.querySelector('#spX').onclick=()=>{strokes=[];draw()};
  s.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{color=b.dataset.col;s.querySelectorAll('[data-col]').forEach(x=>x.classList.toggle('on',x===b));draw()});
  s.querySelector('#spO').onclick=async()=>{if(!strokes.some(st=>st.length>1)){toast('Bitte erst unterschreiben.');return}
   const png=pdfTrim(cv);if(!png){toast('Bitte erst unterschreiben.');return}
   const it={id:uid(),label:(s.querySelector('#spN').value||label).trim().slice(0,30),w:png.w,h:png.h};
   if(!(await IDB.putOk('pdfsig-'+it.id,png.url))){toast('Speichern ging nicht.');return}
   pdfSigs().push(it);save();toast('Gespeichert.');done&&done(it)}})}
/* schneidet den leeren Rand ab (durchsichtiges PNG) */
function pdfTrim(cv){const g=cv.getContext('2d'),{width:w,height:h}=cv,d=g.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 if(x1<0)return null;const p=Math.round(6*(window.devicePixelRatio||1));x0=Math.max(0,x0-p);y0=Math.max(0,y0-p);x1=Math.min(w-1,x1+p);y1=Math.min(h-1,y1+p);
 const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(cv,x0,y0,o.width,o.height,0,0,o.width,o.height);return{url:o.toDataURL('image/png'),w:o.width,h:o.height}}

/* Haken und Kreuz als kleines Bild (sieht in Vorschau und PDF gleich aus) */
function pdfMarkPng(kind){const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.strokeStyle='#111';g.lineWidth=11;g.lineCap='round';g.lineJoin='round';g.beginPath();
 if(kind==='check'){g.moveTo(14,52);g.lineTo(38,78);g.lineTo(84,18)}else{g.moveTo(18,18);g.lineTo(78,78);g.moveTo(78,18);g.lineTo(18,78)}g.stroke();return c.toDataURL('image/png')}

/* verschlüsselte PDFs lassen sich ansehen, aber nicht sauber verändern */
function pdfEncrypted(u){const d=new TextDecoder('latin1');const step=1<<20;for(let i=0;i<u.length;i+=step-16){if(d.decode(u.subarray(i,i+step)).indexOf('/Encrypt')>=0)return true}return false}

/* ---------- Editor ---------- */
let PD=null;
const pdfDateText=()=>{const o=(me&&me().ort||'').replace(/^\s*\d{4,5}\s+/,'').trim();return(o?o+', ':'')+fmtDate(today())};

async function pdfEdit(id){const meta=pdfList().find(x=>x.id===id);if(!meta)return;closeSheet();if(PD)pdfClose(true);const bytes=await pdfLoadBytes(id);if(!bytes){toast('Datei nicht gefunden.');return}
 PD={id,meta,bytes,doc:null,pages:[],items:[],form:{},formInit:{},fields:[],tool:null,sel:null,zoom:1,dirty:false,hist:[],pw:null,readOnly:!!meta.locked||pdfEncrypted(bytes)};
 const el=document.createElement('div');el.id='pdfEd';el.className='pd-ed';el.innerHTML=`<div class="pd-top"><button class="iconbtn" data-f="close" id="pdX" aria-label="Schließen">${ICON.x}</button><b class="grow pd-name">${esc(meta.name)}</b>
  <button class="iconbtn" id="pdQ" aria-label="Suchen">🔍</button><button class="iconbtn" id="pdZo" aria-label="Kleiner">−</button><button class="iconbtn" id="pdZi" aria-label="Größer">+</button><button class="btn sm pri" id="pdOk">Fertig</button></div>
  <div class="pd-hint" id="pdHint" hidden></div><div class="pd-scroll" id="pdS"><div class="pd-pages" id="pdP"><p class="muted" style="text-align:center;margin-top:40px">Öffne die PDF …</p></div></div>
  <div class="pd-bar" id="pdBar"><button data-t="sig">✍️<span>Unterschrift</span></button><button data-t="text">T<span>Text</span></button><button data-t="date">📅<span>Datum</span></button><button data-t="check">✓<span>Haken</span></button><button data-t="cross">✗<span>Kreuz</span></button><button data-t="pages">📄<span>Seiten</span></button></div>`;
 document.body.appendChild(el);document.body.classList.add('pd-open');
 el.querySelector('#pdX').onclick=()=>pdfClose();el.querySelector('#pdOk').onclick=()=>pdfFinish();
 el.querySelector('#pdZi').onclick=()=>pdfZoom(1.25);el.querySelector('#pdQ').onclick=()=>pdfFindSheet();el.querySelector('#pdZo').onclick=()=>pdfZoom(.8);
 el.querySelector('#pdBar').onclick=e=>{const b=e.target.closest('[data-t]');if(b)pdfTool(b.dataset.t)};
 if(PD.readOnly&&!meta.locked)setTimeout(()=>pdfHint('Diese PDF ist geschützt (verschlüsselt). Ansehen und teilen geht, ändern nicht.',6000),400);
 if(PD.readOnly)el.querySelector('#pdBar').querySelectorAll('[data-t]').forEach(b=>b.disabled=true);
 await pdfLoadDoc()}

async function pdfLoadDoc(){const J=await pdfJs();if(PD.doc){try{PD.doc.destroy()}catch(e){}}
 const open=pw=>J.getDocument(pdfOpts(PD.bytes.slice(),pw)).promise;
 try{PD.doc=await open(PD.pw||undefined)}catch(e){if(e&&e.name==='PasswordException'){const pw=await pdfAskPw();if(pw==null){pdfClose(true);return}PD.pw=pw;return pdfLoadDoc()}toast('Die PDF lässt sich nicht öffnen.');pdfClose(true);return}
 PD.pages=[];PD.fields=[];const host=document.getElementById('pdP');if(!host)return;host.innerHTML='';
 for(let i=1;i<=PD.doc.numPages;i++){const pg=await PD.doc.getPage(i);const vp=pg.getViewport({scale:1});const w=document.createElement('div');w.className='pd-pg';w.dataset.p=i-1;
  w.innerHTML=`<canvas></canvas><div class="pd-ov"></div><span class="pd-no">${i} / ${PD.doc.numPages}</span>`;host.appendChild(w);PD.pages.push({pg,vp,el:w,done:false});
  if(!PD.readOnly){try{const an=await pg.getAnnotations({intent:'display'});an.filter(a=>a.annotationType===20&&a.fieldName&&!a.pushButton&&!a.hidden).forEach(a=>PD.fields.push(Object.assign({p:i-1},pdfFieldOf(a))))}catch(e){}}}
 PD.fields.forEach(f=>{if(!(f.name in PD.formInit)){PD.formInit[f.name]=f.value;if(!(f.name in PD.form))PD.form[f.name]=f.value}});
 if(PD.fields.length)pdfHint(`Formular erkannt: ${new Set(PD.fields.map(f=>f.name)).size} Felder – einfach hineintippen.`,4000);
 pdfLayout();host.onclick=e=>pdfPageTap(e)}
function pdfFieldOf(a){const t=a.fieldType;const f={name:a.fieldName,rect:a.rect,ro:!!a.readOnly,multi:!!a.multiLine,max:a.maxLen||0};
 if(t==='Tx'){f.kind='text';f.value=typeof a.fieldValue==='string'?a.fieldValue:''}
 else if(t==='Btn'&&a.checkBox){f.kind='check';f.on=a.exportValue||'Yes';f.value=!!a.fieldValue&&a.fieldValue!=='Off'}
 else if(t==='Btn'&&a.radioButton){f.kind='radio';f.on=a.buttonValue;f.value=a.fieldValue&&a.fieldValue!=='Off'?a.fieldValue:''}
 else if(t==='Ch'){f.kind='choice';f.opts=(a.options||[]).map(o=>({v:o.exportValue,l:o.displayValue}));f.value=Array.isArray(a.fieldValue)?(a.fieldValue[0]||''):(a.fieldValue||'')}
 else f.kind='skip';return f}
function pdfAskPw(){return new Promise(res=>{let done=false;sheet(`<h2>Passwort nötig</h2><p class="small muted">Diese PDF ist geschützt. Das Passwort bleibt nur für dieses Öffnen im Speicher.</p><input class="inp" id="pwI" type="password" autofocus><button class="btn pri block" id="pwO">Öffnen</button>`,s=>{s.querySelector('#pwO').onclick=()=>{done=true;const v=s.querySelector('#pwI').value;closeSheet();res(v)};
  const mo=new MutationObserver(()=>{if(!document.getElementById('pwI')&&!done){mo.disconnect();res(null)}});mo.observe(document.getElementById('sheetHost'),{childList:true})})})}

/* Seitengröße an Bildschirm und Zoom anpassen, Seiten erst zeichnen, wenn sie sichtbar werden */
function pdfLayout(){const sc=document.getElementById('pdS');if(!sc||!PD)return;const avail=Math.min(sc.clientWidth-24,1000);
 PD.io&&PD.io.disconnect();PD.io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting)pdfRender(+en.target.dataset.p)}),{root:sc,rootMargin:'600px 0px'});
 PD.pages.forEach((P,i)=>{P.scale=avail/P.vp.width*PD.zoom;const w=P.vp.width*P.scale,h=P.vp.height*P.scale;
  P.el.style.width=w+'px';P.el.style.height=h+'px';P.done=false;PD.io.observe(P.el);pdfOverlay(i)})}
async function pdfRender(i){const P=PD&&PD.pages[i];if(!P||P.done)return;P.done=true;const dpr=Math.min(2.5,window.devicePixelRatio||1);
 const vp=P.pg.getViewport({scale:P.scale*dpr});const c=P.el.querySelector('canvas');c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);
 c.style.width=P.vp.width*P.scale+'px';c.style.height=P.vp.height*P.scale+'px';
 try{P.task&&P.task.cancel();P.task=P.pg.render({canvasContext:c.getContext('2d'),viewport:vp,annotationMode:_pdfjs.AnnotationMode[PD.fields.length?'ENABLE_FORMS':'ENABLE']});await P.task.promise}catch(e){}}
function pdfZoom(f){if(!PD)return;const sc=document.getElementById('pdS');const rel=sc.scrollTop/(sc.scrollHeight||1);PD.zoom=Math.max(.6,Math.min(3,PD.zoom*f));pdfLayout();sc.scrollTop=rel*sc.scrollHeight}

/* Elemente (Unterschrift, Text, Haken) und Formularfelder über der Seite */
function pdfOverlay(i){const P=PD.pages[i];const ov=P.el.querySelector('.pd-ov');const s=P.scale;let h='';
 for(const f of PD.fields.filter(f=>f.p===i&&f.kind!=='skip')){const r=P.vp.convertToViewportRectangle(f.rect);const x=Math.min(r[0],r[2])*s,y=Math.min(r[1],r[3])*s,w=Math.abs(r[2]-r[0])*s,hh=Math.abs(r[3]-r[1])*s;
  const st=`left:${x}px;top:${y}px;width:${w}px;height:${hh}px`;const v=PD.form[f.name];const nm=esc(f.name);
  if(f.kind==='text')h+=f.multi?`<textarea class="pd-f" style="${st};font-size:${Math.max(9,Math.min(14,hh/3))}px" data-fn="${nm}" ${f.ro?'disabled':''}>${esc(v||'')}</textarea>`:`<input class="pd-f" style="${st};font-size:${Math.max(9,Math.min(16,hh*.68))}px" data-fn="${nm}" value="${esc(v||'')}" ${f.max?`maxlength="${f.max}"`:''} ${f.ro?'disabled':''}>`;
  else if(f.kind==='check')h+=`<button class="pd-f pd-cb${v?' on':''}" style="${st};font-size:${hh*.8}px" data-fn="${nm}" data-k="check" ${f.ro?'disabled':''}>${v?'✓':''}</button>`;
  else if(f.kind==='radio')h+=`<button class="pd-f pd-cb pd-rb${v===f.on?' on':''}" style="${st};font-size:${hh*.6}px" data-fn="${nm}" data-k="radio" data-on="${esc(f.on)}" ${f.ro?'disabled':''}>${v===f.on?'●':''}</button>`;
  else if(f.kind==='choice')h+=`<select class="pd-f" style="${st};font-size:${Math.max(9,Math.min(15,hh*.6))}px" data-fn="${nm}" ${f.ro?'disabled':''}><option value=""></option>${f.opts.map(o=>`<option value="${esc(o.v)}" ${o.v===v?'selected':''}>${esc(o.l)}</option>`).join('')}</select>`}
 for(const it of PD.items.filter(x=>x.p===i)){const st=`left:${it.x*s}px;top:${it.y*s}px;width:${it.w*s}px;height:${it.h*s}px`;const sel=PD.sel===it.id;
  const inner=it.t==='text'?`<span class="pd-tx" style="font-size:${it.size*s}px;color:${it.color}">${esc(it.text).replace(/\n/g,'<br>')}</span>`:`<img src="${it.src}" alt="" draggable="false">`;
  const sm=it.w*s<44||it.h*s<30;h+=`<div class="pd-it${sel?' sel':''}${sm?' sm':''}" data-it="${it.id}" style="${st}">${inner}${sel?`<button class="pd-del" data-del="${it.id}" aria-label="Entfernen">×</button><span class="pd-rs" data-rs="${it.id}"></span>${it.t==='text'?`<button class="pd-edt" data-edt="${it.id}">Text ändern</button>`:''}`:''}</div>`}
 ov.innerHTML=h;
 ov.querySelectorAll('[data-fn]').forEach(el=>{const nm=el.dataset.fn;
  if(el.tagName==='BUTTON')el.onclick=e=>{e.stopPropagation();const f=PD.fields.find(x=>x.name===nm);if(el.dataset.k==='check')PD.form[nm]=!PD.form[nm];else PD.form[nm]=PD.form[nm]===el.dataset.on?'':el.dataset.on;PD.dirty=true;PD.pages.forEach((x,k)=>{if(PD.fields.some(ff=>ff.p===k&&ff.name===nm))pdfOverlay(k)})};
  else{el.oninput=el.onchange=()=>{PD.form[nm]=el.value;PD.dirty=true;PD.fields.filter(x=>x.name===nm).forEach(x=>{const o=PD.pages[x.p].el.querySelectorAll(`[data-fn="${CSS.escape(nm)}"]`);o.forEach(y=>{if(y!==el)y.value=el.value})})};el.onclick=e=>e.stopPropagation()}});
 ov.querySelectorAll('[data-it]').forEach(el=>pdfDrag(el,i));
 ov.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();PD.items=PD.items.filter(x=>x.id!==b.dataset.del);PD.sel=null;PD.dirty=true;pdfOverlay(i)});
 ov.querySelectorAll('[data-edt]').forEach(b=>b.onclick=e=>{e.stopPropagation();pdfTextSheet(PD.items.find(x=>x.id===b.dataset.edt))})}

/* Verschieben und Größe ändern mit dem Finger (Antippen wählt aus, Ziehen verschiebt sofort) */
function pdfDrag(el,i){const it=PD.items.find(x=>x.id===el.dataset.it);const P=PD.pages[i];let st=null;
 el.onpointerdown=e=>{if(e.target.closest('.pd-del,.pd-edt'))return;e.stopPropagation();e.preventDefault();
  const prev=PD.items.find(x=>x.id===PD.sel);PD.sel=it.id;el.classList.add('sel');if(prev&&prev!==it&&prev.p!==i)pdfOverlay(prev.p);
  st={rs:!!e.target.closest('.pd-rs'),x:e.clientX,y:e.clientY,mv:false,o:{x:it.x,y:it.y,w:it.w,h:it.h,size:it.size}};try{el.setPointerCapture(e.pointerId)}catch(x){}};
 el.onpointermove=e=>{if(!st)return;e.preventDefault();const dx=(e.clientX-st.x)/P.scale,dy=(e.clientY-st.y)/P.scale;if(Math.abs(dx)+Math.abs(dy)>1)st.mv=true;
  if(st.rs){const k=Math.max(.2,(st.o.w+dx)/st.o.w);it.w=st.o.w*k;it.h=st.o.h*k;if(it.t==='text')it.size=Math.max(5,Math.min(72,st.o.size*k))}
  else{it.x=Math.max(-it.w*.5,Math.min(P.vp.width-it.w*.5,st.o.x+dx));it.y=Math.max(-it.h*.5,Math.min(P.vp.height-it.h*.5,st.o.y+dy))}
  const s=P.scale;el.style.left=it.x*s+'px';el.style.top=it.y*s+'px';el.style.width=it.w*s+'px';el.style.height=it.h*s+'px';const tx=el.querySelector('.pd-tx');if(tx)tx.style.fontSize=it.size*s+'px'};
 el.onpointerup=el.onpointercancel=()=>{if(!st)return;if(st.mv)PD.dirty=true;st=null;pdfOverlay(i)}}

function pdfHint(t,ms){const h=document.getElementById('pdHint');if(!h)return;h.textContent=t||'';h.hidden=!t;clearTimeout(PD&&PD.hintT);if(ms&&PD)PD.hintT=setTimeout(()=>{if(h)h.hidden=true},ms)}
function pdfTool(t){if(!PD)return;
 if(t==='pages'){pdfPagesSheet();return}if(t==='find'){pdfFindSheet();return}
 if(t==='sig'){const L=pdfSigs();if(!L.length){pdfSigPad('Unterschrift',it=>{closeSheet();pdfArm('sig',it.id)});return}
  if(L.length===1){pdfArm('sig',L[0].id);return}
  sheet(`<h2>Welche Unterschrift?</h2><div class="stack">${L.map(x=>`<button class="li set-row" data-pick="${x.id}"><img class="sig-pv" data-sig="${x.id}" alt=""><span class="grow">${esc(x.label)}</span></button>`).join('')}</div><button class="btn block ghost" id="spNew" style="margin-top:8px">Neue zeichnen</button>`,async s=>{
   for(const im of s.querySelectorAll('[data-sig]'))im.src=await IDB.get('pdfsig-'+im.dataset.sig)||'';
   s.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{closeSheet();pdfArm('sig',b.dataset.pick)});
   s.querySelector('#spNew').onclick=()=>pdfSigPad('Unterschrift',it=>{closeSheet();pdfArm('sig',it.id)})});return}
 pdfArm(t)}
function pdfArm(t,ref){PD.tool={t,ref};PD.sel=null;PD.pages.forEach((_,i)=>pdfOverlay(i));
 document.querySelectorAll('#pdBar [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 pdfHint({sig:'Tippe auf die Stelle für die Unterschrift.',text:'Tippe auf die Stelle für den Text.',date:'Tippe auf die Stelle für das Datum.',check:'Tippe auf das Kästchen.',cross:'Tippe auf das Kästchen.'}[t])}
async function pdfPageTap(e){if(!PD)return;const w=e.target.closest('.pd-pg');if(!w||e.target.closest('.pd-it,.pd-f'))return;
 if(!PD.tool){if(PD.sel){const p=PD.items.find(x=>x.id===PD.sel);PD.sel=null;if(p)pdfOverlay(p.p)}return}
 const i=+w.dataset.p,P=PD.pages[i],r=w.getBoundingClientRect();const cx=(e.clientX-r.left)/P.scale,cy=(e.clientY-r.top)/P.scale;const{t,ref}=PD.tool;PD.tool=null;
 document.querySelectorAll('#pdBar [data-t]').forEach(b=>b.classList.remove('on'));pdfHint('');let it=null;
 if(t==='sig'){const m=pdfSigs().find(x=>x.id===ref);const src=await IDB.get('pdfsig-'+ref);if(!m||!src)return;const W=Math.min(170,P.vp.width*.4),H=W*m.h/m.w;it={t:'img',sig:true,src,x:cx-W/2,y:cy-H*.65,w:W,h:H}}
 if(t==='check'||t==='cross'){const z=13;it={t:'img',src:pdfMarkPng(t),x:cx-z/2,y:cy-z/2,w:z,h:z}}
 if(t==='text'||t==='date'){const txt=t==='date'?pdfDateText():'';it={t:'text',text:txt,size:11,color:'#111111',x:cx,y:cy-11*.75}}
 if(!it)return;it.id=uid();it.p=i;if(it.t==='text')pdfTextSize(it);PD.items.push(it);PD.sel=it.id;PD.dirty=true;pdfOverlay(i);if(t==='text')pdfTextSheet(it,true)}
/* Größe eines Textfelds aus Schriftgröße und Inhalt (Helvetica-Breiten ≈ Canvas-Messung) */
function pdfTextSize(it){const c=pdfTextSize.c||(pdfTextSize.c=document.createElement('canvas').getContext('2d'));c.font=`${it.size}px Helvetica, Arial, sans-serif`;
 const L=String(it.text||' ').split('\n');it.w=Math.max(it.size*2,...L.map(l=>c.measureText(l||' ').width))+2;it.h=it.size*1.2*L.length}
function pdfTextSheet(it,fresh){if(!it)return;
 sheet(`<h2>${fresh?'Text einfügen':'Text ändern'}</h2><textarea class="inp" id="ptT" rows="3" autofocus>${esc(it.text)}</textarea>
 <label class="f">Schriftgröße <span id="ptZv">${Math.round(it.size)}</span> pt<input type="range" id="ptZ" min="6" max="28" value="${Math.round(it.size)}"></label>
 <div class="row" style="gap:8px"><button class="chip-btn${it.color==='#111111'?' on':''}" data-col="#111111">Schwarz</button><button class="chip-btn${it.color==='#1a3a8f'?' on':''}" data-col="#1a3a8f">Blau</button>
 <span class="grow"></span><button class="btn sm ghost" id="ptD">Datum</button></div>
 <p class="small muted">Umlaute und € gehen. Seltene Sonderzeichen (z. B. Emojis) werden im PDF als „?“ gespeichert.</p><button class="btn pri block" id="ptO">Übernehmen</button>`,s=>{let col=it.color;
  const z=s.querySelector('#ptZ');z.oninput=()=>s.querySelector('#ptZv').textContent=z.value;
  s.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{col=b.dataset.col;s.querySelectorAll('[data-col]').forEach(x=>x.classList.toggle('on',x===b))});
  s.querySelector('#ptD').onclick=()=>{const t=s.querySelector('#ptT');t.value=(t.value?t.value+' ':'')+pdfDateText()};
  s.querySelector('#ptO').onclick=()=>{const v=s.querySelector('#ptT').value.replace(/\s+$/,'');closeSheet();
   if(!v){PD.items=PD.items.filter(x=>x!==it);PD.sel=null}else{it.text=v;it.size=+z.value;it.color=col;pdfTextSize(it)}PD.dirty=true;pdfOverlay(it.p)}})}

/* nur Zeichen, die die PDF-Standardschrift kennt (WinAnsi) */
const PDF_WIN='€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const pdfSafe=t=>String(t||'').replace(/\r/g,'').replace(/[^\n\x20-\x7e\xa0-\xff]/g,c=>PDF_WIN.includes(c)?c:'?');
const pdfHex=h=>{const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};

/* schreibt Elemente und Formularwerte fest ins PDF – gibt neue Bytes zurück */
async function pdfBake(bytes,items,form,flatten){const P=await pdfLib();const doc=await P.PDFDocument.load(bytes,{updateMetadata:false});
 const pages=doc.getPages();const font=await doc.embedFont(P.StandardFonts.Helvetica);const imgs={};
 for(const it of items){const pg=pages[it.p];const vp=PD.pages[it.p].vp;if(!pg||!vp)continue;const R=((pg.getRotation().angle%360)+360)%360;
  if(it.t==='img'){const im=imgs[it.src]||(imgs[it.src]=await doc.embedPng(pdfBytes(it.src)));const [x,y]=vp.convertToPdfPoint(it.x,it.y+it.h);pg.drawImage(im,{x,y,width:it.w,height:it.h,rotate:P.degrees(R)})}
  if(it.t==='text'){const L=pdfSafe(it.text).split('\n');const [r,g,b]=pdfHex(it.color||'#111111');
   L.forEach((ln,k)=>{const[x,y]=vp.convertToPdfPoint(it.x+1,it.y+it.size*(.94+1.2*k));if(ln)pg.drawText(ln,{x,y,size:it.size,font,color:P.rgb(r,g,b),rotate:P.degrees(R)})})}}
 if(form&&Object.keys(form).length){let F=null;try{F=doc.getForm()}catch(e){}
  if(F){for(const[nm,v]of Object.entries(form)){if(PD.formInit[nm]===v&&!flatten)continue;let f;try{f=F.getField(nm)}catch(e){continue}
    try{
     if(f instanceof P.PDFTextField)f.setText(pdfSafe(v||'')||undefined);
     else if(f instanceof P.PDFCheckBox)v?f.check():f.uncheck();
     else if(f instanceof P.PDFRadioGroup){if(!v){f.clear();continue}const opts=f.getOptions();if(opts.includes(v)){f.select(v);continue}
      const k=f.acroField.getWidgets().findIndex(w=>{const o=w.getOnValue();return o&&(o.decodeText?o.decodeText():String(o).replace(/^\//,''))===v});if(k>=0&&opts[k]!=null)f.select(opts[k])}
     else if(f instanceof P.PDFDropdown||f instanceof P.PDFOptionList){if(!v){f.clear();continue}const def=PD.fields.find(x=>x.name===nm&&x.opts);const o=def&&def.opts.find(x=>x.v===v);const ok=f.getOptions();f.select(o&&ok.includes(o.l)?o.l:v)}}catch(e){}}
   try{F.updateFieldAppearances(font)}catch(e){}
   if(flatten){try{F.flatten()}catch(e){}
    /* Verweise auf entfernte Felder aufräumen, sonst meckern manche Programme */
    for(const pg of doc.getPages()){const an=pg.node.Annots();if(!an)continue;for(let k=an.size()-1;k>=0;k--){const r=an.get(k);if(r instanceof P.PDFRef&&!doc.context.lookup(r))an.remove(k)}}}}}
 return await doc.save()}

/* ---------- Fertig: speichern ---------- */
function pdfChanged(){if(!PD)return false;if(PD.items.length||PD.hist.length)return true;return Object.keys(PD.form).some(k=>PD.form[k]!==PD.formInit[k])}
function pdfClose(force){if(!force&&pdfChanged()){confirmSheet('Änderungen verwerfen?','Unterschrift, Texte und Seitenänderungen gehen verloren. Die PDF in Kleinkram bleibt wie vorher.','Verwerfen',()=>pdfClose(true),true);return}
 try{PD&&PD.io&&PD.io.disconnect();PD&&PD.doc&&PD.doc.destroy()}catch(e){}PD=null;const el=document.getElementById('pdfEd');el&&el.remove();document.body.classList.remove('pd-open')}
function pdfFinish(){if(!PD)return;if(!pdfChanged()){pdfClose(true);return}const signed=PD.items.some(x=>x.sig);const hasForm=PD.fields.length>0;
 const base=PD.meta.name.replace(/ \((unterschrieben|ausgefüllt|bearbeitet)\)$/,'');const sfx=signed?'unterschrieben':Object.keys(PD.form).some(k=>PD.form[k]!==PD.formInit[k])?'ausgefüllt':'bearbeitet';
 sheet(`<h2>Speichern</h2><label class="f">Name<input class="inp" id="pfN" value="${esc(base+' ('+sfx+')')}"></label>
 ${hasForm?`<label class="check-row"><input type="checkbox" id="pfF" ${signed?'checked':''}> Formularfelder fest einbrennen <span class="small muted">(danach nicht mehr änderbar – sinnvoll nach dem Unterschreiben)</span></label>`:''}
 <label class="check-row"><input type="radio" name="pfM" value="neu" checked> Als neue PDF speichern – das Original bleibt</label>
 <label class="check-row"><input type="radio" name="pfM" value="ersetzen"> Original ersetzen</label>
 <button class="btn pri block" id="pfO">Speichern</button>`,s=>{s.querySelector('#pfO').onclick=async()=>{const name=pdfCleanName(s.querySelector('#pfN').value);const flat=!!(s.querySelector('#pfF')&&s.querySelector('#pfF').checked);const mode=s.querySelector('[name="pfM"]:checked').value;
  const go2=async()=>{toast('Speichere …');let out;try{out=await pdfBake(PD.bytes,PD.items,PD.form,flat)}catch(e){toast(e&&/encrypt/i.test(e.message)?'Geschützte PDFs lassen sich nicht bearbeiten.':'Speichern ging nicht – die PDF ist ungewöhnlich aufgebaut.');return}
   let it;if(mode==='ersetzen'){const m=PD.meta;if(!(await IDB.putOk('pdf-'+m.id,pdfDataUrl(out)))){toast('Speichern ging nicht – ist der Speicher voll?');return}m.name=name;m.size=out.length;m.updated=new Date().toISOString();m.signed=m.signed||signed;m.pages=PD.pages.length;save();it=m}
   else{it=await pdfStore(out,name,'bearbeitet',{parent:PD.meta.id,signed});if(!it)return}
   if(signed&&typeof pts==='function')pts(5,'PDF unterschrieben');pdfClose(true);render();pdfDoneSheet(it.id)};
  if(mode==='ersetzen'){closeSheet();confirmSheet('Original ersetzen?','Die bisherige Fassung wird überschrieben und lässt sich nicht zurückholen.','Ersetzen',go2,true)}else{closeSheet();go2()}}})}
function pdfDoneSheet(id){const p=pdfList().find(x=>x.id===id);if(!p)return;
 sheet(`<h2>Gespeichert ✓</h2><p class="muted">„${esc(p.name)}“ liegt in der Ablage unter PDF.</p><div class="grid2"><button class="btn pri" id="pdS1">Teilen / Drucken</button><button class="btn" id="pdS2">Speichern</button></div>
 <p class="small muted">Verschickt wird nichts automatisch – beim Teilen wählst du selbst, wohin.</p>`,s=>{
  s.querySelector('#pdS1').onclick=async()=>{const b=await pdfLoadBytes(id);b&&shareBin(pdfFileName(p.name),b,'application/pdf')};
  s.querySelector('#pdS2').onclick=async()=>{const b=await pdfLoadBytes(id);b&&saveBin(pdfFileName(p.name),b,'application/pdf')}})}

/* ---------- Seiten: drehen, löschen, verschieben, anhängen, herauslösen ---------- */
async function pdfPagesSheet(){if(!PD)return;const n=PD.pages.length;
 sheet(`<h2>Seiten</h2><p class="small muted">${n} Seite${n===1?'':'n'}. Änderungen wirken sofort, „Rückgängig“ holt den letzten Stand zurück.${PD.items.length||Object.keys(PD.form).some(k=>PD.form[k]!==PD.formInit[k])?' Platzierte Unterschriften und Texte werden dabei fest eingefügt.':''}</p>
 <div class="pd-thumbs" id="ptG">${PD.pages.map((_,i)=>`<div class="pd-thumb"><label class="pd-tsel"><input type="checkbox" data-s="${i}"></label><canvas data-th="${i}"></canvas><b>${i+1}</b>
  <div class="pd-tb"><button data-op="rl" data-i="${i}" aria-label="Links drehen">↺</button><button data-op="rr" data-i="${i}" aria-label="Rechts drehen">↻</button><button data-op="up" data-i="${i}" ${i?'':'disabled'} aria-label="Nach vorne">↑</button><button data-op="dn" data-i="${i}" ${i<n-1?'':'disabled'} aria-label="Nach hinten">↓</button><button data-op="del" data-i="${i}" ${n>1?'':'disabled'} aria-label="Löschen">🗑</button></div></div>`).join('')}</div>
 <div class="grid2" style="margin-top:10px"><label class="btn" for="ptAdd">PDF anhängen</label><label class="btn" for="ptScan">Seite scannen</label></div>
 <input type="file" id="ptAdd" accept="application/pdf,.pdf" hidden><input type="file" id="ptScan" accept="image/*" capture="environment" hidden>
 <div class="grid2" style="margin-top:8px"><button class="btn ghost" id="ptEx">Auswahl als neue PDF</button><button class="btn ghost" id="ptU" ${PD.hist.length?'':'disabled'}>Rückgängig</button></div>`,async s=>{
  s.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{const i=+b.dataset.i,op=b.dataset.op;
   if(op==='del'){confirmSheet(`Seite ${i+1} entfernen?`,'Nur in dieser Bearbeitung – das Original bleibt, solange du als neue PDF speicherst.','Entfernen',()=>pdfPageOp({del:i}),true,()=>pdfPagesSheet());return}
   pdfPageOp(op==='rl'?{rot:[i,-90]}:op==='rr'?{rot:[i,90]}:op==='up'?{move:[i,i-1]}:{move:[i,i+1]})});
  s.querySelector('#ptU').onclick=async()=>{if(!PD.hist.length||PD.busy)return;PD.busy=true;const h=PD.hist.pop();PD.bytes=h.bytes;PD.items=h.items;PD.form=h.form;PD.formInit=h.formInit;PD.text=null;await pdfLoadDoc();PD.busy=false;pdfPagesSheet()};
  s.querySelector('#ptAdd').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>PDF_MAX){toast('Größer als 40 MB.');return}pdfPageOp({add:new Uint8Array(await f.arrayBuffer())})};
  s.querySelector('#ptScan').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const b=await pdfFromImages([f],true);if(b)pdfPageOp({add:b})};
  s.querySelector('#ptEx').onclick=async()=>{const sel=[...s.querySelectorAll('[data-s]:checked')].map(x=>+x.dataset.s);if(!sel.length){toast('Erst Seiten ankreuzen.');return}
   try{const P=await pdfLib();const base=await pdfBake(PD.bytes,PD.items,PD.form,false);const src=await P.PDFDocument.load(base);const d=await P.PDFDocument.create();(await d.copyPages(src,sel)).forEach(p=>d.addPage(p));
    const it=await pdfStore(await d.save(),`${PD.meta.name} – Seite${sel.length>1?'n':''} ${sel.map(x=>x+1).join(', ')}`,'auszug');if(it){toast(`Neue PDF mit ${sel.length} Seite${sel.length>1?'n':''} liegt in der Ablage.`);render()}}catch(e){toast('Das ging nicht – die PDF ist ungewöhnlich aufgebaut.')}}
  /* Vorschaubilder zuletzt – die Knöpfe gehen sofort */
  for(const c of s.querySelectorAll('[data-th]')){if(!PD||!c.isConnected)break;const P=PD.pages[+c.dataset.th];if(!P)continue;const vp=P.pg.getViewport({scale:110/P.vp.width});c.width=vp.width;c.height=vp.height;try{await P.pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}catch(e){}}})}
async function pdfPageOp(op){if(!PD)return;if(PD.busy){toast('Moment …');return}PD.busy=true;document.querySelectorAll('#ptG button,#ptEx,#ptU').forEach(b=>b.disabled=true);const P=await pdfLib();
 try{const baked=await pdfBake(PD.bytes,PD.items,PD.form,false);const doc=await P.PDFDocument.load(baked);
  if(op.rot){const pg=doc.getPage(op.rot[0]);pg.setRotation(P.degrees((((pg.getRotation().angle+op.rot[1])%360)+360)%360))}
  if(op.del!=null)doc.removePage(op.del);
  if(op.move){const[a,b]=op.move;const[cp]=await doc.copyPages(doc,[a]);doc.removePage(a);doc.insertPage(b,cp)}
  if(op.add){const src=await P.PDFDocument.load(op.add);(await doc.copyPages(src,src.getPageIndices())).forEach(p=>doc.addPage(p))}
  const nb=await doc.save();PD.hist.push({bytes:PD.bytes,items:PD.items,form:PD.form,formInit:PD.formInit});if(PD.hist.length>10)PD.hist.shift();
  PD.bytes=nb;PD.items=[];PD.sel=null;PD.form={};PD.formInit={};PD.dirty=true;PD.text=null;await pdfLoadDoc();PD.busy=false;pdfPagesSheet()}
 catch(e){PD.busy=false;toast(e&&/encrypt/i.test(e.message)?'Geschützte PDFs lassen sich nicht bearbeiten.':'Das ging bei dieser PDF nicht.');pdfPagesSheet()}}

/* ---------- Suchen im Text ---------- */
async function pdfFindSheet(){if(!PD)return;
 sheet(`<h2>In der PDF suchen</h2><input class="inp" id="pqI" type="search" placeholder="Wort oder Zahl" autofocus><div id="pqR" class="stack" style="margin-top:8px"></div>`,s=>{const inp=s.querySelector('#pqI');let tm=null;
  const run=async()=>{const q=inp.value.trim().toLowerCase();const out=s.querySelector('#pqR');if(q.length<2){out.innerHTML='';return}
   if(!PD.text){PD.text=[];for(const P of PD.pages){try{const tc=await P.pg.getTextContent();PD.text.push(tc.items.map(x=>x.str).join(' ').replace(/\s+/g,' '))}catch(e){PD.text.push('')}}}
   const hits=[];PD.text.forEach((t,i)=>{let k=t.toLowerCase().indexOf(q);let c=0;while(k>=0&&c<5){hits.push({i,snip:t.slice(Math.max(0,k-40),k+q.length+40)});k=t.toLowerCase().indexOf(q,k+q.length);c++}});
   out.innerHTML=hits.length?hits.slice(0,40).map(h=>`<button class="li set-row" data-go="${h.i}"><b>S. ${h.i+1}</b><span class="small grow">…${esc(h.snip)}…</span></button>`).join(''):`<p class="muted">Nichts gefunden.${PD.text.every(t=>!t.trim())?' Diese PDF enthält keinen Text (z. B. ein Scan).':''}</p>`;
   out.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{closeSheet();PD.pages[+b.dataset.go].el.scrollIntoView({block:'start'})})};
  inp.oninput=()=>{clearTimeout(tm);tm=setTimeout(run,250)}})}

/* ---------- Brief → unterschreiben; PDF von anderen Apps ---------- */
async function pdfFromBytes(bytes,name,src){const it=await pdfStore(bytes,name,src);if(!it)return;closeSheet();render();pdfEdit(it.id)}
async function pdfShared(){if(!CAP)return;let r;try{r=await CapP('KleinkramNative').geteilteDatei()}catch(e){if(e&&/40 MB/.test(e.message||''))toast(e.message);return}
 if(!r||!r.data)return;if(PD)pdfClose(true);const it=await pdfStore(pdfBytes(r.data),r.name||'Dokument','geteilt');if(!it)return;UI.abl='pdf';go('ablage');toast('PDF übernommen.');pdfEdit(it.id)}
if(CAP){try{CapP('KleinkramNative').addListener('geteilt',()=>pdfShared())}catch(e){}setTimeout(pdfShared,900)}
window.addEventListener('resize',()=>{if(PD){clearTimeout(PD.rz);PD.rz=setTimeout(pdfLayout,200)}});

/* Klicks */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 if(a==='pdfOpen'){e.stopPropagation();closeSheet();pdfOpen()}
 else if(a==='pdfItem'){e.stopPropagation();pdfItemSheet(b.dataset.id)}
 else if(a==='pdfSigs'){e.stopPropagation();pdfSigsSheet()}});
