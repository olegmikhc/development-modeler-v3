import {it,expect} from 'vitest';
import {createFinancialModel} from './model-creation';
import {calculatePortfolioCashFlow} from './financial-engine';
import {hotelMetrics} from './hotel';
import {hotelLifecycle} from './hotel-lifecycle';
it.each([true,false])('reconciles full lifecycle including construction and optional sale (%s)',saleEnabled=>{
 const m=createFinancialModel('Lifecycle','single','hotel'),p=m.projects[0];p.hotel={...p.hotel!,saleEnabled,operatingMonths:25,openingDelay:6,saleValuation:'manual',salePrice:5000000,saleCostPercent:3};
 const r=calculatePortfolioCashFlow(m),h=hotelMetrics(p,r),rows=hotelLifecycle(r,h.end);
 const total=(key:'income'|'cost'|'net'|'sale'|'saleCosts'|'developmentCosts')=>rows.reduce((n,y)=>n+y[key],0);
 expect(rows[0].operatingIncome).toBe(0);expect(rows[0].net).toBeLessThan(0);
 expect(total('income')).toBeCloseTo(r.revenue,2);expect(total('cost')).toBeCloseTo(r.cost,2);expect(total('net')).toBeCloseTo(r.profit,2);expect(total('developmentCosts')).toBeCloseTo(h.developmentCost,2);
 expect(total('sale')).toBe(saleEnabled?5000000:0);expect(total('saleCosts')).toBe(saleEnabled?150000:0);expect(rows.at(-1)!.cumulative).toBeCloseTo(r.profit,2);
 for(const y of rows)expect(y.developmentCosts+y.operatingCosts+y.saleCosts).toBeCloseTo(y.cost,2);
});
