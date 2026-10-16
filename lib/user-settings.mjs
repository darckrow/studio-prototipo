export const defaultProfile={name:'Usuário local',studioName:'Meu estúdio',role:'Editor & videomaker',email:'',accent:'lime',density:'comfortable',autoGoogleSync:true,formsUploadImages:false};
export function createUserSettings(db,{fail,object,text,boolean,transaction}){
 const get=(key,fallback=null)=>{const row=db.prepare('SELECT value FROM app_settings WHERE key=?').get(key);return row?JSON.parse(row.value):fallback};
 const set=(key,value)=>db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
 const remove=key=>db.prepare('DELETE FROM app_settings WHERE key=?').run(key);
 const profile=()=>({...defaultProfile,...get('profile',{})});
 const save=input=>transaction(()=>{const raw=object(input),previous=profile(),name=text(raw.name,'seu nome',120,true),studioName=text(raw.studioName,'o nome do estúdio',120,true),role=text(raw.role??'','sua função',120),email=text(raw.email??'','o e-mail',180);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Informe um e-mail válido.');const accent=raw.accent??previous.accent,density=raw.density??previous.density;if(!['lime','purple','blue'].includes(accent)||!['comfortable','compact'].includes(density))fail('Selecione preferências válidas.');const result={name,studioName,role,email,accent,density,autoGoogleSync:boolean(raw.autoGoogleSync??previous.autoGoogleSync),formsUploadImages:boolean(raw.formsUploadImages??previous.formsUploadImages)};set('profile',result);return {ok:true};});
 return {get,set,remove,profile,save};
}
