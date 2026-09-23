import { MEASURES, DISTRICTS, WEIGHTS } from '../score.js';

import { compareCodes } from '../comparison.js';
const directions=[['T','Транспорт','#5984ed'],['E','Экология','#36a880'],['S','Соцсфера','#ab77d5'],['B','Безопасность','#eaaa43'],['C','Сервисы','#e87591']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const signed=n=>`${n>0?'+':''}${fmt(n)}`;
const art={'Транспорт':'transport','Экология':'ecology','Соцсфера':'social','Безопасность':'safety','Сервисы':'services'};
const names={T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Качество воздуха',S1:'Школы и детсады',S2:'Поликлиники',B1:'Безопасность улиц',B2:'Безопасность движения',C1:'Надёжность ЖКХ',C2:'Обращения жителей'};
const picture=direction=>`ruiling-city/images/card-${art[direction]}.png`;
function overview(report){
 const r=report.current;
 return `<article class="result-slide hero-slide"><div class="hero-copy"><p class="slide-kicker">Ваш итог · 8 кварталов</p><h2>Пять решений.<br>Новая Астана.</h2><div class="hero-number">${fmt(r.score)}<small>балла</small></div><span class="delta-chip">${signed(r.scoreChangeFromBaseline)} к исходному</span><div class="budget-graphic"><div class="budget-ring" style="--spent:${r.cost}%"><b>${r.cost}<small>из 100</small></b></div><p>Распределённый бюджет<br><strong>${100-r.cost} ед. в резерве</strong></p></div><small>Прогноз на синтетических данных</small></div><img class="hero-image" src="ruiling-city/images/esil.png" alt="Иллюстрация района Есиль"></article>`;
}
function decisionsPage(report){
 return `<article class="result-slide"><p class="slide-kicker">Ваш план действий</p><h2>Во что вы вложились</h2><div class="decision-gallery">${report.decisions.map((d,i)=>`<div class="decision-tile"><img src="${picture(MEASURES[d.id].direction)}" alt=""><div><small>0${i+1} · ${esc(d.district||'Весь город')}</small><h3>${esc(MEASURES[d.id].name)}</h3><span>${MEASURES[d.id].cost} ед. · ${MEASURES[d.id].lag} кв. до эффекта</span></div></div>`).join('')}</div></article>`;
}
function advicePage(report,r,index){
 if(!r)return `<article class="result-slide"><p class="slide-kicker">Возможности улучшения</p><h2>Одиночная замена не повысит балл</h2><p>Проверено ${report.evaluated} допустимых вариантов. Другой набор из нескольких мер может дать более высокий результат.</p><img class="advice-art" src="ruiling-city/images/card-services.png" alt="Городские сервисы"></article>`;
 const c=r.components;
 return `<article class="result-slide"><p class="slide-kicker">Вариант замены ${index+1} · применить отдельно</p><h2>Ещё ${fmt(r.gain)} балла</h2><div class="swap-visual"><div><img src="${picture(MEASURES[r.removed.id].direction)}" alt=""><small>Убрать</small><h3>${esc(r.removeLabel)}</h3></div><span aria-hidden="true">→</span><div><img src="${picture(MEASURES[r.added.id].direction)}" alt=""><small>Добавить</small><h3>${esc(r.addLabel)}</h3></div></div><div class="swap-numbers"><b>${fmt(r.score)}<small>новый балл</small></b><b>${r.cost}/100<small>бюджет</small></b></div><p class="formula-note">Вклад среднего: ${signed(c.average)} · минимума: ${signed(c.minimum)} · штрафа: ${signed(c.penalty)}</p><small>Одна замена в исходном наборе. Приросты вариантов не складываются.</small></article>`;
}
function districtPage(report){
 return `<article class="result-slide"><p class="slide-kicker">Территории</p><h2>Эффект по районам</h2><div class="district-chart">${Object.entries(report.current.districts).map(([name,d])=>`<div class="district-bar"><span>${esc(name)}</span><div><i style="width:${report.baseline.districts[name].score}%"></i><b style="width:${d.score}%"></b></div><strong>${fmt(d.score)} <small>(${signed(d.score-report.baseline.districts[name].score)})</small></strong></div>`).join('')}</div><p>Серый — исходный балл. Зелёный — результат через два года.</p><div class="formula-note">0,7 × ${fmt(report.current.weightedAverage)} + 0,3 × ${fmt(report.current.minimumDistrictScore)} − ${report.current.criticalCount}<br>Среднее по населению + минимум района − число показателей ниже 40.</div></article>`;
}
export function mountResults(){
 const $=s=>document.querySelector(s);
 let report,page=0,start=null,deckPage=0;
 // Поле ответа существует до первого открытия итогов.
 $('#result-pages').innerHTML='<p id="ai-result" role="status"></p>';
 function go(index){
  const slides=[...$('#result-pages').children];page=Math.max(0,Math.min(index,slides.length-1));
  slides.forEach((s,i)=>{s.hidden=i!==page;s.setAttribute('aria-label',`Слайд ${i+1} из ${slides.length}`);});
  $('#result-prev').disabled=page===0;$('#result-next').disabled=page===slides.length-1;
  $('#result-page-number').textContent=`${page+1} / ${slides.length}`;
  $('#result-dots').innerHTML=slides.map((s,i)=>`<button data-page="${i}" aria-label="Слайд ${i+1}" aria-current="${i===page?'step':'false'}"></button>`).join('');
 }
 const tabs=['story','variables','comparison','presentation'];
 function tab(name){
  tabs.forEach(id=>{const selected=id===name;$(`#${id}-panel`).hidden=!selected;$(`#tab-${id}`).setAttribute('aria-selected',String(selected));$(`#tab-${id}`).tabIndex=selected?0:-1;});
 }
 function deckGo(index){
  const slides=[...$('#presentation-pages').children];deckPage=Math.max(0,Math.min(index,slides.length-1));
  slides.forEach((slide,i)=>{slide.hidden=i!==deckPage;slide.setAttribute('aria-label',`Слайд ${i+1} из 4`);});
  $('#presentation-prev').disabled=deckPage===0;$('#presentation-next').disabled=deckPage===3;
  $('#presentation-number').textContent=`${deckPage+1} / 4`;
  $('#presentation-dots').innerHTML=slides.map((_,i)=>`<button data-deck="${i}" aria-label="Слайд презентации ${i+1}" aria-current="${i===deckPage?'step':'false'}"></button>`).join('');
 }
 function compare(){
  if(!report)return;
  try {
   const {current,others}=compareCodes(report.code,$('#other-codes').value);
   if(!others.length){$('#comparison-results').innerHTML='<p class="comparison-empty">Добавьте код, чтобы увидеть сравнение.</p>';return;}
   const max=Math.max(1,Math.abs(current.score),...others.map(o=>Math.abs(o.result.score)));
   const bar=(title,value,color)=>`<div class="compare-bar"><span>${title}</span><div><i style="width:${Math.abs(value)/max*100}%;background:${color}"></i></div><b>${fmt(value)}</b></div>`;
   $('#comparison-results').innerHTML=bar('Ваш сценарий',current.score,'#5984ed')+others.map((o,i)=>`<article class="comparison-card">${bar(`Участник ${i+1}`,o.result.score,'#ab77d5')}<p class="comparison-verdict">${Math.abs(o.difference)<1e-9?'Одинаковый итоговый балл':`Участник ${i+1}: на ${fmt(Math.abs(o.difference))} балла ${o.difference>0?'выше':'ниже'} вашего`}</p><div class="comparison-facts"><span>Бюджет: <b>${o.result.cost}</b> / ваш ${current.cost}</span><span>Критических показателей: <b>${o.result.criticalCount}</b> / у вас ${current.criticalCount}</span></div><div class="comparison-districts">${Object.entries(o.result.districts).map(([name,d])=>`<span>${esc(name)}<strong class="${d.score<current.districts[name].score?'loss':'gain'}">${signed(d.score-current.districts[name].score)}</strong></span>`).join('')}</div><small>Разница по районам: чужой балл минус ваш. Длина полосы показывает модуль балла.</small><details><summary>Код участника ${i+1}</summary><code>${esc(o.code)}</code></details></article>`).join('');
  } catch(error){$('#comparison-results').textContent=error.message;}
 }
 function variables(){
  if(!report)return;
  const region=$('#result-region').value,group=$('#result-metric-group').value;
  const values=result=>region==='city'?Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,Object.values(result.districts).reduce((sum,d)=>sum+d.indicators[k]*d.populationShare,0)])):result.districts[region].indicators;
  const before=values(report.baseline),after=values(report.current);
  const rows=group==='all'?directions.map(([prefix,name,color])=>{const keys=Object.keys(WEIGHTS).filter(k=>k.startsWith(prefix));const average=v=>keys.reduce((s,k)=>s+v[k]*WEIGHTS[k],0)/keys.reduce((s,k)=>s+WEIGHTS[k],0);return {name,color,before:average(before),after:average(after)};}):Object.keys(WEIGHTS).filter(k=>k.startsWith(group)).map(k=>({name:`${k} · ${names[k]}`,color:directions.find(d=>d[0]===group)[2],before:before[k],after:after[k]}));
  $('#variable-chart').innerHTML=`<p class="chart-explainer">${region==='city'?'Весь город: среднее с учётом населения.':'Район '+esc(region)+'.'} ${group==='all'?'Сводные оценки направлений с весами показателей.':'Значения показателей от 0 до 100.'}</p><div class="colour-metrics ${group==='all'?'overview-metrics':'detail-metrics'}">${rows.map(r=>`<article class="colour-metric" style="--metric:${r.color}"><div class="metric-heading"><strong>${r.name}</strong><span class="metric-change">${signed(r.after-r.before)}</span></div><div class="metric-values"><b>${fmt(r.after)}</b><small>было ${fmt(r.before)}</small></div><div class="colour-track" role="img" aria-label="${r.name}: было ${fmt(r.before)}, стало ${fmt(r.after)}"><i style="width:${r.after}%"></i><span style="left:${r.before}%" title="Исходное значение"></span>${group!=='all'?'<em style="left:40%"></em>':''}</div><div class="metric-scale"><span>0</span><span>${group==='all'?'сводная оценка':'порог 40'}</span><span>100</span></div>${group!=='all'&&region!=='city'&&r.after<40?'<small class="loss">Ниже критического порога</small>':''}</article>`).join('')}</div><p class="chart-legend">Цветная полоса — результат; тёмная отметка — исходное значение. Знак показывает изменение. Штраф рассчитывается по отдельным показателям районов.</p>`;
 }
 $('#result-prev').onclick=()=>go(page-1);$('#result-next').onclick=()=>go(page+1);
 $('#result-dots').onclick=e=>{const button=e.target.closest('[data-page]');if(button)go(Number(button.dataset.page));};
 $('#result-pages').onkeydown=e=>{if(e.target.matches('input,textarea,select'))return;if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?99:page+(e.key==='ArrowRight'?1:-1));}};
 $('#result-pages').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')start={x:e.clientX,y:e.clientY};});
 $('#result-pages').addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)go(page+(dx<0?1:-1));});
 $('#result-pages').addEventListener('pointercancel',()=>{start=null;});
 tabs.forEach(name=>$(`#tab-${name}`).onclick=()=>tab(name));
 document.querySelector('.result-tabs').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const current=tabs.findIndex(name=>$(`#tab-${name}`).getAttribute('aria-selected')==='true');const name=tabs[(current+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];tab(name);$(`#tab-${name}`).focus();}};
 $('#presentation-prev').onclick=()=>deckGo(deckPage-1);$('#presentation-next').onclick=()=>deckGo(deckPage+1);
 $('#presentation-dots').onclick=e=>{const b=e.target.closest('[data-deck]');if(b)deckGo(Number(b.dataset.deck));};
 $('#presentation-pages').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();deckGo(deckPage+(e.key==='ArrowRight'?1:-1));}};
 let deckStart=null;
 $('#presentation-pages').onpointerdown=e=>{if(e.pointerType==='touch')deckStart={x:e.clientX,y:e.clientY};};
 $('#presentation-pages').onpointerup=e=>{if(!deckStart)return;const dx=e.clientX-deckStart.x,dy=e.clientY-deckStart.y;deckStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)deckGo(deckPage+(dx<0?1:-1));};
 $('#presentation-pages').onpointercancel=()=>{deckStart=null;};
 $('#compare-results').onclick=compare;$('#other-codes').addEventListener('input',compare);
 $('#result-region').onchange=variables;$('#result-metric-group').onchange=variables;
 $('#download-presentation').onclick=async()=>{
  if(!report)return;
  const snapshot=report;$('#download-presentation').disabled=true;$('#export-status').textContent='Подготовка слайдов…';
  try{
   const container=document.createElement('div');
   container.innerHTML=overview(snapshot)+decisionsPage(snapshot)+districtPage(snapshot)+advicePage(snapshot,snapshot.recommendations[0],0);
   // Встраиваем локальные иллюстрации, чтобы файл открывался без сервера и интернета.
   const urls=[...new Set([...container.querySelectorAll('img')].map(img=>img.getAttribute('src')))];
   const assets=new Map(await Promise.all(urls.map(async path=>{const response=await fetch(path);if(!response.ok)throw new Error('Не удалось загрузить иллюстрацию');const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});return [path,data];})));
   container.querySelectorAll('img').forEach(img=>img.src=assets.get(img.getAttribute('src')));
   const response=await fetch('assets/results.css');if(!response.ok)throw new Error('Не удалось загрузить оформление');
   const css=await response.text();
   const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сценарий Астаны</title><style>${css}</style><body class="export-deck"><main>${container.innerHTML}</main><nav class="export-nav"><button id="prev">← Назад</button><span id="page"></span><button id="next">Далее →</button><button onclick="print()">Печать / PDF</button></nav><script>let i=0;const slides=[...document.querySelectorAll('.result-slide')];function show(n){i=Math.max(0,Math.min(n,slides.length-1));slides.forEach((s,j)=>s.hidden=i!==j);document.getElementById('page').textContent=(i+1)+' / '+slides.length;document.getElementById('prev').disabled=i===0;document.getElementById('next').disabled=i===slides.length-1}document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);document.onkeydown=e=>{if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1)};show(0);</script></body></html>`;
   const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Сценарий Астаны — слайды.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#export-status').textContent='HTML-презентация сохранена. Её можно распечатать в PDF.';
  }catch(error){$('#export-status').textContent=error.message||'Не удалось сохранить презентацию.';}
  finally{$('#download-presentation').disabled=false;}
 };
 return {show(next){report=next;$('#result-pages').innerHTML=overview(report)+decisionsPage(report)+`<article class="result-slide ai-slide"><p class="slide-kicker">Разбор решений</p><h2>Что означает ваш выбор</h2><p id="ai-result" role="status" aria-live="polite"></p></article>`+(report.recommendations.length?report.recommendations.map((r,i)=>advicePage(report,r,i)).join(''):advicePage(report,null,0));$('#result-region').innerHTML='<option value="city">Весь город</option>'+Object.keys(DISTRICTS).map(d=>`<option>${esc(d)}</option>`).join('');$('#result-metric-group').value='all';$('#presentation-pages').innerHTML=overview(report)+decisionsPage(report)+districtPage(report)+advicePage(report,report.recommendations[0],0);deckGo(0);compare();$('#export-status').textContent='';go(0);tab('story');variables();}};
}
