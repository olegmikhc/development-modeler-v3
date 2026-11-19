import {PDFDocument, PDFFont, PDFPage, rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {FinancialModel} from '@/types/model';
import {proposalData, ProposalData, proposalFilename} from './proposal-data';
import {modelMonthDate} from '@/lib/model-calendar';
import {projectExchangeRate} from '@/lib/project-currency';
import {tr} from '@/lib/i18n';

const W=595.28,H=841.89,M=42,CW=W-2*M,BOTTOM=773;
const C={ink:'#202025',muted:'#74747E',purple:'#7850B5',line:'#E4E2E9',pale:'#F6F5F8',green:'#267446',red:'#B34D46',white:'#FFFFFF'};
const color=(s:string)=>rgb(parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255);
const num=(n:number,digits=0)=>Number.isFinite(n)?n.toLocaleString('ru-RU',{maximumFractionDigits:digits}).replace(/\u00a0/g,' '):'—';
const pct=(n:number|null)=>n===null?'—':num(n*100,1)+'%';
const tone=(n:number)=>n>0?C.green:n<0?C.red:C.ink;
export type ProposalFonts={regular:Uint8Array;bold:Uint8Array};

/** Vector text, charts and tables. No screenshots, printing dialog or remote financial data. */
class Report {
 page!:PDFPage; y=0; title=''; subtitle='';
 readonly supported:Set<number>;
 constructor(readonly doc:PDFDocument,readonly regular:PDFFont,readonly bold:PDFFont,readonly data:ProposalData){this.supported=new Set(regular.getCharacterSet());}
 clean(value:string){return [...String(value).replace(/[\u00a0\u202f]/g,' ').replace(/[\r\t]/g,' ')].map(c=>c==='\n'||this.supported.has(c.codePointAt(0)!)?c:'?').join('');}
 lines(value:string,width:number,size=10,bold=false){
  const font=bold?this.bold:this.regular,out:string[]=[];
  for(const paragraph of this.clean(value).split('\n')){
   let line='';
   for(const word of paragraph.split(/ +/)){
    if(font.widthOfTextAtSize(line?line+' '+word:word,size)<=width){line=line?line+' '+word:word;continue;}
    if(line){out.push(line);line='';}
    for(const char of word){if(font.widthOfTextAtSize(line+char,size)>width&&line){out.push(line);line='';}line+=char;}
   }
   out.push(line);
  }
  return out;
 }
 text(value:string,x:number,y:number,size=10,ink=C.ink,bold=false){this.page.drawText(this.clean(value),{x,y:H-y-size,size,font:bold?this.bold:this.regular,color:color(ink)});}
 rect(x:number,y:number,w:number,h:number,fill=C.pale){this.page.drawRectangle({x,y:H-y-h,width:w,height:h,color:color(fill)});}
 rule(y:number,x=M,width=CW){this.page.drawLine({start:{x,y:H-y},end:{x:x+width,y:H-y},thickness:.6,color:color(C.line)});}
 newPage(title:string,subtitle='',cover=false){
  this.page=this.doc.addPage([W,H]);this.title=title;this.subtitle=subtitle;
  this.text('DEVELOPMENT MODELER',M,27,8,C.muted,true);this.rect(W-M-30,24,30,20,C.purple);this.text('V3',W-M-23,27,9,C.white,true);
  if(!cover){const lines=this.lines(title,CW,24,true);lines.forEach((line,i)=>this.text(line,M,68+i*31,24,C.ink,true));const sy=76+lines.length*31;const sub=this.lines(subtitle,CW,9);sub.forEach((line,i)=>this.text(line,M,sy+i*14,9,C.muted));this.y=sy+sub.length*14+27;}else this.y=110;
 }
 ensure(height:number){if(this.y+height>BOTTOM)this.newPage(this.title,'Продолжение');}
 paragraph(value:string,size=10,ink=C.muted){for(const line of this.lines(value,CW,size)){this.ensure(size*1.5);this.text(line,M,this.y,size,ink);this.y+=size*1.5;}this.y+=14;}
 heading(value:string){this.ensure(112);this.text(value,M,this.y,15,C.ink,true);this.y+=32;}
 kpis(items:{label:string;value:string;note?:string;ink?:string}[],compact=false){
  const columns=compact?3:2,height=compact?72:108,gap=compact?12:16,width=(CW-gap*(columns-1))/columns;
  for(let i=0;i<items.length;i+=columns){
   this.ensure(height+16);
   items.slice(i,i+columns).forEach((item,j)=>{
    const x=M+j*(width+gap);this.rect(x,this.y,width,height);
    this.lines(item.label,width-26,9).slice(0,2).forEach((l,k)=>this.text(l,x+13,this.y+12+k*12,9,C.muted));
    let size=compact?17:23;while(this.bold.widthOfTextAtSize(this.clean(item.value),size)>width-26&&size>10)size--;
    this.text(item.value,x+13,this.y+43,size,item.ink??C.ink,true);
    if(!compact)this.lines(item.note??'',width-26,8).slice(0,2).forEach((l,k)=>this.text(l,x+13,this.y+78+k*11,8,C.muted));
   });this.y+=height+12;
  }
 }
 table(headers:string[],rows:string[][],widths:number[],numeric:number[]=[],font=9){
  const head=()=>{const h=Math.max(...headers.map((v,i)=>this.lines(v,widths[i]-16,8,true).length))*11+18;this.rect(M,this.y,CW,h);let x=M;headers.forEach((v,i)=>{this.lines(v,widths[i]-16,8,true).forEach((l,k)=>this.text(l,x+8,this.y+8+k*11,8,C.muted,true));x+=widths[i];});this.y+=h;};
  this.ensure(80);head();
  for(const row of rows){
   const lines=row.map((v,i)=>this.lines(v,widths[i]-16,font));let offset=0,total=Math.max(...lines.map(l=>l.length));
   while(offset<total){
    if(this.y+font*1.45+18>BOTTOM){this.newPage(this.title,'Продолжение');head();}
    const count=Math.min(total-offset,Math.floor((BOTTOM-this.y-18)/(font*1.45))),height=count*font*1.45+18;let x=M;
    lines.forEach((ls,i)=>{ls.slice(offset,offset+count).forEach((l,k)=>{const dx=numeric.includes(i)?widths[i]-8-this.regular.widthOfTextAtSize(l,font):8;this.text(l,x+dx,this.y+8+k*font*1.45,font);});x+=widths[i];});
    this.y+=height;this.rule(this.y);offset+=count;
   }
  }
  this.y+=22;
 }
 chart(values:number[],labels:string[],title:string,line=false){
  this.ensure(240);this.text(title,M,this.y,10,C.muted);const top=this.y+30,bottom=top+150,x0=M+43,width=CW-50;
  const min=Math.min(0,...values),max=Math.max(0,...values),range=max-min||1;
  const py=(n:number)=>bottom-(n-min)/range*150;
  for(let i=0;i<=4;i++){const val=min+range*i/4,y=py(val);this.rule(y,x0,width);this.text(num(val/1e6,2),M,y-5,8,C.muted);}
  const step=width/Math.max(1,values.length);let previous:{x:number;y:number}|undefined;
  values.forEach((v,i)=>{const x=x0+step*(i+.5);if(line){const point={x,y:H-py(v)};if(previous)this.page.drawLine({start:previous,end:point,thickness:2,color:color(C.purple)});previous=point;}else this.rect(x-step*.32,Math.min(py(v),py(0)),step*.64,Math.max(.7,Math.abs(py(v)-py(0))),tone(v));if(i%Math.max(1,Math.ceil(values.length/12))===0||i===values.length-1)this.text(labels[i],x-5,bottom+10,8,C.muted);});
  this.y=bottom+42;
 }
 finish(){const pages=this.doc.getPages();pages.forEach((p,i)=>{this.page=p;this.rule(796);let label=this.data.project.name;while(this.regular.widthOfTextAtSize(this.clean(label),7)>350)label=label.slice(0,-2);this.text(label+' / '+this.data.model.currency,M,807,7,C.muted);this.text(`${i+1} / ${pages.length}`,W-M-35,807,8,C.muted);});}
}

export async function createProposalPdf(model:FinancialModel,projectId:string,fonts:ProposalFonts,generatedAt=new Date()){
 const d=proposalData(model,projectId),{project:p,result:r,hotel:h,plan,years}=d;
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [regular,bold]=await Promise.all([doc.embedFont(fonts.regular,{subset:true}),doc.embedFont(fonts.bold,{subset:true})]);
 doc.setTitle(`Инвестиционное предложение по проекту ${p.name}`);doc.setAuthor('Development Modeler V3');doc.setLanguage('ru-RU');doc.setCreationDate(generatedAt);
 const b=new Report(doc,regular,bold,d),money=(n:number)=>model.currency==='USD'?`$${num(n)}`:`${num(n)} ${model.currency}`,date=(m:number)=>modelMonthDate(model.startDate,m).toLocaleDateString('ru-RU',{month:'short',year:'numeric',timeZone:'UTC'}),period=(start:number,end:number)=>`${date(start)} - ${date(end)} · ${end-start+1} мес.`;
 const desc=h?`Строительство отеля, доход от эксплуатации${plan?.saleEnabled?' и продажа актива целиком':'. Продажа актива не включена в расчёт'}.`:'Строительство и розничная продажа юнитов.';
 const cost=h?.developmentCost??r.cost;
 const flowKpis=h?[
  {label:'Инвестиционный бюджет',value:money(d.flows.development)},
  {label:'Выручка от эксплуатации',value:money(d.flows.operatingRevenue)},
  {label:'Расходы на эксплуатацию',value:money(d.flows.operatingCosts)},
  {label:'NOI за период эксплуатации',value:money(d.flows.noi),ink:tone(d.flows.noi)},
  ...(plan?.saleEnabled?[{label:'Поступление от продажи',value:money(d.flows.sale)},{label:'Расходы на сделку',value:money(d.flows.saleCosts)}]:[]),
 ]:[{label:'Выручка от продажи юнитов',value:money(r.revenue)},{label:'Бюджет проекта',value:money(r.cost)}];
 b.newPage('','',true);
 b.text('ИНВЕСТИЦИОННОЕ ПРЕДЛОЖЕНИЕ',M,112,11,C.purple,true);
 b.y=160;
 const nameSize=p.name.length>45?30:43;
 b.paragraph(p.name,nameSize,C.ink);
 b.paragraph(desc,21,C.ink);
 b.paragraph([p.location,p.country].filter(Boolean).join(' · '),11);
 b.y=Math.max(b.y+24,410);
 b.kpis([{label:'Инвестиционный бюджет',value:money(cost),note:'Земля, строительство и прочие затраты'},h?{label:'Годовой NOI',value:money(h.annualNOI),note:'Последние 12 месяцев эксплуатации',ink:tone(h.annualNOI)}:{label:'Выручка от продажи юнитов',value:money(r.revenue)}, {label:'Потребность в капитале',value:money(r.peak),note:'Максимальный кассовый дефицит'},{label:'Чистый результат',value:money(r.profit),note:'До финансирования и выплат инвесторам',ink:tone(r.profit)}]);
 b.paragraph(`Сценарий: ${tr(d.scenarioName)} · Валюта: ${model.currency}\nСформировано: ${generatedAt.toLocaleDateString('ru-RU')} · Начало модели: ${date(1)}`,9);

 b.newPage('Инвестиционная логика','Ключевые результаты и полный срок реализации проекта.');
 b.paragraph(`${p.name}. ${desc}`,11,C.ink);
 b.kpis([...flowKpis,{label:'ROI за весь период',value:pct(d.totalROI),note:h?'Прибыль / себестоимость создания':'Прибыль / все расходы',ink:d.totalROI===null?C.ink:tone(d.totalROI)},{label:h?'Среднегодовая доходность':'Горизонт денежных потоков',value:h?pct(h.averageAnnualROI):`${d.end} мес.`,note:h?.investmentMonths?`От начала строительства до продажи: ${h.investmentMonths} мес.`:h?'Не определяется без продажи отеля':'От начала модели',ink:h?.averageAnnualROI?tone(h.averageAnnualROI):C.ink},{label:`NPV · ${num(d.discount,1)}% годовых`,value:money(d.npv),ink:tone(d.npv)}],true);
 if(h)b.paragraph(`Окупаемость только эксплуатацией: ${h.operatingPaybackYears===null?'не определяется':num(h.operatingPaybackYears,1)+' лет от открытия'}.`,10,C.ink);

 b.newPage('Актив и предпосылки','Параметры проекта, типы юнитов и исходные допущения.');
 const fx=projectExchangeRate(p);
 b.table(['ПАРАМЕТР','ЗНАЧЕНИЕ'],[['Проект',p.name],['Локация',[p.location,p.country].filter(Boolean).join(' · ')||'Не указана'],['Статус',tr(p.status)],['Расчёт земли',p.land.pricingMode==='Freehold'?'Фрихолд':p.land.pricingMode==='Leasehold'?`Лизхолд · ${num(p.land.leasehold?.years??0)} лет`:'Стоимость задана вручную'],['Площадь земли',`${num(p.land.area,2)} ${p.land.unit==='are'?'соток':p.land.unit==='hectare'?'га':'м²'}`],['Строительство',period(d.timeline.constructionStart,d.timeline.completion)],...(h?[['Эксплуатация',plan!.operatingMonths?period(h.opening,h.end):'Не задана'],['Продажа',h.saleMonth?date(h.saleMonth):'Отключена']]:[]),['Вторая валюта / курс',fx.unitsPerBase?`${num(fx.unitsPerBase,4)} ${fx.currency} за 1 ${fx.baseCurrency}`:'Не задан']], [180,CW-180]);
 b.heading('Типы юнитов');
 const units=plan?.roomTypes?.map(u=>[u.name,num(u.quantity),num(u.area??0,2),num(u.adrIdr)])??p.units.map(u=>[u.name,num(u.quantity),num(u.area,2),num(u.area*u.quantity,2)]);
 b.table(['ТИП','КОЛ-ВО','ПЛОЩАДЬ / ЮНИТ, м²',plan?'ADR / НОЧЬ, IDR':'ВСЕГО, м²'],units,[180,66,110,CW-356],[1,2,3]);
 b.paragraph(`Всего юнитов: ${num(plan?.rooms??r.units)}. Площадь юнитов без инфраструктуры: ${num(plan?.buildingArea??r.gla,2)} м².`,10,C.ink);
 if(plan){b.heading('Операционные допущения');b.paragraph(`Загрузка: ${num(plan.occupancy,1)}%. Прочие доходы: ${num(plan.otherRevenuePercent,1)}% от дохода номеров.\nКурс для выручки: ${num(plan.idrPerUsd,4)} IDR за 1 USD.\nПеременные расходы: ${num(plan.variableCostPercent,1)}% выручки. Постоянные расходы: ${money(plan.fixedMonthlyCost)} в месяц.`,10,C.ink);}

 b.newPage('Бюджет и этапы','Структура затрат на создание проекта и календарь реализации.');
 const groups=[['Земля',d.budget.filter(([k])=>k==='Land Payments').reduce((s,[,v])=>s+v,0)],['Строительство',d.budget.filter(([k])=>k==='Construction').reduce((s,[,v])=>s+v,0)],['Инфраструктура',d.budget.filter(([k])=>k.startsWith('Infrastructure · ')).reduce((s,[,v])=>s+v,0)],['Прочие затраты',d.budget.filter(([k])=>k!=='Land Payments'&&k!=='Construction'&&!k.startsWith('Infrastructure · ')).reduce((s,[,v])=>s+v,0)]] as [string,number][];
 for(const [label,value] of groups){b.ensure(62);b.text(label,M,b.y,10);b.text(money(value),M+260,b.y,11,C.ink,true);b.rect(M,b.y+24,CW,10);if(cost>0&&value>0)b.rect(M,b.y+24,Math.max(1,Math.min(CW,CW*value/cost)),10,C.purple);b.y+=57;}
 b.paragraph(`Инвестиционный бюджет: ${money(cost)}`,11,C.ink);
 b.heading('Календарь проекта');
 b.table(['ЭТАП','ПЕРИОД'],[['Начало проекта',date(p.start)],['Разрешения',period(d.timeline.pbgStart,d.timeline.pbgEnd)],['Строительство',period(d.timeline.constructionStart,d.timeline.completion)],['Передача объекта',date(d.timeline.handover)],...(h?[['Эксплуатация',plan!.operatingMonths?period(h.opening,h.end):'Не задана'],['Продажа',h.saleMonth?date(h.saleMonth):'Отключена']]:[])],[180,CW-180]);
 if(d.infrastructure.length){b.heading('Инфраструктура');b.table(['ОБЪЕКТ','ПЛОЩАДЬ, м²','БЮДЖЕТ','ПЕРИОД'],d.infrastructure.map(i=>[i.name,num(i.area,2),money(i.budget),period(i.window.start,i.window.end)]),[170,70,110,CW-350],[1,2]);}
 b.heading('Детализация затрат');
 b.table(['СТАТЬЯ','СУММА'],d.budget.map(([label,value])=>[tr(label),money(value)]),[330,CW-330],[1]);

 b.newPage('Денежный поток по годам',`Полный цикл проекта · ${model.currency}. Годы отсчитываются от начала модели.`);
 if(h){
  b.chart(years.map(y=>-y.developmentCosts),years.map(y=>String(y.year)),`Инвестиционный бюджет по годам, млн ${model.currency}`);
  b.chart(years.map(y=>y.noi),years.map(y=>String(y.year)),`NOI от эксплуатации по годам, млн ${model.currency}`);
 }else{
  b.chart(years.map(y=>y.net),years.map(y=>String(y.year)),`Чистый денежный поток, млн ${model.currency}`);
  b.chart(years.map(y=>y.cumulative),years.map(y=>String(y.year)),`Накопленный денежный поток, млн ${model.currency}`,true);
 }
 b.newPage('Финансовый план по годам',`Суммы в тысячах ${model.currency}, округлены. Продажа указана за вычетом расходов на сделку.`);
 const thousands=(v:number)=>num(Math.abs(v)<.5?0:v/1000,1);
 b.table(h?['ГОД / МЕСЯЦЫ','ИНВЕСТ. БЮДЖЕТ','ВЫРУЧКА ОТЕЛЯ','OPEX','NOI','ПРОДАЖА НЕТТО','ЧИСТЫЙ ПОТОК']:['ГОД / МЕСЯЦЫ','РАСХОДЫ','ПОСТУПЛЕНИЯ','ЧИСТЫЙ ПОТОК'],years.map(y=>h?[`${y.year} · M${y.start}-${y.end}`,thousands(y.developmentCosts),thousands(y.operatingIncome),thousands(y.operatingCosts),thousands(y.noi),thousands(y.sale-y.saleCosts),thousands(y.net)]:[`${y.year} · M${y.start}-${y.end}`,thousands(y.cost),thousands(y.income),thousands(y.net)]),h?[68,72,76,68,68,78,CW-430]:[100,135,135,CW-370],h?[1,2,3,4,5,6]:[1,2,3],8);
 b.ensure(32+Math.ceil((flowKpis.length+(h?3:2))/3)*84);b.heading('Итоги за весь срок');
 b.kpis([...flowKpis,{label:'Чистый результат',value:money(r.profit),ink:tone(r.profit)},{label:'ROI за весь период',value:pct(d.totalROI),ink:d.totalROI===null?C.ink:tone(d.totalROI)},...(h?[{label:'Среднегодовая доходность',value:pct(h.averageAnnualROI),note:h.investmentMonths?`Полный срок: ${h.investmentMonths} мес. от начала стройки`:'Продажа выключена',ink:h.averageAnnualROI?tone(h.averageAnnualROI):C.ink}]:[])],true);

 if(h||d.investments.length)b.newPage(h?'Продажа отеля':'Финансирование','');
 if(h&&plan){b.table(['ПАРАМЕТР','ЗНАЧЕНИЕ'],[['Статус',plan.saleEnabled?'Включена в расчёт':'Отключена, стоимость актива не включена в доход'],['Срок от открытия',`${num(plan.operatingMonths/12,2)} лет`],['Дата продажи',h.saleMonth?date(h.saleMonth):'Не запланирована'],['Способ оценки',plan.saleValuation==='yield'?`NOI / доходность покупателя ${num(plan.buyerYield,2)}%`:'Цена задана вручную'],['Годовой NOI для оценки',money(h.annualNOI)],['Цена продажи',money(h.salePrice)+(plan.saleEnabled?'':' · предварительная оценка')],['Расходы на сделку',`${num(plan.saleCostPercent,2)}%`],['Чистое поступление',plan.saleEnabled?money(h.salePrice-h.costs.filter(c=>c.category==='Расходы на продажу отеля').reduce((s,c)=>s+c.amount,0)):'Не включено']],[200,CW-200]);}
 if(d.investments.length){
  if(h)b.heading('Финансирование');
  b.table(['ИНВЕСТИЦИЯ','ТРАНШИ','УСЛОВИЯ'],d.investments.map(i=>[i.name,`${money(i.tranches.reduce((s,t)=>s+t.amount,0))}\n${i.tranches.map(t=>`${date(t.month)}: ${money(t.amount)}`).join('\n')}`,`${num(i.rate,2)}% ${i.type==='annual'?'годовых':i.type==='profit-share'?'от прибыли':'за срок'}\n${i.type==='annual'?(i.compounding==='monthly'?'Ежемесячная капитализация':'Простой процент')+'\n':''}Плановый срок: ${date(i.maturityMonth)}`]),[140,180,CW-320]);
 }
 b.finish();return doc.save();
}

export async function downloadProposal(model:FinancialModel,projectId:string){
 const base=process.env.NEXT_PUBLIC_BASE_PATH??'';
 const load=async(name:string)=>{const response=await fetch(`${base}/fonts/${name}.ttf`);if(!response.ok)throw new Error('Не удалось загрузить шрифт PDF. Проверьте соединение и повторите.');return new Uint8Array(await response.arrayBuffer());};
 const [regular,bold]=await Promise.all([load('NotoSans-Regular'),load('NotoSans-Bold')]);
 const bytes=await createProposalPdf(model,projectId,{regular,bold});
 const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download=proposalFilename(model.projects.find(p=>p.id===projectId)?.name??'Проект');document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
