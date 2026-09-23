// Расчёт итогового балла симулятора «Аким на 5 часов» по заданным формулам.
// Браузерный модуль ES: подключайте через import в <script type="module">.

const BUDGET = 100;
const DECISION_COUNT = 5;
const HORIZON_QUARTERS = 8;

const DISTRICTS = {
  Есиль: { population: 0.27, T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 70 },
  Алматы: { population: 0.24, T1: 40, T2: 75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 60 },
  Сарыарка: { population: 0.20, T1: 50, T2: 70, E1: 42, E2: 40, S1: 62, S2: 68, B1: 58, B2: 55, C1: 45, C2: 55 },
  Байконур: { population: 0.13, T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 58 },
  Нура: { population: 0.16, T1: 55, T2: 40, E1: 45, E2: 65, S1: 38, S2: 35, B1: 55, B2: 50, C1: 60, C2: 50 },
};

const WEIGHTS = {
  T1: 0.10, T2: 0.10, E1: 0.09, E2: 0.11,
  S1: 0.11, S2: 0.11, B1: 0.09, B2: 0.09,
  C1: 0.10, C2: 0.10,
};

// district=true: необходимо указать район; false: мероприятие действует на весь город.
const MEASURES = {
  M1:  { name: 'Выделенные полосы для автобусов', direction: 'Транспорт', district: true,  cost: 18, lag: 2, effects: { T1: 6, T2: 9 } },
  M2:  { name: 'Умные светофоры (адаптивное управление)', direction: 'Транспорт', district: false, cost: 22, lag: 2, effects: { T1: 4, B2: 3 } },
  M3:  { name: 'Линия ЛРТ / расширение', direction: 'Транспорт', district: true,  cost: 30, lag: 4, effects: { T1: 16, T2: 20, E2: 4 } },
  M4:  { name: 'Парк / сквер', direction: 'Экология', district: true,  cost: 15, lag: 2, effects: { E1: 12, E2: 3, B1: 2 } },
  M5:  { name: 'Перевод частного сектора на чистое топливо', direction: 'Экология', district: true,  cost: 25, lag: 3, effects: { E2: 14, C1: 4 } },
  M6:  { name: 'Городская программа озеленения и ветрозащитных полос', direction: 'Экология', district: false, cost: 20, lag: 4, effects: { E1: 5, E2: 3 } },
  M7:  { name: 'Школа + детсад (модульное строительство)', direction: 'Соцсфера', district: true,  cost: 24, lag: 3, effects: { S1: 16 } },
  M8:  { name: 'Центр семейного здоровья / поликлиника', direction: 'Соцсфера', district: true,  cost: 20, lag: 3, effects: { S2: 14 } },
  M9:  { name: 'Дворовые спорт-хабы', direction: 'Соцсфера', district: true,  cost: 10, lag: 1, effects: { S1: 3, S2: 3, B1: 3 } },
  M10: { name: 'Освещение и камеры (расширение «Безопасного города»)', direction: 'Безопасность', district: true,  cost: 12, lag: 1, effects: { B1: 12, B2: 2 } },
  M11: { name: 'Безопасные переходы и школьные зоны', direction: 'Безопасность', district: true,  cost: 10, lag: 1, effects: { B2: 12, T1: -2 } },
  M12: { name: 'Единая цифровая платформа обращений', direction: 'Сервисы', district: false, cost: 14, lag: 1, effects: { C2: 5 } },
  M13: { name: 'Модернизация тепло- и водосетей', direction: 'Сервисы', district: true,  cost: 28, lag: 4, effects: { C1: 18, E2: 2 } },
  M14: { name: 'Аварийные бригады ЖКХ + раннее оповещение', direction: 'Сервисы', district: false, cost: 16, lag: 1, effects: { C1: 5, C2: 2 } },
};


const SYNERGIES = [
  { measures: ['M1', 'M2'], indicator: 'T1', amount: 2 },
  { measures: ['M10', 'M12'], indicator: 'B1', amount: 2 },
  { measures: ['M5', 'M6'], indicator: 'E2', amount: 2 },
];

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
[MEASURES, DISTRICTS, WEIGHTS, SYNERGIES].forEach(freeze);
const own = (object, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);
const copyDecision = ({ id, district }) => MEASURES[id].district ? { id, district } : { id };
const sameDecision = (a, b) => a.id === b.id && (!MEASURES[a.id].district || a.district === b.district);

/** Итог требует 5 мер; allowIncomplete разрешает предварительный выбор из 0–5 мер. */
function validateScenario(decisions, { allowIncomplete = false } = {}) {
  const issues = [];
  const add = (code, message, measureIds = [], district = null) => issues.push({ code, message, measureIds, district });
  if (!Array.isArray(decisions)) {
    add('INVALID_INPUT', 'Решения необходимо передать в виде массива.');
    return { valid: false, complete: false, errors: issues.map((issue) => issue.message), issues, cost: null, remainingBudget: null };
  }
  if (decisions.length > DECISION_COUNT || (!allowIncomplete && decisions.length !== DECISION_COUNT)) {
    add('DECISION_COUNT', allowIncomplete ? 'Можно выбрать не более 5 мероприятий.' : 'Для итогового результата необходимо выбрать ровно 5 мероприятий.');
  }

  let cost = 0;
  const seen = new Set();
  const counts = {};
  const known = [];
  // Цикл по индексам также проверяет пустые позиции в разреженном массиве.
  for (let index = 0; index < decisions.length; index++) {
    const decision = decisions[index];
    if (!decision || typeof decision !== 'object' || Array.isArray(decision) || !own(MEASURES, decision.id)) {
      add('UNKNOWN_MEASURE', `Решение № ${index + 1}: укажите существующий код мероприятия от M1 до M14.`);
      continue;
    }
    const { id, district } = decision;
    const measure = MEASURES[id];
    known.push(decision);
    cost += measure.cost;
    counts[measure.direction] = (counts[measure.direction] || 0) + 1;
    if (seen.has(id)) add('DUPLICATE', `${id} уже выбрано: каждое мероприятие разрешено только один раз.`, [id]);
    seen.add(id);
    if (measure.district && !own(DISTRICTS, district)) {
      add('DISTRICT_REQUIRED', `Для ${id} необходимо указать район из исходного набора данных.`, [id]);
    }
    if (!measure.district && district !== undefined) {
      add('CITY_DISTRICT', `${id} действует на весь город: поле district следует опустить.`, [id]);
    }
  }
  if (cost > BUDGET) add('BUDGET', `Бюджет превышен: стоимость ${cost}, доступно ${BUDGET}.`);
  for (const [direction, count] of Object.entries(counts)) {
    if (count > 2) add('DIRECTION_LIMIT', `В направлении «${direction}» выбрано ${count} мероприятий; допускается не более 2.`);
  }
  if (seen.has('M1') && seen.has('M3')) {
    add('INCOMPATIBLE', 'M1 и M3 несовместимы во всех районах: выберите либо автобусные полосы, либо ЛРТ.', ['M1', 'M3']);
  }
  for (const [a, b, reason] of [['M4', 'M7', 'конфликт за участок'], ['M5', 'M13', 'дублирование программы']]) {
    for (const left of known.filter((d) => d.id === a)) {
      if (own(DISTRICTS, left.district) && known.some((d) => d.id === b && d.district === left.district)) {
        add('INCOMPATIBLE', `${a} и ${b} нельзя выбрать вместе в районе «${left.district}»: ${reason}.`, [a, b], left.district);
      }
    }
  }
  return {
    valid: issues.length === 0,
    complete: issues.length === 0 && decisions.length === DECISION_COUNT,
    errors: issues.map((issue) => issue.message), issues, cost, remainingBudget: BUDGET - cost,
  };
}

// Внутренняя функция получает только проверенный набор и каждый раз считает от исходных данных.
function evaluate(decisions) {
  const values = Object.fromEntries(Object.entries(DISTRICTS).map(([district, data]) => [district,
    Object.fromEntries(Object.keys(WEIGHTS).map((key) => [key, data[key]])),
  ]));
  const contributions = [];
  // Канонический порядок исключает зависимость арифметики от порядка выбора.
  const ordered = [...decisions].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  for (const decision of ordered) {
    const measure = MEASURES[decision.id];
    const realizedFraction = (HORIZON_QUARTERS - measure.lag) / HORIZON_QUARTERS;
    const deltas = {};
    for (const district of measure.district ? [decision.district] : Object.keys(DISTRICTS)) {
      deltas[district] = {};
      for (const [indicator, effect] of Object.entries(measure.effects)) {
        const delta = effect * realizedFraction;
        values[district][indicator] += delta;
        deltas[district][indicator] = delta;
      }
    }
    contributions.push({ id: decision.id, name: measure.name, cost: measure.cost, realizedFraction, deltas });
  }
  const synergies = [];
  for (const synergy of SYNERGIES) {
    const [first, second] = synergy.measures;
    const receiver = ordered.find((d) => d.id === first);
    if (receiver && ordered.some((d) => d.id === second)) {
      values[receiver.district][synergy.indicator] += synergy.amount;
      synergies.push({ ...synergy, district: receiver.district });
    }
  }
  const districts = {};
  let weightedAverage = 0;
  let criticalCount = 0;
  for (const [district, indicators] of Object.entries(values)) {
    const clipped = Object.fromEntries(Object.entries(indicators).map(([key, value]) => [key, Math.min(100, Math.max(0, value))]));
    const score = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + clipped[key] * weight, 0);
    const criticalIndicators = Object.keys(WEIGHTS).filter((key) => clipped[key] < 40);
    const deltas = Object.fromEntries(Object.keys(WEIGHTS).map((key) => [key, clipped[key] - DISTRICTS[district][key]]));
    criticalCount += criticalIndicators.length;
    weightedAverage += score * DISTRICTS[district].population;
    districts[district] = { indicators: clipped, deltas, score, populationShare: DISTRICTS[district].population, criticalIndicators };
  }
  const minimumDistrictScore = Math.min(...Object.values(districts).map((district) => district.score));
  return { districts, weightedAverage, minimumDistrictScore, criticalCount, criticalPenalty: criticalCount,
    score: 0.7 * weightedAverage + 0.3 * minimumDistrictScore - criticalCount, synergies, contributions };
}
const BASELINE_SCORE = evaluate([]).score;

/** По умолчанию — итоговый расчёт; для текущего выбора передайте allowIncomplete: true. */
function calculateScore(decisions, options = {}) {
  const validation = validateScenario(decisions, options);
  if (!validation.valid) return { ...validation, score: null };
  const result = evaluate(decisions);
  return {
    ...validation, ...result, isPreview: !validation.complete,
    baselineScore: BASELINE_SCORE, publishedBaselineScore: 52.56,
    scoreChangeFromBaseline: result.score - BASELINE_SCORE,
  };
}

/** Подсказки для выбранного или рассматриваемого варианта, включая район действия бонуса. */
function getSynergyHints(decisions, candidate) {
  const existing = validateScenario(decisions, { allowIncomplete: true });
  if (!existing.valid || !validateScenario([candidate], { allowIncomplete: true }).valid) return [];
  const selected = decisions.some((d) => sameDecision(d, candidate));
  const next = selected ? [...decisions] : [...decisions, candidate];
  return SYNERGIES.filter((s) => s.measures.includes(candidate.id)).map((synergy) => {
    const [first] = synergy.measures;
    const partnerId = synergy.measures.find((id) => id !== candidate.id);
    const partnerSelected = decisions.some((d) => d.id === partnerId);
    const district = next.find((d) => d.id === first)?.district ?? null;
    const place = district ? `в районе «${district}»` : `в районе, выбранном для ${first}`;
    const bonus = `${synergy.indicator} +${synergy.amount} ${place}; бонус не уменьшается лагом.`;
    let possibleSets;
    if (partnerSelected) possibleSets = [next];
    else if (MEASURES[partnerId].district) possibleSets = Object.keys(DISTRICTS).map((d) => [...next, { id: partnerId, district: d }]);
    else possibleSets = [[...next, { id: partnerId }]];
    const checks = possibleSets.map((set) => validateScenario(set, { allowIncomplete: true }));
    const available = checks.some((check) => check.valid);
    const status = selected && partnerSelected ? 'active' : !available ? 'blocked' : partnerSelected ? 'ready' : 'potential';
    const errors = available ? [] : [...new Set(checks.flatMap((check) => check.errors))];
    const introduction = {
      active: 'Синергия уже действует.',
      ready: 'При добавлении этой меры сработает синергия.',
      potential: `Для синергии добавьте ${partnerId} — «${MEASURES[partnerId].name}».`,
      blocked: `Возможная синергия с ${partnerId} — «${MEASURES[partnerId].name}»; сейчас сочетание недоступно.`,
    }[status];
    return { ...synergy, partnerId, district, status, available, errors, text: `${introduction} ${bonus}${errors.length ? ` ${errors.join(' ')}` : ''}` };
  });
}

/** Хранилище состояния для главного модуля сайта. Невалидные операции не меняют выбор. */
function createScenario(initialDecisions = []) {
  const validation = validateScenario(initialDecisions, { allowIncomplete: true });
  if (!validation.valid) throw new TypeError(validation.errors.join(' '));
  let decisions = initialDecisions.map(copyDecision);
  const listeners = new Set();

  function preview(action, input) {
    let next;
    if (action === 'add') next = [...decisions, input];
    else {
      if (!decisions.some((d) => d.id === input)) {
        return freeze({ allowed: false, errors: ['Мероприятие не выбрано.'], issues: [{ code: 'NOT_SELECTED', message: 'Мероприятие не выбрано.' }], score: null, delta: null, result: null });
      }
      next = decisions.filter((d) => d.id !== input);
    }
    const result = calculateScore(next, { allowIncomplete: true });
    return freeze({ allowed: result.valid, errors: result.errors, issues: result.issues,
      score: result.score, delta: result.valid ? result.score - evaluate(decisions).score : null, result });
  }

  function getOptions() {
    return freeze(Object.entries(MEASURES).flatMap(([id, measure]) => {
      const variants = measure.district ? Object.keys(DISTRICTS).map((district) => ({ id, district })) : [{ id }];
      return variants.map((decision) => {
        const selected = decisions.some((d) => sameDecision(d, decision));
        const action = selected ? 'remove' : 'add';
        const prediction = preview(action, selected ? id : decision);
        return { key: `${id}:${decision.district ?? 'city'}`, decision, selected, action,
          disabled: !prediction.allowed, reasons: prediction.errors, issues: prediction.issues,
          preview: prediction, synergyHints: getSynergyHints(decisions, decision) };
      });
    }));
  }

  function getState() {
    const result = calculateScore(decisions, { allowIncomplete: true });
    return freeze({ decisions: decisions.map(copyDecision), result, canFinalize: result.complete,
      remainingSlots: DECISION_COUNT - decisions.length, options: getOptions() });
  }

  function replace(next, type) {
    const check = validateScenario(next, { allowIncomplete: true });
    if (!check.valid) return freeze({ ok: false, errors: check.errors, issues: check.issues, state: getState() });
    decisions = next.map(copyDecision);
    const state = getState();
    const event = freeze({ type });
    // Ошибка обработчика интерфейса не должна прерывать уведомление остальных подписчиков.
    for (const listener of [...listeners]) {
      try { listener(state, event); } catch (error) { console.error('Ошибка обработчика изменения сценария:', error); }
    }
    return { ok: true, errors: [], issues: [], state };
  }

  return Object.freeze({
    getState, getOptions,
    previewAdd: (decision) => preview('add', decision),
    previewRemove: (id) => preview('remove', id),
    add: (decision) => replace([...decisions, decision], 'add'),
    remove: (id) => decisions.some((d) => d.id === id)
      ? replace(decisions.filter((d) => d.id !== id), 'remove')
      : freeze({ ok: false, errors: ['Мероприятие не выбрано.'], issues: [{ code: 'NOT_SELECTED', message: 'Мероприятие не выбрано.' }], state: getState() }),
    setDecisions: (next) => replace(next, 'replace'),
    reset: () => replace([], 'reset'),
    finalize: () => freeze(calculateScore(decisions)),
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Подписчик должен быть функцией.');
      listeners.add(listener);
      try { listener(getState(), { type: 'init' }); } catch (error) { listeners.delete(listener); throw error; }
      return () => listeners.delete(listener);
    },
  });
}

// Версия A1 фиксирует порядок районов и правила текущего датасета.
const CODE_DISTRICTS = ['Есиль', 'Алматы', 'Сарыарка', 'Байконур', 'Нура'];

/** Короткий код допустимого набора из пяти мер, одинаковый при любом порядке выбора. */
function encodeScenario(decisions) {
  const validation = validateScenario(decisions);
  if (!validation.valid) throw new TypeError(validation.errors.join(' '));
  return 'A1:' + [...decisions].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
    .map(({ id, district }) => id.slice(1) + (MEASURES[id].district ? `.${CODE_DISTRICTS.indexOf(district)}` : '')).join(',');
}

/** Восстановление и повторная проверка чужого кода: баллам из браузера не доверяем. */
function decodeScenario(code) {
  if (typeof code !== 'string' || code.length > 60 || !code.startsWith('A1:')) {
    throw new TypeError('Неверный код сценария: ожидается формат A1:…');
  }
  const decisions = code.slice(3).split(',').map((part) => {
    const match = /^([1-9]|1[0-4])(?:\.([0-4]))?$/.exec(part);
    if (!match) throw new TypeError('В коде сценария указано неизвестное мероприятие или район.');
    return { id: `M${match[1]}`, ...(match[2] === undefined ? {} : { district: CODE_DISTRICTS[Number(match[2])] }) };
  });
  const validation = validateScenario(decisions);
  if (!validation.valid) throw new TypeError(validation.errors.join(' '));
  return decisions;
}

export { BUDGET, DECISION_COUNT, HORIZON_QUARTERS, DISTRICTS, WEIGHTS, MEASURES,
  SYNERGIES, BASELINE_SCORE, validateScenario, calculateScore, getSynergyHints, createScenario,
  encodeScenario, decodeScenario };
