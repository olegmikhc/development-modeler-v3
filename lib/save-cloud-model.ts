'use client';
import {FinancialModel} from '@/types/model';
import {supabase,syncModel} from './supabase';
import {stableJSON} from './stable-json';
import {useCloudState} from './cloud-sync-state';

/** All save entry points share revision checks; never silently overwrite an unknown revision. */
export async function saveCloudModel(model:FinancialModel){
 const sb=supabase();if(!sb)throw Error('Облако не подключено.');
 const {data:auth,error:authError}=await sb.auth.getUser();
 const user=auth.user;
 if(authError||!user?.email_confirmed_at)throw Error('Войдите в аккаунт с подтверждённой почтой.');
 const {data:saved,error}=await sb.from('financial_models').select('data,revision,organization_id').eq('id',model.id).maybeSingle();
 if(error)throw error;
 const state=useCloudState.getState(),base=state.bases[model.id],snapshot=stableJSON(model);
 if(base&&base.userId!==user.id)throw Error('Эта локальная модель связана с другим аккаунтом. Войдите в него или создайте независимую копию.');
 if(base&&base.revision>0&&!saved)throw Error('Модель недоступна в облаке. Проверьте доступ; локальная копия сохранена.');
 if(saved&&stableJSON(saved.data)!==snapshot&&(!base||base.revision!==saved.revision))
  throw Error('Конфликт версий. Загрузите облачную версию в настройках; текущая копия останется в истории.');
 let org=saved?.organization_id;
 if(!org){
  const {data:members,error}=await sb.from('organization_members').select('organization_id').eq('user_id',user.id).eq('role','owner').limit(1);
  if(error)throw error;org=members?.[0]?.organization_id;
  if(!org){const {data,error}=await sb.rpc('create_workspace',{workspace_name:'Development workspace'});if(error)throw error;org=data;}
 }
 let revision=saved?.revision??0;
 if(!saved||stableJSON(saved.data)!==snapshot){
  if(saved){const {error}=await sb.from('model_versions').insert({model_id:model.id,name:'До сохранения в облако',data:saved.data});if(error)throw error;}
  revision=await syncModel(model,org,revision,user.id);
 }
 state.remember(model.id,{userId:user.id,revision,org,snapshot});
 state.status(model.id,'Сохранено в облаке');
 window.dispatchEvent(new Event('model-cloud-saved'));
}
