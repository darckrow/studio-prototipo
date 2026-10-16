import {randomBytes} from 'node:crypto';

export const productionSteps = ['Briefing','Roteiro','Aprovação do roteiro','Gravação','Edição','Aprovação do filme completo','Finalizado'];
export const formats = ['Reel','Story','Carrossel','Post','Vídeo','Outro'];
export const channels = ['Instagram','TikTok','YouTube','Facebook','LinkedIn','Outro'];

export function createPlanning(db, {fail, object, text, id, boolean, validDate, transaction}) {
 const url = value => {
  const v = text(value ?? '', 'o link', 2000);
  if(v) { let parsed; try { parsed = new URL(v); } catch { fail('Informe um link HTTP ou HTTPS válido.'); }
   if(!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('Informe um link HTTP ou HTTPS válido.'); }
  return v;
 };
 const planRow = pid => {const p=db.prepare('SELECT * FROM plans WHERE id=?').get(id(pid));if(!p)fail('Planejamento não encontrado.',404);return p;};
 const editablePlan = pid => {const p=planRow(pid);if(db.prepare('SELECT archived FROM clients WHERE id=?').get(p.client_id).archived)fail('Restaure o cliente para alterar o planejamento.');return p;};
 const invalidate = (pid,forms=true) => {db.prepare("UPDATE plan_exports SET active=0,snapshot='{}' WHERE plan_id=?").run(pid);if(forms)db.prepare("UPDATE google_forms SET status='desatualizado' WHERE plan_id=? AND status='publicado'").run(pid);};
 const all = () => ({
  plans:db.prepare('SELECT id,client_id AS clientId,week_start AS weekStart,title,instructions,created_at AS createdAt FROM plans ORDER BY week_start DESC,id DESC').all(),
  planItems:db.prepare('SELECT id,plan_id AS planId,project_id AS projectId,title,publish_date AS publishDate,format,channel,caption,thumbnail,material_url AS materialUrl,revision,status,feedback,reviewer,reviewed_at AS reviewedAt FROM plan_items ORDER BY publish_date,id').all(),
  productionSteps:db.prepare('SELECT project_id AS projectId,step,done FROM production_steps').all().map(s=>({...s,done:!!s.done}))
 });
 const planning = input => transaction(() => {
  const raw=object(input);
  if(raw.action==='savePlan') {
   const pid=raw.id===undefined?undefined:id(raw.id),clientId=id(raw.clientId),weekStart=validDate(raw.weekStart),title=text(raw.title,'o título',120,true),instructions=text(raw.instructions??'','a orientação',4000);
   if(weekStart>'9999-12-25'||new Date(weekStart+'T12:00:00Z').getUTCDay()!==1)fail('Selecione uma semana válida que comece na segunda-feira.');
   const c=db.prepare('SELECT * FROM clients WHERE id=?').get(clientId);if(!c||c.archived)fail('Selecione um cliente ativo.');
   if(db.prepare('SELECT id FROM plans WHERE client_id=? AND week_start=? AND id!=?').get(clientId,weekStart,pid??0))fail('Já existe planejamento para este cliente nesta semana.',409);
   if(pid){const previous=editablePlan(pid);if((previous.client_id!==clientId||previous.week_start!==weekStart)&&db.prepare('SELECT id FROM plan_items WHERE plan_id=? LIMIT 1').get(pid))fail('Cliente e semana não podem mudar após adicionar conteúdos.');
    db.prepare('UPDATE plans SET client_id=?,week_start=?,title=?,instructions=? WHERE id=?').run(clientId,weekStart,title,instructions,pid);invalidate(pid);return {id:pid};}
   return {id:Number(db.prepare('INSERT INTO plans(client_id,week_start,title,instructions,created_at) VALUES(?,?,?,?,?)').run(clientId,weekStart,title,instructions,new Date().toISOString()).lastInsertRowid)};
  }
  if(raw.action==='saveItem') {
   const planId=id(raw.planId),plan=editablePlan(planId),iid=raw.id===undefined?undefined:id(raw.id),previous=iid?db.prepare('SELECT * FROM plan_items WHERE id=? AND plan_id=?').get(iid,planId):null;
   if(iid&&!previous)fail('Conteúdo não encontrado.',404);
   if(!iid&&db.prepare('SELECT count(*) AS n FROM plan_items WHERE plan_id=?').get(planId).n>=30)fail('O planejamento aceita até 30 conteúdos.');
   const title=text(raw.title,'o título',120,true),publishDate=validDate(raw.publishDate),format=text(raw.format,'o formato',40,true),channel=text(raw.channel,'o canal',40,true),caption=text(raw.caption??'','a legenda',8000),materialUrl=url(raw.materialUrl);
   const end=new Date(plan.week_start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);
   if(publishDate<plan.week_start||publishDate>end.toISOString().slice(0,10))fail('A data do conteúdo deve estar dentro da semana do planejamento.');
   if(!formats.includes(format)||!channels.includes(channel))fail('Selecione um formato e um canal válidos.');
   const projectId=raw.projectId===null||raw.projectId===undefined||raw.projectId===''?null:id(raw.projectId);
   if(projectId){const p=db.prepare('SELECT * FROM projects WHERE id=?').get(projectId);if(!p||p.client_id!==plan.client_id)fail('O projeto deve pertencer ao mesmo cliente.');if(p.archived&&previous?.project_id!==projectId)fail('Selecione um projeto ativo.');}
   const thumbnail=raw.thumbnail??'';
   if(typeof thumbnail!=='string'||(thumbnail&&(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(thumbnail)||Buffer.byteLength(thumbnail.split(',')[1],'base64')>350*1024)))fail('Use uma miniatura PNG, JPEG ou WebP de até 350 KB.');
   if(thumbnail){const bytes=Buffer.from(thumbnail.split(',')[1],'base64'),type=thumbnail.slice(11,thumbnail.indexOf(';'));const valid=type==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)fail('O arquivo da miniatura não corresponde ao formato informado.');}
   const args=[projectId,title,publishDate,format,channel,caption,thumbnail,materialUrl];
   if(previous){const old=[previous.project_id,previous.title,previous.publish_date,previous.format,previous.channel,previous.caption,previous.thumbnail,previous.material_url];if(JSON.stringify(old)===JSON.stringify(args))return {id:iid};
    db.prepare("UPDATE plan_items SET project_id=?,title=?,publish_date=?,format=?,channel=?,caption=?,thumbnail=?,material_url=?,revision=revision+1,status='rascunho',feedback='',reviewer='',reviewed_at='' WHERE id=?").run(...args,iid);invalidate(planId);return {id:iid};}
   const result=db.prepare('INSERT INTO plan_items(plan_id,project_id,title,publish_date,format,channel,caption,thumbnail,material_url) VALUES(?,?,?,?,?,?,?,?,?)').run(planId,...args);invalidate(planId);return {id:Number(result.lastInsertRowid)};
  }
  if(raw.action==='deleteItem'){const iid=id(raw.id),item=db.prepare('SELECT * FROM plan_items WHERE id=?').get(iid);if(!item)fail('Conteúdo não encontrado.',404);editablePlan(item.plan_id);db.prepare('DELETE FROM plan_items WHERE id=?').run(iid);invalidate(item.plan_id);return {ok:true};}
  if(raw.action==='export'){
   const plan=editablePlan(raw.planId),items=all().planItems.filter(i=>i.planId===plan.id);if(!items.length)fail('Adicione conteúdos antes de enviar para aprovação.');
   const token=randomBytes(32).toString('hex'),snapshot={schema:1,token,planId:plan.id,clientName:db.prepare('SELECT name FROM clients WHERE id=?').get(plan.client_id).name,title:plan.title,instructions:plan.instructions,weekStart:plan.week_start,items:items.map(i=>({id:i.id,revision:i.revision,title:i.title,publishDate:i.publishDate,format:i.format,channel:i.channel,caption:i.caption,thumbnail:i.thumbnail,materialUrl:i.materialUrl,status:i.status}))};
   invalidate(plan.id,false);db.prepare('INSERT INTO plan_exports(token,plan_id,snapshot,created_at) VALUES(?,?,?,?)').run(token,plan.id,JSON.stringify(snapshot),new Date().toISOString());
   db.prepare("UPDATE plan_items SET status='pendente' WHERE plan_id=? AND status!='aprovado'").run(plan.id);return snapshot;
  }
  if(raw.action==='import'){
   const reply=object(raw.response),plan=editablePlan(raw.planId);if(reply.schema!==1||reply.planId!==plan.id||typeof reply.token!=='string'||reply.token.length!==64)fail('Arquivo de respostas inválido ou de outro planejamento.');
   const sent=db.prepare('SELECT * FROM plan_exports WHERE token=? AND plan_id=?').get(reply.token,plan.id);if(!sent||!sent.active||sent.imported)fail('Este envio foi substituído, já foi importado ou não pertence ao planejamento.',409);
   const reviewer=text(reply.reviewer,'o nome de quem aprovou',120,true),snapshot=JSON.parse(sent.snapshot);
   if(!Array.isArray(reply.items)||!reply.items.length||reply.items.length>30)fail('O arquivo precisa conter ao menos uma resposta.');
   const seen=new Set(),decisions=[];
   for(const answer of reply.items){object(answer);const iid=id(answer.id);if(seen.has(iid))fail('O arquivo possui respostas duplicadas.');seen.add(iid);
    const original=snapshot.items.find(i=>i.id===iid),current=db.prepare('SELECT * FROM plan_items WHERE id=? AND plan_id=?').get(iid,plan.id);
    if(!original||!current||answer.revision!==original.revision||current.revision!==original.revision)fail('Um conteúdo mudou desde o envio. Gere um novo arquivo de aprovação.',409);
    if(!['aprovado','ajustes'].includes(answer.status))fail('Resposta de aprovação inválida.');const feedback=text(answer.feedback??'','o comentário',4000,answer.status==='ajustes');decisions.push({iid,status:answer.status,feedback});}
   const now=new Date().toISOString();for(const d of decisions)db.prepare('UPDATE plan_items SET status=?,feedback=?,reviewer=?,reviewed_at=? WHERE id=?').run(d.status,d.feedback,reviewer,now,d.iid);
   db.prepare('UPDATE plan_exports SET imported=1 WHERE token=?').run(reply.token);return {ok:true,count:decisions.length};
  }
  fail('Operação de planejamento inválida.');
 });
 const production=input=>transaction(()=>{
  const raw=object(input),pid=id(raw.projectId),p=db.prepare('SELECT * FROM projects WHERE id=?').get(pid);if(!p)fail('Projeto não encontrado.',404);if(p.archived)fail('Restaure o projeto para alterar a produção.');
  if(raw.action==='publish'){
   const published=boolean(raw.published),date=published&&raw.publishedDate?validDate(raw.publishedDate):'',link=published?url(raw.publishedUrl):'';
   if(published&&p.stage!=='Concluído')fail('Finalize o projeto antes de marcar como postado.');
   db.prepare('UPDATE projects SET published=?,published_date=?,published_url=? WHERE id=?').run(Number(published),date,link,pid);return {ok:true};
  }
  if(raw.action!=='step'||!productionSteps.includes(raw.step))fail('Etapa de produção inválida.');const done=boolean(raw.done);
  const checked=new Set(db.prepare('SELECT step FROM production_steps WHERE project_id=? AND done=1').all(pid).map(s=>s.step));
  if(raw.step==='Finalizado'&&done&&productionSteps.slice(0,6).some(s=>!checked.has(s)))fail('Conclua as etapas anteriores antes de finalizar.');
  if(p.published&&!done)fail('Marque o projeto como não postado antes de reabrir a produção.');
  db.prepare('INSERT INTO production_steps(project_id,step,done) VALUES(?,?,?) ON CONFLICT(project_id,step) DO UPDATE SET done=excluded.done').run(pid,raw.step,Number(done));
  if(done)checked.add(raw.step);else{checked.delete(raw.step);checked.delete('Finalizado');db.prepare("UPDATE production_steps SET done=0 WHERE project_id=? AND step='Finalizado'").run(pid);}
  const next=productionSteps.find(s=>!checked.has(s)),stage=!next?'Concluído':next==='Briefing'?'Briefing':next.startsWith('Aprovação')?'Em aprovação':'Em produção';
  if(p.published&&stage!=='Concluído')fail('Marque o projeto como não postado antes de reabrir a produção.');
  db.prepare('UPDATE projects SET stage=? WHERE id=?').run(stage,pid);return {ok:true};
 });
 return {all,planning,production};
}
