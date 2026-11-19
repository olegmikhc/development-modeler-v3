import {describe,it,expect} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {createFinancialModel,createDevelopmentProject} from '@/lib/model-creation';
import {scopedResult} from '@/lib/sensitivity';
import {neutral} from '@/types/model';
import {proposalData,proposalFilename} from './proposal-data';
import {createProposalPdf} from './proposal-pdf';
const fonts={regular:new Uint8Array(readFileSync('public/fonts/NotoSans-Regular.ttf')),bold:new Uint8Array(readFileSync('public/fonts/NotoSans-Bold.ttf'))};
function sample(){const m=createFinancialModel('Settlers','single','hotel');const p=m.projects[0];p.hotel={...p.hotel!,saleEnabled:true,operatingMonths:84,openingDelay:6,roomTypes:[{id:'one',name:'1 BR',area:50,quantity:20,adrIdr:2400000},{id:'two',name:'2 BR',area:60,quantity:10,adrIdr:4700000}]};p.infrastructure=[{id:'pool',name:'Бассейн',area:200,costPerM2:500,curve:'Even',offset:0,duration:4}];return m;}
describe('investment proposal',()=>{
 it('matches the overview and annual cash flow for the active scenario including company costs',()=>{
  const m=sample(),p=m.projects[0];m.corporate=[{id:'c',name:'Office',amount:1000,type:'Monthly',start:1,duration:12,anchor:'Fixed Month',offset:0,custom:[]}];
  m.scenarios.push({id:'stress',name:'Stress',adjustments:{...neutral,price:-20,construction:15,pbgDelay:3}});m.activeScenario='stress';const d=proposalData(m,p.id);
  expect(d.result).toEqual(scopedResult(m,p.id,m.scenarios[1].adjustments));expect(d.scenarioName).toBe('Stress');expect(d.budget.find(([k])=>k==='Office')?.[1]).toBe(12000);
  expect(d.years.reduce((s,y)=>s+y.net,0)).toBeCloseTo(d.result.profit,2);expect(d.budget.reduce((s,[,v])=>s+v,0)).toBeCloseTo(d.hotel!.developmentCost,2);
  expect(d.years.reduce((s,y)=>s+y.sale,0)).toBeCloseTo(d.hotel!.salePrice,2);
 });
 it('keeps other projects and company costs out of portfolio project exports',()=>{
  const m=sample();m.structure='portfolio';const other=createDevelopmentProject('Other','hotel');m.projects.push(other);m.scenarios[0].adjustments={...neutral,projectId:other.id,price:80,pbgDelay:20};
  const d=proposalData(m,m.projects[0].id);expect(d.effective).toEqual(neutral);expect(d.includesCompany).toBe(false);expect(d.result).toEqual(scopedResult(m,m.projects[0].id,neutral));
 });
 it('does not include a terminal sale or annualized return when sale is off',()=>{const m=sample();m.projects[0].hotel!.saleEnabled=false;const d=proposalData(m,m.projects[0].id);expect(d.years.reduce((s,y)=>s+y.sale,0)).toBe(0);expect(d.hotel!.averageAnnualROI).toBeNull();});
 it('separates the development budget, hotel operations and exit including transaction costs',()=>{
  const m=sample(),p=m.projects[0];p.hotel!.saleCostPercent=7;
  const d=proposalData(m,p.id),f=d.flows;
  expect(f.development).toBeCloseTo(d.hotel!.developmentCost,2);
  expect(f.operatingRevenue+f.sale).toBeCloseTo(d.result.revenue,2);
  expect(f.development+f.operatingCosts+f.saleCosts).toBeCloseTo(d.result.cost,2);
  expect(f.noi).toBeCloseTo(f.operatingRevenue-f.operatingCosts,2);
  expect(f.noi+f.sale-f.saleCosts-f.development).toBeCloseTo(d.result.profit,2);
  expect(f.saleCosts).toBeCloseTo(f.sale*.07,2);
  p.hotel!.saleEnabled=false;const off=proposalData(m,p.id);
  expect(off.flows.sale).toBe(0);expect(off.flows.saleCosts).toBe(0);
  expect(off.flows.operatingRevenue).toBe(f.operatingRevenue);
  expect(off.flows.development).toBe(f.development);
 });
 it('rejects deleted projects and sanitizes the download filename',()=>{const m=sample();expect(()=>proposalData(m,'missing')).toThrow('Проект не найден');expect(proposalFilename('A/B:C')).toBe('Инвестиционное предложение - A B C.pdf');});
 it.each(['hotel','zero-sale-fee','financed','no-sale','long','retail'] as const)('generates a complete readable PDF for %s',async kind=>{
  const m=kind==='retail'?createFinancialModel('Виллы','single','retail'):sample(),p=m.projects[0];
  if(kind==='zero-sale-fee'){p.hotel!.saleCostPercent=0;p.hotel!.operatingMonths=24;}
  if(kind==='financed')m.investments=[{id:'funding',name:'Инвестор проекта',projectId:p.id,enabled:true,type:'annual',rate:12,compounding:'simple',incomePayment:'maturity',maturityMonth:24,autoSettle:true,tranches:[{id:'tranche',month:1,amount:500000}],repayments:[]}];
  if(kind==='no-sale')p.hotel!.saleEnabled=false;
  if(kind==='long'){p.name='Большой гостиничный комплекс с длинным названием в живописном районе острова';p.hotel!.operatingMonths=600;p.infrastructure=Array.from({length:28},(_,i)=>({id:String(i),name:`Инфраструктура ${i+1}: ресторан и дополнительные помещения для обслуживания гостей`,area:80,costPerM2:300,curve:'Even',offset:0,duration:4}));p.hotel!.roomTypes=Array.from({length:25},(_,i)=>({id:String(i),name:`Номер ${i+1} с большой террасой и видом на океан`,area:50,quantity:2,adrIdr:2400000}));}
  const bytes=await createProposalPdf(m,p.id,fonts,new Date('2026-11-18T12:00:00Z')),pdf=await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(6);expect(pdf.getTitle()).toBe(`Инвестиционное предложение по проекту ${p.name}`);expect(bytes.length).toBeGreaterThan(20000);
  if(process.env.PROPOSAL_QA_DIR){mkdirSync(process.env.PROPOSAL_QA_DIR,{recursive:true});writeFileSync(`${process.env.PROPOSAL_QA_DIR}/${kind}.pdf`,bytes);}
 },20000);
});
