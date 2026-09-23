// Проверки запускаются в браузере; отдельный сервер вычислений не требуется.
import { BASELINE_SCORE, MEASURES, calculateScore, createScenario, validateScenario, encodeScenario, decodeScenario } from './score.js';
import { mountScenarioPicker } from './scenario-picker.js';

const sample = [
  { id: 'M7', district: 'Нура' }, { id: 'M8', district: 'Нура' },
  { id: 'M10', district: 'Нура' }, { id: 'M12' }, { id: 'M5', district: 'Сарыарка' },
];
function assert(condition, message = 'Условие не выполнено') { if (!condition) throw new Error(message); }
function close(actual, expected) { assert(Math.abs(actual - expected) < 1e-9, `Ожидалось ${expected}, получено ${actual}`); }
const option = (state, id, district) => state.options.find((o) => o.decision.id === id && o.decision.district === district);

export function runChecks() {
  const results = [];
  const check = (name, run) => {
    try { run(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  };

  check('Исходный балл и обязательные пять решений для итога', () => {
    close(BASELINE_SCORE, 52.55768);
    const state = createScenario().getState();
    close(state.result.score, BASELINE_SCORE);
    assert(state.result.isPreview && !state.canFinalize && state.result.criticalCount === 2);
    assert(!calculateScore([]).valid && calculateScore([]).score === null);
    close(state.result.scoreChangeFromBaseline, 0);
  });
  check('Пример документа: стоимость, балл, синергия и критические показатели', () => {
    const result = calculateScore(sample);
    assert(result.valid && result.complete && !result.isPreview);
    close(result.score, 56.54307);
    close(result.weightedAverage, 58.0776);
    assert(result.cost === 95 && result.remainingBudget === 5 && result.criticalCount === 0);
    assert(result.synergies.length === 1 && result.synergies[0].district === 'Нура');
  });
  check('Короткий код сохраняет пять решений и не зависит от порядка', () => {
    const code = encodeScenario(sample);
    assert(code === 'A1:5.2,7.4,8.4,10.4,12');
    assert(code === encodeScenario([...sample].reverse()));
    close(calculateScore(decodeScenario(code)).score, 56.54307);
    assert(encodeScenario(decodeScenario(code)) === code);
  });
  check('Коды с неверными районами, повторами, конфликтами и неполным выбором отклоняются', () => {
    for (const code of ['A2:5.2,7.4,8.4,10.4,12', 'A1:12', 'A1:5.2,7.4,8.4,10.4,12.0', 'A1:5.9,7.4,8.4,10.4,12', 'A1:5.2,7.4,7.4,10.4,12', 'A1:4.4,7.4,8.4,10.4,12']) {
      let rejected = false;
      try { decodeScenario(code); } catch { rejected = true; }
      assert(rejected, `Не отклонён код ${code}`);
    }
  });
  check('Перестановка решений не меняет результат', () => {
    assert(JSON.stringify(calculateScore(sample)) === JSON.stringify(calculateScore([...sample].reverse())));
  });
  check('Подписка: начальное состояние, добавление, удаление и отписка', () => {
    const scenario = createScenario();
    const events = [];
    const unsubscribe = scenario.subscribe((state, event) => events.push({ state, type: event.type }));
    scenario.add({ id: 'M10', district: 'Нура' });
    scenario.remove('M10');
    unsubscribe();
    scenario.add({ id: 'M12' });
    assert(events.map((e) => e.type).join(',') === 'init,add,remove');
    close(events[2].state.result.score, BASELINE_SCORE);
  });
  check('Прогноз не изменяет выбор и не вызывает подписчиков', () => {
    const scenario = createScenario([{ id: 'M10', district: 'Нура' }]);
    let calls = 0;
    scenario.subscribe(() => calls++);
    const before = JSON.stringify(scenario.getState());
    const add = scenario.previewAdd({ id: 'M12' });
    const remove = scenario.previewRemove('M10');
    assert(add.allowed && remove.allowed && calls === 1);
    assert(JSON.stringify(scenario.getState()) === before);
    close(scenario.add({ id: 'M12' }).state.result.score, add.score);
  });
  check('Прогнозы всех 54 вариантов совпадают с результатом добавления', () => {
    const empty = createScenario();
    const options = empty.getOptions();
    assert(options.length === 54);
    for (const variant of options) {
      const scenario = createScenario();
      const changed = scenario.add(variant.decision);
      assert(changed.ok && !variant.disabled);
      close(changed.state.result.score, variant.preview.score);
      close(variant.preview.delta, changed.state.result.score - BASELINE_SCORE);
    }
  });
  check('Прогнозы удаления из полного набора учитывают штрафы и потерю синергий', () => {
    for (const choice of sample) {
      const scenario = createScenario(sample);
      const prediction = scenario.previewRemove(choice.id);
      const result = scenario.remove(choice.id).state;
      close(result.result.score, prediction.score);
      assert(!result.canFinalize && result.result.isPreview);
    }
  });
  check('Удаление любой меры пары снимает бонус M10 + M12', () => {
    const scenario = createScenario([{ id: 'M10', district: 'Нура' }, { id: 'M12' }]);
    close(scenario.getState().result.districts.Нура.indicators.B1, 67.5);
    close(scenario.remove('M12').state.result.districts.Нура.indicators.B1, 65.5);
    scenario.add({ id: 'M12' });
    const state = scenario.remove('M10').state;
    close(state.result.districts.Нура.indicators.B1, 55);
    assert(state.result.synergies.length === 0);
  });
  for (const [a, b] of [['M4', 'M7'], ['M5', 'M13'], ['M7', 'M4'], ['M13', 'M5']]) {
    check(`${a} блокирует ${b} только в том же районе и разблокирует при удалении`, () => {
      const scenario = createScenario([{ id: a, district: 'Нура' }]);
      assert(option(scenario.getState(), b, 'Нура').disabled);
      assert(!option(scenario.getState(), b, 'Есиль').disabled);
      assert(!scenario.add({ id: b, district: 'Нура' }).ok);
      scenario.remove(a);
      assert(!option(scenario.getState(), b, 'Нура').disabled);
    });
  }
  check('M1 и M3 взаимно блокируют все районы', () => {
    for (const [a, b] of [['M1', 'M3'], ['M3', 'M1']]) {
      const scenario = createScenario([{ id: a, district: 'Нура' }]);
      assert(scenario.getOptions().filter((o) => o.decision.id === b).every((o) => o.disabled));
      scenario.remove(a);
      assert(scenario.getOptions().filter((o) => o.decision.id === b).every((o) => !o.disabled));
    }
  });
  check('Повтор меры в другом районе запрещён, выбранный вариант можно удалить', () => {
    const scenario = createScenario([{ id: 'M10', district: 'Нура' }]);
    assert(!scenario.add({ id: 'M10', district: 'Есиль' }).ok);
    assert(!option(scenario.getState(), 'M10', 'Нура').disabled);
    assert(option(scenario.getState(), 'M10', 'Есиль').disabled);
  });
  check('Пять мест: добавление запрещено, удаление доступно, итог разрешён', () => {
    const scenario = createScenario(sample);
    assert(scenario.finalize().valid);
    assert(scenario.getOptions().filter((o) => !o.selected).every((o) => o.disabled));
    assert(scenario.getOptions().filter((o) => o.selected).every((o) => !o.disabled && o.action === 'remove'));
    scenario.remove('M8');
    assert(!scenario.finalize().valid && scenario.previewAdd({ id: 'M8', district: 'Нура' }).allowed);
  });
  check('Бюджет и лимит направления отклоняют операцию без изменения состояния', () => {
    const scenario = createScenario([{ id: 'M3', district: 'Нура' }, { id: 'M7', district: 'Нура' }, { id: 'M13', district: 'Есиль' }]);
    const before = JSON.stringify(scenario.getState());
    assert(scenario.add({ id: 'M5', district: 'Сарыарка' }).issues.some((i) => i.code === 'BUDGET'));
    assert(JSON.stringify(scenario.getState()) === before);
    scenario.remove('M13');
    assert(scenario.previewAdd({ id: 'M5', district: 'Сарыарка' }).allowed);
    const ecology = createScenario([{ id: 'M4', district: 'Есиль' }, { id: 'M5', district: 'Сарыарка' }]);
    assert(ecology.add({ id: 'M6' }).issues.some((i) => i.code === 'DIRECTION_LIMIT'));
  });
  check('Граница 40 и отрицательный эффект M11 учитываются без округления', () => {
    const result = calculateScore([{ id: 'M11', district: 'Алматы' }], { allowIncomplete: true });
    assert(result.districts.Сарыарка.indicators.E2 === 40);
    assert(!result.districts.Сарыарка.criticalIndicators.includes('E2'));
    close(result.districts.Алматы.indicators.T1, 38.25);
    assert(result.criticalCount === 3);
    close(result.score, 51.68704);
  });
  check('Три синергии дают фиксированный бонус в нужном районе', () => {
    for (const [a, b, indicator, expected] of [['M1', 'M2', 'T1', 64.5], ['M10', 'M12', 'B1', 67.5], ['M5', 'M6', 'E2', 77.25]]) {
      const result = calculateScore([{ id: a, district: 'Нура' }, { id: b }], { allowIncomplete: true });
      close(result.districts.Нура.indicators[indicator], expected);
      assert(result.synergies[0].district === 'Нура' && result.synergies[0].amount === 2);
    }
  });
  check('Подсказка меняется: возможная, готовая, действующая, снова возможная', () => {
    const scenario = createScenario();
    assert(option(scenario.getState(), 'M10', 'Нура').synergyHints[0].status === 'potential');
    scenario.add({ id: 'M10', district: 'Нура' });
    assert(option(scenario.getState(), 'M12').synergyHints[0].status === 'ready');
    scenario.add({ id: 'M12' });
    const hint = option(scenario.getState(), 'M10', 'Нура').synergyHints[0];
    assert(hint.status === 'active' && hint.district === 'Нура' && hint.text.includes('B1 +2'));
    scenario.remove('M12');
    assert(option(scenario.getState(), 'M10', 'Нура').synergyHints[0].status === 'potential');
  });
  check('Недоступная синергия объясняет ограничения', () => {
    const scenario = createScenario([{ id: 'M1', district: 'Нура' }, { id: 'M4', district: 'Есиль' }, { id: 'M9', district: 'Нура' }, { id: 'M10', district: 'Нура' }, { id: 'M14' }]);
    const hint = option(scenario.getState(), 'M1', 'Нура').synergyHints[0];
    assert(hint.status === 'blocked' && !hint.available && hint.errors.length > 0);
  });
  check('Ошибочные данные возвращают причины без исключений', () => {
    for (const value of [null, {}, [null], [{ id: 'toString' }], [{ id: '__proto__' }], [{ id: 'M4' }], [{ id: 'M12', district: 'Нура' }], [null, { id: 'M4', district: 'Нура' }, { id: 'M7', district: 'Нура' }]]) {
      assert(!validateScenario(value, { allowIncomplete: true }).valid);
    }
    assert(!createScenario().remove('M1').ok);
  });
  check('Смена района атомарна, исходный массив и снимки защищены', () => {
    const initial = [{ id: 'M4', district: 'Нура' }];
    const scenario = createScenario(initial);
    initial[0].district = 'Есиль';
    assert(scenario.getState().decisions[0].district === 'Нура');
    assert(Object.isFrozen(scenario.getState().decisions[0]) && Object.isFrozen(MEASURES.M4.effects));
    scenario.setDecisions([{ id: 'M4', district: 'Есиль' }]);
    assert(!option(scenario.getState(), 'M7', 'Нура').disabled);
    assert(option(scenario.getState(), 'M7', 'Есиль').disabled);
    assert(!scenario.setDecisions([{ id: 'M4' }]).ok);
    assert(scenario.getState().decisions[0].district === 'Есиль');
    close(scenario.reset().state.result.score, BASELINE_SCORE);
  });
  check('DOM: выбор, серые кнопки по районам, прогнозы и снятие блокировки', () => {
    const root = document.createElement('div');
    document.body.append(root);
    let component;
    try {
      let changes = 0;
      root.addEventListener('scenariochange', () => changes++);
      component = mountScenarioPicker(root);
      const button = (key) => root.querySelector(`[data-key="${key}"] button`);
      button('M4:Нура').click();
      assert(button('M7:Нура').disabled && !button('M7:Есиль').disabled);
      assert(root.querySelector('[data-key="M7:Нура"]').classList.contains('is-disabled'));
      assert(button('M4:Нура').textContent.includes('Удалить'));
      assert(root.querySelector('[data-key="M7:Нура"] .scenario-tooltip').textContent.includes('конфликт за участок'));
      button('M4:Нура').click();
      assert(!button('M7:Нура').disabled && changes === 3);
      button('M10:Нура').click();
      assert(root.querySelector('[data-key="M12:city"] .scenario-tooltip').textContent.includes('сработает синергия'));
      button('M12:city').click();
      assert(root.querySelector('[data-key="M10:Нура"] .scenario-tooltip').textContent.includes('уже действует'));
      button('M12:city').click();
      assert(root.querySelector('[data-key="M10:Нура"] .scenario-tooltip').textContent.includes('добавьте M12'));
    } finally { component?.destroy(); root.remove(); }
  });
  check('DOM: итоговое событие и отключение подписки при удалении компонента', () => {
    const root = document.createElement('div');
    document.body.append(root);
    let component;
    try {
      const scenario = createScenario(sample);
      component = mountScenarioPicker(root, { scenario });
      let result;
      root.addEventListener('scenariofinalize', (event) => { result = event.detail; });
      root.querySelector('.scenario-finalize').click();
      close(result.score, 56.54307);
      component.destroy();
      let changes = 0;
      root.addEventListener('scenariochange', () => changes++);
      scenario.reset();
      assert(changes === 0 && root.children.length === 0);
    } finally { component?.destroy(); root.remove(); }
  });
  return results;
}
