/* Kleinkram · Ordnung in den Fotos: Reise-Alben (Aufnahmeort), Themen-Alben (Bildinhalt), Haustiere nach Namen */
"use strict";
/* Alles läuft im Handy: Bildinhalte erkennt Google ML Kit offline, Länder kommen aus einer mitgelieferten Karte.
   Verschoben wird nur nach Bestätigung (Android fragt zusätzlich). Ziel: Ordner „Bilder/Albumname“. */
const OR={info:null,busy:false};
const OR_KEY='kk-ordnen';
/* ---------- Themen aus den Bildlabels ---------- */
const OR_THEMEN=[
 ['katzen','Katzen',['Cat']],
 ['hunde','Hunde',['Dog']],
 ['tiere','Tiere',['Bird','Horse','Rabbit','Hamster','Turtle','Fish','Pet','Butterfly','Insect','Cattle','Duck','Goat','Sheep','Chicken']],
 ['essen','Essen & Trinken',['Food','Cuisine','Dessert','Pizza','Bread','Fruit','Vegetable','Meal','Drink','Coffee','Wine','Cookie','Sushi','Hot dog','Cheeseburger','Pasta','Bento','Cake','Cutlery','Tableware','Juice','Cocktail','Beer']],
 ['natur','Natur & Landschaft',['Sky','Mountain','Beach','Lake','Sea','River','Waterfall','Forest','Sunset','Cloud','Snow','Desert','Field','Canyon','Cave','Glacier','Iceberg','Rainbow','Moon','Star']],
 ['pflanzen','Blumen & Pflanzen',['Flower','Plant','Tree','Petal','Garden','Leaf','Moss']],
 ['fahrzeuge','Fahrzeuge',['Car','Vehicle','Motorcycle','Bicycle','Truck','Bus','Boat','Airplane','Train','Wheel','Tire','Helicopter','Tractor']],
 ['feiern','Feiern',['Party','Balloon','Wedding','Fireworks','Christmas','Bonfire','Carnival','Event','Concert','Dancing']],
 ['menschen','Selfies & Menschen',['Selfie','Smile','Crowd','Team','Beard','Baby']],
 ['dokumente','Dokumente & Zettel',['Receipt','Paper','Poster','Menu','Document','Text','Handwriting','Font','Newspaper','Book','Envelope','Whiteboard','Comics','Paper towel']],
];
const OR_TIERNAME={katzen:'Katzen',hunde:'Hunde',tiere:'Tiere'};
/* Genaueres Zusatzmodell (ImageNet, 1000 Klassen): Gruppen nach Klassennamen */
const IN_SET=a=>new Set(a.map(x=>x.toLowerCase()));
const IN={
 katzen:IN_SET(['tabby','tabby cat','tiger cat','persian cat','siamese cat','siamese','egyptian cat']),
 hunde:IN_SET(['chihuahua','japanese spaniel','maltese dog','pekinese','shih-tzu','blenheim spaniel','papillon','toy terrier','rhodesian ridgeback','afghan hound','basset','beagle','bloodhound','bluetick','black-and-tan coonhound','walker hound','english foxhound','redbone','borzoi','irish wolfhound','italian greyhound','whippet','ibizan hound','norwegian elkhound','otterhound','saluki','scottish deerhound','weimaraner','staffordshire bullterrier','american staffordshire terrier','bedlington terrier','border terrier','kerry blue terrier','irish terrier','norfolk terrier','norwich terrier','yorkshire terrier','wire-haired fox terrier','lakeland terrier','sealyham terrier','airedale','cairn','australian terrier','dandie dinmont','boston bull','miniature schnauzer','giant schnauzer','standard schnauzer','scotch terrier','tibetan terrier','silky terrier','soft-coated wheaten terrier','west highland white terrier','lhasa','flat-coated retriever','curly-coated retriever','golden retriever','labrador retriever','chesapeake bay retriever','german short-haired pointer','vizsla','english setter','irish setter','gordon setter','brittany spaniel','clumber','english springer','welsh springer spaniel','cocker spaniel','sussex spaniel','irish water spaniel','kuvasz','schipperke','groenendael','malinois','briard','kelpie','komondor','old english sheepdog','shetland sheepdog','collie','border collie','bouvier des flandres','rottweiler','german shepherd','doberman','miniature pinscher','greater swiss mountain dog','bernese mountain dog','appenzeller','entlebucher','boxer','bull mastiff','tibetan mastiff','french bulldog','great dane','saint bernard','eskimo dog','malamute','siberian husky','dalmatian','affenpinscher','basenji','pug','leonberg','newfoundland','great pyrenees','samoyed','pomeranian','chow','keeshond','brabancon griffon','pembroke','cardigan','toy poodle','miniature poodle','standard poodle','mexican hairless']),
 tiere:IN_SET(['guinea pig','hamster','wood rabbit','hare','angora','goldfish','hen','cock','ostrich','goose','drake','macaw','african grey','cockatoo','lorikeet','budgerigar','tree frog','box turtle','mud turtle','terrapin','common iguana','horse cart','sorrel','ox','ram','bison','llama','zebra','hog','ice bear','brown bear','fox squirrel','red fox','tiger','lion','cheetah','leopard','snow leopard','lynx','cougar','jaguar','koala','giant panda','lesser panda','elephant','tusker','gazelle','impala','hippopotamus','chimpanzee','orangutan','gorilla','monarch','admiral','ladybug','bee','dragonfly','starfish','jellyfish','sea lion','dugong','grey whale','killer whale','flamingo','pelican','king penguin','bald eagle','kite','owl','great grey owl','peacock','hummingbird','jay','magpie','robin','goldfinch','house finch','brambling','junco','indigo bunting','chickadee','water ouzel','bulbul']),
 essen:IN_SET(['pizza','cheeseburger','hotdog','hot dog','plate','ice cream','ice lolly','trifle','bagel','pretzel','burrito','carbonara','guacamole','consomme','hot pot','potpie','meat loaf','french loaf','mashed potato','head cabbage','broccoli','cauliflower','zucchini','spaghetti squash','acorn squash','butternut squash','cucumber','artichoke','bell pepper','cardoon','mushroom','granny smith','strawberry','orange','lemon','fig','pineapple','banana','jackfruit','custard apple','pomegranate','chocolate sauce','dough','red wine','espresso','eggnog','cup','coffee mug','beer glass','wine bottle','beer bottle','frying pan','wok','caldron','dutch oven','soup bowl','mixing bowl','bakery','confectionery','butcher shop','grocery store','restaurant','dining table','corn','ear','pot pie','waffle iron','toaster','teapot','pitcher','goblet','cocktail shaker']),
 natur:IN_SET(['alp','cliff','coral reef','geyser','lakeside','promontory','sandbar','seashore','valley','volcano','breakwater','dam','boathouse','mountain tent','cliff dwelling']),
 pflanzen:IN_SET(['daisy',"yellow lady's slipper",'acorn','hip','buckeye','coral fungus','agaric','gyromitra','stinkhorn','earthstar','hen-of-the-woods','bolete','rapeseed','pot','flowerpot','greenhouse','vase']),
 fahrzeuge:IN_SET(['sports car','convertible','cab','minivan','jeep','limousine','pickup','police van','racer','beach wagon','ambulance','moving van','trailer truck','tow truck','fire engine','garbage truck','school bus','trolleybus','minibus','motor scooter','moped','mountain bike','bicycle-built-for-two','tricycle','tractor','forklift','airliner','warplane','airship','speedboat','canoe','container ship','liner','fireboat','lifeboat','yawl','catamaran','trimaran','schooner','passenger car','electric locomotive','steam locomotive','freight car','streetcar','car wheel','grille','odometer','car mirror','disk brake','go-kart','golfcart','snowmobile','half track','tank','recreational vehicle','crane','harvester','thresher','lawn mower']),
 dokumente:IN_SET(['envelope','menu','book jacket','comic book','crossword puzzle','web site','binder','notebook','packet','rule','slide rule','carton','paper towel','toilet tissue','scoreboard','street sign','monitor','screen','television']),
};
const IN_STRONG={katzen:.35,hunde:.4,tiere:.45,essen:.4,natur:.4,pflanzen:.45,fahrzeuge:.4,dokumente:.4};
const BASE_MIN={feiern:.85,menschen:.85,natur:.85,pflanzen:.88,essen:.88,dokumente:.8};
const orLabelTheme=(()=>{const m={};OR_THEMEN.forEach(([k,,ls])=>ls.forEach(l=>m[l]=m[l]||k));return m})();
const PERSON=['Selfie','Smile','Glasses','Beard','Hand','Skin','Eyelash','Ear','Hair','Lip','Fun','Sitting','Sleep'];
function orThemeOf(a){if(!a||!a.l)return null;
 const base=k=>Math.max(0,...a.l.filter(([x])=>orLabelTheme[x]===k).map(([,c])=>c/100));
 const person=Math.max(0,...a.l.filter(([x])=>PERSON.includes(x)).map(([,c])=>c/100));
 if(a.n){/* mit Zusatzmodell: Summe der passenden Klassen */
  const sc={};a.n.forEach(([x,c])=>{const t=String(x).toLowerCase();for(const k in IN)if(IN[k].has(t))sc[k]=(sc[k]||0)+c/100});
  const order=['katzen','hunde','tiere','dokumente','essen','fahrzeuge','pflanzen','natur'];
  for(const k of order){const v=sc[k]||0;if(v>=IN_STRONG[k]&&!(person>=.75&&(k==='katzen'||k==='hunde'||k==='tiere')&&v<.7))return k}
  /* nur Grundmodell, dafür streng */
  for(const k of ['dokumente','essen','pflanzen','natur','feiern','menschen'])if(base(k)>=BASE_MIN[k]&&!(k==='essen'&&(sc.fahrzeuge||0)>.15))return k;
  return null}
 /* ohne Zusatzmodell: Tiere nur sehr sicher und nicht, wenn ein Mensch erkannt wurde */
 const has=(t,m)=>a.l.some(([x,c])=>x===t&&c>=m*100);
 if(person<.6&&has('Cat',.85))return'katzen';if(person<.6&&has('Dog',.85))return'hunde';
 for(const k of ['dokumente','essen','pflanzen','natur','fahrzeuge','feiern','menschen'])if(base(k)>=(BASE_MIN[k]||.85))return k;
 return null}

/* ---------- Länder (offline, Natural Earth) ---------- */
let LAND_OK=null;async function orLaender(){if(LAND_OK)return true;if(LAND_OK===false)return false;try{await loadScript('data/laender.js');LAND_OK=!!window.LAENDER||typeof LAENDER!=='undefined'}catch(e){LAND_OK=false}return LAND_OK}
function orInRing(lon,lat,r){let ins=false;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){const xi=r[i],yi=r[i+1],xj=r[j],yj=r[j+1];if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))ins=!ins}return ins}
function orLand(lat,lon){let L;try{L=LAENDER}catch(e){return null}
 for(const[n,,rings]of L)for(const r of rings)if(orInRing(lon,lat,r))return n;
 /* Küste/Insel knapp daneben: nächster Grenzpunkt bis ~60 km */
 let best=null,bd=.6;for(const[n,,rings]of L)for(const r of rings)for(let i=0;i<r.length;i+=2){const d=Math.hypot(r[i]-lon,(r[i+1]-lat))
  ;if(d<bd){bd=d;best=n}}return best}
const orKm=(a,b)=>{const R=6371,t=Math.PI/180,dl=(b[0]-a[0])*t,dn=(b[1]-a[1])*t,x=Math.sin(dl/2)**2+Math.cos(a[0]*t)*Math.cos(b[0]*t)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};

/* ---------- Analyse (mit Zwischenspeicher, nur neue Fotos werden gelesen) ---------- */
async function orLoad(){if(OR.info)return OR.info;const v=await IDB.get(OR_KEY);OR.info=v&&typeof v==='object'?v:{};return OR.info}
const orPool=()=>(CL.media||[]).filter(m=>m.kind==='image'&&isCam(m));
async function orAnalyse(){const info=await orLoad();let st={};try{st=await AR().status()}catch(e){}
 if(st.loc&&st.loc!=='granted'){try{st=await AR().requestLocation()}catch(e){}}
 const need=orPool().filter(m=>!info[m.id]||info[m.id].v!==3||(info[m.id].noGeo&&st.loc==='granted'));let h=null,done=0;
 try{h=await AR().addListener('ordnenFortschritt',p=>clBusy(`Schaue Fotos an … ${done+p.i} von ${need.length}`))}catch(e){}
 try{for(let i=0;i<need.length;i+=250){const part=need.slice(i,i+250);const r=await AR().ordnenAnalyse({items:part.map(m=>({id:m.id,kind:'image'})),labels:true,geo:true,faces:true});
   (r.items||[]).forEach(x=>{info[x.id]={v:3,g:x.g||null,l:x.l||[],n:x.n||null,h:x.h||null,f:x.f||null,noGeo:!r.geo}});done+=part.length;await IDB.put(OR_KEY,info);if(r.stopped)break}}
 finally{try{h&&h.remove()}catch(e){}}
 OR.geo=st.loc==='granted';S.clean=S.clean||{};S.clean.ordnen=today();save()}

/* ---------- Reisen erkennen ---------- */
async function orTrips(){const info=await orLoad();await orLaender();const pool=orPool();
 const geo=pool.filter(m=>info[m.id]&&info[m.id].g).map(m=>({m,g:info[m.id].g}));if(geo.length<5)return[];
 /* Zuhause: Orte (Raster ~10 km), an denen an vielen verschiedenen Tagen fotografiert wurde */
 const cells={};geo.forEach(x=>{const k=Math.round(x.g[0]*10)+'|'+Math.round(x.g[1]*7);(cells[k]=cells[k]||{n:0,days:new Set(),g:x.g}).n++;cells[k].days.add(iso(new Date(x.m.taken)))});
 const homes=Object.values(cells).filter(c=>c.days.size>=12).map(c=>c.g);const top=Object.values(cells).sort((a,b)=>b.days.size-a.days.size)[0];if(top&&!homes.length)homes.push(top.g);
 const homeLand=top?orLand(top.g[0],top.g[1]):null;
 const away=geo.filter(x=>homes.every(h=>orKm(h,x.g)>60)).sort((a,b)=>a.m.taken-b.m.taken);
 const trips=[];let cur=[];for(const x of away){if(cur.length&&x.m.taken-cur[cur.length-1].m.taken>2*864e5){trips.push(cur);cur=[]}cur.push(x)}if(cur.length)trips.push(cur);
 return trips.filter(t=>t.length>=6).map((t,i)=>{const from=t[0].m.taken,to=t[t.length-1].m.taken;
  const lands={};t.forEach(x=>{const l=orLand(x.g[0],x.g[1]);if(l)lands[l]=(lands[l]||0)+1});const land=Object.entries(lands).sort((a,b)=>b[1]-a[1])[0];
  /* Fotos ohne Ortsangabe aus derselben Zeit gehören mit dazu */
  const ids=new Set(t.map(x=>x.m.id));const items=pool.filter(m=>ids.has(m.id)||m.taken>=from-36e5&&m.taken<=to+36e5).sort((a,b)=>a.taken-b.taken);
  const d=new Date(from),y=d.getFullYear(),days=Math.round((to-from)/864e5)+1;
  const name=land&&land[0]!==homeLand?`${land[0]} ${y}`:`${days>1?'Ausflug':'Tagesausflug'} ${MON[d.getMonth()]} ${y}`;
  return{id:'t'+i,items,from,to,land:land&&land[0],name,abroad:!!land&&land[0]!==homeLand}}).reverse()}

/* ---------- Ansicht in „Handy aufräumen“ ---------- */
function orSection(){const st=CL.st||{};if(!CL.media||st.media!=='granted')return'';const a=S.clean&&S.clean.ordnen;
 return reg('Ordnung: Fotos in Alben',null,`<p class="small muted">Kleinkram schaut sich deine Kamera-Fotos an – was drauf ist und wo sie entstanden sind – und schlägt Alben vor: Urlaube, Katzen, Essen, Dokumente … Alles im Handy, ohne Internet. Verschoben wird erst, wenn du es bestätigst.</p>
 <div class="row"><button class="btn sm ${a?'':'pri'}" data-act="orRun" ${CL.busy?'disabled':''}>${a?'Neue Fotos anschauen':'Fotos anschauen'}</button>${a?`<span class="small muted">zuletzt ${fmtD(a)}</span>`:''}</div>
 ${a?`<div class="li"><div class="grow"><p><b>Urlaube &amp; Ausflüge</b></p><p class="small muted">Nach Aufnahmeort und Datum, mit Land</p></div><button class="btn sm" data-act="orTrips" ${CL.busy?'disabled':''}>Ansehen</button></div>
 <div class="li"><div class="grow"><p><b>Themen</b></p><p class="small muted">Katzen, Hunde, Essen, Natur, Dokumente …</p></div><button class="btn sm" data-act="orThemes" ${CL.busy?'disabled':''}>Ansehen</button></div>
 <div class="li"><div class="grow"><p><b>Personen &amp; Tiere</b></p><p class="small muted">Gesichter und Haustiere benennen – Kleinkram erkennt sie wieder${(S.leute||[]).length?` · ${(S.leute||[]).map(p=>esc(p.name)).slice(0,4).join(', ')}`:''}</p></div><button class="btn sm" data-act="leute" ${CL.busy?'disabled':''}>Ansehen</button></div>`:''}`)}
async function orRun(){await clRun('Schaue Fotos an …',orAnalyse);toast('Fertig angeschaut')}

/* Gemeinsames Verschieben in Alben */
async function orMove(items,label){if(!items.length){toast('Nichts ausgewählt.');return false}
 try{const r=await AR().moveMedia({items});if(!r||!r.ok){toast('Abgebrochen. Nichts wurde verschoben.');return false}clStore().runs++;save();pts(5,'Fotos geordnet');toast(`${r.moved} Fotos ${label}${r.failed?` · ${r.failed} gingen nicht`:''}`);closeSheet();await clRun('Aktualisiere …',clScanMedia);return true}
 catch(e){toast('Ging nicht: '+(e&&e.message||e));return false}}
const orClean=n=>String(n||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,' ').trim().slice(0,60);

/* Reisen */
async function orTripsSheet(){let trips;await clRun('Suche Urlaube …',async()=>{trips=await orTrips();await clThumbs((trips||[]).flatMap(t=>t.items.slice(0,4)))});
 if(!trips)return;if(!trips.length){toast(OR.geo===false?'Ohne Zugriff auf den Aufnahmeort lassen sich keine Reisen finden.':'Keine Reisen gefunden – Fotos brauchen eine Ortsangabe (Kamera-Einstellung „Standort speichern“).');return}
 sheet(`<h2>Urlaube &amp; Ausflüge</h2><p class="small muted">Gefunden über Aufnahmeort und Datum. Name anpassen, Haken setzen, dann kommen die Fotos in den Ordner „Bilder/Name“ und erscheinen in der Galerie als Album.</p>
 <div class="stack">${trips.map(t=>`<div class="card stack" style="padding:10px"><label class="switch" style="padding:0"><span><b>${dRange(t.from,t.to)}</b><br><span class="small muted">${t.items.length} Fotos${t.land?' · '+esc(t.land):''}</span></span><input type="checkbox" data-tr="${t.id}" ${t.abroad?'checked':''}></label>
  <div class="cl-grid">${t.items.slice(0,4).map(m=>{const th=CL.thumbs[mkey(m)];return`<span class="cl-cell">${th?`<img src="${th.src}" alt="">`:''}</span>`}).join('')}</div>
  <input class="inp" data-trn="${t.id}" value="${esc(t.name)}" autocomplete="off"><button class="btn sm ghost" data-trv="${t.id}">Alle ${t.items.length} Fotos ansehen</button></div>`).join('')}</div>
 <div class="sheet-foot"><button class="btn pri block" id="orGo">Ausgewählte als Alben anlegen</button></div>`,s=>{
  s.querySelectorAll('[data-trv]').forEach(b=>b.onclick=async()=>{const t=trips.find(x=>x.id===b.dataset.trv);await clThumbs(t.items);clViewer(t.items,0,new Set(),()=>{})});
  s.querySelector('#orGo').onclick=()=>{const items=[];let n=0;trips.forEach(t=>{if(!s.querySelector(`[data-tr="${t.id}"]`).checked)return;const name=orClean(s.querySelector(`[data-trn="${t.id}"]`).value);if(!name)return;n++;t.items.forEach(m=>items.push({id:m.id,kind:m.kind,path:'Pictures/'+name}))});
   if(!items.length){toast('Setz bei mindestens einer Reise den Haken.');return}orMove(items,`in ${n} Album${n>1?'en':''} verschoben`)}})}

/* Themen */
async function orThemesSheet(){const info=await orLoad();const pool=orPool(),by={};const no=S.orNo||{};pool.forEach(m=>{const k=orThemeOf(info[m.id]);if(k&&!(no[k]||[]).includes(m.id))(by[k]=by[k]||[]).push(m)});
 const rows=OR_THEMEN.filter(([k])=>by[k]&&by[k].length);if(!rows.length){toast('Noch nichts erkannt. Erst „Fotos anschauen“.');return}
 await clRun('Lade Vorschaubilder …',()=>clThumbs(rows.flatMap(([k])=>by[k].slice(-4))));
 sheet(`<h2>Themen in deinen Fotos</h2><p class="small muted">Erkannt am Bildinhalt. Tipp auf ein Thema, um die Fotos zu prüfen und in ein Album zu legen.</p>
 <div class="stack">${rows.map(([k,n])=>`<button class="card stack" data-th="${k}" style="padding:10px;text-align:left;width:100%"><div class="row between"><b>${esc(n)}</b><span class="chip">${by[k].length}</span></div><div class="cl-grid">${by[k].slice(-4).map(m=>{const th=CL.thumbs[mkey(m)];return`<span class="cl-cell">${th?`<img src="${th.src}" alt="">`:''}</span>`}).join('')}</div></button>`).join('')}</div>`,s=>{
  s.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>orThemeSheet(b.dataset.th,by[b.dataset.th]))})}
async function orThemeSheet(k,list){const T=OR_THEMEN.find(x=>x[0]===k);list=list.slice().sort((a,b)=>b.taken-a.taken);let shown=Math.min(list.length,80);
 await clRun('Lade Vorschaubilder …',()=>clThumbs(list.slice(0,shown)));const sel=new Set(list.map(mkey));const by={};list.forEach(m=>by[mkey(m)]=m);const pet=!!OR_TIERNAME[k];
 sheet(`<h2>${esc(T[1])}</h2><p class="small muted">${list.length} Fotos. Grün = kommt ins Album. Falsch erkannt? Tipp auf den Kreis nimmt das Foto raus – es wird dann auch künftig nicht mehr hier vorgeschlagen. Tipp aufs Bild zeigt es groß.</p>
 ${pet?`<button class="btn block" id="orPet">${ICON.check} Nach Namen aufteilen (z. B. Hugo und Momo)</button>`:''}
 <label class="f">Album<input class="inp" id="orAlb" value="${esc(S.set['alb_'+k]||T[1].replace(' & ',' und '))}" autocomplete="off"></label>
 <div class="cl-grid alb" id="clGrid">${list.slice(0,shown).map(m=>clCell(m,true,'')).join('')}</div>${list.length>shown?'<button class="btn block ghost" id="clMore">Mehr anzeigen</button>':''}
 <div class="sheet-foot"><button class="btn pri block" id="orGo"></button></div>`,s=>{const go=s.querySelector('#orGo');
  const upd=()=>{go.textContent=sel.size?`${sel.size} Fotos ins Album verschieben`:'Nichts ausgewählt';go.disabled=!sel.size};upd();
  clPick(s,sel,upd,()=>({list:list.slice(0,shown),group:false}));
  const more=s.querySelector('#clMore');more&&(more.onclick=async()=>{shown=Math.min(list.length,shown+80);await clThumbs(list.slice(0,shown));s.querySelector('#clGrid').innerHTML=list.slice(0,shown).map(m=>clCell(m,sel.has(mkey(m)),'')).join('');if(shown>=list.length)more.remove()});
  const p=s.querySelector('#orPet');p&&(p.onclick=()=>orPetSheet(k,list.filter(m=>sel.has(mkey(m)))));
  go.onclick=()=>{const name=orClean(val('orAlb'));if(!name){toast('Gib dem Album einen Namen.');return}S.set['alb_'+k]=name;S.orNo=S.orNo||{};S.orNo[k]=[...new Set([...(S.orNo[k]||[]),...list.filter(m=>!sel.has(mkey(m))).map(m=>m.id)])].slice(-3000);save();orMove([...sel].map(x=>by[x]).map(m=>({id:m.id,kind:m.kind,path:'Pictures/'+name})),`ins Album „${name}“ verschoben`)}})}

/* Haustiere nach Namen: du zeigst ein paar Beispiele, Kleinkram ordnet den Rest nach Aussehen zu */
function orFeat(a){if(!a)return null;const h=a.h?a.h.map(v=>Math.sqrt(v/1000)):null;const l={};(a.l||[]).forEach(([x,c])=>l[x]=c/100);(a.n||[]).forEach(([x,c])=>l['n:'+x]=c/100);return{h,l}}
function orDist(p,q){let d=0;if(p.h&&q.h){for(let i=0;i<64;i++)d+=(p.h[i]-q.h[i])**2;d=Math.sqrt(d)}else d=.8;
 const ks=new Set([...Object.keys(p.l),...Object.keys(q.l)]);let e=0;ks.forEach(k=>e+=((p.l[k]||0)-(q.l[k]||0))**2);return d+.35*Math.sqrt(e)}
async function orPetSheet(k,list){const info=await orLoad();const T=OR_TIERNAME[k];const ART={katzen:'katze',hunde:'hund',tiere:'tier'}[k];const known=(S.leute||[]).filter(p=>p.art===ART).map(p=>p.name);let names=known.length?known:(S.set['pets_'+k]||'').split(',').map(x=>x.trim()).filter(Boolean);
 const ex={};let cur=0,guess=null;
 /* Schon bekannte Tiere: sofort zuordnen, du prüfst nur noch */
 if(known.length&&typeof leBsp==='function'){const B=await leBsp();const P=(S.leute||[]).filter(p=>p.art===ART);if(P.some(p=>(B[p.id]||{}).pets&&B[p.id].pets.length)){guess={};list.forEach(m=>{const F=orFeat(info[m.id]);if(!F)return;let bi=-1,bd=1e9;P.forEach(p=>{const e=(B[p.id]||{}).pets||[];if(!e.length)return;const d=e.map(x=>orDist(F,x)).sort((a,b)=>a-b).slice(0,3);const v=d.reduce((a,b)=>a+b,0)/d.length;if(v<bd){bd=v;bi=names.indexOf(p.name)}});if(bi>=0)guess[mkey(m)]=bi})}}const col=['#2ea05a','#d08a1e','#3b6fd8','#c0398f','#6b4fd8'];
 const draw=s=>{s.querySelector('#orNames').innerHTML=names.map((n,i)=>`<button class="fchip${i===cur?' on':''}" style="--c:${col[i%5]}" data-pn="${i}">${esc(n)} · ${Object.values(guess||ex).filter(v=>v===i).length}</button>`).join('');
  s.querySelectorAll('.cl-cell').forEach(c=>{const v=(guess||ex)[c.dataset.ck];c.style.outline=v!=null?`4px solid ${col[v%5]}`:'';c.style.outlineOffset='-4px';const t=c.querySelector('.tag');if(t)t.remove();if(v!=null)c.insertAdjacentHTML('beforeend',`<span class="tag" style="background:${col[v%5]}">${esc(names[v])}${ex[c.dataset.ck]!=null&&guess?' ✓':''}</span>`)});
  const go=s.querySelector('#orGo'),nEx=names.map((_,i)=>Object.values(ex).filter(v=>v===i).length);
  if(!guess){go.textContent=names.length<2?'Erst mindestens zwei Namen eintragen':nEx.some(n=>!n)?'Für jeden Namen mindestens 1 Beispiel antippen':'Rest automatisch zuordnen';go.disabled=names.length<2||nEx.some(n=>!n)}
  else{const n=Object.keys(guess).length;go.textContent=`${n} Fotos in ${names.length} Alben verschieben`;go.disabled=!n}};
 await clRun('Lade Vorschaubilder …',()=>clThumbs(list));
 sheet(`<h2>${esc(T)} nach Namen</h2><p class="small muted">1. Namen eintragen. 2. Namen antippen, dann 2–3 typische Fotos davon antippen. 3. „Rest zuordnen“ – Kleinkram vergleicht Fellfarbe und Aussehen. Danach prüfen: Tipp auf ein Foto wechselt den Namen. Die Zuordnung ist ein Vorschlag, je unterschiedlicher die Tiere aussehen, desto besser.</p>
 <label class="f">Namen (mit Komma)<input class="inp" id="orPN" value="${esc(names.join(', '))}" placeholder="Hugo, Momo" autocomplete="off"></label>
 <div class="filters" id="orNames"></div>
 <label class="f">Ordner<input class="inp" id="orPB" value="${esc(S.set['alb_'+k]||T)}" autocomplete="off"><span class="small muted">Ergibt z. B. Bilder/${esc(S.set['alb_'+k]||T)}/${esc(names[0]||'Hugo')}</span></label>
 <div class="cl-grid alb">${list.map(m=>`<button class="cl-cell" data-ck="${mkey(m)}" style="cursor:pointer">${CL.thumbs[mkey(m)]?`<img src="${CL.thumbs[mkey(m)].src}" alt="">`:''}</button>`).join('')}</div>
 <div class="sheet-foot stack"><button class="btn block ghost" id="orRe" hidden>Nochmal Beispiele wählen</button><button class="btn pri block" id="orGo"></button></div>`,s=>{
  const pn=s.querySelector('#orPN');pn.onchange=()=>{names=pn.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,5);S.set['pets_'+k]=names.join(', ');save();cur=Math.min(cur,Math.max(0,names.length-1));draw(s)};
  s.querySelector('#orNames').onclick=e=>{const b=e.target.closest('[data-pn]');if(b){cur=+b.dataset.pn;draw(s)}};
  s.querySelector('.cl-grid').onclick=e=>{const c=e.target.closest('[data-ck]');if(!c||!names.length)return;const key=c.dataset.ck;
   if(guess){const v=guess[key];if(v==null)guess[key]=0;else if(v+1<names.length)guess[key]=v+1;else delete guess[key]}   /* nächster Name, dann „keins“ */
   else{if(ex[key]===cur)delete ex[key];else ex[key]=cur}draw(s)};
  s.querySelector('#orRe').onclick=()=>{guess=null;s.querySelector('#orRe').hidden=true;draw(s)};
  s.querySelector('#orGo').onclick=()=>{
   if(!guess){/* k-nächste Nachbarn über Farbprofil + Bildlabels */
    const F={};list.forEach(m=>F[mkey(m)]=orFeat(info[m.id]));const exs=Object.entries(ex).filter(([key])=>F[key]);guess={...ex};
    list.forEach(m=>{const key=mkey(m);if(guess[key]!=null||!F[key])return;const ds=exs.map(([ek,v])=>({v,d:orDist(F[key],F[ek])})).sort((a,b)=>a.d-b.d).slice(0,3);const votes={};ds.forEach(x=>votes[x.v]=(votes[x.v]||0)+1/(x.d+.05));guess[key]=+Object.entries(votes).sort((a,b)=>b[1]-a[1])[0][0]});
    s.querySelector('#orRe').hidden=false;draw(s);toast('Zugeordnet – bitte kurz prüfen');return}
   const base=orClean(val('orPB'))||T;S.set['alb_'+k]=base;save();if(typeof lePetLearn==='function')lePetLearn(k,names,guess,info);const byK={};list.forEach(m=>byK[mkey(m)]=m);
   orMove(Object.entries(guess).map(([key,v])=>({id:byK[key].id,kind:'image',path:`Pictures/${base}/${orClean(names[v])}`})),`nach Namen einsortiert`)};
  if(guess){s.querySelector('#orRe').hidden=false}
  draw(s)})}
