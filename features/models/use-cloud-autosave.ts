'use client';
import {useEffect} from 'react';
import {supabase} from '@/lib/supabase';
import {saveCloudModel} from '@/lib/save-cloud-model';
import {stableJSON} from '@/lib/stable-json';
import {reconcileCloud,useCloudState} from '@/lib/cloud-sync-state';
import {useModels} from '@/store/model-store';
import {mergeCloudModels} from '@/lib/merge-cloud-models';

/** One coordinator per workspace: debounce local edits, refresh remote changes, retain conflicts. */
export function useCloudAutosave(){
 useEffect(()=>{
  const sb=supabase();if(!sb){useCloudState.setState({message:'Облако не настроено'});return;}
  let stopped=false,running=false,again=false,timer:ReturnType<typeof setTimeout>|undefined;
  let sessionUser:string|null=null,authEpoch=0;
  let knownIds=new Set(useModels.getState().models.map(m=>m.id));
  const freshIds=new Set<string>();
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void cycle(),900)};
  async function cycle(){
   if(stopped)return;if(running){again=true;return;}running=true;
   try{
    const epoch=authEpoch;
    const {data:{user},error:authError}=await sb!.auth.getUser();
    if(stopped||epoch!==authEpoch)return;
    if(authError||!user?.email_confirmed_at){sessionUser=null;freshIds.clear();useCloudState.setState({email:null,statuses:{},message:'Войдите, чтобы сохранять в облако'});return;}
    if(sessionUser!==user.id){freshIds.clear();sessionUser=user.id;useCloudState.setState({statuses:{}});}
    const uid=user.id;
    useCloudState.setState({email:user.email??null,message:'Облачное пространство'});
    const {data:rows,error}=await sb!.from('financial_models').select('id,data,revision,organization_id');
    if(error)throw error;if(stopped||sessionUser!==uid)return;
    const editableIds=new Set<string>();
    // Validate before touching the local workspace; viewer-only models stay on /invited.
    for(const row of rows??[]){
     const {data:editable,error:permissionError}=await sb!.rpc('edits_model',{mid:row.id});
     if(permissionError)throw permissionError;if(stopped||sessionUser!==uid)return;if(!editable)continue;editableIds.add(row.id);
     const remote=mergeCloudModels([], [row.data]).models[0];
     const local=useModels.getState().models.find(m=>m.id===row.id);
     if(useModels.getState().deletedModels.some(m=>m.id===row.id))continue;
     const state=useCloudState.getState(),base=state.bases[row.id];
     if(base&&base.userId!==uid){state.status(row.id,'Локальная копия другого аккаунта');continue;}
     const snapshot=stableJSON(remote);
     const action=reconcileCloud(local&&stableJSON(local),snapshot,base?.snapshot);
     if(action==='conflict'){state.status(row.id,'Конфликт версий — откройте настройки облака');continue;}
     if(action==='download')useModels.getState().loadCloud([remote]);
     if(action==='upload')state.status(row.id,'Есть изменения · ожидают сохранения');
     if(action!=='upload'){
      state.remember(row.id,{userId:uid,org:row.organization_id,revision:row.revision,snapshot});
      state.status(row.id,'Сохранено в облаке');
     }
    }
    for(const model of useModels.getState().models){
     if(stopped||sessionUser!==uid)return;
     const state=useCloudState.getState(),base=state.bases[model.id];
     if(base?.userId!==uid&&!freshIds.has(model.id))continue;
     if(state.statuses[model.id]?.startsWith('Конфликт'))continue;
     if(base&&base.revision>0&&!editableIds.has(model.id)){state.status(model.id,'Нет доступа к редактированию · локальная копия сохранена');continue;}
     if(base?.snapshot===stableJSON(model))continue;
     state.status(model.id,'Сохраняем в облако…');
     try{await saveCloudModel(structuredClone(model));freshIds.delete(model.id);}
     catch(e){state.status(model.id,message(e));}
    }
   }catch(e){if(!stopped)useCloudState.setState({message:'Нет связи с облаком · локальная копия сохранена: '+message(e)});}
   finally{running=false;if(again&&!stopped){again=false;schedule();}}
  }
  function message(e:unknown){return e&&typeof e==='object'&&'message' in e?String(e.message):'Ошибка облака · локальная копия сохранена';}
  const unsubscribe=useModels.subscribe((s,prev)=>{if(s.models===prev.models)return;for(const m of s.models)if(!knownIds.has(m.id)&&sessionUser){freshIds.add(m.id);useCloudState.getState().remember(m.id,{userId:sessionUser,revision:0,snapshot:'',org:''});}for(const m of s.models){const state=useCloudState.getState(),base=state.bases[m.id];if(base?.userId===sessionUser&&base.snapshot!==stableJSON(m))state.status(m.id,'Есть изменения · ожидают сохранения');}knownIds=new Set(s.models.map(m=>m.id));schedule();});
  const {data:auth}=sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user.id!==sessionUser){sessionUser=null;authEpoch++;freshIds.clear();}schedule();});
  const poll=setInterval(schedule,20000);
  window.addEventListener('online',schedule);window.addEventListener('focus',schedule);window.addEventListener('model-cloud-saved',schedule);
  void cycle();
  return()=>{stopped=true;clearTimeout(timer);clearInterval(poll);unsubscribe();auth.subscription.unsubscribe();window.removeEventListener('online',schedule);window.removeEventListener('focus',schedule);window.removeEventListener('model-cloud-saved',schedule);};
 },[]);
}
