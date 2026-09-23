import { BUDGET, DECISION_COUNT, MEASURES, createScenario } from './score.js';

let instanceCounter = 0;
const number = (value) => value.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
const signed = (value) => `${value > 0 ? '+' : ''}${number(value)}`;

/** Готовое подключение к DOM: доступность, прогнозы, подсказки и события для главного модуля. */
export function mountScenarioPicker(root, { scenario = createScenario() } = {}) {
  if (!root || root.nodeType !== 1) throw new TypeError('Передайте элемент-контейнер страницы.');
  const document = root.ownerDocument;
  const prefix = `scenario-${++instanceCounter}`;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const shell = element('section', 'scenario-picker');
  shell.setAttribute('aria-label', 'Выбор городских мероприятий');
  const summary = element('output', 'scenario-summary');
  summary.setAttribute('aria-live', 'polite');
  const instructions = element('p', 'scenario-instructions', 'Выберите район под мероприятием. Нажмите повторно, чтобы удалить выбор. При наведении или фокусе доступны прогноз и подсказки о синергиях.');
  const message = element('p', 'scenario-message');
  message.setAttribute('role', 'status');
  const catalog = element('div', 'scenario-catalog');
  const footer = element('div', 'scenario-footer');
  const finalizeButton = element('button', 'scenario-finalize', 'Получить итоговый результат');
  finalizeButton.type = 'button';
  const resetButton = element('button', 'scenario-reset', 'Очистить выбор');
  resetButton.type = 'button';
  footer.append(finalizeButton, resetButton);
  shell.append(summary, instructions, message, catalog, footer);
  root.append(shell);

  const views = new Map();
  let currentOptions = new Map();
  const groups = new Map();
  for (const option of scenario.getOptions()) {
    const { id } = option.decision;
    const measure = MEASURES[id];
    if (!groups.has(id)) {
      const card = element('article', 'scenario-measure');
      card.dataset.measure = id;
      const name = element('h3', '', `${id}. ${measure.name}`);
      const description = element('p', 'scenario-meta', `${measure.direction} · Стоимость: ${measure.cost} · Лаг: ${measure.lag} кв.`);
      const choices = element('div', 'scenario-choices');
      card.append(name, description, choices);
      catalog.append(card);
      groups.set(id, choices);
    }
    const wrapper = element('div', 'scenario-option');
    wrapper.dataset.key = option.key;
    const button = element('button', 'scenario-option-button');
    button.type = 'button';
    const label = element('span', 'scenario-option-label');
    const prediction = element('span', 'scenario-prediction');
    button.append(label, prediction);
    const tooltip = element('span', 'scenario-tooltip');
    tooltip.id = `${prefix}-hint-${views.size}`;
    tooltip.setAttribute('role', 'tooltip');
    button.setAttribute('aria-describedby', tooltip.id);
    wrapper.setAttribute('aria-describedby', tooltip.id);
    // Обёртка получает фокус при недоступной кнопке: причину можно прочитать с клавиатуры.
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', `${id}, ${option.decision.district ?? 'весь город'}`);
    button.addEventListener('click', () => {
      const latest = currentOptions.get(option.key);
      const operation = latest.selected ? scenario.remove(id) : scenario.add(latest.decision);
      if (!operation.ok) message.textContent = operation.errors.join(' ');
    });
    wrapper.append(button, tooltip);
    groups.get(id).append(wrapper);
    views.set(option.key, { wrapper, button, label, prediction, tooltip });
  }

  function emit(name, detail) {
    root.dispatchEvent(new document.defaultView.CustomEvent(name, { detail, bubbles: true }));
  }
  const unsubscribe = scenario.subscribe((state, event) => {
    const { result } = state;
    summary.textContent = `${state.canFinalize ? 'Итоговый' : 'Предварительный'} балл: ${number(result.score)}. Выбрано: ${state.decisions.length} из ${DECISION_COUNT}. Бюджет: ${result.cost} из ${BUDGET}; остаток: ${result.remainingBudget}.`;
    finalizeButton.disabled = !state.canFinalize;
    resetButton.disabled = state.decisions.length === 0;
    message.textContent = state.canFinalize ? 'Все пять решений выбраны. Можно получить итоговый результат.' : `До итогового результата осталось выбрать мероприятий: ${state.remainingSlots}.`;
    currentOptions = new Map(state.options.map((option) => [option.key, option]));
    for (const option of state.options) {
      const view = views.get(option.key);
      const target = option.decision.district ?? 'Весь город';
      const action = option.selected ? 'Удалить' : 'Добавить';
      view.button.disabled = option.disabled;
      view.button.setAttribute('aria-pressed', String(option.selected));
      view.button.setAttribute('aria-label', `${action} ${option.decision.id}: ${target}`);
      view.wrapper.classList.toggle('is-disabled', option.disabled);
      view.wrapper.classList.toggle('is-selected', option.selected);
      view.wrapper.tabIndex = option.disabled ? 0 : -1;
      view.label.textContent = option.selected ? `Удалить · ${target}` : target;
      const forecast = option.disabled ? option.reasons.join(' ') : `После ${option.selected ? 'удаления' : 'добавления'}: ${number(option.preview.score)} балла (${signed(option.preview.delta)}).`;
      view.prediction.textContent = option.disabled ? 'Недоступно' : `Балл ${number(option.preview.score)} · ${signed(option.preview.delta)}`;
      view.tooltip.textContent = [forecast, ...option.synergyHints.map((hint) => hint.text)].join('\n');
    }
    emit('scenariochange', { state, type: event.type });
  });
  resetButton.addEventListener('click', () => scenario.reset());
  finalizeButton.addEventListener('click', () => {
    const result = scenario.finalize();
    if (result.valid) {
      message.textContent = `Итоговый результат: ${number(result.score)} балла.`;
      emit('scenariofinalize', result);
    }
  });

  return { scenario, destroy() { unsubscribe(); shell.remove(); } };
}
