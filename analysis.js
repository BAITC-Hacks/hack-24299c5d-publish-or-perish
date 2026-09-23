import { encodeScenario, decodeScenario } from './score.js';

// Вызывать после подтверждения пяти мер. Ключа API в браузере нет.
export async function analyzeScenario(decisions, otherCodes = [], { signal } = {}) {
  const code = encodeScenario(decisions);
  if (!Array.isArray(otherCodes) || otherCodes.length > 10) throw new TypeError('Передайте не более 10 кодов для сравнения.');
  otherCodes.forEach(decodeScenario);
  const response = await fetch('/api/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ code, otherCodes }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Сервис анализа недоступен.');
  if (typeof data.analysis !== 'string' || !data.analysis.trim()) throw new Error('Сервис вернул пустой анализ.');
  return data;
}
