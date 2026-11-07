/* Kleinkram · Wecker mit Aufgabe: klingelt, bis eine Aufgabe gelöst ist (Rechnen, Schütteln, Abtippen, Code scannen, Merken) */
"use strict";
/* Das Klingeln selbst macht Android (WeckerService): pünktlich, über dem Sperrbildschirm, in Wecker-Lautstärke, auch nach Neustart.
   Hier: Wecker verwalten, Aufgaben stellen, Morgen-Bildschirm. Im Browser lässt sich nur die Aufgabe ausprobieren. */
const WK={cur:null,snz:0,pauseAt:0,motion:null,stream:null};
const WTASK={rechnen:'Rechnen',schuetteln:'Schütteln',tippen:'Satz abtippen',ort:'Foto von einem Ort',merken:'Muster merken'};
const WTASK_INFO={rechnen:'Kopfrechnen weckt das Gehirn',schuetteln:'Handy kräftig schütteln',tippen:'Einen Satz fehlerfrei abtippen',ort:'Die gleiche Stelle fotografieren wie vorher festgelegt (z. B. Waschbecken, Kaffeemaschine) – dafür musst du aufstehen',merken:'Ein Leuchtmuster nachtippen'};
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
 /* Alarm-Modus: wichtige Aufgaben klingeln wie ein Wecker */
 const now=new Date();(S.tasks||[]).filter(t=>t.alarm&&t.due&&!t.done&&!t.archived).forEach(t=>{const[h,m]=t.alarm.split(':').map(Number);const at=P(t.due);at.setHours(h,m,0,0);if(at>now)regeln.push({id:'tk-'+t.id,h,m,days:[],date:t.due,label:t.title,sound:S.set.alarmSound||'standard',task:'aufgabe|1|1'})});
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
 <label class="f">Schlafenszeit-Erinnerung<select class="inp" id="wBed">${[[0,'aus'],[7,'7 Std vor dem Wecker'],[7.5,'7,5 Std vor dem Wecker'],[8,'8 Std vor dem Wecker'],[8.5,'8,5 Std vor dem Wecker'],[9,'9 Std vor dem Wecker']].map(([v,l])=>`<option value="${v}" ${(+S.set.bedtime||0)===v?'selected':''}>${l}</option>`).join('')}</select></label>
 <button class="btn block ghost" data-wt="1">Aufgabe ausprobieren${CAP?' (mit Klingeln)':''}</button>`,s=>{
  s.querySelectorAll('[data-ws]').forEach(b=>b.onclick=async()=>{try{await WP().einstellungen({was:b.dataset.ws})}catch(e){}});
  s.querySelectorAll('[data-wo]').forEach(c=>c.onchange=async()=>{const w=wList().find(x=>x.id===c.dataset.wo);w.on=c.checked;if(w.on&&!w.days.length)w.date=iso(wNext(Object.assign({},w,{date:null})));save();await weckerPlan();render();toast(w.on?`Klingelt ${wFmtNext(wNext(w))}`:'Wecker aus');weckerSheet()});
  s.querySelectorAll('[data-we]').forEach(b=>b.onclick=()=>weckerEdit(b.dataset.we));
  s.querySelector('[data-wt]').onclick=()=>weckerTry();
  s.querySelector('#wBed').onchange=e=>{S.set.bedtime=+e.target.value;save();toast(S.set.bedtime?'Du bekommst abends einen Hinweis':'Schlafenszeit-Erinnerung aus')}})}
function weckerEditKeep(w,id){weckerEdit(id,w)}
function weckerEdit(id,keep){const w0=wList().find(x=>x.id===id);const w=keep?keep:w0?Object.assign({},w0,{days:[...w0.days]}):{id:uid(),on:true,h:6,m:30,days:[1,2,3,4,5],label:'Aufstehen',task:'rechnen',level:2,n:3,snooze:1,snMin:5,sound:'standard',wach:true};
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
  const codeBox=()=>{const k=s.querySelector('[name=wk]:checked').value;const O=wOrte();if(k!=='ort'){s.querySelector('#wCode').innerHTML='';return}
   s.querySelector('#wCode').innerHTML=`<div class="banner"><div class="grow"><p class="small"><b>Welcher Ort?</b> Morgens musst du genau diese Stelle fotografieren.</p>
    ${O.length?`<div class="stack" style="margin-top:6px">${O.map(o=>`<label class="switch wk-radio" style="align-items:center"><input type="radio" name="wo" value="${o.id}" ${(w.ortId||O[0].id)===o.id?'checked':''}>${o.img?`<img src="${o.img}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px">`:''}<span class="grow"><b>${esc(o.name)}</b></span></label>`).join('')}</div>`:'<p class="small muted">Noch kein Ort festgelegt.</p>'}
    <button class="btn sm block" id="wON" style="margin-top:8px">+ Ort festlegen (2 Fotos)</button></div></div>`;
   s.querySelector('#wON').onclick=()=>{const[h,m]=(val('wT')||'06:30').split(':').map(Number);Object.assign(w,{h,m,label:val('wL'),task:'ort',level:+val('wLv'),n:+val('wN'),snooze:+val('wS'),snMin:+val('wSm'),sound:val('wSo'),wach:s.querySelector('#wW').checked});weckerOrtSheet(o=>{w.ortId=o.id;weckerEditKeep(w,id)},()=>weckerEditKeep(w,id))}};
  s.querySelector('#wK').onchange=codeBox;codeBox();
  s.querySelector('#wGo').onclick=async()=>{const[h,m]=(val('wT')||'06:30').split(':').map(Number);Object.assign(w,{h,m,label:val('wL')||'Wecker',task:s.querySelector('[name=wk]:checked').value,level:+val('wLv'),n:+val('wN'),snooze:+val('wS'),snMin:+val('wSm'),sound:val('wSo'),wach:s.querySelector('#wW').checked,on:true});
   if(w.task==='ort'){const sel=s.querySelector('[name=wo]:checked');if(!sel){toast('Erst einen Ort festlegen.');return}w.ortId=sel.value}
   w.date=w.days.length?null:iso(wNext(Object.assign({},w,{date:null})));
   const i=wList().findIndex(x=>x.id===w.id);if(i>=0)wList()[i]=w;else wList().push(w);save();await weckerPlan();render();toast(`Wecker gestellt: ${wFmtNext(wNext(w))} (${wUntil(wNext(w))})`);weckerSheet()};
  const d=s.querySelector('#wDel');d&&(d.onclick=()=>confirmSheet('Wecker löschen?',`${wTime(w)} · ${esc(w.label)}`,'Löschen',async()=>{S.wecker=wList().filter(x=>x.id!==w.id);save();await weckerPlan();render();weckerSheet()},true))})}

/* ---------- Kamera: QR-Code lesen (live) ---------- */
async function wCam(video){WK.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});video.srcObject=WK.stream;await video.play()}
function wCamStop(){try{WK.stream&&WK.stream.getTracks().forEach(t=>t.stop())}catch(e){}WK.stream=null}

/* ---------- Ort wiedererkennen: Bildinhalt (Handy: ImageNet-Klassen) + Farbton-Verteilung + grober Bildaufbau ---------- */
const wOrte=()=>S.wOrte=S.wOrte||[];
async function wFeat(src,native){const cv=document.createElement('canvas');const sw=src.videoWidth||src.naturalWidth||src.width,sh=src.videoHeight||src.naturalHeight||src.height;const k=320/Math.max(sw,sh);cv.width=Math.max(1,Math.round(sw*k));cv.height=Math.max(1,Math.round(sh*k));const x=cv.getContext('2d');x.drawImage(src,0,0,cv.width,cv.height);
 const d=x.getImageData(0,0,cv.width,cv.height).data,W=cv.width,H=cv.height;
 const h=new Float32Array(64);let n=0;for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],s=r+g+b+1;if(s<40)continue;h[Math.min(7,(r/s*16)|0)*8+Math.min(7,(g/s*16)|0)]++;n++}for(let i=0;i<64;i++)h[i]/=n||1;
 const GW=16,GH=12,g=new Float32Array(GW*GH);for(let y=0;y<GH;y++)for(let xx=0;xx<GW;xx++){let s=0,c=0;for(let yy=Math.floor(y*H/GH);yy<Math.floor((y+1)*H/GH);yy+=2)for(let x2=Math.floor(xx*W/GW);x2<Math.floor((xx+1)*W/GW);x2+=2){const o=(yy*W+x2)*4;s+=d[o]*.3+d[o+1]*.59+d[o+2]*.11;c++}g[y*GW+xx]=c?s/c:0}
 let m=0;g.forEach(v=>m+=v);m/=g.length;let sd=0;g.forEach(v=>sd+=(v-m)**2);sd=Math.sqrt(sd/g.length)||1;for(let i=0;i<g.length;i++)g[i]=(g[i]-m)/sd;
 const f={h:Array.from(h,v=>Math.round(v*1000)/1000),g:Array.from(g,v=>Math.round(v*100)/100)};
 if(native&&CAP){try{const r=await CapP('Texterkennung').bildMerkmal({image:cv.toDataURL('image/jpeg',.85).split(',')[1]});f.n={};(r.n||[]).forEach(([t,c])=>f.n[t]=c/100);(r.l||[]).forEach(([t,c])=>f.n['l:'+t]=c/100)}catch(e){}}
 return f}
function wSim(a,b){let hs=0;for(let i=0;i<64;i++)hs+=Math.sqrt((a.h[i]||0)*(b.h[i]||0));let gc=0;for(let i=0;i<a.g.length;i++)gc+=a.g[i]*b.g[i];gc=Math.max(0,gc/a.g.length);
 if(a.n&&b.n){const ks=new Set([...Object.keys(a.n),...Object.keys(b.n)]);let dt=0,na=0,nb=0;ks.forEach(k=>{const x=a.n[k]||0,y=b.n[k]||0;dt+=x*y;na+=x*x;nb+=y*y});const lc=na&&nb?dt/Math.sqrt(na*nb):0;return .45*lc+.25*hs+.30*gc}
 return .45*hs+.55*gc}
/* Ort festlegen: 2 Fotos derselben Stelle (leicht anderer Winkel). Daraus ergibt sich, wie ähnlich ein Treffer sein muss. */
function weckerOrtSheet(done,back){const refs=[];let img=null;
 sheet(`<h2>Ort festlegen</h2><p class="small muted">Wähle eine Stelle, zu der du morgens gehen musst – z. B. Waschbecken, Kaffeemaschine, Haustür. Etwas mit klarem Aussehen klappt am besten (nicht eine weiße Wand). Das Foto bleibt in Kleinkram, nicht in der Galerie.</p>
 <label class="f">Name<input class="inp" id="woN" placeholder="z. B. Bad, Küche, Flur" autocomplete="off"></label>
 <video id="woV" playsinline muted style="width:100%;border-radius:12px;background:#000;max-height:45vh;object-fit:cover"></video>
 <p class="small" id="woM">Kamera startet …</p>
 <div class="sheet-foot stack"><button class="btn pri block" id="woF" disabled>Foto 1 von 2</button><button class="btn block ghost" id="woX">Abbrechen</button></div>`,async s=>{const v=s.querySelector('#woV'),btn=s.querySelector('#woF');
  s.querySelector('#woX').onclick=()=>{wCamStop();back?back():closeSheet()};
  try{await wCam(v);btn.disabled=false;s.querySelector('#woM').textContent='Richte die Kamera auf die Stelle und tippe auf „Foto“.'}catch(e){s.querySelector('#woM').textContent='Kamera ließ sich nicht öffnen. In den App-Einstellungen die Kamera erlauben.';return}
  btn.onclick=async()=>{btn.disabled=true;btn.textContent='Moment …';const f=await wFeat(v,true);refs.push(f);
   if(refs.length===1){const c=document.createElement('canvas');c.width=160;c.height=Math.round(160*v.videoHeight/v.videoWidth)||120;c.getContext('2d').drawImage(v,0,0,c.width,c.height);img=c.toDataURL('image/jpeg',.7);
    s.querySelector('#woM').textContent='Gut! Jetzt einen Schritt zur Seite und dieselbe Stelle nochmal fotografieren.';btn.textContent='Foto 2 von 2';btn.disabled=false;return}
   wCamStop();const sim=wSim(refs[0],refs[1]);const thr=Math.max(.5,Math.min(.85,sim*.88));
   const o={id:uid(),name:val('woN')||'Mein Ort',refs,thr:Math.round(thr*100)/100,img};wOrte().push(o);save();toast(`Ort „${o.name}“ gespeichert`);done(o)}})}

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
 else if(task==='ort'){const O=wOrte().find(o=>o.id===WK.cur.ortId)||wOrte()[0];if(!O){task='rechnen';lv=3;i--;step();return}
  box.innerHTML=`${head}<p class="wk-q" style="font-size:22px">Geh zu: ${esc(O.name)}</p>${O.img?`<img src="${O.img}" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:10px;margin:0 auto;display:block;opacity:.85">`:''}<video id="wkV" playsinline muted style="width:100%;border-radius:12px;background:#000;max-height:42vh;object-fit:cover"></video><div class="bar" style="width:100%;height:12px"><i id="wkB" style="width:0%"></i></div><p class="small" id="wkM" style="text-align:center">Kamera startet …</p><button class="btn ghost block" id="wkAlt" hidden>Klappt nicht? Stattdessen schwer rechnen</button>`;
  const v=box.querySelector('#wkV');let ok=false,hits=0,tries=0;const fail=()=>{const b=box.querySelector('#wkAlt');if(!b)return;b.hidden=false;b.onclick=()=>{ok=true;wCamStop();task='rechnen';lv=3;i--;step()}};
  wCam(v).then(()=>{box.querySelector('#wkM').textContent='Halte die Kamera auf die gleiche Stelle wie beim Festlegen';const loop=async()=>{if(ok||!box.isConnected)return;wPoke();tries++;
   const f=await wFeat(v,!!O.refs[0].n);const sc=Math.max(...O.refs.map(r=>wSim(f,r)));const pct=Math.max(0,Math.min(100,sc/O.thr*100));box.querySelector('#wkB').style.width=pct+'%';
   if(sc>=O.thr){hits++;box.querySelector('#wkM').textContent='Gefunden – kurz ruhig halten …';if(hits>=2){ok=true;wCamStop();step();return}}else{hits=0;box.querySelector('#wkM').textContent=pct>70?'Fast – etwas näher oder gleicher Winkel':'Noch nicht die richtige Stelle'}
   if(tries===40)fail();setTimeout(loop,450)};loop()}).catch(()=>{box.querySelector('#wkM').textContent='Kamera ließ sich nicht öffnen.';fail()})}
 else{/* wach: eine leichte Aufgabe */const p=wMath(1);box.innerHTML=`${head}<p class="wk-q">${p.q} = ?</p><input class="inp" id="wkI" inputmode="numeric" style="font-size:28px;text-align:center"><button class="btn pri block" id="wkOk">Ich bin wach</button>`;box.querySelector('#wkOk').onclick=()=>{if(+val('wkI')===p.a)step();else toast('Nochmal rechnen')}}};step()}

/* ---------- Klingeln ---------- */
function wParse(a){const w=wList().find(x=>x.id===a.id);const[t,l,n]=String(a.task||'').split('|');
 if(a.id==='wach')return{w:w||{label:'Bist du wach?',snooze:0},task:'wach',lv:1,n:1};
 if(/^tks?-/.test(a.id)||t==='aufgabe')return{w:{label:a.label||'Erinnerung',snooze:0},task:'aufgabe',lv:1,n:1,tid:a.id.replace(/^tks?-/,'')};
 return{w:w||{label:a.label||'Wecker',snooze:1,snMin:5,sound:'standard',wach:false},task:WTASK[t]?t:(w&&w.task)||'rechnen',lv:+l||(w&&w.level)||2,n:+n||(w&&w.n)||3}}
function weckerRing(a){if(!a||!a.id)return;if(WK.cur&&WK.cur.id===a.id&&$('#weckerScr'))return;const p=wParse(a);WK.cur=Object.assign({id:a.id,label:a.label,ortId:p.w&&p.w.ortId},p);
 const el=$('#weckerScr')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'weckerScr'}));
 const snLeft=(p.w.snooze||0)-WK.snz;const now=new Date();
 el.innerHTML=`<div class="wk-box"><p class="wk-time">${pad(now.getHours())}:${pad(now.getMinutes())}</p><p class="wk-label">${esc(a.label||p.w.label||'Wecker')}</p>
  <div id="wkTask" class="wk-task"><button class="btn pri block wk-big" id="wkGo">Aufgabe lösen: ${p.task==='wach'?'Bist du wach?':WTASK[p.task]}</button>
  ${snLeft>0&&a.id!=='wach'?`<button class="btn block" id="wkSn">Schlummern · ${p.w.snMin||5} Min (noch ${snLeft}×)</button>`:''}</div></div>`;
 document.documentElement.classList.add('kk-wecker');
 if(p.task==='aufgabe'){const tk=(S.tasks||[]).find(x=>x.id===p.tid);el.querySelector('#wkTask').innerHTML=`<p style="text-align:center" class="small">Wichtige Erinnerung${tk&&tk.cost?` · Aufschieben kostet ${eur(tk.cost.eur)}`:''}</p><button class="btn pri block wk-big" id="wkDone">✓ Erledigt</button><button class="btn block" id="wkHour">In 1 Stunde nochmal</button><button class="btn block" id="wkOff">Ausschalten</button>`;
  const stop=async()=>{try{if(CAP)await WP().stoppen()}catch(e){}};
  el.querySelector('#wkDone').onclick=async()=>{await stop();if(tk&&!tk.done)completeTask(tk.id);weckerClose();toast('Erledigt – stark!')};
  el.querySelector('#wkHour').onclick=async()=>{try{await WP().schlummern({id:'tks-'+p.tid,min:60,label:a.label,sound:S.set.alarmSound||'standard',task:'aufgabe|1|1'})}catch(e){}weckerClose();toast('Klingelt in 1 Stunde wieder')};
  el.querySelector('#wkOff').onclick=async()=>{await stop();weckerClose()};return}
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
