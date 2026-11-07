/* Kleinkram · Einrichtung, Mehr-Bereich, Einstellungen, Designs, Plus für alles */
"use strict";
const MODS=[['kalender','📅','Kalender & Termine','Termine, Geburtstage, Dienstplan abfotografieren'],['papier','🧾','Rechnungen & Papierkram','Belege, Verträge, Briefe, Steuer, Ausweis-Fristen'],
 ['haus','🏠','Vermietung & Haus','Mieteingänge, Zähler, Nebenkostenabrechnung'],['wecker','⏰','Wecker mit Aufgabe','Klingelt, bis du wirklich wach bist'],
 ['handy','🧹','Handy aufräumen','Doppelte Fotos, Alben, Speicher frei machen'],['spiel','🏆','Punkte & Motivation','Punkte, Titel, Spar-Topf, Freizeit-Sperre']];

/* ---------- Einrichtung (erster Start, einmal auch für bisherige Nutzer) ---------- */
function setupStart(again){let step=0;const old=!!(S.tasks.length||S.events.length||S.docs.length)&&!again;const el=document.createElement('div');el.id='setupScr';document.body.appendChild(el);
 const steps=[
  ()=>`<div class="su-hero">🗂️</div><h1>${old?'Kleinkram ist aufgeräumt':'Willkommen bei Kleinkram'}</h1><p class="muted">${old?'Kleinkram kann inzwischen viel. Damit es übersichtlich bleibt, zeigen wir nur, was du wirklich brauchst. Das dauert eine Minute.':'Dein Alltag, deine Termine und dein Papierkram – an einem Ort, ohne Stress. Alles bleibt auf deinem Handy.'}</p>`,
  ()=>`<h1>Wie heißt du?</h1><p class="muted">Damit Kleinkram dich begrüßen kann. Geht auch ohne.</p><input class="inp" id="suN" value="${esc(S.name||'')}" placeholder="Dein Vorname" autocomplete="given-name" style="font-size:1.2rem">`,
  ()=>`<h1>Wofür willst du Kleinkram nutzen?</h1><p class="muted">Aufgaben und Routinen sind immer dabei. Alles andere kannst du später unter Mehr → Funktionen ändern.</p>
   <div class="su-mods">${MODS.map(([k,ic,t,d])=>`<button class="su-mod${mod(k)?' on':''}" data-m="${k}"><span class="su-ic">${ic}</span><span class="grow"><b>${t}</b><span class="small muted">${d}</span></span><span class="su-ck">${ICON.check}</span></button>`).join('')}</div>`,
  ()=>`<h1>Wähl dein Design</h1><p class="muted">Kannst du jederzeit unter Mehr → Darstellung wechseln.</p>${skinPicker()}`,
  ()=>`<div class="su-hero">✨</div><h1>Alles bereit${S.name?', '+esc(S.name):''}!</h1><p class="muted">Ein Tipp zum Start: Mit dem <b>Plus</b> unten rechts hältst du alles fest – tippen, sprechen oder ein Foto machen. Kleinkram erkennt, ob es ein Termin, eine Aufgabe, eine Rechnung oder ein Dienstplan ist.</p>`];
 const draw=()=>{el.innerHTML=`<div class="su-box"><div class="su-dots">${steps.map((_,i)=>`<i class="${i===step?'on':i<step?'done':''}"></i>`).join('')}</div><div class="su-body">${steps[step]()}</div>
  <div class="su-foot">${step>0?'<button class="btn ghost" id="suB">Zurück</button>':'<span></span>'}<button class="btn pri" id="suF">${step===steps.length-1?'Los geht’s':step===0?'Starten':'Weiter'}</button></div></div>`;
  el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const k=b.dataset.m;S.set.mods[k]=!mod(k);b.classList.toggle('on',mod(k))});
  bindSkinPicker(el);
  const n=el.querySelector('#suN');n&&setTimeout(()=>n.focus(),100);
  el.querySelector('#suF').onclick=()=>{if(n)S.name=n.value.trim();if(step<steps.length-1){step++;draw();return}S.set.setupDone=true;save();el.remove();render();scheduleAll()};
  const b=el.querySelector('#suB');b&&(b.onclick=()=>{if(n)S.name=n.value.trim();step--;draw()})};
 draw()}

/* ---------- Designs ---------- */
function skinPicker(){const cur=S.set.skin||'frisch',m=S.set.mode||'system';
 return`<div class="skins">${Object.entries(SKINS).map(([k,[n,a,b,bg,pp]])=>`<button class="skin${cur===k?' on':''}" data-skin="${k}" style="--sa:${a};--sb:${b};--sbg:${bg};--spp:${pp}"><span class="skin-pv"><i class="skin-hero"></i><i class="skin-l"></i><i class="skin-l s"></i></span><b>${n}</b></button>`).join('')}</div>
 <div class="seg" style="margin-top:12px">${[['system','Automatisch'],['light','Hell'],['dark','Dunkel']].map(([k,l])=>`<button class="${m===k?'on':''}" data-mode="${k}">${l}</button>`).join('')}</div>${cur==='nacht'?'<p class="small muted">„Nacht“ ist immer dunkel.</p>':''}`}
function bindSkinPicker(root,after){root.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{S.set.skin=b.dataset.skin;save();applySkin();root.querySelectorAll('[data-skin]').forEach(x=>x.classList.toggle('on',x===b));after&&after()});
 root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{S.set.mode=b.dataset.mode;save();applySkin();root.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('on',x===b));after&&after()})}
function designSheet(){sheet(`<h2>Darstellung</h2><p class="small muted">Farbwelt und Helligkeit. Gilt sofort.</p>${skinPicker()}`,s=>bindSkinPicker(s,()=>render()))}
function modsSheet(){sheet(`<h2>Funktionen</h2><p class="small muted">Was du nicht brauchst, blendest du aus. Deine Daten bleiben erhalten – einschalten holt alles zurück.</p>
 <div class="su-mods">${MODS.map(([k,ic,t,d])=>`<button class="su-mod${mod(k)?' on':''}" data-m="${k}"><span class="su-ic">${ic}</span><span class="grow"><b>${t}</b><span class="small muted">${d}</span></span><span class="su-ck">${ICON.check}</span></button>`).join('')}</div>`,s=>{
 s.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const k=b.dataset.m;S.set.mods[k]=!mod(k);b.classList.toggle('on',mod(k));save();render()})})}
const remSheet=()=>{sheet(ichParts().rem);if(CAP)setTimeout(notifStatus,60)};
const genSheet=()=>sheet(ichParts().set);
const dataSheet=()=>sheet(ichParts().data);
const motivSheet=()=>{const P=ichParts();sheet(P.pot+P.weg+P.log)};

/* ---------- Mehr ---------- */
function vMehr(){const L=level();const nx=typeof wNextAll==='function'?wNextAll():null;const ib=(S.inbox||[]).length;
 let h=head('Mehr',S.name?`Hallo ${esc(S.name)}`:'Werkzeuge & Einstellungen');
 h+=tip('mehr','Hier findest du alle Werkzeuge und Einstellungen. Was du nicht brauchst, schaltest du unter <b>Funktionen</b> aus.');
 const T=[[1,'kopf','🧠','Kopf leeren',ib?`${ib} zum Sortieren`:`${(S.notizen||[]).length} Notizen`],
  [mod('wecker'),'wecker','⏰','Wecker',nx?wFmtNext(nx.t):'Wecker stellen'],
  [mod('papier'),'brief','✉️','Briefe','Kündigung, Einspruch …'],
  [mod('papier'),'goFristen','🪪','Ausweise & Fristen',`${(S.ablauf||[]).length} Ausweise · ${(S.warranties||[]).length} Garantien`],
  [mod('haus'),'goHaus','🏠','Vermietung','Miete, Zähler, Nebenkosten'],
  [mod('kalender'),'planScan','📸','Plan scannen','Dienstplan → Termine'],
  [mod('handy'),'goAufr','🧹','Handy aufräumen','Doppelte, Alben, Personen'],
  [mod('spiel'),'motiv','🏆','Punkte & Spar-Topf',`${L.title} · ${eur(potNow())}`],
  [mod('spiel'),'review','🗓️','Wochen-Rückblick','5 Min, 3 Ziele']].filter(x=>x[0]);
 h+=`<div class="tiles">${T.map(([,a,ic,t,sub])=>`<button class="tile" data-act="${a}"><span class="tile-ic" aria-hidden="true">${ic}</span><b>${t}</b><span class="small muted">${esc(sub)}</span></button>`).join('')}</div>`;
 const row=(a,ic,t,sub)=>`<button class="li set-row" data-act="${a}"><span class="set-ic" aria-hidden="true">${ic}</span><div class="grow"><p><b>${t}</b></p><p class="small muted">${sub}</p></div>${ICON.right||'›'}</button>`;
 h+=reg('Einstellungen',null,row('setDesign','🎨','Darstellung',`${SKINS[S.set.skin||'frisch'][0]} · ${({system:'automatisch',light:'hell',dark:'dunkel'})[S.set.mode||'system']}`)+row('setMods','🧩','Funktionen',`${MODS.filter(m=>mod(m[0])).length} von ${MODS.length} an`)+
  (CAP?row('setRem','🔔','Erinnerungen',S.set.remind?'an':'aus'):'')+row('setGen','⚙️','Allgemein','Name, Töne, App-Sperre, Steuersätze')+row('setData','💾','Daten & Sicherung',S.lastBackup?`zuletzt gesichert ${fmtD(S.lastBackup)}`:'noch keine Sicherung')+row('setup','✨','Einrichtung neu starten','Funktionen und Design neu wählen'),true);
 h+=`<p class="small muted" style="text-align:center;margin-top:18px">Kleinkram · alles bleibt auf diesem Gerät</p>`;return h}

/* ---------- Plus für alles: Foto erkennen ---------- */
function plusTiles(){return`<div class="plus-or"><span>oder</span></div><div class="plus-tiles">
 <label class="ptile" for="spCam"><span>📷</span><b>Foto</b><small>Rechnung, Brief, Dienstplan</small></label><label class="ptile" for="spGal"><span>🖼️</span><b>Aus Galerie</b><small>wird automatisch erkannt</small></label>
 <button class="ptile" data-act="kopf"><span>🧠</span><b>Kopf leeren</b><small>mehrere Gedanken</small></button>
 ${mod('papier')?'<button class="ptile" data-act="brief"><span>✉️</span><b>Brief</b><small>Kündigung & Co.</small></button>':''}
 ${mod('wecker')?'<button class="ptile" data-act="wecker"><span>⏰</span><b>Wecker</b><small>mit Aufgabe</small></button>':''}
 </div><input type="file" id="spCam" accept="image/*" capture="environment" hidden><input type="file" id="spGal" accept="image/*" hidden>`}
async function smartPhoto(file){let im;try{im=await loadImg(file)}catch(e){toast('Das Bild ließ sich nicht öffnen.');return}const img=canvasOf(im,1400).toDataURL('image/jpeg',.72);let stop=false;
 sheet(`<h2>Schaue mir das Foto an …</h2><p class="muted" id="oM">Erkenne, was es ist …</p><span class="bar" style="width:100%"><i id="oB" style="width:8%"></i></span><button class="btn ghost" id="oX">Abbrechen</button>`,s=>s.querySelector('#oX').onclick=()=>{stop=true;closeSheet()});
 try{const q=await readQR(im);if(q){const p=parseEPC(q)||parseBezahlCode(q);if(p&&!stop){closeSheet();invoiceSheet(p,img,'qr');return}}}catch(e){}
 let text='';try{if(CAP){const r=await nativeOCR(canvasOf(im,2600));const by={};(r.lines||[]).forEach(l=>(by[l.block]=by[l.block]||[]).push(l.text));text=Object.keys(by).map(k=>by[k].join('\n')).join('\n')}
  if(!text.trim())text=await ocr(im,(msg,pr)=>{const m=$('#oM'),b=$('#oB');if(m)m.textContent=msg;if(b)b.style.width=Math.max(8,Math.round(pr*100))+'%'})}catch(e){}
 if(stop)return;closeSheet();
 const L=text.split('\n');const dated=typeof plDates==='function'?L.filter(l=>plDates(l).length).length:0;const inv=parseInvoiceText(text);
 if(dated>=5&&!inv.iban){toast('Sieht aus wie ein Plan – suche deine Zeilen');planScan(file);return}
 if(inv.iban||(inv.amount&&/rechnung|mahnung|zahlungserinnerung|zu zahlen|betrag/i.test(text))){invoiceSheet(Object.assign({},inv,{raw:text.slice(0,6000)}),img,'ocr');return}
 newDocSheet({img,text,title:text.trim()?guessDocTitle(text):''});if(!text.trim())toast('Kein Text erkannt – als Dokument ablegen?')}
document.addEventListener('change',e=>{const t=e.target;if(t&&(t.id==='spCam'||t.id==='spGal')){const f=t.files[0];t.value='';if(f){closeSheet();smartPhoto(f)}}});

/* ---------- Start: Design anwenden, ggf. Einrichtung ---------- */
applySkin();render();
if(!S.set.setupDone)setTimeout(()=>setupStart(false),300);
