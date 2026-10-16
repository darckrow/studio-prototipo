import next from 'next';
import {createServer} from 'node:http';
import {open,unlink} from 'node:fs/promises';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||3000),dir=resolve(process.env.STUDIO_DATA_DIR||join(root,'data'));
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT inválida.');
mkdirSync(dir,{recursive:true});const lockPath=join(dir,'studio.lock');
if(existsSync(lockPath)){let running=true;try{const pid=Number(readFileSync(lockPath,'utf8'));if(!Number.isInteger(pid)||pid<=0)throw new Error();process.kill(pid,0)}catch{running=false}if(running)throw new Error('O Studio já está aberto. Acesse http://127.0.0.1:'+port);await unlink(lockPath)}
const lock=await open(lockPath,'wx');await lock.writeFile(String(process.pid));await lock.close();

const app=next({dev:process.argv.includes('--dev'),hostname:'127.0.0.1',port});
let server;
try{await app.prepare();const handler=app.getRequestHandler();server=createServer((req,res)=>{if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Acesso permitido somente neste computador.'}));return}res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');handler(req,res)});server.on('error',async e=>{console.error(e);await unlink(lockPath).catch(()=>{});process.exit(1)});server.listen(port,'127.0.0.1',()=>console.log('Studio Next.js aberto em http://127.0.0.1:'+port));}catch(e){await unlink(lockPath).catch(()=>{});throw e}
let closing=false;async function stop(){if(closing)return;closing=true;server.close(async()=>{await app.close();await unlink(lockPath).catch(()=>{});process.exit(0)});setTimeout(async()=>{await unlink(lockPath).catch(()=>{});process.exit(0)},4000).unref()}process.on('SIGINT',stop);process.on('SIGTERM',stop);
