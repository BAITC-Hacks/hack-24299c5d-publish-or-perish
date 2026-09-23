import { decodeScenario, encodeScenario, calculateScore } from './score.js';

// Один вручную введённый код достаточен. Запятые внутри кода сохраняются.
export function compareCodes(currentCode, input) {
 const codes = input.trim().split(/[\s;]+/).filter(Boolean);
 if (codes.length > 10) throw new Error('Допускается до 10 кодов.');
 const current = calculateScore(decodeScenario(currentCode));
 const unique = new Map();
 codes.forEach((code,index) => {
  try {
   const decisions = decodeScenario(code), canonical = encodeScenario(decisions);
   if (!unique.has(canonical)) {
    const result = calculateScore(decisions);
    unique.set(canonical, { code:canonical, result, difference:result.score-current.score });
   }
  } catch { throw new Error(`Код №${index+1} некорректен. Вставьте полный код пяти допустимых решений, начиная с A1:.`); }
 });
 return { current, others:[...unique.values()] };
}
