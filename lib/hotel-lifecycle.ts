import {Result} from '@/types/model';
import {round} from './financial-engine';

/** Aggregate the calculated cash flow, including construction, company costs and exit. */
export function hotelLifecycle(result:Result,operationEnd:number){
 const lastCashMonth=result.months.reduce((last,m)=>m.inflow!==0||m.outflow!==0?Math.max(last,m.month):last,0);
 const end=Math.max(1,operationEnd,lastCashMonth);
 let cumulative=0;
 return Array.from({length:Math.ceil(end/12)},(_,index)=>{
  const start=index*12+1,finish=Math.min(end,start+11);
  const months=result.months.filter(m=>m.month>=start&&m.month<=finish);
  const sum=(get:(m:Result['months'][number])=>number)=>round(months.reduce((n,m)=>n+get(m),0));
  const sale=sum(m=>m.collections['Продажа отеля целиком']||0);
  const saleCosts=sum(m=>m.categories['Расходы на продажу отеля']||0);
  const operatingCosts=sum(m=>(m.categories['Переменные расходы отеля']||0)+(m.categories['Постоянные расходы отеля']||0));
  const income=sum(m=>m.inflow),cost=sum(m=>m.outflow),operatingIncome=round(income-sale);
  const developmentCosts=round(cost-operatingCosts-saleCosts),noi=round(operatingIncome-operatingCosts),net=sum(m=>m.net);
  cumulative=round(cumulative+net);
  return {year:index+1,start,end:finish,income,cost,developmentCosts,operatingIncome,operatingCosts,noi,sale,saleCosts,net,cumulative};
 });
}
