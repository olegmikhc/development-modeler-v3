'use client';
import {useState} from 'react';
import {FileDown} from 'lucide-react';
import {FinancialModel} from '@/types/model';

export function ProposalButton({model,projectId}:{model:FinancialModel;projectId:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(){
  if(busy)return;
  setBusy(true);setError('');
  // Capture the model at the click, even if the user changes the scenario during generation.
  const snapshot=structuredClone(model);
  try{const {downloadProposal}=await import('@/lib/export/proposal-pdf');await downloadProposal(snapshot,projectId);}
  catch(e){setError(e instanceof Error?e.message:'Не удалось создать PDF. Попробуйте ещё раз.');}
  finally{setBusy(false);}
 }
 return <div className="proposal-export"><button className="btn proposal-export-button" onClick={download} disabled={busy} aria-busy={busy}><FileDown size={16}/>{busy?'Готовим PDF…':'Инвестиционное предложение'}</button>{error&&<span className="proposal-export-error" role="alert">{error}</span>}</div>;
}
