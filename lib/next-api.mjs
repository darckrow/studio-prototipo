import {approvalDocument} from './approval-document.mjs';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createStore,AppError} from './storage.mjs';
const key=Symbol.for('studio.next.store');
function store(){return globalThis[key]??=createStore(resolve(/* turbopackIgnore: true */ process.env.STUDIO_DATA_DIR||'data'),join(process.cwd(),'migrations/0001_initial.sql'))}
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(request){try{
const url=new URL(request.url),host=request.headers.get('host'),port=process.env.PORT||'3000';
if(!['127.0.0.1:'+port,'localhost:'+port].includes(host))throw new AppError('Acesso permitido somente neste computador.',403);
if(request.method==='GET'&&url.pathname==='/api/google/callback')return await store().google.callback(request);
if(request.method==='GET'&&url.pathname==='/api/google/guide'){const file=await readFile(join(process.cwd(),'docs/guia-configuracao-google.md'));return new Response(file,{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename=guia-configuracao-google.md','Cache-Control':'no-store'}})}
if(request.method==='GET'&&url.pathname==='/api/data')return json(store().all());
if(request.method!=='POST')throw new AppError('Método não permitido.',405);
if(request.headers.get('origin')!=='http://'+host)throw new AppError('Origem da requisição não autorizada.',403);
if(url.pathname==='/api/backup'){const {file,name}=await store().createBackup();return new Response(await readFile(file),{headers:{'Content-Type':'application/vnd.sqlite3','Content-Disposition':'attachment; filename="'+name+'"','Cache-Control':'no-store'}})}
const s=store(),fn={'/api/clients':s.client,'/api/projects':s.project,'/api/tasks':s.task,'/api/demo':s.demo,'/api/planning':s.planning,'/api/production':s.production,'/api/profile':s.profile,'/api/google':data=>s.google.action(data,request)}[url.pathname];
if(!fn)throw new AppError('Recurso não encontrado.',404);
if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new AppError('Use uma requisição JSON.',415);
let bytes=0,chunks=[];for await(const chunk of request.body||[]){bytes+=chunk.length;if(bytes>(url.pathname==='/api/planning'?16*1024*1024:65536))throw new AppError('Requisição muito grande.',413);chunks.push(chunk)}
let data;try{data=JSON.parse(Buffer.concat(chunks).toString())}catch{throw new AppError('Requisição inválida.')}
const result=await fn(data);if(result instanceof Response)return result;if(url.pathname==='/api/planning'&&data.action==='export')return json({html:approvalDocument(result),planId:result.planId});return json(result);
}catch(e){if(!(e instanceof AppError)&&!e.publicMessage)console.error(e);return json({error:e instanceof AppError?e.message:e.publicMessage||'Não foi possível concluir a operação.'},e instanceof AppError||e.publicMessage?e.status||500:500)}}
