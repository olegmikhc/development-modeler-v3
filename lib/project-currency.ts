import {Project} from '@/types/model';
export const secondaryCurrencies=['IDR','THB','RUB','EUR'] as const;
export type ProjectExchangeRate={currency:typeof secondaryCurrencies[number];baseCurrency:string;unitsPerBase:number|null};
/** A manually entered assumption: units of the secondary currency per reporting unit. */
export function projectExchangeRate(p:Project):ProjectExchangeRate {
 if(p.exchangeRate)return {...p.exchangeRate,baseCurrency:p.currency,unitsPerBase:p.exchangeRate.baseCurrency===p.currency?p.exchangeRate.unitsPerBase:null};
 const legacy=p.land.leasehold?.idrPerUsd||p.hotel?.idrPerUsd;
 return {currency:'IDR',baseCurrency:p.currency,unitsPerBase:p.currency==='USD'&&legacy&&legacy>0?legacy:null};
}
