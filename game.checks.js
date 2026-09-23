// Проверка настоящего игрового экрана без запросов к OpenAI.
export async function runGameChecks() {
 const results=[];
 const frame=document.createElement('iframe');
 frame.style.cssText='position:absolute;left:-10000px;width:1400px;height:900px';
 try {
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Экран не загрузился')),10000);
   frame.onload=()=>{clearTimeout(timer);resolve();};
   frame.src='./index.html';document.body.append(frame);
  });
  const w=frame.contentWindow,d=w.document,$=s=>d.querySelector(s);
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}};
  const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
  const click=s=>{assert($(s),`Нет элемента ${s}`);if($(s).click)$(s).click();else $(s).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
  const add=(category,id,district)=>{click(`[data-category="${category}"]`);if(district)click(`[data-district="${district}"]`);click(`[data-card="${id}"]`);assert(!$('#play').disabled,`Мера ${id} заблокирована`);click('#play');};
  const calls=[];let resolvePending;
  w.fetch=async(url,options)=>{
   assert(url==='/api/analyze','Неверный путь API');
   calls.push({body:JSON.parse(options.body),signal:options.signal});
   return new Promise(resolve=>{resolvePending=()=>resolve({ok:true,json:async()=>({analysis:'Проверочный анализ <без HTML>'})});});
  };
  await check('Главный экран: несовместимость по району и восстановление после отмены',()=>{
   add('Экология','M4','Нура');click('[data-category="Соцсфера"]');
   assert($('[data-card="M7"]').disabled,'Несовместимая карта доступна');
   click('[data-district="Алматы"]');assert(!$('[data-card="M7"]').disabled,'Другой район заблокирован');
   click('[data-remove="M4"]');click('[data-district="Нура"]');assert(!$('[data-card="M7"]').disabled,'Отмена не восстановила карту');
  });
  await check('Главный экран: пять мер, подсказки и прогноз отмены',()=>{
   add('Соцсфера','M7','Нура');add('Соцсфера','M8','Нура');add('Безопасность','M10','Нура');
   click('[data-category="Сервисы"]');assert($('[data-card="M12"]').title.length>0,'Нет подсказки синергии');
   add('Сервисы','M12');add('Экология','M5','Сарыарка');
   assert($('#score').textContent==='56,54','Неверный итог');assert(!$('#finish').disabled,'Итоги недоступны');
   assert($('[data-remove="M5"]').title.includes('После отмены'),'Нет прогноза отмены');assert(calls.length===0,'Запрос до подтверждения');
  });
  await check('Подтверждение отправляет код и показывает ответ как текст',async()=>{
   click('#finish');assert(calls.length===1,'Нет запроса');assert(calls[0].body.code==='A1:5.2,7.4,8.4,10.4,12','Неверный код');
   assert($('#analyze-again').disabled,'Нет защиты от повторного запроса');resolvePending();await tick();
   assert($('#ai-result').textContent==='Проверочный анализ <без HTML>','Ответ не показан');assert(!$('#ai-result').children.length,'Ответ вставлен как HTML');
  });
  await check('Коды сравнения отправляются и изменение отменяет устаревший ответ',async()=>{
   $('#other-codes').value='A1:5.2,7.4,8.4,10.4,12';$('#other-codes').dispatchEvent(new w.Event('input'));click('#analyze-again');
   assert(calls[1].body.otherCodes.length===1,'Нет кода сравнения');
   $('#other-codes').value='';$('#other-codes').dispatchEvent(new w.Event('input'));
   assert(calls[1].signal.aborted,'Запрос не отменён');resolvePending();await tick();assert(!$('#ai-result').textContent.includes('Проверочный анализ'),'Показан устаревший ответ');
  });
  await check('Отдельная вкладка сравнивает один введённый вручную код',()=>{
   click('#tab-comparison');assert(!$('#comparison-panel').hidden,'Вкладка скрыта');
   $('#other-codes').value='A1:4.0,9.4,10.4,11.4,12';$('#other-codes').dispatchEvent(new w.Event('input'));click('#compare-results');
   assert(d.querySelectorAll('.comparison-card').length===1,'Нет результата для одного кода');
   assert($('#comparison-results').textContent.includes('Участник 1'),'Нет подписи результата');
  });
  await check('Пять направлений и общий обзор для города и районов',()=>{
   click('#tab-variables');assert($('#result-metric-group').options.length===6,'Неверное число групп');
   assert(d.querySelectorAll('.colour-metric').length===5,'Нет общего обзора');
   for(const group of ['T','E','S','B','C']){
    $('#result-metric-group').value=group;$('#result-metric-group').dispatchEvent(new w.Event('change'));
    assert(d.querySelectorAll('.colour-metric').length===2,'Не два показателя');
   }
   $('#result-region').value='Нура';$('#result-region').dispatchEvent(new w.Event('change'));
   assert($('#variable-chart').textContent.includes('Район Нура'),'Район не изменился');
  });
  await check('Презентация содержит четыре слайда с картинками и навигацией',()=>{
   click('#tab-presentation');assert(!$('#presentation-panel').hidden,'Вкладка скрыта');
   assert($('#presentation-pages').children.length===4,'Не четыре слайда');
   assert($('#presentation-pages').querySelector('img'),'Нет иллюстраций');
   click('#presentation-next');assert($('#presentation-number').textContent==='2 / 4','Навигация не работает');
   click('#presentation-prev');assert($('#presentation-number').textContent==='1 / 4','Нет возврата');
  });
  await check('Закрытие итогов отменяет запрос, отмена меры обновляет состояние',async()=>{
   click('#analyze-again');click('#continue');await tick();assert(calls[2].signal.aborted,'Закрытие не отменило запрос');resolvePending();await tick();
   click('[data-remove="M5"]');assert($('#finish').disabled,'Итоги доступны с четырьмя мерами');assert($('#count').textContent==='4 / 5','Не обновлён выбор');
  });
 }catch(e){results.push({name:'Загрузка игрового экрана',passed:false,error:e.message});}
 finally{frame.remove();}
 return results;
}
