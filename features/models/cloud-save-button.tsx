'use client';
import {useState} from 'react';
import {CloudUpload,LoaderCircle} from 'lucide-react';
import {FinancialModel} from '@/types/model';
import {saveCloudModel} from '@/lib/save-cloud-model';
import {useCloudState} from '@/lib/cloud-sync-state';
import {appPath} from '@/lib/app-path';
export function CloudSaveButton({model}:{model:FinancialModel}){
 const cloud=useCloudState(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{if(busy)return;setBusy(true);setError('');try{await saveCloudModel(structuredClone(model));}catch(e){setError(e&&typeof e==='object'&&'message' in e?String(e.message):'Не удалось сохранить.')}finally{setBusy(false)}};
 return <div className="sidebar-cloud-save">{cloud.email?<button className="cloud-save-button" disabled={busy} onClick={save}>{busy?<LoaderCircle size={19}/>:<CloudUpload size={19}/>}<span>{busy?'Сохраняем…':cloud.bases[model.id]?'Синхронизировать':'Сохранить в облако'}</span></button>:<a className="cloud-save-button" href={appPath('/login/')}><CloudUpload size={19}/>Войти в облако</a>}
 <p role="status" className={error?'cloud-save-error':''}>{error||(cloud.email?cloud.statuses[model.id]||'После первого сохранения изменения отправляются автоматически':'Сейчас данные только на этом устройстве')}</p>
 {error&&<a href={appPath('/login/')}>Настройки облака ↗</a>}</div>;
}
