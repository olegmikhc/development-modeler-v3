import {describe,it,expect} from 'vitest';
import {projectExchangeRate} from './project-currency';
import {createFinancialModel} from './model-creation';
import {modelEnvelope} from './validation/model';
describe('project secondary currency',()=>{
 it('preserves legacy hotel and land assumptions',()=>{const p=createFinancialModel('Hotel','single','hotel').projects[0];expect(projectExchangeRate(p).unitsPerBase).toBe(16000);p.land.leasehold={years:25,pricePerAreYearIdr:1,idrPerUsd:18000};expect(projectExchangeRate(p).unitsPerBase).toBe(18000)});
 it('roundtrips fractional rates and rejects zero',()=>{const m=createFinancialModel('Hotel','single','hotel');m.projects[0].exchangeRate={currency:'EUR',baseCurrency:'USD',unitsPerBase:0.92};expect(modelEnvelope.parse(JSON.parse(JSON.stringify(m))).projects[0].exchangeRate?.unitsPerBase).toBe(.92);m.projects[0].exchangeRate.unitsPerBase=0;expect(modelEnvelope.safeParse(m).success).toBe(false)});
 it('requires a fresh rate after the reporting currency changes',()=>{const p=createFinancialModel('Retail','single','retail').projects[0];p.exchangeRate={currency:'THB',baseCurrency:'USD',unitsPerBase:35};p.currency='EUR';expect(projectExchangeRate(p).unitsPerBase).toBeNull()});
 it('retains a blank assumption without inventing a market quote',()=>{const p=createFinancialModel('Retail','single','retail').projects[0];p.exchangeRate={currency:'RUB',baseCurrency:'USD',unitsPerBase:null};expect(projectExchangeRate(p).unitsPerBase).toBeNull()});
});
