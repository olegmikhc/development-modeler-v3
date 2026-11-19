'use client';
import {useCloudState} from '@/lib/cloud-sync-state';
import {useMemo,useState} from 'react';
import {Plus,Building2,Copy,Trash2,Search,ArrowUpRight,ArrowRight,Layers3,Hotel,Monitor,FolderOpen,X} from 'lucide-react';
import {useModels} from '@/store/model-store';
import {FinancialModel,neutral} from '@/types/model';
import {calculatePortfolioCashFlow} from '@/lib/financial-engine';
import {isSingleModel} from '@/lib/model-creation';
import {appPath} from '@/lib/app-path';
import {copyModel} from '@/lib/copy-model';
import {CreateModel} from './create-model';
import {ModelImport} from './model-import';
const projectCount=(n:number)=>`${n} ${n%10===1&&n%100!==11?'проект':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'проекта':'проектов'}`;
export function ModelsHome({onOpen,notify}:{onOpen:(id:string)=>void;notify:(text:string)=>void}){
 const cloud=useCloudState();
 const s=useModels(),[creating,setCreating]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const rows=useMemo(()=>s.models.map(m=>({model:m,result:calculatePortfolioCashFlow(m,m.scenarios.find(x=>x.id===m.activeScenario)?.adjustments||neutral),hotel:m.projects.some(p=>p.businessModel==='hotel'),retail:m.projects.some(p=>p.businessModel!=='hotel')})),[s.models]);
 const visible=rows.filter(({model:m,hotel,retail})=>m.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())&&(filter==='all'||filter==='hotel'&&hotel||filter==='retail'&&retail));
 const create=(model:FinancialModel)=>{s.importModel(model);setCreating(false);onOpen(model.id)};
 return <div className="v3-library">
  <header className="v3-library-top"><div className="v3-header-inner"><div className="v-brand"><Building2/><div>development<span>MODELER <b className="v-brand-version" aria-label="Версия 3">V3</b></span></div></div><nav aria-label="Рабочее пространство"><span className="v3-header-active"><FolderOpen size={16}/>Мои модели</span><a href={appPath('/invited/')}>Доступные мне<ArrowUpRight size={14}/></a></nav><a className="v3-local" href={appPath('/login/')}><i/>{cloud.email||'Войти в облако'}</a></div></header>
  <main>
   <div className="v3-library-heading"><div><div className="v-eyebrow">ВАШИ ПРОЕКТЫ. ВАШИ РЕШЕНИЯ.</div><h1>Мои модели<span>{s.models.length}</span></h1><p>От первой гипотезы — к понятной экономике проекта.</p></div><div className="v3-heading-actions"><ModelImport compact notify={notify}/><button className="btn dark" onClick={()=>setCreating(true)}><Plus size={18}/>Создать модель</button></div></div>
   <div className="v3-library-toolbar"><div className="v3-filter-tabs" role="group" aria-label="Тип модели">{[['all','Все модели'],['retail','Розничная продажа'],['hotel','Отели']].map(([value,label])=><button key={value} aria-pressed={filter===value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}</button>)}</div><label className="v3-model-search"><Search size={17}/><input aria-label="Найти модель" placeholder="Найти модель…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Очистить поиск" onClick={()=>setQuery('')}><X size={14}/></button>}</label></div>
   <div className="v3-model-grid">{visible.map(({model:m,result:r,hotel,retail})=>{const Icon=isSingleModel(m)?hotel?Hotel:Building2:Layers3;const fmt=(n:number)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:m.currency,notation:'compact',maximumFractionDigits:2}).format(n);return <article className={`v3-model-card ${hotel?'is-hotel':''}`} key={m.id}>
    <button className="v3-model-open" onClick={()=>onOpen(m.id)}><div className="v3-card-top"><span className="v3-model-icon"><Icon size={24} strokeWidth={1.5}/></span><span className="v3-model-kind">{isSingleModel(m)?'Один проект':'Портфель'}</span><ArrowUpRight className="v3-card-arrow" size={18}/></div><h2>{m.name}</h2><p className="v3-card-description">{hotel&&retail?'Отели и розничная продажа':hotel?'Строительство и эксплуатация отеля':'Розничная продажа недвижимости'}</p><div className="v3-card-numbers"><span>Поступления<b>{fmt(r.revenue)}</b></span><span>Результат<b className={r.profit<0?'is-loss':''}>{fmt(r.profit)}</b></span></div><div className="v3-card-meta"><span>{projectCount(m.projects.length)}<i/> {m.currency}</span><span>Открыть<ArrowRight size={15}/></span></div></button>
    <footer><span><small>{cloud.email?(cloud.statuses[m.id]||'Только на устройстве'):'Только на устройстве'}</small><br/>Создана {new Date(m.created).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'})}</span><div><button className="v3-card-action" aria-label={`Создать копию: ${m.name}`} title="Создать копию" onClick={()=>{const copy=copyModel(m);copy.name=m.name+' · Копия';s.importModel(copy);notify('Независимая копия создана')}}><Copy size={15}/></button><button className="v3-card-action delete" disabled={s.models.length<=1} title={s.models.length<=1?'Сохраните хотя бы одну модель':'Переместить в корзину'} aria-label={`Удалить модель: ${m.name}`} onClick={()=>{if(confirm(`Переместить «${m.name}» в корзину?`))s.deleteModel(m.id)}}><Trash2 size={15}/></button></div></footer>
   </article>})}
   {!query&&filter==='all'&&<button className="v3-model-new" onClick={()=>setCreating(true)}><span className="v3-new-icon"><Plus size={25} strokeWidth={1.5}/></span><b>У следующего проекта<br/>есть потенциал.</b><span>Рассчитайте его в новой модели</span><span className="v3-new-link">Создать модель<ArrowRight size={16}/></span></button>}
   </div>
   {!visible.length&&(query||filter!=='all')&&<div className="v3-search-empty"><Search size={28}/><h2>Моделей пока не найдено</h2><p>Попробуйте другое название или измените фильтр.</p><button className="btn" onClick={()=>{setQuery('');setFilter('all')}}>Показать все модели</button></div>}
   <footer className="v3-library-footer"><p><Monitor size={16}/><span>{cloud.message}.<br className="v3-mobile-break"/> Локальная копия сохраняется на этом устройстве.</span></p>{s.deletedModels.length>0&&<details className="v3-trash"><summary><Trash2 size={14}/>Корзина<span>{s.deletedModels.length}</span></summary><div>{s.deletedModels.map(m=><div className="row spread" key={m.id}><span>{m.name}</span><button className="btn" onClick={()=>s.restoreDeletedModel(m.id)}>Восстановить</button></div>)}</div></details>}</footer>
  </main>{creating&&<CreateModel open onClose={()=>setCreating(false)} onCreate={create}/>}</div>
}
