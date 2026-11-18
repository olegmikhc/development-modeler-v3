'use client';
import {Plus,Trash2} from 'lucide-react';
import {id} from '@/lib/demo';
import {Project} from '@/types/model';
import {Field,Toggle} from '@/components/ui/controls';
import {AppSelect} from '@/components/ui/app-select';
import {hotelPlan,hotelCashRows} from '@/lib/hotel';
import {money} from '@/lib/format';
import {modelMonthDate} from '@/lib/model-calendar';
export function HotelEditor({project:p,onChange,startDate,section='all'}:{project:Project;onChange:(p:Project)=>void;startDate:string;section?:'all'|'units'|'operations'|'sale'}){
 const h=hotelPlan(p),roomTypes=h.roomTypes!,cash=hotelCashRows(p,undefined,startDate);
 const annualRoomRevenue=roomTypes.reduce((total,room)=>total+room.quantity*room.adrIdr,0)*365*h.occupancy/100/h.idrPerUsd;
 const set=(patch:Partial<typeof h>)=>onChange({...p,hotel:{...h,...patch},...(patch.idrPerUsd&&p.land.leasehold?{land:{...p.land,leasehold:{...p.land.leasehold,idrPerUsd:patch.idrPerUsd}}}:{})});
 return <div className="v3-hotel-inputs">{(section==='all'||section==='units')&&<section className="editor-section"><div className="row spread"><h3>Типы юнитов</h3><button type="button" className="btn" disabled={roomTypes.length>=100} onClick={()=>set({roomTypes:[...roomTypes,{id:id(),name:'Новый тип',quantity:1,area:0,adrIdr:0}]})}><Plus size={16}/>Добавить тип юнита</button></div><p className="v-note">Для каждого типа задайте площадь одного юнита, ставку за ночь и количество. Площадь инфраструктуры учитывается отдельно.</p><div className="hotel-room-types">{roomTypes.map((room,index)=><div className="hotel-room-type" key={room.id}><Field label="Тип юнита" value={room.name} onChange={name=>set({roomTypes:roomTypes.map((r,i)=>i===index?{...r,name}:r)})}/><Field label="Площадь одного юнита · м²" type="number" value={room.area??0} onChange={area=>set({roomTypes:roomTypes.map((r,i)=>i===index?{...r,area}:r)})}/><Field label="Количество юнитов" type="number" step={1} max={100000} value={room.quantity} onChange={quantity=>set({roomTypes:roomTypes.map((r,i)=>i===index?{...r,quantity}:r)})}/><Field label="ADR · IDR за ночь" type="number" value={room.adrIdr} onChange={adrIdr=>set({roomTypes:roomTypes.map((r,i)=>i===index?{...r,adrIdr}:r)})}/><button type="button" className="delete-btn" aria-label={`Удалить тип юнита: ${room.name}`} onClick={()=>set({roomTypes:roomTypes.filter((_,i)=>i!==index)})}><Trash2 size={17}/></button></div>)}</div>{!roomTypes.length&&<p className="notice">Добавьте тип юнита для расчёта площади и выручки.</p>}<div className="hotel-room-summary"><span>Всего юнитов <strong>{h.rooms}</strong></span><span>Площадь юнитов · без инфраструктуры <strong>{h.buildingArea.toLocaleString('ru-RU',{maximumFractionDigits:2})} м²</strong></span><span>Выручка юнитов за год · USD<strong>{money(annualRoomRevenue,false,'USD')}</strong><small>365 дней · загрузка {h.occupancy}% · без прочих доходов и продажи</small></span></div>{(p.hotel?.roomTypes?.some(r=>r.area===undefined)||!p.hotel?.roomTypes)&&<p className="v-note">Площади старой модели распределены из прежней общей площади пропорционально количеству. Уточните метраж каждого типа.</p>}</section>}{(section==='all'||section==='operations')&&<><section className="editor-section"><h3>Период эксплуатации</h3><div className="form-grid"><Field label="Задержка открытия после готовности · мес." type="number" max={240} step={1} value={h.openingDelay} onChange={openingDelay=>set({openingDelay})}/><Field label="Период эксплуатации · лет" type="number" max={50} step={1/12} value={Number((h.operatingMonths/12).toFixed(4))} onChange={years=>set({operatingMonths:Math.round(years*12)})}/></div><p className="v-note">Открытие после завершения строительства и инфраструктуры. Период: М{cash.opening}–М{cash.end}. Продажи отдельных номеров отсутствуют.</p></section>
 <section className="editor-section"><h3>Выручка и курс</h3><div className="form-grid"><Field label="Occupancy · загрузка, %" type="number" max={100} value={h.occupancy} onChange={occupancy=>set({occupancy})}/><Field label="Курс · IDR за 1 USD" type="number" min={1} max={1e9} value={h.idrPerUsd} onChange={idrPerUsd=>set({idrPerUsd})}/><Field label="Прочие доходы · % от дохода номеров" type="number" max={100} value={h.otherRevenuePercent} onChange={otherRevenuePercent=>set({otherRevenuePercent})}/></div><p className="v-note">Выручка складывается из ADR и количества каждого типа юнитов с учётом загрузки и дней месяца. Курс — допущение модели, не текущая котировка. При заданном курсе земли используется тот же курс; изменение здесь обновляет его и для земли.</p></section>
 <section className="editor-section"><h3>Расходы эксплуатации</h3><div className="form-grid"><Field label="Переменные расходы · % от всей выручки отеля" type="number" max={100} value={h.variableCostPercent} onChange={variableCostPercent=>set({variableCostPercent})}/><Field label="Постоянные расходы · USD/мес." type="number" value={h.fixedMonthlyCost} onChange={fixedMonthlyCost=>set({fixedMonthlyCost})}/></div><p className="v-note">Укажите содержание, управление, зарплаты и налоги в расходах. Процент применяется к номерам и прочим доходам, но не к продаже актива. Постоянные расходы добавляются отдельно.</p></section>
 </>}{(section==='all'||section==='sale')&&<section className="hotel-sale-editor">
 <div className="hotel-sale-status">
  <Toggle label="Включить продажу отеля в расчёт" checked={h.saleEnabled} onChange={saleEnabled=>set({saleEnabled})}/>
  <p>{h.saleEnabled?'Продажа после':'Возможная продажа после'} {Number((h.operatingMonths/12).toFixed(2))} лет эксплуатации · <b>{modelMonthDate(startDate,cash.end+1).toLocaleDateString('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'})}</b> · М{cash.end+1}</p>
  <small>Срок задаётся периодом владения в разделе «Эксплуатация».</small>
 </div>
 <div className="hotel-sale-layout">
  <div className="hotel-sale-panel">
   <h3>Параметры продажи</h3>
   <div className="hotel-sale-fields">
    <label className="field"><span>Способ расчёта цены продажи</span><AppSelect value={h.saleValuation} onChange={e=>set({saleValuation:e.target.value as 'manual'|'yield'})}><option value="yield">Из доходности покупателя</option><option value="manual">Задать цену вручную</option></AppSelect></label>
    {h.saleValuation==='yield'?<Field label="Доходность покупателя · % годовых" type="number" min={0.1} max={100} value={h.buyerYield} onChange={buyerYield=>set({buyerYield})}/>:<Field label="Цена продажи отеля целиком · USD" type="number" value={h.salePrice} onChange={salePrice=>set({salePrice})}/>}
    <Field label="Расходы на сделку · % от цены продажи" type="number" max={100} value={h.saleCostPercent} onChange={saleCostPercent=>set({saleCostPercent})}/>
   </div>
  </div>
  <div className="hotel-sale-panel hotel-sale-result">
   <h3>Расчёт сделки</h3>
   <dl>
    <div><dt>Годовой NOI для оценки</dt><dd>{money(cash.annualNOI,false,'USD')}</dd></div>
    <div><dt>Цена продажи</dt><dd>{h.saleValuation==='yield'&&cash.impliedSalePrice<=0?'Не определяется':money(cash.salePrice,false,'USD')}</dd></div>
    <div><dt>Расходы на сделку · {h.saleCostPercent}%</dt><dd>{money(cash.salePrice*h.saleCostPercent/100,false,'USD')}</dd></div>
   </dl>
   <div className="hotel-sale-net"><span>Чистое поступление от продажи</span><strong>{money(cash.salePrice*(1-h.saleCostPercent/100),false,'USD')}</strong><small>{h.saleEnabled?'Учтено в денежном потоке':'Предварительная оценка · продажа выключена'}</small></div>
   {h.saleValuation==='yield'&&<p className="v-note">Цена = годовой NOI ÷ {(h.buyerYield/100).toFixed(3)}</p>}
  </div>
 </div>
 <details className="hotel-sale-help"><summary>Как рассчитывается оценка</summary><p>NOI — доход от эксплуатации за вычетом заданных операционных расходов, до финансирования. Для оценки берутся последние 12 месяцев; короткий период приводится к году. При нулевом или отрицательном NOI цена по доходности не определяется. Когда продажа выключена, стоимость отеля и расходы на сделку не добавляются в денежный поток.</p></details>
 </section>}</div>
}
