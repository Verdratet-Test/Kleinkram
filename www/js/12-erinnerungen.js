/* Kleinkram · Benachrichtigungen, Signaltöne, Status */
"use strict";
/* ---------- Erinnerungen (Benachrichtigungen der App) ---------- */
const cut=(x,n)=>{x=String(x||'');return x.length>n?x.slice(0,n-1).trimEnd()+'…':x};
function briefShort(day){const R=ranked(),ev=eventsOn(day).filter(e=>e.kind!=='geburtstag'),bd=eventsOn(day).filter(e=>e.kind==='geburtstag'),rt=S.routines.filter(r=>rDue(r,day)).length;
 const title=R[0]?cut('Zuerst: '+R[0].title,40):'Heute nichts Offenes';const b=[];
 if(ev.length){const f=ev[0];b.push(cut(`${f.time?f.time+' ':''}${f.title}`,28)+(ev.length>1?` +${ev.length-1}`:''))}else b.push('Keine Termine');
 if(bd.length)b.push(cut('Geb. '+bd[0].title.replace(/geburtstag\s*/i,''),20));if(rt)b.push(`${rt} Routinen`);return{title,body:b.join(' · ')}}
function reminderList(){const now=Date.now();const L=[];const add=(id,title,body,at)=>{if(at>now+5000)L.push({id,title,body,at:Math.round(at)})};
 if(S.set.brief){const[h,m]=(S.set.briefTime||'07:00').split(':').map(Number);for(let k=0;k<2;k++){const d=new Date();d.setDate(d.getDate()+k);d.setHours(h,m,0,0);const day=iso(d);const B=briefShort(day);add('kk-brief-'+day,B.title,B.body,d.getTime())}}
 if(S.set.remind){const lead=(+S.set.remindMin||30)*60000;for(let k=0;k<7;k++){const day=addDays(today(),k);eventsOn(day).forEach(e=>{if(!e.time)return;const[h,m]=e.time.split(':').map(Number);const d=P(day);d.setHours(h,m,0,0);add(`kk-ev-${e.id}-${day}`,cut(`${e.time} ${evLabel(e,day)}`,40),lead>=86400000?`morgen · ${CATS[e.cat]}`:`in ${lead>=3600000?lead/3600000+' Std':lead/60000+' Min'} · ${CATS[e.cat]}`,d.getTime()-lead)});
  S.tasks.filter(t=>!t.done&&!t.archived&&t.due===day).forEach(t=>{const d=P(day);d.setHours(9,0,0,0);add(`kk-tk-${t.id}-${day}`,cut('Fällig: '+t.title,40),t.cost&&+t.cost.eur?`Sonst ${eur(t.cost.eur)} · 5 Min reichen`:'5 Min anfangen reicht',d.getTime())})}
  {const t0=today(),wd=P(t0).getDay();const sun=addDays(t0,(7-wd)%7);const d=P(sun);d.setHours(18,0,0,0);if(!(S.weeks&&S.weeks[weekKey(sun)]&&S.weeks[weekKey(sun)].done))add('kk-week-'+weekKey(sun),'Wochen-Rückblick','5 Min · 3 Ziele · +20 Punkte',d.getTime())}
  S.tasks.filter(x=>!x.done&&!x.archived&&!x.started&&x.buddy&&x.buddy.name&&x.buddy.by&&x.due).forEach(x=>{const[h,m]=x.buddy.by.split(':').map(Number);const d=P(x.due);d.setHours(h,m,0,0);add(`kk-buddy-${x.id}-${x.due}`,cut('Noch nicht angefangen: '+x.title,40),`Jetzt 5 Min starten oder ${x.buddy.name} schreiben`,d.getTime())});
  objs().filter(isRented).forEach(o=>{for(let k=0;k<2;k++){const m=ymOf(addMonths(today().slice(0,8)+'01',k));if(rentState(o,m)==='paid')continue;const d=P(addDays(rentDue(o,m),2));d.setHours(9,0,0,0);add(`kk-rent-${o.id}-${m}`,cut('Miete prüfen: '+o.name,40),`${MON[+m.slice(5)-1]}${o.miete?' · '+eur(o.miete):''}`,d.getTime())}});
  S.routines.filter(r=>r.time).forEach(r=>{const day=rDue(r)&&!r.days.includes(today())?today():rNext(r);const[h,m]=r.time.split(':').map(Number);const d=P(day);d.setHours(h,m,0,0);add(`kk-rt-${r.id}-${day}`,cut(r.title,40),`Routine · ${rLabel(r)}`,d.getTime())})}
 return L}
const SOUNDS={standard:{n:'Kurz (Handy-Ton)'},gong:{n:'Gong · 4 s',f:'kk_gong.wav'},glocke:{n:'Glocke · 5 s',f:'kk_glocke.wav'},wecker:{n:'Wecker · 9 s',f:'kk_wecker.wav'}};
const sndKey=()=>SOUNDS[S.set.sound2]?S.set.sound2:'glocke';
const chanId=k=>`kk_${k}_v1`;
async function ensureChannel(){const k=sndKey(),LN=CapP('LocalNotifications');const o={id:chanId(k),name:`Erinnerungen · ${SOUNDS[k].n.split(' ·')[0].split(' (')[0]}`,description:'Erinnerungen von Kleinkram',importance:5,visibility:1,vibration:true,lights:true};if(SOUNDS[k].f)o.sound=SOUNDS[k].f;try{await LN.createChannel(o)}catch(e){}return o}
const notif=(o,ch)=>Object.assign(o,{channelId:ch.id},ch.sound?{sound:ch.sound}:{});
function soundPicker(){return`<div class="grid2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)"><label class="f">Signalton<select class="inp" id="setSound2">${Object.entries(SOUNDS).map(([k,v])=>`<option value="${k}" ${sndKey()===k?'selected':''}>${v.n}</option>`).join('')}</select></label><button class="btn" data-act="sndPreview" style="align-self:end">Anhören</button></div>`}
let previewAudio=null;function previewSound(){const k=sndKey();if(!SOUNDS[k].f){toast('Standard nutzt den Ton deines Handys.');return}try{previewAudio&&previewAudio.pause();previewAudio=new Audio('sounds/'+SOUNDS[k].f);previewAudio.play().catch(()=>toast('Vorhören geht nur in der App.'))}catch(e){}}
async function scheduleCap(L){const ch=await ensureChannel();const LN=CapP('LocalNotifications');try{const p=await LN.getPending();if(p.notifications&&p.notifications.length)await LN.cancel({notifications:p.notifications.map(n=>({id:n.id}))})}catch(e){}
 if(L.length)try{await LN.schedule({notifications:L.map(x=>notif({id:hid(x.id),title:x.title,body:x.body,schedule:{at:new Date(x.at),allowWhileIdle:true}},ch))})}catch(e){}if(UI.tab==='ich')notifStatus()}
function scheduleAll(){if(CAP)scheduleCap(reminderList())}
let schedT;function scheduleSoon(){clearTimeout(schedT);schedT=setTimeout(scheduleAll,1200)}

async function notifStatus(){const box=document.getElementById('notifState');if(!box||!CAP)return;const LN=CapP('LocalNotifications');const tmo=(pr,ms=4000)=>Promise.race([pr,new Promise((_,j)=>setTimeout(()=>j(new Error('keine Antwort')),ms))]);const row=(ok,txt)=>`<p class="small"><span class="chip ${ok?'ok':'crit'}">${ok?'OK':'fehlt'}</span> ${txt}</p>`;let h='';
 try{const p=await tmo(LN.checkPermissions());h+=row(p.display==='granted','Benachrichtigungen erlaubt')}catch(e){h+=row(false,'Benachrichtigungen: Plugin fehlt ('+esc(e&&e.message||e)+')')}
 try{const x=await tmo(LN.checkExactNotificationSetting());h+=row(x.exact_alarm==='granted','Pünktliche Erinnerungen (genaue Wecker)')}catch(e){}
 try{const q=await tmo(LN.getPending());const n=(q.notifications||[]).length;h+=`<p class="small muted">${n} Erinnerung${n===1?'':'en'} geplant${n?'. Nächste: '+esc(fmtNext(q.notifications)):''}</p>`}catch(e){}
 box.innerHTML=h}
function fmtNext(ns){const t=ns.map(n=>new Date(n.schedule&&n.schedule.at||n.extra&&n.extra.at||0)).filter(d=>+d>0).sort((a,b)=>a-b)[0];if(!t)return'';return `${fmtD(iso(t))} ${pad(t.getHours())}:${pad(t.getMinutes())}`}
