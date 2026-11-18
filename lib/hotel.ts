import {Adjustments,HotelPlan,HotelRoomType,Project,Result,neutral} from '@/types/model';
import {timeline,infrastructureWindow,round} from './financial-engine';
import {modelMonthDate,DEFAULT_MODEL_START} from './model-calendar';
export const hotelDefaults:HotelPlan={rooms:30,buildingArea:1800,openingDelay:0,operatingMonths:60,nightlyRateIdr:2400000,idrPerUsd:16000,saleValuation:'yield',buyerYield:12,occupancy:65,otherRevenuePercent:15,variableCostPercent:30,fixedMonthlyCost:15000,saleEnabled:false,salePrice:0,saleCostPercent:3};
export function hotelRoomTypes(p:Project):HotelRoomType[]{
 const rows=p.hotel?.roomTypes??[{id:'legacy-room-type',name:'Стандартный номер',quantity:p.hotel?.rooms??hotelDefaults.rooms,adrIdr:p.hotel?.nightlyRateIdr??hotelDefaults.nightlyRateIdr}];
 const missing=rows.filter(r=>r.area===undefined).reduce((n,r)=>n+r.quantity,0);
 const assigned=rows.reduce((n,r)=>n+r.quantity*(r.area??0),0);
 const legacyArea=missing?Math.max(0,(p.hotel?.buildingArea??hotelDefaults.buildingArea)-assigned)/missing:0;
 return rows.map(r=>({...r,area:r.area??legacyArea}));
}
export function hotelPlan(p:Project):HotelPlan {
 const roomTypes=hotelRoomTypes(p),rooms=roomTypes.reduce((n,r)=>n+r.quantity,0),daily=roomTypes.reduce((n,r)=>n+r.quantity*r.adrIdr,0);
 return {...hotelDefaults,...p.hotel,roomTypes,rooms,buildingArea:roomTypes.reduce((n,r)=>n+r.quantity*(r.area??0),0),nightlyRateIdr:rooms?daily/rooms:0,idrPerUsd:p.land.leasehold?.idrPerUsd&&p.land.leasehold.idrPerUsd>0?p.land.leasehold.idrPerUsd:p.hotel?.idrPerUsd||hotelDefaults.idrPerUsd};
}
export const projectArea=(p:Project)=>p.businessModel==='hotel'?hotelPlan(p).buildingArea:p.units.reduce((n,u)=>n+u.area*u.quantity,0);
export const projectCapacity=(p:Project)=>p.businessModel==='hotel'?hotelPlan(p).rooms:p.units.reduce((n,u)=>n+u.quantity,0);
export function hotelWindow(p:Project,a:Adjustments=neutral){
 a=a.projectId&&a.projectId!==p.id?neutral:a;
 const h=hotelPlan(p),t=timeline(p,a);
 const ready=Math.max(t.completion,...(p.infrastructure||[]).map(i=>infrastructureWindow(p,i,a).end));
 const opening=Math.max(ready+1,t.handover)+h.openingDelay;
 return {opening,end:opening+Math.max(0,h.operatingMonths)-1,saleMonth:h.saleEnabled?opening+h.operatingMonths:null};
}
/** Cash operating model; all assumptions are user inputs, with no inferred terminal value. */
export function hotelCashRows(p:Project,a:Adjustments=neutral,startDate=DEFAULT_MODEL_START){
 a=a.projectId&&a.projectId!==p.id?neutral:a;
 const h=hotelPlan(p),w=hotelWindow(p,a),collections:{month:number;amount:number;kind:string}[]=[],costs:{month:number;amount:number;category:string}[]=[];
 for(let month=w.opening;month<=w.end;month++){
  const date=modelMonthDate(startDate,month),days=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  const roomRevenue=round(h.roomTypes!.reduce((n,r)=>n+r.quantity*r.adrIdr,0)*days*h.occupancy/100/h.idrPerUsd*Math.max(0,1+a.price/100));
  const otherRevenue=round(roomRevenue*h.otherRevenuePercent/100);
  collections.push({month,amount:roomRevenue,kind:'Доход от номеров'},{month,amount:otherRevenue,kind:'Прочие доходы отеля'});
  costs.push({month,amount:round((roomRevenue+otherRevenue)*h.variableCostPercent/100),category:'Переменные расходы отеля'},{month,amount:h.fixedMonthlyCost,category:'Постоянные расходы отеля'});
 }
 const lastYearStart=Math.max(w.opening,w.end-11),sampleMonths=Math.min(12,h.operatingMonths);
 const annualNOI=sampleMonths?round((collections.filter(r=>r.month>=lastYearStart).reduce((n,r)=>n+r.amount,0)-costs.filter(r=>r.month>=lastYearStart).reduce((n,r)=>n+r.amount,0))*12/sampleMonths):0;
 const impliedSalePrice=annualNOI>0&&h.buyerYield>0?round(annualNOI/(h.buyerYield/100)):0;
 const salePrice=h.saleValuation==='yield'?impliedSalePrice:round(h.salePrice*Math.max(0,1+a.price/100));
 if(w.saleMonth!==null){
  const amount=salePrice;
  collections.push({month:w.saleMonth,amount,kind:'Продажа отеля целиком'});
  costs.push({month:w.saleMonth,amount:round(amount*h.saleCostPercent/100),category:'Расходы на продажу отеля'});
 }
 return {...w,annualNOI,impliedSalePrice,salePrice,collections,costs,revenue:round(collections.reduce((n,r)=>n+r.amount,0))};
}

export function hotelMetrics(p:Project,result:Result,a:Adjustments=neutral,startDate=DEFAULT_MODEL_START){
 const rows=hotelCashRows(p,a,startDate),h=hotelPlan(p);
 const operatingCosts=rows.costs.filter(r=>r.category!=='Расходы на продажу отеля').reduce((n,r)=>n+r.amount,0);
 const exitCosts=rows.costs.filter(r=>r.category==='Расходы на продажу отеля').reduce((n,r)=>n+r.amount,0);
 const developmentCost=round(result.cost-operatingCosts-exitCosts);
 const invested=result.months.some(m=>m.outflow>0);
 // Require sustained recovery; a temporary positive balance is not full payback.
 const sustained=(withSale:boolean)=>{let b=0,lastNegative=0;for(const m of result.months){b=round(b+m.net-(withSale?0:m.collections['Продажа отеля целиком']||0)+(withSale?0:m.categories['Расходы на продажу отеля']||0));if(b<0)lastNegative=m.month;}return invested&&b>=0&&lastNegative<result.months.length?Math.max(1,lastNegative+1):null;};
 const years=Array.from({length:Math.ceil(h.operatingMonths/12)},(_,i)=>{
  const start=rows.opening+i*12,end=Math.min(rows.end,start+11),months=end-start+1;
  const income=rows.collections.filter(r=>r.month>=start&&r.month<=end&&r.kind!=='Продажа отеля целиком').reduce((n,r)=>n+r.amount,0);
  const cost=rows.costs.filter(r=>r.month>=start&&r.month<=end&&r.category!=='Расходы на продажу отеля').reduce((n,r)=>n+r.amount,0);
  const noi=round(income-cost);
  return {year:i+1,start,end,months,income:round(income),cost:round(cost),noi,roi:developmentCost>0?noi/developmentCost:null};
 });
 const constructionStart=timeline(p,a.projectId&&a.projectId!==p.id?neutral:a).constructionStart;
 const investmentMonths=rows.saleMonth===null?null:Math.max(1,rows.saleMonth-constructionStart+1);
 const averageAnnualROI=developmentCost>0&&investmentMonths!==null?result.profit/developmentCost/(investmentMonths/12):null;
 return {...rows,developmentCost,years,constructionStart,investmentMonths,averageAnnualROI,annualROI:developmentCost>0?rows.annualNOI/developmentCost:null,paybackMonth:sustained(true),operatingPaybackMonth:sustained(false),totalROI:developmentCost>0?result.profit/developmentCost:null};
}
