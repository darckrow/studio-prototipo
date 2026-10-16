import {createUserSettings} from './user-settings.mjs';
import {createGoogleIntegration} from './google-integration.mjs';
import {randomUUID} from 'node:crypto';
import {createPlanning} from './planning.mjs';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
export const stages=['Briefing','Em produção','Em aprovação','Concluído'];
export const services=['Vídeo','Social media','Design','Outro'];
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const fail=(message,status=400)=>{throw new AppError(message,status)};
function object(value){if(!value||typeof value!=='object'||Array.isArray(value))fail('Requisição inválida.');return value;}
function text(value,label,max=120,required=false){if(typeof value!=='string')fail('Informe '+label+'.');const v=value.trim();if((required&&!v)||v.length>max)fail(required&&!v?'Informe '+label+'.':label+' deve ter até '+max+' caracteres.');return v;}
function id(value){if(!Number.isSafeInteger(value)||value<=0)fail('Identificador inválido.');return value;}
function boolean(value){if(typeof value!=='boolean')fail('Valor inválido.');return value;}
function cents(value){if(!Number.isSafeInteger(value)||value<0||value>1000000000)fail('Informe um valor entre R$ 0 e R$ 10 milhões.');return value;}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'9999-12-31')fail('Informe uma data válida.');const d=new Date(value+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)fail('Informe uma data válida.');return value;}
export function createStore(folder,migrationFile=new URL('../migrations/0001_initial.sql',import.meta.url)){
 const dir=resolve(folder);mkdirSync(dir,{recursive:true});const db=new DatabaseSync(join(dir,'studio.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA trusted_schema=OFF;');
 const version=db.prepare('PRAGMA user_version').get().user_version;
 if(version>3){db.close();fail('Este banco exige uma versão mais recente do Studio.',500);}
 if(version>0&&version<3){const backups=join(dir,'backups');mkdirSync(backups,{recursive:true});const target=join(backups,'antes-migracao-v3-'+randomUUID()+'.sqlite');db.exec("VACUUM INTO '"+target.replaceAll("'","''")+"'");}
 for(const [target,file] of [[1,'0001_initial.sql'],[2,'0002_planning.sql'],[3,'0003_google_profile.sql']])if(version<target){db.exec('BEGIN IMMEDIATE');try{const path=migrationFile instanceof URL?new URL(file,migrationFile):join(resolve(migrationFile,'..'),file);db.exec(readFileSync(path,'utf8'));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');db.close();throw e}}
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}};
 const userSettings=createUserSettings(db,{fail,object,text,boolean,transaction});
 const features=createPlanning(db,{fail,object,text,id,boolean,validDate,transaction});
 const all=()=>({...features.all(),profile:userSettings.profile(),google:google.status(),clients:db.prepare('SELECT id,name,contact,email,phone,notes,archived,created_at AS createdAt FROM clients ORDER BY id DESC').all().map(c=>({...c,archived:!!c.archived})),projects:db.prepare('SELECT id,client_id AS clientId,title,service,stage,due_date AS dueDate,value_cents AS valueCents,paid_cents AS paidCents,notes,archived,published,published_date AS publishedDate,published_url AS publishedUrl,created_at AS createdAt FROM projects ORDER BY id DESC').all().map(p=>({...p,archived:!!p.archived,published:!!p.published})),tasks:db.prepare('SELECT id,project_id AS projectId,title,done FROM tasks ORDER BY id').all().map(t=>({...t,done:!!t.done}))});
 const client=input=>transaction(()=>{
 const raw=object(input),cid=raw.id===undefined?undefined:id(raw.id),name=text(raw.name,'o nome do cliente',120,true),contact=text(raw.contact??'','o contato'),email=text(raw.email??'','o e-mail',180),phone=text(raw.phone??'','o telefone',40),notes=text(raw.notes??'','as observações',4000),archived=boolean(raw.archived??false);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Informe um e-mail válido.');
 const existing=cid?db.prepare('SELECT * FROM clients WHERE id=?').get(cid):null;if(cid&&!existing)fail('Cliente não encontrado.',404);
 if(all().clients.some(c=>c.id!==cid&&c.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))fail('Já existe um cliente com este nome, inclusive entre os arquivados.',409);
 if(archived&&cid&&db.prepare("SELECT id FROM projects WHERE client_id=? AND archived=0 AND stage!='Concluído'").get(cid))fail('Conclua ou arquive os projetos ativos antes de arquivar o cliente.');
 if(cid)db.prepare('UPDATE clients SET name=?,contact=?,email=?,phone=?,notes=?,archived=? WHERE id=?').run(name,contact,email,phone,notes,Number(archived),cid);
 else return {id:Number(db.prepare('INSERT INTO clients(name,contact,email,phone,notes,archived,created_at) VALUES(?,?,?,?,?,?,?)').run(name,contact,email,phone,notes,Number(archived),new Date().toISOString()).lastInsertRowid)};
 return {id:cid};
 });
 const project=input=>transaction(()=>{
 const raw=object(input),pid=raw.id===undefined?undefined:id(raw.id),clientId=id(raw.clientId),title=text(raw.title,'o nome do projeto',120,true),service=text(raw.service,'o serviço'),stage=text(raw.stage,'a etapa'),dueDate=validDate(raw.dueDate),valueCents=cents(raw.valueCents),paidCents=cents(raw.paidCents),notes=text(raw.notes??'','o briefing',4000),archived=boolean(raw.archived??false);
 if(!services.includes(service)||!stages.includes(stage))fail('Selecione um serviço e uma etapa válidos.');if(paidCents>valueCents)fail('O valor recebido não pode superar o valor contratado.');
 const existing=pid?db.prepare('SELECT * FROM projects WHERE id=?').get(pid):null;if(pid&&!existing)fail('Projeto não encontrado.',404);
 if(pid&&db.prepare('SELECT i.id FROM plan_items i JOIN plans p ON p.id=i.plan_id WHERE i.project_id=? AND p.client_id!=?').get(pid,clientId))fail('Remova os vínculos com planejamentos antes de trocar o cliente do projeto.');
 if(existing?.published&&stage!=='Concluído')fail('Marque o projeto como não postado antes de reabrir a produção.');
 const c=db.prepare('SELECT * FROM clients WHERE id=?').get(clientId);if(!c)fail('Selecione um cliente cadastrado.');if(c.archived&&(!existing||existing.client_id!==clientId||(!archived&&existing.archived)))fail('Restaure o cliente antes de vincular ou restaurar projetos.');
 if(pid)db.prepare('UPDATE projects SET client_id=?,title=?,service=?,stage=?,due_date=?,value_cents=?,paid_cents=?,notes=?,archived=? WHERE id=?').run(clientId,title,service,stage,dueDate,valueCents,paidCents,notes,Number(archived),pid);
 else return {id:Number(db.prepare('INSERT INTO projects(client_id,title,service,stage,due_date,value_cents,paid_cents,notes,archived,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(clientId,title,service,stage,dueDate,valueCents,paidCents,notes,Number(archived),new Date().toISOString()).lastInsertRowid)};
 return {id:pid};
 });
 const task=input=>transaction(()=>{
 const raw=object(input);if(raw.action==='create'){const projectId=id(raw.projectId),title=text(raw.title,'o nome da tarefa',120,true);const p=db.prepare('SELECT * FROM projects WHERE id=?').get(projectId);if(!p||p.archived)fail('Selecione um projeto não arquivado.');return {id:Number(db.prepare('INSERT INTO tasks(project_id,title,done) VALUES(?,?,0)').run(projectId,title).lastInsertRowid)}}
 if(!['toggle','delete'].includes(raw.action))fail('Operação de tarefa inválida.');const tid=id(raw.id),t=db.prepare('SELECT * FROM tasks WHERE id=?').get(tid);if(!t)fail('Tarefa não encontrada.',404);const p=db.prepare('SELECT archived FROM projects WHERE id=?').get(t.project_id);if(p.archived)fail('Restaure o projeto para alterar tarefas.');if(raw.action==='toggle')db.prepare('UPDATE tasks SET done=? WHERE id=?').run(Number(boolean(raw.done)),tid);else db.prepare('DELETE FROM tasks WHERE id=?').run(tid);return {ok:true};
 });
 const demo=()=>transaction(()=>{
 if(db.prepare('SELECT id FROM clients LIMIT 1').get()||db.prepare('SELECT id FROM projects LIMIT 1').get())fail('Carregue exemplos somente em uma base vazia.',409);
 const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-')};
 for(const [i,[name,contact,title,service,stage,value,paid,offset]] of [['Aurora Beauty','Marina Costa','Campanha de lançamento','Vídeo','Em produção',180000,90000,0],['Café Origem','Pedro Lima','Planejamento do próximo mês','Social media','Briefing',185000,0,4],['Forma Studio','Ana Reis','Reels · Nova coleção','Vídeo','Em aprovação',100000,100000,1]].entries()){
 const cid=db.prepare('INSERT INTO clients(name,contact,email,phone,notes,created_at) VALUES(?,?,?,?,?,?)').run(name,contact,'contato'+i+'@example.com','','Cliente de exemplo.',new Date().toISOString()).lastInsertRowid;
 const pid=db.prepare('INSERT INTO projects(client_id,title,service,stage,due_date,value_cents,paid_cents,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(cid,title,service,stage,day(offset),value,paid,'Projeto de exemplo. Edite os dados para explorar o fluxo.',new Date().toISOString()).lastInsertRowid;
 for(const [title,done] of [['Receber briefing',1],['Produzir primeira versão',stage==='Em aprovação'?1:0],['Revisar e entregar',0]])db.prepare('INSERT INTO tasks(project_id,title,done) VALUES(?,?,?)').run(pid,title,done);
 }return {ok:true};
 });
 const createBackup=async()=>{const folder=join(dir,'backups');mkdirSync(folder,{recursive:true});const name='studio-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';const file=join(folder,name);await backup(db,file);return {file,name}};
 const google=createGoogleIntegration({db,dir,settings:userSettings,all});
 return {all,client,project,task,demo,profile:userSettings.save,google,planning:features.planning,production:features.production,createBackup,close:()=>db.close(),dir};
}
