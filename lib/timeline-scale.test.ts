import {describe,it,expect} from 'vitest';
import {timelinePeriods} from './timeline-scale';
describe('calendar timeline scale',()=>{
 it('keeps every month and its position',()=>{const p=timelinePeriods('2027-01-01',82,'months');expect(p).toHaveLength(82);expect(p.at(-1)).toMatchObject({start:82,months:1,label:'М82'})});
 it('aligns partial quarters to calendar boundaries',()=>{expect(timelinePeriods('2027-11-01',6,'quarters').map(p=>[p.label,p.detail,p.start,p.months])).toEqual([['4 кв.','2027',1,2],['1 кв.','2028',3,3],['2 кв.','2028',6,1]])});
 it('fits all years without rounding stage positions or dropping the final months',()=>{const p=timelinePeriods('2027-01-01',82,'years');expect(p.map(x=>x.months)).toEqual([12,12,12,12,12,12,10]);expect(p.at(-1)).toMatchObject({label:'2033',start:73});expect(p.reduce((n,x)=>n+x.months,0)).toBe(82)});
 it('handles non-January starts and a single month',()=>{expect(timelinePeriods('2027-12-01',14,'years').map(p=>[p.label,p.start,p.months])).toEqual([['2027',1,1],['2028',2,12],['2029',14,1]]);expect(timelinePeriods('2027-06-01',1,'years')[0].months).toBe(1)});
});
