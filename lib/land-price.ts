import {projectExchangeRate} from './project-currency';
import {Project} from '@/types/model';
export function landAreaAre(land:Project['land']){return land.area*(land.unit==='m²'?.01:land.unit==='hectare'?100:1)}
export function leaseholdQuote(land:Project['land']){const l=land.leasehold;if(!l||l.years<=0||l.idrPerUsd<=0)return null;const idr=landAreaAre(land)*l.years*l.pricePerAreYearIdr;return {idr,usd:Math.round((idr/l.idrPerUsd+Number.EPSILON)*100)/100}}
export function freeholdQuote(p:Project){
 const fx=projectExchangeRate(p),f=p.land.freehold;
 const rate=fx.currency===p.currency?1:fx.unitsPerBase;
 if(!f||f.currency!==fx.currency||!rate||!Number.isFinite(rate)||rate<=0)return null;
 const regional=landAreaAre(p.land)*f.pricePerAre;
 return {regional,base:Math.round((regional/rate+Number.EPSILON)*100)/100,rate,currency:fx.currency};
}
export function landPrice(p:Project){if(p.land.pricingMode==='Freehold')return freeholdQuote(p)?.base??p.land.cost;return p.land.pricingMode==='Leasehold'&&p.currency==='USD'?(leaseholdQuote(p.land)?.usd??p.land.cost):p.land.cost}
