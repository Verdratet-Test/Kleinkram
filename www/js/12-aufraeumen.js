/* Kleinkram · Handy aufräumen: Doppelte, Serienbilder, Alben, Screenshots, Dateien sortieren, Papierkorb */
"use strict";
/* ---------- Handy aufräumen ---------- */
const AR=()=>CapP('Aufraeumen');
const CL={st:null,stAt:0,media:null,files:null,busy:'',thumbs:{},dupM:null,similar:null,events:null,cat:null,fdup:null,fcat:null,trash:null};
const fmtB=b=>{b=+b||0;return b>=1e9?(b/1e9).toLocaleString('de-DE',{maximumFractionDigits:1})+' GB':b>=1e6?Math.round(b/1e6)+' MB':Math.max(1,Math.round(b/1e3))+' KB'};
const mkey=m=>m.kind+':'+m.id;
const nD=n=>`${n} ${n===1?'Datei':'Dateien'}`;
const sumB=a=>a.reduce((x,m)=>x+(+m.size||0),0);
const clStore=()=>{S.clean=S.clean||{freed:0,runs:0,fileTrash:[],lastMove:null};S.clean.fileTrash=S.clean.fileTrash||[];return S.clean};
const isCam=m=>/^DCIM\/(Camera|Kamera)?\/?$/i.test(m.path||'')||/^(camera|kamera)$/i.test(m.bucket||'');
const isShot=m=>/screenshot|bildschirmfoto|screen_?record/i.test(`${m.bucket} ${m.path} ${m.name}`);
const isWA=m=>/whatsapp/i.test(`${m.path} ${m.bucket}`);
const popc=n=>{n=n-((n>>>1)&0x55555555);n=(n&0x33333333)+((n>>>2)&0x33333333);return(((n+(n>>>4))&0xF0F0F0F)*0x1010101)>>>24};
const hamming=(a,b)=>popc((parseInt(a.slice(0,8),16)^parseInt(b.slice(0,8),16))>>>0)+popc((parseInt(a.slice(8),16)^parseInt(b.slice(8),16))>>>0);
const dRange=(a,b)=>{const x=iso(new Date(a)),y=iso(new Date(b));return x===y?fmtDate(x):`${fmtDate(x)} – ${fmtDate(y)}`};

async function clRefreshStatus(force){if(!CAP||(!force&&Date.now()-CL.stAt<3000))return;CL.stAt=Date.now();try{const s=await AR().status();const ch=JSON.stringify(s)!==JSON.stringify(CL.st);CL.st=s;if(ch&&UI.tab==='aufraeumen')render()}catch(e){CL.st={err:String(e&&e.message||e)};if(UI.tab==='aufraeumen')render()}}
function clBusy(t){CL.busy=t;if(UI.tab==='aufraeumen'){const b=document.getElementById('clBusy');if(b)b.textContent=t;else render()}}
async function clRun(label,fn){if(CL.busy)return;clBusy(label);try{await fn()}catch(e){toast('Ging nicht: '+(e&&e.message||e))}CL.busy='';render();render()}

/* Fotos & Videos */
async function clScanMedia(){const r=await AR().scanMedia({});CL.media=(r.items||[]).filter(m=>m.size>0);CL.dupM=null;CL.similar=null;clAnalyzeMedia();clStore().lastScan=today();save()}
function clAnalyzeMedia(){const now=Date.now(),D=864e5,M=CL.media;
 CL.cat={shots:M.filter(m=>isShot(m)&&now-m.taken>30*D).sort((a,b)=>a.taken-b.taken),
  wa:M.filter(m=>isWA(m)&&!isShot(m)&&now-m.taken>90*D).sort((a,b)=>b.size-a.size),
  bigv:M.filter(m=>m.kind==='video'&&m.size>100e6).sort((a,b)=>b.size-a.size)};
 const cam=M.filter(isCam).sort((a,b)=>a.taken-b.taken),ev=[];let cur=[];
 for(const m of cam){if(cur.length&&m.taken-cur[cur.length-1].taken>4*36e5){if(cur.length>=10)ev.push(cur);cur=[]}cur.push(m)}if(cur.length>=10)ev.push(cur);
 CL.events=ev.reverse().slice(0,30).map((g,i)=>({id:'e'+i,items:g,from:g[0].taken,to:g[g.length-1].taken}))}
const keepScore=m=>(isCam(m)?0:isWA(m)?2:1)*1e13+(m.taken||0);
async function clFindDupMedia(){const by={};CL.media.forEach(m=>{const k=m.kind+'|'+m.size;(by[k]=by[k]||[]).push(m)});
 const cand=Object.values(by).filter(g=>g.length>1).flat();const hs={};
 for(let i=0;i<cand.length;i+=150){clBusy(`Vergleiche Fotos … ${Math.min(i+150,cand.length)} von ${cand.length}`);const r=await AR().hashMedia({items:cand.slice(i,i+150).map(m=>({id:m.id,kind:m.kind}))});Object.assign(hs,r.hashes||{})}
 const g={};cand.forEach(m=>{const h=hs[mkey(m)];if(h)(g[h]=g[h]||[]).push(m)});
 CL.dupM=Object.values(g).filter(x=>x.length>1).map(x=>x.sort((a,b)=>keepScore(a)-keepScore(b)))}
async function clThumbs(list){const need=list.filter(m=>!CL.thumbs[mkey(m)]);
 for(let i=0;i<need.length;i+=40){if(need.length>40)clBusy(`Lade Vorschaubilder … ${Math.min(i+40,need.length)} von ${need.length}`);const r=await AR().thumbs({items:need.slice(i,i+40).map(m=>({id:m.id,kind:m.kind})),size:256});Object.assign(CL.thumbs,r.thumbs||{})}}
async function clFindSimilar(){const im=CL.media.filter(m=>m.kind==='image'&&!isShot(m)).sort((a,b)=>a.taken-b.taken),runs=[];let cur=[];
 for(const m of im){if(cur.length&&(m.taken-cur[cur.length-1].taken>8000||m.bucket!==cur[0].bucket)){if(cur.length>1)runs.push(cur);cur=[]}cur.push(m)}if(cur.length>1)runs.push(cur);
 const use=runs.slice(-200);await clThumbs(use.flat().slice(-1000));const out=[];
 use.forEach(run=>{const cl=[];run.forEach(m=>{const t=CL.thumbs[mkey(m)];if(!t)return;const c=cl.find(c=>hamming(CL.thumbs[mkey(c[0])].dhash,t.dhash)<=10);c?c.push(m):cl.push([m])});const sh=m=>(CL.thumbs[mkey(m)]||{}).sharp||0;cl.filter(c=>c.length>1).forEach(c=>out.push(c.sort((a,b)=>sh(b)-sh(a)||(b.w*b.h)-(a.w*a.h)||b.size-a.size)))});
 CL.similar=out.reverse()}
function clDropMedia(list){const ks=new Set(list.map(mkey));const f=a=>a.filter(m=>!ks.has(mkey(m)));CL.media=f(CL.media);
 if(CL.dupM)CL.dupM=CL.dupM.map(f).filter(g=>g.length>1);if(CL.similar)CL.similar=CL.similar.map(f).filter(g=>g.length>1);clAnalyzeMedia()}
async function clTrashMedia(list){if(!list.length)return false;const r=await AR().trashMedia({items:list.map(m=>({id:m.id,kind:m.kind}))});
 if(!r||!r.ok){toast('Abgebrochen. Nichts wurde geändert.');return false}
 const c=clStore();c.freed+=sumB(list);c.runs++;save();clDropMedia(list);CL.trash=null;pts(5,'Handy aufgeräumt');toast(`${list.length} im Papierkorb · ${fmtB(sumB(list))}`);return true}

/* Dateien */
const FTYP={pdf:'Dokumente',doc:'Dokumente',docx:'Dokumente',odt:'Dokumente',txt:'Dokumente',rtf:'Dokumente',xls:'Tabellen',xlsx:'Tabellen',ods:'Tabellen',csv:'Tabellen',ppt:'Präsentationen',pptx:'Präsentationen',jpg:'Bilder',jpeg:'Bilder',png:'Bilder',webp:'Bilder',heic:'Bilder',gif:'Bilder',mp4:'Videos',mov:'Videos',mkv:'Videos','3gp':'Videos',mp3:'Audio',m4a:'Audio',ogg:'Audio',wav:'Audio',opus:'Audio',aac:'Audio',zip:'Archive',rar:'Archive','7z':'Archive',gz:'Archive',apk:'Installationsdateien',xapk:'Installationsdateien',ics:'Kalender',vcf:'Kontakte'};
const fext=n=>{const i=n.lastIndexOf('.');return i>0?n.slice(i+1).toLowerCase():''};
function fileGroup(f){const n=f.name.toLowerCase();if(/rechnung|invoice|beleg|quittung/.test(n))return'Rechnungen';if(/kontoauszug|account.?statement/.test(n))return'Kontoauszüge';if(/vertrag|contract|kündigung/.test(n))return'Verträge';if(/bescheid|steuer|elster|finanzamt/.test(n))return'Steuer & Bescheide';if(/lohn|gehalt|entgelt/.test(n))return'Lohn & Gehalt';return FTYP[fext(f.name)]||'Sonstiges'}
const FDIRS=['Download','Documents','Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents'];
async function clScanFiles(){const r=await AR().scanFiles({dirs:FDIRS,depth:4});CL.files=r.items||[];CL.fdup=null;clAnalyzeFiles()}
function clAnalyzeFiles(){const now=Date.now(),F=CL.files,inDl=f=>/^Download\//.test(f.path);
 CL.fcat={apk:F.filter(f=>FTYP[fext(f.name)]==='Installationsdateien'),big:F.filter(f=>f.size>100e6).sort((a,b)=>b.size-a.size),
  old:F.filter(f=>inDl(f)&&now-f.mod>365*864e5&&FTYP[fext(f.name)]!=='Installationsdateien').sort((a,b)=>a.mod-b.mod),
  sort:F.filter(f=>inDl(f)&&FTYP[fext(f.name)]!=='Installationsdateien')}}
async function clFindDupFiles(){const by={};CL.files.forEach(f=>{if(f.size>0)(by[f.size]=by[f.size]||[]).push(f)});const cand=Object.values(by).filter(g=>g.length>1).flat();const hs={};
 for(let i=0;i<cand.length;i+=100){clBusy(`Vergleiche Dateien … ${Math.min(i+100,cand.length)} von ${cand.length}`);const r=await AR().hashFiles({paths:cand.slice(i,i+100).map(f=>f.path)});Object.assign(hs,r.hashes||{})}
 const g={};cand.forEach(f=>{const h=hs[f.path];if(h)(g[h]=g[h]||[]).push(f)});
 const rank=f=>(/^Documents\//.test(f.path)?0:/^Download\//.test(f.path)?1:2)*1e14+f.mod;
 CL.fdup=Object.values(g).filter(x=>x.length>1).map(x=>x.sort((a,b)=>rank(a)-rank(b)))}
function clDropFiles(paths){const ps=new Set(paths);CL.files=CL.files.filter(f=>!ps.has(f.path));if(CL.fdup)CL.fdup=CL.fdup.map(g=>g.filter(f=>!ps.has(f.path))).filter(g=>g.length>1);clAnalyzeFiles()}
async function clTrashFiles(list){if(!list.length)return;const r=await AR().moveFiles({paths:list.map(f=>f.path),target:'Kleinkram-Papierkorb/'+today()});const by={};list.forEach(f=>by[f.path]=f);
 const c=clStore();(r.moved||[]).forEach(m=>c.fileTrash.push({orig:m.from,now:m.to,size:(by[m.from]||{}).size||0,d:today()}));c.runs++;save();
 clDropFiles((r.moved||[]).map(m=>m.from));pts(5,'Dateien aufgeräumt');toast(`${nD((r.moved||[]).length)} im Kleinkram-Papierkorb${r.failed?` · ${r.failed} gingen nicht`:''}`)}

/* Ansicht */
function vAufraeumen(){if(CAP)clRefreshStatus();const c=clStore(),st=CL.st||{};
 let h=`<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-act="go" data-to="ich">${ICON.left} Zurück</button></div>`+head('Handy aufräumen',c.lastScan?`zuletzt geprüft ${fmtD(c.lastScan)}`:'Platz schaffen, Ordnung reinbringen');
 if(!CAP)return h+`<div class="card"><p>Das geht nur in der Android-App, weil Kleinkram dafür auf Fotos und Dateien des Handys zugreifen muss.</p></div>`;
 h+=`<div class="banner"><div class="grow small">Kleinkram schlägt vor, du entscheidest. Nichts wird ohne deine Bestätigung verschoben oder gelöscht. Gelöschtes landet erst im <b>Papierkorb</b> und lässt sich zurückholen.${c.freed?` Bisher aufgeräumt: <b>${fmtB(c.freed)}</b>.`:''}</div></div>`;
 if(CL.busy)h+=`<div class="card row" style="margin-top:12px"><span class="chip stamp">…</span><p class="grow" id="clBusy">${esc(CL.busy)}</p></div>`;
 const card=(k,title,sub,n,bytes,btn)=>`<div class="li"><div class="grow"><p><b>${title}</b></p><p class="small muted">${sub}</p></div>${n!=null?`<span class="chip${n?' warn':' ok'}">${n?`${n}${bytes?' · '+fmtB(bytes):''}`:'nichts'}</span>`:''}${n!==0?`<button class="btn sm" data-act="clOpen" data-k="${k}" ${CL.busy?'disabled':''}>${btn||'Ansehen'}</button>`:''}</div>`;
 // Fotos
 let f='';
 if(st.err)f=`<p class="small muted">Fehler: ${esc(st.err)}</p>`;
 else if(st.media!=='granted')f=`<p class="small muted">Kleinkram braucht Zugriff auf Fotos und Videos, um Doppelte, Serienbilder und Alben zu finden. Die Bilder verlassen dein Handy nicht.</p><button class="btn pri" data-act="clMediaPerm">Zugriff auf Fotos erlauben</button>`;
 else if(!CL.media)f=`<p class="small muted">Prüft alle Fotos und Videos. Das dauert nur ein paar Sekunden.</p><button class="btn pri" data-act="clScanMedia" ${CL.busy?'disabled':''}>Fotos &amp; Videos prüfen</button>`;
 else{const C=CL.cat,dupB=CL.dupM?sumB(CL.dupM.flatMap(g=>g.slice(1))):0;
  f=`<p class="small muted">${CL.media.length} Fotos und Videos · ${fmtB(sumB(CL.media))}</p></div><div class="reg-body flush" style="border-radius:0 0 var(--r) var(--r);border-top:0;margin-top:-10px">`+
   card('dupM','Doppelte Fotos &amp; Videos','Exakt gleiche Dateien, z. B. aus WhatsApp und Kamera',CL.dupM?CL.dupM.length:null,dupB,CL.dupM?'Ansehen':'Suchen')+
   card('similar','Serienbilder','Mehrere fast gleiche Fotos kurz hintereinander',CL.similar?CL.similar.length:null,0,CL.similar?'Ansehen':'Suchen')+
   card('events','Ereignisse zu Alben','Kamera-Fotos eines Tages oder Ausflugs in einen eigenen Ordner',CL.events.length,0)+
   card('shots','Alte Screenshots','Älter als 30 Tage',C.shots.length,sumB(C.shots))+
   card('wa','WhatsApp-Medien','Bilder und Videos aus Chats, älter als 90 Tage',C.wa.length,sumB(C.wa))+
   card('bigv','Große Videos','Über 100 MB',C.bigv.length,sumB(C.bigv))+
   card('belege','Rechnungen &amp; Briefe in Fotos','Fotografierte Belege der letzten 4 Monate finden und in die Ablage übernehmen',CL.belege?CL.belege.length:null,0,CL.belege?'Ansehen':'Suchen')+
   card('trash','Papierkorb','Zurückholen oder endgültig löschen, um sofort Platz zu schaffen',null,0,'Öffnen')+
   `<div class="li"><button class="btn sm ghost" data-act="clScanMedia" ${CL.busy?'disabled':''}>Neu prüfen</button></div>`}
 h+=reg('Fotos &amp; Videos',null,f);
 if(typeof soSection==='function')h+=soSection();
 if(typeof orSection==='function')h+=orSection();
 // Dateien
 let d='';const ft=c.fileTrash;
 if(st.sdk&&st.sdk<30)d='<p class="small muted">Dateien aufräumen braucht Android 11 oder neuer.</p>';
 else if(!st.files)d=`<p class="small muted">Für Download, Dokumente und WhatsApp-Dokumente braucht Kleinkram den Zugriff auf <b>alle Dateien</b>. Android öffnet dafür eine Einstellung: dort Kleinkram einschalten und zurückkommen.</p><button class="btn pri" data-act="clFilesPerm">Zugriff auf Dateien erlauben</button>`;
 else if(!CL.files)d=`<p class="small muted">Prüft Download, Dokumente und WhatsApp-Dokumente.</p><button class="btn pri" data-act="clScanFiles" ${CL.busy?'disabled':''}>Dateien prüfen</button>`;
 else{const C=CL.fcat,dupB=CL.fdup?sumB(CL.fdup.flatMap(g=>g.slice(1))):0;
  d=`<p class="small muted">${nD(CL.files.length)} · ${fmtB(sumB(CL.files))}</p></div><div class="reg-body flush" style="border-radius:0 0 var(--r) var(--r);border-top:0;margin-top:-10px">`+
   card('fdup','Doppelte Dateien','Gleicher Inhalt, mehrfach gespeichert',CL.fdup?CL.fdup.length:null,dupB,CL.fdup?'Ansehen':'Suchen')+
   `<div class="li"><div class="grow"><p><b>Download sortieren</b></p><p class="small muted">Nach Art und Thema – zusammen mit Screenshots und Bildschirmaufnahmen</p></div><button class="btn sm" data-act="soRun" ${CL.busy?'disabled':''}>Vorschläge</button></div>`+
   card('apk','Installationsdateien','APK-Dateien, nach der Installation meist überflüssig',C.apk.length,sumB(C.apk))+
   card('fold','Alte Downloads','Älter als ein Jahr',C.old.length,sumB(C.old))+
   card('fbig','Große Dateien','Über 100 MB',C.big.length,sumB(C.big))+
   (c.lastMove&&c.lastMove.length?`<div class="li"><div class="grow"><p><b>Letztes Sortieren</b></p><p class="small muted">${nD(c.lastMove.length)} verschoben</p></div><button class="btn sm" data-act="clUndoMove">Rückgängig</button></div>`:'')+
   `<div class="li"><button class="btn sm ghost" data-act="clScanFiles" ${CL.busy?'disabled':''}>Neu prüfen</button></div>`}
 if(ft.length)d+=`<div class="li"><div class="grow"><p><b>Kleinkram-Papierkorb</b></p><p class="small muted">${nD(ft.length)} · ${fmtB(sumB(ft))} · Ordner „Kleinkram-Papierkorb“</p></div><button class="btn sm" data-act="clOpen" data-k="ftrash">Öffnen</button></div>`;
 h+=reg('Dateien',null,d);
 return h}

/* Auswahl-Fenster */
function clCell(m,on,tag){const t=CL.thumbs[mkey(m)];return`<div class="cl-cell${on?' on':''}" data-ck="${mkey(m)}"><button class="cl-open" data-open aria-label="${esc(m.name)} groß ansehen">${t?`<img src="${t.src}" alt="">`:`<span class="cl-ph">${m.kind==='video'?'Video':'Foto'}</span>`}</button><button class="ck" data-tog aria-pressed="${on}" aria-label="${on?'Wird gelöscht':'Wird behalten'}">${ICON.check}</button>${tag==='behalten'?'<span class="tag keep">behalten</span>':tag?`<span class="tag">${esc(tag)}</span>`:m.kind==='video'?'<span class="tag">Video</span>':''}</div>`}
async function clOpen(k){const C=CL.cat;
 if(k==='dupM'&&!CL.dupM){await clRun('Suche doppelte Fotos …',clFindDupMedia);if(!CL.dupM)return;if(!CL.dupM.length)return toast('Keine doppelten Fotos gefunden.')}
 if(k==='similar'&&!CL.similar){await clRun('Suche Serienbilder …',clFindSimilar);if(!CL.similar)return;if(!CL.similar.length)return toast('Keine Serienbilder gefunden.')}
 if(k==='belege'){if(!CL.belege){await clRun('Suche Rechnungen und Briefe in Fotos …',clFindBelege);if(!CL.belege)return;if(!CL.belege.length)return toast('Keine neuen Belege in den Fotos gefunden.')}return belegeSheet()}
 if(k==='fdup'&&!CL.fdup){await clRun('Suche doppelte Dateien …',clFindDupFiles);if(!CL.fdup)return;if(!CL.fdup.length)return toast('Keine doppelten Dateien gefunden.')}
 if(k==='dupM')return clGroupSheet('Doppelte Fotos & Videos','Pro Gruppe bleibt das Original (grün) erhalten, rot markierte kommen in den Papierkorb. Tippe aufs Bild für die große Ansicht, auf den Kreis zum Auswählen.',CL.dupM.slice(0,60));
 if(k==='similar')return clGroupSheet('Serienbilder','Kleinkram behält pro Serie das schärfste Bild (grün). Tippe aufs Bild, um es groß anzusehen und zu vergleichen. Der Kreis ändert die Auswahl.',CL.similar.slice(0,60));
 if(k==='shots')return clListSheet('Alte Screenshots',C.shots,true);
 if(k==='wa')return clListSheet('WhatsApp-Medien',C.wa,false);
 if(k==='bigv')return clListSheet('Große Videos',C.bigv,false);
 if(k==='events')return clEventSheet();
 if(k==='trash')return clTrashSheet();
 if(k==='fdup')return clFileSheet('Doppelte Dateien',CL.fdup.flatMap(g=>g.map((f,i)=>({f,on:i>0,note:i?'Kopie':'Original bleibt'}))));
 if(k==='apk')return clFileSheet('Installationsdateien',CL.fcat.apk.map(f=>({f,on:true})));
 if(k==='fold')return clFileSheet('Alte Downloads',CL.fcat.old.map(f=>({f,on:false})));
 if(k==='fbig')return clFileSheet('Große Dateien',CL.fcat.big.map(f=>({f,on:false})));
 if(k==='fsort')return clSortSheet();
 if(k==='ftrash')return clFileTrashSheet()}
function clSync(s,sel){s.querySelectorAll('[data-ck]').forEach(c=>{const on=sel.has(c.dataset.ck);c.classList.toggle('on',on);const t=c.querySelector('[data-tog]');t&&(t.setAttribute('aria-pressed',on),t.setAttribute('aria-label',on?'Wird gelöscht':'Wird behalten'))})}
function clPick(s,sel,onChange,ctx){s.addEventListener('click',e=>{const c=e.target.closest('[data-ck]');if(!c)return;const k=c.dataset.ck;
 if(e.target.closest('[data-tog]')||!ctx){sel.has(k)?sel.delete(k):sel.add(k);clSync(s,sel);onChange();return}
 if(e.target.closest('[data-open]')){const g=ctx(k);if(g)clViewer(g.list,g.list.findIndex(m=>mkey(m)===k),sel,()=>{clSync(s,sel);onChange()},g.group)}})}

/* Große Vorschau zum Kontrollieren */
function clViewer(list,i,sel,changed,group){const host=document.getElementById('viewerHost')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'viewerHost'}));let zoom=false;
 const maxSharp=Math.max(1,...list.map(m=>(CL.thumbs[mkey(m)]||{}).sharp||0));
 const draw=()=>{const m=list[i],k=mkey(m),t=CL.thumbs[k]||{},on=sel.has(k),d=new Date(m.taken),sp=t.sharp!=null?Math.round(t.sharp/maxSharp*100):null;
  host.innerHTML=`<div class="vw" role="dialog" aria-modal="true" aria-label="Vorschau"><div class="vw-top"><span class="vw-pos">${i+1} von ${list.length}</span><span class="grow"></span><button class="vw-btn" data-v="zoom">${zoom?'Ganz zeigen':'Zoom'}</button><button class="vw-btn" data-v="close" aria-label="Schließen">${ICON.x}</button></div>
  <div class="vw-img${zoom?' zoom':''}" id="vwImg"><img id="vwPic" src="${(CL.prev[mkey(m)+(zoom?'@z':'')]||CL.prev[mkey(m)]||t.src||'')}" alt="${esc(m.name)}"><span class="vw-load" id="vwLoad" ${CL.prev[mkey(m)+(zoom?'@z':'')]?'hidden':''}>Lade volle Qualität …</span>${m.kind==='video'?'<span class="vw-badge">Video · Standbild</span>':''}</div>
  <div class="vw-info"><div class="vw-state ${on?'del':'keep'}">${on?'Kommt in den Papierkorb':'Wird behalten'}</div>
  <p>${fmtDate(iso(d))} · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} · ${m.w&&m.h?`${m.w}×${m.h} · `:''}${fmtB(m.size)}</p><p class="vw-sub">${esc((m.path||m.bucket||'').replace(/\/$/,''))} · ${esc(m.name)}</p>
  ${group&&sp!=null?`<div class="vw-sharp"><span>Schärfe</span><span class="vw-meter"><i style="width:${sp}%"></i></span><b>${sp===100?'schärfstes':sp+' %'}</b></div>`:''}</div>
  <div class="vw-bar"><button class="vw-btn" data-v="prev" ${i?'':'disabled'} aria-label="Vorheriges">${ICON.left}</button><button class="vw-btn vw-main ${on?'':'del'}" data-v="toggle">${on?'Doch behalten':'Zum Löschen markieren'}</button><button class="vw-btn" data-v="next" ${i<list.length-1?'':'disabled'} aria-label="Nächstes">${ICON.right}</button>${group?'<button class="vw-btn vw-best" data-v="best">Nur dieses behalten</button>':''}</div></div>`;
  clLoadFull(m,zoom?3200:2048,host,()=>list[i]===m);if(!zoom)[list[i+1],list[i-1]].filter(Boolean).forEach(n=>clFetchPreview(n,2048).catch(()=>{}))};
 const close=()=>{host.innerHTML='';changed()};
 host.onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v,k=mkey(list[i]);
  if(v==='close')return close();if(v==='prev'&&i>0){i--;zoom=false}if(v==='next'&&i<list.length-1){i++;zoom=false}if(v==='zoom')zoom=!zoom;
  if(v==='toggle'){sel.has(k)?sel.delete(k):sel.add(k);changed()}if(v==='best'){list.forEach(m=>sel.add(mkey(m)));sel.delete(k);changed();toast('Die anderen sind markiert. Gelöscht wird erst, wenn du unten bestätigst.')}draw()};
 let x0=null;host.ontouchstart=e=>{if(zoom)return;x0=e.touches[0].clientX};host.ontouchend=e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>60){if(dx<0&&i<list.length-1)i++;else if(dx>0&&i>0)i--;else return;draw()}};
 draw()}
CL.prev={};CL.prevOrder=[];
async function clFetchPreview(m,size){const key=mkey(m)+(size>2048?'@z':'');if(CL.prev[key])return CL.prev[key];
 const r=await AR().preview({id:m.id,kind:m.kind,size});let url=r&&r.uri&&window.Capacitor&&Capacitor.convertFileSrc?Capacitor.convertFileSrc(r.uri):'';
 const ok=url&&await new Promise(res=>{const im=new Image();im.onload=()=>res(true);im.onerror=()=>res(false);im.src=url});
 if(!ok){const r2=await AR().preview({id:m.id,kind:m.kind,size,inline:true});url=r2&&r2.src}
 if(!url)throw new Error('keine Vorschau');CL.prev[key]=url;CL.prevOrder.push(key);while(CL.prevOrder.length>24)delete CL.prev[CL.prevOrder.shift()];return url}
function clLoadFull(m,size,host,still){const pic=host.querySelector('#vwPic'),ld=host.querySelector('#vwLoad');
 clFetchPreview(m,size).then(url=>{if(!still())return;pic.src=url;ld&&(ld.hidden=true)}).catch(e=>{if(still()&&ld){ld.textContent='Volle Qualität nicht verfügbar: '+(e&&e.message||e)}})}
function clViewerOpen(){const h=document.getElementById('viewerHost');return!!(h&&h.innerHTML)}
function clViewerClose(){const b=document.querySelector('#viewerHost [data-v="close"]');b&&b.click()}
async function clGroupSheet(title,info,groups){const all=groups.flat();await clThumbs(all);CL.busy='';render();const sel=new Set(groups.flatMap(g=>g.slice(1).map(mkey)));const by={};all.forEach(m=>by[mkey(m)]=m);
 sheet(`<h2>${esc(title)}</h2><p class="small muted">${esc(info)}</p><div class="stack">${groups.map(g=>`<div class="cl-group"><p class="small muted">${dRange(g[0].taken,g[g.length-1].taken)} · ${nD(g.length)} · je ${fmtB(g[0].size)}</p><div class="cl-grid">${g.map((m,i)=>clCell(m,i>0,'behalten')).join('')}</div></div>`).join('')}</div>
 <div class="sheet-foot"><button class="btn pri block" id="clGo"></button></div>`,s=>{const go=s.querySelector('#clGo');const upd=()=>{const l=[...sel].map(k=>by[k]);go.textContent=l.length?`${l.length} in den Papierkorb (${fmtB(sumB(l))})`:'Nichts ausgewählt';go.disabled=!l.length};upd();clPick(s,sel,upd,k=>{const g=groups.find(g=>g.some(m=>mkey(m)===k));return g&&{list:g,group:true}});
  go.onclick=async()=>{const l=[...sel].map(k=>by[k]);if(await clTrashMedia(l)){closeSheet();render()}}})}
async function clListSheet(title,list,preselect){let shown=Math.min(list.length,60);const sel=new Set(preselect?list.map(mkey):[]);const by={};list.forEach(m=>by[mkey(m)]=m);await clThumbs(list.slice(0,shown));CL.busy='';render();
 sheet(`<h2>${esc(title)}</h2><p class="small muted">${nD(list.length)} · ${fmtB(sumB(list))}. Tippe aufs Bild für die große Ansicht, auf den Kreis zum Auswählen. Markierte kommen in den Papierkorb.</p><div class="row"><button class="btn sm" id="clAll">Alle auswählen</button><button class="btn sm ghost" id="clNone">Keine</button></div><div class="cl-grid" id="clGrid">${list.slice(0,shown).map(m=>clCell(m,sel.has(mkey(m)),m.kind==='video'||m.size>20e6?fmtB(m.size):'')).join('')}</div>${list.length>shown?'<button class="btn block ghost" id="clMore">Mehr laden</button>':''}<div class="sheet-foot"><button class="btn pri block" id="clGo"></button></div>`,s=>{
 const go=s.querySelector('#clGo');const upd=()=>{const l=[...sel].map(k=>by[k]);go.textContent=l.length?`${l.length} in den Papierkorb (${fmtB(sumB(l))})`:'Nichts ausgewählt';go.disabled=!l.length};upd();clPick(s,sel,upd,()=>({list:list.slice(0,shown),group:false}));
 const redraw=()=>{s.querySelector('#clGrid').innerHTML=list.slice(0,shown).map(m=>clCell(m,sel.has(mkey(m)),m.kind==='video'||m.size>20e6?fmtB(m.size):'')).join('');upd()};
 s.querySelector('#clAll').onclick=()=>{list.forEach(m=>sel.add(mkey(m)));redraw()};s.querySelector('#clNone').onclick=()=>{sel.clear();redraw()};
 const more=s.querySelector('#clMore');more&&(more.onclick=async()=>{shown=Math.min(list.length,shown+60);more.textContent='Lade …';await clThumbs(list.slice(0,shown));redraw();if(shown>=list.length)more.remove();else more.textContent='Mehr laden'});
 go.onclick=async()=>{const l=[...sel].map(k=>by[k]);if(await clTrashMedia(l)){closeSheet();render()}}})}
async function clEventSheet(){const ev=CL.events;await clThumbs(ev.flatMap(e=>e.items.slice(0,4)));CL.busy='';render();
 sheet(`<h2>Ereignisse zu Alben</h2><p class="small muted">Fotos, die am selben Tag oder Ausflug entstanden sind. Gib einem Ereignis einen Namen, dann legt Kleinkram ein Album (Ordner „Bilder/Name“) an. Android fragt einmal nach deiner Erlaubnis.</p>
 <div class="stack">${ev.map(e=>`<div class="card stack" style="padding:10px"><div class="row between"><b>${dRange(e.from,e.to)}</b><span class="small muted">${e.items.length} · ${fmtB(sumB(e.items))}</span></div><div class="cl-grid">${e.items.slice(0,4).map(m=>{const t=CL.thumbs[mkey(m)];return`<span class="cl-cell" style="cursor:default">${t?`<img src="${t.src}" alt="">`:''}</span>`}).join('')}</div><input class="inp" data-ev="${e.id}" placeholder="Name, z. B. Hochzeit Lisa" autocomplete="off"></div>`).join('')}</div>
 <div class="sheet-foot"><button class="btn pri block" id="clGo">Alben anlegen</button></div>`,s=>{s.querySelector('#clGo').onclick=async()=>{
  const items=[];let n=0;s.querySelectorAll('[data-ev]').forEach(i=>{const name=i.value.trim().replace(/[\\/:*?"<>|]/g,'').slice(0,60);if(!name)return;const e=ev.find(x=>x.id===i.dataset.ev);n++;e.items.forEach(m=>items.push({id:m.id,kind:m.kind,path:'Pictures/'+name}))});
  if(!items.length){toast('Gib mindestens einem Ereignis einen Namen.');return}
  try{const r=await AR().moveMedia({items});if(!r||!r.ok){toast('Abgebrochen. Nichts wurde verschoben.');return}clStore().runs++;save();closeSheet();pts(5*n,'Alben angelegt');toast(`${r.moved} Fotos in ${n} Album${n>1?'en':''} verschoben${r.failed?` · ${r.failed} gingen nicht`:''}`);await clRun('Aktualisiere …',clScanMedia)}catch(e){toast('Ging nicht: '+(e&&e.message||e))}}})}
async function clTrashSheet(){await clRun('Öffne Papierkorb …',async()=>{const r=await AR().scanMedia({trashed:true});CL.trash=(r.items||[]).sort((a,b)=>b.taken-a.taken);await clThumbs(CL.trash.slice(0,120))});const list=CL.trash||[];
 if(!list.length)return toast('Der Papierkorb ist leer.');const sel=new Set(list.map(mkey));const by={};list.forEach(m=>by[mkey(m)]=m);
 sheet(`<h2>Papierkorb</h2><p class="small muted">${nD(list.length)} · ${fmtB(sumB(list))}. Android löscht sie nach 30 Tagen automatisch. Markiert ist alles. Du kannst zurückholen oder sofort endgültig löschen.</p><div class="cl-grid">${list.slice(0,120).map(m=>clCell(m,true,'')).join('')}</div>${list.length>120?`<p class="small muted">Und ${list.length-120} weitere, die beim Löschen mit dabei sind.</p>`:''}
 <div class="sheet-foot stack"><button class="btn block" id="clBack"></button><button class="btn block danger" id="clDel"></button></div>`,s=>{const b=s.querySelector('#clBack'),d=s.querySelector('#clDel');
  const pickd=()=>list.filter((m,i)=>i>=120||sel.has(mkey(m)));const upd=()=>{const l=pickd();b.textContent=`${l.length} zurückholen`;d.textContent=`${l.length} endgültig löschen (${fmtB(sumB(l))})`;b.disabled=d.disabled=!l.length};upd();clPick(s,sel,upd,()=>({list:list.slice(0,120),group:false}));
  b.onclick=async()=>{const l=pickd();const r=await AR().trashMedia({items:l.map(m=>({id:m.id,kind:m.kind})),restore:true});if(r&&r.ok){closeSheet();toast(`${l.length} zurückgeholt`);CL.media=null;CL.trash=null;await clRun('Aktualisiere …',clScanMedia)}else toast('Abgebrochen.')};
  d.onclick=async()=>{const l=pickd();const r=await AR().deleteMedia({items:l.map(m=>({id:m.id,kind:m.kind}))});if(r&&r.ok){closeSheet();CL.trash=null;stamp('Platz frei');toast(`${fmtB(sumB(l))} freigegeben`);render()}else toast('Abgebrochen.')}})}
function clFileRow(x,i){const f=x.f;return`<label class="li" style="cursor:pointer"><input type="checkbox" data-fi="${i}" ${x.on?'checked':''} style="width:22px;height:22px;accent-color:var(--crit);flex:none"><div class="grow"><p style="overflow-wrap:anywhere">${esc(f.name)}</p><p class="small muted" style="overflow-wrap:anywhere">${esc(f.path.slice(0,f.path.length-f.name.length).replace(/\/$/,'')||'/')} · ${fmtB(f.size)} · ${fmtDate(iso(new Date(f.mod)))}${x.note?` · <b>${esc(x.note)}</b>`:''}</p></div></label>`}
function clFileSheet(title,rows){rows=rows.slice(0,400);
 sheet(`<h2>${esc(title)}</h2><p class="small muted">Angehakte Dateien kommen in den Ordner „Kleinkram-Papierkorb“. Von dort kannst du sie zurückholen oder endgültig löschen.</p><div class="row"><button class="btn sm" id="clAll">Alle</button><button class="btn sm ghost" id="clNone">Keine</button></div><div class="card" style="padding:4px 0">${rows.map(clFileRow).join('')}</div><div class="sheet-foot"><button class="btn pri block" id="clGo"></button></div>`,s=>{
 const go=s.querySelector('#clGo'),boxes=[...s.querySelectorAll('[data-fi]')];const pick=()=>boxes.filter(b=>b.checked).map(b=>rows[+b.dataset.fi].f);
 const upd=()=>{const l=pick();go.textContent=l.length?`${l.length} in den Papierkorb (${fmtB(sumB(l))})`:'Nichts ausgewählt';go.disabled=!l.length};upd();boxes.forEach(b=>b.onchange=upd);
 s.querySelector('#clAll').onclick=()=>{boxes.forEach(b=>b.checked=true);upd()};s.querySelector('#clNone').onclick=()=>{boxes.forEach(b=>b.checked=false);upd()};
 go.onclick=async()=>{const l=pick();try{await clTrashFiles(l);closeSheet();render()}catch(e){toast('Ging nicht: '+(e&&e.message||e))}}})}
function clSortSheet(){const g={};CL.fcat.sort.forEach(f=>{const k=fileGroup(f);(g[k]=g[k]||[]).push(f)});const keys=Object.keys(g).sort((a,b)=>g[b].length-g[a].length);
 sheet(`<h2>Download sortieren</h2><p class="small muted">Kleinkram verschiebt die Dateien aus „Download“ in Ordner unter <b>Dokumente/Kleinkram</b>. Mit „Rückgängig“ kommt alles zurück.</p><div class="card" style="padding:4px 0">${keys.map(k=>`<label class="li" style="cursor:pointer"><input type="checkbox" data-g="${esc(k)}" ${k!=='Sonstiges'?'checked':''} style="width:22px;height:22px;accent-color:var(--stamp);flex:none"><div class="grow"><p><b>${esc(k)}</b></p><p class="small muted" style="overflow-wrap:anywhere">${g[k].length} · ${fmtB(sumB(g[k]))} · z. B. ${esc(g[k].slice(0,2).map(f=>f.name).join(', '))}</p></div></label>`).join('')}</div><div class="sheet-foot"><button class="btn pri block" id="clGo">Sortieren</button></div>`,s=>{
 s.querySelector('#clGo').onclick=async()=>{const ks=[...s.querySelectorAll('[data-g]')].filter(b=>b.checked).map(b=>b.dataset.g);if(!ks.length){toast('Nichts ausgewählt.');return}const log=[];let fail=0;
  for(const k of ks){const r=await AR().moveFiles({paths:g[k].map(f=>f.path),target:'Documents/Kleinkram/'+k});(r.moved||[]).forEach(m=>log.push({orig:m.from,now:m.to}));fail+=r.failed||0}
  clStore().lastMove=log;clStore().runs++;save();clDropFiles(log.map(m=>m.orig));closeSheet();pts(5,'Download sortiert');toast(`${nD(log.length)} einsortiert${fail?` · ${fail} gingen nicht`:''}`);CL.files=null;await clRun('Aktualisiere …',clScanFiles)}})}
function clFileTrashSheet(){const ft=clStore().fileTrash;
 sheet(`<h2>Kleinkram-Papierkorb</h2><p class="small muted">${nD(ft.length)} · ${fmtB(sumB(ft))}. Angehakte kannst du zurücklegen oder endgültig löschen.</p><div class="card" style="padding:4px 0">${ft.map((x,i)=>clFileRow({f:{name:x.orig.split('/').pop(),path:x.orig,size:x.size,mod:P(x.d).getTime()},on:true,note:'gelöscht '+fmtD(x.d)},i)).join('')}</div>
 <div class="sheet-foot stack"><button class="btn block" id="clBack">Zurücklegen</button><button class="btn block danger" id="clDel">Endgültig löschen</button></div>`,s=>{const boxes=[...s.querySelectorAll('[data-fi]')];const pick=()=>boxes.filter(b=>b.checked).map(b=>ft[+b.dataset.fi]);
 s.querySelector('#clBack').onclick=async()=>{const l=pick();if(!l.length)return;const r=await AR().restoreFiles({pairs:l.map(x=>({now:x.now,orig:x.orig}))});const ok=new Set((r.done||[]).map(d=>d.now));clStore().fileTrash=ft.filter(x=>!ok.has(x.now));save();closeSheet();toast(`${nD(ok.size)} zurückgelegt`);CL.files=null;render()};
 s.querySelector('#clDel').onclick=()=>{const l=pick();if(!l.length)return;confirmSheet('Endgültig löschen?',`${nD(l.length)} (${fmtB(sumB(l))}) werden unwiderruflich gelöscht.`,'Endgültig löschen',async()=>{const r=await AR().deleteFiles({paths:l.map(x=>x.now)});const gone=new Set(l.map(x=>x.now));clStore().fileTrash=ft.filter(x=>!gone.has(x.now));clStore().freed+=r.bytes||0;save();stamp('Platz frei');toast(`${fmtB(r.bytes||0)} freigegeben`);render()},true)}})}
async function clUndoMove(){const lm=clStore().lastMove||[];if(!lm.length)return;const r=await AR().restoreFiles({pairs:lm.map(x=>({now:x.now,orig:x.orig}))});clStore().lastMove=null;save();toast(`${nD((r.done||[]).length)} zurück in Download`);CL.files=null;render()}

/* ---------- Rechnungen & Briefe in Fotos finden ---------- */
const BELEG_KW=[[/\b[A-Z]{2}\d{2}(?:\s?[0-9A-Z]{4}){3,7}/,4],[/rechnung/i,3],[/mahnung|zahlungserinnerung|letzte erinnerung/i,4],[/rechnungs-?n(umme)?r|kunden-?n(umme)?r|vertrags-?n(umme)?r|aktenzeichen/i,2],
 [/f[äa]llig|zahlbar bis|zahlungsziel|bitte überweisen/i,2],[/gesamtbetrag|rechnungsbetrag|endbetrag|zu zahlen|betrag/i,2],[/\d{1,3}(?:\.\d{3})*,\d{2}\s?(?:€|eur)/i,2],[/ust|mwst|umsatzsteuer/i,1],
 [/bescheid|finanzamt|steuer-?id|steuernummer|krankenkasse|rentenversicherung|jobcenter/i,3],[/vertrag|kündigung|versicherung|police|beitrag/i,2],[/sehr geehrte|mit freundlichen gr/i,2],[/frist|innerhalb von \d+ (tagen|wochen)|bis zum \d/i,1]];
function belegScore(t){let s=0;for(const[r,w]of BELEG_KW)if(r.test(t))s+=w;if(t.length<200)s-=3;return s}
const galSeen=()=>new Set([...(S.galSeen||[]),...S.docs.filter(d=>d.galId).map(d=>String(d.galId))]);
async function clFindBelege(){const seen=galSeen(),since=Date.now()-120*864e5;
 const cand=CL.media.filter(m=>m.kind==='image'&&m.taken>=since&&!seen.has(String(m.id))&&!/sticker|gif/i.test(m.mime+m.path)).sort((a,b)=>b.taken-a.taken).slice(0,400);
 if(!cand.length){CL.belege=[];return}
 let h=null;try{h=await AR().addListener('belegFortschritt',p=>clBusy(`Lese Fotos … ${p.i} von ${p.n}`))}catch(e){}
 let r;try{r=await AR().belegeSuchen({items:cand.map(m=>({id:m.id,kind:'image'})),size:1600})}finally{try{h&&h.remove()}catch(e){}}
 const by={};cand.forEach(m=>by[m.id]=m);
 CL.belege=(r.items||[]).map(x=>{const m=by[x.id];if(!m)return null;const t=String(x.text||''),sc=belegScore(t);if(sc<5)return null;const d=parseInvoiceText(t);
  const inv=!!(d.iban||/rechnung|mahnung|zahlungserinnerung/i.test(t)&&d.amount);return{m,text:t,score:sc,inv,d,title:inv?(d.payee||'Rechnung'):(guessDocTitle(t)||'Brief')}}).filter(Boolean)}
async function belegeSheet(){const L=CL.belege;await clThumbs(L.map(b=>b.m));CL.busy='';render();
 sheet(`<h2>Belege in deinen Fotos</h2><p class="small muted">${L.length} Foto${L.length>1?'s sehen':' sieht'} nach Rechnung oder Brief aus. Übernehmen legt eine Kopie in die Ablage – mit IBAN, Betrag und Fristen, soweit erkannt. Das Foto in der Galerie bleibt unverändert.</p>
 <div id="blList">${L.map((b,i)=>{const th=CL.thumbs[mkey(b.m)];return`<div class="li" data-bl="${i}"><img src="${th&&th.src||''}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex:none;cursor:zoom-in" data-blv="${i}"><div class="grow"><p><b>${esc(b.title)}</b></p><p class="small muted">${b.inv?'<span class="chip warn">Rechnung</span> ':'<span class="chip">Brief</span> '}${b.d.amount?eur(b.d.amount)+' · ':''}${fmtDate(iso(new Date(b.m.taken)))}</p><div class="row" style="margin-top:6px"><button class="btn sm pri" data-bla="${i}">Übernehmen</button><button class="btn sm ghost" data-blx="${i}">Kein Beleg</button></div></div></div>`}).join('')}</div>`,s=>{
  s.querySelectorAll('[data-blx]').forEach(b=>b.onclick=()=>{const x=L[+b.dataset.blx];S.galSeen=[...(S.galSeen||[]),String(x.m.id)].slice(-3000);save();CL.belege=L.filter(y=>y!==x);if(!CL.belege.length){closeSheet();render();return}belegeSheet()});
  s.querySelectorAll('[data-blv]').forEach(b=>b.onclick=()=>clViewer([L[+b.dataset.blv].m],0,new Set(),()=>{}));
  s.querySelectorAll('[data-bla]').forEach(b=>b.onclick=async()=>{const x=L[+b.dataset.bla];b.disabled=true;b.textContent='Lade …';let img=null;
   try{const r=await AR().preview({id:x.m.id,kind:'image',size:1600,inline:true});img=r.src||null}catch(e){}
   CL.belege=L.filter(y=>y!==x);closeSheet();
   if(x.inv)invoiceSheet(Object.assign({},x.d,{raw:x.text.slice(0,6000),galId:String(x.m.id)}),img,'ocr');
   else newDocSheet({img,text:x.text,galId:String(x.m.id),title:x.title})})})}
