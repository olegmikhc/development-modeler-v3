import {modelMonthDate,modelMonthLabel} from './model-calendar';
export type TimelineScale='months'|'quarters'|'years';
export function timelinePeriods(startDate:string,horizon:number,scale:TimelineScale){
 const periods:{key:string;label:string;detail:string;start:number;months:number}[]=[];
 for(let month=1;month<=horizon;month++){
  const date=modelMonthDate(startDate,month),year=date.getUTCFullYear(),quarter=Math.floor(date.getUTCMonth()/3)+1;
  const key=scale==='months'?String(month):scale==='quarters'?`${year}-${quarter}`:String(year);
  const last=periods.at(-1);
  if(last?.key===key){last.months++;continue;}
  periods.push({key,label:scale==='months'?`М${month}`:scale==='quarters'?`${quarter} кв.`:String(year),detail:scale==='months'?modelMonthLabel(startDate,month):scale==='quarters'?String(year):'',start:month,months:1});
 }
 return periods;
}
