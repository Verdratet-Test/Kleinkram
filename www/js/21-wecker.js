/* Kleinkram · Wecker mit Aufgabe: klingelt, bis eine Aufgabe gelöst ist (Rechnen, Schütteln, Abtippen, Code scannen, Merken) */
"use strict";
/* Das Klingeln selbst macht Android (WeckerService): pünktlich, über dem Sperrbildschirm, in Wecker-Lautstärke, auch nach Neustart.
   Hier: Wecker verwalten, Aufgaben stellen, Morgen-Bildschirm. Im Browser lässt sich nur die Aufgabe ausprobieren. */
const WK={cur:null,snz:0,pauseAt:0,motion:null,stream:null};
const WTASK={rechnen:'Rechnen',schuetteln:'Schütteln',tippen:'Satz abtippen',code:'Code scannen',merken:'Muster merken'};
const WTASK_INFO={rechnen:'Kopfrechnen weckt das Gehirn',schuetteln:'Handy kräftig schütteln',tippen:'Einen Satz fehlerfrei abtippen',code:'Einen Code scannen, der z. B. im Bad klebt – dafür musst du aufstehen',merken:'Ein Leuchtmuster nachtippen'};
const WSND={standard:'Handy-Weckton',wecker:'Kleinkram-Wecker',glocke:'Glocke',gong:'Gong'};
const WDAY=['Mo','Di','Mi','Do','Fr','Sa','So'];
const wList=()=>S.wecker=S.wecker||[];
const WP=()=>CapP('Wecker');
const wTime=w=>`${pad(w.h)}:${pad(w.m)}`;
const wDays=w=>!w.days.length?'einmalig':w.days.length===7?'täglich':w.days.join()==='1,2,3,4,5'?'Mo–Fr':w.days.join()==='6,7'?'Sa, So':w.days.map(d=>WDAY[d-1]).join(', ');

/* nächster Termin eines Weckers (lokal berechnet, für Anzeige und einmalige Wecker) */
function wNext(w,from){const now=from||new Date();for(let d=0;d<8;d++){const x=new Date(now);x.setDate(x.getDate()+d);x.setHours(w.h,w.m,0,0);
  if(w.days.length){const wd=((x.getDay()+6)%7)+1;if(!w.days.includes(wd))continue}else if(w.date){const t=P(w.date);t.setHours(w.h,w.m,0,0);return t>now?t:null}
  if(x>now)return x}return null}
function wFmtNext(t){if(!t)return'';const d=diff(today(),iso(t));return`${d===0?'heute':d===1?'morgen':WDAY[(t.getDay()+6)%7]+'.'} ${pad(t.getHours())}:${pad(t.getMinutes())}`}
function wNextAll(){let best=null,bw=null;wList().filter(w=>w.on).forEach(w=>{const t=wNext(w);if(t&&(!best||t<best)){best=t;bw=w}});return best?{t:best,w:bw}:null}
function wUntil(t){const ms=t-Date.now(),h=Math.floor(ms/36e5),m=Math.round(ms%36e5/6e4);return h?`in ${h} Std ${m} Min`:`in ${m} Min`}

/* an Android übergeben */
async function weckerPlan(){
 /* einmalige Wecker, deren Zeit vorbei ist, ausschalten */
 let ch=false;wList().forEach(w=>{if(w.on&&!w.days.length&&w.date){const t=P(w.date);t.setHours(w.h,w.m,0,0);if(t<new Date()){w.on=false;ch=true}}});if(ch)save();
 if(!CAP)return null;
 const regeln=wList().filter(w=>w.on).map(w=>({id:w.id,h:w.h,m:w.m,days:w.days,date:w.days.length?null:w.date||null,label:w.label||'Wecker',sound:w.sound||'standard',task:`${w.task}|${w.level}|${w.n}`}));
 try{const r=await WP().planen({regeln});return r.naechster||null}catch(e){return null}}

/* ---------- Ansicht: Ich → Wecker ---------- */
function weckerReg(){const nx=wNextAll();
 return reg('Wecker',wList().filter(w=>w.on).length||null,`<p class="small muted">Klingelt, bis du eine Aufgabe gelöst hast – kein schlaftrunkenes Wegdrücken mehr.</p>
 ${nx?`<div class="li"><div class="grow"><p><b>${wFmtNext(nx.t)}</b> · ${esc(nx.w.label||'Wecker')}</p><p class="small muted">${wUntil(nx.t)} · Aufgabe: ${WTASK[nx.w.task]}</p></div></div>`:'<p class="small muted">Kein Wecker aktiv.</p>'}
 <button class="btn block" data-act="wecker">${wList().length?'Wecker verwalten':'Wecker stellen'}</button>`)}
async function weckerSheet(){let st=null;if(CAP){try{st=await WP().status()}catch(e){}}
 const warn=[];if(st){if(!st.exact)warn.push(['exact','Pünktliche Wecker erlauben']);if(!st.fullScreen)warn.push(['fullscreen','Vollbild über dem Sperrbildschirm erlauben']);if(!st.akku)warn.push(['akku','Akku-Optimierung für Kleinkram ausschalten'])}
 sheet(`<h2>Wecker</h2>
 ${!CAP?'<div class="banner"><div class="grow small">Im Browser kann Kleinkram nicht klingeln. Hier kannst du die Aufgaben ausprobieren – richtig wecken geht nur in der App.</div></div>':''}
 ${warn.length?`<div class="banner"><div class="grow"><p class="small"><b>Damit der Wecker sicher klingelt:</b></p>${warn.map(([k,t])=>`<button class="btn sm block" data-ws="${k}" style="margin-top:6px">${t}</button>`).join('')}<p class="small muted" style="margin-top:6px">Manche Handys (z. B. Xiaomi) brauchen zusätzlich „Autostart“ in den App-Einstellungen.</p><button class="btn sm ghost" data-ws="app">App-Einstellungen öffnen</button></div></div>`:''}
 ${wList().map(w=>{const t=w.on&&wNext(w);return`<div class="li"><button class="grow" data-we="${w.id}" style="text-align:left;background:none;border:0;padding:0;color:inherit"><p style="font-size:28px;font-weight:700;line-height:1.1">${wTime(w)}</p><p class="small muted">${esc(w.label||'Wecker')} · ${wDays(w)} · ${WTASK[w.task]}${t?` · ${wUntil(t)}`:''}</p></button><input type="checkbox" class="wk-tgl" data-wo="${w.id}" ${w.on?'checked':''} aria-label="an/aus"></div>`}).join('')}
 <button class="btn pri block" data-we="neu">+ Neuer Wecker</button>
 <button class="btn block ghost" data-wt="1">Aufgabe ausprobieren${CAP?' (mit Klingeln)':''}</button>`,s=>{
  s.querySelectorAll('[data-ws]').forEach(b=>b.onclick=async()=>{try{await WP().einstellungen({was:b.dataset.ws})}catch(e){}});
  s.querySelectorAll('[data-wo]').forEach(c=>c.onchange=async()=>{const w=wList().find(x=>x.id===c.dataset.wo);w.on=c.checked;if(w.on&&!w.days.length)w.date=iso(wNext(Object.assign({},w,{date:null})));save();await weckerPlan();render();toast(w.on?`Klingelt ${wFmtNext(wNext(w))}`:'Wecker aus');weckerSheet()});
  s.querySelectorAll('[data-we]').forEach(b=>b.onclick=()=>weckerEdit(b.dataset.we));
  s.querySelector('[data-wt]').onclick=()=>weckerTry()})}
function weckerEdit(id){const w0=wList().find(x=>x.id===id);const w=w0?Object.assign({},w0,{days:[...w0.days]}):{id:uid(),on:true,h:6,m:30,days:[1,2,3,4,5],label:'Aufstehen',task:'rechnen',level:2,n:3,snooze:1,snMin:5,sound:'standard',wach:true};
 sheet(`<h2>${w0?'Wecker bearbeiten':'Neuer Wecker'}</h2>
 <label class="f">Uhrzeit<input class="inp" type="time" id="wT" value="${wTime(w)}" style="font-size:28px;font-weight:700"></label>
 <div class="f"><span>Tage <span class="small muted">(keiner = einmalig)</span></span><div class="filters" id="wD">${WDAY.map((d,i)=>`<button class="fchip${w.days.includes(i+1)?' on':''}" style="--c:var(--stamp)" data-d="${i+1}">${d}</button>`).join('')}</div></div>
 <label class="f">Name<input class="inp" id="wL" value="${esc(w.label||'')}" placeholder="z. B. Aufstehen, Frühschicht"></label>
 <div class="f"><span>Aufgabe zum Ausschalten</span><div class="stack" id="wK">${Object.keys(WTASK).map(k=>`<label class="switch wk-radio"><input type="radio" name="wk" value="${k}" ${w.task===k?'checked':''}><span class="grow"><b>${WTASK[k]}</b><br><span class="small muted">${WTASK_INFO[k]}</span></span></label>`).join('')}</div></div>
 <div id="wCode"></div>
 <div class="grid2"><label class="f">Schwierigkeit<select class="inp" id="wLv">${[1,2,3].map(l=>`<option value="${l}" ${w.level===l?'selected':''}>${['leicht','mittel','schwer'][l-1]}</option>`).join('')}</select></label>
 <label class="f">Anzahl<select class="inp" id="wN">${[1,2,3,4,5].map(n=>`<option ${w.n===n?'selected':''}>${n}</option>`).join('')}</select></label></div>
 <div class="grid2"><label class="f">Schlummern<select class="inp" id="wS">${[0,1,2,3].map(n=>`<option value="${n}" ${w.snooze===n?'selected':''}>${n?n+'× erlaubt':'nicht erlaubt'}</option>`).join('')}</select></label>
 <label class="f">Schlummer-Dauer<select class="inp" id="wSm">${[3,5,9,10,15].map(n=>`<option value="${n}" ${w.snMin===n?'selected':''}>${n} Min</option>`).join('')}</select></label></div>
 <label class="f">Weckton<select class="inp" id="wSo">${Object.keys(WSND).map(k=>`<option value="${k}" ${w.sound===k?'selected':''}>${WSND[k]}</option>`).join('')}</select></label>
 <label class="switch"><span>„Bist du wach?“-Check<br><span class="small muted">5 Min nach dem Ausschalten klingelt er nochmal, wenn du nicht „Ich bin wach“ tippst</span></span><input type="checkbox" id="wW" ${w.wach?'checked':''}></label>
 <div class="sheet-foot stack"><button class="btn pri block" id="wGo">Speichern</button>${w0?'<button class="btn block danger" id="wDel">Löschen</button>':''}</div>`,s=>{
  s.querySelector('#wD').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;const d=+b.dataset.d;w.days=w.days.includes(d)?w.days.filter(x=>x!==d):[...w.days,d].sort();b.classList.toggle('on')};
  const codeBox=()=>{const k=s.querySelector('[name=wk]:checked').value;s.querySelector('#wCode').innerHTML=k==='code'?`<div class="banner"><div class="grow small">${S.set.weckerCode?`Code ist festgelegt (${esc(String(S.set.weckerCode).slice(0,24))}${String(S.set.weckerCode).length>24?'…':''}).`:'<b>Noch kein Code festgelegt.</b>'} Druck den Kleinkram-Code aus und kleb ihn z. B. ans Waschbecken – oder scanne einen QR-Code, der dort schon ist.</div></div><div class="row"><button class="btn sm" id="wCP">Code anzeigen / drucken</button><button class="btn sm" id="wCS">Vorhandenen QR-Code scannen</button></div>`:'';
   const cp=s.querySelector('#wCP');cp&&(cp.onclick=()=>weckerCodeSheet(()=>weckerEdit(id)));const cs=s.querySelector('#wCS');cs&&(cs.onclick=async()=>{const t=await wScanOnce('Halte den QR-Code ins Bild');if(t){S.set.weckerCode=t;save();toast('Code gespeichert');codeBox()}})};
  s.querySelector('#wK').onchange=codeBox;codeBox();
  s.querySelector('#wGo').onclick=async()=>{const[h,m]=(val('wT')||'06:30').split(':').map(Number);Object.assign(w,{h,m,label:val('wL')||'Wecker',task:s.querySelector('[name=wk]:checked').value,level:+val('wLv'),n:+val('wN'),snooze:+val('wS'),snMin:+val('wSm'),sound:val('wSo'),wach:s.querySelector('#wW').checked,on:true});
   if(w.task==='code'&&!S.set.weckerCode){toast('Erst einen Code festlegen.');return}
   w.date=w.days.length?null:iso(wNext(Object.assign({},w,{date:null})));
   const i=wList().findIndex(x=>x.id===w.id);if(i>=0)wList()[i]=w;else wList().push(w);save();await weckerPlan();render();toast(`Wecker gestellt: ${wFmtNext(wNext(w))} (${wUntil(wNext(w))})`);weckerSheet()};
  const d=s.querySelector('#wDel');d&&(d.onclick=()=>confirmSheet('Wecker löschen?',`${wTime(w)} · ${esc(w.label)}`,'Löschen',async()=>{S.wecker=wList().filter(x=>x.id!==w.id);save();await weckerPlan();render();weckerSheet()},true))})}
function weckerCodeSheet(back){if(!S.set.weckerCode){S.set.weckerCode='KLEINKRAM-WACH-'+uid().slice(0,8).toUpperCase();save()}const svg=qrSvg(S.set.weckerCode);
 sheet(`<h2>Dein Wecker-Code</h2><p class="small muted">Drucke ihn aus (oder fotografiere den Bildschirm und druck das Foto) und kleb ihn dorthin, wo du morgens hin musst – Bad, Küche, Kaffeemaschine.</p><div style="background:#fff;padding:16px;border-radius:12px;max-width:280px;margin:0 auto">${svg||''}</div><p class="mono small" style="text-align:center">${esc(S.set.weckerCode)}</p><button class="btn block" id="wcB">Zurück</button>`,s=>s.querySelector('#wcB').onclick=back)}

/* ---------- Kamera: QR-Code lesen (live) ---------- */
async function wCam(video){WK.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});video.srcObject=WK.stream;await video.play()}
function wCamStop(){try{WK.stream&&WK.stream.getTracks().forEach(t=>t.stop())}catch(e){}WK.stream=null}
async function wReadFrame(video,cv){if(!video.videoWidth)return null;
 if('BarcodeDetector' in window){try{WK.bd=WK.bd||new BarcodeDetector();const r=await WK.bd.detect(video);if(r&&r[0])return r[0].rawValue}catch(e){}}
 if(typeof jsQR!=='function')return null;const w=Math.min(640,video.videoWidth),h=Math.round(video.videoHeight*w/video.videoWidth);cv.width=w;cv.height=h;const x=cv.getContext('2d');x.drawImage(video,0,0,w,h);const d=x.getImageData(0,0,w,h);const r=jsQR(d.data,w,h);return r?r.data:null}
function wScanOnce(title){return new Promise(res=>{sheet(`<h2>${esc(title)}</h2><video id="wV" playsinline muted style="width:100%;border-radius:12px;background:#000"></video><canvas id="wC" hidden></canvas><p class="small muted" id="wM">Kamera startet …</p><button class="btn block" id="wX">Abbrechen</button>`,async s=>{let done=false;const v=s.querySelector('#wV'),cv=s.querySelector('#wC');
  s.querySelector('#wX').onclick=()=>{done=true;wCamStop();closeSheet();res(null)};
  try{await wCam(v);s.querySelector('#wM').textContent='Halte den Code ruhig ins Bild.'}catch(e){s.querySelector('#wM').textContent='Kamera ließ sich nicht öffnen.';return}
  const loop=async()=>{if(done)return;const t=await wReadFrame(v,cv);if(t){done=true;wCamStop();closeSheet();res(t);return}setTimeout(loop,250)};loop()})})}

/* ---------- Aufgaben ---------- */
const WSATZ=[['Ich bin wach.','Heute wird gut.','Aufstehen, los geht’s.'],['Ich stehe jetzt auf und trinke ein Glas Wasser.','Der frühe Vogel fängt den Wurm, also raus hier.','Fünf Minuten anfangen reicht für den Start.'],['Wer morgens gleich aufsteht, hat den Kopf frei für die wichtigen Dinge des Tages.','Ich mache heute zuerst die eine Sache, die ich sonst gern aufschiebe.','Kleine Schritte jeden Morgen bringen mich weiter als große Pläne am Abend.']];
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function wMath(lv){if(lv===1){const a=rnd(12,49),b=rnd(11,49);return{q:`${a} + ${b}`,a:a+b}}if(lv===2){const a=rnd(3,12),b=rnd(4,12),c=rnd(5,40);return{q:`${a} × ${b} + ${c}`,a:a*b+c}}const a=rnd(12,29),b=rnd(3,9),c=rnd(15,99);return{q:`${a} × ${b} − ${c}`,a:a*b-c}}
function wPoke(){if(!CAP||!WK.cur||WK.cur.test==='web')return;const now=Date.now();if(now-WK.pauseAt>8000){WK.pauseAt=now;try{WP().pause({sek:25})}catch(e){}}}
function wTaskRun(box,task,lv,n,done){let i=0;const step=()=>{if(i>=n){done();return}i++;const head=`<p class="small muted" style="text-align:center">Aufgabe ${i} von ${n}</p>`;
 if(task==='rechnen'){const p=wMath(lv);let inp='';box.innerHTML=`${head}<p class="wk-q">${p.q} = ?</p><p class="wk-in" id="wkIn">&nbsp;</p><div class="wk-pad">${[1,2,3,4,5,6,7,8,9,'−',0,'⌫'].map(k=>`<button data-k="${k}">${k}</button>`).join('')}</div><button class="btn pri block" id="wkOk">Prüfen</button>`;
  const show=()=>box.querySelector('#wkIn').textContent=inp||' ';box.querySelector('.wk-pad').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;wPoke();const k=b.dataset.k;if(k==='⌫')inp=inp.slice(0,-1);else if(k==='−'){inp=inp.startsWith('-')?inp.slice(1):'-'+inp}else if(inp.length<6)inp+=k;show()};
  box.querySelector('#wkOk').onclick=()=>{wPoke();if(+inp===p.a&&inp!==''){haptic&&haptic();step()}else{box.querySelector('#wkIn').classList.add('bad');setTimeout(()=>{box.querySelector('#wkIn').classList.remove('bad');inp='';show()},500)}}}
 else if(task==='tippen'){const t=WSATZ[lv-1][rnd(0,2)];box.innerHTML=`${head}<p class="wk-satz">${esc(t)}</p><textarea class="inp" id="wkT" rows="3" autocapitalize="sentences" spellcheck="false" placeholder="Hier abtippen …"></textarea><button class="btn pri block" id="wkOk">Prüfen</button>`;
  const ta=box.querySelector('#wkT');ta.oninput=wPoke;const norm=x=>x.replace(/[’']/g,"'").replace(/\s+/g,' ').trim();box.querySelector('#wkOk').onclick=()=>{if(norm(ta.value)===norm(t))step();else{ta.classList.add('bad');toast('Nicht ganz – genau abtippen.');setTimeout(()=>ta.classList.remove('bad'),600)}}}
 else if(task==='schuetteln'){const need=[15,30,50][lv-1];let c=0,last=0,got=false;box.innerHTML=`${head}<p class="wk-q">Schütteln!</p><div class="bar" style="width:100%;height:18px"><i id="wkB" style="width:0%"></i></div><p class="wk-in" id="wkC">0 / ${need}</p><button class="btn ghost block" id="wkAlt" hidden>Kein Sensor? Stattdessen rechnen</button>`;
  const on=e=>{const a=e.accelerationIncludingGravity||e.acceleration;if(!a)return;got=true;const g=Math.hypot(a.x||0,a.y||0,a.z||0);const now=Date.now();if(g>22&&now-last>220){last=now;c++;wPoke();box.querySelector('#wkB').style.width=Math.min(100,c/need*100)+'%';box.querySelector('#wkC').textContent=`${c} / ${need}`;if(c>=need){window.removeEventListener('devicemotion',on);WK.motion=null;step()}}};
  WK.motion=on;window.addEventListener('devicemotion',on);setTimeout(()=>{if(!got){const b=box.querySelector('#wkAlt');if(b){b.hidden=false;b.onclick=()=>{window.removeEventListener('devicemotion',on);task='rechnen';i--;step()}}}},3500)}
 else if(task==='merken'){const L=[4,5,7][lv-1],seq=Array.from({length:L},()=>rnd(0,8));let pos=0,ready=false;box.innerHTML=`${head}<p class="small" style="text-align:center" id="wkH">Merk dir die Reihenfolge …</p><div class="wk-grid">${Array.from({length:9},(_,k)=>`<button data-c="${k}"></button>`).join('')}</div>`;
  const cells=[...box.querySelectorAll('[data-c]')];let t=600;seq.forEach((c,j)=>{setTimeout(()=>cells[c].classList.add('on'),t+j*700);setTimeout(()=>cells[c].classList.remove('on'),t+j*700+450)});setTimeout(()=>{ready=true;box.querySelector('#wkH').textContent='Jetzt nachtippen'},t+L*700);
  box.querySelector('.wk-grid').onclick=e=>{const b=e.target.closest('[data-c]');if(!b||!ready)return;wPoke();const c=+b.dataset.c;b.classList.add('on');setTimeout(()=>b.classList.remove('on'),200);if(c===seq[pos]){pos++;if(pos>=L)setTimeout(step,300)}else{ready=false;box.querySelector('#wkH').textContent='Falsch – nochmal ansehen';pos=0;seq.forEach((c2,j)=>{setTimeout(()=>cells[c2].classList.add('on'),600+j*700);setTimeout(()=>cells[c2].classList.remove('on'),600+j*700+450)});setTimeout(()=>{ready=true;box.querySelector('#wkH').textContent='Jetzt nachtippen'},600+L*700)}}}
 else if(task==='code'){box.innerHTML=`${head}<p class="wk-q" style="font-size:22px">Scanne deinen Wecker-Code</p><video id="wkV" playsinline muted style="width:100%;border-radius:12px;background:#000;max-height:45vh;object-fit:cover"></video><canvas id="wkCv" hidden></canvas><p class="small" id="wkM" style="text-align:center">Kamera startet …</p><button class="btn ghost block" id="wkAlt" hidden>Kamera geht nicht? Stattdessen rechnen</button>`;
  const v=box.querySelector('#wkV'),cv=box.querySelector('#wkCv');let ok=false;const fail=()=>{const b=box.querySelector('#wkAlt');b.hidden=false;b.onclick=()=>{ok=true;wCamStop();task='rechnen';lv=3;i--;step()}};
  wCam(v).then(()=>{box.querySelector('#wkM').textContent='Halte den Code ins Bild';const loop=async()=>{if(ok||!box.isConnected)return;const t=await wReadFrame(v,cv);if(t&&t===S.set.weckerCode){ok=true;wCamStop();step();return}if(t)box.querySelector('#wkM').textContent='Das ist nicht dein Wecker-Code';wPoke();setTimeout(loop,250)};loop();setTimeout(()=>{if(!ok)fail()},90000)}).catch(()=>{box.querySelector('#wkM').textContent='Kamera ließ sich nicht öffnen.';fail()})}
 else{/* wach: eine leichte Aufgabe */const p=wMath(1);box.innerHTML=`${head}<p class="wk-q">${p.q} = ?</p><input class="inp" id="wkI" inputmode="numeric" style="font-size:28px;text-align:center"><button class="btn pri block" id="wkOk">Ich bin wach</button>`;box.querySelector('#wkOk').onclick=()=>{if(+val('wkI')===p.a)step();else toast('Nochmal rechnen')}}};step()}

/* ---------- Klingeln ---------- */
function wParse(a){const w=wList().find(x=>x.id===a.id);const[t,l,n]=String(a.task||'').split('|');
 if(a.id==='wach')return{w:w||{label:'Bist du wach?',snooze:0},task:'wach',lv:1,n:1};
 return{w:w||{label:a.label||'Wecker',snooze:1,snMin:5,sound:'standard',wach:false},task:WTASK[t]?t:(w&&w.task)||'rechnen',lv:+l||(w&&w.level)||2,n:+n||(w&&w.n)||3}}
function weckerRing(a){if(!a||!a.id)return;if(WK.cur&&WK.cur.id===a.id&&$('#weckerScr'))return;const p=wParse(a);WK.cur=Object.assign({id:a.id,label:a.label},p);
 const el=$('#weckerScr')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'weckerScr'}));
 const snLeft=(p.w.snooze||0)-WK.snz;const now=new Date();
 el.innerHTML=`<div class="wk-box"><p class="wk-time">${pad(now.getHours())}:${pad(now.getMinutes())}</p><p class="wk-label">${esc(a.label||p.w.label||'Wecker')}</p>
  <div id="wkTask" class="wk-task"><button class="btn pri block wk-big" id="wkGo">Aufgabe lösen: ${p.task==='wach'?'Bist du wach?':WTASK[p.task]}</button>
  ${snLeft>0&&a.id!=='wach'?`<button class="btn block" id="wkSn">Schlummern · ${p.w.snMin||5} Min (noch ${snLeft}×)</button>`:''}</div></div>`;
 document.documentElement.classList.add('kk-wecker');
 el.querySelector('#wkGo').onclick=()=>{wPoke();wTaskRun(el.querySelector('#wkTask'),p.task,p.lv,p.n,weckerDone)};
 const sn=el.querySelector('#wkSn');sn&&(sn.onclick=async()=>{WK.snz++;try{await WP().schlummern({id:'snz',min:p.w.snMin||5,label:a.label||p.w.label,sound:p.w.sound||'standard',task:`${p.task}|${p.lv}|${p.n}`})}catch(e){}weckerClose();toast(`Klingelt wieder in ${p.w.snMin||5} Min`)})}
async function weckerDone(){const c=WK.cur;if(!c)return;wCamStop();if(WK.motion){window.removeEventListener('devicemotion',WK.motion);WK.motion=null}
 if(CAP&&c.test!=='web'){try{await WP().stoppen()}catch(e){}if(c.w&&c.w.wach&&c.id!=='wach'&&c.test!=='test'){try{await WP().schlummern({id:'wach',min:5,label:'Bist du wach?',sound:c.w.sound||'standard',task:'wach|1|1',stop:false})}catch(e){}}}
 WK.snz=0;const real=!c.test;if(real){const t=today();S.wake=S.wake||{days:[]};if(!S.wake.days.includes(t)){S.wake.days=[...S.wake.days,t].slice(-60);pts(5,'Aufgestanden')}save()}
 const streak=(()=>{let n=0,d=today();const D=new Set((S.wake||{}).days||[]);while(D.has(d)){n++;d=addDays(d,-1)}return n})();
 const one=typeof ranked==='function'?ranked()[0]:null;const ev=(typeof eventsOn==='function'?eventsOn(today()):[]).length;const locked=document.documentElement.classList.contains('kk-locked');
 const el=$('#weckerScr');if(!el)return;el.innerHTML=`<div class="wk-box"><p class="wk-label">Guten Morgen ☀️</p><p class="wk-time" style="font-size:44px">${fmtDate(today())}</p>
  ${real?`<p style="text-align:center">${streak>1?`${streak} Tage in Folge pünktlich aufgestanden 🔥`:'Aufgestanden! +5 Punkte'}</p>`:'<p style="text-align:center">Test geschafft.</p>'}
  ${!locked&&one?`<div class="card" style="padding:12px;margin:12px 0"><p class="small muted">Deine eine Sache heute</p><p><b>${esc(one.title)}</b></p></div>`:''}${!locked&&ev?`<p class="small" style="text-align:center">${ev} Termin${ev>1?'e':''} heute</p>`:''}
  ${c.w&&c.w.wach&&c.id!=='wach'&&!c.test?'<p class="small muted" style="text-align:center">In 5 Min klingelt es nochmal, außer du tippst „Ich bin wach“.</p>':''}
  <button class="btn pri block wk-big" id="wkWach">${c.w&&c.w.wach&&c.id!=='wach'&&!c.test?'Ich bin wach':'Fertig'}</button></div>`;
 el.querySelector('#wkWach').onclick=async()=>{if(CAP){try{await WP().abbrechen({id:'wach'})}catch(e){}}weckerClose();go('heute')}}
function weckerClose(){wCamStop();const el=$('#weckerScr');el&&el.remove();document.documentElement.classList.remove('kk-wecker');WK.cur=null;weckerPlan()}
async function weckerTry(){const w=wList()[0]||{label:'Test-Wecker',task:'rechnen',level:2,n:2,snooze:1,snMin:5,sound:'standard'};closeSheet();
 if(CAP){try{await WP().testen({id:'test',label:'Test: '+(w.label||'Wecker'),sound:w.sound||'standard',task:`${w.task}|${w.level}|${Math.min(w.n,2)}`});setTimeout(()=>WP().status().then(st=>{if(st.aktiv){weckerRing(st.aktiv);WK.cur.test='test'}}),600);return}catch(e){}}
 weckerRing({id:'test',label:'Test: '+(w.label||'Wecker'),task:`${w.task}|${w.level}|${Math.min(w.n,2)}`});WK.cur.test='web'}
async function weckerCheck(){if(!CAP)return;try{const st=await WP().status();if(st.aktiv)weckerRing(st.aktiv)}catch(e){}}
if(CAP){try{WP().addListener('klingelt',a=>weckerRing(a))}catch(e){}weckerCheck();weckerPlan();document.addEventListener('visibilitychange',()=>{if(!document.hidden)weckerCheck()})}
