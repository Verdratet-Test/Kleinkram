/* Kleinkram · Neues sortieren: Download, Screenshots, Bildschirmaufnahmen
   - Screenshots: App steht bei Xiaomi im Dateinamen (…_com.paket.name.jpg) → Ordner pro App.
   - Bildschirmaufnahmen (und Screenshots aus Browsern/Claude): Text auf dem Bildschirm + Bild-Fingerabdruck
     werden mit den bekannten Gruppen verglichen (App-Screenshots, selbst benannte Gruppen). Unbekanntes Ähnliches
     wird als „neue Gruppe“ vorgeschlagen, du gibst ihr einen Namen – ab dann erkennt Kleinkram sie wieder.
   - Download: nach Art (Dokumente, Bilder, Videos …), Dateien mit Gruppennamen im Dateinamen in den Gruppenordner.
   Ziel: Bilder & Videos einer Gruppe → DCIM/<Name> (ein Album in der Galerie), Download-Dateien → Download/<Name|Art>.
   Nichts wird ohne Bestätigung verschoben; „Rückgängig“ legt alles zurück. Alles im Handy. */
const SO={plan:null,cache:null};
const SO_KEY='kk-sortier';
const SO_SHOT=/^(DCIM|Pictures)\/Screenshots\/?$/i;
const SO_REC=/^(DCIM|Movies|Pictures)\/(ScreenRecorder|Screenrecords?|Screen ?recordings?|Bildschirmaufnahmen?)\/?$/i;
const SO_DL=/^Download\/?$/i;
const SO_BOX=/(chrome|firefox|browser|duckduckgo|opera|brave|\.edge|emmx|vivaldi|kiwi|sbrowser|anthropic|openai|chatgpt|gemini|googlequicksearchbox|perplexity|copilot)/i;
const SO_STOP=new Set(('aber alle allem allen aller alles also auch auf aus bei beim bist bitte dann dass dein deine dem den der des dich die dies diese dieser dir doch dort durch eine einem einen einer eines euch für gibt habe haben hast hier hinter ihre ihnen ihr immer jetzt kann kein keine mehr mein meine mich mit nach nein nicht noch nur oder ohne schon sein sich sie sind über unter und uns unser vom von vor war was weil wenn werden wie wird wir wurde zum zur zwischen '+
 'this that with from your have will what when where which there their they them then than into about would could should been were here also just more some only other over such very '+
 'zurück weiter abbrechen fertig speichern teilen suchen einstellungen heute gestern morgen minuten sekunden stunden uhr nachricht nachrichten antworten senden bearbeiten löschen kopieren öffnen schließen menü '+
 'http https www com html download downloads datei dateien seite tippen tippe hinzufügen mehr weniger anzeigen').split(/\s+/));
const soPkg=n=>{const m=String(n||'').match(/^Screenshot_[\d_-]+_([A-Za-z][\w]*(?:\.[\w]+)+?)(?:-edit|-\d+)*\.(?:jpe?g|png|webp|heic)$/i);return m?m[1]:''};
const soPretty=p=>{const NAMES={'com.whatsapp':'WhatsApp','org.telegram.messenger':'Telegram','com.android.chrome':'Chrome','com.anthropic.claude':'Claude','com.miui.home':'Startbildschirm','com.mi.android.globallauncher':'Startbildschirm','com.android.systemui':'System','com.android.settings':'Einstellungen','com.instagram.android':'Instagram','com.zhiliaoapp.musically':'TikTok','com.google.android.youtube':'YouTube','com.google.android.apps.maps':'Google Maps','com.duckduckgo.mobile.android':'DuckDuckGo','com.mi.android.globalFileexplorer':'Dateimanager','de.kleinkram.app':'Kleinkram'};
 if(NAMES[p])return NAMES[p];const seg=p.split('.').filter(s=>!/^(com|de|org|net|android|app|apps|mobile|client|global|google|miui|mi|xiaomi)$/i.test(s));const s=seg[0]||p.split('.').pop();return s.charAt(0).toUpperCase()+s.slice(1)};
const soToks=t=>{const c={};String(t||'').toLowerCase().split(/[^a-zäöüß]+/).forEach(w=>{if(w.length>=4&&w.length<=24&&!SO_STOP.has(w)&&!/^(.)\1+$/.test(w))c[w]=(c[w]||0)+1});return c};
const soNorm=v=>{let s=0;for(const k in v)s+=v[k]*v[k];s=Math.sqrt(s)||1;const o={};for(const k in v)o[k]=v[k]/s;return o};
const soCos=(a,b)=>{let s=0;const[x,y]=Object.keys(a).length<Object.keys(b).length?[a,b]:[b,a];for(const k in x)if(y[k])s+=x[k]*y[k];return s};
/* Bild-Ähnlichkeit zweier Bilder: Farbverteilung (Schnittmenge) + grober Aufbau */
function soVis1(a,b){if(!a||!b||a.length<136||b.length<136)return 0;let hi=0;for(let i=0;i<64;i++)hi+=Math.min(a[i],b[i]);let gd=0;for(let i=64;i<136;i++)gd+=Math.abs(a[i]-b[i]);return .5*hi/1000+.5*Math.max(0,1-gd/72/70)}
const soVis=(A,B)=>{let m=0;(A||[]).forEach(a=>(B||[]).forEach(b=>{const v=soVis1(a,b);if(v>m)m=v}));return m};
const soName=n=>orClean(n).replace(/^\.+/,'');
const soKey=n=>soName(n).toLowerCase();
const soGr=()=>{S.sortGr=S.sortGr||[];return S.sortGr};
/* Hauptordner pro Gruppe (z. B. /Verdrahtet) mit Unterordnern nach Art – braucht „Zugriff auf alle Dateien“.
   Ohne diesen Zugriff: Bilder + Videos zusammen in DCIM/<Name> (über Android). */
const soDeep=()=>!!(CL.st||{}).files;
const soBase=()=>S.set.sortBase==='Documents'?'Documents/':'';
const SO_SUB={Installationsdateien:'APK',Dokumente:'Dokumente',Tabellen:'Dokumente','Präsentationen':'Dokumente',Rechnungen:'Dokumente','Kontoauszüge':'Dokumente','Verträge':'Dokumente','Steuer & Bescheide':'Dokumente','Lohn & Gehalt':'Dokumente',Bilder:'Bilder',Videos:'Videos',Audio:'Audio',Archive:'Archive'};
function soSub(name,kind,src){if(src==='shot')return'Screenshots';if(kind==='video')return'Videos';if(kind==='image')return'Bilder';return SO_SUB[FTYP[fext(name)]]||'Sonstiges'}
const soFull=m=>String(m.path||'').replace(/\/*$/,'/')+m.name;

async function soLoad(){if(SO.cache)return SO.cache;const v=await IDB.get(SO_KEY);SO.cache=v&&typeof v==='object'?v:{};return SO.cache}
/* Welche Dateien gehören dazu (nur die oberste Ebene der drei Ordner – schon Sortiertes bleibt in Ruhe) */
function soSources(){const M=(CL.media||[]),F=(CL.files||[]);
 const shots=M.filter(m=>SO_SHOT.test(m.path||'')),recs=M.filter(m=>SO_REC.test(m.path||'')),dlMedia=CL.files?M.filter(m=>SO_DL.test(m.path||'')):[];
 const dlNames=new Set(dlMedia.map(m=>m.name));const files=F.filter(f=>/^Download\/[^/]+$/.test(f.path)&&!dlNames.has(f.name)&&!/\.(crdownload|part|tmp)$/i.test(f.name));
 return{shots,recs,dlMedia,files}}

async function soAnalyse(list){const cache=await soLoad();const need=list.filter(m=>!cache[mkey(m)]).sort((a,b)=>b.taken-a.taken).slice(0,400);if(!need.length)return;
 let done=0;for(let i=0;i<need.length;i+=25){const part=need.slice(i,i+25);let h=null;
  try{h=await AR().addListener('sortFortschritt',p=>clBusy(`Schaue Bildschirme an … ${done+p.i} von ${need.length}`))}catch(e){}
  let r;try{r=await AR().sortAnalyse({items:part.map(m=>({id:m.id,kind:m.kind}))})}finally{try{h&&h.remove()}catch(e){}}
  (r.items||[]).forEach(o=>{const m=part.find(x=>x.id===o.id&&x.kind===o.kind)||part.find(x=>x.id===o.id);if(m)cache[mkey(m)]={t:String(o.t||'').slice(0,3000),v:o.v||[],at:Date.now()}});
  done+=part.length;await IDB.put(SO_KEY,cache)}}

/* ---------- Vorschläge berechnen ---------- */
async function soPlan(){const src=soSources(),cache=await soLoad();
 // App-Namen für Screenshots
 const pk=[...new Set(src.shots.map(m=>soPkg(m.name)).filter(Boolean))];let names={};
 if(pk.length){try{names=(await AR().appNamen({pakete:pk})).namen||{}}catch(e){}}
 const label=p=>names[p]||soPretty(p);
 // Merkmale
 const items=[...src.shots,...src.recs,...src.dlMedia].map(m=>{const c=cache[mkey(m)]||{};const p=soPkg(m.name);return{m,pkg:p,box:!p||SO_BOX.test(p),tf:soToks(c.t),v:c.v||[],src:SO_REC.test(m.path||'')?'rec':SO_SHOT.test(m.path||'')?'shot':'dl'}});
 const df={};items.forEach(x=>{for(const k in x.tf)df[k]=(df[k]||0)+1});const N=items.length+1;
 const idf=k=>Math.log((N+1)/((df[k]||0)+1))+1;
 items.forEach(x=>{const v={};for(const k in x.tf)v[k]=(1+Math.log(x.tf[k]))*idf(k);x.tv=soNorm(v);x.nt=Object.keys(x.tf).length});
 // Gruppen: gespeicherte + aus App-Screenshots (mind. 3 Stück, keine Browser/Claude)
 const G={};const add=(name,from)=>{const k=soKey(name);if(!k)return null;if(!G[k])G[k]={key:k,name:soName(name),members:[],tv:{},ex:[],saved:null,from,toks:k.split(/[^a-zäöüß]+/).filter(w=>w.length>=4)};return G[k]};
 const gr=soGr();for(const g of gr){const x=add(g.name,'saved');x.saved=g;x.words=g.words||{};x.ex=(await IDB.get('sortgr-'+g.id))||[]}
 const byPkg={};items.filter(x=>x.src==='shot'&&x.pkg&&!x.box).forEach(x=>(byPkg[x.pkg]=byPkg[x.pkg]||[]).push(x));
 Object.entries(byPkg).forEach(([p,L])=>{const g=add(label(p),'app');g.pkg=p;L.forEach(x=>{x.fix=g.key})});
 Object.values(G).forEach(g=>{const tv={};const mem=items.filter(x=>x.fix===g.key);mem.forEach(x=>{for(const k in x.tv)tv[k]=(tv[k]||0)+x.tv[k]});for(const k in (g.words||{}))tv[k]=(tv[k]||0)+g.words[k]*Math.max(1,mem.length/3);g.tv=soNorm(tv);
  g.ex=g.ex.concat(mem.flatMap(x=>x.v.slice(0,1))).slice(-30)});
 // Zuordnen: Text (Ähnlichkeit + Name kommt vor) und Bild
 const score=(x,g)=>{const t=soCos(x.tv,g.tv),v=soVis(x.v,g.ex),hit=g.toks.some(w=>x.tf[w])?.35:0;return x.nt>=3?.62*t+.38*v+hit:hit+(v>=.86?v*.6:v*.35)};
 const groups={};const grp=g=>groups[g.key]=groups[g.key]||{key:g.key,name:g.name,from:g.from,saved:g.saved,media:[],files:[],on:true};
 const loose=[];
 items.forEach(x=>{if(x.fix){grp(G[x.fix]).media.push({m:x.m,x,s:1});return}
  let b=null,bs=0,s2=0;Object.values(G).forEach(g=>{const s=score(x,g);if(s>bs){s2=bs;bs=s;b=g}else if(s>s2)s2=s});
  if(x.src==='dl'&&!(b&&b.toks.some(w=>x.tf[w])&&bs>=.6)){loose.push(x);return}
  if(b&&bs>=.42&&bs-s2>=.08){grp(b).media.push({m:x.m,x,s:bs,unsure:bs<.55});return}
  loose.push(x)});
 // Ähnliches ohne Gruppe → neue Gruppen-Vorschläge (Text, Bild, kurz nacheinander aufgenommen)
 const sim=(a,b)=>{const t=a.nt>=3&&b.nt>=3?soCos(a.tv,b.tv):0,v=soVis(a.v,b.v),dt=Math.abs((a.m.taken||0)-(b.m.taken||0))<30*60e3?.12:0;return(a.nt>=3&&b.nt>=3?.62*t+.38*v:v*.55)+dt};
 const cl=[];loose.filter(x=>x.src!=='dl').sort((a,b)=>a.m.taken-b.m.taken).forEach(x=>{let best=null,bs=0;cl.forEach(c=>{const smp=c.items.slice(-8);const s=smp.reduce((a,y)=>a+sim(x,y),0)/smp.length;if(s>bs){bs=s;best=c}});
  if(best&&bs>=.45)best.items.push(x);else cl.push({items:[x]})});
 const fresh=[],rest=[];cl.forEach(c=>{if(c.items.length>=2){const w={};c.items.forEach(x=>{for(const k in x.tv)w[k]=(w[k]||0)+x.tv[k]});c.words=Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e[0]);fresh.push(c)}else rest.push(...c.items)});
 // Browser/Claude-Screenshots ohne Gruppe: in den Ordner ihrer App
 rest.filter(x=>x.src==='shot'&&x.pkg).forEach(x=>{const g=grp(add(label(x.pkg),'app'));g.media.push({m:x.m,x,s:1});x.done=true});
 // Download: Dateien mit Gruppennamen im Namen → Gruppe, sonst nach Art; Download-Bilder/-Videos ohne Gruppe → nach Art
 const types={};const typeOf=n=>{const f={name:n};const k=fileGroup(f);return k==='Installationsdateien'?'Apps':k};
 const dlFiles=src.files.map(f=>({f,path:f.path,name:f.name,size:f.size}));
 loose.filter(x=>x.src==='dl').forEach(x=>dlFiles.push({f:null,m:x.m,path:'Download/'+x.m.name,name:x.m.name,size:x.m.size}));
 Object.values(groups).forEach(g=>{g.media=g.media.filter(e=>{if(e.x.src!=='dl')return true;dlFiles.push({f:null,m:e.m,path:'Download/'+e.m.name,name:e.m.name,size:e.m.size,to:g.key});return false})});
 dlFiles.forEach(d=>{if(!d.to){const t=soToks(d.name.replace(/[_.-]+/g,' '));const g=Object.values(G).find(g=>g.toks.length&&g.toks.every(w=>t[w]));if(g)d.to=g.key}
  if(d.to){grp(G[d.to]).files.push(d)}else{const k=typeOf(d.name);(types[k]=types[k]||[]).push(d)}});
 const leftover=rest.filter(x=>!x.done).length;
 SO.plan={groups:Object.values(groups).filter(g=>g.media.length||g.files.length).sort((a,b)=>(b.media.length+b.files.length)-(a.media.length+a.files.length)),
  fresh:fresh.sort((a,b)=>b.items.length-a.items.length),types,leftover,G,
  typesOff:{Sonstiges:true},counts:{shots:src.shots.length,recs:src.recs.length,dl:src.files.length+src.dlMedia.length},filesOk:!!CL.files};
 return SO.plan}

/* ---------- Ablauf ---------- */
async function soRun(){const st=CL.st||{};if(!CAP){toast('Geht nur in der Android-App.');return}
 if(st.media!=='granted'){toast('Erst den Zugriff auf Fotos erlauben.');return}
 await clRun('Schaue nach Neuem …',async()=>{await clScanMedia();if(st.files)await clScanFiles();
  const src=soSources();await soAnalyse([...src.recs,...src.shots,...src.dlMedia]);
  await soPlan();const P=SO.plan;await clThumbs([...P.groups.flatMap(g=>g.media.slice(0,6).map(e=>e.m)),...P.fresh.flatMap(c=>c.items.slice(0,6).map(x=>x.m))])});
 if(SO.plan)soSheet()}

const soStrip=L=>`<div class="so-strip">${L.slice(0,6).map(m=>{const t=CL.thumbs[mkey(m)];return`<span class="so-th">${t?`<img src="${t.src}" alt="">`:''}${m.kind==='video'?'<i>▶</i>':''}</span>`}).join('')}${L.length>6?`<span class="so-more">+${L.length-6}</span>`:''}</div>`;
const soCount=(media,files)=>{const v=media.filter(e=>(e.m||e).kind==='video').length,i=media.length-v;return[v?`${v} ${v===1?'Video':'Videos'}`:'',i?`${i} ${i===1?'Bild':'Bilder'}`:'',files&&files.length?nD(files.length):''].filter(Boolean).join(' · ')};

function soWhere(g){if(!soDeep())return`${g.media.length?`Album <b>${esc(g.name)}</b>`:''}${g.media.length&&g.files.length?' + ':''}${g.files.length?`Download/${esc(g.name)}`:''}`;
 const subs=[...new Set([...g.media.map(e=>soSub(e.m.name,e.m.kind,e.x.src)),...g.files.map(d=>soSub(d.name,d.m?d.m.kind:'',''))])];return`Ordner <b>${esc(soBase()?'Dokumente/':'')}${esc(g.name)}</b> mit ${subs.map(esc).join(', ')}`}
function soSheet(){const P=SO.plan;const names=[...new Set([...P.groups.map(g=>g.name),...soGr().map(g=>g.name)])];
 const tk=Object.keys(P.types).sort((a,b)=>P.types[b].length-P.types[a].length);
 const gHtml=P.groups.map((g,i)=>{const uns=g.media.filter(e=>e.unsure).length;return`<div class="so-g">
  <label class="so-hd"><input type="checkbox" data-sg="${i}" ${g.on?'checked':''}><input class="inp so-name" data-sn="${i}" value="${esc(g.name)}" aria-label="Ordnername"></label>
  <p class="small muted">${soCount(g.media,g.files)}${uns?` · <b style="color:var(--warn)">${uns} unsicher</b>`:''} → ${soWhere(g)}</p>
  ${g.media.length?soStrip(g.media.map(e=>e.m)):''}${g.media.length?`<button class="btn sm ghost" data-sv="${i}">Einzeln ansehen</button>`:''}</div>`}).join('');
 const fHtml=P.fresh.map((c,i)=>`<div class="so-g so-new"><p><b>${soCount(c.items.map(x=>x.m))}</b> sehen zusammengehörig aus</p>${c.words.length?`<p class="small muted">Erkannt: ${c.words.map(esc).join(', ')}</p>`:''}${soStrip(c.items.map(x=>x.m))}
  <input class="inp" data-fn="${i}" list="soNames" placeholder="Name, z. B. Verdrahtet (leer = bleibt liegen)" value="${esc(c.name||'')}" autocomplete="off"><button class="btn sm ghost" data-fv="${i}">Einzeln ansehen</button></div>`).join('');
 const tHtml=tk.map(k=>`<label class="li" style="cursor:pointer"><input type="checkbox" data-st="${esc(k)}" ${(P.typesOff||{})[k]?'':'checked'} style="width:22px;height:22px;accent-color:var(--stamp);flex:none"><div class="grow"><p><b>${esc(k)}</b> <span class="small muted">→ Download/${esc(k)}</span></p><p class="small muted" style="overflow-wrap:anywhere">${P.types[k].length} · ${fmtB(sumB(P.types[k]))} · z. B. ${esc(P.types[k].slice(0,2).map(d=>d.name).join(', '))}</p></div></label>`).join('');
 const empty=!P.groups.length&&!P.fresh.length&&!tk.length;
 sheet(`<h2>Neues sortieren</h2><p class="small muted">Aus <b>Screenshots</b> (${P.counts.shots}), <b>Bildschirmaufnahmen</b> (${P.counts.recs}) und <b>Download</b> (${P.filesOk?P.counts.dl:'kein Zugriff'}). ${soDeep()?'Alles einer Gruppe kommt in einen <b>Hauptordner</b> (z. B. „Verdrahtet“), darin Unterordner nach Art: Videos, Screenshots, Bilder, APK, Dokumente …':'Bilder und Videos einer Gruppe kommen zusammen in ein Album (Ordner DCIM/Name), Download-Dateien in Unterordner von Download. Für Hauptordner mit Unterordnern unten bei „Dateien“ den Zugriff auf alle Dateien erlauben.'} Übriges aus Download wird nach Art sortiert. Namen kannst du ändern, Haken weg = bleibt liegen.</p>
 ${soDeep()?`<label class="f">Hauptordner anlegen<select class="inp" id="soBase"><option value="" ${soBase()?'':'selected'}>direkt im Speicher (z. B. /Verdrahtet)</option><option value="Documents" ${soBase()?'selected':''}>im Ordner Dokumente (z. B. Dokumente/Verdrahtet)</option></select></label>`:''}
 <datalist id="soNames">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
 ${empty?'<div class="card"><p>Alles ordentlich – nichts Neues zum Sortieren.</p></div>':''}
 ${P.groups.length?`<h3 class="so-h">Nach App und Thema</h3>${gHtml}`:''}
 ${P.fresh.length?`<h3 class="so-h">Neue Gruppen – wie heißen sie?</h3><p class="small muted">Ein Name reicht: Kleinkram merkt sich, wie die Gruppe aussieht, und sortiert Neues künftig selbst dazu.</p>${fHtml}`:''}
 ${tk.length?`<h3 class="so-h">Download nach Art</h3><div class="card" style="padding:4px 0">${tHtml}</div>`:''}
 ${P.leftover?`<p class="small muted">${P.leftover} Aufnahmen passen zu keiner Gruppe und bleiben, wo sie sind.</p>`:''}
 ${!P.filesOk?'<p class="small muted">Für den Download-Ordner braucht Kleinkram den Zugriff auf alle Dateien (unten bei „Dateien“).</p>':''}
 <div class="sheet-foot"><button class="btn pri block" id="soGo" ${empty?'disabled':''}>Sortieren</button></div>`,s=>{
  const upd=()=>{const n=soChosen().total;const b=s.querySelector('#soGo');b.textContent=n?`${n} Dateien sortieren`:'Nichts ausgewählt';b.disabled=!n};
  s.querySelectorAll('[data-sg]').forEach(b=>b.onchange=()=>{P.groups[+b.dataset.sg].on=b.checked;upd()});
  s.querySelectorAll('[data-sn]').forEach(b=>b.oninput=()=>{P.groups[+b.dataset.sn].name=soName(b.value)});
  s.querySelectorAll('[data-fn]').forEach(b=>b.oninput=()=>{P.fresh[+b.dataset.fn].name=soName(b.value);upd()});
  s.querySelectorAll('[data-st]').forEach(b=>b.onchange=()=>{P.typesOff=P.typesOff||{};P.typesOff[b.dataset.st]=!b.checked;upd()});
  s.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{const g=P.groups[+b.dataset.sv];soPick(g.name,g.media.map(e=>e.m),g.off=g.off||new Set(),g.media.filter(e=>e.unsure).map(e=>mkey(e.m)))});
  s.querySelectorAll('[data-fv]').forEach(b=>b.onclick=()=>{const c=P.fresh[+b.dataset.fv];soPick(c.name||'Neue Gruppe',c.items.map(x=>x.m),c.off=c.off||new Set(),[])});
  const bs=s.querySelector('#soBase');if(bs)bs.onchange=()=>{S.set.sortBase=bs.value;save();soSheet()};
  s.querySelector('#soGo').onclick=soDo;upd()})}

/* Einzelne Bilder abwählen; danach zurück zur Übersicht */
async function soPick(title,list,off,unsure){await clThumbs(list);const sel=new Set(list.map(mkey).filter(k=>!off.has(k)));const us=new Set(unsure);
 sheet(`<h2>${esc(title)}</h2><p class="small muted">Antippen = auswählen oder abwählen. Abgewählte bleiben liegen.${us.size?' „unsicher“ = Kleinkram ist sich nicht ganz sicher.':''}</p><div class="cl-grid">${list.map(m=>clCell(m,sel.has(mkey(m)),us.has(mkey(m))?'unsicher':'')).join('')}</div><div class="sheet-foot"><button class="btn pri block" id="soBack">Fertig</button></div>`,s=>{
  s.addEventListener('click',e=>{const c=e.target.closest('[data-ck]');if(!c)return;const k=c.dataset.ck;sel.has(k)?sel.delete(k):sel.add(k);clSync(s,sel)});
  s.querySelector('#soBack').onclick=()=>{off.clear();list.forEach(m=>{if(!sel.has(mkey(m)))off.add(mkey(m))});soSheet()}})}

function soChosen(){const P=SO.plan;const media=[],files=[],learn=[];
 const deep=soDeep(),root=n=>(!soBase()&&/^(android|dcim|download|documents|pictures|movies|music|alarms|notifications|podcasts|ringtones|audiobooks|recordings|miui)$/i.test(n)?'Documents/':soBase())+n;
 const putM=(m,src,name)=>{if(deep)files.push({d:{path:soFull(m),name:m.name},to:root(name)+'/'+soSub(m.name,m.kind,src)});else media.push({m,name})};
 P.groups.forEach(g=>{if(!g.on||!g.name)return;const off=g.off||new Set();const mm=g.media.filter(e=>!off.has(mkey(e.m)));mm.forEach(e=>putM(e.m,e.x.src,g.name));
  g.files.forEach(d=>files.push({d,to:deep?root(g.name)+'/'+soSub(d.name,d.m?d.m.kind:'',d.m?'dl':''):'Download/'+g.name}));if(mm.length)learn.push({name:g.name,xs:mm.map(e=>e.x)})});
 P.fresh.forEach(c=>{if(!c.name)return;const off=c.off||new Set();const xs=c.items.filter(x=>!off.has(mkey(x.m)));xs.forEach(x=>putM(x.m,x.src,c.name));if(xs.length)learn.push({name:c.name,xs})});
 Object.entries(P.types).forEach(([k,L])=>{if((P.typesOff||{})[k])return;L.forEach(d=>files.push({d,to:'Download/'+k}))});
 return{media,files,learn,total:media.length+files.length}}

/* Gruppe merken: wichtigste Wörter + bis zu 30 Beispielbilder */
async function soLearn(name,xs){const gr=soGr();let g=gr.find(x=>soKey(x.name)===soKey(name));if(!g){g={id:uid(),name:soName(name),words:{},n:0};gr.push(g)}
 const w=Object.assign({},g.words||{});xs.forEach(x=>{for(const k in x.tv)w[k]=(w[k]||0)+x.tv[k]});
 g.words=Object.fromEntries(Object.entries(soNorm(w)).sort((a,b)=>b[1]-a[1]).slice(0,40).map(([k,v])=>[k,Math.round(v*1000)/1000]));g.n=(g.n||0)+xs.length;g.at=today();
 const ex=((await IDB.get('sortgr-'+g.id))||[]).concat(xs.flatMap(x=>x.v.slice(0,2)));await IDB.put('sortgr-'+g.id,ex.slice(-30))}

async function soDo(){const C=soChosen();if(!C.total)return;const P=SO.plan;let mOk=0,fOk=0,fail=0;const mLog=[],fLog=[];
 try{
  if(C.media.length){const items=C.media.map(x=>({id:x.m.id,kind:x.m.kind,path:'DCIM/'+x.name}));const before=C.media.map(x=>({id:x.m.id,kind:x.m.kind,path:(x.m.path||'').replace(/\/+$/,'')}));const r=await AR().moveMedia({items});
   if(!r||!r.ok){toast('Abgebrochen. Nichts wurde verschoben.');return}mOk=r.moved||0;fail+=r.failed||0;mLog.push(...before)}
  const by={};C.files.forEach(x=>(by[x.to]=by[x.to]||[]).push(x.d.path));
  for(const[to,paths]of Object.entries(by)){const r=await AR().moveFiles({paths,target:to});(r.moved||[]).forEach(m=>fLog.push({orig:m.from,now:m.to}));fOk+=(r.moved||[]).length;fail+=r.failed||0}
  for(const l of C.learn)await soLearn(l.name,l.xs);
  const c=clStore();c.lastSort={media:mLog,files:fLog,at:today()};if(fLog.length)c.lastMove=fLog;c.runs++;save();
  pts(5,'Neues sortiert');closeSheet();toast(`${mOk+fOk} Dateien sortiert${fail?` · ${fail} gingen nicht`:''}`);SO.plan=null;CL.files=null;await clRun('Aktualisiere …',async()=>{await clScanMedia();if((CL.st||{}).files)await clScanFiles()})}
 catch(e){toast('Ging nicht: '+(e&&e.message||e))}}

async function soUndo(){const L=clStore().lastSort;if(!L)return;let n=0;
 try{if(L.media.length){const r=await AR().moveMedia({items:L.media.map(x=>({id:x.id,kind:x.kind,path:x.path}))});if(!r||!r.ok){toast('Abgebrochen.');return}n+=r.moved||0}
  if(L.files.length){const r=await AR().restoreFiles({pairs:L.files.map(x=>({now:x.now,orig:x.orig}))});n+=(r.done||[]).length}
  clStore().lastSort=null;clStore().lastMove=null;save();toast(`${n} Dateien zurückgelegt`);CL.files=null;await clRun('Aktualisiere …',async()=>{await clScanMedia();if((CL.st||{}).files)await clScanFiles()})}catch(e){toast('Ging nicht: '+(e&&e.message||e))}}

function soGroupsSheet(){const gr=soGr();
 sheet(`<h2>Gemerkte Gruppen</h2><p class="small muted">Daran erkennt Kleinkram neue Screenshots und Aufnahmen. Löschen vergisst nur das Gelernte – die Ordner bleiben.</p><div class="card" style="padding:4px 0">${gr.length?gr.map((g,i)=>`<div class="li"><div class="grow"><p><b>${esc(g.name)}</b></p><p class="small muted">${g.n||0} gelernt · ${esc(Object.keys(g.words||{}).slice(0,5).join(', '))}</p></div><button class="btn sm ghost" data-gd="${i}">Vergessen</button></div>`).join(''):'<div class="li"><p class="muted">Noch keine.</p></div>'}</div>`,s=>{
  s.querySelectorAll('[data-gd]').forEach(b=>b.onclick=()=>{const g=gr[+b.dataset.gd];confirmSheet(`„${g.name}“ vergessen?`,'Kleinkram ordnet dann nichts mehr automatisch dieser Gruppe zu. Ordner und Dateien bleiben unverändert.','Vergessen',async()=>{S.sortGr=gr.filter(x=>x!==g);save();try{await IDB.del('sortgr-'+g.id)}catch(e){}soGroupsSheet()},true,()=>soGroupsSheet())})})}

function soSection(){const st=CL.st||{};if(st.media!=='granted')return'';const L=clStore().lastSort,gr=soGr();
 return reg('Neues sortieren',null,`<p class="small muted">Screenshots, Bildschirmaufnahmen und Download ordnen: nach App und Thema (z. B. alles von Verdrahtet in einen Ordner „Verdrahtet“ mit Unterordnern Videos, Screenshots, APK …) und Download nach Art. Kleinkram schlägt vor, du bestätigst.</p>
 <div class="row"><button class="btn sm pri" data-act="soRun" ${CL.busy?'disabled':''}>Vorschläge machen</button>${gr.length?`<button class="btn sm ghost" data-act="soGroups">${gr.length} gemerkte Gruppen</button>`:''}</div>
 ${L&&(L.media.length||L.files.length)?`<div class="li"><div class="grow"><p><b>Zuletzt sortiert</b></p><p class="small muted">${nD(L.media.length+L.files.length)} · ${fmtD(L.at)}</p></div><button class="btn sm" data-act="soUndo">Rückgängig</button></div>`:''}`)}

document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 if(a==='soRun'){e.stopPropagation();soRun()}else if(a==='soUndo'){e.stopPropagation();soUndo()}else if(a==='soGroups'){e.stopPropagation();soGroupsSheet()}});
