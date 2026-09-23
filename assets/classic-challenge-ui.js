import { restoreChallenge, saveProgress } from './interface-switch.js';
import { createChallenge } from '../challenge.js';
import { MEASURES, DISTRICTS, WEIGHTS, BASELINE_SCORE } from '../score.js';

const $ = selector => document.querySelector(selector);
const fmt = value => value.toLocaleString('ru-RU', { minimumFractionDigits:2, maximumFractionDigits:2 });
const sign = value => `${value >= 0 ? '+' : ''}${fmt(value)}`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game = restoreChallenge(createChallenge), category = 'all', district = null, candidateId = null, view = 'forecast';
const groups = [['Транспорт','↔','Транспорт',['T1','T2']],['Экология','♧','Озеленение',['E1','E2']],['Соцсфера','⌂','Соцсфера',['S1','S2']],['Безопасность','⛨','Безопасность',['B1','B2']],['Сервисы','⚙','Городской сервис',['C1','C2']]];
const art = {'Транспорт':'transport','Экология':'ecology','Соцсфера':'social','Безопасность':'safety','Сервисы':'services'};
const icons = {M1:'↔',M2:'◉',M3:'▰',M4:'♧',M5:'♨',M6:'♧',M7:'⌂',M8:'✚',M9:'⚑',M10:'◈',M11:'▤',M12:'▣',M13:'⚒',M14:'⚙'};
const labels = {T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Качество воздуха',S1:'Школы и детсады',S2:'Поликлиники',B1:'Безопасность улиц',B2:'Безопасность движения',C1:'Надёжность ЖКХ',C2:'Обращения жителей'};
const regions = [
 ['Сарыарка','M90 95L245 65L310 155L252 215L75 200Z',180,140,'#d8dfba'],
 ['Байконур','M245 65L430 60L482 166L310 155Z',365,111,'#d4dec9'],
 ['Алматы','M482 166L620 135L648 286L445 283L360 232L310 155Z',512,212,'#c2d4b0'],
 ['Есиль','M252 215L310 155L360 232L445 283L431 394L258 375L208 290Z',332,303,'#e2dcbf'],
 ['Нура','M75 200L252 215L208 290L258 375L95 351L49 278Z',146,279,'#d4d7c4']
];
const eventIcons = {donations:'↗',emergency:'⚒',discount:'%',inflation:'↗',ideas:'✦',delays:'◷'};
const bad = event => (event.budgetDelta || event.handDelta || event.priceDelta * -1) < 0;
function eventEffect(event) {
 if (event.budgetDelta) return `${event.budgetDelta > 0 ? '+' : ''}${event.budgetDelta} ед. бюджета`;
 if (event.handDelta) return `${event.handDelta > 0 ? '+' : ''}${event.handDelta} к размеру руки`;
 return `${event.direction}: ${event.priceDelta > 0 ? '+' : ''}${Math.round(event.priceDelta * 100)}% к цене`;
}
function decision() {
 if (!candidateId) return null;
 return MEASURES[candidateId].district ? (district ? {id:candidateId,district} : null) : {id:candidateId};
}
function indicators(result) {
 return district ? result.districts[district].indicators : Object.fromEntries(Object.keys(WEIGHTS).map(k => [k,Object.entries(result.districts).reduce((sum,[name,d]) => sum+d.indicators[k]*DISTRICTS[name].population,0)]));
}
function render() {
 saveProgress('challenge',game.getState());
 const state=game.getState(), proposed=decision(), preview=proposed?game.previewPlay(proposed):null;
 const forecast=preview?.allowed?preview.forecast:state.forecast;
 const shown=view==='current'?state.current:forecast;
 $('#quarter-title').textContent=state.finished?'Восемь кварталов позади':`Год ${Math.ceil(state.quarter/4)} · квартал ${(state.quarter-1)%4+1}`;
 $('#quarter-dots').innerHTML=Array.from({length:8},(_,i)=>`<span class="quarter-dot ${i+1<state.quarter||state.finished?'done':i+1===state.quarter?'now':''}" aria-label="Квартал ${i+1}">${i+1}</span>`).join('');
 $('#categories').innerHTML=[['all','▦','Все карты'],...groups].map(([key,icon,name])=>`<button class="category ${key===category?'active':''}" data-category="${key}" aria-pressed="${key===category}"><span class="symbol">${icon}</span>${name}<small>${state.hand.filter(m=>key==='all'||m.direction===key).length}</small></button>`).join('');
 $('#budget').textContent=state.budget;
 $('#budget-note').textContent=preview?.allowed?`После покупки: ${preview.remainingBudget} ед.`:`Потрачено за игру: ${state.projects.reduce((s,p)=>s+p.cost,0)} ед.`;
 $('.income-note').textContent=state.finished?'Оставшийся бюджет':state.quarter===8?'Последний квартал · нового дохода не будет':'+15 ед. в начале следующего квартала';
 $('#score').textContent=fmt(forecast.score);
 $('#score-delta').textContent=preview?.allowed?sign(preview.scoreDelta):'';
 $('#score-caption').textContent=state.finished?'Итоговый результат':preview?.allowed?'Прогноз на конец игры с выбранной картой':'Прогноз на конец 8-го квартала';
 $('#current-score').textContent=fmt(state.current.score);
 $('#current-caption').textContent=state.finished?'после квартала 8':state.quarter===1?'исходное состояние':`после квартала ${state.quarter-1}`;
 $('#stats-title').textContent=district||'Весь город';
 $('#preview-badge').hidden=!(preview?.allowed&&view==='forecast');
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 const before=indicators(view==='current'?state.current:state.forecast),after=indicators(shown);
 $('#stats').innerHTML=groups.map(([,icon,name,keys])=>{const total=keys.reduce((s,k)=>s+WEIGHTS[k],0);const a=keys.reduce((s,k)=>s+after[k]*WEIGHTS[k],0)/total,b=keys.reduce((s,k)=>s+before[k]*WEIGHTS[k],0)/total;return `<div class="stat"><div class="stat-label"><span>${icon} ${name}</span><b>${fmt(a)}${Math.abs(a-b)>.001?`<em class="${a<b?'negative':''}">${sign(a-b)}</em>`:''}</b></div><div class="stat-track"><i style="width:${a}%"></i><i class="current" style="width:${Math.min(a,b)}%"></i></div></div>`;}).join('');
 $('#district-shapes').innerHTML=regions.map(([name,path,x,y,color])=>`<g class="district ${district===name?'active':''}" data-district="${name}" role="button" tabindex="0" aria-label="Район ${name}" aria-pressed="${district===name}"><path d="${path}" fill="${color}"/><text x="${x}" y="${y}" text-anchor="middle">${name}</text><text class="map-score" x="${x}" y="${y+20}" text-anchor="middle">${fmt(shown.districts[name].score)} / 100</text></g>`).join('');
 $('#map-markers').innerHTML=regions.flatMap(([name,,x,y])=>state.projects.filter(p=>!MEASURES[p.id].district||p.district===name).slice(-8).map((p,i)=>`<text class="map-marker ${state.quarter-1<=p.quarter-1+MEASURES[p.id].lag&&!state.finished?'building':''}" x="${x-35+(i%4)*20}" y="${y+43+Math.floor(i/4)*22}">${icons[p.id]}</text>`)).join('');
 $('#map-help').textContent=`${district||'Весь город'} · ${view==='current'?'текущие показатели':'прогноз на конец игры'}`;
 $('#active-events').innerHTML=state.events.length?state.events.map(e=>`<div class="event-chip ${bad(e)?'bad':''}" title="${esc(e.text)}"><span>${eventIcons[e.id]} ${eventEffect(e)}</span><small>${e.budgetDelta?'Учтено':`Квартал ${state.quarter}`}</small></div>`).join(''):`<div class="event-chip">${state.finished?'Срок завершён. Итоговый результат рассчитан.':'Стартовый бюджет 40 · между кварталами два события'}</div>`;
 $('#hand-count').textContent=`В руке: ${state.hand.length}`;
 $('#category-title').textContent=category==='all'?'Карты этого квартала':groups.find(g=>g[0]===category)[2];
 const cards=state.hand.filter(m=>category==='all'||m.direction===category);
 $('#cards').innerHTML=cards.map(m=>{const factor=Math.max(0,8-(state.quarter-1)-m.lag)/8;return `<button class="card ${m.id===candidateId?'chosen':''} ${m.currentCost>state.budget?'unaffordable':''} ${factor===0?'late':''}" data-card="${m.id}" aria-pressed="${m.id===candidateId}"><div class="art"><span class="art-icon">${icons[m.id]}</span><span class="cost">${m.currentCost}</span></div><div class="card-body"><span class="card-id">${m.id} / ${m.district?'РАЙОН':'ВЕСЬ ГОРОД'} ${m.cost!==m.currentCost?`<small class="old-price">${m.cost} ед.</small>`:''}</span><h3>${esc(m.name)}</h3><div class="effects">${Object.entries(m.effects).map(([k,v])=>`<span class="effect ${v<0?'negative':''}" title="${labels[k]}">${k} ${sign(v*factor)}</span>`).join('')}</div></div><div class="card-foot"><span>${factor===0?'Не успеет к финалу':'Эффект к финалу'}</span><span>Лаг ${m.lag} кв.</span></div></button>`;}).join('')||`<div class="empty-hand">${state.finished?'Испытание завершено. Посмотрите итог или начните новую игру.':state.hand.length?'В этой категории нет карт. Выберите «Все карты».':'Карты закончились. Можно завершить квартал.'}</div>`;
 $('#candidate').hidden=!candidateId;
 if(candidateId){const m=MEASURES[candidateId],card=state.hand.find(c=>c.id===candidateId),factor=Math.max(0,8-(state.quarter-1)-m.lag)/8;
 $('#candidate').innerHTML=`<h3>${esc(m.name)}</h3>${m.district?`<label for="district-select">Район реализации</label><select id="district-select"><option value="">Выберите район</option>${Object.keys(DISTRICTS).map(d=>`<option ${district===d?'selected':''}>${d}</option>`).join('')}</select>`:'<p>Эффект во всех пяти районах</p>'}<p>Стоимость: <strong>${card.currentCost} ед.</strong> · Лаг ${m.lag} кв.</p>${Object.entries(m.effects).map(([k,v])=>`<p class="effect-line">${labels[k]} <strong>${sign(v*factor)}</strong></p>`).join('')}<p class="hint">Реализуется ${Math.round(factor*100)}% эффекта к концу игры.</p>${factor===0?'<p class="late-warning">Проект не успеет дать эффект до конца срока.</p>':''}<button id="play" class="primary" ${!preview?.allowed?'disabled':''}>Реализовать инициативу →</button>`;
 $('#notice').textContent=preview&&!preview.allowed?preview.errors.join(' '):m.district&&!district?'Выберите район для предпросмотра.':'';
 } else $('#notice').textContent='';
 $('#count').textContent=state.projects.length;
 $('#selected').innerHTML=[...state.projects].reverse().map(p=>{const start=p.quarter+MEASURES[p.id].lag;return `<div class="slot"><span class="number">К${p.quarter}</span><div><strong>${esc(MEASURES[p.id].name)}</strong><small>${p.district||'Весь город'} · ${p.cost} ед.</small></div><span class="project-stage">${start>8?'За горизонтом':start<state.quarter||state.finished?'Действует':`Эффект с К${start}`}</span></div>`;}).join('')||'<div class="slot empty">Здесь появятся ваши проекты</div>';
 $('#end').textContent=state.finished?'Посмотреть итоги →':state.quarter===8?'Завершить срок →':'Завершить квартал →';
 $('#end-note').textContent=state.finished?'Все восемь кварталов завершены':'Неразыгранные карты уйдут. Покупки окончательны.';
 $('#seed-label').textContent=state.seed;
 $('.hand-note').textContent=state.finished?'Можно начать новое испытание с другим кодом.':'Неразыгранные карты вернутся в колоду. Бюджет сохранится.';
}
function showResults(){const s=game.getState(),r=s.forecast;$('#result-content').innerHTML=`<div class="final-score">${fmt(r.score)}</div><div class="summary-badges"><span>${sign(r.score-BASELINE_SCORE)} к исходному</span><span>${s.projects.length} проектов</span><span>Остаток ${s.budget} ед.</span></div>${Object.entries(r.districts).map(([name,d])=>`<div class="result-row"><span>${name}</span><strong>${fmt(d.score)}</strong></div>`).join('')}<p class="result-context">Испытание ${esc(s.seed)} · 8 кварталов · критических показателей ${r.criticalCount} · синергий ${r.synergies.length}</p>`;$('#results').showModal();}
function newGame(seed){try{const next=createChallenge({seed});game=next;candidateId=null;district=null;category='all';view='forecast';$('#seed').value=seed;$('#seed-error').textContent='';render();$('#tournament-settings').open=false;}catch(error){$('#seed-error').textContent=error.message;}}
document.addEventListener('click',async event=>{
 const button=event.target.closest('button,[data-district]');if(!button)return;
 if(button.dataset.category){category=button.dataset.category;candidateId=null;render();}
 if(button.dataset.card){candidateId=candidateId===button.dataset.card?null:button.dataset.card;view='forecast';render();}
 if(button.dataset.district){district=button.dataset.district;render();}
 if(button.dataset.view){view=button.dataset.view;render();}
 if(button.id==='city'){district=null;render();}
 if(button.id==='play'){const d=decision();if(d){const result=game.play(d);if(result.ok){candidateId=null;render();}else $('#notice').textContent=result.errors.join(' ');}}
 if(button.id==='end'){
   if(game.getState().finished){showResults();return;}
   const before=game.getState().budget,result=game.endTurn();if(!result.ok)return;
   candidateId=null;category='all';render();
   if(result.state.finished){showResults();return;}
   const t=result.transition;$('#event-title').textContent=`Квартал ${result.state.quarter} / 8: новые условия`;
   $('#event-cards').innerHTML=t.events.map(e=>`<article class="event-card ${bad(e)?'bad':''}"><span class="event-symbol">${eventIcons[e.id]}</span><h3>${e.name}</h3><p>${e.text}</p><span class="event-effect">${eventEffect(e)}</span><small>${e.budgetDelta?'Разовое изменение бюджета':'На один квартал'}</small></article>`).join('');
   $('#transition-summary').innerHTML=`<span>Остаток + события + плановое финансирование</span><div class="budget-equation">${before} ${t.budgetDelta>=0?'+':'−'} ${Math.abs(t.budgetDelta)} + ${t.income} = ${result.state.budget} ед.</div><span>Новая рука: <strong>${t.handSize} карт</strong>. Изменения размера руки суммируются.</span>${t.budgetDelta!==result.state.conditions.requestedBudgetDelta?'<p>Списание ограничено доступным остатком: бюджет не может стать отрицательным.</p>':''}`;
   $('#event-dialog').showModal();
 }
 if(button.id==='ack-events')$('#event-dialog').close();
 if(button.id==='continue'||button.id==='close-results')$('#results').close();
 if(button.id==='reset'&&confirm('Начать испытание заново? Текущая игра будет сброшена.'))newGame(game.getState().seed);
 if(button.id==='new-seed'){
   const state=game.getState();
   if((state.quarter===1&&state.projects.length===0)||confirm('Начать турнир заново? Текущая игра будет сброшена.'))newGame($('#seed').value.trim());
 }
 if(button.id==='generate-seed'){
   const bytes=crypto.getRandomValues(new Uint8Array(6));
   $('#seed').value='AST-'+Array.from(bytes,b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
   $('#seed-error').textContent='Новый код подготовлен. Скопируйте его командам и нажмите «Начать турнир».';
 }
 if(button.id==='copy-seed'){
   const seed=$('#seed').value.trim();
   if(!seed){$('#seed-error').textContent='Сначала введите или создайте код.';return;}
   try{await navigator.clipboard.writeText(seed);$('#seed-error').textContent=`Код ${seed} скопирован. Отправьте его другим командам.`;}
   catch{$('#seed').focus();$('#seed').select();$('#seed-error').textContent='Код выделен — нажмите Ctrl+C, чтобы скопировать.';}
 }
});
document.addEventListener('change',event=>{if(event.target.id==='district-select'){district=event.target.value||null;render();}});
$('#map').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.dataset.district){event.preventDefault();district=event.target.dataset.district;render();}});
render();

