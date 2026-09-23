const challenge = document.body.classList.contains('challenge-mode');

const mainSteps = [
  {
    tag: 'Добро пожаловать',
    title: 'Вы управляете Астаной',
    text: 'Ваша задача — выбрать пять инициатив, уложиться в бюджет и повысить качество жизни города.',
    visual: `<div class="tutorial-city"><span>52,56</span><small>СТАРТОВЫЙ ИНДЕКС</small><i>→</i><span class="goal">60+</span><small>ВАША ЦЕЛЬ</small></div>`,
  },
  {
    tag: 'Шаг 1',
    title: 'Выберите направление',
    text: 'Переключайтесь между транспортом, озеленением, социальной сферой, безопасностью и городскими сервисами.',
    visual: `<div class="tutorial-directions"><b>↔<small>Транспорт</small></b><b>♧<small>Зелень</small></b><b>⌂<small>Соцсфера</small></b><b>⛨<small>Безопасность</small></b><b>⚙<small>Сервисы</small></b></div>`,
  },
  {
    tag: 'Шаг 2',
    title: 'Изучите инициативу',
    text: 'На карточке указаны стоимость, срок запуска и показатели, которые изменятся. Нажмите на карточку, чтобы увидеть прогноз.',
    visual: `<div class="tutorial-card"><span class="tutorial-card-icon">↔</span><strong>Автобусные полосы</strong><em>18 ед.</em><div><i>Дороги +4,5</i><i>Транспорт +6,75</i></div></div>`,
  },
  {
    tag: 'Шаг 3',
    title: 'Укажите район',
    text: 'Районные инициативы требуют выбора территории на карте. Городские инициативы сразу действуют во всех пяти районах.',
    visual: `<div class="tutorial-map" aria-hidden="true"><i></i><i></i><i class="selected">Нура</i><i></i><i></i><span>Выбранный район</span></div>`,
  },
  {
    tag: 'Шаг 4',
    title: 'Соберите план из пяти решений',
    text: 'Следите за бюджетом и прогнозом справа. После пятой инициативы станет доступна итоговая оценка сценария.',
    visual: `<div class="tutorial-plan"><div><span>01 ✓</span><span>02 ✓</span><span>03 ✓</span><span>04 ✓</span><span>05 ✓</span></div><strong>Подвести итоги →</strong></div>`,
  },
];

const challengeSteps = [
  {
    tag: 'Режим испытания',
    title: 'Измените город за 8 кварталов',
    text: 'Каждый проект требует времени. Чем раньше вы его запустите, тем больше эффекта он принесёт к концу игры.',
    visual: `<div class="tutorial-quarters">${Array.from({length:8},(_,i)=>`<i>${i+1}</i>`).join('')}</div>`,
  },
  {
    tag: 'Шаг 1',
    title: 'Введите общий код турнира',
    text: 'Один код создаёт одинаковые события для всех команд. Так результаты можно сравнивать честно.',
    visual: `<div class="tutorial-seed"><small>КОД ТУРНИРА</small><strong>ASTANA-42</strong><span>Одинаковые условия для всех</span></div>`,
  },
  {
    tag: 'Шаг 2',
    title: 'Выбирайте из карт квартала',
    text: 'В каждом квартале доступна новая рука проектов. Учитывайте цену, задержку запуска и оставшееся время.',
    visual: `<div class="tutorial-hand"><i>10</i><i>18</i><i>24</i><i>28</i><i>30</i></div>`,
  },
  {
    tag: 'Шаг 3',
    title: 'Проекты меняют районы',
    text: 'Выберите карточку, затем район. Для городских проектов район не нужен. Прогноз показывает эффект к финалу игры.',
    visual: `<div class="tutorial-map" aria-hidden="true"><i></i><i class="selected">Проект</i><i></i><i></i><i></i><span>Эффект появится после лага</span></div>`,
  },
  {
    tag: 'Шаг 4',
    title: 'Реагируйте на события',
    text: 'Между кварталами два события меняют бюджет, стоимость проектов или размер руки. Корректируйте стратегию.',
    visual: `<div class="tutorial-events"><article><b>↗</b><span>Доп. финансирование</span><strong>+10</strong></article><article><b>%</b><span>Рост стоимости</span><strong>+20%</strong></article></div>`,
  },
  {
    tag: 'Шаг 5',
    title: 'Завершайте кварталы и следите за прогнозом',
    text: 'Неразыгранные карты возвращаются в колоду, бюджет сохраняется. После восьмого квартала вы получите итоговый Score.',
    visual: `<div class="tutorial-plan"><div><span>К1 ✓</span><span>К2 ✓</span><span>К3 ✓</span><span>…</span><span>К8</span></div><strong>Завершить квартал →</strong></div>`,
  },
];

const steps = challenge ? challengeSteps : mainSteps;
const storageKey = `akim-tutorial-${document.body.dataset.interface || 'classic'}-${challenge ? 'challenge' : 'main'}-v1`;
const help = document.createElement('button');
help.type = 'button';
help.className = 'quiet tutorial-help';
help.textContent = 'Как играть ?';
help.setAttribute('aria-haspopup', 'dialog');
document.querySelector('.board-actions').insertBefore(help, document.querySelector('#reset'));

const dialog = document.createElement('dialog');
dialog.className = 'tutorial-dialog';
dialog.setAttribute('aria-labelledby', 'tutorial-title');
dialog.innerHTML = `
  <button class="tutorial-close" type="button" aria-label="Закрыть обучение">×</button>
  <div class="tutorial-progress"><span></span><small></small></div>
  <section class="tutorial-slide" aria-live="polite"></section>
  <footer class="tutorial-controls">
    <div class="tutorial-dots" aria-label="Прогресс обучения"></div>
    <div>
      <button class="quiet tutorial-prev" type="button">← Назад</button>
      <button class="primary tutorial-next" type="button">Далее →</button>
    </div>
  </footer>`;
document.body.append(dialog);

let current = 0;
const slide = dialog.querySelector('.tutorial-slide');
const progress = dialog.querySelector('.tutorial-progress span');
const counter = dialog.querySelector('.tutorial-progress small');
const dots = dialog.querySelector('.tutorial-dots');
const previous = dialog.querySelector('.tutorial-prev');
const next = dialog.querySelector('.tutorial-next');

function render() {
  const step = steps[current];
  slide.innerHTML = `<div class="tutorial-copy"><span>${step.tag}</span><h2 id="tutorial-title">${step.title}</h2><p>${step.text}</p></div><div class="tutorial-visual">${step.visual}</div>`;
  progress.style.width = `${((current + 1) / steps.length) * 100}%`;
  counter.textContent = `${current + 1} / ${steps.length}`;
  previous.disabled = current === 0;
  next.textContent = current === steps.length - 1 ? 'Начать игру →' : 'Далее →';
  dots.innerHTML = steps.map((_, index) => `<button type="button" aria-label="Слайд ${index + 1}" aria-current="${index === current ? 'step' : 'false'}" data-slide="${index}"></button>`).join('');
}
function remember() { try { localStorage.setItem(storageKey, 'done'); } catch {} }
function open() { current = 0; render(); if (!dialog.open) dialog.showModal(); }
function close() { remember(); dialog.close(); }

help.addEventListener('click', open);
dialog.querySelector('.tutorial-close').addEventListener('click', close);
previous.addEventListener('click', () => { if (current > 0) { current--; render(); } });
next.addEventListener('click', () => { if (current < steps.length - 1) { current++; render(); } else close(); });
dots.addEventListener('click', event => { const button = event.target.closest('[data-slide]'); if (button) { current = Number(button.dataset.slide); render(); } });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' && current < steps.length - 1) { current++; render(); }
  if (event.key === 'ArrowLeft' && current > 0) { current--; render(); }
});
dialog.addEventListener('close', remember);

let seen = false;
try { seen = localStorage.getItem(storageKey) === 'done'; } catch {}
if (!seen) requestAnimationFrame(open);
