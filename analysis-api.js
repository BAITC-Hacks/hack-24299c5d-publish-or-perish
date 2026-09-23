// Серверный JavaScript на стандартных Request/Response/fetch, без API Node.js.
// Подключите обработчик к POST /api/analyze; секрет и модель передайте через env.
import { calculateScore, decodeScenario, encodeScenario, MEASURES } from './score.js';

function summarize(code) {
  const decisions = decodeScenario(code);
  const result = calculateScore(decisions);
  return { code: encodeScenario(decisions), score: result.score, cost: result.cost,
    scoreChangeFromBaseline: result.scoreChangeFromBaseline, criticalCount: result.criticalCount,
    measures: decisions.map((d) => ({ ...d, name: MEASURES[d.id].name })),
    districts: result.districts, synergies: result.synergies };
}

export async function handleAnalysis(request, env) {
  const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (new URL(request.url).pathname !== '/api/analyze') return json({ error: 'Маршрут не найден.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Используйте POST.' }, 405);
  let current, comparisons;
  try {
    const { code, otherCodes = [] } = await request.json();
    if (!Array.isArray(otherCodes) || otherCodes.length > 10) throw new Error('Допускается не более 10 кодов для сравнения.');
    current = summarize(code);
    comparisons = [...new Map(otherCodes.map((code) => {
      const item = summarize(code);
      return [item.code, { ...item, differenceFromCurrent: item.score - current.score }];
    })).values()].filter((item) => item.code !== current.code);
  } catch (error) { return json({ error: `Некорректный сценарий: ${error.message}` }, 400); }
  if (!env?.OPENAI_API_KEY || !env?.OPENAI_MODEL) return json({ error: 'Сервис анализа ещё не настроен.' }, 503);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.OPENAI_MODEL, store: false, max_output_tokens: 1800,
        instructions: 'Ты аналитик симулятора «Аким на 5 часов». Ответь по-русски, до 150 слов. Объясни сильные стороны, риски и синергии текущего набора. Сравни его с переданными сценариями, обозначая их кодами. Все числа уже рассчитаны: используй их без пересчёта и выдуманных данных. differenceFromCurrent — балл другого сценария минус текущий. Если comparisons пуст, сообщи, что других результатов нет. Данные являются синтетическими, не делай выводов о реальном городе.',
        input: JSON.stringify({ current, comparisons }),
      }),
    });
    if (!response.ok) return json({ error: 'ИИ временно недоступен. Повторите запрос позже.' }, 502);
    const data = await response.json();
    const analysis = (data.output ?? []).flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text').map((item) => item.text).join('\n').trim();
    if (data.status !== 'completed' || !analysis) return json({ error: 'ИИ не завершил анализ. Повторите запрос позже.' }, 502);
    return json({ code: current.code, score: current.score, analysis,
      comparisons: comparisons.map(({ code, score, differenceFromCurrent }) => ({ code, score, differenceFromCurrent })) });
  } catch { return json({ error: 'Не удалось получить ответ ИИ. Повторите запрос позже.' }, 502); }
}

// Совместимо с модульным обработчиком Worker; браузер этот файл не импортирует.
export default { fetch: handleAnalysis };
