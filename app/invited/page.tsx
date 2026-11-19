'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {appPath} from '@/lib/app-path';
import {modelEnvelope} from '@/lib/validation/model';
import {FinancialModel} from '@/types/model';
import {useModels} from '@/store/model-store';
import {ModelViewer} from '@/features/models/model-viewer';
import {useVerifiedEditor} from '@/features/models/use-verified-editor';
import {tr,useLanguage} from '@/lib/i18n';
import {useCloudAutosave} from '@/features/models/use-cloud-autosave';
import {ModelsHome} from '@/features/models/models-home';
import {useCloudState} from '@/lib/cloud-sync-state';
import {LanguageSwitch} from '@/components/ui/language-switch';
export default function InvitedModels(){
 useCloudAutosave();useLanguage();const verified=useVerifiedEditor(),[models,setModels]=useState<(FinancialModel & {accessRole:'viewer'|'editor'})[]>([]),[selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);setMessage('');const sb=supabase();if(!sb){setMessage(tr('Cloud workspace is not configured.'));setLoading(false);return}try{const {data,error}=await sb.rpc('list_model_invitations');if(error)throw Error(error.message);setModels((data||[]).map((entry:{model:unknown;access_role:'viewer'|'editor'})=>({...modelEnvelope.parse(entry.model) as FinancialModel,accessRole:entry.access_role})));}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setLoading(false)}};
 useEffect(()=>{if(verified){void load();void supabase()?.auth.getUser().then(({data})=>useCloudState.setState({email:data.user?.email??null}));}else {setModels([]);setSelected(null)}},[verified]);
 const copy=async(id:string)=>{setBusy(true);setMessage('');try{const {data,error}=await supabase()!.rpc('copy_invited_model',{mid:id});if(error)throw Error(error.message);const m=modelEnvelope.parse(data) as FinancialModel;useModels.getState().importModel(m);window.location.assign(appPath('/'));}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const edit=async(id:string)=>{setBusy(true);try{const sb=supabase()!;const {data,error}=await sb.from('financial_models').select('data').eq('id',id).single();if(error)throw error;const {data:allowed,error:accessError}=await sb.rpc('edits_model',{mid:id});if(accessError||!allowed)throw Error('Право редактирования отозвано. Обновите список.');const model=modelEnvelope.parse(data.data) as FinancialModel;useModels.getState().loadCloud([model]);useModels.getState().selectModel(model.id);window.location.assign(appPath('/')+'?open='+encodeURIComponent(model.id));}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const model=models.find(m=>m.id===selected);
 return <>{model?<><header className="shared-toolbar"><button className="btn" onClick={()=>setSelected(null)}>Доступные мне</button>{model.accessRole==='editor'&&<button className="btn" disabled={busy} onClick={()=>edit(model.id)}>Редактировать оригинал</button>}<button className="btn dark" disabled={busy} onClick={()=>copy(model.id)}>Создать независимую копию</button><LanguageSwitch/></header><ModelViewer key={model.id} model={model}/></>:<ModelsHome onOpen={setSelected} notify={setMessage} shared={{models,loading:verified===null||!!verified&&loading,busy,verified,onCopy:copy,onEdit:edit,onRefresh:load}}/>}{message&&<div role="status" className="notice v3-library-notice">{message}<button aria-label="Закрыть уведомление" onClick={()=>setMessage('')}>×</button></div>}</>;
}
