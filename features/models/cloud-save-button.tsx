'use client';
import {useState} from 'react';
import {CloudCheck,LogIn,LoaderCircle,Cloud} from 'lucide-react';
import {FinancialModel} from '@/types/model';
import {useCloudState} from '@/lib/cloud-sync-state';
import {supabase} from '@/lib/supabase';
import {appPath} from '@/lib/app-path';
export function CloudSaveButton({model}:{model:FinancialModel}){
 const cloud=useCloudState(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const login=async()=>{if(busy)return;setBusy(true);setError('');try{
  const sb=supabase();if(!sb)throw Error('Облако не настроено.');
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+appPath('/'),queryParams:{prompt:'select_account'}}});if(error)throw error;
 }catch(e){setError(e&&typeof e==='object'&&'message' in e?String(e.message):'Не удалось войти.');}finally{setBusy(false)}};
 const status=cloud.message.startsWith('Нет связи')?cloud.message:cloud.statuses[model.id]||(cloud.bases[model.id]?'Проверяем синхронизацию…':'Модель ещё не сохранена в облаке');
 const saved=status==='Сохранено в облаке';
 return <div className="sidebar-cloud-save">{cloud.email?<>
  <div role="status" className={`sidebar-cloud-status${saved?' saved':''}`}>
   {saved?<CloudCheck size={19}/>:<Cloud size={19}/>}<span>{status}</span>
  </div>
  <p>Изменения сохраняются автоматически</p>
  {!cloud.bases[model.id]&&<a href={appPath('/login/')}>Подключить локальную модель к аккаунту ↗</a>}
 </>:<>
  <button className="cloud-save-button" disabled={busy} onClick={login}>{busy?<LoaderCircle size={19} className="cloud-save-spinner"/>:<LogIn size={19}/>}<span>{busy?'Открываем Google…':'Войти через Google'}</span></button>
  <p>Войдите, чтобы открыть ваши модели и приглашения</p>
 </>}
 {error&&<p role="alert" className="cloud-save-error">{error}</p>}</div>;
}
