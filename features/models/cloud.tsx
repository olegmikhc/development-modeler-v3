'use client';
import {appPath} from '@/lib/app-path';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {saveCloudModel} from '@/lib/save-cloud-model';
import {useCloudState} from '@/lib/cloud-sync-state';
import {stableJSON} from '@/lib/stable-json';
import {useModels} from '@/store/model-store';
import {mergeCloudModels} from '@/lib/merge-cloud-models';
import {Field} from '@/components/ui/controls';
export function CloudSettings({notify}:{notify:(s:string)=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[user,setUser]=useState<string|null>(null),[busy,setBusy]=useState(false);
 const sb=supabase(),store=useModels();
 useEffect(()=>{if(!sb)return;void sb.auth.getUser().then(({data})=>setUser(data.user?.email||null));const {data}=sb.auth.onAuthStateChange((_,s)=>setUser(s?.user.email||null));return()=>data.subscription.unsubscribe()},[sb]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn()}catch(e){notify(e&&typeof e==='object'&&'message' in e?String(e.message):String(e))}finally{setBusy(false)}};
 const load=async()=>{
  const {data:{user}}=await sb!.auth.getUser();if(!user)throw Error('Войдите в аккаунт.');
  const {data:rows,error}=await sb!.from('financial_models').select('id,data,revision,organization_id');if(error)throw error;
  const editable=[];
  for(const row of rows||[]){const {data:allowed,error}=await sb!.rpc('edits_model',{mid:row.id});if(error)throw error;if(allowed)editable.push(row);}
  const models=mergeCloudModels([],editable.map(r=>r.data)).models;
  store.loadCloud(models);
  for(const row of editable){const model=models.find(m=>m.id===row.id)!;useCloudState.getState().remember(row.id,{userId:user.id,revision:row.revision,org:row.organization_id,snapshot:stableJSON(model)});useCloudState.getState().status(row.id,'Сохранено в облаке');}
  window.dispatchEvent(new Event('model-cloud-saved'));notify(models.length?'Облачные версии загружены. Прежние локальные версии сохранены в истории.':'В облаке пока нет моделей для редактирования.');
 };
 return <section className="card"><h2>Облачный аккаунт</h2>{!sb?<p>Облако не настроено.</p>:user?<><p>Вы вошли как <strong>{user}</strong></p><p>Облачные модели загружаются при входе. Изменения синхронизируются автоматически. Модели, которые пока только на этом устройстве, нужно один раз сохранить в аккаунт.</p><div className="row" style={{marginTop:20,flexWrap:'wrap'}}>
 <button className="btn dark" disabled={busy} onClick={()=>run(async()=>{const errors:string[]=[];for(const model of useModels.getState().models){try{await saveCloudModel(structuredClone(model))}catch(e){errors.push(model.name+': '+(e&&typeof e==='object'&&'message' in e?String(e.message):String(e)))}}if(errors.length)throw Error(errors.join('\n'));notify('Все модели сохранены в облаке.');})}>Сохранить модели этого устройства в аккаунт</button>
 <button className="btn" disabled={busy} onClick={()=>run(load)}>Загрузить облачные версии</button><a className="btn" href={appPath('/invited/')}>Доступные мне модели</a><button className="btn" disabled={busy} onClick={()=>run(async()=>{const {error}=await sb.auth.signOut();if(error)throw error;notify('Вы вышли. Локальные копии остаются на этом устройстве.');})}>Выйти</button></div></>:<div className="stack"><p>Войдите, чтобы хранить модели в облаке и работать с приглашениями по email.</p><button className="btn dark" disabled={busy} onClick={()=>run(async()=>{const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+appPath('/'),queryParams:{prompt:'select_account'}}});if(error)throw error;})}>Войти через Google</button><Field label="Email" type="email" value={email} onChange={setEmail}/><Field label="Пароль" type="password" value={password} onChange={setPassword}/><div className="row"><button className="btn" disabled={busy} onClick={()=>run(async()=>{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;window.location.assign(appPath('/'));})}>Войти с паролем</button></div></div>}</section>;
}
