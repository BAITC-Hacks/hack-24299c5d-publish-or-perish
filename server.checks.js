// Запуск: deno run --no-config --no-lock --allow-read=. server.checks.js
// Все ответы OpenAI подменяются. Ключи и внешняя сеть не нужны.
import { serveLocal } from './serve-local.js';
import { createHostedHandler } from './serve-hosted.js';
import { compareCodes } from './comparison.js';
import { runAnalysisChecks } from './analysis.checks.js';
import { buildScenarioReport } from './scenario-report.js';
import { decodeScenario, calculateScore } from './score.js';

const assert=(value,message)=>{if(!value)throw new Error(message);};
const code='A1:5.2,7.4,8.4,10.4,12',other='A1:4.0,9.4,10.4,11.4,12';
const config={OPENAI_API_KEY:'mock-key',OPENAI_MODEL:'mock-model',PUBLIC_ORIGIN:'https://city.example.com'};
const originalFetch=globalThis.fetch;
let count=0;
try {
 globalThis.fetch=async(url,options)=>{
  assert(url==='https://api.openai.com/v1/responses','Неверный адрес OpenAI');
  const input=JSON.parse(JSON.parse(options.body).input);
  assert(input.comparisons.length===1,'Не передано сравнение');
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'Готово.'}]}]});
 };
 const routes=['/','/assets/results.js','/assets/results.css','/comparison.js','/challenge-demo.html','/challenge.js','/assets/challenge-ui.js','/assets/challenge.css','/assets/modes.css'];
 for(const [name,handler,base,origin] of [
  ['локальный',r=>serveLocal(r,{readSettings:()=>config}),'http://127.0.0.1:8765','http://127.0.0.1:8765'],
  ['хостинг',createHostedHandler(config),'http://container:8000',config.PUBLIC_ORIGIN],
 ]) {
  for(const path of routes){assert((await handler(new Request(base+path))).status===200,`${name}: ${path}`);count++;}
  for(const path of ['/.env.local','/.git/config','/.tools/deno/deno.exe','/serve-hosted.js']){assert((await handler(new Request(base+path))).status===404,`Открыт ${path}`);count++;}
  const status=await (await handler(new Request(base+'/api/status'))).json();
  assert(status.configured&&!JSON.stringify(status).includes('mock-key'),'Секрет в статусе');count++;
  const response=await handler(new Request(base+'/api/analyze',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({code,otherCodes:[other]})}));
  const data=await response.json();assert(response.status===200&&data.analysis==='Готово.'&&data.comparisons.length===1,'Ошибка API');count++;
  assert((await handler(new Request(base+'/api/analyze',{method:'POST',headers:{Origin:'https://foreign.example'}}))).status===403,'Не отклонён чужой Origin');count++;
 }
 const compared=compareCodes(code,' '+other+' ');
 assert(compared.others.length===1&&compared.others[0].difference===compared.others[0].result.score-compared.current.score,'Один код не сравнивается');count++;
 const report=buildScenarioReport(decodeScenario(code));
 assert(report.slides.length===4&&report.recommendations.length>0,'Неполный отчёт');count++;
 for(const recommendation of report.recommendations){const r=calculateScore(decodeScenario(recommendation.code));assert(r.valid&&r.score===recommendation.score&&r.score>report.current.score,'Недопустимая рекомендация');count++;}
 const apiChecks=await runAnalysisChecks();assert(apiChecks.every(r=>r.passed),JSON.stringify(apiChecks));count+=apiChecks.length;
 console.log(`Сервер, API и отчёт: ${count} проверок пройдено.`);
} finally {globalThis.fetch=originalFetch;}
