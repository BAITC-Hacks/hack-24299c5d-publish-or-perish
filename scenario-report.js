import { calculateScore, encodeScenario, MEASURES, DISTRICTS, WEIGHTS } from './score.js';

const label = d => `${d.id}: ${MEASURES[d.id].name} (${d.district || 'весь город'})`;
const fmt = n => n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
export const FORMULAS = {
 effect: 'Эффект меры = Δ × (8 − лаг) / 8. Затем применяются фиксированные бонусы синергий и ограничение показателей от 0 до 100.',
 district: 'Балл района = сумма произведений показателей на их веса.',
 total: 'Score = 0,7 × средний балл с учётом населения + 0,3 × минимальный балл района − число показателей ниже 40.',
 weights: WEIGHTS,
};

// Полный перебор допустимых одиночных замен, включая перенос меры в другой район.
// Каждая рекомендация применяется отдельно к исходным пяти решениям.
export function buildScenarioReport(decisions) {
 const current = calculateScore(decisions);
 if (!current.valid) throw new Error(current.errors.join(' '));
 const variants = Object.entries(MEASURES).flatMap(([id,m]) => m.district
  ? Object.keys(DISTRICTS).map(district => ({id,district})) : [{id}]);
 const replacements = [];
 let evaluated = 0;
 for (let index=0; index<decisions.length; index++) {
  const removed=decisions[index];
  for (const added of variants) {
   if (removed.id===added.id && removed.district===added.district) continue;
   const next=decisions.map((d,i)=>i===index?added:d);
   const result=calculateScore(next);
   if (!result.valid) continue;
   evaluated++;
   const gain=result.score-current.score;
   if (gain<=1e-9) continue;
   replacements.push({removed,added,removeLabel:label(removed),addLabel:label(added),
    code:encodeScenario(next),score:result.score,gain,cost:result.cost,
    weightedAverage:result.weightedAverage,minimumDistrictScore:result.minimumDistrictScore,
    criticalCount:result.criticalCount,synergies:result.synergies,
    components:{average:0.7*(result.weightedAverage-current.weightedAverage),
     minimum:0.3*(result.minimumDistrictScore-current.minimumDistrictScore),
     penalty:current.criticalCount-result.criticalCount}});
  }
 }
 replacements.sort((a,b)=>b.gain-a.gain || a.cost-b.cost || a.code.localeCompare(b.code));
 const recommendations=replacements.slice(0,3);
 const recommendationText = recommendations.map(r=>`Убрать ${r.removeLabel}. Добавить ${r.addLabel}. Балл ${fmt(current.score)} → ${fmt(r.score)} (+${fmt(r.gain)}), бюджет ${r.cost}/100. Вклад среднего: ${fmt(r.components.average)}, минимума: ${fmt(r.components.minimum)}, штрафа: ${fmt(r.components.penalty)}.`);
 const slides = [
  {title:'Ваш сценарий развития Астаны',lines:[`Итог: ${fmt(current.score)} балла`, `Изменение к исходному: ${fmt(current.scoreChangeFromBaseline)}`,`Бюджет: ${current.cost}/100. Горизонт: 8 кварталов.`, 'Данные симулятора являются синтетическими.']},
  {title:'Пять выбранных решений',lines:decisions.map(d=>`${label(d)}. Стоимость: ${MEASURES[d.id].cost}.`)},
  {title:'Результат по формулам',lines:[FORMULAS.total,`0,7 × ${fmt(current.weightedAverage)} + 0,3 × ${fmt(current.minimumDistrictScore)} − ${current.criticalCount} = ${fmt(current.score)} (значения округлены для показа).`,...Object.entries(current.districts).map(([name,d])=>`${name}: ${fmt(d.score)} балла`),`Действующих синергий: ${current.synergies.length}.`]},
  {title:'Возможное улучшение',lines:recommendations.length
   ? [recommendationText[0],`Проверено допустимых одиночных замен: ${evaluated}. Это лучшая одиночная замена, а не гарантия глобального максимума.`]
   : [`Среди ${evaluated} допустимых одиночных замен улучшений нет. Изменение нескольких мер одновременно может дать другой результат.`]},
 ];
 return {current, decisions:decisions.map(d=>({...d})), baseline:calculateScore([], {allowIncomplete:true}), code:encodeScenario(decisions),formulas:FORMULAS,evaluated,recommendations,recommendationText,slides};
}

const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
