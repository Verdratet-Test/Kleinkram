/* Kleinkram · Termine, Wiederholungen, deutsche Schnelleingabe */
"use strict";
/* ---------- Kalender-Logik ---------- */
function occurs(e,day){if(day<e.date)return false;
 switch(e.repeat){case'yearly':return day.slice(5)===e.date.slice(5)||(e.date.slice(5)==='02-29'&&day.slice(5)==='02-28'&&!isLeap(+day.slice(0,4)));
  case'monthly':return day.slice(8)===e.date.slice(8);
  case'weekly':return P(day).getDay()===P(e.date).getDay();
  default:return day<=(e.end||e.date)}}
function eventsOn(day,filter){return S.events.filter(e=>occurs(e,day)&&(!filter||filter.has(e.cat))).sort((a,b)=>(a.time||'00:00').localeCompare(b.time||'00:00'))}
function evLabel(e,day){if(e.kind==='geburtstag'&&e.yearKnown){const age=+day.slice(0,4)-+e.date.slice(0,4);return`${e.title} wird ${age}`}return e.title}

/* ---------- Schnelleingabe: deutsche Sätze verstehen ---------- */
const B='(?<![\\wäöüß])',E='(?![\\wäöüß])';
const W=(s,f)=>new RegExp(B+s+E,f||'i');
const WDN={sonntag:0,montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6};
const MONN={januar:1,jan:1,februar:2,feb:2,'märz':3,maerz:3,'mär':3,april:4,apr:4,mai:5,juni:6,jun:6,juli:7,jul:7,august:8,aug:8,september:9,sep:9,sept:9,oktober:10,okt:10,november:11,nov:11,dezember:12,dez:12};
const NUMW={ein:1,eine:1,einer:1,einem:1,zwei:2,drei:3,vier:4,'fünf':5,sechs:6};
function mkDate(d,m,y){const t=today();let yr=y?(+y<100?2000+ +y:+y):+t.slice(0,4);let s=`${yr}-${pad(+m)}-${pad(+d)}`;if(+m<1||+m>12||+d<1||+d>31)return null;if(!y&&s<t)s=`${yr+1}-${pad(+m)}-${pad(+d)}`;return s}
function guessCat(s){if(/kunde|meeting|besprechung|arbeit|firma|chef|büro|buero|baustelle|bereitschaft|schicht|projekt|angebot|kollege/i.test(s))return'geschaeft';
 if(/handwerk|elektrik|klempner|installateur|heizung|schornstein|sanitär|maler|hausverwalt|vermiet|mieter|nebenkosten|reparatur|amt|behörde|finanzamt|steuer|tüv|versicherung|zähler|rechnung|elster|kündig|antrag/i.test(s))return'verwaltung';
 if(/partner|schatz|freundin|ehefrau|ehemann|date|zusammen|jahrestag|unser/i.test(s))return'partner';return'privat'}
const TASKVERB=/(bezahl|überweis|ueberweis|anruf|kündig|beantrag|erledig|schreib|abgeb|abgabe|ablesen|wechseln|einreich|kauf|besorg|zurückschick|ausfüll|unterschreib|sortier|aufräum|putz|abhol|buchen|vereinbar|machen|prüfen|reparier|bestell|kümmern)/i;
function parseQuick(raw){let s=' '+raw.trim()+' ';const t=today();let date=null,end=null,time=null,repeat='none',kind='termin',cat=null,type=null,m;
 const cut=re=>{const mm=s.match(re);if(mm)s=s.replace(mm[0],' ');return mm};
 if(m=cut(/#(privat|partner|geschäft|geschaeft|arbeit|verwaltung)/i)){const k=m[1].toLowerCase();cat=k.startsWith('gesch')||k==='arbeit'?'geschaeft':k}
 if(cut(W('(aufgabe|todo|to-do)\\s*:?')))type='aufgabe';
 if(/jeden\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i.test(raw)){repeat='weekly';cut(W('jeden'))}
 if(cut(W('(jedes jahr|jährlich|jaehrlich)')))repeat='yearly';else if(cut(W('(jeden monat|monatlich)')))repeat='monthly';else if(cut(W('(jede woche|wöchentlich|woechentlich)')))repeat='weekly';
 const dR='(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})?';
 if(m=cut(new RegExp(B+'(?:vom\\s+)?'+dR+'\\s*(?:bis|-|–)\\s*'+dR,'i'))){date=mkDate(m[1],m[2],m[3]);end=mkDate(m[4],m[5],m[6]||(m[3]||''))}
 else if(m=cut(new RegExp(B+'(?:am\\s+|den\\s+|ab\\s+)?'+dR,'i')))date=mkDate(m[1],m[2],m[3]);
 else if(m=cut(new RegExp(B+'(?:am\\s+|den\\s+)?(\\d{1,2})\\.?\\s+('+Object.keys(MONN).join('|')+')\\.?(?:\\s+(\\d{4}))?'+E,'i')))date=mkDate(m[1],MONN[m[2].toLowerCase()],m[3]);
 else if(cut(W('(übermorgen|uebermorgen)')))date=addDays(t,2);
 else if(cut(W('morgen')))date=addDays(t,1);
 else if(cut(W('heute')))date=t;
 else if(m=cut(W('in\\s+(\\d+|ein|eine|einer|einem|zwei|drei|vier|fünf|sechs)\\s+(tag|tagen|woche|wochen|monat|monaten)'))){const n=NUMW[m[1].toLowerCase()]||+m[1];const u=m[2].toLowerCase();date=u.startsWith('tag')?addDays(t,n):u.startsWith('woche')?addDays(t,7*n):addMonths(t,n)}
 else if(m=cut(W('(?:am\\s+|nächsten\\s+|naechsten\\s+|kommenden\\s+|diesen\\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s?'))){const wd=WDN[m[1].toLowerCase()];let k=(wd-P(t).getDay()+7)%7;if(k===0)k=7;date=addDays(t,k);if(repeat==='none'&&/jeden/i.test(raw))repeat='weekly'}
 else if(cut(W('(nächste|naechste|kommende) woche')))date=addDays(t,7);
 if(m=cut(W('(?:um\\s+|ab\\s+)?(\\d{1,2})[:.](\\d{2})\\s*(?:uhr)?')))time=`${pad(+m[1]%24)}:${m[2]}`;
 else if(m=cut(W('(?:um\\s+)?halb\\s+(\\d{1,2})')))time=`${pad((+m[1]+23)%24)}:30`;
 else if(m=cut(W('(?:um\\s+|ab\\s+|gegen\\s+)?(\\d{1,2})\\s*uhr')))time=`${pad(+m[1]%24)}:00`;
 else if(m=cut(W('um\\s+(\\d{1,2})')))time=`${pad(+m[1]%24)}:00`;
 else if(cut(W('(morgens|früh|frueh|vormittags)')))time='09:00';else if(cut(W('mittags')))time='12:00';else if(cut(W('nachmittags')))time='15:00';else if(cut(W('abends')))time='19:00';
 if(/geburtstag|(?<![\wäöüß])geb\.?(?![\wäöüß])/i.test(s)){kind='geburtstag';repeat='yearly';type='termin';cat=cat||'privat'}
 if(/urlaub/i.test(s)&&!cat)cat='privat';
 cat=cat||guessCat(s);
 if(!type)type=time?'termin':TASKVERB.test(s)?'aufgabe':date?'termin':'aufgabe';
 let title=s.replace(/\s{2,}/g,' ').trim().replace(/(^|\s)(am|um|ab|bis|vom|den|im|in|an|für)$/i,'').replace(/^(am|um|ich muss|muss|noch)\s+/i,'').replace(/^[,:;\-–\s]+|[,:;\-–\s]+$/g,'').trim();
 if(title)title=title[0].toUpperCase()+title.slice(1);
 return{title,date,end,time,repeat,kind,cat,type}}
