"use strict";
/* =========================================================
   Ритм — личный трекер. Данные: localStorage + (по желанию)
   синхронизация через приватный репозиторий GitHub.
   ========================================================= */

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const keyOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey=k=>{const[y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(k,n)=>{const d=parseKey(k);d.setDate(d.getDate()+n);return keyOf(d)};
const todayKey=()=>keyOf(new Date());
const dowOf=k=>parseKey(k).getDay();
const diffDays=(a,b)=>Math.round((parseKey(b)-parseKey(a))/86400000);
const weekStart=k=>{const w=dowOf(k);return addDays(k,w===0?-6:1-w)};
const clone=o=>JSON.parse(JSON.stringify(o));
const MG=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WD=["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const fmtLong=k=>{const d=parseKey(k);return `${cap(WD[d.getDay()])}, ${d.getDate()} ${MG[d.getMonth()]}`};
const fmtDM=k=>{if(!k)return"—";const d=parseKey(k);return `${d.getDate()} ${MG[d.getMonth()]}`};
const fmtShort=k=>{const d=parseKey(k);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}`};
const fmtN=(n,dig=0)=>Number(n||0).toLocaleString("ru-RU",{maximumFractionDigits:dig});
const tmin=t=>{if(!t)return null;const[h,m]=t.split(":").map(Number);return h*60+m};
const fmtDur=m=>`${Math.floor(m/60)} ч ${pad(m%60)} мин`;
const plural=(n,a,b,c)=>{n=Math.abs(n);const m10=n%10,m100=n%100;return m10===1&&m100!==11?a:(m10>=2&&m10<=4&&(m100<10||m100>=20)?b:c)};
const clamp01=x=>Math.max(0,Math.min(1,x||0));
const lsGet=(k,def)=>{try{const v=localStorage.getItem(k);return v==null?def:v}catch(e){return def}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};

/* ---------- icons ---------- */
const svg=p=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const IC={
  today:svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>'),
  library:svg('<path d="M12 6.5c-1.8-1.3-4.3-2-7.5-2v13c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-13c-3.2 0-5.7.7-7.5 2z"/><path d="M12 6.5v13"/>'),
  growth:svg('<path d="M4 19.5h16"/><path d="M6 15l4-4 3 3 5-6"/><path d="M14.5 8H18v3.5"/>'),
  stats:svg('<path d="M5 19.5V12M10 19.5V5M15 19.5v-7M20 19.5V9"/>'),
  week:svg('<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  settings:svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  chev:svg('<path d="M9.5 6l6 6-6 6"/>'),
  check:svg('<path d="M5.5 12.5l4 4 9-9.5"/>'),
  close:svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  pen:svg('<path d="M5 19l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M14 7l3 3"/>'),
  moon:svg('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
  sun:svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  auto:svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
  scale:svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0l-2 2.5"/>')
};

/* ---------- plans ---------- */
const PLANS={
  write:[
    ["Пропись № 3","Закрепляешь буквы и соединения. Две сессии по 10 минут в прописи, третья — переписывание текста."],
    ["Слова и предложения","Прописи закончились: все сессии — переписывание текста. Медленно, ровно, с одинаковым наклоном."],
    ["Скорость","Раз в неделю замеряй, сколько слов успеваешь за 5 минут, не теряя аккуратности."],
    ["Повседневное письмо","Списки дел, заметки, подписи — всё пишешь левой рукой."]
  ],
  knit:[
    ["Основы, 2–3 дня","Набор петель и лицевая петля на маленьком образце из 15–20 петель."],
    ["Шарф платочной вязкой","Только лицевые петли, толстая пряжа, спицы 7–8 мм. Темп — около 7 см в день."],
    ["Изнаночная и резинка","Чулочная вязка, резинка 1×1 и 2×2, аккуратное закрытие петель."],
    ["Вязание по кругу","Круговые спицы, прибавки и убавки. Проект — шапка."],
    ["Узоры","Косы и простые рельефные узоры по схемам."]
  ],
  eng:[
    ["Месяц 1–2: фундамент","Алфавит, звуки и чтение, 300–500 самых частых слов через карточки (Anki), to be, Present Simple."],
    ["Месяц 3–4: первые тексты","Простые тексты и аудио, прошедшее и будущее время, словарь до 1000 слов."],
    ["Дальше: живой язык","Адаптированные книги, сериалы с субтитрами, разговорная практика."]
  ]
};

/* ---------- state ---------- */
const DEFAULTS={
  goals:{water:2750,kcal:2300,protein:160,bedFrom:"22:30",bedTo:"23:00",wake:"07:30",sleepMin:8,sleepMax:10,walk:15,walkMax:20,
    cardio:50,cardioMax:60,med:5,silence:10,fiction:30,science:10,eng:25,coursePerDay:3,courseTotal:80,courseOffset:0,
    knit:40,scarfLen:160,w1:10,w2:10,w3:15,fictionYear:24,scienceYear:12},
  tasks:[
    {id:"t1",name:"Поменять постельное бельё",every:7,last:null},
    {id:"t2",name:"Постирать постельное бельё",every:7,last:null},
    {id:"t3",name:"Стирка одежды",every:4,last:null},
    {id:"t4",name:"Мини-генеральная уборка",every:14,last:null},
    {id:"t5",name:"Генеральная уборка",every:30,last:null}
  ],
  hobby:{write:0,knit:0,eng:0,wish:[{id:"w1",name:"Игра на гитаре"},{id:"w2",name:"Шитьё"}]},
  learn:[],
  layout:null,
  custom:{},
  itemOpts:{},
  weekNotes:{},
  created:null,
  _u:0
};
let state={settings:clone(DEFAULTS),days:{},books:{}};
const G=()=>state.settings.goals;
const uiPrefs=(()=>{try{return JSON.parse(lsGet("ritm-ui","{}"))||{}}catch(e){return{}}})();
const ui={view:"today",date:todayKey(),open:new Set(),cards:uiPrefs.cards||{},libTab:"f",period:"month",calMonth:todayKey().slice(0,7),
  week:weekStart(todayKey()),chartEx:"",confirm:null,pendingImport:null,focus:null,scrollTo:null,msg:null};
function saveUi(){lsSet("ritm-ui",JSON.stringify({cards:ui.cards}))}

function mergeSettings(s){
  const out=clone(DEFAULTS);
  if(!s){out.layout=clone(DEFAULT_LAYOUT);return out}
  out.goals={...out.goals,...(s.goals||{})};
  if(Array.isArray(s.tasks))out.tasks=s.tasks;
  out.hobby={...out.hobby,...(s.hobby||{})};
  if(Array.isArray(s.learn))out.learn=s.learn;
  out.custom=s.custom&&typeof s.custom==="object"?s.custom:{};
  out.itemOpts=s.itemOpts&&typeof s.itemOpts==="object"?s.itemOpts:{};
  if(Array.isArray(s.layout)&&s.layout.length)out.layout=s.layout;
  else{out.layout=clone(DEFAULT_LAYOUT);
    (out.learn||[]).forEach(l=>{out.custom[l.id]={type:"num",name:l.name,goal:l.goal||30,unit:"мин"};if(!l.archived)out.layout.find(x=>x.id==="learn").items.push(l.id)});}
  out.learn=[];
  out.weekNotes=s.weekNotes||{};
  out.created=s.created||null;
  out._u=s._u||0;
  return out;
}
function seed(){
  if(!state.settings.layout)state.settings.layout=clone(DEFAULT_LAYOUT);
  state.settings.custom=state.settings.custom||{};state.settings.itemOpts=state.settings.itemOpts||{};
  if(!state.settings.created)state.settings.created=todayKey();
  state.settings.tasks.forEach(t=>{if(!t.last)t.last=state.settings.created});
}

/* ---------- persistence ---------- */
const LS="ritm-tracker-v1";
function loadLocal(){
  try{const raw=localStorage.getItem(LS);if(raw){const p=JSON.parse(raw);state={settings:mergeSettings(p.settings),days:p.days||{},books:p.books||{}}}}catch(e){}
  seed();migrateDays();
}
let lsTimer=null;
function saveLocal(now){clearTimeout(lsTimer);const f=()=>{try{localStorage.setItem(LS,JSON.stringify(state))}catch(e){}};if(now)f();else lsTimer=setTimeout(f,250)}
window.addEventListener("pagehide",()=>saveLocal(true));
function markDirty(type,id){
  const now=Date.now();
  if(type==="day")ensureDay(id)._u=now;
  else if(type==="book"){if(state.books[id])state.books[id]._u=now}
  else if(type==="delbook"){state.books[id]={id,_del:true,_u:now}}
  else state.settings._u=now;
  saveLocal();Sync.schedule();
}
const serialize=()=>JSON.stringify({app:"ritm",version:2,saved:new Date().toISOString(),settings:state.settings,days:state.days,books:state.books});

/* ---------- cloud sync (приватный репозиторий GitHub) ---------- */
const FILE="ritm-data.json",REPO="ritm-data";
const b64enc=str=>{const b=new TextEncoder().encode(str);let r="";for(let i=0;i<b.length;i+=0x8000)r+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(r)};
const b64dec=str=>new TextDecoder().decode(Uint8Array.from(atob(String(str).replace(/\s/g,"")),c=>c.charCodeAt(0)));
const Sync={
  cfg:null,status:"off",msg:"",last:null,busy:false,again:false,timer:null,sha:null,
  load(){try{this.cfg=JSON.parse(lsGet("ritm-sync","null"));if(this.cfg&&!this.cfg.owner)this.cfg=null}catch(e){this.cfg=null}},
  save(){if(this.cfg)lsSet("ritm-sync",JSON.stringify(this.cfg));else{try{localStorage.removeItem("ritm-sync")}catch(e){}}},
  on(){return !!(this.cfg&&this.cfg.token&&this.cfg.owner)},
  set(st,msg=""){this.status=st;this.msg=msg;renderSync()},
  async api(path,opt={}){
    const headers={"Authorization":"Bearer "+this.cfg.token,"Accept":"application/vnd.github+json"};
    if(opt.body)headers["Content-Type"]="application/json";
    const r=await fetch("https://api.github.com"+path,{...opt,cache:"no-store",headers});
    if(!r.ok){const e=new Error("HTTP "+r.status);e.status=r.status;throw e}
    return r.status===204?null:r.json();
  },
  path(){return `/repos/${this.cfg.owner}/${this.cfg.repo||REPO}`},
  async connect(token){
    this.cfg={token:token.trim()};this.sha=null;this.set("saving","Подключаю…");
    try{
      const u=await this.api("/user");
      this.cfg.owner=u.login;this.cfg.repo=REPO;
      let repo=null;
      try{repo=await this.api(this.path())}catch(e){if(e.status!==404)throw e}
      if(!repo){repo=await this.api("/user/repos",{method:"POST",body:JSON.stringify({name:REPO,private:true,auto_init:true,description:"Ритм — данные личного трекера (приватно)"})})}
      if(repo&&repo.private===false){this.cfg=null;this.save();this.set("off",`Репозиторий ${REPO} открыт для всех. Сделай его приватным (Settings → Danger Zone → Change visibility) и подключи снова.`);return false}
      this.cfg.login=u.login;this.save();
      await this.run();
      return true;
    }catch(e){
      this.cfg=null;this.save();
      this.set("off",e.status===401?"Токен не подошёл. Проверь, что он скопирован полностью.":e.status===403||e.status===404?"У токена не хватает прав. Создай его по ссылке ниже — с галочкой «repo».":"Не получилось подключиться. Проверь интернет и попробуй ещё раз.");
      return false;
    }
  },
  disconnect(){this.cfg=null;this.sha=null;this.save();this.set("off")},
  schedule(delay=3000){if(!this.on())return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.run(),delay)},
  async fetchRemote(){
    let f;
    try{f=await this.api(`${this.path()}/contents/${FILE}`)}catch(e){if(e.status===404){this.sha=null;return null}throw e}
    this.sha=f.sha;
    let c=f.content;
    if(!c||f.encoding==="none"){c=(await this.api(`${this.path()}/git/blobs/${f.sha}`)).content}
    return JSON.parse(b64dec(c));
  },
  async push(){
    const body={message:"Ритм: обновление данных",content:b64enc(serialize())};if(this.sha)body.sha=this.sha;
    try{const r=await this.api(`${this.path()}/contents/${FILE}`,{method:"PUT",body:JSON.stringify(body)});this.sha=r.content&&r.content.sha}
    catch(e){if(e.status===409||e.status===422){this.again=true;return}throw e}
  },
  async run(){
    if(!this.on())return;
    if(this.busy){this.again=true;return}
    this.busy=true;this.set("saving");
    try{
      const remote=await this.fetchRemote();
      const res=remote?mergeRemote(remote):{changed:false,localNewer:true};
      if(res.localNewer)await this.push();
      this.last=Date.now();this.set("ok");
      if(res.changed){saveLocal(true);render()}
    }catch(e){
      if(e.status===401){this.set("err","Токен больше не действует — подключи синхронизацию заново.")}
      else if(e.status===404||e.status===403){this.set("err","Нет доступа к репозиторию ritm-data. Отключи и подключи синхронизацию заново.")}
      else this.set("err",navigator.onLine?"Ошибка синхронизации, повторю позже.":"Нет интернета — всё сохранено на устройстве.");
      clearTimeout(this.timer);this.timer=setTimeout(()=>this.run(),30000);
    }
    this.busy=false;
    if(this.again){this.again=false;this.schedule(300)}
  }
};
function mergeRemote(remote){
  let changed=false,localNewer=false;
  const rs=remote.settings||null,ru=(rs&&rs._u)||0,lu=state.settings._u||0;
  if(rs&&ru>lu){state.settings=mergeSettings(rs);seed();changed=true}else if(lu>ru||!rs)localNewer=true;
  for(const [col,src] of [["days",remote.days||{}],["books",remote.books||{}]]){
    const loc=state[col];
    const keys=new Set([...Object.keys(loc),...Object.keys(src)]);
    for(const k of keys){
      const a=loc[k],b=src[k];const au=(a&&a._u)||0,bu=(b&&b._u)||0;
      if(b&&(!a||bu>au)){loc[k]=b;changed=true}
      else if(a&&(!b||au>bu))localNewer=true;
    }
  }
  return {changed,localNewer};
}

/* ---------- binding ---------- */
function ensureDay(k){if(!state.days[k])state.days[k]={};return state.days[k]}
function resolve(bind,create){
  const parts=bind.split(".");const scope=parts.shift();
  if(scope==="d")return{obj:create?ensureDay(ui.date):(state.days[ui.date]||{}),path:parts,mark:()=>markDirty("day",ui.date)};
  if(scope==="s")return{obj:state.settings,path:parts,mark:()=>markDirty("profile")};
  if(scope==="b"){const id=parts.shift();return{obj:state.books[id]||{},path:parts,mark:()=>markDirty("book",id)}}
}
function getV(bind){const r=resolve(bind,false);let o=r.obj;for(const p of r.path){if(o==null)return undefined;o=o[p]}return o}
function setV(bind,val){
  const r=resolve(bind,true);let o=r.obj;
  for(let i=0;i<r.path.length-1;i++){const p=r.path[i];if(o[p]==null||typeof o[p]!=="object")o[p]={};o=o[p]}
  o[r.path[r.path.length-1]]=val;r.mark();
}
function readInput(el){
  if(el.type==="checkbox")return el.checked;
  if(el.type==="number"){const v=el.value.trim().replace(",",".");if(v==="")return null;const n=Number(v);return isFinite(n)?n:null}
  return el.value;
}

/* ---------- domain ---------- */
const dayType=k=>{const w=dowOf(k);return w===0?"rest":([1,3,5].includes(w)?"strength":"cardio")};
const D=k=>state.days[k]||{};
const liveBooks=()=>Object.values(state.books).filter(b=>b&&!b._del);
const strengthDone=d=>((d.train&&d.train.ex)||[]).some(e=>(e.sets||[]).some(s=>s.r||s.w));
function courseDone(){let s=G().courseOffset||0;for(const k in state.days){s+=(state.days[k].course&&state.days[k].course.n)||0}return s}
function scarfDone(){let s=0;for(const k in state.days){s+=(state.days[k].knit&&state.days[k].knit.cm)||0}return Math.round(s*10)/10}
/* Сон: ночь относится к утру, которым она закончилась. Отбой вносится вечером (d.night.bed), подъём — утром (d.sleep.wake) */
function bedFor(k){const p=D(addDays(k,-1));return (p.night&&p.night.bed)||(D(k).sleep&&D(k).sleep.bed)||null}
function sleepDurK(k){const bed=bedFor(k),wake=D(k).sleep&&D(k).sleep.wake;if(!bed||!wake)return null;let d=tmin(wake)-tmin(bed);if(d<=0)d+=1440;return d}
function bedInGoal(t){const g=G();const n=x=>{let v=tmin(x);return v<12*60?v+1440:v};return n(t)>=n(g.bedFrom)&&n(t)<=n(g.bedTo)}
const nowHM=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};

/* ---------- layout: разделы и пункты «Сегодня» ---------- */
const DEFAULT_LAYOUT=[
  {id:"morning",title:"Утро",items:["wake","glass","wash","clean","shower"]},
  {id:"food",title:"Питание и тело",items:["meal-b","meal-l","meal-d","meal-s","food","water","well","weight"]},
  {id:"move",title:"Тренировка",items:["train","walk"]},
  {id:"mind",title:"Ум и спокойствие",items:["med","silence"]},
  {id:"read",title:"Чтение",items:["read-f","read-s"]},
  {id:"learn",title:"Обучение",items:["eng","course"]},
  {id:"hobby",title:"Хобби",items:["write-s1","write-s2","write-s3","write-left","write-control","knit","hobbynote"]},
  {id:"evening",title:"Вечер и сон",items:["nophone","sleep"]}
];
const L=()=>state.settings.layout;
const cxVal=(d,id)=>{const c=d.cx&&d.cx[id];if(c&&c.v!=null)return c.v;const l=d.learn&&d.learn[id];return l?l.min:null};

/* Встроенные пункты. status(ctx): true/false — выполнено; null — сегодня не считается */
const BI={
  wake:{name:"Пробуждение",status:c=>!!(c.d.sleep&&c.d.sleep.wake)},
  glass:{name:"Стакан воды после пробуждения",status:c=>!!(c.d.routine&&c.d.routine.glass)},
  wash:{name:"Умыться",status:c=>!!(c.d.routine&&c.d.routine.wash)},
  clean:{name:"Уборка",status:c=>!!(c.d.routine&&c.d.routine.clean)},
  shower:{name:"Душ",status:c=>!!(c.d.routine&&c.d.routine.shower)},
  nophone:{name:"Час без телефона перед сном",status:c=>!!(c.d.routine&&c.d.routine.nophone)},
  "meal-b":{name:"Завтрак",status:c=>!!(c.d.food&&c.d.food.meals&&c.d.food.meals.b)},
  "meal-l":{name:"Обед",status:c=>!!(c.d.food&&c.d.food.meals&&c.d.food.meals.l)},
  "meal-d":{name:"Ужин",status:c=>!!(c.d.food&&c.d.food.meals&&c.d.food.meals.d)},
  "meal-s":{name:"Перекус",counts:false,status:c=>!!(c.d.food&&c.d.food.meals&&c.d.food.meals.s)},
  food:{name:"Калории и белок",status:c=>((c.d.food&&c.d.food.kcal)||0)>0},
  water:{name:"Вода",status:c=>(c.d.water||0)>=c.g.water},
  well:{name:"Самочувствие",status:c=>!!(c.d.well&&c.d.well.energy&&c.d.well.mood)},
  weight:{name:"Вес",counts:false,status:c=>!!c.d.weight},
  train:{name:"Тренировка",status:c=>c.rest?null:(c.t==="strength"?strengthDone(c.d):((c.d.train&&c.d.train.cardio)||0)>=c.g.cardio)},
  walk:{name:"Прогулка",status:c=>(c.d.walk||0)>=c.g.walk},
  med:{name:"Медитация",restOpt:true,status:c=>(c.d.med||0)>=c.g.med},
  silence:{name:"Время тишины",restOpt:true,status:c=>(c.d.silence||0)>=c.g.silence},
  "read-f":{name:"Художественная книга",restOpt:true,status:c=>((c.d.read&&c.d.read.f&&c.d.read.f.pages)||0)>=c.g.fiction},
  "read-s":{name:"Научная книга",restOpt:true,status:c=>((c.d.read&&c.d.read.s&&c.d.read.s.pages)||0)>=c.g.science},
  eng:{name:"Английский",restOpt:true,status:c=>((c.d.eng&&c.d.eng.min)||0)>=c.g.eng},
  course:{name:"Курс по бизнесу",restOpt:true,status:c=>{const n=(c.d.course&&c.d.course.n)||0;return c.cd<c.g.courseTotal||n>0?n>=c.g.coursePerDay:null}},
  "write-s1":{name:"Письмо левой: сессия 1",restOpt:true,status:c=>!!(c.d.write&&c.d.write.s1)},
  "write-s2":{name:"Письмо левой: сессия 2",restOpt:true,status:c=>!!(c.d.write&&c.d.write.s2)},
  "write-s3":{name:"Письмо левой: сессия 3",restOpt:true,status:c=>!!(c.d.write&&c.d.write.s3)},
  "write-left":{name:"День левой руки в быту",restOpt:true,status:c=>!!(c.d.write&&c.d.write.left)},
  "write-control":{name:"Контрольная фраза недели",counts:false,restOpt:true,status:c=>!!(c.d.write&&c.d.write.control)},
  knit:{name:"Вязание",restOpt:true,status:c=>((c.d.knit&&c.d.knit.min)||0)>=c.g.knit},
  hobbynote:{name:"Заметки по хобби",counts:false,restOpt:true,status:c=>!!c.d.hobbyNote},
  sleep:{name:"Отбой",status:c=>!!(c.d.night&&c.d.night.bed)}
};
const CX_TYPES={check:"Галочка",num:"Число с нормой",note:"Заметка"};
function itemDef(id){
  if(BI[id])return{id,builtin:true,name:BI[id].name,counts:BI[id].counts!==false,restOpt:!!BI[id].restOpt};
  const c=state.settings.custom&&state.settings.custom[id];
  if(c)return{id,builtin:false,type:c.type,name:c.name||"Без названия",goal:c.goal,unit:c.unit||"",counts:c.type!=="note",restOpt:false};
  return null;
}
function itemOpt(id){const d=itemDef(id);if(!d)return null;const o=(state.settings.itemOpts||{})[id]||{};
  return {...d,name:o.name||d.name,named:!!o.name,counts:o.counts??d.counts,restOpt:o.restOpt??d.restOpt}}
function itemStatus(id,c){
  if(BI[id])return BI[id].status(c);
  const def=state.settings.custom[id];if(!def)return null;
  const v=cxVal(c.d,id);
  if(def.type==="check")return !!v;
  if(def.type==="num")return (Number(v)||0)>=(def.goal||1);
  return !!(v&&String(v).trim());
}
const mkCtx=(k,cd)=>({k,d:D(k),g:G(),t:dayType(k),rest:dayType(k)==="rest",cd:cd==null?courseDone():cd});
function dayItems(k,cd){
  const c=mkCtx(k,cd),out=[];
  for(const s of L())for(const id of s.items){const o=itemOpt(id);if(!o||!o.counts||(c.rest&&o.restOpt))continue;const st=itemStatus(id,c);if(st==null)continue;out.push([s.id,!!st])}
  return out;
}
function dayPct(k,cd){const it=dayItems(k,cd);const done=it.filter(x=>x[1]).length;return{done,total:it.length,pct:it.length?Math.round(done/it.length*100):0}}
function groupCount(items,g){const f=items.filter(x=>x[0]===g);return{d:f.filter(x=>x[1]).length,t:f.length}}
function hiddenItems(){const used=new Set(L().flatMap(s=>s.items));return [...Object.keys(BI),...Object.keys(state.settings.custom||{})].filter(id=>!used.has(id))}
function migrateDays(){for(const k in state.days){const d=state.days[k];if(d.learn){d.cx=d.cx||{};for(const id in d.learn){const l=d.learn[id];if(l&&!d.cx[id])d.cx[id]={v:l.min??null,note:l.note||""}}}}}
const hasData=k=>{const d=state.days[k];return d&&Object.keys(d).some(x=>x!=="_u")};
function lastWeightDay(before){let best=null;for(const k in state.days){const w=state.days[k].weight;if(w&&(!before||k<before)&&(!best||k>best))best=k}return best}
function readingBooks(type){return liveBooks().filter(b=>b.type===type&&b.status==="reading")}
function allExNames(){const s=new Set();for(const k in state.days){((state.days[k].train&&state.days[k].train.ex)||[]).forEach(e=>{if(e.name&&e.name.trim())s.add(e.name.trim())})}return [...s].sort((a,b)=>a.localeCompare(b,"ru"))}
function prevStrength(k){
  for(let i=7;i<=63;i+=7){const p=addDays(k,-i);if(strengthDone(D(p)))return p}
  for(let i=1;i<=30;i++){const p=addDays(k,-i);if(strengthDone(D(p)))return p}
  return null;
}
function forecastWorkdays(fromKey,count){let k=fromKey,n=0;if(count<=0)return null;while(true){if(dowOf(k)!==0){n++;if(n>=count)return k}k=addDays(k,1)}}
function courseFinish(){
  const g=G(),cd=courseDone(),left=Math.max(0,g.courseTotal-cd),tk=todayKey();
  const todayN=(D(tk).course&&D(tk).course.n)||0;
  return left>0?forecastWorkdays(todayN>0?addDays(tk,1):tk,Math.ceil(left/g.coursePerDay)):null;
}
function setReading(type,nv,bookId){
  const d=ensureDay(ui.date);d.read=d.read||{};d.read[type]=d.read[type]||{};
  const bid=d.read[type].book||bookId;const old=d.read[type].pages||0;nv=Math.max(0,Math.round(nv||0));
  d.read[type].pages=nv;
  if(bid){d.read[type].book=bid;const b=state.books[bid];if(b&&!b._del){b.cur=Math.max(0,Math.min(b.total||Infinity,(b.cur||0)+nv-old));markDirty("book",b.id)}}
  markDirty("day",ui.date);
}

/* ---------- UI atoms ---------- */
const num=(bind,opt={})=>{const v=getV(bind);return `<input class="in num ${opt.cls||""}" type="number" inputmode="decimal" min="0" step="${opt.step||1}" placeholder="${esc(opt.ph||"")}" aria-label="${esc(opt.label||"")}" data-bind="${bind}" data-k="${bind}" value="${v??""}">`};
const timeIn=(bind,label)=>`<input class="in time" type="time" aria-label="${esc(label)}" data-bind="${bind}" data-k="${bind}" value="${esc(getV(bind)||"")}">`;
const txt=(bind,ph="")=>`<input class="in txt" type="text" placeholder="${esc(ph)}" data-bind="${bind}" data-k="${bind}" value="${esc(getV(bind)||"")}">`;
const area=(bind,ph="",rows=2)=>`<textarea rows="${rows}" placeholder="${esc(ph)}" data-bind="${bind}" data-k="${bind}">${esc(getV(bind)||"")}</textarea>`;
function rating(bind,label){const v=getV(bind)||0;let h=`<span class="rate" role="group" aria-label="${esc(label||"Оценка")}">`;for(let i=1;i<=5;i++)h+=`<button type="button" class="${v>=i?"on":""}" data-act="rate" data-bind="${bind}" data-v="${i}" aria-pressed="${v===i}">${i}</button>`;return h+"</span>"}
const bar=(p,cls="")=>`<div class="bar ${cls}"><i style="width:${clamp01(p)*100}%"></i></div>`;
const field=(label,control,extra="")=>`<div class="f"><span class="fl">${label}</span>${control}${extra}</div>`;
const chipsFill=(bind,steps,goal)=>`<span class="btns">${steps.map(s=>`<button class="chip ghost" data-act="add" data-bind="${bind}" data-n="${s}">+${s}</button>`).join("")}${goal?`<button class="chip ghost" data-act="setv" data-bind="${bind}" data-n="${goal}">= ${goal}</button>`:""}</span>`;
function confirmBtn(key,label,act,attrs=""){
  return ui.confirm===key?`<span class="btns"><button class="btn danger" data-act="${act}" ${attrs}>Точно ${label.toLowerCase()}?</button><button class="btn ghost" data-act="cancel-confirm">Отмена</button></span>`
    :`<button class="btn ghost" data-act="ask-confirm" data-key="${key}">${label}</button>`;
}

/* Card = group with header; collapsible */
function isCollapsed(key,def=false){return key in ui.cards?ui.cards[key]:def}
function card({key,title,cnt=null,tag="",body,def=false,extra=""}){
  const col=isCollapsed(key,def);
  const c=cnt&&cnt.t?`<span class="cnt ${cnt.d===cnt.t?"full":""}">${cnt.d===cnt.t?IC.check:""}${cnt.d} / ${cnt.t}</span>`:`<span class="cnt">${extra}</span>`;
  return `<section class="card ${col?"collapsed":""}" id="card-${key}"><header class="card-h" data-act="collapse" data-key="${key}" data-def="${def?1:0}" role="button" tabindex="0" aria-expanded="${!col}"><h2>${title}</h2>${tag?`<span class="tag">${tag}</span>`:""}${c}<span class="chev">${IC.chev}</span></header>${col?"":`<div class="card-b">${body}</div>`}</section>`;
}
/* Item = one row. Variants: check (checkbox), expandable (body), with progress dot */
function item(o){
  if(o.check){
    const v=!!getV(o.check);
    return `<div class="it ${v?"done":""}"><label class="it-row"><input type="checkbox" class="dot-in" data-bind="${o.check}" data-k="${o.check}" ${v?"checked":""}><span class="it-main"><span class="t">${o.label}</span>${o.sub?`<span class="s">${o.sub}</span>`:""}</span>${o.val?`<span class="it-val">${o.val}</span>`:""}</label></div>`;
  }
  const open=!!o.body&&ui.open.has(o.key);
  const done=!!o.done,p=done?100:Math.round(clamp01(o.p)*100);
  let lead;
  if(o.icon)lead=`<span class="noti">${o.icon}</span>`;
  else if(o.dotAct)lead=`<button class="dot ${done?"on":""}" style="--p:${p}" data-act="${o.dotAct.act}" ${o.dotAct.attrs||""} aria-label="${done?"Сбросить":"Отметить по норме"}" title="${done?"Сбросить":"Отметить по норме"}"></button>`;
  else lead=`<span class="dot ro ${done?"on":""}" style="--p:${p}"></span>`;
  const rowAttrs=o.body?`data-act="toggle" data-key="${o.key}" role="button" tabindex="0" aria-expanded="${open}"`:"";
  return `<div class="it ${open?"open":""} ${done?"done":""}" id="it-${o.key}"><div class="it-row" ${rowAttrs}>${lead}<span class="it-main"><span class="t">${o.label}</span>${o.sub?`<span class="s ${o.warn?"warn":""}">${o.sub}</span>`:""}</span>${o.val?`<span class="it-val">${o.val}</span>`:""}${o.quick||""}${o.body?`<span class="chev">${IC.chev}</span>`:""}</div>${open?`<div class="it-body">${o.body}</div>`:""}</div>`;
}
const fillDot=(bind,goal)=>({act:"fill",attrs:`data-bind="${bind}" data-goal="${goal}"`});
const valOf=(cur,goal,unit)=>`<b>${fmtN(cur,1)}</b> / ${goal} ${unit}`;

/* ---------- views ---------- */
const VIEWS=[["today","Сегодня"],["library","Книги"],["growth","Развитие"],["stats","Статистика"],["week","Неделя"],["settings","Настройки"]];

function renderItem(id,o,c){
  const {k,d,g,t}=c,lab=esc(o.name);
  const optTag=c.rest&&o.restOpt?"по желанию":"";
  const withOpt=s=>optTag?(s?s+" · ":"")+optTag:s;
  const chk=(bind,sub="",val="")=>item({check:bind,label:lab,sub:withOpt(sub),val});
  switch(id){
    case "wake":{const sl=d.sleep||{},sd=sleepDurK(k),bed=bedFor(k);
      return item({key:"wake",label:lab,done:!!sl.wake,
        sub:sl.wake?[sd?`спал ${fmtDur(sd)}`:"",sl.q?`качество ${sl.q}/5`:"",tmin(sl.wake)>tmin(g.wake)+30?"позже цели":""].filter(Boolean).join(" · ")||`цель ${g.wake}`:`цель ${g.wake}`,
        val:sl.wake?`<b>${sl.wake}</b>`:"",quick:sl.wake?"":`<button class="chip" data-act="now" data-bind="d.sleep.wake">Встал сейчас</button>`,
        body:`${field("Время подъёма",timeIn("d.sleep.wake","Время подъёма"),`<span class="unit">цель ${g.wake}</span>`)}
          ${field("Отбой накануне",bed?`<span>${bed}</span><span class="unit">${bedInGoal(bed)?"вовремя":"вне цели "+g.bedFrom+"–"+g.bedTo}</span>`:`<span class="unit">не отмечен вчера вечером</span>`)}
          ${field("Длительность сна",`<span>${sd?fmtDur(sd):"—"}</span><span class="unit">цель ${g.sleepMin}–${g.sleepMax} ч</span>`)}
          ${field("Как спал",rating("d.sleep.q","Качество сна"))}${area("d.sleep.note","Заметка о сне: что мешало, что помогло…")}`});}
    case "glass":return chk("d.routine.glass");
    case "wash":return chk("d.routine.wash");
    case "clean":return chk("d.routine.clean");
    case "shower":return chk("d.routine.shower");
    case "nophone":return chk("d.routine.nophone");
    case "meal-b":return chk("d.food.meals.b");
    case "meal-l":return chk("d.food.meals.l");
    case "meal-d":return chk("d.food.meals.d");
    case "meal-s":return chk("d.food.meals.s");
    case "food":{const f=d.food||{};
      return item({key:"food",label:lab,done:(f.kcal||0)>0,sub:f.score?`питание на ${f.score}/5`:"",
        val:`<b>${fmtN(f.kcal||0)}</b> ккал · <b>${fmtN(f.protein||0)}</b> г белка`,
        body:`${field("Калории",num("d.food.kcal",{step:10,label:"Калории"}),`<span class="unit">из ${fmtN(g.kcal)} ккал</span>`)}${bar((f.kcal||0)/g.kcal)}
          ${field("Белок",num("d.food.protein",{label:"Белок"}),`<span class="unit">из ${g.protein} г</span>`)}${bar((f.protein||0)/g.protein)}
          ${field("Насколько правильно ел",rating("d.food.score","Оценка питания"))}${area("d.food.note","Что ел, что получилось, что нет…")}`});}
    case "water":{const w=d.water||0;
      return item({key:"water",label:lab,p:w/g.water,done:w>=g.water,sub:bar(w/g.water),val:valOf(w,fmtN(g.water),"мл"),
        quick:`<button class="chip" data-act="water" data-n="250" aria-label="Добавить 250 мл">+250</button>`,
        body:`<div class="btns"><button class="btn" data-act="water" data-n="250">+250 мл</button><button class="btn" data-act="water" data-n="500">+500 мл</button><button class="btn" data-act="water" data-n="1500">+1,5 л</button><button class="btn ghost" data-act="water" data-n="-250">−250</button></div>
          ${field("Всего",num("d.water",{step:50,label:"Вода, мл"}),`<span class="unit">мл · протеиновые коктейли тоже сюда</span>`)}`});}
    case "well":{const w=d.well||{};
      return item({key:"well",label:lab,done:!!(w.energy&&w.mood),sub:"энергия · настроение, 1–5",val:`<b>${w.energy||"—"}</b> · <b>${w.mood||"—"}</b>`,
        body:`${field("Энергия",rating("d.well.energy","Энергия"))}${field("Настроение",rating("d.well.mood","Настроение"))}`});}
    case "weight":{const lw=lastWeightDay(k),lwAll=lastWeightDay(),due=!d.weight&&(!lwAll||diffDays(lwAll,k)>=7);
      return item({key:"weight",label:lab,icon:IC.scale,done:!!d.weight,sub:due?"пора взвеситься":(lw?`прошлый: ${fmtN(state.days[lw].weight,1)} кг, ${fmtDM(lw)}`:"раз в неделю"),warn:due,
        val:d.weight?`<b>${fmtN(d.weight,1)}</b> кг`:"",
        body:field("Вес сегодня",num("d.weight",{step:0.1,label:"Вес",ph:"кг"}),`<span class="unit">кг${d.weight&&lw?` · ${d.weight-state.days[lw].weight>0?"+":""}${fmtN(d.weight-state.days[lw].weight,1)} к прошлому`:""}</span>`)});}
    case "train":{
      if(t==="strength"){const ex=(d.train&&d.train.ex)||[];const nSets=ex.reduce((s,e)=>s+(e.sets||[]).filter(x=>x.r||x.w).length,0);const prev=!ex.length?prevStrength(k):null;
        return item({key:"train",label:o.named?lab:"Силовая тренировка",done:strengthDone(d),sub:ex.length?ex.map(e=>esc(e.name||"без названия")).join(", "):(prev?`прошлая тренировка: ${fmtDM(prev)}`:"упражнения не записаны"),
          val:ex.length?`<b>${ex.length}</b> упр. · <b>${nSets}</b> подх.`:"",
          body:ex.map((e,i)=>`<div class="ex"><div class="ex-head"><input class="in txt" list="exnames" placeholder="Название упражнения" data-bind="d.train.ex.${i}.name" data-k="d.train.ex.${i}.name" value="${esc(e.name||"")}"><button class="x" data-act="ex-del" data-i="${i}" aria-label="Удалить упражнение">${IC.close}</button></div>
            <div class="sets">${(e.sets||[]).map((s,j)=>`<div class="set"><span class="set-n">${j+1}</span>${num(`d.train.ex.${i}.sets.${j}.r`,{cls:"sm",ph:"повт",label:"Повторения"})}<span class="muted">×</span>${num(`d.train.ex.${i}.sets.${j}.w`,{cls:"sm",step:0.5,ph:"кг",label:"Вес"})}<span class="unit">кг</span><button class="x" data-act="set-del" data-i="${i}" data-j="${j}" aria-label="Удалить подход">${IC.close}</button></div>`).join("")}</div>
            <button class="link" data-act="set-add" data-i="${i}">+ подход</button></div>`).join("")
            +`<div class="btns"><button class="btn" data-act="ex-add">+ упражнение</button>${prev?`<button class="btn ghost" data-act="ex-copy" data-from="${prev}">Взять упражнения с ${fmtDM(prev)}</button>`:""}</div>
            ${area("d.train.note","Заметка: самочувствие, что получилось…")}`});}
      if(t==="cardio"){const cv=(d.train&&d.train.cardio)||0;
        return item({key:"cardio",label:o.named?lab:"Кардио: беговая дорожка",p:cv/g.cardio,done:cv>=g.cardio,dotAct:fillDot("d.train.cardio",g.cardio),val:valOf(cv,`${g.cardio}–${g.cardioMax}`,"мин"),
          body:`${field("Минут",num("d.train.cardio",{label:"Кардио, минут"}),chipsFill("d.train.cardio",[10],g.cardio))}${area("d.train.note","Заметка: темп, наклон, самочувствие…")}`});}
      return item({key:"restnote",label:"Тренировки сегодня нет",sub:"восстановление тоже часть прогресса",icon:IC.moon});}
    case "walk":{const w=d.walk||0;return item({key:"walk",label:lab,p:w/g.walk,done:w>=g.walk,dotAct:fillDot("d.walk",g.walk),val:valOf(w,`${g.walk}–${g.walkMax}`,"мин"),sub:withOpt(""),
      body:field("Минут",num("d.walk",{label:"Прогулка, минут"}),chipsFill("d.walk",[5],g.walk))});}
    case "med":{const m=d.med||0;return item({key:"med",label:lab,sub:withOpt(""),p:m/g.med,done:m>=g.med,dotAct:fillDot("d.med",g.med),val:valOf(m,g.med,"мин"),body:field("Минут",num("d.med",{label:"Медитация, минут"}),chipsFill("d.med",[5],g.med))});}
    case "silence":{const m=d.silence||0;return item({key:"silence",label:lab,sub:withOpt("без телефона и занятий — просто сидишь и обдумываешь"),p:m/g.silence,done:m>=g.silence,dotAct:fillDot("d.silence",g.silence),val:valOf(m,g.silence,"мин"),body:field("Минут",num("d.silence",{label:"Тишина, минут"}),chipsFill("d.silence",[5],g.silence))});}
    case "read-f":case "read-s":{const type=id.slice(-1),goal=type==="f"?g.fiction:g.science;
      const books=readingBooks(type);const cur=(d.read&&d.read[type]&&d.read[type].book)||(books[0]&&books[0].id)||"";
      const b=state.books[cur]&&!state.books[cur]._del?state.books[cur]:null;const pages=(d.read&&d.read[type]&&d.read[type].pages)||0;
      const sel=books.length?`<select class="in" data-reading-book="${type}" data-k="rb-${type}" aria-label="Книга">${books.map(x=>`<option value="${x.id}" ${x.id===cur?"selected":""}>${esc(x.title)}</option>`).join("")}</select>`:`<button class="link" data-act="nav" data-view="library" data-tab="${type}">Добавить книгу в библиотеку</button>`;
      return item({key:id,label:lab,p:pages/goal,done:pages>=goal,dotAct:{act:"read-fill",attrs:`data-type="${type}" data-book="${cur}" data-goal="${goal}"`},
        sub:withOpt(b?`${esc(b.title)}${b.total?` · стр. ${b.cur||0} из ${b.total} · ${Math.round((b.cur||0)/b.total*100)}%`:""}`:"книга не выбрана"),val:valOf(pages,goal,"стр."),
        body:`${field("Страниц сегодня",`<input class="in num" type="number" min="0" inputmode="numeric" data-reading="${type}" data-book="${cur}" data-k="rp-${type}" value="${pages||""}" aria-label="Страниц сегодня">`,`<span class="unit">книга сдвинется автоматически</span>`)}${field("Книга",sel)}${b&&b.total?bar((b.cur||0)/b.total,"thick"):""}`});}
    case "eng":{const st=PLANS.eng[state.settings.hobby.eng]||PLANS.eng[0],m=(d.eng&&d.eng.min)||0;
      return item({key:"eng",label:lab,sub:withOpt(st[0]),p:m/g.eng,done:m>=g.eng,dotAct:fillDot("d.eng.min",g.eng),val:valOf(m,g.eng,"мин"),
        body:`${field("Минут",num("d.eng.min",{label:"Английский, минут"}),chipsFill("d.eng.min",[5,10],g.eng))}<p class="hint">${st[1]}</p>${area("d.eng.note","Итоги: что выучил, на чём застрял (необязательно)")}`});}
    case "course":{const cd=c.cd,cn=(d.course&&d.course.n)||0,left=Math.max(0,g.courseTotal-cd),fin=courseFinish();
      return item({key:"course",label:lab,sub:withOpt(left?`пройдено ${cd} из ${g.courseTotal}${fin?` · финиш ~${fmtDM(fin)}`:""}`:"курс пройден целиком"),p:cn/g.coursePerDay,done:cn>=g.coursePerDay,dotAct:fillDot("d.course.n",g.coursePerDay),
        val:valOf(cn,g.coursePerDay,plural(g.coursePerDay,"урок","урока","уроков")),
        body:`${field("Уроков сегодня",num("d.course.n",{label:"Уроков сегодня"}),chipsFill("d.course.n",[1],g.coursePerDay))}${bar(cd/g.courseTotal,"thick")}${area("d.course.note","Итоги: главное из уроков в паре строк (необязательно)")}`});}
    case "write-s1":case "write-s2":case "write-s3":{const n=id.slice(-1),hb=state.settings.hobby,ws=PLANS.write[hb.write]||PLANS.write[0];
      const kind=n==="3"||hb.write>=1?"переписывание текста":"пропись";
      return item({check:`d.write.s${n}`,label:o.named?lab:`Письмо левой: сессия ${n} — ${kind}`,sub:withOpt(ws[0]),val:`${g["w"+n]} мин`});}
    case "write-left":return chk("d.write.left","все бытовые действия левой; нож — осторожно, с мягких продуктов");
    case "write-control":return chk("d.write.control","раз в неделю, для сравнения почерка");
    case "knit":{const ks=PLANS.knit[state.settings.hobby.knit]||PLANS.knit[0],sc=scarfDone(),km=(d.knit&&d.knit.min)||0;
      return item({key:"knit",label:lab,sub:withOpt(`${ks[0]} · шарф ${fmtN(sc,1)} из ${g.scarfLen} см${d.knit&&d.knit.cm?` · сегодня +${fmtN(d.knit.cm,1)}`:""}`),p:km/g.knit,done:km>=g.knit,dotAct:fillDot("d.knit.min",g.knit),val:valOf(km,g.knit,"мин"),
        body:`${field("Минут",num("d.knit.min",{label:"Вязание, минут"}),chipsFill("d.knit.min",[10,20],g.knit))}${field("Шарф сегодня",`<span class="unit">+</span>${num("d.knit.cm",{step:0.5,label:"Сантиметров сегодня"})}`,`<span class="unit">см · цель к концу ноября ≈ 7 см в день</span>`)}${bar(sc/g.scarfLen,"thick")}`});}
    case "hobbynote":return item({key:"hobbynote",label:lab,icon:IC.pen,done:!!d.hobbyNote,sub:d.hobbyNote?esc(d.hobbyNote.slice(0,70)):"",body:area("d.hobbyNote","Что получилось, идеи, трудности…",3)});
    case "sleep":{const bed=d.night&&d.night.bed;
      return item({key:"sleep",label:lab,done:!!bed,
        sub:bed?(bedInGoal(bed)?"вовремя":`вне цели ${g.bedFrom}–${g.bedTo}`):`цель ${g.bedFrom}–${g.bedTo} · длительность посчитается утром`,warn:!!bed&&!bedInGoal(bed),
        val:bed?`<b>${bed}</b>`:"",quick:bed?"":`<button class="chip" data-act="bed-now">Ложусь сейчас</button>`,
        body:`${field("Время отбоя",timeIn("d.night.bed","Время отбоя"),`<span class="unit">цель ${g.bedFrom}–${g.bedTo}</span>`)}<p class="hint">Длительность сна посчитается утром, когда отметишь «Пробуждение». Если ложишься после полуночи — кнопка «Ложусь сейчас» сама запишет время во вчерашний день.</p>`});}
  }
  // свои пункты
  const def=state.settings.custom[id];if(!def)return "";
  const v=cxVal(d,id);
  if(def.type==="check")return item({check:`d.cx.${id}.v`,label:lab,sub:withOpt("")});
  if(def.type==="num"){const gl=def.goal||1,cur=Number(v)||0;
    return item({key:"cx-"+id,label:lab,sub:withOpt(""),p:cur/gl,done:cur>=gl,dotAct:fillDot(`d.cx.${id}.v`,gl),val:valOf(cur,gl,esc(def.unit||"")),
      body:`${field("Сегодня",num(`d.cx.${id}.v`,{label:o.name}),`<span class="unit">${esc(def.unit||"")}</span>${chipsFill(`d.cx.${id}.v`,[],gl)}`)}${area(`d.cx.${id}.note`,"Заметка или итоги (необязательно)")}`});}
  return item({key:"cx-"+id,label:lab,icon:IC.pen,done:!!(v&&String(v).trim()),sub:v?esc(String(v).slice(0,70)):withOpt(""),body:area(`d.cx.${id}.v`,"Запиши здесь…",3)});
}

function viewToday(){
  if(ui.edit)return viewEdit();
  const k=ui.date,d=D(k),g=G(),t=dayType(k),rest=t==="rest",isToday=k===todayKey();
  const cd=courseDone(),c=mkCtx(k,cd),items=dayItems(k,cd),P=dayPct(k,cd);
  const titles={strength:"Силовая тренировка",cardio:"Кардио: ходьба",rest:"День отдыха"};
  const subs={strength:"Полный день",cardio:"Полный день",rest:"Обязательна только базовая рутина"};
  const C=2*Math.PI*38;
  let h=`<div class="today-head"><div>
    <div class="date-nav"><button class="ib flip" data-act="day-prev" aria-label="Предыдущий день">${IC.chev}</button><span class="date-l">${fmtLong(k)}</span><button class="ib" data-act="day-next" aria-label="Следующий день">${IC.chev}</button>${isToday?"":`<button class="back" data-act="day-today">к сегодня</button>`}</div>
    <h1>${titles[t]}</h1><p class="lead">${subs[t]} · выполнено ${P.done} из ${P.total}</p></div>
    <div class="ring" role="img" aria-label="Выполнено ${P.pct}%"><svg viewBox="0 0 84 84"><circle class="tr" cx="42" cy="42" r="38"/><circle class="pr" cx="42" cy="42" r="38" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-P.pct/100)}"/></svg><div class="rv"><b>${P.pct}%</b><span>дня</span></div></div></div>`;

  if(isToday){
    const due=state.settings.tasks.filter(x=>diffDays(x.last||k,k)>=x.every);
    const lw=lastWeightDay(),weighDue=!d.weight&&(!lw||diffDays(lw,k)>=7)&&L().some(s=>s.items.includes("weight"));
    if(due.length||weighDue){
      let b=due.map(x=>{const over=diffDays(x.last||k,k)-x.every;return item({key:"due-"+x.id,label:esc(x.name),sub:`раз в ${x.every} ${plural(x.every,"день","дня","дней")}${over>0?` · просрочено на ${over} ${plural(over,"день","дня","дней")}`:""}`,warn:over>0,dotAct:{act:"task-done",attrs:`data-id="${x.id}"`},quick:`<button class="chip" data-act="task-done" data-id="${x.id}">Сделано</button>`})}).join("");
      if(weighDue)b+=item({key:"due-weight",label:"Пора взвеситься",sub:lw?`последний раз ${fmtDM(lw)}`:"вес ещё не вносился",icon:IC.scale,quick:`<button class="chip" data-act="open-weight">Внести вес</button>`});
      h+=card({key:"due",title:"Пора сделать",body:b,extra:`${due.length+(weighDue?1:0)}`});
    }
  }
  for(const s of L()){
    const opts=s.items.map(itemOpt).filter(Boolean);
    const allOpt=rest&&opts.length>0&&opts.every(o=>o.restOpt||!o.counts);
    const cnt=groupCount(items,s.id);
    const body=opts.map(o=>renderItem(o.id,o,c)).join("")||`<div class="pad empty">Пусто. Нажми «Настроить разделы» внизу, чтобы добавить пункты.</div>`;
    h+=card({key:(allOpt?"rest-":"")+"sec-"+s.id,title:esc(s.title),cnt:allOpt?null:cnt,tag:allOpt?"по желанию":"",def:allOpt,body});
  }
  h+=`<div class="btns" style="justify-content:center;margin-top:18px"><button class="btn ghost" data-act="edit-on">${IC.pen}<span>Настроить разделы и пункты</span></button></div>`;
  return h;
}

function viewEdit(){
  const lay=L(),secOpts=i=>lay.map((s,j)=>`<option value="${j}" ${i===j?"selected":""}>${esc(s.title)}</option>`).join("");
  const hidden=hiddenItems();
  let h=`<div class="page-head"><div><h1>Настройка дня</h1><p class="lead">Порядок, названия, разделы и пункты. Всё сохраняется сразу.</p></div><button class="btn primary" data-act="edit-done">Готово</button></div>`;
  lay.forEach((s,i)=>{
    const rows=s.items.map((id,j)=>{const o=itemOpt(id);if(!o)return "";const cdef=!o.builtin?state.settings.custom[id]:null;
      return `<div class="ed-row">
        <div class="ed-top"><input class="in txt" data-iname="${id}" data-k="in-${id}" value="${esc(o.name)}" aria-label="Название пункта">
          <span class="ed-arrows"><button class="ib up" data-act="item-move" data-s="${i}" data-j="${j}" data-d="-1" ${j===0?"disabled":""} aria-label="Выше">${IC.chev}</button><button class="ib down" data-act="item-move" data-s="${i}" data-j="${j}" data-d="1" ${j===s.items.length-1?"disabled":""} aria-label="Ниже">${IC.chev}</button><button class="x" data-act="item-hide" data-s="${i}" data-j="${j}" aria-label="Убрать пункт" title="Убрать пункт">${IC.close}</button></span></div>
        <div class="ed-opts">
          <span class="unit">${o.builtin?"стандартный":CX_TYPES[cdef.type]||""}</span>
          ${cdef&&cdef.type==="num"?`<span class="f" style="gap:6px"><span class="unit">норма</span><input class="in num sm" type="number" min="0" data-cxgoal="${id}" data-k="cg-${id}" value="${cdef.goal??""}" aria-label="Норма"><input class="in sm" type="text" data-cxunit="${id}" data-k="cu-${id}" value="${esc(cdef.unit||"")}" placeholder="мин" aria-label="Единица"></span>`:""}
          <label class="tg"><input type="checkbox" data-iopt="${id}" data-key="counts" ${o.counts?"checked":""}> в процент дня</label>
          <label class="tg"><input type="checkbox" data-iopt="${id}" data-key="restOpt" ${o.restOpt?"checked":""}> в вс — по желанию</label>
          ${lay.length>1?`<select class="in sel-sm" data-imove="${id}" data-s="${i}" aria-label="Перенести в раздел">${secOpts(i)}</select>`:""}
        </div></div>`}).join("");
    h+=`<section class="card"><header class="card-h ed-h">
      <input class="in txt ed-title" data-sec-title="${i}" data-k="st-${i}" value="${esc(s.title)}" aria-label="Название раздела">
      <span class="ed-arrows"><button class="ib up" data-act="sec-move" data-s="${i}" data-d="-1" ${i===0?"disabled":""} aria-label="Раздел выше">${IC.chev}</button><button class="ib down" data-act="sec-move" data-s="${i}" data-d="1" ${i===lay.length-1?"disabled":""} aria-label="Раздел ниже">${IC.chev}</button></span>
    </header><div class="card-b">${rows||`<div class="pad empty">В разделе нет пунктов.</div>`}
      <div class="pad ed-add">
        <div class="btns"><input class="in txt" id="nn-${i}" type="text" placeholder="Новый пункт" style="min-width:160px">
          <select class="in sel-sm" id="nt-${i}" aria-label="Тип">${Object.entries(CX_TYPES).map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>
          <button class="btn" data-act="item-add" data-s="${i}">+ Добавить</button></div>
        ${hidden.length?`<div class="btns"><select class="in sel-sm" id="nh-${i}" aria-label="Скрытый пункт">${hidden.map(id=>`<option value="${id}">${esc(itemOpt(id).name)}</option>`).join("")}</select><button class="btn ghost" data-act="item-restore" data-s="${i}">Вернуть пункт</button></div>`:""}
        <div class="btns" style="justify-content:flex-end">${confirmBtn("delsec-"+s.id,"Удалить раздел","sec-del",`data-s="${i}"`)}</div>
      </div></div></section>`;
  });
  h+=`<section class="card"><div class="pad"><div class="btns"><input class="in txt" id="new-sec" type="text" placeholder="Название нового раздела" style="min-width:200px"><button class="btn" data-act="sec-add">+ Новый раздел</button></div>
    <p class="hint" style="margin-top:10px">Удалённые пункты не пропадают: их записи сохраняются, а сам пункт можно вернуть кнопкой «Вернуть пункт» в любом разделе.</p></div></section>
    <div class="btns" style="justify-content:space-between;margin-top:6px">${confirmBtn("layout-reset","Вернуть стандартный порядок","layout-reset")}<button class="btn primary" data-act="edit-done">Готово</button></div>`;
  return h;
}

function viewLibrary(){
  const g=G(),y=String(new Date().getFullYear());
  const doneY=t=>liveBooks().filter(b=>b.type===t&&b.status==="done"&&(b.finished||"").startsWith(y)).length;
  const fy=doneY("f"),sy=doneY("s"),tab=ui.libTab;
  const books=liveBooks().filter(b=>b.type===tab);
  const list=(st,title,def)=>{
    const arr=books.filter(b=>b.status===st).sort((a,b)=>(b.finished||b.added||"").localeCompare(a.finished||a.added||""));
    const body=arr.length?arr.map(bookItem).join(""):`<div class="pad empty">Пока пусто.</div>`;
    return card({key:"lib-"+st,title,body,def,extra:arr.length?String(arr.length):""});
  };
  return `<div class="page-head"><div><h1>Библиотека</h1><p class="lead">Цель на ${y} год</p></div>
    <div class="seg" role="group"><button data-act="lib-tab" data-tab="f" aria-pressed="${tab==="f"}">Художественная</button><button data-act="lib-tab" data-tab="s" aria-pressed="${tab==="s"}">Научная</button></div></div>
    <section class="card"><div class="pad stats">
      <div class="st"><b>${fy}</b><span>из ${g.fictionYear} художественных</span>${bar(fy/g.fictionYear,"thick")}</div>
      <div class="st"><b>${sy}</b><span>из ${g.scienceYear} научных</span>${bar(sy/g.scienceYear,"thick")}</div></div></section>
    ${list("reading","Читаю сейчас",false)}
    ${card({key:"lib-add",title:"Добавить книгу",def:true,body:`<div class="pad"><div class="form">
      <label class="full">Название<input class="in" id="nb-title" type="text"></label>
      <label>Автор<input class="in" id="nb-author" type="text"></label>
      <label>Страниц<input class="in" id="nb-pages" type="number" min="1" inputmode="numeric"></label>
      <label>Список<select class="in" id="nb-status"><option value="reading">Читаю сейчас</option><option value="want">Хочу прочитать</option><option value="done">Прочитал</option></select></label>
      <label>&nbsp;<button class="btn primary" data-act="book-add">Добавить в «${tab==="f"?"Художественную":"Научную"}»</button></label>
    </div></div>`})}
    ${list("want","Хочу прочитать",false)}${list("done","Прочитал",true)}`;
}
function bookItem(b){
  const p=b.total?(b.cur||0)/b.total:0,qs=b.quotes||[],done=b.status==="done";
  const val=done?(b.rating?`<b>${b.rating}</b>/5`:""):(b.status==="reading"&&b.total?`<b>${Math.round(p*100)}%</b>`:(b.total?`${b.total} стр.`:""));
  const sub=[b.author?esc(b.author):"",done&&b.finished?`прочитана ${fmtDM(b.finished)}`:"",b.status==="reading"&&b.total?`стр. ${b.cur||0} из ${b.total}`:"",qs.length?`${qs.length} ${plural(qs.length,"цитата","цитаты","цитат")}`:""].filter(Boolean).join(" · ");
  return item({key:"bk-"+b.id,label:esc(b.title),sub,val,p:b.status==="want"?0:p,done,
    body:`${b.status!=="want"?field("Страница",`${num(`b.${b.id}.cur`,{cls:"sm",label:"Текущая страница"})}<span class="unit">из</span>${num(`b.${b.id}.total`,{cls:"sm",label:"Всего страниц"})}`):field("Страниц",num(`b.${b.id}.total`,{cls:"sm",label:"Всего страниц"}))}
      ${field("Список",`<select class="in" data-book-status="${b.id}" data-k="bs-${b.id}" aria-label="Список"><option value="reading" ${b.status==="reading"?"selected":""}>Читаю сейчас</option><option value="want" ${b.status==="want"?"selected":""}>Хочу прочитать</option><option value="done" ${done?"selected":""}>Прочитал</option></select>`,b.status==="reading"&&b.total&&(b.cur||0)>=b.total?`<button class="btn primary" data-act="book-finish" data-id="${b.id}">Отметить прочитанной</button>`:"")}
      ${done?field("Оценка",rating(`b.${b.id}.rating`,"Оценка книги")):""}
      ${area(`b.${b.id}.notes`,"Мысли о книге, главные идеи…",3)}
      ${qs.map((q,i)=>`<div class="quote"><span>«${esc(q.t)}»${q.p?`<em>с. ${esc(q.p)}</em>`:""}</span><button class="x" data-act="quote-del" data-id="${b.id}" data-i="${i}" aria-label="Удалить цитату">${IC.close}</button></div>`).join("")}
      <textarea id="q-${b.id}" rows="2" placeholder="Новая цитата"></textarea>
      <div class="btns"><input class="in num sm" id="qp-${b.id}" type="number" min="1" placeholder="стр." aria-label="Страница цитаты"><button class="btn" data-act="quote-add" data-id="${b.id}">Сохранить цитату</button><span style="flex:1"></span>${confirmBtn("delbook-"+b.id,"Удалить книгу","book-del",`data-id="${b.id}"`)}</div>`});
}

function stageList(kind){
  const cur=state.settings.hobby[kind]||0;
  return `<ol class="stages">${PLANS[kind].map((s,i)=>`<li class="${i<cur?"past":i===cur?"cur":""}" data-act="stage" data-kind="${kind}" data-i="${i}" tabindex="0"><span class="n">${i<cur?"✓":i+1}</span><div><b>${s[0]}</b><div class="muted small">${s[1]}</div></div></li>`).join("")}</ol><p class="hint">Нажми на этап, чтобы отметить его текущим.</p>`;
}
function stageItem(kind,label){const cur=state.settings.hobby[kind]||0,s=PLANS[kind][cur]||PLANS[kind][0];return item({key:"stg-"+kind,label,sub:`этап ${cur+1} из ${PLANS[kind].length}: ${s[0]}`,p:(cur)/PLANS[kind].length,body:stageList(kind)})}
function viewGrowth(){
  const g=G(),cd=courseDone(),left=Math.max(0,g.courseTotal-cd),tk=todayKey(),finish=courseFinish();
  let engTotal=0,engWeek=0,knitTotal=0,controls=[],notes=[];
  const ws=weekStart(tk);
  for(const k of Object.keys(state.days).sort()){const d=state.days[k];const m=(d.eng&&d.eng.min)||0;engTotal+=m;if(k>=ws)engWeek+=m;knitTotal+=(d.knit&&d.knit.min)||0;if(d.write&&d.write.control)controls.push(k);
    if((d.eng&&d.eng.note)||(d.course&&d.course.note)||(d.cx&&Object.values(d.cx).some(x=>x&&x.note)))notes.push(k)}
  const sc=scarfDone(),sLeft=Math.max(0,g.scarfLen-sc);
  let cm7=0,act7=0;for(let i=0;i<7;i++){const d=D(addDays(tk,-i));if(d.knit&&d.knit.cm){cm7+=d.knit.cm;act7++}}
  const pace=act7?cm7/act7:0;
  const sFinish=sLeft>0&&pace>0?forecastWorkdays(addDays(tk,1),Math.ceil(sLeft/pace)):null;
  const wish=state.settings.hobby.wish||[];
  return `<div class="page-head"><div><h1>Развитие</h1><p class="lead">Планы, этапы и прогнозы. Отметки за день — на странице «Сегодня».</p></div></div>
  ${card({key:"gr-course",title:"Курс по бизнесу",body:`<div class="pad stats"><div class="st"><b>${cd}</b><span>из ${g.courseTotal} уроков</span>${bar(cd/g.courseTotal,"thick")}</div>
    <div class="st"><b>${left?fmtDM(finish):"✓"}</b><span>${left?`прогноз финиша · осталось ${left} ${plural(left,"урок","урока","уроков")}, ${g.coursePerDay} в день, вс — выходной`:"курс пройден"}</span></div></div>
    ${item({key:"gr-course-off",label:"Пройдено до начала трекера",val:`<b>${g.courseOffset||0}</b>`,icon:IC.pen,body:field("Уроков",num("s.goals.courseOffset",{cls:"sm",label:"Пройдено до начала трекера"}))})}`})}
  ${card({key:"gr-eng",title:"Английский",body:`<div class="pad stats"><div class="st"><b>${engWeek}</b><span>мин на этой неделе</span></div><div class="st"><b>${fmtN(engTotal/60,1)}</b><span>ч всего</span></div></div>${stageItem("eng","План обучения")}`})}
  ${card({key:"gr-write",title:"Письмо левой рукой",body:`${stageItem("write","План обучения")}
    ${item({key:"gr-write-rules",label:"Правила",icon:IC.pen,sub:"медленно лучше, чем криво",body:`<ol class="steps"><li>Медленно лучше, чем криво.</li><li>Лист поверни верхним краем вправо.</li><li>Раз в неделю пиши одну и ту же контрольную фразу и сравнивай.</li></ol><p class="hint">Контрольная фраза: ${controls.length?controls.slice(-8).map(fmtShort).join(", "):"пока не отмечалась"}.</p>`})}`})}
  ${card({key:"gr-knit",title:"Вязание",body:`<div class="pad stats"><div class="st"><b>${fmtN(sc,1)}</b><span>из ${g.scarfLen} см шарфа</span>${bar(sc/g.scarfLen,"thick")}</div>
    <div class="st"><b>${sLeft===0?"✓":(sFinish?fmtDM(sFinish):"—")}</b><span>${sLeft===0?"шарф готов":pace?`прогноз при ${fmtN(pace,1)} см/день · цель — конец ноября`:"отмечай сантиметры — появится прогноз"}</span></div>
    <div class="st"><b>${fmtN(knitTotal/60,1)}</b><span>ч вязания всего</span></div></div>
    ${stageItem("knit","План обучения")}
    ${item({key:"gr-knit-kit",label:"Инструменты",icon:IC.pen,sub:"спицы 7–8 мм, толстая однотонная светлая пряжа"})}`})}
  ${card({key:"gr-wish",title:"Хочу попробовать",extra:String(wish.length),body:`${wish.map(w=>`<div class="it"><div class="it-row" style="cursor:default"><span class="noti">${IC.pen}</span><span class="it-main"><span class="t">${esc(w.name)}</span></span><button class="x" data-act="wish-del" data-id="${w.id}" aria-label="Убрать">${IC.close}</button></div></div>`).join("")}
    <div class="pad"><div class="btns"><input class="in txt" id="wish-new" type="text" placeholder="Новое хобби" style="max-width:260px"><button class="btn" data-act="wish-add">Добавить</button></div>
    <p class="hint" style="margin-top:10px">Совет: не больше двух активных хобби. Новое бери, когда одно из текущих войдёт в привычку.</p></div>`})}
  ${notes.length?card({key:"gr-notes",title:"Итоги по обучению",def:true,extra:String(notes.length),body:notes.slice(-15).reverse().map(k=>{const d=state.days[k];const parts=[];
    if(d.eng&&d.eng.note)parts.push(`<div><b>Английский:</b> ${esc(d.eng.note)}</div>`);if(d.course&&d.course.note)parts.push(`<div><b>Курс:</b> ${esc(d.course.note)}</div>`);
    if(d.cx)for(const id in d.cx){const l=state.settings.custom[id];if(d.cx[id]&&d.cx[id].note)parts.push(`<div><b>${esc(l?itemOpt(id).name:"Пункт")}:</b> ${esc(d.cx[id].note)}</div>`)}
    return `<div class="sumr" style="grid-template-columns:60px 1fr;align-items:start"><span class="muted small">${fmtShort(k)}</span><div class="small">${parts.join("")}</div></div>`}).join("")}):""}`;
}

/* ---------- charts ---------- */
function chart({dates,series,yMin,yMax,band,bars,unit="",dec=0}){
  const W=640,H=200,pl=40,pr=10,pt=12,pb=24,iw=W-pl-pr,ih=H-pt-pb,n=dates.length;
  const all=series.flatMap(s=>s.vals.filter(v=>v!=null));
  if(!all.length)return `<div class="empty">Пока нет данных за этот период.</div>`;
  let lo=yMin??Math.min(...all),hi=yMax??Math.max(...all);
  if(band){lo=Math.min(lo,band[0]);hi=Math.max(hi,band[1])}
  if(yMin==null||yMax==null){const span=(hi-lo)||Math.max(1,Math.abs(hi)*.05);if(yMin==null)lo-=span*.15;if(yMax==null)hi+=span*.15}
  if(bars&&yMin==null)lo=0;
  const X=i=>bars?pl+(i+.5)*iw/n:(n===1?pl+iw/2:pl+i*iw/(n-1));
  const Y=v=>pt+ih-(v-lo)/(hi-lo)*ih;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for(let t=0;t<=3;t++){const v=lo+(hi-lo)*t/3,yy=Y(v);s+=`<line x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${pl-8}" y="${yy+4}" text-anchor="end">${fmtN(v,(hi-lo)<6?1:0)}</text>`}
  if(band)s+=`<rect x="${pl}" y="${Y(band[1])}" width="${iw}" height="${Y(band[0])-Y(band[1])}" fill="var(--accent)" opacity=".1"/>`;
  const ticks=[...new Set([0,Math.floor((n-1)/2),n-1])];
  ticks.forEach(i=>{const an=bars?"middle":(i===0?"start":(i===n-1?"end":"middle"));s+=`<text x="${X(i)}" y="${H-6}" text-anchor="${an}">${fmtShort(dates[i])}</text>`});
  series.forEach(se=>{
    if(bars){const bw=Math.max(2,iw/n*.6);se.vals.forEach((v,i)=>{if(v==null)return;s+=`<rect x="${X(i)-bw/2}" y="${Y(v)}" width="${bw}" height="${Math.max(0,Y(lo)-Y(v))}" fill="${se.color}" rx="1.5"><title>${fmtShort(dates[i])}: ${fmtN(v,dec)} ${unit}</title></rect>`});return}
    const pts=se.vals.map((v,i)=>v==null?null:[X(i),Y(v),v,i]).filter(Boolean);
    if(pts.length>1)s+=`<path d="${pts.map((p,j)=>(j?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join("")}" fill="none" stroke="${se.color}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>`;
    const showDots=pts.length<=62;
    pts.forEach(p=>{s+=`<circle cx="${p[0]}" cy="${p[1]}" r="${showDots?3:1.5}" fill="var(--surface)" stroke="${se.color}" stroke-width="1.5"><title>${fmtShort(dates[p[3]])}: ${fmtN(p[2],dec)} ${unit}</title></circle>`});
  });
  return `<div class="chart">${s}</svg></div>`;
}
const legend=items=>`<div class="legend">${items.map(([n,c])=>`<span><i style="background:${c}"></i>${n}</span>`).join("")}</div>`;
function viewStats(){
  const tk=todayKey(),N={week:7,month:30,year:365}[ui.period];
  const dates=[];for(let i=N-1;i>=0;i--)dates.push(addDays(tk,-i));
  const pick=f=>dates.map(k=>{const v=f(D(k),k);return v==null||v===""?null:v});
  const weight=pick(d=>d.weight||null);
  const sleepH=pick((d,k)=>{const m=sleepDurK(k);return m?Math.round(m/6)/10:null});
  const sleepQ=pick(d=>(d.sleep&&d.sleep.q)||null);
  const energy=pick(d=>(d.well&&d.well.energy)||null),mood=pick(d=>(d.well&&d.well.mood)||null);
  const names=allExNames();if(!ui.chartEx||!names.includes(ui.chartEx))ui.chartEx=names[0]||"";
  const exVals=pick(d=>{let m=null;((d.train&&d.train.ex)||[]).forEach(e=>{if((e.name||"").trim().toLowerCase()===ui.chartEx.toLowerCase())(e.sets||[]).forEach(s=>{if(s.w&&(m==null||s.w>m))m=s.w})});return m});
  const g=G();
  const [cy,cm]=ui.calMonth.split("-").map(Number);
  const first=new Date(cy,cm-1,1),days=new Date(cy,cm,0).getDate(),lead=(first.getDay()+6)%7;
  const cd=courseDone();
  let cal=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(w=>`<div class="wd">${w}</div>`).join("")+"<div></div>".repeat(lead);
  for(let i=1;i<=days;i++){const k=`${cy}-${pad(cm)}-${pad(i)}`;const fut=k>tk;const has=hasData(k);const p=has?dayPct(k,cd).pct:0;
    cal+=`<button class="c ${k===tk?"today":""} ${fut?"fut":""} ${has&&p>=55?"hi":""}" ${fut?"disabled":`data-act="goto-day" data-date="${k}"`} title="${fmtDM(k)}${has?": "+p+"%":""}">${has?`<span class="fill" style="opacity:${(0.12+p/100*0.88).toFixed(2)}"></span>`:""}<b>${i}</b></button>`}
  const P=x=>`<div class="pad">${x}</div>`;
  return `<div class="page-head"><div><h1>Статистика</h1></div>
    <div class="seg" role="group">${[["week","Неделя"],["month","Месяц"],["year","Год"]].map(([p,l])=>`<button data-act="period" data-p="${p}" aria-pressed="${ui.period===p}">${l}</button>`).join("")}</div></div>
  ${card({key:"st-cal",title:"Календарь",body:P(`<div class="cal-nav"><button class="ib flip" data-act="cal-prev" aria-label="Предыдущий месяц">${IC.chev}</button><span>${MN[cm-1]} ${cy}</span><button class="ib" data-act="cal-next" aria-label="Следующий месяц">${IC.chev}</button></div><div class="cal">${cal}</div><div class="cal-legend">меньше <i style="opacity:.15"></i><i style="opacity:.45"></i><i style="opacity:.75"></i><i></i> больше · нажми на день, чтобы открыть его</div>`)})}
  ${card({key:"st-weight",title:"Вес",body:P(chart({dates,series:[{vals:weight,color:"var(--accent)"}],unit:"кг",dec:1}))})}
  ${card({key:"st-sleep",title:"Сон",body:P(legend([["Длительность, ч","var(--accent)"]])+chart({dates,series:[{vals:sleepH,color:"var(--accent)"}],bars:true,band:[g.sleepMin,g.sleepMax],unit:"ч",dec:1})+`<p class="hint" style="margin:4px 0 14px">Полоса — цель ${g.sleepMin}–${g.sleepMax} ч.</p>`+legend([["Качество сна, 1–5","var(--good)"]])+chart({dates,series:[{vals:sleepQ,color:"var(--good)"}],yMin:1,yMax:5}))})}
  ${card({key:"st-ex",title:"Рабочие веса",body:P(names.length?`<select class="in" data-chart-ex data-k="chart-ex" aria-label="Упражнение" style="margin-bottom:10px">${names.map(n=>`<option ${n===ui.chartEx?"selected":""}>${esc(n)}</option>`).join("")}</select>`+chart({dates,series:[{vals:exVals,color:"var(--accent)"}],unit:"кг",dec:1})+`<p class="hint">Максимальный вес в упражнении за тренировку.</p>`:`<div class="empty">Запиши первую силовую тренировку — здесь появится прогресс по каждому упражнению.</div>`)})}
  ${card({key:"st-well",title:"Энергия и настроение",body:P(legend([["Энергия","var(--accent)"],["Настроение","var(--good)"]])+chart({dates,series:[{vals:energy,color:"var(--accent)"},{vals:mood,color:"var(--good)"}],yMin:1,yMax:5}))})}`;
}

function viewWeek(){
  const ws=ui.week,tk=todayKey(),g=G(),cd=courseDone();
  const keys=[];for(let i=0;i<7;i++)keys.push(addDays(ws,i));
  const past=keys.filter(k=>k<=tk);
  const avg=a=>{const f=a.filter(v=>v!=null&&v!==0&&v!==false&&v!==undefined);return f.length?f.reduce((x,y)=>x+y,0)/f.length:null};
  const sum=f=>keys.reduce((s,k)=>s+(f(D(k))||0),0);
  const pcts=past.filter(hasData).map(k=>dayPct(k,cd).pct);
  const str=keys.filter(k=>dayType(k)==="strength"),car=keys.filter(k=>dayType(k)==="cardio");
  const strDone=str.filter(k=>strengthDone(D(k))).length,carDone=car.filter(k=>((D(k).train&&D(k).train.cardio)||0)>=g.cardio).length;
  const sl=avg(keys.map(k=>sleepDurK(k)));
  const wEnd=(()=>{let w=null;keys.forEach(k=>{if(D(k).weight)w=D(k).weight});return w})();
  const wPrevKey=lastWeightDay(ws);const wPrev=wPrevKey?state.days[wPrevKey].weight:null;
  const fmt=(v,d=0,u="")=>v==null?"—":fmtN(v,d)+(u?" "+u:"");
  const okv=(v,n)=>v==null?"":(v>=n?"ok":"no");
  const water=avg(keys.map(k=>D(k).water)),kcal=avg(keys.map(k=>D(k).food&&D(k).food.kcal)),prot=avg(keys.map(k=>D(k).food&&D(k).food.protein));
  const fp=sum(d=>d.read&&d.read.f&&d.read.f.pages),sp=sum(d=>d.read&&d.read.s&&d.read.s.pages),eng=sum(d=>d.eng&&d.eng.min),crs=sum(d=>d.course&&d.course.n);
  const km=sum(d=>d.knit&&d.knit.min),kc=sum(d=>d.knit&&d.knit.cm),wr=sum(d=>d.write?[d.write.s1,d.write.s2,d.write.s3].filter(Boolean).length:0);
  const sec=(title,rows)=>`<div class="sh">${title}</div>`+rows.map(r=>`<div class="sumr"><span>${r[0]}</span><span class="v">${r[1]}</span><span class="n">${r[2]}</span><span class="m ${r[3]||""}"></span></div>`).join("");
  const avgP=pcts.length?avg(pcts):null;
  const body=sec("Режим",[
      ["Средний процент дня",avgP==null?"—":fmtN(avgP)+"%","",avgP==null?"":(avgP>=80?"ok":"no")],
      ["Силовые тренировки",`${strDone} из ${str.length}`,"",okv(strDone,str.length)],
      ["Ходьба на дорожке",`${carDone} из ${car.length}`,`от ${g.cardio} мин`,okv(carDone,car.length)],
      ["Средний сон",sl?fmtDur(Math.round(sl)):"—",`${g.sleepMin}–${g.sleepMax} ч`,sl?okv(sl,g.sleepMin*60):""],
      ["Качество сна",fmt(avg(keys.map(k=>D(k).sleep&&D(k).sleep.q)),1),"из 5",""]])
    +sec("Тело",[
      ["Вода в среднем",fmt(water,0,"мл"),fmtN(g.water)+" мл",okv(water,g.water)],
      ["Калории в среднем",fmt(kcal,0,"ккал"),fmtN(g.kcal)+" ккал",kcal==null?"":(kcal<=g.kcal*1.05?"ok":"no")],
      ["Белок в среднем",fmt(prot,0,"г"),g.protein+" г",okv(prot,g.protein)],
      ["Вес",wEnd?fmtN(wEnd,1)+" кг"+(wPrev?` (${wEnd-wPrev>0?"+":""}${fmtN(wEnd-wPrev,1)})`:""):"—","",""],
      ["Энергия",fmt(avg(keys.map(k=>D(k).well&&D(k).well.energy)),1),"из 5",""],
      ["Настроение",fmt(avg(keys.map(k=>D(k).well&&D(k).well.mood)),1),"из 5",""]])
    +sec("Чтение и обучение",[
      ["Художественная",fp+" стр.",g.fiction*6+" стр.",okv(fp,g.fiction*6)],
      ["Научная",sp+" стр.",g.science*6+" стр.",okv(sp,g.science*6)],
      ["Английский",eng+" мин",g.eng*6+" мин",okv(eng,g.eng*6)],
      ["Курс по бизнесу",crs+" ур.",g.coursePerDay*6+" ур.",okv(crs,g.coursePerDay*6)],
      ...Object.keys(state.settings.custom).filter(id=>state.settings.custom[id].type==="num"&&L().some(x=>x.items.includes(id))).map(id=>{const def=state.settings.custom[id];const m=keys.reduce((a,k)=>a+(Number(cxVal(D(k),id))||0),0);return [esc(itemOpt(id).name),fmtN(m,1)+" "+esc(def.unit||""),fmtN((def.goal||0)*6)+" "+esc(def.unit||""),okv(m,(def.goal||0)*6)]})])
    +sec("Хобби",[
      ["Вязание",`${km} мин · ${fmtN(kc,1)} см`,g.knit*6+" мин",okv(km,g.knit*6)],
      ["Письмо левой рукой",wr+" "+plural(wr,"сессия","сессии","сессий"),"18 сессий",okv(wr,18)]])
    +`<div class="pad"><p class="hint">Справа — норма за неделю (6 рабочих дней). Точка закрашена, если норма выполнена.</p></div>`;
  return `<div class="page-head"><div><h1>Итоги недели</h1>
    <div class="date-nav" style="margin-top:8px"><button class="ib flip" data-act="week-prev" aria-label="Предыдущая неделя">${IC.chev}</button><span class="date-l">${fmtDM(ws)} — ${fmtDM(addDays(ws,6))}</span><button class="ib" data-act="week-next" aria-label="Следующая неделя">${IC.chev}</button></div></div></div>
  ${card({key:"wk-sum",title:"Сводка",body})}
  ${card({key:"wk-notes",title:"Мысли о неделе",body:`<div class="pad" style="display:flex;flex-direction:column;gap:12px"><label class="small muted">Что получилось${area(`s.weekNotes.${ws}.good`,"Чем доволен на этой неделе…",3)}</label><label class="small muted">Что улучшить${area(`s.weekNotes.${ws}.improve`,"Что поменять на следующей неделе…",3)}</label></div>`})}`;
}

const GOAL_FIELDS=[
  ["Тело",[["water","Вода","мл",50],["kcal","Калории","ккал",50],["protein","Белок","г",5],["bedFrom","Отбой с","",0,"time"],["bedTo","Отбой до","",0,"time"],["wake","Подъём","",0,"time"],["sleepMin","Сон от","ч",.5],["sleepMax","Сон до","ч",.5]]],
  ["Движение",[["cardio","Ходьба от","мин",5],["cardioMax","Ходьба до","мин",5],["walk","Прогулка от","мин",5],["walkMax","Прогулка до","мин",5]]],
  ["Ум и спокойствие",[["med","Медитация","мин",1],["silence","Время тишины","мин",1]]],
  ["Чтение",[["fiction","Художественная в день","стр.",1],["science","Научная в день","стр.",1],["fictionYear","Художественных за год","книг",1],["scienceYear","Научных за год","книг",1]]],
  ["Обучение",[["eng","Английский","мин",5],["coursePerDay","Уроков курса в день","",1],["courseTotal","Уроков в курсе","",1]]],
  ["Хобби",[["w1","Письмо, сессия 1","мин",1],["w2","Письмо, сессия 2","мин",1],["w3","Письмо, сессия 3","мин",1],["knit","Вязание","мин",5],["scarfLen","Длина шарфа","см",5]]]
];
function viewSettings(){
  const th=lsGet("ritm-theme","auto"),g=G(),tk=todayKey();
  const syncBody=Sync.on()
    ?`<div class="pad" style="display:flex;flex-direction:column;gap:12px">
      <div class="f"><span class="sync ${Sync.status}" style="padding:0"><i></i></span><span>Подключено: <b>${esc(Sync.cfg.owner)}/${esc(Sync.cfg.repo||REPO)}</b> · приватно</span></div>
      <p class="hint">${Sync.msg?esc(Sync.msg):(Sync.last?`Последняя синхронизация: ${new Date(Sync.last).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}. `:"")}Изменения отправляются автоматически через пару секунд, а при открытии приложения подтягиваются с других устройств. Каждое сохранение — отдельная версия в истории репозитория, так что ничего не потеряется.</p>
      <div class="btns"><button class="btn" data-act="sync-now">Синхронизировать сейчас</button><button class="btn ghost" data-act="sync-link">Ссылка для другого устройства</button>${confirmBtn("sync-off","Отключить","sync-off")}</div>
      ${ui.msg&&ui.msg.k==="link"?`<div class="notice">${ui.msg.t}</div>`:""}</div>`
    :`<div class="pad" style="display:flex;flex-direction:column;gap:12px">
      <p class="hint">Сейчас данные хранятся только на этом устройстве. Подключи свой аккаунт GitHub — прогресс будет сохраняться в твоём приватном репозитории <code>ritm-data</code> (его видишь только ты) и появится на телефоне и компьютере.</p>
      <ol class="steps"><li>Войди на <a href="https://github.com" target="_blank" rel="noopener">github.com</a> (или зарегистрируйся).</li>
      <li>Открой <a href="https://github.com/settings/tokens/new?scopes=repo&description=Ritm%20tracker" target="_blank" rel="noopener">создание токена</a> — галочка «repo» уже стоит. В поле Expiration выбери «No expiration» и нажми «Generate token».</li>
      <li>Скопируй токен (начинается с <code>ghp_</code>) и вставь сюда. Репозиторий <code>ritm-data</code> создастся сам, приватным.</li></ol>
      <div class="btns"><input class="in txt" id="sync-token" type="password" placeholder="ghp_…" autocomplete="off" style="max-width:340px"><button class="btn primary" data-act="sync-connect">Подключить</button></div>
      ${Sync.msg?`<div class="notice err">${esc(Sync.msg)}</div>`:""}</div>`;
  return `<div class="page-head"><div><h1>Настройки</h1></div></div>
  ${card({key:"set-sync",title:"Облачная синхронизация",extra:Sync.on()?"включена":"выключена",body:syncBody})}
  ${card({key:"set-theme",title:"Оформление",body:`<div class="pad"><div class="seg" role="group">${[["light","Светлая"],["dark","Тёмная"],["auto","Как в системе"]].map(([v,l])=>`<button data-act="theme" data-v="${v}" aria-pressed="${th===v}">${l}</button>`).join("")}</div></div>`})}
  ${card({key:"set-goals",title:"Нормы",body:GOAL_FIELDS.map(([title,fs])=>item({key:"goal-"+title,label:title,icon:IC.pen,
      sub:fs.slice(0,3).map(([k,l,u])=>`${l.toLowerCase()} ${g[k]}${u?" "+u:""}`).join(" · "),
      body:fs.map(([k,l,u,st,type])=>field(l,type==="time"?timeIn("s.goals."+k,l):num("s.goals."+k,{step:st,label:l}),u?`<span class="unit">${u}</span>`:"")).join("")})).join("")})}
  ${card({key:"set-tasks",title:"Регулярные задачи",extra:String(state.settings.tasks.length),body:state.settings.tasks.map((t,i)=>{const left=t.every-diffDays(t.last||tk,tk);
      return item({key:"task-"+t.id,label:esc(t.name),sub:`раз в ${t.every} ${plural(t.every,"день","дня","дней")} · ${left<=0?"пора":"через "+left+" "+plural(left,"день","дня","дней")}`,warn:left<=0,p:1-clamp01(left/t.every),
        body:`${field("Название",txt(`s.tasks.${i}.name`,"Название"))}${field("Раз в",num(`s.tasks.${i}.every`,{cls:"sm",label:"Период, дней"}),`<span class="unit">дн.</span>`)}<div class="btns"><button class="btn" data-act="task-done" data-id="${t.id}">Сделано сегодня</button>${confirmBtn("deltask-"+t.id,"Удалить","task-del",`data-id="${t.id}"`)}</div>`})}).join("")
      +`<div class="pad"><div class="btns"><input class="in txt" id="task-new" type="text" placeholder="Новая задача" style="max-width:260px"><span class="unit">раз в</span><input class="in num sm" id="task-every" type="number" min="1" value="7" aria-label="Период, дней"><span class="unit">дн.</span><button class="btn" data-act="task-add">Добавить</button></div></div>`})}
  ${card({key:"set-data",title:"Резервная копия",body:`<div class="pad" style="display:flex;flex-direction:column;gap:12px"><p class="hint">Файл JSON со всеми данными. Подходит и для переноса из старой версии трекера.</p>
    <div class="btns"><button class="btn" data-act="export">Скачать копию</button><button class="btn ghost" data-act="import">Загрузить из копии</button></div>
    ${ui.pendingImport?`<div class="notice">Файл прочитан: ${Object.keys(ui.pendingImport.days||{}).length} дн., ${Object.keys(ui.pendingImport.books||{}).length} книг. Текущие данные будут заменены.<div class="btns" style="margin-top:10px"><button class="btn danger" data-act="import-apply">Заменить данные</button><button class="btn ghost" data-act="import-cancel">Отмена</button></div></div>`:""}
    ${ui.msg&&ui.msg.k==="data"?`<div class="notice">${esc(ui.msg.t)}</div>`:""}</div>`})}`;
}

/* ---------- render ---------- */
const main=$("#main");
function renderNav(){
  const nav=VIEWS.map(([v,l])=>`<button class="navb" data-act="nav" data-view="${v}" ${ui.view===v?'aria-current="page"':""}>${IC[v]}<span>${l}</span></button>`).join("");
  $("#navlist").innerHTML=nav;
  $("#tabbar").innerHTML=VIEWS.filter(v=>v[0]!=="settings").map(([v,l])=>`<button data-act="nav" data-view="${v}" ${ui.view===v?'aria-current="page"':""}>${IC[v]}<span>${l}</span></button>`).join("");
  const th=lsGet("ritm-theme","auto");
  const tl={light:"Светлая тема",dark:"Тёмная тема",auto:"Тема как в системе"}[th],ti={light:IC.sun,dark:IC.moon,auto:IC.auto}[th];
  $("#themeBtn").innerHTML=`${ti}<span>${tl}</span>`;
  $("#themeBtnM").innerHTML=ti;$("#themeBtnM").setAttribute("aria-label",tl);
  $("#setBtnM").setAttribute("aria-current",ui.view==="settings"?"page":"false");
  renderSync();
}
function renderSync(){
  const txt=!Sync.on()?"Только на этом устройстве":({ok:"Синхронизировано",saving:"Синхронизация…",err:"Нет связи с облаком"}[Sync.status]||"Облако подключено");
  document.querySelectorAll(".sync[data-act='nav']").forEach(el=>{el.className="sync "+(Sync.on()?Sync.status:"");el.innerHTML=`<i></i><span>${txt}</span>`;el.title=Sync.msg||txt});
}
function render(){
  const ae=document.activeElement;const fk=ui.focus||(ae&&ae.dataset?ae.dataset.k:null);let ss=null,se=null;
  if(!ui.focus&&ae&&("selectionStart"in ae)){try{ss=ae.selectionStart;se=ae.selectionEnd}catch(e){}}
  const y=window.scrollY;
  renderNav();
  main.innerHTML={today:viewToday,library:viewLibrary,growth:viewGrowth,stats:viewStats,week:viewWeek,settings:viewSettings}[ui.view]();
  $("#exnames").innerHTML=allExNames().map(n=>`<option value="${esc(n)}">`).join("");
  if(fk){const el=main.querySelector(`[data-k="${CSS.escape(fk)}"]`);if(el){el.focus({preventScroll:true});if(ss!=null){try{el.setSelectionRange(ss,se)}catch(e){}}}}
  ui.focus=null;
  window.scrollTo(0,y);
  if(ui.scrollTo){const el=document.getElementById(ui.scrollTo);ui.scrollTo=null;if(el)el.scrollIntoView({block:"center",behavior:"smooth"})}
}
let rTimer=null;function renderSoon(){clearTimeout(rTimer);rTimer=setTimeout(render,0)}
function applyTheme(){const th=lsGet("ritm-theme","auto");if(th==="auto")delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=th;
  const dark=th==="dark"||(th==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=dark?"#121614":"#ECEBE6"}
function setTheme(v){lsSet("ritm-theme",v);applyTheme();render()}

/* ---------- events ---------- */
function editField(el){
  const S=state.settings;
  if(el.dataset.secTitle!=null){L()[Number(el.dataset.secTitle)].title=el.value||"Без названия";markDirty("profile");return true}
  if(el.dataset.iname){const id=el.dataset.iname,v=el.value.trim();if(S.custom[id]){S.custom[id].name=v||"Без названия"}else{S.itemOpts[id]={...(S.itemOpts[id]||{})};if(v&&v!==BI[id].name)S.itemOpts[id].name=v;else delete S.itemOpts[id].name}markDirty("profile");return true}
  if(el.dataset.cxgoal){S.custom[el.dataset.cxgoal].goal=Math.max(0,Number(el.value)||0);markDirty("profile");return true}
  if(el.dataset.cxunit){S.custom[el.dataset.cxunit].unit=el.value.trim();markDirty("profile");return true}
  if(el.dataset.iopt){const id=el.dataset.iopt;S.itemOpts[id]={...(S.itemOpts[id]||{}),[el.dataset.key]:el.checked};markDirty("profile");return true}
  if(el.dataset.imove){const id=el.dataset.imove,from=L()[Number(el.dataset.s)],to=L()[Number(el.value)];from.items=from.items.filter(x=>x!==id);to.items.push(id);markDirty("profile");return true}
  return false;
}
document.addEventListener("input",e=>{const el=e.target;if(el.dataset.bind&&el.type!=="checkbox"){setV(el.dataset.bind,readInput(el));return}if(el.type!=="checkbox"&&el.tagName!=="SELECT")editField(el)});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.dataset.bind){setV(el.dataset.bind,readInput(el));renderSoon();return}
  if(editField(el)){renderSoon();return}
  if(el.dataset.reading){setReading(el.dataset.reading,readInput(el),el.dataset.book);renderSoon();return}
  if(el.dataset.readingBook){const t=el.dataset.readingBook,d=ensureDay(ui.date);d.read=d.read||{};d.read[t]=d.read[t]||{};d.read[t].book=el.value;markDirty("day",ui.date);renderSoon();return}
  if(el.dataset.bookStatus){const b=state.books[el.dataset.bookStatus];b.status=el.value;if(el.value==="done"){b.finished=b.finished||todayKey();if(b.total)b.cur=b.total}else b.finished=null;markDirty("book",b.id);renderSoon();return}
  if(el.hasAttribute("data-chart-ex")){ui.chartEx=el.value;renderSoon();return}
  if(el.id==="importFile"&&el.files[0]){
    const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);if(!p||typeof p.days!=="object")throw 0;ui.pendingImport=p;ui.view="settings";ui.cards["set-data"]=false;render()}catch(err){ui.msg={k:"data",t:"Этот файл не похож на резервную копию трекера."};ui.view="settings";render()}};r.readAsText(el.files[0]);el.value="";
  }
});
document.addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches("[role=button][data-act],li[data-act]")){e.preventDefault();e.target.click()}
  if(e.key==="Enter"&&e.target.id==="sync-token"){e.preventDefault();document.querySelector('[data-act="sync-connect"]').click()}
});

document.addEventListener("click",async e=>{
  const a=e.target.closest("[data-act]");if(!a)return;
  const act=a.dataset.act,k=ui.date;
  const day=()=>ensureDay(k);
  switch(act){
    case "nav":ui.view=a.dataset.view;ui.edit=false;if(a.dataset.tab)ui.libTab=a.dataset.tab;ui.confirm=null;ui.msg=null;render();window.scrollTo(0,0);return;
    case "toggle":{const key=a.dataset.key;ui.open.has(key)?ui.open.delete(key):ui.open.add(key);break}
    case "collapse":{const key=a.dataset.key;ui.cards[key]=!isCollapsed(key,a.dataset.def==="1");saveUi();break}
    case "day-prev":ui.date=addDays(k,-1);break;
    case "day-next":ui.date=addDays(k,1);break;
    case "day-today":ui.date=todayKey();break;
    case "goto-day":ui.date=a.dataset.date;ui.view="today";render();window.scrollTo(0,0);return;
    case "water":{const d=day();d.water=Math.max(0,(d.water||0)+Number(a.dataset.n));markDirty("day",k);break}
    case "rate":{const b=a.dataset.bind,v=Number(a.dataset.v);setV(b,getV(b)===v?null:v);break}
    case "fill":{const b=a.dataset.bind,goal=Number(a.dataset.goal);setV(b,(getV(b)||0)>=goal?null:goal);break}
    case "add":{const b=a.dataset.bind;setV(b,(getV(b)||0)+Number(a.dataset.n));break}
    case "setv":setV(a.dataset.bind,Number(a.dataset.n));break;
    case "toggle-bool":setV(a.dataset.bind,!getV(a.dataset.bind));break;
    case "read-fill":{const t=a.dataset.type,goal=Number(a.dataset.goal),cur=(D(k).read&&D(k).read[t]&&D(k).read[t].pages)||0;setReading(t,cur>=goal?0:goal,a.dataset.book);break}
    case "open-weight":{const sec=L().find(x=>x.items.includes("weight"));if(sec)ui.cards["sec-"+sec.id]=false}ui.open.add("weight");ui.scrollTo="it-weight";ui.focus="d.weight";break;
    case "ex-add":{const d=day();d.train=d.train||{};d.train.ex=d.train.ex||[];d.train.ex.push({name:"",sets:[{r:null,w:null}]});ui.focus=`d.train.ex.${d.train.ex.length-1}.name`;markDirty("day",k);break}
    case "ex-del":{const d=day();d.train.ex.splice(Number(a.dataset.i),1);markDirty("day",k);break}
    case "set-add":{const d=day(),ex=d.train.ex[Number(a.dataset.i)];ex.sets=ex.sets||[];const last=ex.sets[ex.sets.length-1];ex.sets.push({r:last?last.r:null,w:last?last.w:null});markDirty("day",k);break}
    case "set-del":{const d=day();d.train.ex[Number(a.dataset.i)].sets.splice(Number(a.dataset.j),1);markDirty("day",k);break}
    case "ex-copy":{const src=D(a.dataset.from);const d=day();d.train=d.train||{};d.train.ex=clone(src.train.ex).filter(x=>x.name||(x.sets||[]).length);markDirty("day",k);break}
    case "task-done":{const t=state.settings.tasks.find(x=>x.id===a.dataset.id);if(t){t.last=todayKey();markDirty("profile")}break}
    case "task-del":{state.settings.tasks=state.settings.tasks.filter(x=>x.id!==a.dataset.id);ui.confirm=null;markDirty("profile");break}
    case "task-add":{const n=$("#task-new").value.trim();if(!n)return;const ev=Math.max(1,Number($("#task-every").value)||7);state.settings.tasks.push({id:"t"+Date.now(),name:n,every:ev,last:todayKey()});markDirty("profile");break}
    case "lib-tab":ui.libTab=a.dataset.tab;break;
    case "book-add":{const t=$("#nb-title").value.trim();if(!t){$("#nb-title").focus();return}const id="b"+Date.now();const st=$("#nb-status").value;const total=Number($("#nb-pages").value)||null;
      state.books[id]={id,type:ui.libTab,title:t,author:$("#nb-author").value.trim(),total,cur:st==="done"&&total?total:0,status:st,notes:"",quotes:[],rating:null,added:todayKey(),finished:st==="done"?todayKey():null};markDirty("book",id);ui.cards["lib-"+st]=false;break}
    case "book-finish":{const b=state.books[a.dataset.id];b.status="done";b.finished=todayKey();markDirty("book",b.id);break}
    case "book-del":{markDirty("delbook",a.dataset.id);ui.confirm=null;break}
    case "quote-add":{const id=a.dataset.id,ta=$("#q-"+id),t=ta.value.trim();if(!t)return;const b=state.books[id];b.quotes=b.quotes||[];b.quotes.push({t,p:$("#qp-"+id).value||""});markDirty("book",id);break}
    case "quote-del":{const b=state.books[a.dataset.id];b.quotes.splice(Number(a.dataset.i),1);markDirty("book",b.id);break}
    case "stage":{state.settings.hobby[a.dataset.kind]=Number(a.dataset.i);markDirty("profile");break}
    case "wish-add":{const n=$("#wish-new").value.trim();if(!n)return;state.settings.hobby.wish.push({id:"w"+Date.now(),name:n});markDirty("profile");break}
    case "wish-del":{state.settings.hobby.wish=state.settings.hobby.wish.filter(x=>x.id!==a.dataset.id);markDirty("profile");break}
    case "now":setV(a.dataset.bind,nowHM());break;
    case "bed-now":{const now=new Date(),tk=todayKey();const dk=now.getHours()<5&&ui.date===tk?addDays(tk,-1):ui.date;const dd=ensureDay(dk);dd.night=dd.night||{};dd.night.bed=nowHM();markDirty("day",dk);break}
    case "edit-on":ui.edit=true;ui.confirm=null;render();window.scrollTo(0,0);return;
    case "edit-done":ui.edit=false;ui.confirm=null;render();window.scrollTo(0,0);return;
    case "sec-move":{const i=Number(a.dataset.s),j=i+Number(a.dataset.d),lay=L();if(j<0||j>=lay.length)return;[lay[i],lay[j]]=[lay[j],lay[i]];markDirty("profile");break}
    case "item-move":{const it=L()[Number(a.dataset.s)].items,i=Number(a.dataset.j),j=i+Number(a.dataset.d);if(j<0||j>=it.length)return;[it[i],it[j]]=[it[j],it[i]];markDirty("profile");break}
    case "item-hide":{L()[Number(a.dataset.s)].items.splice(Number(a.dataset.j),1);markDirty("profile");break}
    case "item-add":{const i=Number(a.dataset.s),n=$("#nn-"+i).value.trim();if(!n){$("#nn-"+i).focus();return}const type=$("#nt-"+i).value,id="c"+Date.now().toString(36);
      state.settings.custom[id]={type,name:n,...(type==="num"?{goal:30,unit:"мин"}:{})};L()[i].items.push(id);ui.focus="in-"+id;markDirty("profile");break}
    case "item-restore":{const i=Number(a.dataset.s),id=$("#nh-"+i).value;if(!id)return;L()[i].items.push(id);markDirty("profile");break}
    case "sec-add":{const n=$("#new-sec").value.trim();if(!n){$("#new-sec").focus();return}L().push({id:"s"+Date.now().toString(36),title:n,items:[]});markDirty("profile");break}
    case "sec-del":{L().splice(Number(a.dataset.s),1);ui.confirm=null;markDirty("profile");break}
    case "layout-reset":{state.settings.layout=clone(DEFAULT_LAYOUT);const used=new Set(DEFAULT_LAYOUT.flatMap(x=>x.items));Object.keys(state.settings.custom).forEach(id=>{if(!used.has(id))state.settings.layout[state.settings.layout.length-1].items.push(id)});state.settings.itemOpts={};ui.confirm=null;markDirty("profile");break}
    case "period":ui.period=a.dataset.p;break;
    case "cal-prev":case "cal-next":{const[y,m]=ui.calMonth.split("-").map(Number);const d=new Date(y,m-1+(act==="cal-next"?1:-1),1);ui.calMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;break}
    case "week-prev":ui.week=addDays(ui.week,-7);break;
    case "week-next":ui.week=addDays(ui.week,7);break;
    case "theme":setTheme(a.dataset.v);return;
    case "theme-cycle":{const order=["auto","light","dark"];const cur=lsGet("ritm-theme","auto");setTheme(order[(order.indexOf(cur)+1)%3]);return}
    case "ask-confirm":ui.confirm=a.dataset.key;break;
    case "cancel-confirm":ui.confirm=null;break;
    case "export":exportData();return;
    case "import":$("#importFile").click();return;
    case "import-cancel":ui.pendingImport=null;break;
    case "import-apply":{const p=ui.pendingImport;const now=Date.now();
      const oldBooks=Object.keys(state.books);
      state={settings:mergeSettings(p.settings),days:p.days||{},books:p.books||{}};seed();
      migrateDays();state.settings._u=now;Object.values(state.days).forEach(d=>{d._u=now});Object.values(state.books).forEach(b=>{b._u=now});
      oldBooks.forEach(id=>{if(!state.books[id])state.books[id]={id,_del:true,_u:now}});
      ui.pendingImport=null;ui.msg={k:"data",t:"Данные загружены."};saveLocal(true);Sync.schedule(100);break}
    case "sync-connect":{const t=($("#sync-token").value||"").trim();if(!t){$("#sync-token").focus();return}a.disabled=true;a.textContent="Подключаю…";await Sync.connect(t);break}
    case "sync-now":Sync.run();return;
    case "sync-off":Sync.disconnect();ui.confirm=null;break;
    case "sync-link":{const url=location.origin+location.pathname+"#connect="+encodeURIComponent(Sync.cfg.token);
      let copied=false;try{await navigator.clipboard.writeText(url);copied=true}catch(err){}
      ui.msg={k:"link",t:`${copied?"Ссылка скопирована. ":""}Открой её на телефоне или другом компьютере — синхронизация подключится сама. В ссылке твой токен — никому её не пересылай и не публикуй.${copied?"":`<textarea rows="3" readonly style="margin-top:8px">${esc(url)}</textarea>`}`};break}
    default:return;
  }
  render();
});
function exportData(){
  const json=JSON.stringify({app:"ritm",version:2,exported:new Date().toISOString(),settings:state.settings,days:state.days,books:state.books},null,1);
  const name=`ritm-backup-${todayKey()}.json`;
  const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  ui.msg={k:"data",t:`Файл ${name} сохранён в «Загрузки».`};render();
}

/* ---------- start ---------- */
Sync.load();loadLocal();applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",applyTheme);
async function connectFromHash(){
  const m=location.hash.match(/connect=([^&]+)/);if(!m)return false;
  history.replaceState(null,"",location.pathname);ui.view="settings";ui.cards["set-sync"]=false;render();
  await Sync.connect(decodeURIComponent(m[1]));render();return true;
}
window.addEventListener("hashchange",connectFromHash);
(async()=>{
  if(await connectFromHash())return;
  render();
  if(Sync.on())Sync.run();
})();
let lastPull=Date.now();
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Sync.on()&&Date.now()-lastPull>20000){lastPull=Date.now();Sync.run()}if(document.visibilityState==="hidden")saveLocal(true)});
setInterval(()=>{if(document.visibilityState==="visible"&&Sync.on()){lastPull=Date.now();Sync.run()}},120000);
setInterval(()=>{const t=todayKey();if(ui._today&&ui._today!==t&&ui.date===ui._today){ui.date=t;render()}ui._today=t},60000);ui._today=todayKey();
if("serviceWorker" in navigator&&location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))}
