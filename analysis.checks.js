// Подмена сети: проверки не отправляют данные в OpenAI и не расходуют средства.
import { handleAnalysis } from './analysis-api.js';
import { analyzeScenario } from './analysis.js';
import { decodeScenario } from './score.js';

export async function runAnalysisChecks() {
  const results = [];
  const assert = (value) => { if (!value) throw new Error('Условие не выполнено'); };
  const code = 'A1:5.2,7.4,8.4,10.4,12';
  const other = 'A1:4.0,9.4,10.4,11.4,12';
  const request = (body) => new Request('https://example.test/api/analyze', { method: 'POST', body: JSON.stringify(body) });
  const env = { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' };
  const originalFetch = globalThis.fetch;
  const check = async (name, run) => {
    try { await run(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  };
  try {
    await check('API повторно считает баллы, сравнивает коды и убирает повторы', async () => {
      let payload;
      globalThis.fetch = async (url, options) => {
        assert(url === 'https://api.openai.com/v1/responses');
        payload = JSON.parse(options.body);
        return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: 'Краткий анализ.' }] }] });
      };
      const response = await handleAnalysis(request({ code, otherCodes: [other, other, code], score: 999 }), env);
      const data = await response.json();
      assert(response.status === 200 && Math.abs(data.score - 56.54307) < 1e-9);
      assert(data.analysis === 'Краткий анализ.' && data.comparisons.length === 1);
      const input = JSON.parse(payload.input);
      assert(input.current.score === data.score && payload.store === false);
      assert(data.comparisons[0].differenceFromCurrent === data.comparisons[0].score - data.score);
    });
    await check('Неполный набор и отсутствие настройки не вызывают ИИ', async () => {
      globalThis.fetch = () => { throw new Error('Не должно быть сетевого запроса'); };
      assert((await handleAnalysis(request({ code: 'A1:12' }), env)).status === 400);
      assert((await handleAnalysis(request({ code }), {})).status === 503);
      assert((await handleAnalysis(request({ code, otherCodes: Array(11).fill(other) }), env)).status === 400);
    });
    await check('Ошибка и незавершённый ответ ИИ не выдаются за готовый анализ', async () => {
      globalThis.fetch = async () => Response.json({}, { status: 429 });
      assert((await handleAnalysis(request({ code }), env)).status === 502);
      globalThis.fetch = async () => Response.json({ status: 'incomplete', output: [] });
      assert((await handleAnalysis(request({ code }), env)).status === 502);
    });
    await check('Браузер отправляет только коды и передаёт отмену запроса', async () => {
      const controller = new AbortController();
      globalThis.fetch = async (url, options) => {
        assert(url === '/api/analyze' && options.signal === controller.signal);
        assert(JSON.stringify(JSON.parse(options.body)) === JSON.stringify({ code, otherCodes: [other] }));
        assert(!options.headers.Authorization);
        return Response.json({ code, analysis: 'Готово.' });
      };
      assert((await analyzeScenario(decodeScenario(code), [other], { signal: controller.signal })).analysis === 'Готово.');
    });
  } finally { globalThis.fetch = originalFetch; }
  return results;
}
