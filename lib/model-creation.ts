import {BusinessModel,FinancialModel,ModelStructure,Project,neutral} from '@/types/model';
import {createProject,id} from './demo';
export const isHotel=(p:Project)=>p.businessModel==='hotel';
export const isSingleModel=(m:FinancialModel)=>m.structure==='single'||(!m.structure&&m.projects.length===1);
export function createDevelopmentProject(name:string,businessModel:BusinessModel,index=0):Project {
 const p=createProject(name,index);p.businessModel=businessModel;
 if(businessModel==='hotel'){
  p.type='Hotel';p.units=[];p.payroll=[];
  p.timeline.stages=p.timeline.stages.filter(s=>s.name==='Architecture');
  p.costs=p.costs.filter(c=>!['Marketing','Sales Commission','Taxes'].includes(c.name));
  p.hotel={rooms:30,buildingArea:1800,openingDelay:0,operatingMonths:60,nightlyRateIdr:2400000,idrPerUsd:16000,saleValuation:'yield',buyerYield:12,occupancy:65,otherRevenuePercent:15,variableCostPercent:30,fixedMonthlyCost:15000,saleEnabled:false,salePrice:0,saleCostPercent:3};
 }
 return p;
}
export function createFinancialModel(name:string,structure:ModelStructure,businessModel:BusinessModel):FinancialModel {
 const modelName=name.trim()||'Новая модель';
 return {id:id(),name:modelName,structure,created:new Date().toISOString(),startDate:'2027-01-01',currency:'USD',horizon:36,
  projects:[createDevelopmentProject(structure==='single'?modelName:'Первый проект',businessModel)],corporate:[],resources:[],investments:[],workforce:{version:1,departments:[],employees:[]},scenarios:[{id:'base',name:'Базовый',adjustments:{...neutral}}],activeScenario:'base'};
}
/** A single model has one identity in the UI, while retaining compatible storage. */
export function synchronizeModelName(m:FinancialModel):FinancialModel {
 return m.structure==='single'&&m.projects.length===1?{...m,projects:[{...m.projects[0],name:m.name}]}:m;
}
