import { createScenario, MEASURES, DISTRICTS, WEIGHTS, HORIZON_QUARTERS, BASELINE_SCORE } from '../score.js';
const $ = s => document.querySelector(s);
const game = createScenario();
let category = 'Транспорт', district = null, candidateId = null;
const groups = [['Транспорт','↔','Транспорт',['T1','T2']],['Экология','♧','Озеленение',['E1','E2']],['Соцсфера','⌂','Соцсфера',['S1','S2']],['Безопасность','⛨','Безопасность',['B1','B2']],['Сервисы','⚙','Городской сервис',['C1','C2']]];
const icons = {M1:'↔',M2:'◉',M3:'▰',M4:'♧',M5:'♨',M6:'♧',M7:'⌂',M8:'✚',M9:'⚑',M10:'◈',M11:'▤',M12:'▣',M13:'⚒',M14:'⚙'};
const labels = {T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Качество воздуха',S1:'Школы и детсады',S2:'Поликлиники',B1:'Безопасность улиц',B2:'Безопасность движения',C1:'Надёжность ЖКХ',C2:'Обращения жителей'};
const regions = [
 ['Сарыарка','M90 95L245 65L310 155L252 215L75 200Z',180,140,'#d8dfba'],
 ['Байконур','M245 65L430 60L482 166L310 155Z',365,111,'#d4dec9'],
 ['Алматы','M482 166L620 135L648 286L445 283L360 232L310 155Z',512,212,'#c2d4b0'],
 ['Есиль','M252 215L310 155L360 232L445 283L431 394L258 375L208 290Z',332,303,'#e2dcbf'],
 ['Нура','M75 200L252 215L208 290L258 375L95 351L49 278Z',146,279,'#d4d7c4']
];
const fmt = n => n.toLocaleString('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:2});
const sign = n => `${n>=0?'+':''}${fmt(n)}`;
const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function decision(){return candidateId ? (MEASURES[candidateId].district ? (district ? {id:candidateId,district} : null) : {id:candidateId}) : null;}
function indicators(result){return district ? result.districts[district].indicators : Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,Object.values(result.districts).reduce((sum,d)=>sum+d.indicators[k]*d.populationShare,0)]));}
function render(){
 const state=game.getState(), current=state.result, candidate=decision();
 const prediction=candidate?game.previewAdd(candidate):null;
 const forecast=prediction?.allowed?prediction.result:current;
 $('#categories').innerHTML=groups.map(([key,icon,name])=>`<button class="category ${key===category?'active':''}" data-category="${key}" aria-pressed="${key===category}"><span class="symbol">${icon}</span>${name}<small>${Object.values(MEASURES).filter(m=>m.direction===key).length}</small></button>`).join('');
 $('#budget').textContent=current.remainingBudget;$('#budget-bar').style.width=`${current.remainingBudget}%`;
 $('#budget-note').textContent=prediction?.allowed?`После решения: ${forecast.remainingBudget} ед.`:`Потрачено ${current.cost} из 100 ед.`;
 $('#score').textContent=fmt(forecast.score);$('#score-delta').textContent=forecast.score!==current.score?sign(forecast.score-current.score):'';
 $('#score-caption').textContent=prediction?.allowed?'Прогноз с выбранной картой':'Текущий прогноз на 2 года';
 $('#stats-title').textContent=district||'Весь город';$('#preview-badge').hidden=!prediction?.allowed;
 const before=indicators(current),after=indicators(forecast);
 $('#stats').innerHTML=groups.map(([,icon,name,keys])=>{const val=keys.reduce((s,k)=>s+after[k]*WEIGHTS[k],0)/keys.reduce((s,k)=>s+WEIGHTS[k],0);const old=keys.reduce((s,k)=>s+before[k]*WEIGHTS[k],0)/keys.reduce((s,k)=>s+WEIGHTS[k],0);return `<div class="stat"><div class="stat-label"><span>${icon} ${name}</span><b>${fmt(val)}${Math.abs(val-old)>.001?`<em class="${val<old?'negative':''}">${sign(val-old)}</em>`:''}</b></div><div class="stat-track"><i style="width:${val}%"></i><i class="current" style="width:${Math.min(old,val)}%"></i></div></div>`}).join('');
 $('#district-shapes').innerHTML=regions.map(([name,path,x,y,color])=>`<g class="district ${district===name?'active':''}" data-district="${name}" role="button" tabindex="0" aria-label="Район ${name}" aria-pressed="${district===name}"><path d="${path}" fill="${color}"/><text x="${x}" y="${y}" text-anchor="middle">${name}</text><text class="map-score" x="${x}" y="${y+20}" text-anchor="middle">${fmt(forecast.districts[name].score)} / 100</text></g>`).join('');
 const markers=regions.flatMap(([name,,x,y])=>state.decisions.filter(d=>!MEASURES[d.id].district||d.district===name).map((d,i)=>`<text class="map-marker" x="${x-35+i*19}" y="${y+47}">${icons[d.id]}</text>`));
 $('#map-markers').innerHTML=markers.join('');$('#map-help').textContent=district?`${district} · ${Math.round(DISTRICTS[district].population*100)}% населения города`:'Нажмите на район, чтобы изучить показатели';
 $('#category-title').textContent=groups.find(g=>g[0]===category)[2];
 $('#cards').innerHTML=Object.entries(MEASURES).filter(([,m])=>m.direction===category).map(([id,m])=>{const played=state.decisions.some(d=>d.id===id);return `<button class="card ${id===candidateId?'chosen':''} ${played?'played':''}" data-card="${id}" aria-pressed="${id===candidateId}"><div class="art"><span class="art-icon">${icons[id]}</span><small>ЭСКИЗ ИНИЦИАТИВЫ</small><img src="assets/cards/${id}.webp" alt="" hidden><span class="cost">${m.cost}</span></div><div class="card-body"><span class="card-id">${id} / ${played?'ВЫБРАНО':m.district?'РАЙОН':'ВЕСЬ ГОРОД'}</span><h3>${escape(m.name)}</h3><div class="effects">${Object.entries(m.effects).map(([k,v])=>`<span class="effect ${v<0?'negative':''}" title="${labels[k]}">${k} ${sign(v*(HORIZON_QUARTERS-m.lag)/HORIZON_QUARTERS)}</span>`).join('')}</div></div><div class="card-foot"><span>Эффект за 2 года</span><span>Лаг ${m.lag} кв.</span></div></button>`}).join('');
 document.querySelectorAll('.art img').forEach(img=>{img.onload=()=>{img.hidden=false};img.onerror=()=>img.remove();if(img.complete&&img.naturalWidth)img.hidden=false;});
 $('#candidate').hidden=!candidateId;
 if(candidateId){const m=MEASURES[candidateId];const already=state.decisions.some(d=>d.id===candidateId);const hints=candidate?state.options.find(o=>o.decision.id===candidate.id&&o.decision.district===candidate.district)?.synergyHints||[]:[];
 $('#candidate').innerHTML=`<h3>${escape(m.name)}</h3>${m.district?`<label for="district-select">Район реализации</label><select id="district-select"><option value="">Выберите район на карте или здесь</option>${Object.keys(DISTRICTS).map(d=>`<option ${d===district?'selected':''}>${d}</option>`).join('')}</select>`:'<p>Эффект во всех пяти районах</p>'}<p>Стоимость: <strong>${m.cost} ед.</strong> · Задержка ${m.lag} кв.</p>${hints.map(h=>`<p class="hint">${escape(h.text)}</p>`).join('')}<button id="play" class="primary" ${!prediction?.allowed||already?'disabled':''}>${already?'Уже в вашем сценарии':'Реализовать инициативу →'}</button>`;
 $('#notice').textContent=already?'Чтобы изменить район, сначала отмените это решение.':prediction&&!prediction.allowed?prediction.errors.join(' '):m.district&&!district?'Выберите район для предпросмотра.':'';
 }else $('#notice').textContent='';
 $('#count').textContent=`${state.decisions.length} / 5`;
 $('#selected').innerHTML=Array.from({length:5},(_,i)=>{const d=state.decisions[i];return d?`<div class="slot"><span class="number">0${i+1}</span><div><strong>${escape(MEASURES[d.id].name)}</strong><small>${d.district||'Весь город'} · ${MEASURES[d.id].cost} ед.</small></div><button data-remove="${d.id}" aria-label="Отменить ${escape(MEASURES[d.id].name)}">×</button></div>`:`<div class="slot empty"><span class="number">0${i+1}</span>Место для следующего решения</div>`}).join('');
 $('#finish').disabled=!state.canFinalize;
}
document.addEventListener('click',event=>{
 const e=event.target.closest('button,[data-district]');if(!e)return;
 if(e.dataset.category){category=e.dataset.category;candidateId=null;render();}
 if(e.dataset.card){candidateId=candidateId===e.dataset.card?null:e.dataset.card;render();}
 if(e.dataset.district){district=e.dataset.district;render();}
 if(e.dataset.remove){candidateId=null;game.remove(e.dataset.remove);render();}
 if(e.id==='city'){district=null;render();}
 if(e.id==='play'){const d=decision();if(d){const result=game.add(d);if(result.ok)candidateId=null;render();}}
 if(e.id==='reset'){if(!game.getState().decisions.length||confirm('Сбросить все выбранные решения?')){candidateId=null;district=null;game.reset();render();}}
 if(e.id==='finish'){const r=game.finalize();if(!r.valid)return;$('#result-content').innerHTML=`<div class="final-score">${fmt(r.score)}</div><div class="summary-badges"><span>${sign(r.score-BASELINE_SCORE)} к исходному</span><span>${r.cost} / 100 бюджета</span></div>${Object.entries(r.districts).map(([name,d])=>`<div class="result-row"><span>${name}</span><strong>${fmt(d.score)}</strong></div>`).join('')}<p style="margin-top:18px">Критических показателей: <strong>${r.criticalCount}</strong> · Синергий: <strong>${r.synergies.length}</strong></p>`;$('#results').showModal();}
 if(e.id==='close-results'||e.id==='continue')$('#results').close();
});
document.addEventListener('change',e=>{if(e.target.id==='district-select'){district=e.target.value||null;render();}});
$('#map').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.district){e.preventDefault();district=e.target.dataset.district;render();}});
render();
