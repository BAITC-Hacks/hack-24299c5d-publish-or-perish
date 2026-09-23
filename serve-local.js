// Локальный сервер JavaScript для Deno. Node.js не требуется.
import { handleAnalysis } from './analysis-api.js';

const files = new Set([
  'assets/tutorial.js', 'assets/tutorial.css',
  'challenge-demo.html', 'challenge.js', 'assets/challenge-ui.js', 'assets/challenge.css', 'assets/modes.css',
  'index.html', 'assets/game.js', 'assets/game.css', 'assets/results.js', 'assets/results.css', 'game.checks.js',
  'example.html', 'checks.html', 'score.js', 'score.checks.js',
  'scenario-picker.js', 'scenario-picker.css', 'analysis.js',
  'analysis.checks.js', 'analysis-api.js', 'scenario-report.js', 'comparison.js',
  'ruiling-city/images/esil.png',
  ...['card-ecology', 'card-safety', 'card-services', 'card-social', 'card-transport'].map((name) => `ruiling-city/images/${name}.png`),
]);
const types = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png' };
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function settings() {
  let source = '';
  try { source = await Deno.readTextFile(new URL('./.env.local', import.meta.url)); }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
  const env = { OPENAI_API_KEY: '', OPENAI_MODEL: 'gpt-4.1-mini' };
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*(OPENAI_API_KEY|OPENAI_MODEL)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return env;
}

// Источник настроек заменяется сервером хостинга; маршруты остаются общими.
export async function serveLocal(request, { readSettings = settings, publicOrigin } = {}) {
  const url = new URL(request.url);
  if (request.headers.has('Origin') && request.headers.get('Origin') !== (publicOrigin || url.origin)) {
    return json({ error: 'Запрос разрешён только со страницы этого сайта.' }, 403);
  }
  if (url.pathname === '/api/status') {
    const env = await readSettings();
    return json({ configured: Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL), model: env.OPENAI_MODEL });
  }
  if (url.pathname === '/api/analyze') {
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Ожидается JSON.' }, 415);
    return handleAnalysis(request, await readSettings());
  }
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Метод не разрешён.', { status: 405 });
  const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!files.has(path)) return new Response('Файл не найден.', { status: 404 });
  try {
    const bytes = await Deno.readFile(new URL(path, import.meta.url));
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: { 'Content-Type': types[path.split('.').pop()], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch { return new Response('Файл не найден.', { status: 404 }); }
}

if (import.meta.main) Deno.serve({
  hostname: '127.0.0.1', port: 8765,
  onListen: () => console.log('Сайт запущен: http://127.0.0.1:8765/'),
  onError: () => json({ error: 'Ошибка локального сервера. Проверьте файл настроек.' }, 500),
}, serveLocal);
