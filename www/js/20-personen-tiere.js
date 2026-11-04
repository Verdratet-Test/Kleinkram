/* Kleinkram · Personen & Tiere: Gesichter benennen, Haustiere merken – Kleinkram erkennt sie danach in neuen Fotos wieder */
"use strict";
/* Gesichter: ML Kit findet sie, MobileFaceNet macht daraus einen Merkmals-Vektor (192 Zahlen). Gleiche Person = ähnlicher Vektor.
   Tiere: Fingerabdruck aus Bildklassen (Fellfarbe/Rasse) + Farbprofil. Alles bleibt im Handy (IndexedDB). */
const LE={crops:{},F:null};
const LE_KEY='kk-leute';
const LE_T=.58,LE_MARGIN=.05,LE_CLUSTER=.62;
const LE_ART={person:'Person',katze:'Katze',hund:'Hund',tier:'Tier'};
const leList=()=>S.leute=S.leute||[];
async function leBsp(){const v=await IDB.get(LE_KEY);return v&&typeof v==='object'?v:{}}
async function leSave(b){await IDB.put(LE_KEY,b)}
const vec=a=>{const v=new Float32Array(a.length);let n=0;for(let i=0;i<a.length;i++){v[i]=a[i]/1000;n+=v[i]*v[i]}n=Math.sqrt(n)||1;for(let i=0;i<v.length;i++)v[i]/=n;return v};
const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};

/* alle Gesichter aus der Analyse */
async function leFaces(){const info=await orLoad();const pool=new Map(orPoolAll().map(m=>[String(m.id),m]));const out=[];
 for(const id in info){const a=info[id];if(!a||!a.f||!pool.has(String(id)))continue;a.f.forEach((f,i)=>{if(f&&f.e)out.push({key:id+':'+i,id:String(id),m:pool.get(String(id)),b:f.b,v:vec(f.e)})})}return out}
/* auch schon einsortierte Fotos (Alben) zählen, nicht nur Kamera */
const orPoolAll=()=>(CL.media||[]).filter(m=>m.kind==='image');

/* Zuordnen: jedes Gesicht zur ähnlichsten bekannten Person – nur wenn klar genug */
function leMatch(faces,bsp){const P=leList().filter(p=>p.art==='person'),no=S.leuteNo||{},ign=new Set(S.faceIgnore||[]);
 const ex=P.map(p=>({p,v:((bsp[p.id]||{}).faces||[]).map(vec)})).filter(x=>x.v.length);const by={},unk=[];
 faces.forEach(f=>{if(ign.has(f.key))return;let best=null,b1=-1,b2=-1;
  ex.forEach(x=>{if((no[x.p.id]||[]).includes(f.key))return;const s=x.v.map(v=>dot(v,f.v)).sort((a,b)=>b-a);const sc=s.length>=3?(s[0]+s[1]+s[2])/3*.5+s[0]*.5:s[0];if(sc>b1){b2=b1;b1=sc;best=x.p}else if(sc>b2)b2=sc});
  if(best&&b1>=LE_T&&b1-b2>=LE_MARGIN){(by[best.id]=by[best.id]||[]).push(Object.assign(f,{s:b1}))}else unk.push(f)});
 return{by,unk}}
/* Unbekannte Gesichter grob gruppieren (gleiche Person = eine Gruppe) */
function leCluster(unk){const C=[];unk.forEach(f=>{let best=null,bs=0;C.forEach(c=>{const s=dot(c.c,f.v);if(s>bs){bs=s;best=c}});
  if(best&&bs>=LE_CLUSTER){best.f.push(f);const n=best.f.length;for(let i=0;i<f.v.length;i++)best.c[i]=(best.c[i]*(n-1)+f.v[i])/n;let q=Math.sqrt(dot(best.c,best.c))||1;for(let i=0;i<best.c.length;i++)best.c[i]/=q}
  else C.push({c:Float32Array.from(f.v),f:[f]})});
 return C.filter(c=>c.f.length>=2&&new Set(c.f.map(f=>f.id)).size>=2).sort((a,b)=>b.f.length-a.f.length).slice(0,10)}
/* Tiere: Fotos der Art dem ähnlichsten benannten Tier zuordnen */
async function lePets(bsp){const info=await orLoad();const pets=leList().filter(p=>p.art!=='person');const out={};if(!pets.length)return out;const no=S.leuteNo||{};
 const art2th={katze:'katzen',hund:'hunde',tier:'tiere'};
 orPoolAll().forEach(m=>{const a=info[m.id];const th=orThemeOf(a);if(!th)return;const cand=pets.filter(p=>art2th[p.art]===th);if(!cand.length)return;const F=orFeat(a);if(!F)return;
  let best=null,bd=1e9;cand.forEach(p=>{if((no[p.id]||[]).includes(String(m.id)))return;const ex=((bsp[p.id]||{}).pets||[]);if(!ex.length)return;const ds=ex.map(e=>orDist(F,e)).sort((x,y)=>x-y).slice(0,3);const d=ds.reduce((x,y)=>x+y,0)/ds.length;if(d<bd){bd=d;best=p}});
  if(best)(out[best.id]=out[best.id]||[]).push(m)});return out}
async function leCrops(list){const need=list.filter(f=>!LE.crops[f.key]).slice(0,60);if(!need.length)return;
 try{const r=await AR().gesichtBilder({items:need.map(f=>({id:+f.id,kind:'image',b:f.b,key:f.key})),size:112});Object.assign(LE.crops,r.bilder||{})}catch(e){}}

/* ---------- Übersicht ---------- */
async function leuteSheet(){let faces,M,C,pets,bsp;
 await clRun('Erkenne Personen und Tiere …',async()=>{bsp=await leBsp();faces=await leFaces();M=leMatch(faces,bsp);C=leCluster(M.unk);pets=await lePets(bsp);
  const show=[...leList().filter(p=>p.art==='person').map(p=>((bsp[p.id]||{}).faceRef)).filter(Boolean),...C.flatMap(c=>c.f.slice(0,5))];await leCrops(show);
  await clThumbs(leList().filter(p=>p.art!=='person').map(p=>{const id=(bsp[p.id]||{}).photo;return(CL.media||[]).find(m=>String(m.id)===String(id))}).filter(Boolean))});
 if(!faces)return;const info=await orLoad();const done=Object.values(info).some(a=>a&&a.v>=3);
 const P=leList();const cnt=p=>p.art==='person'?new Set((M.by[p.id]||[]).map(f=>f.id)).size:(pets[p.id]||[]).length;
 const ava=p=>{if(p.art==='person'){const r=(bsp[p.id]||{}).faceRef;const src=r&&LE.crops[r.key];return src?`<img src="${src}" alt="" class="le-ava">`:`<span class="le-ava le-ph">${esc(p.name[0]||'?')}</span>`}
  const m=(CL.media||[]).find(x=>String(x.id)===String((bsp[p.id]||{}).photo));const t=m&&CL.thumbs[mkey(m)];return t?`<img src="${t.src}" alt="" class="le-ava">`:`<span class="le-ava le-ph">${esc(p.name[0]||'?')}</span>`};
 sheet(`<h2>Personen &amp; Tiere</h2><p class="small muted">Gib Gesichtern und Haustieren einmal einen Namen – Kleinkram erkennt sie danach in neuen Fotos wieder. Je öfter du bestätigst oder korrigierst, desto genauer. Alles bleibt in deinem Handy.</p>
 ${!done?'<div class="banner"><div class="grow small">Für Gesichter erst oben „Neue Fotos anschauen“ tippen – die App schaut dabei jetzt auch nach Gesichtern.</div></div>':''}
 ${P.length?`<h3>Bekannt</h3>${P.map(p=>`<div class="li">${ava(p)}<div class="grow"><p><b>${esc(p.name)}</b></p><p class="small muted">${LE_ART[p.art]} · ${cnt(p)} Fotos</p></div><button class="btn sm" data-lp="${p.id}">Fotos</button></div>`).join('')}`:''}
 ${C.length?`<h3>Wer ist das?</h3><p class="small muted">Gesichter, die öfter vorkommen. Name eintragen (auch ein bekannter Name geht – dann lernt Kleinkram dazu).</p>
 <datalist id="leNames">${P.filter(p=>p.art==='person').map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
 ${C.map((c,i)=>`<div class="card stack" style="padding:10px"><div class="le-faces">${c.f.slice(0,5).map(f=>LE.crops[f.key]?`<img src="${LE.crops[f.key]}" alt="">`:'<span class="le-ph"></span>').join('')}<span class="small muted">${new Set(c.f.map(f=>f.id)).size} Fotos</span></div>
  <div class="row"><input class="inp grow" data-cn="${i}" list="leNames" placeholder="Name, z. B. Ayla" autocomplete="off"><button class="btn sm pri" data-cs="${i}">Merken</button></div><button class="btn sm ghost" data-ci="${i}">Niemand Bestimmtes – ausblenden</button></div>`).join('')}`:done&&!P.some(p=>p.art==='person')?'<p class="muted">Keine wiederkehrenden Gesichter gefunden.</p>':''}
 <h3>Haustiere</h3><p class="small muted">Katzen und Hunde benennst du über „Themen → Katzen → Nach Namen aufteilen“. Die Namen bleiben danach gespeichert.</p><button class="btn block" data-act="orThemes">Zu den Themen</button>`,s=>{
  s.querySelectorAll('[data-lp]').forEach(b=>b.onclick=()=>personSheet(b.dataset.lp));
  s.querySelectorAll('[data-ci]').forEach(b=>b.onclick=()=>{const c=C[+b.dataset.ci];S.faceIgnore=[...new Set([...(S.faceIgnore||[]),...c.f.map(f=>f.key)])].slice(-5000);save();leuteSheet()});
  s.querySelectorAll('[data-cs]').forEach(b=>b.onclick=async()=>{const i=+b.dataset.cs,name=s.querySelector(`[data-cn="${i}"]`).value.trim();if(!name){toast('Erst einen Namen eintragen.');return}
   const c=C[i];let p=leList().find(x=>x.art==='person'&&x.name.toLowerCase()===name.toLowerCase());if(!p){p={id:uid(),name,art:'person'};leList().push(p)}
   const B=await leBsp();B[p.id]=B[p.id]||{faces:[]};B[p.id].faces=leKeep([...(B[p.id].faces||[]),...c.f.map(f=>Array.from(f.v,x=>Math.round(x*1000)))]);if(!B[p.id].faceRef)B[p.id].faceRef={key:c.f[0].key,id:c.f[0].id,b:c.f[0].b};
   await leSave(B);save();pts(3,'Person benannt');toast(`${name} gemerkt`);leuteSheet()})})}
/* Beispiele begrenzen, möglichst unterschiedliche behalten */
function leKeep(list,max=40){if(list.length<=max)return list;const V=list.map(vec),keep=[0];while(keep.length<max){let bi=-1,bd=2;V.forEach((v,i)=>{if(keep.includes(i))return;const m=Math.max(...keep.map(k=>dot(v,V[k])));if(m<bd){bd=m;bi=i}});if(bi<0)break;keep.push(bi)}return keep.map(i=>list[i])}

/* ---------- Fotos einer Person / eines Tiers ---------- */
async function personSheet(pid){const p=leList().find(x=>x.id===pid);if(!p)return;let list=[],faces=[],bsp;
 await clRun('Suche Fotos …',async()=>{bsp=await leBsp();if(p.art==='person'){const M=leMatch(await leFaces(),bsp);faces=M.by[pid]||[];const ids=[...new Set(faces.map(f=>f.id))];list=ids.map(id=>faces.find(f=>f.id===id).m).sort((a,b)=>b.taken-a.taken)}
  else list=((await lePets(bsp))[pid]||[]).sort((a,b)=>b.taken-a.taken);await clThumbs(list.slice(0,120))});
 const sel=new Set(list.map(mkey));const by={};list.forEach(m=>by[mkey(m)]=m);const shown=list.slice(0,120);
 const base=p.art==='person'?'Personen':p.art==='katze'?(S.set.alb_katzen||'Katzen'):p.art==='hund'?(S.set.alb_hunde||'Hunde'):(S.set.alb_tiere||'Tiere');
 sheet(`<h2>${esc(p.name)}</h2><p class="small muted">${list.length} Fotos erkannt. Falsche antippen (Kreis) – dann merkt sich Kleinkram, dass ${esc(p.name)} da nicht drauf ist. „Stimmt so“ macht die Erkennung genauer.</p>
 <div class="cl-grid alb" id="clGrid">${shown.map(m=>clCell(m,true,'')).join('')}</div>${list.length>120?`<p class="small muted">… und ${list.length-120} weitere.</p>`:''}
 <details><summary class="small">Name ändern oder löschen</summary><div class="row" style="margin-top:8px"><input class="inp grow" id="leRn" value="${esc(p.name)}"><button class="btn sm" id="leRnGo">Umbenennen</button></div><button class="btn sm danger" id="leDel" style="margin-top:8px">${esc(p.name)} vergessen</button></details>
 <div class="sheet-foot stack"><button class="btn block" id="leOk">Stimmt so – merken</button><button class="btn pri block" id="leMv"></button></div>`,s=>{
  const mv=s.querySelector('#leMv');const upd=()=>{mv.textContent=sel.size?`${sel.size} in „Bilder/${base}/${p.name}“ verschieben`:'Nichts ausgewählt';mv.disabled=!sel.size};upd();
  clPick(s,sel,upd,()=>({list:shown,group:false}));
  const learn=async()=>{const B=await leBsp();B[pid]=B[pid]||{};const wrong=list.filter(m=>!sel.has(mkey(m)));const right=list.filter(m=>sel.has(mkey(m)));S.leuteNo=S.leuteNo||{};
   if(p.art==='person'){S.leuteNo[pid]=[...new Set([...(S.leuteNo[pid]||[]),...faces.filter(f=>wrong.some(m=>String(m.id)===f.id)).map(f=>f.key)])].slice(-3000);
    const good=faces.filter(f=>right.some(m=>String(m.id)===f.id)).map(f=>Array.from(f.v,x=>Math.round(x*1000)));B[pid].faces=leKeep([...(B[pid].faces||[]),...good])}
   else{S.leuteNo[pid]=[...new Set([...(S.leuteNo[pid]||[]),...wrong.map(m=>String(m.id))])].slice(-3000);const info=await orLoad();B[pid].pets=(B[pid].pets||[]).concat(right.slice(0,10).map(m=>orFeat(info[m.id])).filter(Boolean)).slice(-60)}
   await leSave(B);save()};
  s.querySelector('#leOk').onclick=async()=>{await learn();toast('Gemerkt – danke!');leuteSheet()};
  mv.onclick=async()=>{await learn();const ok=await orMove([...sel].map(k=>by[k]).map(m=>({id:m.id,kind:'image',path:`Pictures/${orClean(base)}/${orClean(p.name)}`})),`nach „${p.name}“ verschoben`);if(ok)toast('Hinweis: Ein Foto kann nur in einem Album liegen.')};
  s.querySelector('#leRnGo').onclick=()=>{const n=val('leRn');if(!n)return;p.name=n;save();personSheet(pid)};
  s.querySelector('#leDel').onclick=()=>confirmSheet(`${p.name} vergessen?`,'Name und gelernte Beispiele werden gelöscht. Fotos bleiben unverändert.','Vergessen',async()=>{S.leute=leList().filter(x=>x.id!==pid);const B=await leBsp();delete B[pid];await leSave(B);if(S.leuteNo)delete S.leuteNo[pid];save();leuteSheet()},true)})}

/* Haustier-Namen aus „Nach Namen aufteilen“ dauerhaft merken */
async function lePetLearn(k,names,assign,info){const art={katzen:'katze',hunde:'hund',tiere:'tier'}[k];if(!art)return;const B=await leBsp();
 names.forEach((n,i)=>{let p=leList().find(x=>x.art===art&&x.name.toLowerCase()===n.toLowerCase());if(!p){p={id:uid(),name:n,art};leList().push(p)}
  const ids=Object.entries(assign).filter(([,v])=>v===i).map(([key])=>key.split(':')[1]);B[p.id]=B[p.id]||{};B[p.id].pets=(B[p.id].pets||[]).concat(ids.slice(0,25).map(id=>orFeat(info[id])).filter(Boolean)).slice(-60);if(!B[p.id].photo&&ids[0])B[p.id].photo=ids[0]});
 await leSave(B);save()}
