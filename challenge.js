import { MEASURES, DISTRICTS, WEIGHTS, SYNERGIES, BASELINE_SCORE } from './score.js';

export const CHALLENGE_RULES = Object.freeze({ version:'C1', quarters:8, initialBudget:40, income:15, handSize:5 });
export const EVENT_CATALOG = Object.freeze([
  { id:'donations', name:'Бизнес поддержал город', text:'Предприниматели выделили средства на городские инициативы.', budgetDelta:10 },
  { id:'emergency', name:'Авария на теплотрассе', text:'Срочный ремонт потребовал непредвиденных расходов.', budgetDelta:-8 },
  { id:'discount', name:'Выгодные закупки', text:'Поставщик предложил скидку для одного направления.', priceDelta:-0.25 },
  { id:'inflation', name:'Рост стоимости материалов', text:'Новые закупки в одном направлении стали дороже.', priceDelta:0.20 },
  { id:'ideas', name:'Инициативы жителей', text:'Горожане предложили дополнительные проекты.', handDelta:2 },
  { id:'delays', name:'Задержка согласований', text:'Часть проектов не успела пройти согласование.', handDelta:-1 },
].map(Object.freeze));
const directions = [...new Set(Object.values(MEASURES).map(m=>m.direction))];
const names = Object.keys(DISTRICTS);
const copy = value => JSON.parse(JSON.stringify(value));
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const own = (o,k)=>typeof k==='string' && Object.hasOwn(o,k);

// Independent streams: choices cannot change future random events.
function random(seed) {
  let n=2166136261;
  for(const c of seed) n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
  return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffle(items,rng) {const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

export function generateEvents(seed, quarter) {
  if(!Number.isInteger(quarter)||quarter<2||quarter>8)throw new TypeError('События доступны для кварталов 2–8.');
  const rng=random(`C1:${seed}:events:${quarter}`);
  return shuffle(EVENT_CATALOG,rng).slice(0,2).map(event=>({...event, quarter,
    ...(event.priceDelta!==undefined?{direction:directions[Math.floor(rng()*directions.length)]}:{})}));
}

/** Effects stack additively. Cash is settled as one total, so event order is irrelevant. */
export function resolveEvents(events, budget) {
  const budgetDelta=events.reduce((s,e)=>s+(e.budgetDelta||0),0);
  const handDelta=events.reduce((s,e)=>s+(e.handDelta||0),0);
  const prices=Object.fromEntries(directions.map(d=>[d,clamp(1+events.filter(e=>e.direction===d).reduce((s,e)=>s+(e.priceDelta||0),0),0.5,1.5)]));
  return {budget:Math.max(0,budget+budgetDelta),requestedBudgetDelta:budgetDelta,
    actualBudgetDelta:Math.max(0,budget+budgetDelta)-budget,handDelta,
    handSize:clamp(CHALLENGE_RULES.handSize+handDelta,1,10),prices};
}

function placementErrors(projects, decision) {
  const errors=[];
  if(!decision||!own(MEASURES,decision.id))return ['Неизвестное мероприятие.'];
  const m=MEASURES[decision.id];
  if(m.district&&!own(DISTRICTS,decision.district))errors.push('Выберите район.');
  if(!m.district&&decision.district!==undefined)errors.push('Для городской меры район не указывается.');
  if(projects.some(p=>p.id===decision.id&&(!m.district||p.district===decision.district)))errors.push('Этот проект уже реализуется на выбранной территории.');
  if((decision.id==='M1'&&projects.some(p=>p.id==='M3'))||(decision.id==='M3'&&projects.some(p=>p.id==='M1')))errors.push('Автобусные полосы и ЛРТ несовместимы во всех районах.');
  for(const pair of [['M4','M7'],['M5','M13']]) if(pair.includes(decision.id)&&projects.some(p=>p.id===pair.find(id=>id!==decision.id)&&p.district===decision.district))errors.push('Несовместимые проекты в одном районе.');
  return errors;
}

/** Shared original weights; delayed projects contribute only from their own launch quarter. */
export function calculateChallenge(projects, throughQuarter=8) {
  if(!Array.isArray(projects)||!Number.isInteger(throughQuarter)||throughQuarter<0||throughQuarter>8)throw new TypeError('Некорректный горизонт расчёта.');
  const checked=[];
  for(const p of projects){const errors=placementErrors(checked,p);if(!Number.isInteger(p?.quarter)||p.quarter<1||p.quarter>8)errors.push('Некорректный квартал проекта.');if(errors.length)throw new TypeError(errors.join(' '));checked.push(p);}
  const indicators=Object.fromEntries(names.map(name=>[name,Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,DISTRICTS[name][k]]))]));
  const fraction=p=>Math.max(0,throughQuarter-(p.quarter-1)-MEASURES[p.id].lag)/8;
  const contributions=[];
  const ordered=[...projects].sort((a,b)=>a.id.localeCompare(b.id)||(a.district||'').localeCompare(b.district||''));
  for(const p of ordered){const m=MEASURES[p.id],factor=fraction(p),targets=m.district?[p.district]:names;
    const effects=Object.fromEntries(Object.entries(m.effects).map(([k,v])=>[k,v*factor]));
    for(const name of targets)for(const [k,v]of Object.entries(effects))indicators[name][k]+=v;
    contributions.push({...p,fraction:factor,effects,districts:targets});
  }
  const synergies=[];
  for(const synergy of SYNERGIES)for(const first of ordered.filter(p=>p.id===synergy.measures[0]&&fraction(p)>0)){
    const second=ordered.find(p=>p.id===synergy.measures[1]&&fraction(p)>0&&(!MEASURES[p.id].district||p.district===first.district));
    if(second){indicators[first.district][synergy.indicator]+=synergy.amount;synergies.push({...synergy,district:first.district});}
  }
  const districts={};let weightedAverage=0,criticalCount=0;
  for(const name of names){const values=Object.fromEntries(Object.entries(indicators[name]).map(([k,v])=>[k,clamp(v,0,100)]));const score=Object.entries(WEIGHTS).reduce((s,[k,w])=>s+values[k]*w,0);const criticalIndicators=Object.keys(WEIGHTS).filter(k=>values[k]<40);criticalCount+=criticalIndicators.length;weightedAverage+=score*DISTRICTS[name].population;districts[name]={indicators:values,score,criticalIndicators,deltas:Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,values[k]-DISTRICTS[name][k]]))};}
  const minimumDistrictScore=Math.min(...Object.values(districts).map(d=>d.score));
  const score=.7*weightedAverage+.3*minimumDistrictScore-criticalCount;
  return {score,baselineScore:BASELINE_SCORE,scoreChangeFromBaseline:score-BASELINE_SCORE,districts,weightedAverage,minimumDistrictScore,criticalCount,synergies,contributions,throughQuarter};
}

export function createChallenge({seed='ASTANA'}={}) {
  if(typeof seed!=='string'||!seed.trim()||seed.length>80)throw new TypeError('Код испытания: от 1 до 80 символов.');
  seed=seed.trim();
  let quarter=1,budget=40,projects=[],events=[],finished=false,history=[];
  let conditions=resolveEvents([],budget),hand=[];
  const listeners=new Set();
  const price=id=>Math.max(1,Math.round(MEASURES[id].cost*conditions.prices[MEASURES[id].direction]));
  function draw(){const available=Object.keys(MEASURES).filter(id=>MEASURES[id].district?names.some(d=>placementErrors(projects,{id,district:d}).length===0):placementErrors(projects,{id}).length===0);hand=shuffle(available,random(`C1:${seed}:hand:${quarter}`)).slice(0,conditions.handSize);}
  function previewPlay(decision){const errors=placementErrors(projects,decision);if(finished)errors.push('Игра завершена.');if(!hand.includes(decision?.id))errors.push('Этой карты нет в руке.');const cost=own(MEASURES,decision?.id)?price(decision.id):null;if(cost!==null&&cost>budget)errors.push('Недостаточно бюджета.');if(errors.length)return {allowed:false,errors,cost};const p={id:decision.id,...(MEASURES[decision.id].district?{district:decision.district}:{}),quarter,cost};const forecast=calculateChallenge([...projects,p]);return {allowed:true,errors:[],cost,remainingBudget:budget-cost,project:p,forecast,scoreDelta:forecast.score-calculateChallenge(projects).score,warning:quarter-1+MEASURES[p.id].lag>=8?'Проект не успеет дать эффект до конца срока.':null};}
  function getState(){return copy({mode:'challenge',version:'C1',seed,quarter,budget,finished,projects,events,history,conditions,
    hand:hand.map(id=>({id,...MEASURES[id],currentCost:price(id)})),
    current:calculateChallenge(projects,finished?8:quarter-1),forecast:calculateChallenge(projects),
    canEndTurn:!finished,remainingQuarters:finished?0:9-quarter});}
  function emit(){const state=getState();for(const listener of listeners){try{listener(copy(state));}catch(error){console.error(error);}}return state;}
  draw();
  return Object.freeze({getState,previewPlay,
    play(decision){const p=previewPlay(decision);if(!p.allowed)return {ok:false,errors:p.errors,state:getState()};projects.push(p.project);budget-=p.cost;hand=hand.filter(id=>id!==decision.id);return {ok:true,state:emit()};},
    endTurn(){if(finished)return {ok:false,errors:['Игра завершена.'],state:getState()};const completedQuarter=quarter;
      history.push({quarter,budget,projects:copy(projects.filter(p=>p.quarter===quarter)),score:calculateChallenge(projects,quarter).score});
      if(quarter===8){finished=true;events=[];hand=[];return {ok:true,transition:{completedQuarter,events:[],income:0},state:emit()};}
      quarter++;events=generateEvents(seed,quarter);conditions=resolveEvents(events,budget);budget=conditions.budget+15;draw();
      const transition={completedQuarter,nextQuarter:quarter,events:copy(events),income:15,budgetDelta:conditions.actualBudgetDelta,handSize:hand.length};
      history[history.length-1].transition=copy(transition);
      return {ok:true,transition,state:emit()};},
    subscribe(listener){if(typeof listener!=='function')throw new TypeError('Нужна функция подписки.');listeners.add(listener);listener(getState());return ()=>listeners.delete(listener);}
  });
}
