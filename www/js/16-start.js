/* Kleinkram · Klicks, Eingaben, Zurück-Taste, Statusleiste, Start */
"use strict";
/* ---------- Ereignisse ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id;
 if(a==='bgclose'){if(e.target===el)closeSheet();return}
 switch(a){
 case'close':closeSheet();break;
 case'go':go(el.dataset.to);break;
 case'quick':quickSheet();break;
 case'rt':toggleRoutine(id);break;
 case'editRt':rtSheet(id);break;
 case'task':taskSheet(id);break;
 case'newTask':taskSheet(null);break;
 case'focus':focusMode(id);break;
 case'done':completeTask(id);break;
 case'later':laterSheet(id);break;
 case'steps':{const t=S.tasks.find(x=>x.id===id);if(t){t.steps=suggestSteps(t.title);save();render();toast('Mini-Schritte erstellt')}break}
 case'other':UI.oneIdx++;render();break;
 case'restart':restartSheet();break;
 case'buddy':buddySheet(id);break;
 case'event':eventSheet(id);break;
 case'newEvent':eventSheet(null,el.dataset.d);break;
 case'sel':UI.sel=el.dataset.d;if(UI.sel.slice(0,7)!==UI.month)UI.month=UI.sel.slice(0,7);render();break;
 case'mon':{const[y,m]=UI.month.split('-').map(Number);const d=new Date(y,m-1+ +el.dataset.n,1);UI.month=iso(d).slice(0,7);render();break}
 case'filt':{const c=el.dataset.c;UI.filter.has(c)?UI.filter.delete(c):UI.filter.add(c);if(!UI.filter.size)UI.filter=new Set(Object.keys(CATS));render();break}
 case'auf':UI.auf=el.dataset.k;render();break;
 case'showAll':UI.showAll=true;render();break;
 case'unarc':{const t=S.tasks.find(x=>x.id===id);if(t){t.archived=false;t.postponed=0;save();render()}break}
 case'editRec':recSheet(id);break;
 case'recTpl':recTplSheet();break;
 case'year':UI.year=+el.dataset.y;render();break;
 case'docf':UI.docFilter=el.dataset.k;render();break;
 case'doc':docSheet(id);break;
 case'newDoc':newDocSheet();break;
 case'pasteInv':closeSheet();pasteSheet();break;
 case'potAdd':potAddSheet();break;
 case'payout':payoutSheet();break;
 case'backup':backupSheet();break;
 case'restore':restoreSheet();break;
 case'reset':resetSheet();break;
 case'orRun':orRun();break;
 case'orTrips':orTripsSheet();break;
 case'orThemes':orThemesSheet();break;
 case'abNow':toast('Sichere …');autoBackup(true).then(ok=>toast(ok?'Gesichert in Dokumente/Kleinkram/Sicherungen':'Sicherung ging nicht'));break;
 case'abManage':abManageSheet();break;
 case'ics':exportSheet();break;
 case'planScan':planInfoSheet();break;
 case'rlink':UI.abl='belege';if(el.dataset.l==='unpaid')UI.docFilter='offen';go('ablage');break;
 case'taxpack':taxPackSheet(+el.dataset.y);break;
 case'abl':UI.abl=el.dataset.k;render();break;
 case'contract':contractSheet(id);break;
 case'obj':objSheet(id);break;
 case'objsel':UI.obj=id;render();break;
 case'rentT':{const o=objById(id),m=el.dataset.m;if(!o)break;o.payments=o.payments||{};if(o.payments[m]){delete o.payments[m];save();render();toast(`${MON[+m.slice(5)-1]}: wieder offen`)}else{o.payments[m]=today();save();sound('tick');haptic(12);pts(3,'Mieteingang geprüft');render()}break}
 case'nkDone':{const o=objById(id),y=+el.dataset.y;if(o){o.nkDone=o.nkDone||[];if(!o.nkDone.includes(y))o.nkDone.push(y);S.tasks.filter(x=>x.nkObj===o.id&&x.nkYear===y&&!x.done).forEach(x=>x.done=today());save();stamp('Verschickt');pts(15,'Nebenkostenabrechnung');render()}break}
 case'meter':meterSheet(id,el.dataset.m);break;
 case'reading':readingSheet(id,el.dataset.m);break;
 case'warranty':warrantySheet(id);break;
 case'review':reviewSheet();break;
 case'clMediaPerm':AR().requestMedia().then(s=>{CL.st=Object.assign({},CL.st,s);render();if(s.media!=='granted')toast('Ohne Zugriff kann Kleinkram keine Fotos prüfen.')}).catch(e=>toast('Ging nicht: '+(e&&e.message||e)));break;
 case'clFilesPerm':AR().openFilesAccess().catch(e=>toast(e&&e.message||'Ging nicht'));break;
 case'clScanMedia':clRun('Prüfe Fotos & Videos …',clScanMedia);break;
 case'clScanFiles':clRun('Prüfe Dateien …',clScanFiles);break;
 case'clOpen':clOpen(el.dataset.k);break;
 case'clUndoMove':confirmSheet('Sortieren rückgängig?','Die zuletzt einsortierten Dateien kommen zurück in Download.','Rückgängig',()=>clUndoMove());break;
 case'notifPerm':if(CAP){toast('Frage Erlaubnis an …');CapP('LocalNotifications').requestPermissions().then(r=>{toast(r.display==='granted'?'Benachrichtigungen erlaubt':'Nicht erlaubt. In den Handy-Einstellungen änderbar.');scheduleAll();setTimeout(notifStatus,800)}).catch(e=>toast('Fehler: '+(e&&e.message||e)));break}toast('Geht nur in der App.');break;
 case'sndPreview':previewSound();break;
 case'notifNow':{toast('Einen Moment …');const LN=CapP('LocalNotifications');LN.requestPermissions().then(r=>{if(r.display!=='granted'){toast('Benachrichtigungen sind nicht erlaubt.');return}return ensureChannel().then(ch=>LN.schedule({notifications:[notif({id:hid('kk-now'),actionTypeId:'kk_l',extra:{k:'test'},title:'Kleinkram',body:`So klingt „${SOUNDS[sndKey()].n.split(' ·')[0]}“.`,schedule:{at:new Date(Date.now()+3000),allowWhileIdle:true}},ch)]})).then(()=>toast('Kommt in 3 Sekunden'))}).catch(e=>toast('Fehler: '+(e&&e.message||e)));break}
 case'exactPerm':{toast('Öffne Einstellung …');const LN=CapP('LocalNotifications');LN.changeExactNotificationSetting().then(()=>setTimeout(notifStatus,800)).catch(e=>toast('Ging nicht: '+(e&&e.message||e)));break}
 case'notifTest':{if(CAP){toast('Plane Test …');const LN=CapP('LocalNotifications');LN.requestPermissions().then(()=>ensureChannel()).then(ch=>LN.schedule({notifications:[notif({id:hid('kk-test'),title:'Kleinkram',body:'Test-Erinnerung angekommen. Es klappt!',schedule:{at:new Date(Date.now()+60000),allowWhileIdle:true}},ch)]})).then(()=>{toast('Test geplant. Warte 1 Minute.');setTimeout(notifStatus,500)}).catch(e=>toast('Planen ging nicht: '+(e&&e.message||e)));break}toast('Geht nur in der App.');break}}});
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.set){S.set[t.dataset.set]=t.checked;save();if(t.dataset.set==='oneThing')UI.showAll=false;}
 if(t.dataset.tax){const[y,k,f]=t.dataset.tax.split('.');S.tax[y]=S.tax[y]||{};S.tax[y][k]=S.tax[y][k]||{};S.tax[y][k][f]=+t.value||0;save()}
 if(t.id==='potMonth'){S.pot.month=+t.value;save();render()}
 if(t.id==='setName'){S.name=t.value.trim();save()}
 if(t.id==='setSound2'){S.set.sound2=t.value;save();previewSound();scheduleAll();toast(`Signalton: ${SOUNDS[t.value].n.split(' ·')[0]}`)}
 if(t.id==='setBriefTime'){S.set.briefTime=t.value||'07:00';save()}
 if(t.id==='setRemindMin'){S.set.remindMin=+t.value;save()}
 if(t.id==='setLock')lockToggle(t);
 if(t.id==='setAutoBackup'){S.set.autoBackup=t.checked;save();if(t.checked)autoBackup();render()}
 if(t.dataset.set==='brief'||t.dataset.set==='remind'){if(t.checked&&CAP)CapP('LocalNotifications').requestPermissions().catch(()=>{});scheduleAll()}});
document.addEventListener('input',e=>{if(e.target.id==='docQ'){const q=e.target.value.toLowerCase().trim();document.querySelectorAll('[data-s]').forEach(li=>li.hidden=!!q&&!li.dataset.s.includes(q))}});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(clViewerOpen())clViewerClose();else if($('#sheetHost').innerHTML)closeSheet()});
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(NAV.some(n=>n[0]===h)&&h!==UI.tab){UI.tab=h;render()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('#focusHost').innerHTML){if(UI.tab==='aufraeumen')CL.stAt=0;render();if(CAP)scheduleAll()}});

/* ---------- Android: Zurück-Taste, Statusleiste ---------- */
function onBack(){if(typeof clViewerOpen==='function'&&clViewerOpen()){clViewerClose();return true}if($('#sheetHost').innerHTML){closeSheet();return true}const fx=document.querySelector('[data-f="close"]');if(fx){fx.click();return true}if(UI.tab==='aufraeumen'){go('ich');return true}if(UI.tab!=='heute'){go('heute');return true}return false}
if(CAP){try{CapP('App').addListener('backButton',()=>{if(!onBack()){try{CapP('App').minimizeApp()}catch(e){}}})}catch(e){}
 const sb=()=>{const dark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;try{const SB=CapP('StatusBar');SB.setStyle({style:dark?'DARK':'LIGHT'}).catch(()=>{});SB.setBackgroundColor({color:dark?'#121815':'#ECEFE9'}).catch(()=>{})}catch(e){}};
 sb();try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',sb)}catch(e){}}

/* ---------- Start ---------- */
(function(){const h=location.hash.slice(1);if(NAV.some(n=>n[0]===h))UI.tab=h;IDB.open().then(render);render();setTimeout(scheduleAll,2000);try{if(sessionStorage.getItem('kk-reset')){sessionStorage.removeItem('kk-reset');setTimeout(()=>toast('Kleinkram ist zurückgesetzt.'),400)}}catch(e){}})();
