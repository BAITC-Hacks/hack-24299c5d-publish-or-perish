// Расчёт итогового балла симулятора «Аким на 5 часов» по заданным формулам.
// Запуск: node score.js

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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function validateScenario(decisions) {
  const errors = [];
  if (!Array.isArray(decisions)) return { valid: false, errors: ['Решения необходимо передать в виде массива.'] };
  if (decisions.length !== DECISION_COUNT) errors.push(`Необходимо выбрать ровно ${DECISION_COUNT} мероприятий.`);

  const ids = decisions.map((decision) => decision?.id);
  const seen = new Set();
  for (const [index, decision] of decisions.entries()) {
    if (!decision || typeof decision !== 'object') {
      errors.push(`Решение № ${index + 1} должно быть объектом с кодом мероприятия id и, при необходимости, районом district.`);
      continue;
    }
    const measure = MEASURES[decision.id];
    if (!measure) {
      errors.push(`В решении № ${index + 1} указан неизвестный код мероприятия «${decision.id}».`);
      continue;
    }
    if (seen.has(decision.id)) errors.push(`${decision.id} повторяется: каждое мероприятие можно выбрать только один раз.`);
    seen.add(decision.id);

    if (measure.district && !Object.hasOwn(DISTRICTS, decision.district)) {
      errors.push(`Для ${decision.id} необходимо указать район из исходного набора данных.`);
    } else if (!measure.district && decision.district !== undefined && decision.district !== null && decision.district !== '') {
      errors.push(`${decision.id} действует на весь город: район указывать не нужно.`);
    }
  }

  const cost = decisions.reduce((sum, decision) => sum + (MEASURES[decision?.id]?.cost ?? 0), 0);
  if (cost > BUDGET) errors.push(`Бюджет превышен: стоимость ${cost}, доступный бюджет ${BUDGET}.`);

  const directionCounts = {};
  for (const id of ids) {
    const direction = MEASURES[id]?.direction;
    if (direction) directionCounts[direction] = (directionCounts[direction] || 0) + 1;
  }
  for (const [direction, count] of Object.entries(directionCounts)) {
    if (count > 2) errors.push(`В одном направлении допускается не более 2 мероприятий; в направлении «${direction}» выбрано ${count}.`);
  }

  const has = (id) => ids.includes(id);
  if (has('M1') && has('M3')) errors.push('M1 и M3 несовместимы: выберите либо автобусные полосы, либо ЛРТ, независимо от районов.');
  for (const [left, right, reason] of [
    ['M4', 'M7', 'конфликт за участок'],
    ['M5', 'M13', 'дублирование программы'],
  ]) {
    if (has(left) && has(right)) {
      const a = decisions.find((decision) => decision.id === left)?.district;
      const b = decisions.find((decision) => decision.id === right)?.district;
      if (a === b) errors.push(`${left} и ${right} нельзя одновременно реализовать в районе «${a}» (${reason}).`);
    }
  }

  return { valid: errors.length === 0, errors, cost, remainingBudget: BUDGET - cost };
}

function calculateScore(decisions) {
  const validation = validateScenario(decisions);
  if (!validation.valid) return { valid: false, errors: validation.errors, cost: validation.cost };

  const values = Object.fromEntries(
    Object.entries(DISTRICTS).map(([district, data]) => [district, Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== 'population'),
    )]),
  );
  const contributions = [];

  for (const decision of decisions) {
    const measure = MEASURES[decision.id];
    const realizedFraction = (HORIZON_QUARTERS - measure.lag) / HORIZON_QUARTERS;
    const targets = measure.district ? [decision.district] : Object.keys(DISTRICTS);
    const districtDeltas = {};
    for (const district of targets) {
      districtDeltas[district] = {};
      for (const [indicator, fullEffect] of Object.entries(measure.effects)) {
        const delta = fullEffect * realizedFraction;
        values[district][indicator] += delta;
        districtDeltas[district][indicator] = delta;
      }
    }
    contributions.push({ id: decision.id, name: measure.name, cost: measure.cost, realizedFraction, deltas: districtDeltas });
  }

  const synergies = [];
  const addSynergy = (left, right, district, indicator, amount) => {
    if (decisions.some((d) => d.id === left) && decisions.some((d) => d.id === right)) {
      values[district][indicator] += amount;
      synergies.push({ measures: [left, right], district, indicator, amount });
    }
  };
  // По условиям датасета синергия действует в районе первой меры пары и не масштабируется лагом.
  addSynergy('M1', 'M2', decisions.find((d) => d.id === 'M1')?.district, 'T1', 2);
  addSynergy('M10', 'M12', decisions.find((d) => d.id === 'M10')?.district, 'B1', 2);
  addSynergy('M5', 'M6', decisions.find((d) => d.id === 'M5')?.district, 'E2', 2);

  const districts = {};
  let weightedAverage = 0;
  let criticalCount = 0;
  for (const [district, indicators] of Object.entries(values)) {
    const clipped = Object.fromEntries(Object.entries(indicators).map(([key, value]) => [key, clamp(value, 0, 100)]));
    const score = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + clipped[key] * weight, 0);
    const critical = Object.entries(clipped).filter(([, value]) => value < 40).map(([key]) => key);
    criticalCount += critical.length;
    weightedAverage += score * DISTRICTS[district].population;
    districts[district] = { indicators: clipped, score, populationShare: DISTRICTS[district].population, criticalIndicators: critical };
  }
  const minimumDistrictScore = Math.min(...Object.values(districts).map((district) => district.score));
  const score = 0.7 * weightedAverage + 0.3 * minimumDistrictScore - criticalCount;

  return {
    valid: true,
    cost: validation.cost,
    remainingBudget: validation.remainingBudget,
    districts,
    weightedAverage,
    minimumDistrictScore,
    criticalCount,
    criticalPenalty: criticalCount,
    score,
    baselineScore: 52.56,
    scoreChangeFromBaseline: score - 52.56,
    synergies,
    contributions,
  };
}

module.exports = { BUDGET, DISTRICTS, WEIGHTS, MEASURES, validateScenario, calculateScore };

if (require.main === module) {
  // Пример допустимого сценария из документа «Датасет районов».
  const example = [
    { id: 'M7', district: 'Нура' },
    { id: 'M8', district: 'Нура' },
    { id: 'M10', district: 'Нура' },
    { id: 'M12' },
    { id: 'M5', district: 'Сарыарка' },
  ];
  const result = calculateScore(example);
  if (!result.valid) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    // Округление используется только при выводе; сам расчёт сохраняет точность.
    const number = (value) => value.toLocaleString('ru-RU', { maximumFractionDigits: 4 });
    console.log(`Итоговый балл качества жизни Астаны: ${number(result.score)}`);
    console.log(`Стоимость: ${result.cost} из ${BUDGET}. Остаток бюджета: ${result.remainingBudget}.`);
    console.log(`Средневзвешенная оценка города: ${number(result.weightedAverage)}`);
    console.log(`Минимальная оценка района: ${number(result.minimumDistrictScore)}`);
    console.log(`Критических показателей: ${result.criticalCount}. Штраф: ${result.criticalPenalty}.`);
    console.log(`Изменение относительно базового балла из документа (${number(result.baselineScore)}): ${number(result.scoreChangeFromBaseline)}`);
    console.log('\nРезультаты по районам:');
    for (const [district, data] of Object.entries(result.districts)) {
      console.log(`${district}: ${number(data.score)}; доля населения: ${number(data.populationShare * 100)}%.`);
      console.log(Object.entries(data.indicators).map(([key, value]) => `${key}: ${number(value)}`).join('; '));
      console.log(`Критические показатели: ${data.criticalIndicators.join(', ') || 'нет'}.`);
    }
    console.log('\nСработавшие синергии:');
    if (result.synergies.length === 0) console.log('Нет.');
    for (const synergy of result.synergies) {
      console.log(`${synergy.measures.join(' + ')}: район ${synergy.district}, ${synergy.indicator} +${number(synergy.amount)}.`);
    }
    console.log('\nЭффекты мероприятий с учётом лага (до ограничения показателей диапазоном 0–100):');
    for (const contribution of result.contributions) {
      console.log(`${contribution.id}: ${contribution.name}. Стоимость: ${contribution.cost}; реализованная доля эффекта: ${number(contribution.realizedFraction * 100)}%.`);
      for (const [district, deltas] of Object.entries(contribution.deltas)) {
        console.log(`${district}: ${Object.entries(deltas).map(([key, value]) => `${key} ${value >= 0 ? '+' : ''}${number(value)}`).join('; ')}.`);
      }
    }
  }
}
