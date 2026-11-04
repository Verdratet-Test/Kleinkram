/* Kleinkram · Automatische Wochen-Sicherung, App-Sperre (Fingerabdruck/PIN) */
"use strict";
/* ---------- Automatische Sicherung ---------- */
const AB_DIR='Kleinkram/Sicherungen';
const abOn=()=>CAP&&S.set.autoBackup!==false;
async function autoBackup(force){if(!CAP||(!force&&!abOn()))return false;const t=today();
 if(!force&&S.lastAutoBackup&&diff(S.lastAutoBackup,t)<7)return false;
 try{const data=await fullBackup();await CapP('Filesystem').writeFile({path:`${AB_DIR}/kleinkram-auto-${t}.json`,data,directory:'DOCUMENTS',encoding:'utf8',recursive:true});
  S.lastAutoBackup=t;S.lastBackup=t;S.autoBackupErr=null;save();if(UI.tab==='ich')render();return true}
 catch(e){S.autoBackupErr=String(e&&e.message||e).slice(0,120);save();return false}}
async function abList(){try{const r=await CapP('Filesystem').readdir({path:AB_DIR,directory:'DOCUMENTS'});return(r.files||[]).map(f=>typeof f==='string'?{name:f}:f).filter(f=>/^kleinkram-.*\.json$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name))}catch(e){return[]}}
function abSection(){if(!CAP)return'';const on=abOn();
 return`<label class="switch"><span>Jede Woche automatisch sichern<br><span class="small muted">in Dokumente/Kleinkram/Sicherungen${S.lastAutoBackup?` · zuletzt ${fmtD(S.lastAutoBackup)}`:''}</span></span><input type="checkbox" id="setAutoBackup" ${on?'checked':''}></label>
 ${S.autoBackupErr&&on?`<p class="small"><span class="chip crit">Sicherung ging nicht</span> ${esc(S.autoBackupErr)}. Tipp: unter Handy aufräumen den Zugriff auf alle Dateien erlauben.</p>`:''}
 <div class="row"><button class="btn sm" data-act="abNow">Jetzt sichern</button><button class="btn sm" data-act="abManage">Sicherungen verwalten</button></div>`}
async function abManageSheet(){const L=await abList();const keep=4,old=L.slice(keep);
 sheet(`<h2>Automatische Sicherungen</h2><p class="small muted">Ordner: Dokumente/Kleinkram/Sicherungen. Die Dateien bleiben auch erhalten, wenn Kleinkram gelöscht wird. Kopier sie ab und zu auf den PC oder in die Cloud – dann sind sie auch bei Verlust des Handys sicher.</p>
 ${L.length?L.map(f=>`<div class="li"><div class="grow"><p class="mono small">${esc(f.name)}</p>${f.size?`<p class="small muted">${fmtB(f.size)}</p>`:''}</div><button class="btn sm" data-ab="${esc(f.name)}">Einspielen</button></div>`).join(''):'<p class="muted">Noch keine automatische Sicherung vorhanden.</p>'}
 ${old.length?`<button class="btn block danger" id="abDel">${old.length} ältere löschen (die ${keep} neuesten bleiben)</button>`:''}`,s=>{
  s.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>confirmSheet('Sicherung einspielen?',`Ersetzt alle aktuellen Daten durch den Stand aus „${b.dataset.ab}“.`,'Einspielen',async()=>{try{const r=await CapP('Filesystem').readFile({path:`${AB_DIR}/${b.dataset.ab}`,directory:'DOCUMENTS',encoding:'utf8'});applyBackup(String(r.data));toast('Sicherung eingespielt')}catch(e){toast('Ließ sich nicht einspielen.')}},true));
  const d=s.querySelector('#abDel');d&&(d.onclick=()=>confirmSheet('Ältere Sicherungen löschen?',`${old.length} Datei${old.length>1?'en':''} werden endgültig gelöscht. Die ${keep} neuesten bleiben.`,'Löschen',async()=>{let n=0;for(const f of old){try{await CapP('Filesystem').deleteFile({path:`${AB_DIR}/${f.name}`,directory:'DOCUMENTS'});n++}catch(e){}}toast(`${n} gelöscht`);abManageSheet()},true))})}

/* ---------- App-Sperre ---------- */
const LOCK={busy:false,bgAt:0,graceMs:120000};
const lockOn=()=>!!(CAP&&S.set.lock);
function lockCover(){if($('#lockScr'))return $('#lockScr');const d=document.createElement('div');d.id='lockScr';
 d.innerHTML=`<div class="lock-box">${ICON.lock}<h2>Kleinkram ist gesperrt</h2><p class="small muted">Fingerabdruck oder Display-Sperre</p><button class="btn pri" id="lockGo">Entsperren</button><p class="small" id="lockMsg"></p></div>`;
 document.body.appendChild(d);d.querySelector('#lockGo').onclick=()=>unlockApp();return d}
function lockRelease(){const d=$('#lockScr');d&&d.remove();document.documentElement.classList.remove('kk-locked')}
async function unlockApp(){if(LOCK.busy)return;LOCK.busy=true;const m=$('#lockMsg');if(m)m.textContent='';
 try{await CapP('Sperre').pruefen({titel:'Kleinkram entsperren'});lockRelease()}
 catch(e){const c=String(e&&e.code||'');if(m)m.textContent=c==='10'||c==='13'||c==='5'?'':'Nicht entsperrt. '+(e&&e.message||'')}
 LOCK.busy=false}
function lockNow(){if(!lockOn())return;document.documentElement.classList.add('kk-locked');lockCover();unlockApp()}
async function lockToggle(el){const want=el.checked;el.checked=!want;const SP=CapP('Sperre');
 try{const st=await SP.status();if(!st.ok){toast('Auf dem Handy ist keine Display-Sperre (PIN, Muster, Fingerabdruck) eingerichtet.');return}
  await SP.pruefen({titel:want?'App-Sperre einschalten':'App-Sperre ausschalten'});S.set.lock=want;save();el.checked=want;toast(want?'App-Sperre ist an':'App-Sperre ist aus')}
 catch(e){toast(/nicht verfügbar|not implemented|Version/i.test(String(e&&e.message))?'Braucht die neue App-Version.':'Nicht bestätigt – nichts geändert.')}}
if(CAP){
 try{CapP('App').addListener('appStateChange',st=>{if(!lockOn())return;
  if(!st.isActive){LOCK.bgAt=Date.now();document.documentElement.classList.add('kk-locked');lockCover()}            /* Inhalt im App-Wechsler verdecken */
  else if(LOCK.bgAt&&Date.now()-LOCK.bgAt<LOCK.graceMs&&!LOCK.busy){lockRelease()}                                 /* kurz weg (z. B. Kamera): ohne Abfrage zurück */
  else if($('#lockScr'))unlockApp()})}catch(e){}
 if(lockOn())lockNow();
 setTimeout(()=>autoBackup(),8000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>autoBackup(),3000)});
}
