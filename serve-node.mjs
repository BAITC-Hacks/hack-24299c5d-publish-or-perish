// Node.js 22+: reuse the same routes and explicit public-file allowlist as Deno.
import http from 'node:http';
import fs from 'node:fs/promises';
class NotFound extends Error {}
async function readFile(path) {
 try { return await fs.readFile(path); }
 catch(error) { if(error.code==='ENOENT')throw new NotFound();throw error; }
}
globalThis.Deno={readFile,readTextFile:async path=>(await readFile(path)).toString('utf8'),errors:{NotFound}};
const {serveLocal}=await import('./serve-local.js');
const port=Number(process.env.PORT||8765);
http.createServer(async (incoming,outgoing)=>{
 try {
  const chunks=[];let size=0;
  for await(const chunk of incoming){size+=chunk.length;if(size>65536){outgoing.writeHead(413);outgoing.end('Запрос слишком большой');return;}chunks.push(chunk);}
  const method=incoming.method||'GET';
  const request=new Request(`http://127.0.0.1:${port}${incoming.url}`,{method,headers:incoming.headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});
  const response=await serveLocal(request);
  outgoing.writeHead(response.status,Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
 }catch{outgoing.writeHead(500,{'Content-Type':'application/json; charset=utf-8'});outgoing.end(JSON.stringify({error:'Ошибка локального сервера.'}));}
}).listen(port,'127.0.0.1',()=>console.log(`Сайт запущен: http://127.0.0.1:${port}/`));
