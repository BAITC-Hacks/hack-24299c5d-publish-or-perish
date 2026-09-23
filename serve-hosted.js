// Тот же сайт и API на сервере Deno / в Docker. Секреты берутся из окружения.
import { serveLocal } from './serve-local.js';

export function createHostedHandler(env) {
 let origin;
 try {
  const parsed = new URL(env.PUBLIC_ORIGIN);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error();
  origin = parsed.origin;
 } catch { throw new Error('PUBLIC_ORIGIN должен содержать адрес сайта, например https://city.example.com, без пути.'); }
 const config = { OPENAI_API_KEY: env.OPENAI_API_KEY || '', OPENAI_MODEL: env.OPENAI_MODEL || 'gpt-4.1-mini' };
 // PUBLIC_ORIGIN учитывает внешний HTTPS, даже если прокси обращается по HTTP.
 return request => serveLocal(request, { publicOrigin: origin, readSettings: () => config });
}

if (import.meta.main) {
 const env = Object.fromEntries(['OPENAI_API_KEY','OPENAI_MODEL','PUBLIC_ORIGIN','PORT'].map(key=>[key,Deno.env.get(key)]));
 const port = Number(env.PORT || 8000);
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT должен быть числом от 1 до 65535.');
 const handler = createHostedHandler(env);
 Deno.serve({ hostname:'0.0.0.0', port,
  onListen:()=>console.log(`Сайт и API запущены на порту ${port}.`),
  onError:()=>Response.json({error:'Ошибка сервера.'},{status:500}),
 }, handler);
}
