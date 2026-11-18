import {FinancialModel, neutral} from '@/types/model';
import {scopedResult, npv} from '@/lib/sensitivity';
import {hotelMetrics, hotelPlan} from '@/lib/hotel';
import {hotelLifecycle} from '@/lib/hotel-lifecycle';
import {timeline, infrastructureWindow, calculateInfrastructureSpend} from '@/lib/financial-engine';

/** A fresh snapshot using the exact scope and scenario rules of the project overview. */
export function proposalData(model:FinancialModel, projectId:string){
 const project=model.projects.find(p=>p.id===projectId);
 if(!project)throw new Error('Проект не найден. Откройте проект и повторите выгрузку.');
 const scenario=model.scenarios.find(s=>s.id===model.activeScenario);
 const adjustments=scenario?.adjustments??neutral;
 const effective=adjustments.projectId&&adjustments.projectId!==project.id?neutral:adjustments;
 const result=scopedResult(model,project.id,adjustments);
 const hotel=project.businessModel==='hotel'?hotelMetrics(project,result,adjustments,model.startDate):null;
 const plan=hotel?hotelPlan(project):null;
 const years=hotelLifecycle(result,hotel?.end??0);
 const end=years.at(-1)!.end;
 const totalROI=hotel?.totalROI??(result.cost>0?result.profit/result.cost:null);
 const budget=Object.entries(result.costs).filter(([name])=>!hotel||!['Переменные расходы отеля','Постоянные расходы отеля','Расходы на продажу отеля'].includes(name));
 return {model,project,scenarioName:scenario?.name??'Базовый',adjustments,effective,result,hotel,plan,years,end,totalROI,budget,
  includesCompany:model.projects.length===1,discount:model.analysis?.discount??15,npv:npv(result,model.analysis?.discount??15),
  timeline:timeline(project,effective),
  infrastructure:(project.infrastructure??[]).map(item=>({...item,window:infrastructureWindow(project,item,effective),budget:calculateInfrastructureSpend(project,effective).filter(row=>row.infrastructureId===item.id).reduce((s,row)=>s+row.amount,0)})),
  investments:(model.investments??[]).filter(i=>i.enabled&&(i.projectId===project.id||model.projects.length===1&&i.projectId===null))};
}
export type ProposalData=ReturnType<typeof proposalData>;
export const proposalFilename=(name:string)=>`Инвестиционное предложение - ${name.replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').trim().slice(0,100)||'Проект'}.pdf`;
