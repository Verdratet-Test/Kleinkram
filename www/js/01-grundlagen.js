/* Kleinkram · Hilfsfunktionen, Datum, Speicher, Handy-Anbindung (Capacitor), Töne, Punkte & Titel */
"use strict";
/* ---------- Hilfen ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const P=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const today=()=>iso(new Date());
const addDays=(s,n)=>{const d=P(s);d.setDate(d.getDate()+n);return iso(d)};
const addMonths=(s,n)=>{const d=P(s),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return iso(d)};
const diff=(a,b)=>Math.round((P(b)-P(a))/864e5);
const isLeap=y=>(y%4===0&&y%100!==0)||y%400===0;
const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
const WDL=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+n||0);
function fmtD(s,long){if(!s)return'';const d=P(s),t=today(),k=diff(t,s);
  if(k===0)return'heute';if(k===1)return'morgen';if(k===2)return'übermorgen';if(k===-1)return'gestern';
  return long?`${WDL[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`:`${WD[d.getDay()]}, ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()!==new Date().getFullYear()?String(d.getFullYear()).slice(2):''}`;}
const CATS={privat:'Privat',partner:'Partner',geschaeft:'Geschäft',verwaltung:'Verwaltung'};
const CATHINT={verwaltung:'Handwerker, Ämter, Wohnung'};
const cv=c=>`--c:var(--c-${CATS[c]?c:'privat'})`;
const TITLES=[[0,'Tagträumer'],[60,'Aufschieber'],[180,'Zettelsammler'],[400,'Listenführer'],[700,'Ordnungshüter'],[1100,'Fristenbändiger'],[1600,'Behörden-Bezwinger'],[2300,'Organisations-Guru']];
const ICON={
 check:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 mic:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
 lock:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
 unlock:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 017.8-1.2"/></svg>',
 flame:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 01-10 0c0-2.4 1.2-3.8 2.4-4.9.2 1.6 1 2.6 2.1 2.9C11 8.6 11 5 12 2z"/></svg>',
 x:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 left:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 right:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
 cam:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
 doc:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
};
const NAV=[['heute','Heute','<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/>'],
 ['kalender','Kalender','<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'],
 ['aufgaben','Aufgaben','<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5 2.5-2.5"/>'],
 ['ablage','Ablage','<path d="M3 7h6l2 2h10v10.5H3z"/><path d="M3 7V5h6l2 2"/>'],
 ['ich','Ich','<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/>']];

/* ---------- Speicher (nur auf diesem Gerät) ---------- */
const KEY='kleinkram-v1';
function seed(){const t=today(),y=+t.slice(0,4);const r=(title,cat,every,next,lead,cost)=>({id:uid(),title,cat,every,next,lead,cost:cost||null,lastGen:null});
 return{v:1,name:'',points:0,log:[],events:[],
  tasks:[{id:uid(),title:'Stromrechnung bezahlen',cat:'verwaltung',due:addDays(t,3),created:addDays(t,-9),postponed:2,started:false,done:null,steps:[],cost:{eur:5,note:'Mahngebühr'},bundle:'',buddy:null,example:true}],
  recurring:[r('Winterreifen aufziehen','privat',12,`${y+1}-10-15`,21,{eur:60,note:'Bußgeld bei Glätte ohne Winterreifen'}),
   r('Sommerreifen aufziehen','privat',12,`${y+1}-04-15`,21),
   r('Stromzähler ablesen','verwaltung',12,`${y}-12-31`,10),
   r('Steuererklärung {vorjahr} abgeben','verwaltung',12,`${y+1}-07-31`,120,{eur:25,note:'Verspätungszuschlag je Monat (mind.)'})],
  routines:[{id:uid(),title:'Bett machen',pflicht:true,days:[]},{id:uid(),title:'10 Seiten lesen',pflicht:true,days:[]},{id:uid(),title:'10 Minuten aufräumen',pflicht:true,days:[]}],
  allDone:[],bonusDays:[],active:[],pot:{entries:[],payouts:[],month:12},docs:[],tax:{},
  set:{sound:true,haptic:true,freizeit:true,oneThing:false}};}
let S;
try{S=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){S=null}
if(!S||S.v!==1)S=seed();
try{if(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&S.set&&S.set.lock)document.documentElement.classList.add('kk-locked')}catch(e){}
let storageOK=true;
if(!S.m2){S.m2=1;S.routines.forEach(r=>{r.freq=r.freq||'daily'});
 S.routines.push({id:uid(),title:'Rechnungen prüfen und ggf. überweisen',pflicht:true,days:[],freq:'days',n:3,wd:0,time:'',link:'unpaid'},{id:uid(),title:'Dokumente einräumen',pflicht:true,days:[],freq:'weekly',n:7,wd:0,time:'',link:'docs'});
 try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){if(storageOK){storageOK=false;toast('Speichern auf diesem Gerät klappt gerade nicht.')}}if(typeof scheduleSoon==='function')scheduleSoon()}
/* Bilder in IndexedDB */
const IDB={db:null,mem:new Map(),
 open(){return new Promise(res=>{try{const r=indexedDB.open('kleinkram',1);r.onupgradeneeded=()=>r.result.createObjectStore('imgs');r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>res()}catch(e){res()}})},
 put(k,v){this.mem.set(k,v);if(!this.db)return Promise.resolve();return new Promise(res=>{try{const tx=this.db.transaction('imgs','readwrite');tx.objectStore('imgs').put(v,k);tx.oncomplete=res;tx.onerror=res}catch(e){res()}})},
 get(k){if(this.mem.has(k))return Promise.resolve(this.mem.get(k));if(!this.db)return Promise.resolve(null);return new Promise(res=>{try{const q=this.db.transaction('imgs').objectStore('imgs').get(k);q.onsuccess=()=>{if(q.result)this.mem.set(k,q.result);res(q.result||null)};q.onerror=()=>res(null)}catch(e){res(null)}})},
 del(k){this.mem.delete(k);if(!this.db)return;try{this.db.transaction('imgs','readwrite').objectStore('imgs').delete(k)}catch(e){}}};

/* ---------- Handy-Funktionen (nur in der App) ---------- */
const CAP=(()=>{try{return window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()?Capacitor:null}catch(e){return null}})();
const _cp={};const capFail=n=>new Proxy({},{get:()=>()=>Promise.reject(new Error(n+' ist in dieser App-Version nicht verfügbar'))});
const CapP=n=>{if(!CAP)return null;if(_cp[n])return _cp[n];let p=null;try{if(typeof CAP.registerPlugin==='function')p=CAP.registerPlugin(n);else if(CAP.Plugins&&CAP.Plugins[n])p=CAP.Plugins[n]}catch(e){}return _cp[n]=p||capFail(n)};
const hid=x=>{let h=7;for(const c of String(x))h=(h*31+c.charCodeAt(0))|0;return (Math.abs(h)%2000000000)||1};
async function capWrite(name,text,dir){const r=await CapP('Filesystem').writeFile({path:dir==='DOCUMENTS'?'Kleinkram/'+name:name,data:b64(text),directory:dir,recursive:true});return r.uri}
function share(text){if(CAP){CapP('Share').share({text:String(text)}).catch(()=>{});return true}if(navigator.share){navigator.share({text:String(text)}).catch(()=>{});return true}return false}
const b64=s=>btoa(unescape(encodeURIComponent(s)));
function openOutside(url){if(CAP){CapP('KleinkramNative').openExternal({url}).catch(()=>copy(url));return}try{window.open(url,'_blank','noopener')}catch(e){copy(url)}}
async function shareFile(name,text,mime){if(CAP){try{const uri=await capWrite(name,text,'CACHE');await CapP('Share').share({title:name,files:[uri]});return true}catch(e){if(/cancel/i.test(String(e&&e.message)))return true;toast('Teilen ging nicht.');return false}}try{const f=new File([text],name,{type:mime});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return true}}catch(e){if(e&&e.name==='AbortError')return true}
 return saveFile(name,text,mime)}
function saveFile(name,text,mime){if(CAP){capWrite(name,text,'DOCUMENTS').then(()=>toast('Gespeichert unter Dokumente/Kleinkram')).catch(()=>shareFile(name,text,mime));return true}
 try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();a.remove();toast('Datei wird gespeichert');return true}catch(e){return false}}

/* ---------- Feedback ---------- */
let AC=null;
function sound(kind){if(!S.set.sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const n=AC.currentTime;
 const tone=(f,t0,d,type,vol)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,n+t0);g.gain.setValueAtTime(0,n+t0);g.gain.linearRampToValueAtTime(vol||.18,n+t0+.01);g.gain.exponentialRampToValueAtTime(.0001,n+t0+d);o.connect(g).connect(AC.destination);o.start(n+t0);o.stop(n+t0+d+.02)};
 if(kind==='stamp'){const b=AC.createBuffer(1,AC.sampleRate*.12,AC.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*Math.pow(1-i/c.length,3);const s=AC.createBufferSource(),g=AC.createGain();g.gain.value=.5;s.buffer=b;s.connect(g).connect(AC.destination);s.start(n);tone(110,0,.18,'triangle',.35);tone(660,.16,.25,'sine',.12);tone(990,.24,.4,'sine',.1)}
 else if(kind==='tick'){tone(880,0,.09,'sine',.12);tone(1320,.05,.12,'sine',.08)}
 else if(kind==='bell'){tone(784,0,.5);tone(988,.18,.5);tone(1175,.36,.7)}}catch(e){}}
function haptic(p){if(!S.set.haptic)return;const ms=Array.isArray(p)?p.reduce((a,b)=>a+b,0):p;if(CAP){try{CapP('Haptics').vibrate({duration:Math.min(ms,400)}).catch(()=>{})}catch(e){}return}try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
let toastT;
function toast(msg){const h=$('#toastHost');h.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`;clearTimeout(toastT);toastT=setTimeout(()=>h.innerHTML='',2600)}
function stamp(text){const el=$('#stamp');const d=new Date();el.innerHTML=`<div class="st">${esc(text||'Erledigt')}<small>${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}</small></div>`;el.hidden=false;sound('stamp');haptic([15,40,60]);setTimeout(()=>{el.hidden=true;el.innerHTML=''},1300)}

/* ---------- Punkte ---------- */
function level(p=S.points){let i=0;TITLES.forEach((t,k)=>{if(p>=t[0])i=k});const cur=TITLES[i],nx=TITLES[i+1];return{i,title:cur[1],next:nx?nx[1]:null,need:nx?nx[0]-p:0,prog:nx?(p-cur[0])/(nx[0]-cur[0]):1}}
function pts(n,why){const before=level().i;S.points+=n;S.log.unshift({d:today(),n,w:why});S.log=S.log.slice(0,150);const after=level();
 if(after.i>before){setTimeout(()=>{stamp(after.title);toast(`Neuer Titel: ${after.title}`)},900)}else toast(`+${n} Punkte · ${why}`)}
function markActive(){const t=today();if(!S.active.includes(t)){S.active.push(t);S.active=S.active.slice(-60)}}
