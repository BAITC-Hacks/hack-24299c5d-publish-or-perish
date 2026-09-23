export function readProgress(mode) {
 try { return JSON.parse(sessionStorage.getItem(`astana-progress-v1-${mode}`)); } catch { return null; }
}
export function saveProgress(mode, state) {
 try { sessionStorage.setItem(`astana-progress-v1-${mode}`, JSON.stringify(mode==='main' ? state.decisions : {seed:state.seed,quarter:state.quarter,finished:state.finished,projects:state.projects})); } catch {}
}
export function restoreMain(game) {
 const saved=readProgress('main');
 if(Array.isArray(saved))for(const decision of saved){if(!game.add(decision).ok){game.reset();break;}}
 return game;
}
export function restoreChallenge(create) {
 const saved=readProgress('challenge');
 if(!saved)return create();
 try {
  if(!Number.isInteger(saved.quarter)||saved.quarter<1||saved.quarter>8||!Array.isArray(saved.projects))throw new Error('Invalid progress');
  const game=create({seed:saved.seed});
  for(let quarter=1;quarter<=saved.quarter;quarter++){
   for(const p of saved.projects.filter(p=>p.quarter===quarter))if(!game.play({id:p.id,...(p.district?{district:p.district}:{})}).ok)throw new Error('Invalid project');
   if(quarter<saved.quarter||saved.finished)game.endTurn();
  }
  return game;
 }catch{return create();}
}

const classic=document.body.dataset.interface==='classic';
const challenge=document.body.classList.contains('challenge-mode');
const routes={game:{main:'index.html',challenge:'challenge-demo.html'},classic:{main:'classic.html',challenge:'classic-challenge.html'}};
const style=classic?'classic':'game';
document.querySelectorAll('.mode-tabs a').forEach(a=>{a.href=routes[style][a.textContent.includes('Испытание')?'challenge':'main'];});
const control=document.createElement('label');control.className='interface-switch';
control.innerHTML='<span>Интерфейс</span><select aria-label="Оформление игры"><option value="game">Игровой</option><option value="classic">Классический</option></select>';
control.querySelector('select').value=style;
control.querySelector('select').addEventListener('change',event=>{
 // Session storage may be unavailable in a restricted browser. Warn before losing progress.
 try {sessionStorage.setItem('astana-interface',event.target.value);}catch{if(!confirm('Браузер запрещает сохранение. Переключить интерфейс и начать заново?')){event.target.value=style;return;}}
 location.href=routes[event.target.value][challenge?'challenge':'main'];
});
(document.querySelector('header')||document.querySelector('.board-actions')||document.querySelector('.board-top')).append(control);
